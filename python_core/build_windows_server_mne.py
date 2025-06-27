#!/usr/bin/env python3
"""
Windows용 MNE-enabled Link Band SDK 서버 바이너리 빌드 스크립트
Mac의 build_standalone.sh 기반으로 작성
"""
import os
import sys
import subprocess
from pathlib import Path
import shutil

def create_spec_file():
    """PyInstaller spec 파일 생성 (Mac 빌드 스크립트 기반)"""
    
    spec_content = '''# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

# Get mne data path
import mne
mne_data_path = Path(mne.__file__).parent

a = Analysis(
    ['standalone_server.py'],
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
         # Standard library modules that might be missed
         'sqlite3',
         'json',
         'logging',
         'pathlib',
         'threading',
         'queue',
         'time',
         'datetime',
         'os',
         'sys',
         'platform',
         'signal',
         'atexit',
         'asyncio',
         'asyncio.subprocess',
         'asyncio.queues',
         'concurrent',
         'concurrent.futures',
         # Core server imports
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
         'websockets',
         'websockets.server',
         'websockets.protocol',
        'bleak',
        'bleak.backends',
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
        'app.api.router_health',
        'app.api.router_recording',
        'app.api.router_export',
        'app.api.router_engine',
        'app.core',
        'app.core.device',
        'app.core.stream_manager',
        'app.core.device_registry',
        'app.core.data_processor',
        'app.core.metrics_calculator',
        'app.core.filter',
        'app.core.websocket_manager',
        'app.core.signal_processing',
        'app.services',
        'app.services.device_service',
        'app.services.stream_service',
        'app.services.data_center',
        'app.services.recording_service',
        'app.services.export_service',
        'app.services.engine_service',
        'app.data',
        'app.data.data_recorder',
        'app.data.file_manager',
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
         # Database and file handling
         'sqlite3',
         'sqlite3.dbapi2',
         '_sqlite3',
         'csv',
         'io',
         'tempfile',
         'shutil',
         'glob',
         'fnmatch',
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
    hooksconfig={},
    runtime_hooks=[],
         excludes=['tkinter'],
     noarchive=False,
     optimize=0,
     # Include standard library modules explicitly
     module_collection_mode={
         'sqlite3': 'py',
         '_sqlite3': 'py',
         'asyncio': 'py',
         'concurrent': 'py',
     },
 )

# Add hook to handle mne's lazy loading - CRITICAL for Windows
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
    name='linkband-server-windows',
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
    
    with open('server_windows.spec', 'w') as f:
        f.write(spec_content)
    
    print("✅ Created server_windows.spec file")

def main():
    print("🔨 Building MNE-enabled Windows Link Band SDK Server (Mac script based)...")
    
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
        "scikit-learn",
        "bleak",
        "fastapi",
        "uvicorn",
        "websockets",
        "pydantic",
        "starlette",
        "heartpy",
        "psutil",
        "python-dotenv",
        "python-multipart",
        "lazy-loader"
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
    if Path("server_windows.spec").exists():
        os.remove("server_windows.spec")
    
    # Spec 파일 생성
    create_spec_file()
    
    # PyInstaller 실행
    cmd = ["pyinstaller", "server_windows.spec", "--clean"]
    
    print(f"🚀 Running PyInstaller with spec file...")
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
            
            print("🎉 MNE-enabled build completed successfully!")
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