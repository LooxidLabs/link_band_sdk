#!/bin/bash

echo "========================================================"
echo "  Link Band SDK Windows Build Test"
echo "========================================================"
echo ""

# Test if we're in the right directory
if [ ! -d "python_core" ]; then
    echo "ERROR: Run this from link_band_sdk root directory"
    exit 1
fi

echo "1. Testing Python..."
if command -v python3 &> /dev/null; then
    python3 --version
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    python --version
    PYTHON_CMD="python"
else
    echo "FAIL: Python not found"
    exit 1
fi

echo "2. Testing Node.js..."
if command -v node &> /dev/null; then
    node --version
else
    echo "FAIL: Node.js not found"
    exit 1
fi

echo "3. Testing npm..."
if command -v npm &> /dev/null; then
    npm --version
else
    echo "FAIL: npm not found"
    exit 1
fi

echo "4. Checking directories..."
if [ -d "electron-app" ]; then
    echo "OK: electron-app found"
else
    echo "FAIL: electron-app not found"
fi

if [ -d "python_core" ]; then
    echo "OK: python_core found"
else
    echo "FAIL: python_core not found"
fi

echo ""
echo "All tests passed! You can run build-windows-complete.sh"
echo ""
read -p "Press Enter to exit..." 