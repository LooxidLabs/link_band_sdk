#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# Detect if we're running in PyInstaller bundle
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    # Running in PyInstaller bundle
    print(f"Running in PyInstaller bundle from: {sys._MEIPASS}")
    # Disable lazy loading for mne
    os.environ['MNE_SKIP_LAZY_IMPORT'] = '1'
    os.environ['_MNE_SKIP_LAZY_LOADER_IMPORT'] = '1'

# Add the project root directory to Python path
project_root = str(Path(__file__).parent)
sys.path.insert(0, project_root)

# Detect if we're running in a bundled Electron app
is_bundled = False
if sys.platform == 'darwin' and '/Contents/Resources/' in project_root:
    # macOS bundled app
    is_bundled = True
    print(f"Running in bundled macOS app from: {project_root}")
    
    # Add site-packages to path
    venv_path = Path(project_root) / "venv"
    site_packages = venv_path / "lib" / "python3.13" / "site-packages"
    if site_packages.exists():
        sys.path.insert(0, str(site_packages))
        print(f"Added site-packages to path: {site_packages}")
    
    # Also add the standard library path if needed
    stdlib_path = venv_path / "lib" / "python3.13"
    if stdlib_path.exists():
        sys.path.insert(0, str(stdlib_path))
        print(f"Added stdlib to path: {stdlib_path}")
        
elif sys.platform == 'win32' and '\\resources\\' in project_root.lower():
    # Windows bundled app
    is_bundled = True
    print(f"Running in bundled Windows app from: {project_root}")
    
    venv_path = Path(project_root) / "venv"
    site_packages = venv_path / "Lib" / "site-packages"
    if site_packages.exists():
        sys.path.insert(0, str(site_packages))
        print(f"Added site-packages to path: {site_packages}")
        
elif sys.platform.startswith('linux') and '/resources/' in project_root:
    # Linux bundled app
    is_bundled = True
    print(f"Running in bundled Linux app from: {project_root}")
    
    venv_path = Path(project_root) / "venv"
    site_packages = venv_path / "lib" / "python3.13" / "site-packages"
    if site_packages.exists():
        sys.path.insert(0, str(site_packages))
        print(f"Added site-packages to path: {site_packages}")

# If bundled, ensure we use the bundled packages
if is_bundled:
    print(f"Python executable: {sys.executable}")
    print(f"Python path: {sys.path}")

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
        logger.info(f"Python version: {sys.version}")
        logger.info(f"Working directory: {os.getcwd()}")
        
        # Change to the python_core directory
        os.chdir(project_root)
        logger.info(f"Changed working directory to: {os.getcwd()}")
        
        # Import app here to avoid circular imports
        from app.main import app
        
        # Run the FastAPI server using uvicorn
        uvicorn.run(
            app, 
            host=host, 
            port=port, 
            reload=False,  # Disable reload in production
            log_level="info",
            access_log=True  # Enable access logging
        )
    except ImportError as e:
        logger.error(f"Failed to import required modules: {e}")
        logger.error("Make sure all dependencies are installed in the bundled environment")
        logger.error(f"Current sys.path: {sys.path}")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Error starting server: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    run_server(host="localhost", port=8121)
