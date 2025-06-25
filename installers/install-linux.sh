#!/bin/bash

# Link Band SDK Linux Installer
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
INSTALL_DIR="$HOME/.local/share/applications"
BIN_DIR="$HOME/.local/bin"
SDK_NAME="Link Band SDK"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Link Band SDK Installer v${SDK_VERSION}${NC}"
echo -e "${BLUE}  for Linux${NC}"
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

# Function to detect Linux distribution
detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "$ID"
    elif [[ -f /etc/redhat-release ]]; then
        echo "rhel"
    elif [[ -f /etc/debian_version ]]; then
        echo "debian"
    else
        echo "unknown"
    fi
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
        
        DISTRO=$(detect_distro)
        echo -e "${YELLOW}Installing Python ${PYTHON_MIN_VERSION}...${NC}"
        
        case "$DISTRO" in
            "ubuntu"|"debian")
                sudo apt update
                sudo apt install -y python3 python3-pip python3-venv
                ;;
            "fedora"|"rhel"|"centos")
                sudo dnf install -y python3 python3-pip
                ;;
            "arch"|"manjaro")
                sudo pacman -S --noconfirm python python-pip
                ;;
            *)
                echo -e "${RED}Unsupported distribution. Please install Python 3.9+ manually.${NC}"
                exit 1
                ;;
        esac
    fi
else
    echo -e "${RED}✗ Python 3 is not installed${NC}"
    
    DISTRO=$(detect_distro)
    echo -e "${YELLOW}Installing Python...${NC}"
    
    case "$DISTRO" in
        "ubuntu"|"debian")
            sudo apt update
            sudo apt install -y python3 python3-pip python3-venv
            ;;
        "fedora"|"rhel"|"centos")
            sudo dnf install -y python3 python3-pip
            ;;
        "arch"|"manjaro")
            sudo pacman -S --noconfirm python python-pip
            ;;
        *)
            echo -e "${RED}Unsupported distribution. Please install Python 3.9+ manually.${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓ Python installed successfully${NC}"
fi

# Step 2: Check pip
echo -e "\n${YELLOW}Step 2: Checking pip installation...${NC}"

if command_exists pip3; then
    echo -e "${GREEN}✓ pip3 is available${NC}"
else
    echo -e "${YELLOW}Installing pip...${NC}"
    python3 -m ensurepip --upgrade --user
fi

# Step 3: Install Python dependencies
echo -e "\n${YELLOW}Step 3: Installing Python dependencies...${NC}"

echo -e "Installing required Python packages..."
pip3 install --user numpy scipy matplotlib mne heartpy fastapi uvicorn websockets

echo -e "${GREEN}✓ Python dependencies installed${NC}"

# Step 4: Download and install SDK
echo -e "\n${YELLOW}Step 4: Installing Link Band SDK...${NC}"

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    "x86_64")
        APPIMAGE_URL="https://github.com/Brian-Chae/link_band_sdk/releases/latest/download/Link-Band-SDK-1.0.0.AppImage"
        APPIMAGE_NAME="Link-Band-SDK-1.0.0.AppImage"
        ;;
    "aarch64"|"arm64")
        APPIMAGE_URL="https://github.com/Brian-Chae/link_band_sdk/releases/latest/download/Link-Band-SDK-1.0.0-arm64.AppImage"
        APPIMAGE_NAME="Link-Band-SDK-1.0.0-arm64.AppImage"
        ;;
    *)
        echo -e "${RED}✗ Unsupported architecture: ${ARCH}${NC}"
        exit 1
        ;;
esac

echo -e "Downloading ${SDK_NAME} for ${ARCH}..."

# Create directories
mkdir -p "$BIN_DIR"
mkdir -p "$INSTALL_DIR"

# Download AppImage
if command_exists curl; then
    curl -L -o "$BIN_DIR/$APPIMAGE_NAME" "$APPIMAGE_URL"
elif command_exists wget; then
    wget -O "$BIN_DIR/$APPIMAGE_NAME" "$APPIMAGE_URL"
else
    echo -e "${RED}✗ Neither curl nor wget is available for downloading${NC}"
    echo -e "${YELLOW}Please download manually from: ${APPIMAGE_URL}${NC}"
    exit 1
fi

# Make executable
chmod +x "$BIN_DIR/$APPIMAGE_NAME"

# Create symlink
ln -sf "$BIN_DIR/$APPIMAGE_NAME" "$BIN_DIR/linkband-sdk"

echo -e "${GREEN}✓ ${SDK_NAME} installed to ${BIN_DIR}${NC}"

# Step 5: Create desktop entry
echo -e "\n${YELLOW}Step 5: Creating desktop entry...${NC}"

cat > "$INSTALL_DIR/linkband-sdk.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Link Band SDK
Comment=Link Band SDK for EEG data analysis
Exec=$BIN_DIR/$APPIMAGE_NAME
Icon=linkband-sdk
Categories=Science;Education;Development;
Terminal=false
StartupNotify=true
EOF

# Update desktop database
if command_exists update-desktop-database; then
    update-desktop-database "$INSTALL_DIR" 2>/dev/null || true
fi

echo -e "${GREEN}✓ Desktop entry created${NC}"

# Step 6: Add to PATH
echo -e "\n${YELLOW}Step 6: Setting up PATH...${NC}"

# Add to .bashrc if not already present
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo "export PATH=\"\$PATH:$BIN_DIR\"" >> "$HOME/.bashrc"
    echo -e "${GREEN}✓ Added to PATH (restart terminal or run 'source ~/.bashrc')${NC}"
else
    echo -e "${GREEN}✓ Already in PATH${NC}"
fi

# Step 7: Final instructions
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo
echo -e "${YELLOW}You can now launch Link Band SDK from:${NC}"
echo -e "  • Application menu"
echo -e "  • Terminal: linkband-sdk"
echo -e "  • Direct: $BIN_DIR/$APPIMAGE_NAME"
echo
echo -e "${YELLOW}First launch may take a few moments to initialize.${NC}"
echo
echo -e "${BLUE}For support, visit: https://github.com/Brian-Chae/link_band_sdk${NC}"
echo

# Optional: Launch the app
read -p "Would you like to launch Link Band SDK now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    "$BIN_DIR/$APPIMAGE_NAME" &
    echo -e "${GREEN}✓ Link Band SDK launched${NC}"
fi 