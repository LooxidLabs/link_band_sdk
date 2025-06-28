#!/usr/bin/env python3
"""
Windows용 Link Band SDK 서버 바이너리 빌드 스크립트 v1.0.2
MNE-enabled build with full dependencies
"""
import os
import sys
import subprocess
from pathlib import Path
import shutil

def main():
    print("🔨 Building Link Band SDK Server for Windows v1.0.2")
    print("📋 MNE-enabled build with full dependencies")
    
    # 현재 스크립트 위치에서 python_core 디렉토리로 이동
    script_dir = Path(__file__).parent
    python_core_dir = script_dir.parent.parent
    os.chdir(python_core_dir)
    
    print(f"📁 Working directory: {python_core_dir}")
    
    # 필수 패키지 확인
    print("🔍 Checking required packages...")
    packages = [
        'pyinstaller', 'fastapi', 'uvicorn', 'websockets', 'bleak',
        'numpy', 'scipy', 'psutil', 'python-dotenv', 'python-multipart',
        'aiosqlite', 'mne', 'matplotlib', 'sklearn', 'heartpy'
    ]
    
    missing = []
    for pkg in packages:
        try:
            __import__(pkg.replace('-', '_'))
            print(f"✅ {pkg}")
        except ImportError:
            missing.append(pkg)
            print(f"❌ {pkg}")
    
    if missing:
        print(f"Missing packages: {missing}")
        print("Please install missing packages first")
        return 1
    
    print("✅ All required packages are available")
    
    # 빌드 디렉토리 정리
    print("🧹 Cleaning previous build...")
    for path in ["dist", "build"]:
        if Path(path).exists():
            shutil.rmtree(path)
    
    for spec_file in Path(".").glob("*.spec"):
        spec_file.unlink()
    
    # 배포 디렉토리 생성
    dist_dir = Path("distribution/v1.0.2/windows")
    dist_dir.mkdir(parents=True, exist_ok=True)
    
    # PyInstaller spec 파일 생성
    print("📝 Creating PyInstaller spec file...")
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
        (str(mne_data_path), 'mne'),
    ] if mne_data_path else []),
    hiddenimports=[
        # Core modules
        'sqlite3', 'json', 'logging', 'pathlib', 'threading', 'queue',
        'time', 'datetime', 'os', 'sys', 'platform', 'signal', 'atexit',
        'asyncio', 'asyncio.subprocess', 'asyncio.queues', 'asyncio.selector_events',
        'asyncio.windows_events', 'concurrent', 'concurrent.futures',
        
        # Encoding (Windows 필수)
        'encodings', 'encodings.utf_8', 'encodings.ascii', 'encodings.latin_1',
        'encodings.cp1252', 'encodings.mbcs',
        
        # Web server
        'uvicorn', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto',
        'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan', 'uvicorn.lifespan.on',
        'fastapi', 'fastapi.middleware', 'fastapi.middleware.cors',
        'fastapi.staticfiles', 'fastapi.responses',
        'websockets', 'websockets.server', 'websockets.protocol', 'websockets.exceptions',
        
        # Bluetooth (Windows)
        'bleak', 'bleak.backends', 'bleak.backends.winrt',
        'bleak.backends.winrt.client', 'bleak.backends.winrt.scanner',
        
        # Scientific computing
        'numpy', 'numpy.core', 'numpy.lib', 'numpy.linalg', 'numpy.fft', 'numpy.random',
        'scipy', 'scipy.signal', 'scipy.stats', 'scipy.fft', 'scipy.interpolate',
        'scipy.optimize', 'scipy.sparse', 'scipy.special', 'scipy.integrate',
        'scipy.linalg', 'scipy.ndimage',
        
        # MNE
        'mne', 'mne.io', 'mne.filter', 'mne.viz', 'mne.channels', 'mne.datasets',
        'mne.epochs', 'mne.event', 'mne.forward', 'mne.minimum_norm',
        'mne.preprocessing', 'mne.source_estimate', 'mne.source_space',
        'mne.surface', 'mne.time_frequency', 'mne.utils', 'mne.viz.backends',
        'mne.transforms', 'mne.bem', 'mne.coreg', 'mne.defaults',
        'mne.externals', 'mne.simulation',
        
        # Signal processing
        'heartpy', 'sklearn', 'sklearn.preprocessing', 'sklearn.decomposition',
        'sklearn.base', 'sklearn.utils', 'sklearn.metrics',
        
        # System
        'psutil',
        
        # Utils
        'python-dotenv', 'dotenv', 'python-multipart', 'multipart',
        'importlib-metadata', 'importlib_metadata', 'lazy_loader',
        
        # Visualization
        'matplotlib', 'matplotlib.pyplot', 'matplotlib.backends',
        'matplotlib.backends.backend_agg', 'matplotlib.figure',
        'matplotlib.patches', 'matplotlib.colors', 'matplotlib.cm',
        
        # App modules
        'app', 'app.main', 'app.api', 'app.core', 'app.services',
        'app.data', 'app.database', 'app.models',
        
        # Database
        'sqlite3', 'sqlite3.dbapi2', '_sqlite3', 'aiosqlite',
        
        # File handling
        'csv', 'io', 'tempfile', 'shutil', 'glob', 'fnmatch',
        
        # Package utilities
        'pkg_resources', 'jaraco', 'jaraco.classes', 'jaraco.functools',
        'jaraco.context', 'jaraco.text', 'jaraco.collections', 'jaraco.structures',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5', 'PyQt6', 'PySide2', 'PySide6', 'jupyter', 'notebook', 'IPython'],
    noarchive=False,
    optimize=0,
    module_collection_mode={
        'sqlite3': 'py',
        '_sqlite3': 'py',
        'asyncio': 'py',
        'concurrent': 'py',
    },
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='linkband-server-windows-v1.0.2',
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
    
    with open('linkband_server_windows_v1.0.2.spec', 'w') as f:
        f.write(spec_content)
    
    print("✅ Created linkband_server_windows_v1.0.2.spec file")
    
    # PyInstaller 실행
    print("🚀 Running PyInstaller...")
    cmd = ["pyinstaller", "linkband_server_windows_v1.0.2.spec", "--clean", "--noconfirm"]
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("✅ Build successful!")
        
        # 빌드 결과 확인
        exe_path = Path("dist") / "linkband-server-windows-v1.0.2.exe"
        if not exe_path.exists():
            # 확장자 없는 파일 확인 (크로스 플랫폼 빌드)
            exe_path_no_ext = Path("dist") / "linkband-server-windows-v1.0.2"
            if exe_path_no_ext.exists():
                exe_path = exe_path_no_ext.rename(exe_path_no_ext.with_suffix('.exe'))
        
        if exe_path.exists():
            # 배포 디렉토리로 이동
            target_path = dist_dir / "linkband-server-windows-v1.0.2.exe"
            shutil.move(str(exe_path), str(target_path))
            
            # 파일 정보 출력
            file_size = target_path.stat().st_size / (1024 * 1024)
            print(f"📦 Built executable: {target_path}")
            print(f"📏 File size: {file_size:.1f} MB")
            
            print("🎉 Build completed successfully!")
            print(f"✅ Executable ready at: {target_path}")
            
        else:
            print("❌ Build failed - executable not found")
            return 1
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed with error: {e}")
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)
        return 1
    
    # 임시 파일 정리
    print("🧹 Cleaning temporary files...")
    for path in ["dist", "build", "linkband_server_windows_v1.0.2.spec"]:
        if Path(path).exists():
            if Path(path).is_dir():
                shutil.rmtree(path)
            else:
                os.remove(path)
    
    print("✨ Windows v1.0.2 build complete!")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 