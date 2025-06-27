#!/usr/bin/env python3
"""
Fixed Windows build script with comprehensive FastAPI module inclusion
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def main():
    print("🔧 Building Windows Link Band SDK Server (Fixed FastAPI version)...")
    
    # 현재 디렉토리 확인
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"📁 Working directory: {os.getcwd()}")
    
    # 기존 빌드 결과물 정리
    if Path("dist").exists():
        print("🧹 Cleaning previous build...")
        shutil.rmtree("dist")
    if Path("build").exists():
        shutil.rmtree("build")
    
    # 모든 spec 파일 삭제
    for spec_file in Path(".").glob("*.spec"):
        if spec_file.name.startswith("server_windows"):
            spec_file.unlink()
            print(f"🗑️ Removed old spec file: {spec_file}")
    
    # PyInstaller 직접 실행 (spec 파일 없이)
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "run_server.py",
        "--name=linkband-server-windows-fixed",
        "--onefile",
        "--console",
        "--clean",
        # 데이터 파일들
        "--add-data=app;app",
        "--add-data=data;data", 
        "--add-data=database;database",
        # FastAPI 관련 모든 모듈 명시적 포함
        "--hidden-import=fastapi",
        "--hidden-import=fastapi.staticfiles",
        "--hidden-import=fastapi.responses", 
        "--hidden-import=fastapi.middleware",
        "--hidden-import=fastapi.middleware.cors",
        "--hidden-import=fastapi.routing",
        "--hidden-import=fastapi.params",
        "--hidden-import=fastapi.security",
        "--hidden-import=fastapi.dependencies",
        "--hidden-import=fastapi.utils",
        "--hidden-import=fastapi.encoders",
        "--hidden-import=fastapi.exceptions",
        "--hidden-import=fastapi.background",
        # Starlette (FastAPI 기반)
        "--hidden-import=starlette",
        "--hidden-import=starlette.applications",
        "--hidden-import=starlette.middleware",
        "--hidden-import=starlette.middleware.cors",
        "--hidden-import=starlette.responses",
        "--hidden-import=starlette.routing",
        "--hidden-import=starlette.staticfiles",
        # Uvicorn
        "--hidden-import=uvicorn",
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespan",
        "--hidden-import=uvicorn.lifespan.on",
        # WebSockets
        "--hidden-import=websockets",
        "--hidden-import=websockets.server",
        "--hidden-import=websockets.protocol",
        # 데이터베이스
        "--hidden-import=sqlite3",
        "--hidden-import=_sqlite3",
        # Bluetooth (Windows)
        "--hidden-import=bleak",
        "--hidden-import=bleak.backends.winrt",
        "--hidden-import=bleak.backends.winrt.client",
        "--hidden-import=bleak.backends.winrt.scanner",
        # 신호 처리
        "--hidden-import=numpy",
        "--hidden-import=scipy",
        "--hidden-import=scipy.signal",
        "--hidden-import=scipy.stats",
        "--hidden-import=matplotlib",
        "--hidden-import=matplotlib.pyplot",
        "--hidden-import=matplotlib.backends",
        "--hidden-import=matplotlib.backends.backend_agg",
        # MNE (옵션)
        "--hidden-import=mne",
        "--hidden-import=mne.io",
        "--hidden-import=mne.filter",
        # 기타 필수 모듈
        "--hidden-import=psutil",
        "--hidden-import=heartpy",
        "--hidden-import=python-multipart",
        "--hidden-import=multipart",
        "--hidden-import=pydantic",
        # Windows 특화
        "--hidden-import=asyncio.windows_events",
        "--hidden-import=asyncio.windows_utils",
        # 인코딩
        "--hidden-import=encodings.utf_8",
        "--hidden-import=encodings.ascii", 
        "--hidden-import=encodings.latin_1",
        "--hidden-import=encodings.cp1252",
        "--hidden-import=encodings.mbcs",
        # 앱 모듈들
        "--hidden-import=app",
        "--hidden-import=app.main",
        "--hidden-import=app.api.router_device",
        "--hidden-import=app.api.router_stream",
        "--hidden-import=app.api.router_data_center",
        "--hidden-import=app.api.router_metrics",
        "--hidden-import=app.api.router_recording",
        "--hidden-import=app.api.router_engine",
        "--hidden-import=app.core.device",
        "--hidden-import=app.core.stream_engine",
        "--hidden-import=app.core.device_registry",
        "--hidden-import=app.core.signal_processing",
        "--hidden-import=app.services.device_service",
        "--hidden-import=app.services.stream_service",
        "--hidden-import=app.services.data_center",
        "--hidden-import=app.services.recording_service",
        "--hidden-import=app.database.db_manager",
        "--hidden-import=app.models.device",
        "--hidden-import=app.models.data_models",
        "--hidden-import=app.models.recording",
        # 제외할 모듈
        "--exclude-module=tkinter",
        "--exclude-module=matplotlib.backends.backend_qt5agg",
        "--exclude-module=PyQt5",
        "--exclude-module=PySide2",
    ]
    
    print("🚀 Running PyInstaller with comprehensive module inclusion...")
    print("This may take several minutes...")
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("✅ Build successful!")
        
        # 빌드 결과 확인
        exe_path = Path("dist") / "linkband-server-windows-fixed.exe"
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print(f"📦 Built executable: {exe_path}")
            print(f"📏 File size: {size_mb:.1f} MB")
            
            print("🎉 Fixed build completed successfully!")
            print(f"🎯 You can now run: {exe_path}")
            
            # 테스트 실행
            print("\n🧪 Testing imports in built executable...")
            test_cmd = [str(exe_path), "--test-imports"]
            try:
                test_result = subprocess.run(test_cmd, capture_output=True, text=True, timeout=30)
                print("Test output:", test_result.stdout)
                if test_result.stderr:
                    print("Test errors:", test_result.stderr)
            except subprocess.TimeoutExpired:
                print("⚠️ Test timed out (normal for server startup)")
            except Exception as e:
                print(f"⚠️ Test failed: {e}")
            
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