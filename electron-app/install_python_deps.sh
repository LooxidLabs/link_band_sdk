#!/bin/bash

echo "Link Band SDK - Python Dependencies Installer"
echo "============================================="
echo ""
echo "This script will install the required Python packages for Link Band SDK."
echo "You need Python 3.8 or later installed on your system."
echo ""

# Check if Python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed."
    echo "Please install Python 3.8 or later from https://www.python.org/downloads/"
    exit 1
fi

# Get Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Found Python version: $PYTHON_VERSION"

# Check Python version (needs to be 3.8+)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo "Error: Python 3.8 or later is required."
    echo "Your version: $PYTHON_VERSION"
    exit 1
fi

# Install pip if not available
if ! command -v pip3 &> /dev/null; then
    echo "pip3 not found. Installing pip..."
    python3 -m ensurepip --default-pip
fi

# Upgrade pip
echo "Upgrading pip..."
python3 -m pip install --upgrade pip

# Install required packages
echo ""
echo "Installing required packages..."
python3 -m pip install --user \
    fastapi==0.115.12 \
    uvicorn==0.34.2 \
    websockets==15.0.1 \
    bleak==0.22.3 \
    numpy==2.2.4 \
    scipy==1.15.2 \
    mne==1.9.0 \
    heartpy==1.2.7 \
    psutil==7.0.0 \
    python-dotenv==1.1.0 \
    python-multipart==0.0.6

if [ $? -eq 0 ]; then
    echo ""
    echo " All dependencies installed successfully!"
    echo ""
    echo "You can now run Link Band SDK."
else
    echo ""
    echo " Error: Failed to install some dependencies."
    echo "Please check the error messages above."
    exit 1
fi 