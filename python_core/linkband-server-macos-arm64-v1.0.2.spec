# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

# Get mne data path for including MNE data files
try:
    import mne
    mne_data_path = Path(mne.__file__).parent
    print(f"MNE data path: {mne_data_path}")
    mne_available = True
except ImportError:
    print("Warning: MNE not found, building without MNE support")
    mne_data_path = None
    mne_available = False

a = Analysis(
    ['run_server_production.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('app', 'app'),
        ('database', 'database'),
    ],
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
        'concurrent',
        'concurrent.futures',
        
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
        
        # Bluetooth and device communication (macOS specific)
        'bleak',
        'bleak.backends',
        'bleak.backends.corebluetooth',
        'bleak.backends.corebluetooth.client',
        'bleak.backends.corebluetooth.scanner',
        
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
        
        # MNE and related (Windows 성공 버전 완전 복사)
        'mne',
        'mne.io',
        'mne.io.array',
        'mne.io.base',
        'mne.io.meas_info',
        'mne.filter',
        'mne.viz',
        'mne.viz.backends',
        'mne.viz.backends._notebook',
        'mne.viz.backends._utils', 
        'mne.viz.backends.renderer',
        'mne.viz.misc',
        'mne.viz.utils',
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
        'mne.utils.dataframe',
        'mne.utils.linalg',
        'mne.utils.progressbar',
        'mne.utils._testing',
        'mne.utils.mixin',
        'mne.html_templates',
        'mne.html_templates._templates',
        'mne._fiff',
        'mne._fiff.meas_info',
        'mne._fiff.constants',
        'mne.bem',
        'mne.parallel',
        
        # Signal processing
        'heartpy',
        'sklearn',
        'sklearn.preprocessing',
        'sklearn.decomposition',
        
        # Visualization (MNE 지원용)
        'matplotlib',
        'matplotlib.pyplot',
        'matplotlib.backends',
        'matplotlib.backends.backend_agg',
        
        # System monitoring
        'psutil',
        'aiosqlite',
        
        # Configuration and utilities
        'lazy_loader',
        'importlib_metadata',
        'aiohttp',
        'aiohttp.client',
        'aiohttp.connector',
        
        # Package utilities
        'pkg_resources',
        'jaraco',
        'jaraco.classes',
        'jaraco.functools',
        'jaraco.context',
        'jaraco.text',
        'jaraco.collections',
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
)

# Add MNE data files if available (Windows 스크립트 방식 적용)
if mne_data_path and mne_data_path.exists():
    print("Adding MNE data files...")
    try:
        # Add essential MNE data files (especially .pyi files for stub issues)
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

pyz = PYZ(a.pure, a.zipped_data)

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
