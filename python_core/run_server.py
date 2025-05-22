# .vscode/run_server.py (원래 코드로 복원)
import os
import sys
import uvicorn
import logging
import psutil
import socket
from pathlib import Path
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def is_port_in_use(port: int) -> bool:
    """Check if a port is in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def kill_process_on_port(port: int) -> bool:
    """Kill the process running on the specified port."""
    try:
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                for conn in proc.connections():
                    if conn.laddr.port == port:
                        logger.info(f"Found process using port {port}: {proc.name()} (PID: {proc.pid})")
                        proc.kill()
                        logger.info(f"Successfully killed process {proc.pid}")
                        return True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception as e:
        logger.error(f"Error while trying to kill process on port {port}: {e}")
    return False

def ensure_port_available(port: int) -> bool:
    """Ensure the port is available, killing any process if necessary."""
    if is_port_in_use(port):
        logger.warning(f"Port {port} is already in use. Attempting to free it...")
        if kill_process_on_port(port):
            logger.info(f"Successfully freed port {port}")
            return True
        else:
            logger.error(f"Failed to free port {port}")
            return False
    return True

def run_server(host: str = "localhost", port: int = 8000) -> None:
    """Run the FastAPI server with proper error handling."""
    try:
        # Add the parent directory to Python path
        current_dir = Path(__file__).parent
        sys.path.append(str(current_dir))

        # Check if port is available
        if not ensure_port_available(port):
            logger.error(f"Cannot start server: Port {port} is in use and could not be freed")
            sys.exit(1)

        logger.info(f"Starting FastAPI server on {host}:{port}")
        
        # Run the FastAPI server using uvicorn
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Error starting server: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    run_server()
