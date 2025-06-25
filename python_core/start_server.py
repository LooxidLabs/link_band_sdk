#!/usr/bin/env python3
"""
Link Band SDK Python 서버 시작 스크립트
"""
import os
import sys
import subprocess
import platform
from pathlib import Path

def get_resource_path():
    """리소스 경로를 가져옵니다."""
    if getattr(sys, 'frozen', False):
        # PyInstaller로 패키징된 경우
        return Path(sys._MEIPASS)
    elif hasattr(sys, '_called_from_test'):
        # 테스트 환경
        return Path(__file__).parent
    else:
        # 개발 환경
        return Path(__file__).parent

def get_python_executable():
    """적절한 Python 실행파일을 찾습니다."""
    resource_path = get_resource_path()
    
    # Electron 앱 리소스 경로에서 Python 찾기
    if platform.system() == "Darwin":  # macOS
        # macOS 앱 번들 내부 경로
        app_python_paths = [
            resource_path / "venv" / "bin" / "python",
            resource_path / "venv" / "bin" / "python3",
            resource_path / "venv" / "bin" / "python3.13"
        ]
        
        for python_path in app_python_paths:
            if python_path.exists():
                return str(python_path)
    
    elif platform.system() == "Windows":  # Windows
        app_python_paths = [
            resource_path / "venv" / "Scripts" / "python.exe",
            resource_path / "venv" / "Scripts" / "python3.exe"
        ]
        
        for python_path in app_python_paths:
            if python_path.exists():
                return str(python_path)
    
    # 시스템 Python 사용
    return sys.executable

def start_server():
    """FastAPI 서버를 시작합니다."""
    resource_path = get_resource_path()
    python_exe = get_python_executable()
    
    # 서버 스크립트 경로
    server_script = resource_path / "app" / "main.py"
    
    if not server_script.exists():
        print(f"Error: Server script not found at {server_script}")
        return False
    
    # 환경 변수 설정
    env = os.environ.copy()
    env['PYTHONPATH'] = str(resource_path)
    
    try:
        # 서버 시작
        cmd = [python_exe, str(server_script)]
        print(f"Starting server with command: {' '.join(cmd)}")
        print(f"Python executable: {python_exe}")
        print(f"Server script: {server_script}")
        
        process = subprocess.Popen(
            cmd,
            env=env,
            cwd=str(resource_path),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        return process
        
    except Exception as e:
        print(f"Error starting server: {e}")
        return None

if __name__ == "__main__":
    server_process = start_server()
    if server_process:
        try:
            # 서버 출력 모니터링
            for line in server_process.stdout:
                print(line.strip())
        except KeyboardInterrupt:
            print("Stopping server...")
            server_process.terminate()
            server_process.wait()
    else:
        print("Failed to start server")
        sys.exit(1) 