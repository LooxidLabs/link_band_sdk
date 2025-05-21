import os
import shutil
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
    # python_core/data 디렉토리의 전체 파일 크기(MB) 합산
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    data_dir = os.path.abspath(data_dir)
    total_size = 0
    if os.path.exists(data_dir):
        for dirpath, dirnames, filenames in os.walk(data_dir):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if os.path.isfile(fp):
                    total_size += os.path.getsize(fp)
    return round(total_size / (1024 ** 2), 2)  # MB 단위

def get_metrics():
    return {
        "cpu": get_cpu_usage(),      # % (현재 프로세스)
        "ram": get_ram_usage(),      # MB (현재 프로세스)
        "disk": get_disk_usage(),    # MB (python_core/data 기준)
    }
