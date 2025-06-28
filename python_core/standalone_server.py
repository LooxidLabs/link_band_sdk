#!/usr/bin/env python3
"""
Standalone server launcher for Link Band SDK
This script ensures the server runs with the bundled Python environment
"""
import os
import sys
import uvicorn
import logging
import asyncio
import signal
from pathlib import Path

# Link Band SDK 통합 로깅 사용 (standalone 모드)
try:
    from app.core.logging_config import linkband_logger, get_system_logger, LogTags
    
    # 환경 감지 및 로그 설정
    environment = os.getenv('LINKBAND_ENV', 'production')  # standalone은 기본적으로 production
    linkband_logger.configure(
        environment=environment,
        enable_history=True,
        console_level='INFO'
    )
    
    logger = get_system_logger(__name__)
except ImportError:
    # Fallback: 통합 로그 시스템을 사용할 수 없는 경우
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)

# Windows에서 ProactorEventLoop 대신 SelectorEventLoop를 사용하도록 강제
# WebSocket 연결 안정성 문제를 해결하기 위함
if sys.platform == "win32":
    print("Windows detected: Using SelectorEventLoop to prevent WebSocket connection issues")
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

def setup_signal_handlers():
    """Setup signal handlers for graceful shutdown"""
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        
        # Try to stop any running asyncio tasks
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Cancel all tasks
                tasks = [task for task in asyncio.all_tasks(loop) if not task.done()]
                if tasks:
                    logger.info(f"Cancelling {len(tasks)} running tasks...")
                    for task in tasks:
                        task.cancel()
                
                # Schedule shutdown
                loop.create_task(graceful_shutdown())
        except Exception as e:
            logger.error(f"Error during signal handling: {e}")
        
        # Force exit if graceful shutdown doesn't work
        logger.info("Forcing process exit...")
        os._exit(0)
    
    # Register signal handlers for both SIGINT (Ctrl+C) and SIGTERM
    signal.signal(signal.SIGINT, signal_handler)
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, signal_handler)

async def graceful_shutdown():
    """Perform graceful shutdown of all services"""
    try:
        logger.info("Starting graceful shutdown...")
        
        # Import app to access state
        from app.main import app
        
        # Shutdown WebSocket server
        if hasattr(app.state, 'ws_server') and app.state.ws_server:
            logger.info("Shutting down WebSocket server...")
            await app.state.ws_server.shutdown()
        
        # Stop stream service
        if hasattr(app.state, 'stream_service') and app.state.stream_service:
            logger.info("Stopping stream service...")
            await app.state.stream_service.stop_stream()
        
        # Disconnect device
        if hasattr(app.state, 'device_manager') and app.state.device_manager:
            if app.state.device_manager.is_connected():
                logger.info("Disconnecting device...")
                await app.state.device_manager.disconnect()
        
        logger.info("Graceful shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during graceful shutdown: {e}")

def main():
    """Run the FastAPI server directly using uvicorn."""
    try:
        # Setup signal handlers for graceful shutdown
        setup_signal_handlers()
        
        # Detect if we're running in PyInstaller bundle
        if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
            # Running in PyInstaller bundle
            bundle_dir = sys._MEIPASS
            print(f"Running in PyInstaller bundle from: {bundle_dir}")
            
            # Add the bundle directory to Python path
            sys.path.insert(0, bundle_dir)
            
            # Change working directory to bundle directory
            os.chdir(bundle_dir)
            print(f"Changed working directory to: {os.getcwd()}")
        else:
            # Running from source
            project_root = str(Path(__file__).parent)
            sys.path.insert(0, project_root)
            os.chdir(project_root)
            print(f"Running from source, working directory: {os.getcwd()}")

        logger.info("Starting FastAPI server on localhost:8121")
        logger.info(f"Python version: {sys.version}")
        logger.info(f"Working directory: {os.getcwd()}")
        logger.info(f"Python path: {sys.path[:3]}...")  # Show first 3 paths

        # Run uvicorn directly with the app module
        uvicorn.run(
            "app.main:app",
            host="localhost",
            port=8121,
            reload=False,
            log_level="info",
            access_log=True
        )
        
    except ImportError as e:
        logger.error(f"Failed to import required modules: {e}")
        logger.error("Make sure all dependencies are installed")
        logger.error(f"Current working directory: {os.getcwd()}")
        logger.error(f"Current sys.path: {sys.path}")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Error starting server: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main() 