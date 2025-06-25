#!/usr/bin/env python3
"""
Standalone server launcher for Link Band SDK
This script ensures the server runs with the bundled Python environment
"""
import os
import sys
import subprocess
from pathlib import Path

def setup_environment():
    """Set up the Python environment for the bundled application"""
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.absolute()
    
    # Add the python_core directory to Python path
    sys.path.insert(0, str(script_dir))
    
    # Set up the virtual environment path
    venv_path = script_dir / "venv"
    
    # Add site-packages to Python path
    site_packages = venv_path / "lib" / "python3.13" / "site-packages"
    if site_packages.exists():
        sys.path.insert(0, str(site_packages))
        print(f"Added site-packages to path: {site_packages}")
    else:
        print(f"Warning: site-packages not found at {site_packages}")
    
    # Set environment variables
    os.environ["VIRTUAL_ENV"] = str(venv_path)
    os.environ["PYTHONPATH"] = str(script_dir)
    os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
    os.environ["PYTHONNOUSERSITE"] = "1"
    
    # Add virtual environment's bin/Scripts to PATH
    if sys.platform == "win32":
        bin_path = venv_path / "Scripts"
    else:
        bin_path = venv_path / "bin"
    
    os.environ["PATH"] = f"{bin_path}{os.pathsep}{os.environ.get('PATH', '')}"
    
    # For macOS, set DYLD_LIBRARY_PATH if needed
    if sys.platform == "darwin":
        lib_path = venv_path / "lib"
        os.environ["DYLD_LIBRARY_PATH"] = str(lib_path)

def run_with_subprocess():
    """Run the server using subprocess as a fallback"""
    script_dir = Path(__file__).parent.absolute()
    
    # Try to run uvicorn using subprocess
    python_cmd = sys.executable
    cmd = [
        python_cmd, "-m", "uvicorn", 
        "app.main:app", 
        "--host", "localhost", 
        "--port", "8121",
        "--log-level", "info"
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    print(f"Working directory: {script_dir}")
    
    try:
        # Change to the python_core directory
        os.chdir(script_dir)
        
        # Run the command
        result = subprocess.run(cmd, env=os.environ)
        sys.exit(result.returncode)
    except Exception as e:
        print(f"❌ Error running server with subprocess: {e}")
        sys.exit(1)

def main():
    """Run the FastAPI server using uvicorn"""
    setup_environment()
    
    # Try to import and run directly
    try:
        import uvicorn
        from app.main import app
        
        print("🚀 Starting Link Band SDK Server (Standalone Mode)...")
        uvicorn.run(app, host="localhost", port=8121, log_level="info")
    except ImportError as e:
        print(f"⚠️  Direct import failed: {e}")
        print("Trying subprocess method...")
        run_with_subprocess()
    except Exception as e:
        print(f"❌ Error: Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 