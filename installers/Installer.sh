#!/bin/bash

# Link Band SDK Master Installer for macOS
# Copyright (c) 2025 Looxid Labs

set -e

# Configuration
PYTHON_MIN_VERSION="3.9"
SDK_VERSION="1.0.0"
GITHUB_REPO="LooxidLabs/link_band_sdk"
SDK_NAME="Link Band SDK"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOWNLOADS_DIR="$INSTALLER_DIR/downloads"
SCRIPTS_DIR="$INSTALLER_DIR/scripts"

# Create directories
mkdir -p "$DOWNLOADS_DIR"
mkdir -p "$SCRIPTS_DIR"

# Helper functions
print_header() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}                   Link Band SDK Installer v1.0.0${NC}"
    echo -e "${BLUE}                        for macOS${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo
}

print_step() {
    echo -e "${YELLOW}[$1/5] $2${NC}"
}

print_success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This installer should not be run as root"
        echo "Please run as a regular user:"
        echo "  ./Installer.sh"
        exit 1
    fi
}

# Detect architecture
detect_arch() {
    local arch=$(uname -m)
    case $arch in
        x86_64)
            echo "intel"
            ;;
        arm64|aarch64)
            echo "arm64"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Check Python installation
check_python() {
    print_step "1" "Checking Python installation..."
    
    if command -v python3 &> /dev/null; then
        local python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
        print_success "Python $python_version found"
        
        # Check version
        local major=$(echo $python_version | cut -d'.' -f1)
        local minor=$(echo $python_version | cut -d'.' -f2)
        
        if [[ $major -ge 3 && $minor -ge 9 ]]; then
            return 0
        else
            print_error "Python $python_version is too old. Minimum required: $PYTHON_MIN_VERSION"
            return 1
        fi
    else
        print_error "Python 3 is not installed"
        return 1
    fi
}

# Install Python via Homebrew
install_python() {
    echo "Installing Python..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -f "/usr/local/bin/brew" ]]; then
            echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.bash_profile
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi
    
    # Install Python
    brew install python@3.11
    
    # Verify installation
    if command -v python3 &> /dev/null; then
        print_success "Python installed successfully"
        return 0
    else
        print_error "Python installation failed"
        return 1
    fi
}

# Install Python dependencies
install_dependencies() {
    print_step "2" "Installing Python dependencies..."
    echo "This may take a few minutes..."
    
    # Check if requirements file exists locally
    local req_file="$INSTALLER_DIR/requirements.txt"
    if [[ ! -f "$req_file" ]]; then
        echo "Downloading requirements file..."
        curl -fsSL "https://raw.githubusercontent.com/$GITHUB_REPO/main/requirements.txt" -o "$req_file"
    fi
    
    if [[ -f "$req_file" ]]; then
        echo "Installing from requirements.txt..."
        python3 -m pip install --user -r "$req_file"
    else
        echo "Installing essential packages..."
        python3 -m pip install --user numpy scipy matplotlib mne heartpy fastapi uvicorn websockets psutil
    fi
    
    print_success "Python dependencies processed"
}

# Download SDK
download_sdk() {
    print_step "3" "Downloading Link Band SDK..."
    
    local arch=$(detect_arch)
    local dmg_name=""
    
    if [[ "$arch" == "arm64" ]]; then
        dmg_name="Link Band SDK-$SDK_VERSION-arm64.dmg"
    else
        dmg_name="Link Band SDK-$SDK_VERSION.dmg"
    fi
    
    # Try to find local DMG first
    local local_dmg="$INSTALLER_DIR/$dmg_name"
    if [[ -f "$local_dmg" ]]; then
        echo "Found local installer: $local_dmg"
        SDK_DMG="$local_dmg"
    else
        # Download from GitHub releases
        local release_url="https://github.com/$GITHUB_REPO/releases/latest/download/$dmg_name"
        SDK_DMG="$DOWNLOADS_DIR/$dmg_name"
        
        echo "Downloading from GitHub releases..."
        if curl -fL "$release_url" -o "$SDK_DMG"; then
            print_success "Download completed"
        else
            print_error "Failed to download SDK installer"
            echo
            echo "Please try one of the following:"
            echo "  1. Check your internet connection"
            echo "  2. Download manually from: https://github.com/$GITHUB_REPO/releases"
            echo "  3. Place the DMG file in: $INSTALLER_DIR"
            echo
            exit 1
        fi
    fi
    
    if [[ ! -f "$SDK_DMG" ]]; then
        print_error "SDK installer not found"
        exit 1
    fi
}

