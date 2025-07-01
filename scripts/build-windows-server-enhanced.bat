@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================================
echo   Link Band SDK Windows Server Builder (ENHANCED)
echo            - Fixed aiosqlite dependency issue -
echo ========================================================
echo.
echo This enhanced version includes:
echo - Comprehensive dependency collection
echo - aiosqlite module fix
echo - Better error handling
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
echo Step 4: Upgrade pip and install core tools...
python -m pip install --upgrade pip
pip install wheel setuptools

echo.
echo Step 5: Install all dependencies with enhanced collection...
if exist "requirements.txt" (
    echo Installing from requirements.txt...
    pip install -r requirements.txt
    if !errorlevel! neq 0 (
        echo ERROR: Failed to install requirements
        pause
        exit /b 1
    )
) else (
    echo Installing core packages...
    pip install fastapi uvicorn websockets bleak numpy scipy heartpy psutil
    if !errorlevel! neq 0 (
        echo ERROR: Failed to install packages
        pause
        exit /b 1
    )
)

echo.
echo Step 6: Install aiosqlite with all dependencies...
pip install aiosqlite --force-reinstall
if !errorlevel! neq 0 (
    echo ERROR: Failed to install aiosqlite
    pause
    exit /b 1
)

echo.
echo Step 7: Install PyInstaller...
pip install pyinstaller
if !errorlevel! neq 0 (
    echo ERROR: Failed to install PyInstaller
    pause
    exit /b 1
)

echo.
echo Step 8: Verify critical modules...
echo Testing aiosqlite import...
python -c "import aiosqlite; print('aiosqlite OK')"
if !errorlevel! neq 0 (
    echo ERROR: aiosqlite import failed
    pause
    exit /b 1
)

python -c "import sqlite3; print('sqlite3 OK')"
if !errorlevel! neq 0 (
    echo ERROR: sqlite3 import failed
    pause
    exit /b 1
)

echo.
echo Step 9: Check server files...
set SERVER_FILE=
if exist "run_server_production.py" (
    set SERVER_FILE=run_server_production.py
    echo Found: run_server_production.py
) else if exist "run_server.py" (
    set SERVER_FILE=run_server.py
    echo Found: run_server.py
) else if exist "main.py" (
    set SERVER_FILE=main.py
    echo Found: main.py
) else (
    echo ERROR: No server file found
    echo Need one of: run_server_production.py, run_server.py, main.py
    pause
    exit /b 1
)

echo.
echo Step 10: Clean previous build...
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist

echo.
echo Step 11: Create enhanced spec file...
echo Creating enhanced spec file with comprehensive dependencies...

echo # Enhanced PyInstaller spec for aiosqlite fix > linkband-server-enhanced.spec
echo import sys >> linkband-server-enhanced.spec
echo from pathlib import Path >> linkband-server-enhanced.spec
echo. >> linkband-server-enhanced.spec
echo a = Analysis( >> linkband-server-enhanced.spec
echo     ['!SERVER_FILE!'], >> linkband-server-enhanced.spec
echo     pathex=[], >> linkband-server-enhanced.spec
echo     binaries=[], >> linkband-server-enhanced.spec
echo     datas=[ >> linkband-server-enhanced.spec
echo         ('app', 'app'^), >> linkband-server-enhanced.spec
echo         ('database', 'database'^), >> linkband-server-enhanced.spec
echo     ], >> linkband-server-enhanced.spec
echo     hiddenimports=[ >> linkband-server-enhanced.spec
echo         # Core asyncio and database >> linkband-server-enhanced.spec
echo         'asyncio', >> linkband-server-enhanced.spec
echo         'asyncio.subprocess', >> linkband-server-enhanced.spec
echo         'asyncio.queues', >> linkband-server-enhanced.spec
echo         'sqlite3', >> linkband-server-enhanced.spec
echo         'sqlite3.dbapi2', >> linkband-server-enhanced.spec
echo         'sqlite3.dump', >> linkband-server-enhanced.spec
echo         'aiosqlite', >> linkband-server-enhanced.spec
echo         'aiosqlite.core', >> linkband-server-enhanced.spec
echo         'aiosqlite.context', >> linkband-server-enhanced.spec
echo         'aiosqlite.cursor', >> linkband-server-enhanced.spec
echo         'aiosqlite.connection', >> linkband-server-enhanced.spec
echo         # Web framework >> linkband-server-enhanced.spec
echo         'fastapi', >> linkband-server-enhanced.spec
echo         'fastapi.middleware', >> linkband-server-enhanced.spec
echo         'fastapi.middleware.cors', >> linkband-server-enhanced.spec
echo         'uvicorn', >> linkband-server-enhanced.spec
echo         'uvicorn.logging', >> linkband-server-enhanced.spec
echo         'uvicorn.protocols', >> linkband-server-enhanced.spec
echo         'uvicorn.protocols.http', >> linkband-server-enhanced.spec
echo         'uvicorn.protocols.websockets', >> linkband-server-enhanced.spec
echo         'websockets', >> linkband-server-enhanced.spec
echo         'websockets.server', >> linkband-server-enhanced.spec
echo         # Scientific >> linkband-server-enhanced.spec
echo         'numpy', >> linkband-server-enhanced.spec
echo         'scipy', >> linkband-server-enhanced.spec
echo         'scipy.signal', >> linkband-server-enhanced.spec
echo         # Bluetooth >> linkband-server-enhanced.spec
echo         'bleak', >> linkband-server-enhanced.spec
echo         'bleak.backends', >> linkband-server-enhanced.spec
echo         'bleak.backends.winrt', >> linkband-server-enhanced.spec
echo         # System >> linkband-server-enhanced.spec
echo         'psutil', >> linkband-server-enhanced.spec
echo         'heartpy', >> linkband-server-enhanced.spec
echo         # Utilities >> linkband-server-enhanced.spec
echo         'json', >> linkband-server-enhanced.spec
echo         'logging', >> linkband-server-enhanced.spec
echo         'pathlib', >> linkband-server-enhanced.spec
echo         'threading', >> linkband-server-enhanced.spec
echo         'time', >> linkband-server-enhanced.spec
echo         'datetime', >> linkband-server-enhanced.spec
echo     ], >> linkband-server-enhanced.spec
echo     hookspath=[], >> linkband-server-enhanced.spec
echo     runtime_hooks=[], >> linkband-server-enhanced.spec
echo     excludes=[], >> linkband-server-enhanced.spec
echo     noarchive=False, >> linkband-server-enhanced.spec
echo ^) >> linkband-server-enhanced.spec
echo. >> linkband-server-enhanced.spec
echo pyz = PYZ(a.pure, a.zipped_data^) >> linkband-server-enhanced.spec
echo. >> linkband-server-enhanced.spec
echo exe = EXE( >> linkband-server-enhanced.spec
echo     pyz, >> linkband-server-enhanced.spec
echo     a.scripts, >> linkband-server-enhanced.spec
echo     a.binaries, >> linkband-server-enhanced.spec
echo     a.datas, >> linkband-server-enhanced.spec
echo     [], >> linkband-server-enhanced.spec
echo     name='linkband-server-windows-enhanced', >> linkband-server-enhanced.spec
echo     debug=False, >> linkband-server-enhanced.spec
echo     bootloader_ignore_signals=False, >> linkband-server-enhanced.spec
echo     strip=False, >> linkband-server-enhanced.spec
echo     upx=True, >> linkband-server-enhanced.spec
echo     console=True, >> linkband-server-enhanced.spec
echo ^) >> linkband-server-enhanced.spec

