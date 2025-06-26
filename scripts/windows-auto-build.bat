@echo off
echo ================================================
echo   Link Band SDK Auto Builder for Windows
echo ================================================
echo.
echo [INFO] This script will:
echo 1. Download required source code
echo 2. Build the Python server
echo 3. Clean up source code
echo 4. Keep only the server executable
echo.

REM Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is required but not found
    echo Please install Python 3.9+ from https://python.org
    pause
    exit /b 1
)

REM Check for Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is required but not found
    echo Please install Git from https://git-scm.com
    pause
    exit /b 1
)

echo [OK] Prerequisites found
echo.

REM Create temporary directory
set "TEMP_DIR=%TEMP%\linkband_build_%RANDOM%"
mkdir "%TEMP_DIR%"
cd "%TEMP_DIR%"

echo [INFO] Downloading source code...
git clone --depth 1 https://github.com/your-repo/link_band_sdk.git
if %errorlevel% neq 0 (
    echo [ERROR] Failed to download source code
    pause
    exit /b 1
)

cd link_band_sdk\python_core

echo [INFO] Setting up Python environment...
python -m venv venv
call venv\Scripts\activate

echo [INFO] Installing dependencies...
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
pip install pyinstaller --quiet

echo [INFO] Building Windows server...
pyinstaller --onefile --name linkband-server-windows run_server.py --log-level WARN

REM Check if build was successful
if exist "dist\linkband-server-windows.exe" (
    echo [SUCCESS] Server built successfully!
    
    REM Copy the executable to the installer directory
    copy "dist\linkband-server-windows.exe" "%~dp0linkband-server-windows.exe"
    
    echo [INFO] Cleaning up temporary files...
    cd "%~dp0"
    rmdir /s /q "%TEMP_DIR%"
    
    echo.
    echo [COMPLETE] Windows server is ready!
    echo File: %~dp0linkband-server-windows.exe
    echo.
    echo You can now run the main installer.
    
) else (
    echo [ERROR] Build failed
    echo Please check the error messages above
    cd "%~dp0"
    rmdir /s /q "%TEMP_DIR%"
    pause
    exit /b 1
)

pause 