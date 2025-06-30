#!/usr/bin/env python3
"""
Windows용 MNE-enabled Link Band SDK 서버 바이너리 빌드 스크립트
성공한 linkband-server-windows-fixed.exe 기반으로 MNE 지원 추가
"""
import os
import sys
import subprocess
from pathlib import Path
import shutil

def create_spec_file():
    """PyInstaller spec 파일 생성 (성공한 fixed 버전 기반)"""
    
    spec_content = '''# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

# Get mne data path for including MNE data files
try:
    import mne
    mne_data_path = Path(mne.__file__).parent
    print(f"MNE data path: {mne_data_path}")
except ImportError:
    print("Warning: MNE not found, building without MNE support")
    mne_data_path = None

a = Analysis(
    ['standalone_server.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('app', 'app'),
        ('data', 'data'),
        ('database', 'database'),
    ] + ([
        # Include mne data files only if MNE is available
        (str(mne_data_path), 'mne'),
    ] if mne_data_path else []),
    hiddenimports=[
        # Core Python modules
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
        'asyncio.selector_events',
        'asyncio.windows_events',
        'concurrent',
        'concurrent.futures',
        
        # Encoding modules (Windows 필수)
        'encodings',
        'encodings.utf_8',
        'encodings.ascii',
        'encodings.latin_1',
        'encodings.cp1252',
        'encodings.mbcs',
        
        # Web server core
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
        'websockets.exceptions',
        
        # Bluetooth and device communication
        'bleak',
        'bleak.backends',
        'bleak.backends.winrt',
        'bleak.backends.winrt.client',
        'bleak.backends.winrt.scanner',
        
        # Scientific computing
        'numpy',
        'numpy.core',
        'numpy.lib',
        'numpy.linalg',
        'scipy',
        'scipy.signal',
        'scipy.stats',
        'scipy.fft',
        'scipy.interpolate',
        
        # MNE and related (optional)
        'mne',
        'mne.io',
        'mne.filter',
        'mne.viz',
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
        
        # Signal processing
        'heartpy',
        'sklearn',
        'sklearn.preprocessing',
        'sklearn.decomposition',
        
        # System monitoring
        'psutil',
        
        # Configuration and utilities
        'python-dotenv',
        'dotenv',
        'python-multipart',
        'multipart',
        'importlib-metadata',
        'importlib_metadata',
        'lazy_loader',
        
        # Visualization (optional)
        'matplotlib',
        'matplotlib.pyplot',
        'matplotlib.backends',
        'matplotlib.backends.backend_agg',
        
        # Application modules
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
        'app.core.server',
        'app.core.device_registry',
        'app.core.signal_processing',
        'app.core.utils',
        'app.core.ws_singleton',
        'app.services',
        'app.services.device_service',
        'app.services.stream_service',
        'app.services.data_center',
        'app.services.recording_service',
        'app.services.signal_processing_service',
        'app.data',
        'app.data.data_recorder',
        'app.database',
        'app.database.db_manager',
        'app.models',
        'app.models.device',
        'app.models.data_models',
        'app.models.recording',
        
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
        
        # Package utilities
        'pkg_resources',
        'jaraco',
        'jaraco.classes',
        'jaraco.functools',
        'jaraco.context',
        'jaraco.text',
        'jaraco.collections',
        'jaraco.structures',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'PyQt5',
        'PyQt6',
        'PySide2',
        'PySide6',
        'jupyter',
        'notebook',
        'IPython',
    ],
    noarchive=False,
    optimize=0,
    module_collection_mode={
        'sqlite3': 'py',
        '_sqlite3': 'py',
        'asyncio': 'py',
        'concurrent': 'py',
    },
)

# Add MNE data files if available
if mne_data_path and mne_data_path.exists():
    print("Adding MNE data files...")
    try:
        # Add essential MNE data files
        mne_files = list(mne_data_path.rglob('*.pyi'))
        for f in mne_files[:100]:  # Limit to first 100 files to avoid bloat
            try:
                relative_path = f.relative_to(mne_data_path).as_posix()
                a.datas.append((f'mne/{relative_path}', str(f), 'DATA'))
            except Exception as e:
                print(f"Warning: Could not add MNE file {f}: {e}")
        print(f"Added {len(mne_files)} MNE data files")
    except Exception as e:
        print(f"Warning: Error adding MNE data files: {e}")

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='linkband-server-windows-fixed',
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
    icon=None,
)
'''
    
    with open('server_windows_mne.spec', 'w') as f:
        f.write(spec_content)
    
    print("✅ Created server_windows_mne.spec file")

