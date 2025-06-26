#!/bin/bash

# Link Band SDK macOS Installer (Virtual Environment Version)
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
VENV_DIR="$HOME/.linkband-sdk-env"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Link Band SDK Installer v${SDK_VERSION}${NC}"
echo -e "${BLUE}  for macOS (Virtual Environment)${NC}"
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

# Step 2: Create virtual environment
echo -e "\n${YELLOW}Step 2: Setting up virtual environment...${NC}"

if [[ -d "$VENV_DIR" ]]; then
    echo -e "${YELLOW}Removing existing virtual environment...${NC}"
    rm -rf "$VENV_DIR"
fi

echo -e "Creating virtual environment at $VENV_DIR..."
python3 -m venv "$VENV_DIR"

echo -e "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

echo -e "${GREEN}✓ Virtual environment created and activated${NC}"

# Step 3: Install Python dependencies
echo -e "\n${YELLOW}Step 3: Installing Python dependencies...${NC}"

echo -e "Upgrading pip..."
pip install --upgrade pip

echo -e "Installing required Python packages..."
pip install numpy scipy matplotlib mne heartpy fastapi uvicorn websockets

echo -e "${GREEN}✓ Python dependencies installed in virtual environment${NC}"

# Step 4: Create activation script
echo -e "\n${YELLOW}Step 4: Creating activation script...${NC}"

ACTIVATION_SCRIPT="$HOME/.linkband-sdk-activate"
cat > "$ACTIVATION_SCRIPT" << EOF
#!/bin/bash
# Link Band SDK Environment Activation Script

export LINKBAND_SDK_VENV="$VENV_DIR"
source "\$LINKBAND_SDK_VENV/bin/activate"

echo "🐍 Link Band SDK Python environment activated"
echo "Virtual environment: \$LINKBAND_SDK_VENV"
EOF

chmod +x "$ACTIVATION_SCRIPT"
echo -e "${GREEN}✓ Activation script created at $ACTIVATION_SCRIPT${NC}"

# Step 5: Download and install SDK
echo -e "\n${YELLOW}Step 5: Installing Link Band SDK...${NC}"

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

# Step 6: Create wrapper script
echo -e "\n${YELLOW}Step 6: Creating launcher script...${NC}"

LAUNCHER_SCRIPT="$HOME/Desktop/Launch Link Band SDK.command"
cat > "$LAUNCHER_SCRIPT" << EOF
#!/bin/bash
# Link Band SDK Launcher with Virtual Environment

echo "🚀 Starting Link Band SDK..."
echo "Activating Python virtual environment..."

# Activate virtual environment
source "$VENV_DIR/bin/activate"

echo "✓ Virtual environment activated"
echo "🎯 Launching Link Band SDK..."

# Launch the app
open "$INSTALL_DIR/Link Band SDK.app"

echo "✅ Link Band SDK launched successfully!"
echo "You can close this terminal window."

# Keep terminal open for a moment
sleep 3
EOF

chmod +x "$LAUNCHER_SCRIPT"
echo -e "${GREEN}✓ Launcher script created on Desktop${NC}"

# Step 7: Final instructions
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo
echo -e "${YELLOW}🎉 Link Band SDK has been installed with a dedicated Python environment!${NC}"
echo
echo -e "${YELLOW}To launch Link Band SDK:${NC}"
echo -e "  • Double-click 'Launch Link Band SDK.command' on your Desktop"
echo -e "  • Or run: source $ACTIVATION_SCRIPT && open '$INSTALL_DIR/Link Band SDK.app'"
echo
echo -e "${YELLOW}Virtual environment location: ${VENV_DIR}${NC}"
echo -e "${YELLOW}This ensures no conflicts with your system Python packages.${NC}"
echo
echo -e "${BLUE}For support, visit: https://github.com/Brian-Chae/link_band_sdk${NC}"
echo

# Optional: Launch the app
read -p "Would you like to launch Link Band SDK now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}🚀 Launching Link Band SDK...${NC}"
    open "$INSTALL_DIR/Link Band SDK.app"
fi 