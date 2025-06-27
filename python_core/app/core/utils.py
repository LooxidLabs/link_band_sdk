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

def ensure_port_available(port: int, max_retries: int = 3) -> bool:
    """Ensure the port is available, killing any process if necessary."""
    import time
    
    for attempt in range(max_retries):
        if not is_port_in_use(port):
            return True
        
        logger.warning(f"Port {port} is already in use. Attempting to free it (attempt {attempt + 1}/{max_retries})...")
        
        if kill_process_on_port(port):
            # Wait a bit for the port to be fully released
            time.sleep(0.5)
            
            # Check again if port is free
            if not is_port_in_use(port):
                logger.info(f"Successfully freed port {port}")
                return True
            else:
                logger.warning(f"Port {port} still in use after killing process")
        else:
            logger.warning(f"Failed to kill process on port {port}")
        
        # Wait before next attempt
        if attempt < max_retries - 1:
            time.sleep(1)
    
    logger.error(f"Failed to free port {port} after {max_retries} attempts")
    return False

def force_kill_port_processes(port: int) -> bool:
    """Force kill all processes using the specified port with extreme prejudice."""
    import time
    
    try:
        current_pid = os.getpid()
        killed_any = False
        
        if platform.system() == 'Darwin':  # macOS
            # Use lsof with force kill
            cmd = f"lsof -i :{port} -t"
            try:
                pids = subprocess.check_output(cmd, shell=True).decode().strip().split('\n')
                for pid in pids:
                    if pid and int(pid) != current_pid:
                        logger.info(f"Force killing process {pid} on port {port}")
                        # Try SIGTERM first, then SIGKILL
                        subprocess.run(f"kill -15 {pid}", shell=True)
                        time.sleep(0.2)
                        subprocess.run(f"kill -9 {pid}", shell=True)
                        killed_any = True
            except subprocess.CalledProcessError:
                pass
        
        # Also try netstat approach for additional coverage
        if platform.system() in ['Darwin', 'Linux']:
            try:
                cmd = f"netstat -tulpn | grep :{port}"
                result = subprocess.check_output(cmd, shell=True).decode()
                lines = result.strip().split('\n')
                for line in lines:
                    parts = line.split()
                    if len(parts) > 6 and '/' in parts[6]:
                        pid = parts[6].split('/')[0]
                        if pid.isdigit() and int(pid) != current_pid:
                            logger.info(f"Force killing process {pid} from netstat")
                            subprocess.run(f"kill -9 {pid}", shell=True)
                            killed_any = True
            except subprocess.CalledProcessError:
                pass
        
        if killed_any:
            time.sleep(1)  # Give more time for cleanup
            
        return killed_any
        
    except Exception as e:
        logger.error(f"Error in force_kill_port_processes: {e}")
        return False 