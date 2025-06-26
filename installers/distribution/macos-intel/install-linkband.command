#!/bin/bash

# Link Band SDK Installer for macOS (Intel)
# Double-click to install

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
echo -e "${BLUE}    Link Band SDK Installer for macOS${NC}"
echo -e "${BLUE}           (Intel / x86_64)${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if running on Intel Mac
ARCH=$(uname -m)
if [[ "$ARCH" != "x86_64" ]]; then
    echo -e "${RED}❌ Error: This installer is for Intel Macs (x86_64)${NC}"
    echo -e "${YELLOW}   Please download the Apple Silicon version if you have an M1/M2/M3 Mac${NC}"
    echo ""
    read -p "Press any key to exit..."
    exit 1
fi

echo -e "${GREEN}✅ Detected Intel Mac${NC}"
echo ""

# Check for required files
DMG_FILE="$SCRIPT_DIR/LinkBandSDK.dmg"
SERVER_FILE="$SCRIPT_DIR/linkband-server-macos-x64"

if [[ ! -f "$DMG_FILE" ]]; then
    echo -e "${RED}❌ Error: LinkBandSDK.dmg not found${NC}"
    echo -e "${YELLOW}   Please ensure all files are in the same folder${NC}"
    echo ""
    read -p "Press any key to exit..."
    exit 1
fi

if [[ ! -f "$SERVER_FILE" ]]; then
    echo -e "${RED}❌ Error: linkband-server-macos-x64 not found${NC}"
    echo -e "${YELLOW}   Please ensure all files are in the same folder${NC}"
    echo ""
    read -p "Press any key to exit..."
    exit 1
fi

echo -e "${GREEN}✅ All required files found${NC}"
echo ""

# Install Electron app
echo -e "${BLUE}📱 Installing Link Band SDK Application...${NC}"
echo "Mounting DMG file..."

# Store volumes before mounting
VOLUMES_BEFORE=$(ls /Volumes/)

# Mount the DMG
MOUNT_OUTPUT=$(hdiutil attach "$DMG_FILE" 2>&1)
MOUNT_EXIT_CODE=$?

if [[ $MOUNT_EXIT_CODE -ne 0 ]]; then
    echo -e "${RED}❌ Failed to mount DMG file${NC}"
    echo "Error output: $MOUNT_OUTPUT"
    echo ""
    read -p "Press any key to exit..."
    exit 1
fi

# Find the newly mounted volume
VOLUMES_AFTER=$(ls /Volumes/)
NEW_VOLUME=$(comm -13 <(echo "$VOLUMES_BEFORE" | sort) <(echo "$VOLUMES_AFTER" | sort) | head -1)

if [[ -z "$NEW_VOLUME" ]]; then
    # Fallback: look for Link-related volumes
    NEW_VOLUME=$(ls /Volumes/ | grep -i "link" | head -1)
fi

if [[ -z "$NEW_VOLUME" ]]; then
    echo -e "${RED}❌ Could not find mounted volume${NC}"
    echo "Available volumes:"
    ls -la /Volumes/
    echo ""
    read -p "Press any key to exit..."
    exit 1
fi

MOUNT_POINT="/Volumes/$NEW_VOLUME"
echo "Mounted at: $MOUNT_POINT"
echo "Copying application to /Applications..."

# Find the .app file in the mounted volume
APP_FILE=$(find "$MOUNT_POINT" -name "*.app" -maxdepth 1 | head -1)

if [[ -z "$APP_FILE" ]]; then
    echo -e "${RED}❌ No .app file found in DMG${NC}"
    hdiutil detach "$MOUNT_POINT" 2>/dev/null
    echo ""
    read -p "Press any key to exit..."
    exit 1
fi

echo "Found app: $(basename "$APP_FILE")"

if sudo cp -R "$APP_FILE" /Applications/; then
    echo -e "${GREEN}✅ Application installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install application${NC}"
    hdiutil detach "$MOUNT_POINT" 2>/dev/null
    echo ""
    read -p "Press any key to exit..."
    exit 1
fi

# Unmount DMG
echo "Unmounting DMG..."
hdiutil detach "$MOUNT_POINT" 2>/dev/null
echo ""

# Install Python backend server
echo -e "${BLUE}🐍 Installing Python Backend Server...${NC}"
INSTALL_DIR="/usr/local/bin"
TARGET_FILE="$INSTALL_DIR/linkband-server"

echo "Copying server to $INSTALL_DIR..."
if sudo cp "$SERVER_FILE" "$TARGET_FILE"; then
    sudo chmod +x "$TARGET_FILE"
    echo -e "${GREEN}✅ Python backend server installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install Python backend server${NC}"
    echo ""
    read -p "Press any key to exit..."
    exit 1
fi

echo ""

# Create launch script
echo -e "${BLUE}🚀 Creating launch script...${NC}"
LAUNCH_SCRIPT="/usr/local/bin/linkband-start"

sudo tee "$LAUNCH_SCRIPT" > /dev/null << 'EOF'
#!/bin/bash
# Link Band SDK Launcher

echo "Starting Link Band SDK..."
echo "Starting Python backend server..."
linkband-server &
SERVER_PID=$!

sleep 3

echo "Starting Link Band SDK application..."
open -a "Link Band SDK"

echo "Link Band SDK started successfully!"
echo "Server PID: $SERVER_PID"
echo ""
echo "To stop the server, run: kill $SERVER_PID"
EOF

sudo chmod +x "$LAUNCH_SCRIPT"
echo -e "${GREEN}✅ Launch script created at $LAUNCH_SCRIPT${NC}"
echo ""

# Installation complete
echo -e "${GREEN}🎉 Installation completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 How to use:${NC}"
echo "   1. Run 'linkband-start' in Terminal to start both services"
echo "   2. Or start them separately:"
echo "      - Backend: 'linkband-server'"
echo "      - Frontend: Open 'Link Band SDK' from Applications"
echo ""
echo -e "${BLUE}📁 Installed components:${NC}"
echo "   - Application: /Applications/Link Band SDK.app"
echo "   - Backend Server: /usr/local/bin/linkband-server"
echo "   - Launch Script: /usr/local/bin/linkband-start"
echo ""
echo -e "${YELLOW}💡 Tip: You can now close this window and start using Link Band SDK!${NC}"
echo ""

read -p "Press any key to finish..." 