#!/bin/bash

# Link Band SDK Master Installer for Linux
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
    echo -e "${BLUE}                        for Linux${NC}"
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

# Detect Linux distribution
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

# Detect architecture
detect_arch() {
    local arch=$(uname -m)
    case $arch in
        x86_64)
            echo "x64"
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

# Install Python
install_python() {
    echo "Installing Python..."
    local distro=$(detect_distro)
    
    case $distro in
        ubuntu|debian)
            sudo apt update
            sudo apt install -y python3 python3-pip python3-venv
            ;;
        fedora)
            sudo dnf install -y python3 python3-pip
            ;;
        rhel|centos)
            sudo yum install -y python3 python3-pip
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm python python-pip
            ;;
        opensuse*)
            sudo zypper install -y python3 python3-pip
            ;;
        *)
            print_error "Unsupported distribution: $distro"
            echo "Please install Python 3.9+ manually"
            return 1
            ;;
    esac
    
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
    
    # Install system dependencies first
    local distro=$(detect_distro)
    echo "Installing system dependencies..."
    
    case $distro in
        ubuntu|debian)
            sudo apt install -y build-essential libffi-dev libssl-dev
            ;;
        fedora)
            sudo dnf groupinstall -y "Development Tools"
            sudo dnf install -y libffi-devel openssl-devel
            ;;
        rhel|centos)
            sudo yum groupinstall -y "Development Tools"
            sudo yum install -y libffi-devel openssl-devel
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm base-devel libffi openssl
            ;;
        opensuse*)
            sudo zypper install -y -t pattern devel_basis
            sudo zypper install -y libffi-devel libopenssl-devel
            ;;
    esac
    
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
    local appimage_name=""
    
    if [[ "$arch" == "arm64" ]]; then
        appimage_name="Link Band SDK-$SDK_VERSION-arm64.AppImage"
    else
        appimage_name="Link Band SDK-$SDK_VERSION.AppImage"
    fi
    
    # Try to find local AppImage first
    local local_appimage="$INSTALLER_DIR/$appimage_name"
    if [[ -f "$local_appimage" ]]; then
        echo "Found local installer: $local_appimage"
        SDK_APPIMAGE="$local_appimage"
    else
        # Download from GitHub releases
        local release_url="https://github.com/$GITHUB_REPO/releases/latest/download/$appimage_name"
        SDK_APPIMAGE="$DOWNLOADS_DIR/$appimage_name"
        
        echo "Downloading from GitHub releases..."
        if curl -fL "$release_url" -o "$SDK_APPIMAGE"; then
            print_success "Download completed"
        else
            print_error "Failed to download SDK installer"
            echo
            echo "Please try one of the following:"
            echo "  1. Check your internet connection"
            echo "  2. Download manually from: https://github.com/$GITHUB_REPO/releases"
            echo "  3. Place the AppImage file in: $INSTALLER_DIR"
            echo
            exit 1
        fi
    fi
    
    if [[ ! -f "$SDK_APPIMAGE" ]]; then
        print_error "SDK installer not found"
        exit 1
    fi
}

# Install SDK
install_sdk() {
    print_step "4" "Installing Link Band SDK..."
    
    # Make AppImage executable
    chmod +x "$SDK_APPIMAGE"
    
    # Create application directory
    local app_dir="$HOME/.local/share/applications"
    local bin_dir="$HOME/.local/bin"
    
    mkdir -p "$app_dir"
    mkdir -p "$bin_dir"
    
    # Copy AppImage to local bin
    local installed_appimage="$bin_dir/link-band-sdk"
    cp "$SDK_APPIMAGE" "$installed_appimage"
    chmod +x "$installed_appimage"
    
    # Create desktop entry
    cat > "$app_dir/link-band-sdk.desktop" << EOF
[Desktop Entry]
Name=Link Band SDK
Comment=Link Band SDK for EEG data processing
Exec=$installed_appimage
Icon=link-band-sdk
Type=Application
Categories=Science;Education;
StartupWMClass=Link Band SDK
EOF
    
    # Create launcher script
    cat > "$bin_dir/link-band-sdk-launcher" << EOF
#!/bin/bash
cd "\$HOME"
exec "$installed_appimage" "\$@"
EOF
    chmod +x "$bin_dir/link-band-sdk-launcher"
    
    # Update desktop database
    if command -v update-desktop-database &> /dev/null; then
        update-desktop-database "$app_dir"
    fi
    
    print_success "Link Band SDK installed successfully"
}

# Create shortcuts and finish
finalize_installation() {
    print_step "5" "Finalizing installation..."
    
    local installed_appimage="$HOME/.local/bin/link-band-sdk"
    
    if [[ -f "$installed_appimage" ]]; then
        # Create desktop shortcut
        if [[ -d "$HOME/Desktop" ]]; then
            cp "$HOME/.local/share/applications/link-band-sdk.desktop" "$HOME/Desktop/"
            chmod +x "$HOME/Desktop/link-band-sdk.desktop"
            print_success "Desktop shortcut created"
        fi
        
        # Add to PATH if not already there
        if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.profile"
            print_success "Added to PATH (restart terminal to take effect)"
        fi
        
        APP_PATH="$installed_appimage"
    else
        print_warning "Could not locate installed application"
    fi
    
    # Create uninstaller
    cat > "$INSTALLER_DIR/Uninstall-Linux.sh" << 'EOF'
#!/bin/bash
echo "Uninstalling Link Band SDK..."
rm -f "$HOME/.local/bin/link-band-sdk"
rm -f "$HOME/.local/bin/link-band-sdk-launcher"
rm -f "$HOME/.local/share/applications/link-band-sdk.desktop"
rm -f "$HOME/Desktop/link-band-sdk.desktop"

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$HOME/.local/share/applications"
fi

echo "Link Band SDK has been uninstalled."
echo "Press any key to continue..."
read -n 1
EOF
    chmod +x "$INSTALLER_DIR/Uninstall-Linux.sh"
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
    
    echo "Detected distribution: $(detect_distro)"
    echo "Detected architecture: $(detect_arch)"
    echo
    
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
    echo "  • Applications menu: Link Band SDK"
    echo "  • Desktop shortcut: link-band-sdk"
    echo "  • Terminal: link-band-sdk"
    echo "  • File manager: Double-click the AppImage"
    echo
    echo "To uninstall: Run Uninstall-Linux.sh in this folder"
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
            "$APP_PATH" &
        else
            echo "Application not found. Please launch manually from Applications menu."
        fi
    fi
    
    echo
    echo "Installation log saved to: $INSTALLER_DIR/install.log"
    echo "Thank you for using Link Band SDK!"
    echo
}

# Run main function and log output
main 2>&1 | tee "$INSTALLER_DIR/install.log" 