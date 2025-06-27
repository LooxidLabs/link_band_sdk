#!/usr/bin/env python3
"""
Fast Windows build script with immediate WebSocket connections
빠른 빌드를 위해 MNE를 제외한 경량 버전
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def main():
    print("⚡ Building Fast Windows Link Band SDK Server (No MNE)...")
    print("🎯 Optimized for speed and immediate WebSocket connections")
    
    # 현재 디렉토리 확인
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"📁 Working directory: {os.getcwd()}")
    
    # 기존 빌드 결과물 정리
    print("🧹 Cleaning previous build...")
    for path in ["dist", "build"]:
        if Path(path).exists():
            shutil.rmtree(path)
    
    # PyInstaller 직접 실행 (빠른 빌드)
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "standalone_server.py",
        "--name=linkband-server-windows-fast",
        "--onefile",
        "--console",
        "--clean",
        "--noconfirm",
        # 데이터 파일들 (macOS에서는 : 구분자 사용)
        "--add-data=app:app",
        "--add-data=data:data", 
        "--add-data=database:database",
        # 핵심 FastAPI 모듈들만 포함 (빠른 빌드)
        "--hidden-import=fastapi",
        "--hidden-import=fastapi.staticfiles",
        "--hidden-import=fastapi.responses", 
        "--hidden-import=fastapi.middleware.cors",
        "--hidden-import=uvicorn",
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=websockets",
        "--hidden-import=websockets.server",
        "--hidden-import=websockets.exceptions",
        "--hidden-import=sqlite3",
        "--hidden-import=_sqlite3",
        "--hidden-import=bleak",
        "--hidden-import=bleak.backends.winrt",
        "--hidden-import=numpy",
        "--hidden-import=numpy.core",
        "--hidden-import=scipy.signal",
        "--hidden-import=scipy.stats",
        "--hidden-import=psutil",
        # Windows 특화
        "--hidden-import=asyncio.windows_events",
        "--hidden-import=asyncio.selector_events",
        "--hidden-import=encodings.utf_8",
        "--hidden-import=encodings.cp1252",
        "--hidden-import=encodings.mbcs",
        # 앱 모듈들
        "--hidden-import=app.main",
        "--hidden-import=app.core.server",
        "--hidden-import=app.core.device",
        "--hidden-import=app.core.device_registry",
        "--hidden-import=app.core.signal_processing",
        "--hidden-import=app.core.utils",
        "--hidden-import=app.services.stream_service",
        "--hidden-import=app.services.device_service",
        "--hidden-import=app.services.data_center",
        "--hidden-import=app.data.data_recorder",
        "--hidden-import=app.database.db_manager",
        "--hidden-import=app.models.device",
        "--hidden-import=app.models.data_models",
        # 제외할 모듈 (빌드 속도 향상)
        "--exclude-module=tkinter",
        "--exclude-module=matplotlib",
        "--exclude-module=PyQt5",
        "--exclude-module=PyQt6",
        "--exclude-module=PySide2",
        "--exclude-module=PySide6",
        "--exclude-module=mne",  # MNE 제외해서 빌드 속도 향상
        "--exclude-module=jupyter",
        "--exclude-module=notebook",
        "--exclude-module=IPython",
    ]
    
    print("🚀 Running fast PyInstaller build...")
    print("⚡ This should be much faster without MNE and visualization libraries...")
    print("=" * 60)
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("✅ Fast build successful!")
        
        # 빌드 결과 확인 (macOS에서 빌드할 때는 .exe 확장자가 없음)
        exe_path = Path("dist") / "linkband-server-windows-fast.exe"
        if not exe_path.exists():
            # macOS에서 빌드한 경우 확장자 없는 파일 확인
            exe_path_no_ext = Path("dist") / "linkband-server-windows-fast"
            if exe_path_no_ext.exists():
                # .exe 확장자 추가
                exe_path_no_ext.rename(exe_path)
                print(f"📝 Renamed {exe_path_no_ext} to {exe_path}")
        
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print("=" * 60)
            print(f"🎉 Fast build completed successfully!")
            print(f"📦 Built executable: {exe_path}")
            print(f"📏 File size: {size_mb:.1f} MB")
            print(f"⚡ Features: Fast startup, immediate WebSocket connections")
            print(f"🚫 Excluded: MNE, matplotlib (for faster build & smaller size)")
            print("=" * 60)
            print("🚀 You can test the fast server with:")
            print(f"   {exe_path}")
            print("⚡ WebSocket connections should be immediate!")
            print("=" * 60)
            
        else:
            print("❌ Executable not found after build!")
            return 1
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed with exit code {e.returncode}")
        print("=" * 60)
        print("STDOUT:")
        print(e.stdout)
        print("=" * 60)
        print("STDERR:")
        print(e.stderr)
        print("=" * 60)
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 