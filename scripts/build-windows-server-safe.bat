@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================================
echo   Link Band SDK Windows Server Builder (SAFE)
echo ========================================================
echo.
echo Safe version with minimal special characters
echo This script will build the Windows server executable
echo.
pause

echo.
echo Step 1: Check environment...

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
echo Step 4: Install dependencies...
pip install --upgrade pip >nul 2>&1

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
    pip install fastapi uvicorn websockets bleak numpy scipy heartpy psutil aiosqlite
    if !errorlevel! neq 0 (
        echo ERROR: Failed to install packages
        pause
        exit /b 1
    )
)

echo.
echo Step 5: Install PyInstaller...
pip install pyinstaller
if !errorlevel! neq 0 (
    echo ERROR: Failed to install PyInstaller
    pause
    exit /b 1
)

echo.
echo Step 6: Check server files...
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
echo Step 7: Clean previous build...
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist

echo.
echo Step 8: Build executable...
echo Building with: !SERVER_FILE!
echo This may take several minutes...

if exist "linkband-server-windows-v1.0.2.spec" (
    echo Using spec file...
    pyinstaller linkband-server-windows-v1.0.2.spec --clean --noconfirm
) else (
    echo Using direct build...
    pyinstaller --onefile --name linkband-server-windows-v1.0.2 !SERVER_FILE!
)

if !errorlevel! neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo Step 9: Check build result...
if not exist "dist\linkband-server-windows-v1.0.2.exe" (
    echo ERROR: Executable not found after build
    pause
    exit /b 1
)

echo.
echo Step 10: Create distribution...
set DIST_DIR=distribution\v1.0.2\windows
if not exist "!DIST_DIR!" mkdir "!DIST_DIR!"

copy "dist\linkband-server-windows-v1.0.2.exe" "!DIST_DIR!\"
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
echo ========================================================
echo                 BUILD COMPLETED
echo ========================================================
echo.
echo Location: !DIST_DIR!\linkband-server-windows-v1.0.2.exe
echo.
echo To test:
echo   cd !DIST_DIR!
echo   linkband-server-windows-v1.0.2.exe
echo.
echo Server will run on:
echo   REST API: http://localhost:8121
echo   WebSocket: ws://localhost:18765
echo.
pause 