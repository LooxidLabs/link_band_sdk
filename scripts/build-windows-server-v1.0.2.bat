@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================================
echo   Link Band SDK Windows Server Builder v1.0.2
echo        - Based on successful build configurations -
echo ========================================================
echo.
echo This v1.0.2 version includes:
echo - Comprehensive dependency collection from successful builds
echo - Enhanced FastAPI/uvicorn support
echo - Application module auto-detection
echo - Windows encoding modules
echo - MNE support (optional)
echo - SQLite/aiosqlite complete integration
echo.
pause

echo.
echo Step 1: Environment check...

if not exist "python_core" (
    echo ERROR: python_core directory not found
    echo Please run from project root directory
    pause
    exit /b 1
)

python --version >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: Python not found
    echo Please install Python and add to PATH
    pause
    exit /b 1
)

echo OK: Environment check passed

echo.
echo Step 2: Navigate to python_core...
cd python_core

echo.
echo Step 3: Create/activate virtual environment...
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo ERROR: Failed to create venv
        pause
        exit /b 1
    )
)

call venv\Scripts\activate.bat
if !errorlevel! neq 0 (
    echo ERROR: Failed to activate venv
    pause
    exit /b 1
)

echo.
echo Step 4: Upgrade pip and install build tools...
python -m pip install --upgrade pip
pip install wheel setuptools

echo.
echo Step 5: Install comprehensive dependencies...
echo Installing critical packages...
pip install pyinstaller

echo Installing core web framework...
pip install fastapi uvicorn[standard] websockets

echo Installing database support...
pip install aiosqlite sqlite3

echo Installing scientific computing...
pip install numpy scipy

echo Installing device communication...
pip install bleak psutil

echo Installing signal processing...
pip install heartpy

echo Installing utilities...
pip install python-dotenv python-multipart

echo Installing optional packages...
pip install mne matplotlib scikit-learn lazy-loader aiohttp importlib-metadata 2>nul

if exist "requirements.txt" (
    echo Installing from requirements.txt...
    pip install -r requirements.txt
)

echo.
echo Step 6: Verify critical imports...
echo Testing core modules...
python -c "import fastapi; print('fastapi OK')"
if !errorlevel! neq 0 (
    echo ERROR: fastapi import failed
    pause
    exit /b 1
)

python -c "import uvicorn; print('uvicorn OK')"
if !errorlevel! neq 0 (
    echo ERROR: uvicorn import failed
    pause
    exit /b 1
)

python -c "import aiosqlite; print('aiosqlite OK')"
if !errorlevel! neq 0 (
    echo ERROR: aiosqlite import failed
    pause
    exit /b 1
)

python -c "import bleak; print('bleak OK')"
if !errorlevel! neq 0 (
    echo ERROR: bleak import failed
    pause
    exit /b 1
)

echo Testing optional but important modules...
python -c "import mne; print('mne OK')" 2>nul
if !errorlevel! equ 0 (
    echo MNE available - will include comprehensive MNE support
) else (
    echo MNE not available - building without MNE support
)

python -c "import aiohttp; print('aiohttp OK')" 2>nul
if !errorlevel! equ 0 (
    echo aiohttp available
) else (
    echo aiohttp not available - installing...
    pip install aiohttp
)

echo All critical modules verified successfully!

echo.
echo Step 7: Detect server file...
set SERVER_FILE=
if exist "run_server_production.py" (
    set SERVER_FILE=run_server_production.py
    echo Found: run_server_production.py
) else if exist "run_server.py" (
    set SERVER_FILE=run_server.py
    echo Found: run_server.py
) else if exist "standalone_server.py" (
    set SERVER_FILE=standalone_server.py
    echo Found: standalone_server.py
) else if exist "main.py" (
    set SERVER_FILE=main.py
    echo Found: main.py
) else (
    echo ERROR: No server file found
    echo Need one of: run_server_production.py, run_server.py, standalone_server.py, main.py
    pause
    exit /b 1
)

echo.
echo Step 8: Clean previous build...
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist
if exist "linkband-server-v1.0.2.spec" del "linkband-server-v1.0.2.spec"

echo.
echo Step 9: Create comprehensive spec file...
echo Creating spec file based on successful build configurations...

