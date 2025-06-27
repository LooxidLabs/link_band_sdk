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
from pathlib import Path

# Configure logging
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

def main():
    """Run the FastAPI server directly using uvicorn."""
    try:
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