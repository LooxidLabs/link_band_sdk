#!/bin/bash

echo "========================================================"
echo "  Link Band SDK Complete Windows Builder v1.0.1"
echo "========================================================"
echo ""
echo "This script will build the complete Link Band SDK for Windows:"
echo "1. Python Backend Server (linkband-server-windows.exe)"
echo "2. Electron Frontend App (Link Band SDK.exe + installer)"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "==================== Environment Check ===================="

# Check if we're in the correct directory
if [ ! -d "python_core" ]; then
    echo "ERROR: python_core folder not found!"
    echo "Please run this script from the link_band_sdk root directory."
    exit 1
fi

if [ ! -d "electron-app" ]; then
    echo "ERROR: electron-app folder not found!"
    echo "Please run this script from the link_band_sdk root directory."
    exit 1
fi

echo "OK: Found python_core and electron-app directories"

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "ERROR: Python is not installed or not in PATH"
    echo "Please install Python 3.11+ from https://python.org"
    exit 1
fi

# Use python3 if available, otherwise python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

echo "OK: Python is available ($PYTHON_CMD)"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi
echo "OK: Node.js is available"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not available"
    exit 1
fi
echo "OK: npm is available"

echo ""
echo "==================== Step 1: Build Python Server ===================="

echo "NAVIGATE: Changing to python_core directory..."
cd python_core

echo "VENV: Creating Python virtual environment..."
if [ -d "venv" ]; then
    rm -rf venv
fi
$PYTHON_CMD -m venv venv
source venv/bin/activate

echo "UPGRADE: Upgrading pip..."
pip install --upgrade pip --quiet

echo "INSTALL: Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt --quiet
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install Python dependencies"
        exit 1
    fi
else
    echo "WARNING: requirements.txt not found"
fi

echo "INSTALL: Installing PyInstaller..."
pip install pyinstaller --quiet

echo "BUILD: Building Python server executable..."
if [ -f "run_server.py" ]; then
    pyinstaller --onefile --name linkband-server-windows run_server.py
elif [ -f "server.py" ]; then
    pyinstaller --onefile --name linkband-server-windows server.py
elif [ -f "main.py" ]; then
    pyinstaller --onefile --name linkband-server-windows main.py
else
    echo "ERROR: No Python server file found (run_server.py, server.py, or main.py)"
    exit 1
fi

if [ $? -ne 0 ]; then
    echo "ERROR: Python server build failed"
    exit 1
fi

if [ ! -f "dist/linkband-server-windows" ]; then
    echo "ERROR: Python server executable not created"
    exit 1
fi

echo "SUCCESS: Python server built successfully!"

echo "COPY: Copying server to installers directory..."
mkdir -p "../installers/distribution/windows"
cp "dist/linkband-server-windows" "../installers/distribution/windows/linkband-server-windows.exe"

echo "GO BACK: Returning to root directory..."
cd ..

echo ""
echo "==================== Step 2: Update Electron Builder Config ===================="

echo "UPDATE: Windows server already configured in electron-builder.json"

echo ""
echo "==================== Step 3: Build Electron App ===================="

echo "NAVIGATE: Changing to electron-app directory..."
cd electron-app

echo "INSTALL: Installing Node.js dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Node.js dependencies"
    exit 1
fi

echo "BUILD: Building Electron app for Windows..."
npm run electron:build:win
if [ $? -ne 0 ]; then
    echo "ERROR: Electron build failed"
    exit 1
fi

echo "GO BACK: Returning to root directory..."
cd ..

echo ""
echo "==================== Build Complete! ===================="

echo "SUCCESS: Link Band SDK Windows build completed!"
echo ""
echo "CREATED FILES:"
echo "1. Python Server: installers/distribution/windows/linkband-server-windows.exe"
echo "2. Electron App: electron-app/release/Link Band SDK Setup *.exe"
echo ""

if [ -d "electron-app/release" ]; then
    echo "INSTALLER LOCATION:"
    ls -la "electron-app/release/"*.exe 2>/dev/null || echo "No .exe files found"
    echo ""
    echo "NEXT STEPS:"
    echo "1. Test the installer: electron-app/release/Link Band SDK Setup *.exe"
    echo "2. The installer will install both the app and the Python server"
    echo "3. Distribute the installer to end users"
else
    echo "WARNING: Release directory not found - check for build errors"
fi

echo ""
read -p "Press Enter to exit..." 