#!/bin/bash

echo "Building standalone Python server..."

# Install PyInstaller if not already installed
pip install pyinstaller

# Create a spec file for PyInstaller
cat > server.spec << 'EOF'
# -*- mode: python ; coding: utf-8 -*-
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
        'websockets',
        'websockets.server',
        'websockets.protocol',
        'bleak',
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
    name='linkband-server',
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
EOF

# Build the standalone executable
pyinstaller server.spec --clean

echo "Build complete! Executable is in dist/linkband-server" 