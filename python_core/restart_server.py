
import os
import time
import sys
import subprocess

def restart_server():
    # Start new server
    subprocess.Popen([sys.executable, 'run_server.py'])
    time.sleep(2)  # Wait for new server to start
    
    # Kill old server
    try:
        os.kill(87422, 9)
    except ProcessLookupError:
        pass  # Process might already be gone

if __name__ == '__main__':
    restart_server()
