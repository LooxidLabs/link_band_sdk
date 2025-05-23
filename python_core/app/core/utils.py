import socket
import logging
import psutil
import subprocess
import platform
import os

logger = logging.getLogger(__name__)

def is_port_in_use(port: int) -> bool:
    """Check if a port is in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def kill_process_on_port(port: int) -> bool:
    """Kill the process running on the specified port."""
    try:
        current_pid = os.getpid()
        if platform.system() == 'Darwin':  # macOS
            # Use lsof to find the process
            cmd = f"lsof -i :{port} -t"
            try:
                pids = subprocess.check_output(cmd, shell=True).decode().strip().split('\n')
                for pid in pids:
                    if pid and int(pid) != current_pid:  # Skip current process
                        logger.info(f"Found process using port {port} (PID: {pid})")
                        subprocess.run(f"kill -9 {pid}", shell=True)
                        logger.info(f"Successfully killed process {pid}")
                        return True
            except subprocess.CalledProcessError:
                pass
        else:
            # For other platforms, try using psutil
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    if proc.pid == current_pid:  # Skip current process
                        continue
                    connections = proc.connections()
                    for conn in connections:
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