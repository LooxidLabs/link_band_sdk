# .vscode/run_server.py (원래 코드로 복원)
import os
import sys
from pathlib import Path

# Add the project root directory to Python path
project_root = str(Path(__file__).parent)
sys.path.insert(0, project_root)

# Check if we're running in a packaged Electron app
# In packaged app, the structure is: /Resources/python_core/
if sys.platform == 'darwin' and '/Contents/Resources/python_core' in project_root:
    # We're in a packaged macOS app
    venv_site_packages = os.path.join(project_root, 'venv', 'lib', 'python3.13', 'site-packages')
    if os.path.exists(venv_site_packages):
        sys.path.insert(0, venv_site_packages)
        print(f"Added packaged site-packages to path: {venv_site_packages}")
    else:
        print(f"Warning: site-packages not found at {venv_site_packages}")
elif sys.platform == 'win32' and '\\resources\\python_core' in project_root.lower():
    # We're in a packaged Windows app
    venv_site_packages = os.path.join(project_root, 'venv', 'lib', 'python3.13', 'site-packages')
    if os.path.exists(venv_site_packages):
        sys.path.insert(0, venv_site_packages)
        print(f"Added packaged site-packages to path: {venv_site_packages}")

import uvicorn
import logging
import psutil
import socket
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

def run_server(host: str = "localhost", port: int = 8121) -> None:
    """Run the FastAPI server with proper error handling."""
    try:
        # Check if port is available
        if not ensure_port_available(port):
            logger.error(f"Cannot start server: Port {port} is in use and could not be freed")
            sys.exit(1)

        logger.info(f"Starting FastAPI server on {host}:{port}")
        
        # Import app here to avoid circular imports
        from app.main import app
        
        # Run the FastAPI server using uvicorn
        uvicorn.run(app, host=host, port=port, reload=False, log_level="info")
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Error starting server: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    run_server(host="localhost", port=8121)
