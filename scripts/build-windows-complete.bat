@echo off
setlocal enabledelayedexpansion
title Link Band SDK Complete Windows Builder

echo ========================================================
echo   Link Band SDK Complete Windows Builder v1.0.1
echo ========================================================
echo.
echo This script will build the complete Link Band SDK for Windows:
echo 1. Python Backend Server (linkband-server-windows.exe)
echo 2. Electron Frontend App (Link Band SDK.exe + installer)
echo.
pause

echo.
echo ==================== Environment Check ====================

REM Check if we're in the correct directory
if not exist "python_core" (
    echo ERROR: python_core folder not found!
    echo Please run this script from the link_band_sdk root directory.
    pause
    exit /b 1
)

if not exist "electron-app" (
    echo ERROR: electron-app folder not found!
    echo Please run this script from the link_band_sdk root directory.
    pause
    exit /b 1
)

echo OK: Found python_core and electron-app directories

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)
echo OK: Python is available

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo OK: Node.js is available

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)
echo OK: npm is available

echo.
echo ==================== Step 1: Build Python Server ====================

echo NAVIGATE: Changing to python_core directory...
cd python_core

echo VENV: Creating Python virtual environment...
if exist venv rmdir /s /q venv
python -m venv venv
call venv\Scripts\activate.bat

echo UPGRADE: Upgrading pip...
python -m pip install --upgrade pip --quiet

echo INSTALL: Installing Python dependencies...
if exist requirements.txt (
    pip install -r requirements.txt --quiet
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Python dependencies
        pause
        exit /b 1
    )
) else (
    echo WARNING: requirements.txt not found
)

echo INSTALL: Installing PyInstaller...
pip install pyinstaller --quiet

echo BUILD: Building Python server executable...
if exist run_server.py (
    pyinstaller --onefile --name linkband-server-windows run_server.py
) else if exist server.py (
    pyinstaller --onefile --name linkband-server-windows server.py
) else if exist main.py (
    pyinstaller --onefile --name linkband-server-windows main.py
) else (
    echo ERROR: No Python server file found (run_server.py, server.py, or main.py)
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo ERROR: Python server build failed
    pause
    exit /b 1
)

if not exist "dist\linkband-server-windows.exe" (
    echo ERROR: Python server executable not created
    pause
    exit /b 1
)

echo SUCCESS: Python server built successfully!

echo COPY: Copying server to installers directory...
if not exist "..\installers\distribution\windows" mkdir "..\installers\distribution\windows"
copy "dist\linkband-server-windows.exe" "..\installers\distribution\windows\linkband-server-windows.exe"

echo GO BACK: Returning to root directory...
cd ..

echo.
echo ==================== Step 2: Update Electron Builder Config ====================

echo UPDATE: Adding Windows server to electron-builder.json...

REM Create a temporary PowerShell script to update the JSON
echo $jsonPath = "electron-app\electron-builder.json" > update_config.ps1
echo $json = Get-Content $jsonPath ^| ConvertFrom-Json >> update_config.ps1
echo $windowsResource = @{ >> update_config.ps1
echo     from = "../installers/distribution/windows/linkband-server-windows.exe" >> update_config.ps1
echo     to = "linkband-server-windows.exe" >> update_config.ps1
echo } >> update_config.ps1
echo $json.extraResources += $windowsResource >> update_config.ps1
echo $json ^| ConvertTo-Json -Depth 10 ^| Set-Content $jsonPath >> update_config.ps1

powershell -ExecutionPolicy Bypass -File update_config.ps1
del update_config.ps1

echo OK: Electron builder config updated

echo.
echo ==================== Step 3: Build Electron App ====================

echo NAVIGATE: Changing to electron-app directory...
cd electron-app

echo INSTALL: Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo BUILD: Building Electron app for Windows...
npm run electron:build:win
if %errorlevel% neq 0 (
    echo ERROR: Electron build failed
    pause
    exit /b 1
)

echo GO BACK: Returning to root directory...
cd ..

echo.
echo ==================== Build Complete! ====================

echo SUCCESS: Link Band SDK Windows build completed!
echo.
echo CREATED FILES:
echo 1. Python Server: installers\distribution\windows\linkband-server-windows.exe
echo 2. Electron App: electron-app\release\Link Band SDK Setup *.exe
echo.

if exist "electron-app\release" (
    echo INSTALLER LOCATION:
    dir "electron-app\release\*.exe" /b 2>nul
    echo.
    echo NEXT STEPS:
    echo 1. Test the installer: electron-app\release\Link Band SDK Setup *.exe
    echo 2. The installer will install both the app and the Python server
    echo 3. Distribute the installer to end users
) else (
    echo WARNING: Release directory not found - check for build errors
)

echo.
pause 