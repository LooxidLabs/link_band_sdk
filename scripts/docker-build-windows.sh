#!/bin/bash
set -e

echo "Setting up Wine environment..."

# Wait for Xvfb to start
sleep 2

# Install Python in Wine
echo "Installing Python in Wine..."
wine /tmp/python-3.11.0-amd64.exe /quiet InstallAllUsers=1 PrependPath=1 TargetDir="C:\\Python311"

# Wait for installation to complete
sleep 10

# Verify Python installation
echo "Verifying Python installation..."
wine python --version || {
    echo "Python installation failed, trying alternative path..."
    wine "C:\\Python311\\python.exe" --version
}

# Install pip packages
echo "Installing Python packages..."
wine python -m pip install --upgrade pip
wine python -m pip install -r requirements.txt
wine python -m pip install pyinstaller

# Build the executable
echo "Building Windows executable..."
cd python_core
wine python -m PyInstaller --onefile --name linkband-server-windows.exe run_server.py

# Copy to output directory
echo "Copying executable to output..."
if [ -f "dist/linkband-server-windows.exe" ]; then
    cp dist/linkband-server-windows.exe /output/
    echo "✅ Windows server built successfully!"
else
    echo "❌ Build failed - executable not found"
    ls -la dist/
    exit 1
fi