# Install SDK
install_sdk() {
    print_step "4" "Installing Link Band SDK..."
    
    echo "Mounting DMG: $SDK_DMG"
    local mount_point=$(hdiutil attach "$SDK_DMG" | grep "/Volumes" | cut -f3)
    
    if [[ -z "$mount_point" ]]; then
        print_error "Failed to mount DMG"
        exit 1
    fi
    
    echo "Mounted at: $mount_point"
    
    # Find the .app bundle
    local app_bundle=$(find "$mount_point" -name "*.app" -type d | head -1)
    
    if [[ -z "$app_bundle" ]]; then
        print_error "No .app bundle found in DMG"
        hdiutil detach "$mount_point"
        exit 1
    fi
    
    # Copy to Applications
    echo "Installing to /Applications..."
    cp -R "$app_bundle" /Applications/
    
    # Unmount DMG
    hdiutil detach "$mount_point"
    
    print_success "Link Band SDK installed successfully"
}

# Create shortcuts and finish
finalize_installation() {
    print_step "5" "Finalizing installation..."
    
    local app_path="/Applications/Link Band SDK.app"
    
    if [[ -d "$app_path" ]]; then
        # Create desktop shortcut (alias)
        if [[ -d "$HOME/Desktop" ]]; then
            ln -sf "$app_path" "$HOME/Desktop/Link Band SDK.app"
            print_success "Desktop shortcut created"
        fi
        
        # Create dock shortcut
        defaults write com.apple.dock persistent-apps -array-add "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>$app_path</string><key>_CFURLStringType</key><integer>0</integer></dict></dict></dict>"
        killall Dock 2>/dev/null || true
        
        APP_PATH="$app_path"
    else
        print_warning "Could not locate installed application"
    fi
    
    # Create uninstaller
    cat > "$INSTALLER_DIR/Uninstall.sh" << 'EOF'
#!/bin/bash
echo "Uninstalling Link Band SDK..."
if [[ -d "/Applications/Link Band SDK.app" ]]; then
    rm -rf "/Applications/Link Band SDK.app"
    rm -f "$HOME/Desktop/Link Band SDK.app"
    echo "Link Band SDK has been uninstalled."
else
    echo "Link Band SDK not found in Applications folder."
fi
echo "Press any key to continue..."
read -n 1
EOF
    chmod +x "$INSTALLER_DIR/Uninstall.sh"
}

# Main installation function
main() {
    print_header
    
    echo "This installer will:"
    echo "  1. Check Python installation"
    echo "  2. Install Python dependencies"
    echo "  3. Download and install Link Band SDK"
    echo "  4. Create shortcuts"
    echo
    
    check_root
    
    echo "Starting installation..."
    echo
    
    # Step 1: Check/Install Python
    if ! check_python; then
        echo "Would you like to install Python now? (y/N): "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            if ! install_python; then
                print_error "Python installation failed"
                exit 1
            fi
        else
            print_error "Python is required for Link Band SDK"
            exit 1
        fi
    fi
    
    # Step 2: Install dependencies
    install_dependencies
    echo
    
    # Step 3: Download SDK
    download_sdk
    echo
    
    # Step 4: Install SDK
    install_sdk
    echo
    
    # Step 5: Finalize
    finalize_installation
    echo
    
    # Installation complete
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}                    Installation Complete!${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo
    echo "Link Band SDK has been successfully installed!"
    echo
    echo "You can now launch it from:"
    echo "  • Applications folder: Link Band SDK"
    echo "  • Desktop shortcut: Link Band SDK"
    echo "  • Spotlight: Search for 'Link Band SDK'"
    echo "  • Dock (if added)"
    echo
    echo "To uninstall: Run Uninstall.sh in this folder"
    echo
    echo "For support and documentation:"
    echo "  https://github.com/$GITHUB_REPO"
    echo
    
    # Optional: Launch the app
    echo -n "Would you like to launch Link Band SDK now? (y/N): "
    read -r launch_response
    if [[ "$launch_response" =~ ^[Yy]$ ]]; then
        if [[ -n "$APP_PATH" ]]; then
            echo "Launching Link Band SDK..."
            open "$APP_PATH"
        else
            echo "Application not found. Please launch manually from Applications folder."
        fi
    fi
    
    echo
    echo "Installation log saved to: $INSTALLER_DIR/install.log"
    echo "Thank you for using Link Band SDK!"
    echo
}

# Run main function and log output
main 2>&1 | tee "$INSTALLER_DIR/install.log" 