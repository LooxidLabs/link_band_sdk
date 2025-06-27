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
