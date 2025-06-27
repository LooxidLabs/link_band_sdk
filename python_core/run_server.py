#!/usr/bin/env python3
import os
import sys
import subprocess
from pathlib import Path
import logging
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Windows에서 ProactorEventLoop 대신 SelectorEventLoop를 사용하도록 강제
# WebSocket 연결 안정성 문제를 해결하기 위함
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

def get_python_executable():
    """Get the appropriate Python executable (prefer venv if available)."""
    script_dir = Path(__file__).parent
    
    # Check for virtual environment
    if sys.platform == 'win32':
        venv_python = script_dir / "venv" / "Scripts" / "python.exe"
    else:
        venv_python = script_dir / "venv" / "bin" / "python3"
    
    if venv_python.exists():
        logger.info(f"Using virtual environment Python: {venv_python}")
        return str(venv_python)
    else:
        logger.warning("Virtual environment not found, using system Python")
        return sys.executable

def run_server(host: str = "localhost", port: int = 8121) -> None:
    """Run the MNE-enabled LinkBand server."""
    try:
        # Get the directory containing this script
        script_dir = Path(__file__).parent
        
        # Windows에서는 바로 standalone_server.py 실행
        if sys.platform == "win32":
            logger.info("Windows detected: Running standalone_server.py directly")
            standalone_server = script_dir / "standalone_server.py"
            if standalone_server.exists():
                logger.info(f"Running standalone_server.py from {standalone_server}")
                
                # Get the appropriate Python executable
                python_exe = get_python_executable()
                
                # Run standalone_server.py as subprocess
                try:
                    result = subprocess.run([
                        python_exe, 
                        str(standalone_server)
                    ], cwd=str(script_dir), check=True)
                except subprocess.CalledProcessError as e:
                    logger.error(f"standalone_server.py failed with exit code {e.returncode}")
                    sys.exit(1)
            else:
                logger.error("standalone_server.py not found")
                sys.exit(1)
            return
        
        # macOS/Linux에서는 바이너리 실행 시도
        # Look for the MNE-enabled server binary
        server_binary = script_dir / "dist" / "linkband-server-macos-arm64-final"
        
        if not server_binary.exists():
            # Fallback to the distributed version
            server_binary = script_dir.parent / "installers" / "distribution" / "macos-arm64" / "linkband-server-macos-arm64-final"
        
        if not server_binary.exists():
            logger.error(f"MNE-enabled server binary not found at {server_binary}")
            logger.info("Falling back to standalone_server.py")
            
            # Fallback to standalone_server.py using subprocess with proper Python
            standalone_server = script_dir / "standalone_server.py"
            if standalone_server.exists():
                logger.info(f"Running standalone_server.py from {standalone_server}")
                
                # Get the appropriate Python executable
                python_exe = get_python_executable()
                
                # Run standalone_server.py as subprocess
                try:
                    result = subprocess.run([
                        python_exe, 
                        str(standalone_server)
                    ], cwd=str(script_dir), check=True)
                except subprocess.CalledProcessError as e:
                    logger.error(f"standalone_server.py failed with exit code {e.returncode}")
                    sys.exit(1)
            else:
                logger.error("standalone_server.py not found either")
                sys.exit(1)
            return
        
        logger.info(f"Starting MNE-enabled LinkBand server from {server_binary}")
        logger.info(f"Server will run on {host}:{port}")
        
        # Make the binary executable
        os.chmod(server_binary, 0o755)
        
        # Run the binary
        result = subprocess.run([str(server_binary)], check=True)
        
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except subprocess.CalledProcessError as e:
        logger.error(f"Server process failed with exit code {e.returncode}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error starting server: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    run_server(host="localhost", port=8121)
