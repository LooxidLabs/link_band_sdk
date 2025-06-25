import os
import shutil
from datetime import datetime
try:
    import psutil
except ImportError:
    psutil = None

def get_cpu_usage():
    if psutil:
        # 현재 프로세스의 CPU 사용률(%)
        process = psutil.Process(os.getpid())
        return process.cpu_percent(interval=0.1)
    return 0.0

def get_ram_usage():
    if psutil:
        # 현재 프로세스의 메모리 사용량(MB)
        process = psutil.Process(os.getpid())
        return round(process.memory_info().rss / (1024 ** 2), 2)
    return 0.0

def get_disk_usage():
    # 현재 작업 디렉토리의 data 폴더 크기 계산 (실제 데이터가 저장되는 곳)
    data_dir = os.path.join(os.getcwd(), 'data')
    total_size = 0
    
    if os.path.exists(data_dir):
        try:
            for dirpath, dirnames, filenames in os.walk(data_dir):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if os.path.isfile(fp):
                        total_size += os.path.getsize(fp)
            # 디버깅용 로그 (한 번만)
            print(f"Data directory: {data_dir}, Total size: {total_size / (1024 ** 2):.2f} MB")
        except Exception as e:
            print(f"Error calculating disk usage: {e}")
            return 0.0
    else:
        print(f"Data directory does not exist: {data_dir}")
        return 0.0
    
    return round(total_size / (1024 ** 2), 2)  # MB 단위

def get_system_uptime():
    """Get system uptime string"""
    if psutil:
        try:
            boot_time = psutil.boot_time()
            uptime_seconds = datetime.now().timestamp() - boot_time
            days = int(uptime_seconds // 86400)
            hours = int((uptime_seconds % 86400) // 3600)
            minutes = int((uptime_seconds % 3600) // 60)
            return f"{days} days, {hours:02d}:{minutes:02d}:00"
        except:
            return "Unknown"
    return "Unknown"

def get_metrics():
    """Get comprehensive metrics in the format expected by MetricsResponse model"""
    cpu_usage = get_cpu_usage()
    ram_usage = get_ram_usage()
    disk_usage = get_disk_usage()
    
    return {
        "timestamp": datetime.now().isoformat() + "Z",
        "system": {
            "cpu_usage": cpu_usage,
            "memory_usage": ram_usage,
            "disk_usage": disk_usage,
            "uptime": get_system_uptime()
        },
        "data_quality": {
            "signal_quality": 95.0,  # Default value - can be updated with real data
            "data_loss_rate": 0.1,
            "error_rate": 0.05,
            "throughput": 250.0
        },
        "device": {
            "connection_stability": 98.5,  # Default value - can be updated with real data
            "battery_level": None,
            "signal_strength": None,
            "device_temperature": None
        }
    }
