# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['run_server_production.py'],
    pathex=[],
    binaries=[],
    datas=[('app', 'app'), ('database', 'database')],
    hiddenimports=['sqlite3', 'bleak', 'bleak.backends', 'bleak.backends.corebluetooth', 'bleak.backends.corebluetooth.client', 'bleak.backends.corebluetooth.scanner', 'heartpy', 'fastapi', 'fastapi.middleware', 'fastapi.middleware.cors', 'fastapi.staticfiles', 'uvicorn', 'websockets', 'aiohttp', 'aiohttp.web', 'aiohttp.client', 'numpy', 'scipy', 'scipy.signal', 'scipy.stats', 'scipy.fft', 'scipy.interpolate', 'scipy.optimize', 'scipy.sparse', 'scipy.special', 'scipy.integrate', 'scipy.linalg', 'scipy.ndimage', 'psutil', 'aiosqlite', 'asyncio', 'concurrent.futures'],
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
    name='linkband-server-macos-intel-v1.0.2',
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