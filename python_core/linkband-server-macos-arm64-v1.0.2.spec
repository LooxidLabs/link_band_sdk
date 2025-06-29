# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = [('app', 'app'), ('data', 'data'), ('database', 'database')]
binaries = []
hiddenimports = ['app', 'app.main', 'app.api', 'app.core', 'app.services', 'app.models', 'app.database', 'app.data', 'fastapi', 'uvicorn', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'websockets', 'websockets.server', 'websockets.protocol', 'bleak', 'numpy', 'scipy', 'scipy.signal', 'scipy.stats', 'scipy.linalg', 'scipy.sparse', 'scipy.optimize', 'scipy.integrate', 'scipy.interpolate', 'scipy.fft', 'heartpy', 'matplotlib', 'matplotlib.pyplot', 'psutil', 'sqlite3', 'json', 'datetime', 'asyncio', 'threading', 'multiprocessing', 'pathlib', 'typing', 'logging', 'mne', 'mne.io', 'mne.preprocessing', 'mne.filter']
tmp_ret = collect_all('scipy')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('numpy')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('heartpy')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('mne')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['standalone_server.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
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