echo.
echo Step 12: Build executable with enhanced spec...
echo Building with: !SERVER_FILE!
echo This may take several minutes...

pyinstaller linkband-server-enhanced.spec --clean --noconfirm
if !errorlevel! neq 0 (
    echo ERROR: Enhanced build failed, trying fallback...
    echo Fallback: Direct build with comprehensive imports...
    pyinstaller --onefile --name linkband-server-windows-enhanced !SERVER_FILE! --hidden-import aiosqlite --hidden-import aiosqlite.core --hidden-import aiosqlite.context --hidden-import aiosqlite.cursor --hidden-import aiosqlite.connection --hidden-import sqlite3 --hidden-import sqlite3.dbapi2 --hidden-import asyncio --hidden-import fastapi --hidden-import uvicorn --hidden-import websockets --hidden-import numpy --hidden-import scipy --hidden-import bleak --hidden-import psutil --hidden-import heartpy
    if !errorlevel! neq 0 (
        echo ERROR: Fallback build also failed
        pause
        exit /b 1
    )
)

echo.
echo Step 13: Check build result...
if not exist "dist\linkband-server-windows-enhanced.exe" (
    echo ERROR: Executable not found after build
    pause
    exit /b 1
)

echo.
echo Step 14: Test aiosqlite in built executable...
echo Testing aiosqlite availability in executable...
start /B /WAIT "Test" dist\linkband-server-windows-enhanced.exe --test-imports
timeout /t 3 /nobreak >nul

echo.
echo Step 15: Create distribution...
set DIST_DIR=distribution\v1.0.2\windows-enhanced
if not exist "!DIST_DIR!" mkdir "!DIST_DIR!"

copy "dist\linkband-server-windows-enhanced.exe" "!DIST_DIR!\"
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
echo Step 16: Create build info...
echo Link Band SDK Windows Server Enhanced Build > "!DIST_DIR!\BUILD_INFO.txt"
echo Build Date: %DATE% %TIME% >> "!DIST_DIR!\BUILD_INFO.txt"
echo aiosqlite dependency fix applied >> "!DIST_DIR!\BUILD_INFO.txt"
echo Server file used: !SERVER_FILE! >> "!DIST_DIR!\BUILD_INFO.txt"
echo. >> "!DIST_DIR!\BUILD_INFO.txt"
echo Dependencies verified: >> "!DIST_DIR!\BUILD_INFO.txt"
echo - aiosqlite: OK >> "!DIST_DIR!\BUILD_INFO.txt"
echo - sqlite3: OK >> "!DIST_DIR!\BUILD_INFO.txt"
echo - fastapi: OK >> "!DIST_DIR!\BUILD_INFO.txt"
echo - uvicorn: OK >> "!DIST_DIR!\BUILD_INFO.txt"

echo.
echo ========================================================
echo                 ENHANCED BUILD COMPLETED
echo ========================================================
echo.
echo Location: !DIST_DIR!\linkband-server-windows-enhanced.exe
echo.
echo IMPORTANT: This build includes aiosqlite dependency fix
echo.
echo To test:
echo   cd !DIST_DIR!
echo   linkband-server-windows-enhanced.exe
echo.
echo Server will run on:
echo   REST API: http://localhost:8121
echo   WebSocket: ws://localhost:18765
echo.
echo If you still get aiosqlite errors, please:
echo 1. Check BUILD_INFO.txt for details
echo 2. Try running from a clean directory
echo 3. Ensure no other Python processes are running
echo.
pause 