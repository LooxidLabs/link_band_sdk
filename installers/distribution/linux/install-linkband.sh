#!/bin/bash

# Link Band SDK Installer for Linux
# Run with: bash install-linkband.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    Link Band SDK Installer for Linux${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    echo -e "${RED} Error: Please do not run this installer as root${NC}"
    echo -e "${YELLOW}   Run as a regular user (sudo will be requested when needed)${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN} Running as regular user${NC}"
echo ""

# Detect distribution
if command -v lsb_release >/dev/null 2>&1; then
    DISTRO=$(lsb_release -si)
    VERSION=$(lsb_release -sr)
elif [[ -f /etc/os-release ]]; then
    source /etc/os-release
    DISTRO=$NAME
    VERSION=$VERSION_ID
else
    DISTRO="Unknown"
    VERSION="Unknown"
fi

echo -e "${BLUE}📋 System Information:${NC}"
echo "   Distribution: $DISTRO"
echo "   Version: $VERSION"
echo "   Architecture: $(uname -m)"
echo ""

# Check for required files
APPIMAGE_FILE="$SCRIPT_DIR/LinkBandSDK.AppImage"
SERVER_FILE="$SCRIPT_DIR/linkband-server-linux"

if [[ ! -f "$APPIMAGE_FILE" ]]; then
    echo -e "${RED} Error: LinkBandSDK.AppImage not found${NC}"
    echo -e "${YELLOW}   Please ensure all files are in the same folder${NC}"
    echo ""
    exit 1
fi

if [[ ! -f "$SERVER_FILE" ]]; then
    echo -e "${RED} Error: linkband-server-linux not found${NC}"
    echo -e "${YELLOW}   Please ensure all files are in the same folder${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN} All required files found${NC}"
echo ""

# Install system dependencies
echo -e "${BLUE} Installing system dependencies...${NC}"

install_dependencies() {
    local pkg_manager=""
    local install_cmd=""
    local packages=""
    
    if command -v apt-get >/dev/null 2>&1; then
        pkg_manager="apt-get"
        install_cmd="sudo apt-get update && sudo apt-get install -y"
        packages="fuse libfuse2 libnss3 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2"
    elif command -v yum >/dev/null 2>&1; then
        pkg_manager="yum"
        install_cmd="sudo yum install -y"
        packages="fuse fuse-libs nss atk at-spi2-atk libdrm libXcomposite libXdamage libXrandr mesa-libgbm libXScrnSaver alsa-lib"
    elif command -v dnf >/dev/null 2>&1; then
        pkg_manager="dnf"
        install_cmd="sudo dnf install -y"
        packages="fuse fuse-libs nss atk at-spi2-atk libdrm libXcomposite libXdamage libXrandr mesa-libgbm libXScrnSaver alsa-lib"
    elif command -v pacman >/dev/null 2>&1; then
        pkg_manager="pacman"
        install_cmd="sudo pacman -S --noconfirm"
        packages="fuse2 nss atk at-spi2-atk libdrm libxcomposite libxdamage libxrandr mesa alsa-lib"
    elif command -v zypper >/dev/null 2>&1; then
        pkg_manager="zypper"
        install_cmd="sudo zypper install -y"
        packages="fuse libnss3 libatk-bridge-2_0-0 libdrm2 libXcomposite1 libXdamage1 libXrandr2 libgbm1 libXss1 alsa"
    else
        echo -e "${YELLOW}  Warning: Unknown package manager${NC}"
        echo "   Please install FUSE and other AppImage dependencies manually"
        echo ""
    fi
    
    if [[ -n "$pkg_manager" ]]; then
        echo "Using $pkg_manager to install dependencies..."
        if eval "$install_cmd $packages"; then
            echo -e "${GREEN} Dependencies installed successfully${NC}"
        else
            echo -e "${YELLOW}  Warning: Some dependencies may not have been installed${NC}"
            echo "   The application might still work, but some features may be limited"
        fi
    fi
}

install_dependencies
echo ""

