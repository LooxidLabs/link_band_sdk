@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title Link Band SDK Windows Server Builder v1.0.2 (Fixed)

REM Debug: Show script execution
echo DEBUG: Script started successfully
echo DEBUG: Current shell: %COMSPEC%
echo DEBUG: Code page set to UTF-8

echo ========================================================
echo   Link Band SDK Windows Server Builder v1.0.2
echo                    (Fixed Version)
echo ========================================================
echo.
echo This fixed script includes:
echo - UTF-8 encoding support
echo - Better error handling and debugging
echo - Network connectivity checks
echo - Timeout handling for installations
echo - More robust dependency management
echo.
echo This script will build the Link Band SDK server for Windows
echo using PyInstaller with the Windows-specific configuration.
echo.
pause

echo.
echo ==================== Network Connectivity Check ====================

echo DEBUG: Testing network connectivity...
ping -n 1 8.8.8.8 >nul 2>&1
if !errorlevel! neq 0 (
    echo WARNING: No internet connection detected.
    echo Please check your network connection and try again.
    pause
    exit /b 1
)

echo DEBUG: Testing PyPI connectivity...
ping -n 1 pypi.org >nul 2>&1
if !errorlevel! neq 0 (
    echo WARNING: Cannot reach PyPI.
    echo Please check your firewall/proxy settings.
    pause
    exit /b 1
)

echo OK: Network connectivity verified.

echo.
echo ==================== Environment Check ====================

echo Current Location: !CD!
echo DEBUG: Checking PowerShell availability...

powershell -Command "Write-Host 'PowerShell is available'" 2>nul
if !errorlevel! neq 0 (
    echo ERROR: PowerShell is not available.
    pause
    exit /b 1
)
echo DEBUG: PowerShell check passed

REM Check if we're in the correct directory
if not exist "python_core" (
    echo ERROR: python_core directory not found!
    echo Please run this script from the root of the Link Band SDK project.
    echo Expected structure: link_band_sdk/scripts/build-windows-server-simple.bat
    pause
    exit /b 1
)

REM Check Python installation
echo.
echo ==================== Python Environment Check ====================

echo DEBUG: Checking Python installation...
python --version >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: Python is not installed or not in PATH.
    echo.
    echo SOLUTION: Install Python manually:
    echo 1. Download Python 3.8+ from: https://python.org
    echo 2. During installation, check "Add Python to PATH"
    echo 3. Restart command prompt and try again
    pause
    exit /b 1
)

echo OK: Python is available
python --version
echo DEBUG: Python check passed

REM Check pip
echo DEBUG: Checking pip availability...
pip --version >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: pip is not available.
    echo Please ensure pip is installed with Python.
    pause
    exit /b 1
)

echo OK: pip is available
echo DEBUG: pip check passed

REM Navigate to python_core directory
cd python_core

REM Check if virtual environment exists
if not exist "venv" (
    echo.
    echo ==================== Creating Virtual Environment ====================
    echo Creating Python virtual environment...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo OK: Virtual environment created
)

REM Activate virtual environment
echo.
echo ==================== Activating Virtual Environment ====================
call venv\Scripts\activate.bat
if !errorlevel! neq 0 (
    echo ERROR: Failed to activate virtual environment.
    pause
    exit /b 1
)

echo OK: Virtual environment activated

REM Upgrade pip
echo.
echo ==================== Upgrading pip ====================
python -m pip install --upgrade pip
if !errorlevel! neq 0 (
    echo WARNING: Failed to upgrade pip, continuing...
)

REM Install PyInstaller if not present
echo.
echo ==================== Installing PyInstaller ====================
pip show pyinstaller >nul 2>&1
if !errorlevel! neq 0 (
    echo Installing PyInstaller...
    pip install pyinstaller
    if !errorlevel! neq 0 (
        echo ERROR: Failed to install PyInstaller.
        pause
        exit /b 1
    )
) else (
    echo OK: PyInstaller is already installed
)

REM Install project dependencies
echo.
echo ==================== Installing Dependencies ====================
if exist "requirements.txt" (
    echo Installing requirements from requirements.txt...
    echo DEBUG: Using timeout and retry logic for pip install...
    pip install -r requirements.txt --timeout 120
    if !errorlevel! neq 0 (
        echo WARNING: Installation failed, retrying with increased timeout...
        pip install -r requirements.txt --timeout 300 --retries 3
        if !errorlevel! neq 0 (
            echo ERROR: Failed to install requirements even with retry.
            echo.
            echo TROUBLESHOOTING:
            echo 1. Check internet connection
            echo 2. Try: pip install --upgrade pip
            echo 3. Try: pip cache purge
            echo 4. Check firewall/proxy settings
            pause
            exit /b 1
        )
    )
    echo DEBUG: Requirements installation completed successfully
) else (
    echo WARNING: requirements.txt not found, installing core dependencies...
    echo DEBUG: Installing core packages with timeout...
    pip install fastapi uvicorn websockets bleak numpy scipy heartpy psutil aiosqlite --timeout 120
    if !errorlevel! neq 0 (
        echo ERROR: Failed to install core dependencies.
        pause
        exit /b 1
    )
)

REM Check if spec file exists
if not exist "linkband-server-windows-v1.0.2.spec" (
    echo ERROR: Windows spec file not found!
    echo Expected: python_core/linkband-server-windows-v1.0.2.spec
    pause
    exit /b 1
)

