@echo off
setlocal enabledelayedexpansion
title Link Band SDK Complete Windows Builder

REM 로그 파일 설정
set "LOG_FILE=%~dp0build-complete-log-%DATE:~0,4%%DATE:~5,2%%DATE:~8,2%-%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%.txt"
set "LOG_FILE=%LOG_FILE: =0%"

call :log "========================================================"
call :log "  Link Band SDK Complete Windows Builder v1.0.1"
call :log "========================================================"
call :log ""
call :log "This script will build the complete Link Band SDK for Windows:"
call :log "1. Python Backend Server (linkband-server-windows.exe)"
call :log "2. Electron Frontend App (Link Band SDK.exe + installer)"
call :log ""
call :log "Log file: %LOG_FILE%"
call :log ""
pause

call :log ""
call :log "==================== Environment Check ===================="

REM Check if we're in the correct directory
if not exist "python_core" (
    call :log "ERROR: python_core folder not found!"
    call :log "Please run this script from the link_band_sdk root directory."
    pause
    exit /b 1
)

if not exist "electron-app" (
    call :log "ERROR: electron-app folder not found!"
    call :log "Please run this script from the link_band_sdk root directory."
    pause
    exit /b 1
)

call :log "OK: Found python_core and electron-app directories"

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    call :log "ERROR: Python is not installed or not in PATH"
    call :log "Please install Python 3.11+ from https://python.org"
    pause
    exit /b 1
)
call :log "OK: Python is available"

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    call :log "ERROR: Node.js is not installed or not in PATH"
    call :log "Please install Node.js from https://nodejs.org"
    pause
    exit /b 1
)
call :log "OK: Node.js is available"

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    call :log "ERROR: npm is not available"
    pause
    exit /b 1
)
call :log "OK: npm is available"

call :log ""
call :log "==================== Step 1: Build Python Server ===================="

call :log "NAVIGATE: Changing to python_core directory..."
cd python_core

call :log "VENV: Creating Python virtual environment..."
if exist venv rmdir /s /q venv >>"%LOG_FILE%" 2>&1
python -m venv venv >>"%LOG_FILE%" 2>&1
call venv\Scripts\activate.bat

call :log "UPGRADE: Upgrading pip..."
python -m pip install --upgrade pip --quiet >>"%LOG_FILE%" 2>&1

call :log "INSTALL: Installing Python dependencies..."
if exist requirements.txt (
    pip install -r requirements.txt --quiet >>"%LOG_FILE%" 2>&1
    if %errorlevel% neq 0 (
        call :log "ERROR: Failed to install Python dependencies"
        pause
        exit /b 1
    )
) else (
    call :log "WARNING: requirements.txt not found"
)

call :log "INSTALL: Installing PyInstaller..."
pip install pyinstaller --quiet >>"%LOG_FILE%" 2>&1

call :log "BUILD: Building Python server executable..."
if exist run_server.py (
    pyinstaller --onefile --name linkband-server-windows run_server.py >>"%LOG_FILE%" 2>&1
) else if exist server.py (
    pyinstaller --onefile --name linkband-server-windows server.py >>"%LOG_FILE%" 2>&1
) else if exist main.py (
    pyinstaller --onefile --name linkband-server-windows main.py >>"%LOG_FILE%" 2>&1
) else (
    call :log "ERROR: No Python server file found (run_server.py, server.py, or main.py)"
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    call :log "ERROR: Python server build failed"
    pause
    exit /b 1
)

if not exist "dist\linkband-server-windows.exe" (
    call :log "ERROR: Python server executable not created"
    pause
    exit /b 1
)

call :log "SUCCESS: Python server built successfully!"

call :log "COPY: Copying server to installers directory..."
if not exist "..\installers\distribution\windows" mkdir "..\installers\distribution\windows" >>"%LOG_FILE%" 2>&1
copy "dist\linkband-server-windows.exe" "..\installers\distribution\windows\linkband-server-windows.exe" >>"%LOG_FILE%" 2>&1

call :log "GO BACK: Returning to root directory..."
cd ..

call :log ""
call :log "==================== Step 2: Update Electron Builder Config ===================="

call :log "UPDATE: Adding Windows server to electron-builder.json..."

REM Create a temporary PowerShell script to update the JSON
echo $jsonPath = "electron-app\electron-builder.json" > update_config.ps1
echo $json = Get-Content $jsonPath ^| ConvertFrom-Json >> update_config.ps1
echo $windowsResource = @{ >> update_config.ps1
echo     from = "../installers/distribution/windows/linkband-server-windows.exe" >> update_config.ps1
echo     to = "linkband-server-windows.exe" >> update_config.ps1
echo } >> update_config.ps1
echo $json.extraResources += $windowsResource >> update_config.ps1
echo $json ^| ConvertTo-Json -Depth 10 ^| Set-Content $jsonPath >> update_config.ps1

powershell -ExecutionPolicy Bypass -File update_config.ps1 >>"%LOG_FILE%" 2>&1
del update_config.ps1

call :log "OK: Electron builder config updated"

call :log ""
call :log "==================== Step 3: Build Electron App ===================="

call :log "NAVIGATE: Changing to electron-app directory..."
cd electron-app

call :log "INSTALL: Installing Node.js dependencies..."
npm install >>"%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    call :log "ERROR: Failed to install Node.js dependencies"
    pause
    exit /b 1
)

call :log "BUILD: Building Electron app for Windows..."
npm run electron:build:win >>"%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    call :log "ERROR: Electron build failed"
    pause
    exit /b 1
)

call :log "GO BACK: Returning to root directory..."
cd ..

call :log ""
call :log "==================== Build Complete! ===================="

call :log "SUCCESS: Link Band SDK Windows build completed!"
call :log ""
call :log "CREATED FILES:"
call :log "1. Python Server: installers\distribution\windows\linkband-server-windows.exe"
call :log "2. Electron App: electron-app\release\Link Band SDK Setup *.exe"
call :log ""

if exist "electron-app\release" (
    call :log "INSTALLER LOCATION:"
    dir "electron-app\release\*.exe" /b 2>>"%LOG_FILE%" | call :log_stdin
    call :log ""
    call :log "NEXT STEPS:"
    call :log "1. Test the installer: electron-app\release\Link Band SDK Setup *.exe"
    call :log "2. The installer will install both the app and the Python server"
    call :log "3. Distribute the installer to end users"
) else (
    call :log "WARNING: Release directory not found - check for build errors"
)

call :log ""
call :log "Complete log saved to: %LOG_FILE%"
call :log ""
pause
exit /b 0

:log
echo %~1
echo %~1 >> "%LOG_FILE%"
goto :eof

:log_stdin
for /f "delims=" %%i in ('more') do (
    echo %%i
    echo %%i >> "%LOG_FILE%"
)
goto :eof 