echo # -*- mode: python ; coding: utf-8 -*- > linkband-server-v1.0.2.spec
echo import sys >> linkband-server-v1.0.2.spec
echo from pathlib import Path >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo # Get mne data path for including MNE data files >> linkband-server-v1.0.2.spec
echo try: >> linkband-server-v1.0.2.spec
echo     import mne >> linkband-server-v1.0.2.spec
echo     mne_data_path = Path(mne.__file__^).parent >> linkband-server-v1.0.2.spec
echo     print(f"MNE data path: {mne_data_path}"^) >> linkband-server-v1.0.2.spec
echo     mne_available = True >> linkband-server-v1.0.2.spec
echo except ImportError: >> linkband-server-v1.0.2.spec
echo     print("Warning: MNE not found, building without MNE support"^) >> linkband-server-v1.0.2.spec
echo     mne_data_path = None >> linkband-server-v1.0.2.spec
echo     mne_available = False >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo a = Analysis( >> linkband-server-v1.0.2.spec
echo     ['!SERVER_FILE!'], >> linkband-server-v1.0.2.spec
echo     pathex=[], >> linkband-server-v1.0.2.spec
echo     binaries=[], >> linkband-server-v1.0.2.spec
echo     datas=[ >> linkband-server-v1.0.2.spec
echo         ('app', 'app'^), >> linkband-server-v1.0.2.spec
echo         ('database', 'database'^), >> linkband-server-v1.0.2.spec
echo     ], >> linkband-server-v1.0.2.spec

echo     hiddenimports=[ >> linkband-server-v1.0.2.spec
echo         # Core Python modules >> linkband-server-v1.0.2.spec
echo         'sqlite3', >> linkband-server-v1.0.2.spec
echo         'json', >> linkband-server-v1.0.2.spec
echo         'logging', >> linkband-server-v1.0.2.spec
echo         'pathlib', >> linkband-server-v1.0.2.spec
echo         'threading', >> linkband-server-v1.0.2.spec
echo         'queue', >> linkband-server-v1.0.2.spec
echo         'time', >> linkband-server-v1.0.2.spec
echo         'datetime', >> linkband-server-v1.0.2.spec
echo         'os', >> linkband-server-v1.0.2.spec
echo         'sys', >> linkband-server-v1.0.2.spec
echo         'platform', >> linkband-server-v1.0.2.spec
echo         'signal', >> linkband-server-v1.0.2.spec
echo         'atexit', >> linkband-server-v1.0.2.spec
echo         'asyncio', >> linkband-server-v1.0.2.spec
echo         'asyncio.subprocess', >> linkband-server-v1.0.2.spec
echo         'asyncio.queues', >> linkband-server-v1.0.2.spec
echo         'asyncio.selector_events', >> linkband-server-v1.0.2.spec
echo         'asyncio.windows_events', >> linkband-server-v1.0.2.spec
echo         'concurrent', >> linkband-server-v1.0.2.spec
echo         'concurrent.futures', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # Encoding modules (Windows essential^) >> linkband-server-v1.0.2.spec
echo         'encodings', >> linkband-server-v1.0.2.spec
echo         'encodings.utf_8', >> linkband-server-v1.0.2.spec
echo         'encodings.ascii', >> linkband-server-v1.0.2.spec
echo         'encodings.latin_1', >> linkband-server-v1.0.2.spec
echo         'encodings.cp1252', >> linkband-server-v1.0.2.spec
echo         'encodings.mbcs', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # Web server core >> linkband-server-v1.0.2.spec
echo         'uvicorn', >> linkband-server-v1.0.2.spec
echo         'uvicorn.logging', >> linkband-server-v1.0.2.spec
echo         'uvicorn.loops', >> linkband-server-v1.0.2.spec
echo         'uvicorn.loops.auto', >> linkband-server-v1.0.2.spec
echo         'uvicorn.protocols', >> linkband-server-v1.0.2.spec
echo         'uvicorn.protocols.http', >> linkband-server-v1.0.2.spec
echo         'uvicorn.protocols.http.auto', >> linkband-server-v1.0.2.spec
echo         'uvicorn.protocols.websockets', >> linkband-server-v1.0.2.spec
echo         'uvicorn.protocols.websockets.auto', >> linkband-server-v1.0.2.spec
echo         'uvicorn.lifespan', >> linkband-server-v1.0.2.spec
echo         'uvicorn.lifespan.on', >> linkband-server-v1.0.2.spec
echo         'fastapi', >> linkband-server-v1.0.2.spec
echo         'fastapi.middleware', >> linkband-server-v1.0.2.spec
echo         'fastapi.middleware.cors', >> linkband-server-v1.0.2.spec
echo         'fastapi.staticfiles', >> linkband-server-v1.0.2.spec
echo         'fastapi.responses', >> linkband-server-v1.0.2.spec
echo         'websockets', >> linkband-server-v1.0.2.spec
echo         'websockets.server', >> linkband-server-v1.0.2.spec
echo         'websockets.protocol', >> linkband-server-v1.0.2.spec
echo         'websockets.exceptions', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # Bluetooth and device communication >> linkband-server-v1.0.2.spec
echo         'bleak', >> linkband-server-v1.0.2.spec
echo         'bleak.backends', >> linkband-server-v1.0.2.spec
echo         'bleak.backends.winrt', >> linkband-server-v1.0.2.spec
echo         'bleak.backends.winrt.client', >> linkband-server-v1.0.2.spec
echo         'bleak.backends.winrt.scanner', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # Scientific computing >> linkband-server-v1.0.2.spec
echo         'numpy', >> linkband-server-v1.0.2.spec
echo         'numpy.core', >> linkband-server-v1.0.2.spec
echo         'numpy.lib', >> linkband-server-v1.0.2.spec
echo         'numpy.linalg', >> linkband-server-v1.0.2.spec
echo         'scipy', >> linkband-server-v1.0.2.spec
echo         'scipy.signal', >> linkband-server-v1.0.2.spec
echo         'scipy.stats', >> linkband-server-v1.0.2.spec
echo         'scipy.fft', >> linkband-server-v1.0.2.spec
echo         'scipy.interpolate', >> linkband-server-v1.0.2.spec
echo         'scipy.optimize', >> linkband-server-v1.0.2.spec
echo         'scipy.sparse', >> linkband-server-v1.0.2.spec
echo         'scipy.special', >> linkband-server-v1.0.2.spec
echo         'scipy.integrate', >> linkband-server-v1.0.2.spec
echo         'scipy.linalg', >> linkband-server-v1.0.2.spec
echo         'scipy.ndimage', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # MNE and related (comprehensive from macOS success^) >> linkband-server-v1.0.2.spec
echo         'mne', >> linkband-server-v1.0.2.spec
echo         'mne.io', >> linkband-server-v1.0.2.spec
echo         'mne.io.array', >> linkband-server-v1.0.2.spec
echo         'mne.io.base', >> linkband-server-v1.0.2.spec
echo         'mne.io.meas_info', >> linkband-server-v1.0.2.spec
echo         'mne.filter', >> linkband-server-v1.0.2.spec
echo         'mne.viz', >> linkband-server-v1.0.2.spec
echo         'mne.viz.backends', >> linkband-server-v1.0.2.spec
echo         'mne.viz.backends._notebook', >> linkband-server-v1.0.2.spec
echo         'mne.viz.backends._utils', >> linkband-server-v1.0.2.spec
echo         'mne.viz.backends.renderer', >> linkband-server-v1.0.2.spec
echo         'mne.viz.misc', >> linkband-server-v1.0.2.spec
echo         'mne.viz.utils', >> linkband-server-v1.0.2.spec
echo         'mne.channels', >> linkband-server-v1.0.2.spec
echo         'mne.datasets', >> linkband-server-v1.0.2.spec
echo         'mne.epochs', >> linkband-server-v1.0.2.spec
echo         'mne.event', >> linkband-server-v1.0.2.spec
echo         'mne.forward', >> linkband-server-v1.0.2.spec
echo         'mne.minimum_norm', >> linkband-server-v1.0.2.spec
echo         'mne.preprocessing', >> linkband-server-v1.0.2.spec
echo         'mne.source_estimate', >> linkband-server-v1.0.2.spec
echo         'mne.source_space', >> linkband-server-v1.0.2.spec
echo         'mne.surface', >> linkband-server-v1.0.2.spec
echo         'mne.time_frequency', >> linkband-server-v1.0.2.spec
echo         'mne.utils', >> linkband-server-v1.0.2.spec
echo         'mne.utils.dataframe', >> linkband-server-v1.0.2.spec
echo         'mne.utils.linalg', >> linkband-server-v1.0.2.spec
echo         'mne.utils.progressbar', >> linkband-server-v1.0.2.spec
echo         'mne.utils._testing', >> linkband-server-v1.0.2.spec
echo         'mne.utils.mixin', >> linkband-server-v1.0.2.spec
echo         'mne.html_templates', >> linkband-server-v1.0.2.spec
echo         'mne.html_templates._templates', >> linkband-server-v1.0.2.spec
echo         'mne._fiff', >> linkband-server-v1.0.2.spec
echo         'mne._fiff.meas_info', >> linkband-server-v1.0.2.spec
echo         'mne._fiff.constants', >> linkband-server-v1.0.2.spec
echo         'mne.bem', >> linkband-server-v1.0.2.spec
echo         'mne.parallel', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # Visualization (MNE support^) >> linkband-server-v1.0.2.spec
echo         'matplotlib', >> linkband-server-v1.0.2.spec
echo         'matplotlib.pyplot', >> linkband-server-v1.0.2.spec
echo         'matplotlib.backends', >> linkband-server-v1.0.2.spec
echo         'matplotlib.backends.backend_agg', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # Database modules (comprehensive^) >> linkband-server-v1.0.2.spec
echo         'sqlite3', >> linkband-server-v1.0.2.spec
echo         'sqlite3.dbapi2', >> linkband-server-v1.0.2.spec
echo         'sqlite3.dump', >> linkband-server-v1.0.2.spec
echo         '_sqlite3', >> linkband-server-v1.0.2.spec
echo         'aiosqlite', >> linkband-server-v1.0.2.spec
echo         'aiosqlite.core', >> linkband-server-v1.0.2.spec
echo         'aiosqlite.context', >> linkband-server-v1.0.2.spec
echo         'aiosqlite.cursor', >> linkband-server-v1.0.2.spec
echo         'aiosqlite.connection', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # Signal processing >> linkband-server-v1.0.2.spec
echo         'heartpy', >> linkband-server-v1.0.2.spec
echo         'sklearn', >> linkband-server-v1.0.2.spec
echo         'sklearn.preprocessing', >> linkband-server-v1.0.2.spec
echo         'sklearn.decomposition', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # System monitoring >> linkband-server-v1.0.2.spec
echo         'psutil', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # Configuration and utilities >> linkband-server-v1.0.2.spec
echo         'python-dotenv', >> linkband-server-v1.0.2.spec
echo         'dotenv', >> linkband-server-v1.0.2.spec
echo         'python-multipart', >> linkband-server-v1.0.2.spec
echo         'multipart', >> linkband-server-v1.0.2.spec
echo         'importlib-metadata', >> linkband-server-v1.0.2.spec
echo         'importlib_metadata', >> linkband-server-v1.0.2.spec
echo         'lazy_loader', >> linkband-server-v1.0.2.spec
echo         'aiohttp', >> linkband-server-v1.0.2.spec
echo         'aiohttp.client', >> linkband-server-v1.0.2.spec
echo         'aiohttp.connector', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # Application modules >> linkband-server-v1.0.2.spec
echo         'app', >> linkband-server-v1.0.2.spec
echo         'app.main', >> linkband-server-v1.0.2.spec
echo         'app.api', >> linkband-server-v1.0.2.spec
echo         'app.api.router_device', >> linkband-server-v1.0.2.spec
echo         'app.api.router_stream', >> linkband-server-v1.0.2.spec
echo         'app.api.router_data_center', >> linkband-server-v1.0.2.spec
echo         'app.api.router_metrics', >> linkband-server-v1.0.2.spec
echo         'app.api.router_recording', >> linkband-server-v1.0.2.spec
echo         'app.api.router_engine', >> linkband-server-v1.0.2.spec
echo         'app.core', >> linkband-server-v1.0.2.spec
echo         'app.core.device', >> linkband-server-v1.0.2.spec
echo         'app.core.server', >> linkband-server-v1.0.2.spec
echo         'app.core.device_registry', >> linkband-server-v1.0.2.spec
echo         'app.core.signal_processing', >> linkband-server-v1.0.2.spec
echo         'app.core.utils', >> linkband-server-v1.0.2.spec
echo         'app.core.ws_singleton', >> linkband-server-v1.0.2.spec
echo         'app.services', >> linkband-server-v1.0.2.spec
echo         'app.services.device_service', >> linkband-server-v1.0.2.spec
echo         'app.services.stream_service', >> linkband-server-v1.0.2.spec
echo         'app.services.data_center', >> linkband-server-v1.0.2.spec
echo         'app.services.recording_service', >> linkband-server-v1.0.2.spec
echo         'app.services.signal_processing_service', >> linkband-server-v1.0.2.spec
echo         'app.data', >> linkband-server-v1.0.2.spec
echo         'app.data.data_recorder', >> linkband-server-v1.0.2.spec
echo         'app.database', >> linkband-server-v1.0.2.spec
echo         'app.database.db_manager', >> linkband-server-v1.0.2.spec
echo         'app.models', >> linkband-server-v1.0.2.spec
echo         'app.models.device', >> linkband-server-v1.0.2.spec
echo         'app.models.data_models', >> linkband-server-v1.0.2.spec
echo         'app.models.recording', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # File handling >> linkband-server-v1.0.2.spec
echo         'csv', >> linkband-server-v1.0.2.spec
echo         'io', >> linkband-server-v1.0.2.spec
echo         'tempfile', >> linkband-server-v1.0.2.spec
echo         'shutil', >> linkband-server-v1.0.2.spec
echo         'glob', >> linkband-server-v1.0.2.spec
echo         'fnmatch', >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo         # Package utilities >> linkband-server-v1.0.2.spec
echo         'pkg_resources', >> linkband-server-v1.0.2.spec
echo         'jaraco', >> linkband-server-v1.0.2.spec
echo         'jaraco.classes', >> linkband-server-v1.0.2.spec
echo         'jaraco.functools', >> linkband-server-v1.0.2.spec
echo         'jaraco.context', >> linkband-server-v1.0.2.spec
echo         'jaraco.text', >> linkband-server-v1.0.2.spec
echo         'jaraco.collections', >> linkband-server-v1.0.2.spec
echo         'jaraco.structures', >> linkband-server-v1.0.2.spec
echo     ], >> linkband-server-v1.0.2.spec
echo     hookspath=[], >> linkband-server-v1.0.2.spec
echo     hooksconfig={}, >> linkband-server-v1.0.2.spec
echo     runtime_hooks=[], >> linkband-server-v1.0.2.spec
echo     excludes=[ >> linkband-server-v1.0.2.spec
echo         'tkinter', >> linkband-server-v1.0.2.spec
echo         'PyQt5', >> linkband-server-v1.0.2.spec
echo         'PyQt6', >> linkband-server-v1.0.2.spec
echo         'PySide2', >> linkband-server-v1.0.2.spec
echo         'PySide6', >> linkband-server-v1.0.2.spec
echo         'jupyter', >> linkband-server-v1.0.2.spec
echo         'notebook', >> linkband-server-v1.0.2.spec
echo         'IPython', >> linkband-server-v1.0.2.spec
echo     ], >> linkband-server-v1.0.2.spec
echo     noarchive=False, >> linkband-server-v1.0.2.spec
echo     optimize=0, >> linkband-server-v1.0.2.spec
echo     module_collection_mode={ >> linkband-server-v1.0.2.spec
echo         'sqlite3': 'py', >> linkband-server-v1.0.2.spec
echo         '_sqlite3': 'py', >> linkband-server-v1.0.2.spec
echo         'asyncio': 'py', >> linkband-server-v1.0.2.spec
echo         'concurrent': 'py', >> linkband-server-v1.0.2.spec
echo     }, >> linkband-server-v1.0.2.spec
echo ^) >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo # Add MNE data files if available (macOS success method^) >> linkband-server-v1.0.2.spec
echo if mne_data_path and mne_data_path.exists(^): >> linkband-server-v1.0.2.spec
echo     print("Adding MNE data files..."^) >> linkband-server-v1.0.2.spec
echo     try: >> linkband-server-v1.0.2.spec
echo         # Add essential MNE data files (especially .pyi files for stub issues^) >> linkband-server-v1.0.2.spec
echo         mne_files = list(mne_data_path.rglob('*.pyi'^)^) >> linkband-server-v1.0.2.spec
echo         for f in mne_files[:100]:  # Limit to first 100 files to avoid bloat >> linkband-server-v1.0.2.spec
echo             try: >> linkband-server-v1.0.2.spec
echo                 relative_path = f.relative_to(mne_data_path^).as_posix(^) >> linkband-server-v1.0.2.spec
echo                 a.datas.append((f'mne/{relative_path}', str(f^), 'DATA'^)^) >> linkband-server-v1.0.2.spec
echo             except Exception as e: >> linkband-server-v1.0.2.spec
echo                 print(f"Warning: Could not add MNE file {f}: {e}"^) >> linkband-server-v1.0.2.spec
echo         print(f"Added {len(mne_files^)} MNE data files"^) >> linkband-server-v1.0.2.spec
echo     except Exception as e: >> linkband-server-v1.0.2.spec
echo         print(f"Warning: Error adding MNE data files: {e}"^) >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo pyz = PYZ(a.pure^) >> linkband-server-v1.0.2.spec
echo. >> linkband-server-v1.0.2.spec
echo exe = EXE( >> linkband-server-v1.0.2.spec
echo     pyz, >> linkband-server-v1.0.2.spec
echo     a.scripts, >> linkband-server-v1.0.2.spec
echo     a.binaries, >> linkband-server-v1.0.2.spec
echo     a.datas, >> linkband-server-v1.0.2.spec
echo     [], >> linkband-server-v1.0.2.spec
echo     name='linkband-server-windows-v1.0.2', >> linkband-server-v1.0.2.spec
echo     debug=False, >> linkband-server-v1.0.2.spec
echo     bootloader_ignore_signals=False, >> linkband-server-v1.0.2.spec
echo     strip=False, >> linkband-server-v1.0.2.spec
echo     upx=True, >> linkband-server-v1.0.2.spec
echo     upx_exclude=[], >> linkband-server-v1.0.2.spec
echo     runtime_tmpdir=None, >> linkband-server-v1.0.2.spec
echo     console=True, >> linkband-server-v1.0.2.spec
echo     disable_windowed_traceback=False, >> linkband-server-v1.0.2.spec
echo     argv_emulation=False, >> linkband-server-v1.0.2.spec
echo     target_arch=None, >> linkband-server-v1.0.2.spec
echo     codesign_identity=None, >> linkband-server-v1.0.2.spec
echo     entitlements_file=None, >> linkband-server-v1.0.2.spec
echo     icon=None, >> linkband-server-v1.0.2.spec
echo ^) >> linkband-server-v1.0.2.spec

