#!/bin/bash
set -e

echo "Setting up Wine environment..."

# Initialize Wine if not already done
wine wineboot --init || true
sleep 5

# Install Python in Wine
echo "Installing Python in Wine..."
wine /tmp/python-3.11.0-amd64.exe /quiet InstallAllUsers=1 PrependPath=1

# Wait for installation to complete
sleep 15

# Try different Python paths
PYTHON_PATHS=(
    "python"
    "C:\\Python311\\python.exe"
    "C:\\Python\\python.exe"
    "C:\\Program Files\\Python311\\python.exe"
)

PYTHON_CMD=""
for path in "${PYTHON_PATHS[@]}"; do
    if wine "$path" --version 2>/dev/null; then
        PYTHON_CMD="$path"
        echo "Found Python at: $path"
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ Python installation failed"
    wine regedit /E python_paths.reg 'HKEY_LOCAL_MACHINE\SOFTWARE\Python'
    cat python_paths.reg || true
    exit 1
fi

# Install pip packages
echo "Installing Python packages..."
wine "$PYTHON_CMD" -m pip install --upgrade pip
wine "$PYTHON_CMD" -m pip install -r requirements.txt
wine "$PYTHON_CMD" -m pip install pyinstaller

# Build the executable
echo "Building Windows executable..."
cd python_core
wine "$PYTHON_CMD" -m PyInstaller --onefile --name linkband-server-windows.exe run_server.py

# Copy to output directory
echo "Copying executable to output..."
if [ -f "dist/linkband-server-windows.exe" ]; then
    cp dist/linkband-server-windows.exe /output/
    echo "✅ Windows server built successfully!"
    ls -la /output/
else
    echo "❌ Build failed - executable not found"
    ls -la dist/ || true
    exit 1
fi
