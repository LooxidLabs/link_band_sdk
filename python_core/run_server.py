#!/usr/bin/env python3
import os
import sys
import subprocess
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_server(host: str = "localhost", port: int = 8121) -> None:
    """Run the MNE-enabled LinkBand server."""
    try:
        # Get the directory containing this script
        script_dir = Path(__file__).parent
        
        # Look for the MNE-enabled server binary
        server_binary = script_dir / "dist" / "linkband-server-macos-arm64-final"
        
        if not server_binary.exists():
            # Fallback to the distributed version
            server_binary = script_dir.parent / "installers" / "distribution" / "macos-arm64" / "linkband-server-macos-arm64-final"
        
        if not server_binary.exists():
            logger.error(f"MNE-enabled server binary not found at {server_binary}")
            logger.info("Falling back to standalone_server.py")
            
            # Fallback to standalone_server.py
            standalone_server = script_dir / "standalone_server.py"
            if standalone_server.exists():
                logger.info(f"Running standalone_server.py from {standalone_server}")
                exec(open(standalone_server).read())
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