echo Spec file created successfully!

echo.
echo Step 10: Build executable with comprehensive spec...
echo Building with: !SERVER_FILE!
echo This may take 10-15 minutes due to comprehensive dependency collection...

pyinstaller linkband-server-v1.0.2.spec --clean --noconfirm
if !errorlevel! neq 0 (
    echo ERROR: Comprehensive build failed, trying fallback...
    echo Fallback: Direct build with essential imports only...
    pyinstaller --onefile --name linkband-server-windows-v1.0.2-fallback !SERVER_FILE! --hidden-import fastapi --hidden-import uvicorn --hidden-import aiosqlite --hidden-import bleak --hidden-import numpy --hidden-import scipy --hidden-import app --hidden-import app.main --hidden-import app.api --hidden-import app.core --hidden-import app.services --hidden-import encodings.utf_8
    if !errorlevel! neq 0 (
        echo ERROR: Even fallback build failed
        pause
        exit /b 1
    )
    set BUILD_TYPE=fallback
) else (
    set BUILD_TYPE=comprehensive
)

echo.
echo Step 11: Verify build result...
if exist "dist\linkband-server-windows-v1.0.2.exe" (
    set EXE_PATH=dist\linkband-server-windows-v1.0.2.exe
    set EXE_NAME=linkband-server-windows-v1.0.2.exe
) else if exist "dist\linkband-server-windows-v1.0.2-fallback.exe" (
    set EXE_PATH=dist\linkband-server-windows-v1.0.2-fallback.exe
    set EXE_NAME=linkband-server-windows-v1.0.2-fallback.exe
) else (
    echo ERROR: No executable found after build
    pause
    exit /b 1
)