REM Check if run_server_production.py exists
echo DEBUG: Checking for run_server_production.py in current directory...
echo DEBUG: Current directory: !CD!
dir run_server_production.py >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: run_server_production.py not found!
    echo DEBUG: Current directory contents:
    dir /B
    echo.
    echo SOLUTION: This file is required for building the server.
    echo Please ensure you have the latest version from git:
    echo   git pull origin main
    echo.
    echo Alternative files to check:
    if exist "run_server.py" (
        echo - Found run_server.py ^(development version^)
        set /p "use_dev=Use run_server.py instead? (y/n): "
        if /i "!use_dev!"=="y" (
            echo DEBUG: Using run_server.py for build
            goto :build_with_dev
        )
    )
    if exist "main.py" (
        echo - Found main.py
        set /p "use_main=Use main.py instead? (y/n): "
        if /i "!use_main!"=="y" (
            echo DEBUG: Using main.py for build
            goto :build_with_main
        )
    )
    echo ERROR: No suitable server file found for building.
    pause
    exit /b 1
)
echo DEBUG: run_server_production.py found successfully

REM Clean previous build
echo.
echo ==================== Cleaning Previous Build ====================
if exist "build" (
    echo Removing previous build directory...
    rmdir /s /q build
)
if exist "dist" (
    echo Removing previous dist directory...
    rmdir /s /q dist
)

REM Build the server
echo.
echo ==================== Building Windows Server ====================
echo Building server executable using PyInstaller...
echo This may take several minutes...
echo.

pyinstaller linkband-server-windows-v1.0.2.spec --clean --noconfirm
if !errorlevel! neq 0 (
    echo ERROR: PyInstaller build failed!
    echo.
    echo Troubleshooting tips:
    echo 1. Check that all dependencies are installed
    echo 2. Verify the spec file is correct
    echo 3. Try running: pip install --upgrade pyinstaller
    echo 4. Check the build log above for specific errors
    pause
    exit /b 1
)
goto :build_success

:build_with_dev
echo DEBUG: Building with run_server.py...
pyinstaller --onefile --name linkband-server-windows-v1.0.2 run_server.py
if !errorlevel! neq 0 (
    echo ERROR: PyInstaller build with run_server.py failed!
    pause
    exit /b 1
)
goto :build_success

:build_with_main
echo DEBUG: Building with main.py...
pyinstaller --onefile --name linkband-server-windows-v1.0.2 main.py
if !errorlevel! neq 0 (
    echo ERROR: PyInstaller build with main.py failed!
    pause
    exit /b 1
)
goto :build_success

:build_success

REM Check if build was successful
if not exist "dist\linkband-server-windows-v1.0.2.exe" (
    echo ERROR: Build completed but executable not found!
    echo Expected: python_core\dist\linkband-server-windows-v1.0.2.exe
    pause
    exit /b 1
)

REM Create distribution directory
echo.
echo ==================== Creating Distribution ====================
set "DIST_DIR=distribution\v1.0.2\windows"
if not exist "!DIST_DIR!" (
    mkdir "!DIST_DIR!"
)

REM Copy executable to distribution directory
echo Copying executable to distribution directory...
copy "dist\linkband-server-windows-v1.0.2.exe" "!DIST_DIR!\"
if !errorlevel! neq 0 (
    echo ERROR: Failed to copy executable to distribution directory.
    pause
    exit /b 1
)

REM Copy database directory if it exists
if exist "database" (
    echo Copying database directory...
    if not exist "!DIST_DIR!\database" mkdir "!DIST_DIR!\database"
    xcopy "database" "!DIST_DIR!\database" /E /I /Y >nul
)

REM Test the executable
echo.
echo ==================== Testing Executable ====================
echo DEBUG: Testing the built executable...
echo ^(This will run for 5 seconds then terminate^)

echo DEBUG: Starting server test...
start /B "Test Server" "!DIST_DIR!\linkband-server-windows-v1.0.2.exe"
timeout /t 5 /nobreak >nul
echo DEBUG: Stopping test server...
taskkill /F /IM "linkband-server-windows-v1.0.2.exe" >nul 2>&1
echo DEBUG: Server test completed

echo.
echo ==================== Build Information ====================

echo GENERATE: Creating build information file...
echo Link Band SDK v1.0.2 Windows Server Build ^(Fixed^) > "!DIST_DIR!\BUILD_INFO.txt"
echo Build Date: !DATE! !TIME! >> "!DIST_DIR!\BUILD_INFO.txt"
echo Build Method: Fixed script with UTF-8 encoding and error handling >> "!DIST_DIR!\BUILD_INFO.txt"
echo Python Version: >> "!DIST_DIR!\BUILD_INFO.txt"
python --version >> "!DIST_DIR!\BUILD_INFO.txt"
echo. >> "!DIST_DIR!\BUILD_INFO.txt"
echo Files included: >> "!DIST_DIR!\BUILD_INFO.txt"

for %%f in ("!DIST_DIR!\*.*") do (
    echo - %%~nxf ^(%%~zf bytes^) >> "!DIST_DIR!\BUILD_INFO.txt"
)

echo.
echo ========================================================
echo                 BUILD COMPLETED SUCCESSFULLY!
echo ========================================================
echo.
echo COMPLETE: Link Band SDK v1.0.2 Windows server build finished!
echo LOCATION: !DIST_DIR!\linkband-server-windows-v1.0.2.exe
echo.
echo FILES CREATED:
for %%f in ("!DIST_DIR!\*.*") do (
    echo - %%~nxf ^(%%~zf bytes^)
)
echo.
echo To test the server manually:
echo   cd !DIST_DIR!
echo   linkband-server-windows-v1.0.2.exe
echo.
echo The server will start on:
echo   REST API: http://localhost:8121
echo   WebSocket: ws://localhost:18765
echo.
echo NEXT STEPS:
echo 1. Test the server manually using the commands above
echo 2. Copy the executable to your target Windows machine
echo 3. Ensure Windows Defender allows the executable
echo 4. Check BUILD_INFO.txt for build details
echo.

echo DEBUG: Script completed successfully!
pause 