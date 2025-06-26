@echo off
setlocal EnableDelayedExpansion

REM Link Band SDK Windows Installer
REM Copyright (c) 2025 Looxid Labs

echo ================================
echo   Link Band SDK Installer v1.0.0
echo   for Windows
echo ================================
echo.

REM Configuration
set PYTHON_MIN_VERSION=3.9
set SDK_VERSION=1.0.0
set INSTALL_DIR=%LOCALAPPDATA%\Programs\LinkBandSDK
set SDK_NAME=Link Band SDK

REM Step 1: Check Python installation
echo Step 1: Checking Python installation...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo.
    echo Please install Python 3.9 or newer from:
    echo   https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Found Python %PYTHON_VERSION%

REM Simple version check (basic comparison)
for /f "tokens=1,2 delims=." %%a in ("%PYTHON_VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
)

if %MAJOR% lss 3 (
    echo [ERROR] Python %PYTHON_VERSION% is too old. Minimum required: %PYTHON_MIN_VERSION%
    echo Please install Python %PYTHON_MIN_VERSION% or newer
    pause
    exit /b 1
)

if %MAJOR% equ 3 if %MINOR% lss 9 (
    echo [ERROR] Python %PYTHON_VERSION% is too old. Minimum required: %PYTHON_MIN_VERSION%
    echo Please install Python %PYTHON_MIN_VERSION% or newer
    pause
    exit /b 1
)

echo [OK] Python %PYTHON_VERSION% is compatible
echo.

REM Step 2: Check pip
echo Step 2: Checking pip installation...

pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pip is not available
    echo Installing pip...
    python -m ensurepip --upgrade
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install pip
        pause
        exit /b 1
    )
)

echo [OK] pip is available
echo.

REM Step 3: Install Python dependencies
echo Step 3: Installing Python dependencies...
echo This may take a few minutes...

echo Installing required Python packages...
pip install numpy scipy matplotlib mne heartpy fastapi uvicorn websockets

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo [OK] Python dependencies installed
echo.

REM Step 4: Download and install SDK
echo Step 4: Installing Link Band SDK...

REM Detect architecture
set ARCH=x64
if "%PROCESSOR_ARCHITECTURE%"=="ARM64" set ARCH=arm64

set INSTALLER_URL=https://github.com/Brian-Chae/link_band_sdk/releases/latest/download/Link-Band-SDK-Setup-1.0.0.exe
set INSTALLER_NAME=Link-Band-SDK-Setup-1.0.0.exe

echo Downloading %SDK_NAME% for %ARCH%...

REM Create temporary directory
set TEMP_DIR=%TEMP%\LinkBandSDK_Install
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"
cd /d "%TEMP_DIR%"

REM Download installer using PowerShell
powershell -Command "& {Invoke-WebRequest -Uri '%INSTALLER_URL%' -OutFile '%INSTALLER_NAME%'}"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to download installer
    echo Please download manually from: %INSTALLER_URL%
    pause
    exit /b 1
)

REM Run installer
echo Installing %SDK_NAME%...
start /wait "" "%INSTALLER_NAME%" /S

if %errorlevel% neq 0 (
    echo [ERROR] Installation failed
    pause
    exit /b 1
)

echo [OK] %SDK_NAME% installed successfully
echo.

REM Cleanup
cd /d %USERPROFILE%
rmdir /s /q "%TEMP_DIR%" >nul 2>&1

REM Step 5: Create desktop shortcut
echo Step 5: Creating shortcuts...

REM Find installed application
set APP_PATH=%LOCALAPPDATA%\Programs\LinkBandSDK\Link Band SDK.exe
if not exist "%APP_PATH%" (
    set APP_PATH=%PROGRAMFILES%\LinkBandSDK\Link Band SDK.exe
)
if not exist "%APP_PATH%" (
    set APP_PATH=%PROGRAMFILES(X86)%\LinkBandSDK\Link Band SDK.exe
)

if exist "%APP_PATH%" (
    REM Create desktop shortcut using PowerShell
    powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Link Band SDK.lnk'); $Shortcut.TargetPath = '%APP_PATH%'; $Shortcut.Save()}"
    echo [OK] Desktop shortcut created
) else (
    echo [WARNING] Could not find installed application to create shortcut
)

echo.

REM Step 6: Final instructions
echo ================================
echo   Installation Complete!
echo ================================
echo.
echo You can now launch Link Band SDK from:
echo   • Start Menu
echo   • Desktop shortcut
echo   • Search for "Link Band SDK"
echo.
echo First launch may take a few moments to initialize.
echo.
echo For support, visit: https://github.com/Brian-Chae/link_band_sdk
echo.

REM Optional: Launch the app
set /p LAUNCH="Would you like to launch Link Band SDK now? (y/N): "
if /i "%LAUNCH%"=="y" (
    if exist "%APP_PATH%" (
        start "" "%APP_PATH%"
    ) else (
        echo Could not find application to launch
    )
)

pause 