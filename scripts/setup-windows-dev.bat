@echo off
setlocal enabledelayedexpansion
title Link Band SDK Windows Development Setup

echo ========================================================
echo   Link Band SDK Windows Development Setup
echo ========================================================
echo.
echo This script will set up your Windows development environment:
echo 1. Create Python virtual environment
echo 2. Install Python dependencies
echo 3. Install Node.js dependencies
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
python3 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python3 is not installed or not in PATH
    echo Please install Python 3.11+ from https://python.org
    echo Make sure 'python3' command is available
    pause
    exit /b 1
)
echo OK: Python3 is available

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo OK: Node.js is available

echo.
echo ==================== Step 1: Setup Python Environment ====================

echo NAVIGATE: Changing to python_core directory...
cd python_core

echo VENV: Creating Python virtual environment...
if exist venv (
    echo INFO: Virtual environment already exists, removing old one...
    rmdir /s /q venv
)
python3 -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo ACTIVATE: Activating virtual environment...
call venv\Scripts\activate.bat

echo UPGRADE: Upgrading pip...
python -m pip install --upgrade pip

echo INSTALL: Installing Python dependencies...
if exist requirements.txt (
    echo Installing packages from requirements.txt...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Python dependencies
        echo.
        echo Try running these commands manually:
        echo   cd python_core
        echo   python3 -m venv venv
        echo   venv\Scripts\activate.bat
        echo   pip install -r requirements.txt
        pause
        exit /b 1
    )
) else (
    echo WARNING: requirements.txt not found
)

echo SUCCESS: Python environment setup complete!

echo GO BACK: Returning to root directory...
cd ..

echo.
echo ==================== Step 2: Setup Node.js Environment ====================

echo NAVIGATE: Changing to electron-app directory...
cd electron-app

echo INSTALL: Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    echo.
    echo Try running these commands manually:
    echo   cd electron-app
    echo   npm install
    pause
    exit /b 1
)

echo SUCCESS: Node.js environment setup complete!

echo GO BACK: Returning to root directory...
cd ..

echo.
echo ==================== Setup Complete! ====================

echo SUCCESS: Development environment setup completed!
echo.
echo NEXT STEPS:
echo 1. To run the development server:
echo    cd electron-app
echo    npm run electron:preview
echo.
echo 2. The Python server will start automatically when you run the Electron app
echo.
echo 3. If you need to run the Python server separately:
echo    cd python_core
echo    venv\Scripts\activate.bat
echo    python run_server.py
echo.
echo TROUBLESHOOTING:
echo - If Python server fails to start, check that python3 is in your PATH
echo - Make sure you have Python 3.11+ installed
echo - If you get permission errors, run as Administrator
echo.
pause 