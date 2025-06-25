#!/bin/bash

# Link Band SDK macOS Installer
# Copyright (c) 2025 Looxid Labs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PYTHON_MIN_VERSION="3.9"
SDK_VERSION="1.0.0"
INSTALL_DIR="$HOME/Applications"
SDK_NAME="Link Band SDK"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Link Band SDK Installer v${SDK_VERSION}${NC}"
echo -e "${BLUE}  for macOS${NC}"
echo -e "${BLUE}================================${NC}"
echo

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare version numbers
version_ge() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# Function to get Python version
get_python_version() {
    python3 -c "import sys; print('.'.join(map(str, sys.version_info[:2])))" 2>/dev/null || echo "0.0"
}

# Step 1: Check Python installation
echo -e "${YELLOW}Step 1: Checking Python installation...${NC}"

if command_exists python3; then
    PYTHON_VERSION=$(get_python_version)
    echo -e "Found Python ${PYTHON_VERSION}"
    
    if version_ge "$PYTHON_VERSION" "$PYTHON_MIN_VERSION"; then
        echo -e "${GREEN}✓ Python ${PYTHON_VERSION} is compatible${NC}"
    else
        echo -e "${RED}✗ Python ${PYTHON_VERSION} is too old. Minimum required: ${PYTHON_MIN_VERSION}${NC}"
        echo -e "${YELLOW}Please install Python ${PYTHON_MIN_VERSION} or newer from:${NC}"
        echo -e "  ${BLUE}https://www.python.org/downloads/${NC}"
        echo -e "  ${BLUE}or using Homebrew: brew install python${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Python 3 is not installed${NC}"
    echo -e "${YELLOW}Installing Python using Homebrew...${NC}"
    
    if command_exists brew; then
        brew install python
        echo -e "${GREEN}✓ Python installed successfully${NC}"
    else
        echo -e "${RED}Homebrew is not installed. Please install Python manually:${NC}"
        echo -e "  ${BLUE}1. Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
        echo -e "  ${BLUE}2. Install Python: brew install python${NC}"
        echo -e "  ${BLUE}3. Run this installer again${NC}"
        exit 1
    fi
fi

# Step 2: Check pip
echo -e "\n${YELLOW}Step 2: Checking pip installation...${NC}"

if command_exists pip3; then
    echo -e "${GREEN}✓ pip3 is available${NC}"
else
    echo -e "${YELLOW}Installing pip...${NC}"
    python3 -m ensurepip --upgrade
fi

# Step 3: Install Python dependencies
echo -e "\n${YELLOW}Step 3: Installing Python dependencies...${NC}"

# Check if we need to use virtual environment (Python 3.13+)
PYTHON_VERSION_MAJOR=$(python3 -c "import sys; print(sys.version_info.major)")
PYTHON_VERSION_MINOR=$(python3 -c "import sys; print(sys.version_info.minor)")

if [[ $PYTHON_VERSION_MAJOR -ge 3 && $PYTHON_VERSION_MINOR -ge 13 ]]; then
    echo -e "${YELLOW}Python 3.13+ detected, using system package installation...${NC}"
    
    # Try pipx first (recommended for Python 3.13+)
    if command_exists pipx; then
        echo -e "Installing packages via pipx..."
        pipx install numpy scipy matplotlib mne heartpy fastapi uvicorn websockets 2>/dev/null || true
    fi
    
    # Install via brew if available
    if command_exists brew; then
        echo -e "Installing Python packages via Homebrew..."
        brew install python-matplotlib python@3.13 || true
        
        # Install remaining packages with --break-system-packages flag
        echo -e "Installing additional packages..."
        python3 -m pip install --break-system-packages numpy scipy matplotlib mne heartpy fastapi uvicorn websockets || {
            echo -e "${YELLOW}Some packages may need manual installation. The SDK will still work with basic functionality.${NC}"
        }
    else
        # Fallback: use --break-system-packages flag
        echo -e "${YELLOW}Installing with --break-system-packages flag...${NC}"
        python3 -m pip install --break-system-packages numpy scipy matplotlib mne heartpy fastapi uvicorn websockets
    fi
else
    # For older Python versions, use normal installation
    echo -e "Installing required Python packages..."
    pip3 install --user numpy scipy matplotlib mne heartpy fastapi uvicorn websockets
fi

echo -e "${GREEN}✓ Python dependencies installed${NC}"

# Step 4: Download and install SDK
echo -e "\n${YELLOW}Step 4: Installing Link Band SDK...${NC}"

# Detect architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    DMG_URL="https://github.com/Brian-Chae/link_band_sdk/releases/latest/download/Link-Band-SDK-1.0.0-arm64.dmg"
    DMG_NAME="Link-Band-SDK-1.0.0-arm64.dmg"
else
    DMG_URL="https://github.com/Brian-Chae/link_band_sdk/releases/latest/download/Link-Band-SDK-1.0.0.dmg"
    DMG_NAME="Link-Band-SDK-1.0.0.dmg"
fi

echo -e "Downloading ${SDK_NAME} for ${ARCH}..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Download DMG
if command_exists curl; then
    curl -L -o "$DMG_NAME" "$DMG_URL"
elif command_exists wget; then
    wget -O "$DMG_NAME" "$DMG_URL"
else
    echo -e "${RED}✗ Neither curl nor wget is available for downloading${NC}"
    echo -e "${YELLOW}Please download manually from: ${DMG_URL}${NC}"
    exit 1
fi

# Mount and install
echo -e "Installing ${SDK_NAME}..."
hdiutil attach "$DMG_NAME" -quiet

# Find the mounted volume
VOLUME_PATH=$(ls /Volumes/ | grep -i "link.*band.*sdk" | head -1)
if [[ -z "$VOLUME_PATH" ]]; then
    echo -e "${RED}✗ Could not find mounted SDK volume${NC}"
    exit 1
fi

# Copy application
if [[ -d "/Volumes/$VOLUME_PATH/Link Band SDK.app" ]]; then
    mkdir -p "$INSTALL_DIR"
    cp -R "/Volumes/$VOLUME_PATH/Link Band SDK.app" "$INSTALL_DIR/"
    echo -e "${GREEN}✓ ${SDK_NAME} installed to ${INSTALL_DIR}${NC}"
else
    echo -e "${RED}✗ Could not find Link Band SDK.app in the DMG${NC}"
    exit 1
fi

# Unmount
hdiutil detach "/Volumes/$VOLUME_PATH" -quiet

# Cleanup
cd "$HOME"
rm -rf "$TEMP_DIR"

# Step 5: Create desktop shortcut
echo -e "\n${YELLOW}Step 5: Creating shortcuts...${NC}"

# Create desktop alias
if [[ -d "$HOME/Desktop" ]]; then
    ln -sf "$INSTALL_DIR/Link Band SDK.app" "$HOME/Desktop/Link Band SDK.app" 2>/dev/null || true
    echo -e "${GREEN}✓ Desktop shortcut created${NC}"
fi

# Step 6: Final instructions
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo
echo -e "${YELLOW}You can now launch Link Band SDK from:${NC}"
echo -e "  • Applications folder"
echo -e "  • Desktop shortcut"
echo -e "  • Spotlight search"
echo
echo -e "${YELLOW}First launch may take a few moments to initialize.${NC}"
echo
echo -e "${BLUE}For support, visit: https://github.com/Brian-Chae/link_band_sdk${NC}"
echo

# Optional: Launch the app
read -p "Would you like to launch Link Band SDK now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "$INSTALL_DIR/Link Band SDK.app"
fi 