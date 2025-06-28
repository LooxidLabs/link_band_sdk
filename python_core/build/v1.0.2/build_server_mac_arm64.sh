#!/bin/bash

echo "🔨 Building Link Band SDK Server for macOS ARM64 v1.0.2"
echo "📋 MNE-enabled build with full dependencies"

# 현재 스크립트 위치에서 python_core 디렉토리로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_CORE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PYTHON_CORE_DIR"

echo "📁 Working directory: $PYTHON_CORE_DIR"

# 필수 패키지 확인
echo "🔍 Checking required packages..."
python -c "
import sys
packages = [
    'pyinstaller', 'fastapi', 'uvicorn', 'websockets', 'bleak',
    'numpy', 'scipy', 'psutil', 'python-dotenv', 'python-multipart',
    'aiosqlite', 'mne', 'matplotlib', 'sklearn', 'heartpy'
]
missing = []
for pkg in packages:
    try:
        __import__(pkg.replace('-', '_'))
        print(f'✅ {pkg}')
    except ImportError:
        missing.append(pkg)
        print(f'❌ {pkg}')

if missing:
    print(f'Missing packages: {missing}')
    print('Please install missing packages first')
    sys.exit(1)
else:
    print('✅ All required packages are available')
"

if [ $? -ne 0 ]; then
    echo "❌ Package check failed"
    exit 1
fi

# 빌드 디렉토리 정리
echo "🧹 Cleaning previous build..."
rm -rf dist build *.spec

# 배포 디렉토리 생성
DIST_DIR="distribution/v1.0.2/macos-arm64"
mkdir -p "$DIST_DIR"

# PyInstaller spec 파일 생성
echo "📝 Creating PyInstaller spec file..."
cat > linkband_server_macos_arm64_v1.0.2.spec << 'EOF'
# -*- mode: python ; coding: utf-8 -*-
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
        'asyncio.unix_events', 'concurrent', 'concurrent.futures',
        
        # Encoding
        'encodings', 'encodings.utf_8', 'encodings.ascii', 'encodings.latin_1',
        
        # Web server
        'uvicorn', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto',
        'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan', 'uvicorn.lifespan.on',
        'fastapi', 'fastapi.middleware', 'fastapi.middleware.cors',
        'fastapi.staticfiles', 'fastapi.responses',
        'websockets', 'websockets.server', 'websockets.protocol', 'websockets.exceptions',
        
        # Bluetooth
        'bleak', 'bleak.backends', 'bleak.backends.corebluetooth',
        'bleak.backends.corebluetooth.client', 'bleak.backends.corebluetooth.scanner',
        
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
    name='linkband-server-macos-arm64-v1.0.2',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
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
EOF

# PyInstaller 실행
echo "🚀 Running PyInstaller..."
pyinstaller linkband_server_macos_arm64_v1.0.2.spec --clean --noconfirm

# 빌드 결과 확인 및 이동
if [ -f "dist/linkband-server-macos-arm64-v1.0.2" ]; then
    echo "✅ Build successful!"
    
    # 배포 디렉토리로 이동
    mv "dist/linkband-server-macos-arm64-v1.0.2" "$DIST_DIR/"
    
    # 실행 권한 부여
    chmod +x "$DIST_DIR/linkband-server-macos-arm64-v1.0.2"
    
    # 파일 정보 출력
    FILE_SIZE=$(du -h "$DIST_DIR/linkband-server-macos-arm64-v1.0.2" | cut -f1)
    echo "📦 Built executable: $DIST_DIR/linkband-server-macos-arm64-v1.0.2"
    echo "📏 File size: $FILE_SIZE"
    
    # 파일 타입 확인
    file "$DIST_DIR/linkband-server-macos-arm64-v1.0.2"
    
    echo "🎉 Build completed successfully!"
    echo "✅ Executable ready at: $DIST_DIR/linkband-server-macos-arm64-v1.0.2"
else
    echo "❌ Build failed - executable not found"
    exit 1
fi

# 임시 파일 정리
echo "🧹 Cleaning temporary files..."
rm -rf dist build linkband_server_macos_arm64_v1.0.2.spec

echo "✨ macOS ARM64 v1.0.2 build complete!" 