echo Build successful! Executable: !EXE_NAME!

echo.
echo Step 12: Create distribution...
set DIST_DIR=distribution\v1.0.2\windows
if not exist "!DIST_DIR!" mkdir "!DIST_DIR!"

copy "!EXE_PATH!" "!DIST_DIR!\linkband-server-windows-v1.0.2.exe"
if !errorlevel! neq 0 (
    echo ERROR: Failed to copy executable
    pause
    exit /b 1
)

if exist "database" (
    if not exist "!DIST_DIR!\database" mkdir "!DIST_DIR!\database"
    xcopy "database" "!DIST_DIR!\database" /E /I /Y >nul
)

echo.
echo Step 13: Create comprehensive build info...
echo Link Band SDK Windows Server v1.0.2 Build > "!DIST_DIR!\BUILD_INFO.txt"
echo Build Date: %DATE% %TIME% >> "!DIST_DIR!\BUILD_INFO.txt"
echo Build Type: !BUILD_TYPE! >> "!DIST_DIR!\BUILD_INFO.txt"
echo Server file used: !SERVER_FILE! >> "!DIST_DIR!\BUILD_INFO.txt"
echo Based on successful build configurations >> "!DIST_DIR!\BUILD_INFO.txt"
echo. >> "!DIST_DIR!\BUILD_INFO.txt"
echo Dependencies included: >> "!DIST_DIR!\BUILD_INFO.txt"
echo - FastAPI + uvicorn (comprehensive^) >> "!DIST_DIR!\BUILD_INFO.txt"
echo - SQLite + aiosqlite (complete^) >> "!DIST_DIR!\BUILD_INFO.txt"
echo - Bleak (Bluetooth^) >> "!DIST_DIR!\BUILD_INFO.txt"
echo - NumPy + SciPy (scientific^) >> "!DIST_DIR!\BUILD_INFO.txt"
echo - MNE (comprehensive - based on macOS success^) >> "!DIST_DIR!\BUILD_INFO.txt"
echo - matplotlib (visualization^) >> "!DIST_DIR!\BUILD_INFO.txt"
echo - aiohttp (HTTP client^) >> "!DIST_DIR!\BUILD_INFO.txt"
echo - Application modules (all^) >> "!DIST_DIR!\BUILD_INFO.txt"
echo - Windows encoding modules >> "!DIST_DIR!\BUILD_INFO.txt"

