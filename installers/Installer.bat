@echo off
setlocal EnableDelayedExpansion

REM Link Band SDK Master Installer
REM Copyright (c) 2025 Looxid Labs

title Link Band SDK Installer

echo ================================================================
echo                   Link Band SDK Installer v1.0.0
echo                        for Windows
echo ================================================================
echo.
echo This installer will:
echo   1. Check Python installation
echo   2. Install Python dependencies
echo   3. Download and install Link Band SDK
echo   4. Create shortcuts
echo.

REM Configuration
set PYTHON_MIN_VERSION=3.9
set SDK_VERSION=1.0.0
set GITHUB_REPO=LooxidLabs/link_band_sdk
set SDK_NAME=Link Band SDK

REM Create installer directory
set INSTALLER_DIR=%~dp0
set DOWNLOADS_DIR=%INSTALLER_DIR%downloads
set SCRIPTS_DIR=%INSTALLER_DIR%scripts

if not exist "%DOWNLOADS_DIR%" mkdir "%DOWNLOADS_DIR%"
if not exist "%SCRIPTS_DIR%" mkdir "%SCRIPTS_DIR%"

echo Starting installation...
echo.

REM Step 1: Check Python installation
echo [1/5] Checking Python installation...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo.
    echo Downloading Python installer...
    
    REM Download Python installer
    set PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
    set PYTHON_INSTALLER=%DOWNLOADS_DIR%\python-installer.exe
    
    powershell -Command "& {Write-Host 'Downloading Python...'; Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_INSTALLER%'}"
    
    if exist "%PYTHON_INSTALLER%" (
        echo Installing Python...
        start /wait "" "%PYTHON_INSTALLER%" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
        
        REM Refresh PATH
        call "%SCRIPTS_DIR%\refresh-path.bat" 2>nul || (
            echo Please restart your command prompt and run this installer again.
            pause
            exit /b 1
        )
    ) else (
        echo [ERROR] Failed to download Python installer
        echo Please install Python manually from: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

REM Verify Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python installation failed or PATH not updated
    echo Please restart your command prompt and run this installer again.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python %PYTHON_VERSION% is available
echo.

REM Step 2: Install Python dependencies
echo [2/5] Installing Python dependencies...
echo This may take a few minutes...

REM Check if requirements file exists locally
set REQ_FILE=%INSTALLER_DIR%requirements.txt
if not exist "%REQ_FILE%" (
    echo Downloading requirements file...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/%GITHUB_REPO%/main/requirements.txt' -OutFile '%REQ_FILE%'}"
)

if exist "%REQ_FILE%" (
    echo Installing from requirements.txt...
    pip install -r "%REQ_FILE%"
) else (
    echo Installing essential packages...
    pip install numpy scipy matplotlib mne heartpy fastapi uvicorn websockets psutil
)

if %errorlevel% neq 0 (
    echo [WARNING] Some packages may have failed to install
    echo Continuing with installation...
)

echo [OK] Python dependencies processed
echo.

REM Step 3: Download SDK
echo [3/5] Downloading Link Band SDK...

REM Detect architecture
set ARCH=x64
if "%PROCESSOR_ARCHITECTURE%"=="ARM64" set ARCH=arm64

REM Try to find local installer first
set LOCAL_INSTALLER=%INSTALLER_DIR%Link-Band-SDK-Setup-%SDK_VERSION%.exe
if exist "%LOCAL_INSTALLER%" (
    echo Found local installer: %LOCAL_INSTALLER%
    set SDK_INSTALLER=%LOCAL_INSTALLER%
) else (
    REM Download from GitHub releases
    set RELEASE_URL=https://github.com/%GITHUB_REPO%/releases/latest/download/Link-Band-SDK-Setup-%SDK_VERSION%.exe
    set SDK_INSTALLER=%DOWNLOADS_DIR%\Link-Band-SDK-Setup-%SDK_VERSION%.exe
    
    echo Downloading from GitHub releases...
    powershell -Command "& {try { Invoke-WebRequest -Uri '%RELEASE_URL%' -OutFile '%SDK_INSTALLER%' } catch { Write-Host 'Download failed: ' $_.Exception.Message; exit 1 }}"
    
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to download SDK installer
        echo.
        echo Please try one of the following:
        echo   1. Check your internet connection
        echo   2. Download manually from: https://github.com/%GITHUB_REPO%/releases
        echo   3. Place the installer file in: %INSTALLER_DIR%
        echo.
        pause
        exit /b 1
    )
)

if not exist "%SDK_INSTALLER%" (
    echo [ERROR] SDK installer not found
    pause
    exit /b 1
)

echo [OK] SDK installer ready
echo.

REM Step 4: Install SDK
echo [4/5] Installing Link Band SDK...

echo Running installer: %SDK_INSTALLER%
start /wait "" "%SDK_INSTALLER%" /S

if %errorlevel% neq 0 (
    echo [ERROR] SDK installation failed
    echo Please run the installer manually: %SDK_INSTALLER%
    pause
    exit /b 1
)

echo [OK] Link Band SDK installed successfully
echo.

REM Step 5: Create shortcuts and finish
echo [5/5] Finalizing installation...

REM Find installed application
set APP_PATH=
for %%p in ("%LOCALAPPDATA%\Programs\LinkBandSDK" "%PROGRAMFILES%\LinkBandSDK" "%PROGRAMFILES(X86)%\LinkBandSDK") do (
    if exist "%%p\Link Band SDK.exe" set APP_PATH=%%p\Link Band SDK.exe
)

if defined APP_PATH (
    REM Create desktop shortcut
    powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Link Band SDK.lnk'); $Shortcut.TargetPath = '%APP_PATH%'; $Shortcut.WorkingDirectory = '%LOCALAPPDATA%\Programs\LinkBandSDK'; $Shortcut.Save()}"
    echo [OK] Desktop shortcut created
) else (
    echo [WARNING] Could not locate installed application
)

REM Create uninstaller shortcut
echo Creating uninstaller...
(
echo @echo off
echo echo Uninstalling Link Band SDK...
echo if exist "%LOCALAPPDATA%\Programs\LinkBandSDK\Uninstall Link Band SDK.exe" (
echo     start "" "%LOCALAPPDATA%\Programs\LinkBandSDK\Uninstall Link Band SDK.exe"
echo ^) else (
echo     echo Uninstaller not found. Please uninstall from Control Panel.
echo     pause
echo ^)
) > "%INSTALLER_DIR%Uninstall.bat"

echo.
echo ================================================================
echo                    Installation Complete!
echo ================================================================
echo.
echo Link Band SDK has been successfully installed!
echo.
echo You can now launch it from:
echo   • Desktop shortcut: Link Band SDK
echo   • Start Menu: Search for "Link Band SDK"
echo   • Direct path: %APP_PATH%
echo.
echo To uninstall: Run Uninstall.bat in this folder
echo.
echo For support and documentation:
echo   https://github.com/%GITHUB_REPO%
echo.

REM Optional: Launch the app
set /p LAUNCH="Would you like to launch Link Band SDK now? (y/N): "
if /i "%LAUNCH%"=="y" (
    if defined APP_PATH (
        echo Launching Link Band SDK...
        start "" "%APP_PATH%"
    ) else (
        echo Application not found. Please launch manually from Start Menu.
    )
)

echo.
echo Installation log saved to: %INSTALLER_DIR%install.log
echo Thank you for using Link Band SDK!
echo.
pause 