#!/usr/bin/env python3
"""
Windows용 Link Band SDK 서버 바이너리 빌드 스크립트
"""
import os
import sys
import subprocess
from pathlib import Path
import shutil

def main():
    print("🔨 Building MNE-enabled Windows Link Band SDK Server...")
    
    # 현재 디렉토리 확인
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"📁 Working directory: {os.getcwd()}")
    
    # MNE 및 필수 라이브러리 설치 확인
    required_packages = [
        "pyinstaller",
        "mne", 
        "numpy",
        "scipy", 
        "matplotlib",
        "scikit-learn"
    ]
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"✅ {package} is installed")
        except ImportError:
            print(f"❌ {package} not found. Installing...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    
    # PyInstaller 버전 확인
    try:
        import PyInstaller
        print(f"✅ PyInstaller version: {PyInstaller.__version__}")
    except ImportError:
        print("❌ PyInstaller installation failed!")
        return 1
    
    # 기존 빌드 결과물 정리
    if Path("dist").exists():
        print("🧹 Cleaning previous build...")
        shutil.rmtree("dist")
    if Path("build").exists():
        shutil.rmtree("build")
    
    # PyInstaller 명령어 구성 (MNE-enabled)
    cmd = [
        "pyinstaller",
        "--onefile",
        "--name", "linkband-server-windows",
        "--console",
        "--add-data", "app;app",
        # Core server imports
        "--hidden-import", "uvicorn.main",
        "--hidden-import", "uvicorn.config", 
        "--hidden-import", "uvicorn.server",
        "--hidden-import", "fastapi",
        "--hidden-import", "websockets",
        "--hidden-import", "asyncio",
        "--hidden-import", "sqlite3",
        # MNE and scientific computing
        "--hidden-import", "mne",
        "--hidden-import", "numpy",
        "--hidden-import", "scipy", 
        "--hidden-import", "matplotlib",
        "--hidden-import", "scikit-learn",
        "--hidden-import", "pandas",
        # MNE submodules
        "--hidden-import", "mne.io",
        "--hidden-import", "mne.preprocessing",
        "--hidden-import", "mne.filter",
        "--hidden-import", "mne.time_frequency",
        "--hidden-import", "mne.connectivity",
        "--hidden-import", "mne.datasets",
        # Standard library
        "--hidden-import", "json",
        "--hidden-import", "logging",
        "--hidden-import", "pathlib",
        "--hidden-import", "threading",
        "--hidden-import", "queue",
        "--hidden-import", "time",
        "--hidden-import", "datetime",
        "--hidden-import", "os",
        "--hidden-import", "sys",
        "--hidden-import", "platform",
        "--hidden-import", "signal",
        "--hidden-import", "atexit",
        # Windows specific
        "--hidden-import", "winsound",
        "standalone_server.py"
    ]
    
    print(f"🚀 Running PyInstaller...")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("✅ Build successful!")
        print(result.stdout)
        
        # 빌드 결과 확인
        exe_path = Path("dist") / "linkband-server-windows.exe"
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print(f"📦 Built executable: {exe_path}")
            print(f"📏 File size: {size_mb:.1f} MB")
            
            # 실행 권한 설정 (Windows에서는 불필요하지만 일관성을 위해)
            print("🔧 Setting executable permissions...")
            
            print("🎉 Build completed successfully!")
            print(f"🎯 You can now run: {exe_path}")
            
        else:
            print("❌ Executable not found after build!")
            return 1
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed with exit code {e.returncode}")
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 