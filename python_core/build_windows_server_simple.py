#!/usr/bin/env python3
"""
Simple Windows build script based on Mac build_standalone.sh
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    print("🔨 Building Windows Link Band SDK Server (Mac-based approach)...")
    
    # 현재 디렉토리 확인
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"📁 Working directory: {os.getcwd()}")
    
    # PyInstaller 설치 확인
    try:
        import PyInstaller
        print("✅ PyInstaller already installed")
    except ImportError:
        print("📦 Installing PyInstaller...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
    
    # MNE 경로 찾기
    try:
        import mne
        mne_data_path = Path(mne.__file__).parent
        print(f"✅ Found MNE at: {mne_data_path}")
    except ImportError:
        print("❌ MNE not found. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "mne"], check=True)
        import mne
        mne_data_path = Path(mne.__file__).parent
    
    # spec 파일 생성 (Mac 스크립트 기반)
    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

# Get mne data path
import mne
mne_data_path = Path(mne.__file__).parent

a = Analysis(
    ['run_server.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('app', 'app'),
        ('data', 'data'),
        ('database', 'database'),
        # Include mne data files
        (str(mne_data_path), 'mne'),
    ],
    hiddenimports=[
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
                 'fastapi',
         'fastapi.middleware',
         'fastapi.middleware.cors',
         'fastapi.staticfiles',
         'fastapi.responses',
        'websockets',
        'websockets.server',
        'websockets.protocol',
        'bleak',
        'bleak.backends.winrt',
        'bleak.backends.winrt.client',
        'bleak.backends.winrt.scanner',
        'numpy',
        'scipy',
        'scipy.signal',
        'scipy.stats',
        'mne',
        'mne.io',
        'mne.filter',
        'mne.viz',
        'heartpy',
        'psutil',
        'python-dotenv',
        'dotenv',
        'python-multipart',
        'multipart',
        'importlib-metadata',
        'importlib_metadata',
        'jaraco',
        'jaraco.classes',
        'jaraco.functools',
        'jaraco.context',
        'jaraco.text',
        'jaraco.collections',
        'jaraco.structures',
        'pkg_resources',
        'lazy_loader',
        'matplotlib',
        'matplotlib.pyplot',
        'matplotlib.backends',
        'matplotlib.backends.backend_agg',
        'app',
        'app.main',
        'app.api',
        'app.api.router_device',
        'app.api.router_stream',
        'app.api.router_data_center',
        'app.api.router_metrics',
        'app.api.router_recording',
        'app.api.router_engine',
        'app.core',
        'app.core.device',
        'app.core.stream_engine',
        'app.core.device_registry',
        'app.core.signal_processing',
        'app.services',
        'app.services.device_service',
        'app.services.stream_service',
        'app.services.data_center',
        'app.services.recording_service',
        'app.database',
        'app.database.db_manager',
        'app.models',
        'app.models.device',
        'app.models.data_models',
        'app.models.recording',
        'encodings',
        'encodings.utf_8',
        'encodings.ascii',
        'encodings.latin_1',
        'encodings.cp1252',
        'encodings.mbcs',
        # Windows-specific imports
        'sqlite3',
        '_sqlite3',
        'asyncio.windows_events',
        'asyncio.windows_utils',
        # Additional imports for mne
        'mne.channels',
        'mne.datasets',
        'mne.epochs',
        'mne.event',
        'mne.forward',
        'mne.minimum_norm',
        'mne.preprocessing',
        'mne.source_estimate',
        'mne.source_space',
        'mne.surface',
        'mne.time_frequency',
        'mne.utils',
        'mne.viz.backends',
        'mne.viz.backends._notebook',
        'mne.viz.backends._utils',
        'mne.viz.backends.renderer',
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=['tkinter'],
    noarchive=False,
    optimize=0,
)

# Add hook to handle mne's lazy loading
a.datas += [
    (f.relative_to(mne_data_path).as_posix(), str(f), 'DATA')
    for f in mne_data_path.rglob('*.pyi')
]

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='linkband-server-windows-simple',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    # spec 파일 저장
    with open('server_windows_simple.spec', 'w') as f:
        f.write(spec_content)
    
    print("✅ Created server_windows_simple.spec file")
    
    # PyInstaller 실행
    print("🔨 Running PyInstaller...")
    try:
        subprocess.run([
            sys.executable, "-m", "PyInstaller", 
            "server_windows_simple.spec", 
            "--clean"
        ], check=True)
        
        print("✅ Build complete!")
        print("📁 Executable is in dist/linkband-server-windows-simple.exe")
        
        # 빌드된 파일 확인
        exe_path = Path("dist/linkband-server-windows-simple.exe")
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print(f"📊 Executable size: {size_mb:.1f} MB")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 