def check_and_install_requirements():
    """필수 패키지 확인 및 설치"""
    print("🔍 Checking required packages...")
    
    # 필수 패키지 목록 (우선순위 순)
    critical_packages = [
        "pyinstaller>=5.0",
        "fastapi",
        "uvicorn[standard]",
        "websockets",
        "bleak",
        "numpy",
        "scipy",
        "psutil",
        "python-dotenv",
        "python-multipart",
    ]
    
    # 선택적 패키지 (MNE 관련)
    optional_packages = [
        "mne",
        "matplotlib",
        "scikit-learn",
        "heartpy",
        "lazy-loader",
    ]
    
    # 필수 패키지 설치
    for package in critical_packages:
        package_name = package.split(">=")[0].split("[")[0]
        try:
            __import__(package_name.replace("-", "_"))
            print(f"✅ {package_name} is installed")
        except ImportError:
            print(f"📦 Installing {package}...")
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
                print(f"✅ {package_name} installed successfully")
            except subprocess.CalledProcessError as e:
                print(f"❌ Failed to install {package}: {e}")
                return False
    
    # 선택적 패키지 설치 (실패해도 계속 진행)
    for package in optional_packages:
        package_name = package.split(">=")[0].split("[")[0]
        try:
            __import__(package_name.replace("-", "_"))
            print(f"✅ {package_name} is installed")
        except ImportError:
            print(f"📦 Installing optional package {package}...")
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
                print(f"✅ {package_name} installed successfully")
            except subprocess.CalledProcessError as e:
                print(f"⚠️  Optional package {package} failed to install: {e}")
                print("   (This is not critical, continuing...)")
    
    return True

def main():
    print("🔨 Building MNE-enabled Windows Link Band SDK Server...")
    print("📋 Based on successful linkband-server-windows-fixed.exe")
    
    # 현재 디렉토리 확인
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"📁 Working directory: {os.getcwd()}")
    
    # 필수 패키지 확인 및 설치
    if not check_and_install_requirements():
        print("❌ Failed to install required packages")
        return 1
    
    # PyInstaller 버전 확인
    try:
        import PyInstaller
        print(f"✅ PyInstaller version: {PyInstaller.__version__}")
    except ImportError:
        print("❌ PyInstaller installation failed!")
        return 1
    
    # MNE 설치 확인
    try:
        import mne
        print(f"✅ MNE version: {mne.__version__}")
        mne_available = True
    except ImportError:
        print("⚠️  MNE not available - building without MNE support")
        mne_available = False
    
    # 기존 빌드 결과물 정리
    print("🧹 Cleaning previous build...")
    for path in ["dist", "build", "server_windows_mne.spec"]:
        if Path(path).exists():
            if Path(path).is_dir():
                shutil.rmtree(path)
            else:
                os.remove(path)
    
    # Spec 파일 생성
    create_spec_file()
    
    # PyInstaller 실행
    cmd = ["pyinstaller", "server_windows_mne.spec", "--clean", "--noconfirm"]
    
    print(f"🚀 Running PyInstaller...")
    print(f"Command: {' '.join(cmd)}")
    print("=" * 60)
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("✅ Build successful!")
        
        # 빌드 결과 확인 (macOS에서 빌드할 때는 .exe 확장자가 없음)
        exe_path = Path("dist") / "linkband-server-windows-fixed.exe"
        if not exe_path.exists():
            # macOS에서 빌드한 경우 확장자 없는 파일 확인
            exe_path_no_ext = Path("dist") / "linkband-server-windows-fixed"
            if exe_path_no_ext.exists():
                # .exe 확장자 추가
                exe_path_no_ext.rename(exe_path)
                print(f"📝 Renamed {exe_path_no_ext} to {exe_path}")
        
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print("=" * 60)
            print(f"🎉 Build completed successfully!")
            print(f"📦 Built executable: {exe_path}")
            print(f"📏 File size: {size_mb:.1f} MB")
            print(f"🧬 MNE support: {'✅ Included' if mne_available else '❌ Not available'}")
            print("=" * 60)
            print("🚀 You can now run the server with:")
            print(f"   python run_server.py")
            print("   or directly:")
            print(f"   {exe_path}")
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