# Install AppImage
echo -e "${BLUE}📱 Installing Link Band SDK Application...${NC}"
INSTALL_DIR="$HOME/.local/bin"
APP_TARGET="$INSTALL_DIR/LinkBandSDK.AppImage"

if [[ ! -d "$INSTALL_DIR" ]]; then
    mkdir -p "$INSTALL_DIR"
fi

echo "Copying AppImage to $INSTALL_DIR..."
cp "$APPIMAGE_FILE" "$APP_TARGET"
chmod +x "$APP_TARGET"

echo -e "${GREEN} Application installed successfully${NC}"
echo ""

# Install Python backend server
echo -e "${BLUE} Installing Python Backend Server...${NC}"
SERVER_TARGET="$INSTALL_DIR/linkband-server"

echo "Copying server to $INSTALL_DIR..."
cp "$SERVER_FILE" "$SERVER_TARGET"
chmod +x "$SERVER_TARGET"

echo -e "${GREEN} Python backend server installed successfully${NC}"
echo ""

# Add to PATH
echo -e "${BLUE}🔗 Adding to PATH...${NC}"
BASHRC="$HOME/.bashrc"
PROFILE="$HOME/.profile"

add_to_path() {
    local file="$1"
    if [[ -f "$file" ]]; then
        if ! grep -q "$INSTALL_DIR" "$file"; then
            echo "" >> "$file"
            echo "# Link Band SDK" >> "$file"
            echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$file"
            echo "Added to $file"
        else
            echo "Already in $file"
        fi
    fi
}

add_to_path "$BASHRC"
add_to_path "$PROFILE"

# Update current session PATH
export PATH="$PATH:$INSTALL_DIR"

echo -e "${GREEN} Added to PATH${NC}"
echo ""

# Create launch script
echo -e "${BLUE} Creating launch script...${NC}"
LAUNCH_SCRIPT="$INSTALL_DIR/linkband-start"

cat > "$LAUNCH_SCRIPT" << 'EOF'
#!/bin/bash
# Link Band SDK Launcher

echo "Starting Link Band SDK..."
echo "Starting Python backend server..."
linkband-server &
SERVER_PID=$!

sleep 3

echo "Starting Link Band SDK application..."
LinkBandSDK.AppImage &

echo "Link Band SDK started successfully!"
echo "Server PID: $SERVER_PID"
echo ""
echo "To stop the server, run: kill $SERVER_PID"
EOF

chmod +x "$LAUNCH_SCRIPT"
echo -e "${GREEN} Launch script created at $LAUNCH_SCRIPT${NC}"
echo ""

# Create desktop entry
echo -e "${BLUE}🖥️  Creating desktop entry...${NC}"
DESKTOP_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$DESKTOP_DIR/linkband-sdk.desktop"

if [[ ! -d "$DESKTOP_DIR" ]]; then
    mkdir -p "$DESKTOP_DIR"
fi

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=Link Band SDK
Comment=Link Band SDK Application
Exec=$LAUNCH_SCRIPT
Icon=application-x-executable
Terminal=false
Type=Application
Categories=Development;Science;
StartupNotify=true
EOF

chmod +x "$DESKTOP_FILE"
echo -e "${GREEN} Desktop entry created${NC}"
echo ""

# Installation complete
echo -e "${GREEN} Installation completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 How to use:${NC}"
echo "   1. Search for 'Link Band SDK' in your application menu"
echo "   2. Or run 'linkband-start' in terminal"
echo "   3. Or start them separately:"
echo "      - Backend: 'linkband-server'"
echo "      - Frontend: 'LinkBandSDK.AppImage'"
echo ""
echo -e "${BLUE}📁 Installed components:${NC}"
echo "   - Application: $APP_TARGET"
echo "   - Backend Server: $SERVER_TARGET"
echo "   - Launch Script: $LAUNCH_SCRIPT"
echo "   - Desktop Entry: $DESKTOP_FILE"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   - Restart your terminal or run 'source ~/.bashrc' to update PATH"
echo "   - You can now start using Link Band SDK!"
echo ""

echo "Press any key to finish..."
read -n 1 -s 