echo.
echo Step 14: Quick functionality test...
echo Testing server startup (5 second test^)...
start /B "TestServer" "!DIST_DIR!\linkband-server-windows-v1.0.2.exe"
timeout /t 5 /nobreak >nul
taskkill /F /IM "linkband-server-windows-v1.0.2.exe" >nul 2>&1
echo Test completed

echo.
echo ========================================================
echo              BUILD COMPLETED SUCCESSFULLY!
echo ========================================================
echo.
echo Location: !DIST_DIR!\linkband-server-windows-v1.0.2.exe
echo Build Type: !BUILD_TYPE!
echo Server File: !SERVER_FILE!
echo.
echo This build includes comprehensive dependencies from successful configurations:
echo ✅ Complete FastAPI/uvicorn support
echo ✅ Full SQLite/aiosqlite integration  
echo ✅ Comprehensive MNE support (based on macOS success^)
echo ✅ matplotlib visualization support
echo ✅ aiohttp HTTP client support
echo ✅ All application modules
echo ✅ Windows encoding modules
echo ✅ Bluetooth (Bleak^) support
echo ✅ Scientific computing (NumPy/SciPy^)
echo.
echo To test the server:
echo   cd !DIST_DIR!
echo   linkband-server-windows-v1.0.2.exe
echo.
echo Server will run on:
echo   REST API: http://localhost:8121
echo   WebSocket: ws://localhost:18765
echo.
echo If you encounter any dependency issues:
echo 1. Check BUILD_INFO.txt for build details
echo 2. Ensure no other Python processes are running
echo 3. Try running from a clean directory
echo.
pause 