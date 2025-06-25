#!/bin/bash

# Build and Release Script for Link Band SDK
# Usage: ./scripts/build-and-release.sh [version]

set -e

# Configuration
VERSION=${1:-"v1.0.0"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}                Link Band SDK Build & Release${NC}"
    echo -e "${BLUE}                        Version: $VERSION${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo
}

print_step() {
    echo -e "${YELLOW}[$1] $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check requirements
check_requirements() {
    print_step "1" "Checking requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    
    # Check GitHub token
    if [[ -z "$GITHUB_TOKEN" ]]; then
        print_error "GITHUB_TOKEN environment variable is not set"
        echo "Please set your GitHub Personal Access Token:"
        echo "export GITHUB_TOKEN=your_token_here"
        exit 1
    fi
    
    print_success "All requirements satisfied"
}

# Install dependencies
install_dependencies() {
    print_step "2" "Installing dependencies..."
    
    # Install Python dependencies
    echo "Installing Python dependencies..."
    cd "$PROJECT_ROOT/python_core"
    pip3 install -r requirements.txt
    
    # Install Node.js dependencies
    echo "Installing Node.js dependencies..."
    cd "$PROJECT_ROOT/electron-app"
    npm ci
    
    print_success "Dependencies installed"
}

# Build application
build_application() {
    print_step "3" "Building application..."
    
    cd "$PROJECT_ROOT/electron-app"
    
    # Clean previous builds
    if [[ -d "release" ]]; then
        rm -rf release
    fi
    
    # Detect platform and build accordingly
    local platform=$(uname -s)
    
    case $platform in
        Darwin)
            echo "Building for macOS..."
            npm run electron:build:mac
            ;;
        Linux)
            echo "Building for Linux..."
            npm run electron:build:linux
            ;;
        MINGW*|CYGWIN*|MSYS*)
            echo "Building for Windows..."
            npm run electron:build:win
            ;;
        *)
            echo "Building for all platforms..."
            npm run electron:build
            ;;
    esac
    
    print_success "Build completed"
}

# Create GitHub release
create_release() {
    print_step "4" "Creating GitHub release..."
    
    cd "$PROJECT_ROOT"
    
    # Make sure the script is executable
    chmod +x "$SCRIPT_DIR/create-release.js"
    
    # Run the release script
    node "$SCRIPT_DIR/create-release.js" "$VERSION"
    
    print_success "Release created successfully"
}

# Update installer scripts
update_installers() {
    print_step "5" "Updating installer scripts..."
    
    # Update version in installer scripts
    local version_number=${VERSION#v}  # Remove 'v' prefix
    
    # Update Windows installer
    if [[ -f "$PROJECT_ROOT/installers/Installer.bat" ]]; then
        sed -i.bak "s/set SDK_VERSION=.*/set SDK_VERSION=$version_number/" "$PROJECT_ROOT/installers/Installer.bat"
        rm -f "$PROJECT_ROOT/installers/Installer.bat.bak"
    fi
    
    # Update macOS installer
    if [[ -f "$PROJECT_ROOT/installers/Installer.sh" ]]; then
        sed -i.bak "s/SDK_VERSION=.*/SDK_VERSION=\"$version_number\"/" "$PROJECT_ROOT/installers/Installer.sh"
        rm -f "$PROJECT_ROOT/installers/Installer.sh.bak"
    fi
    
    # Update Linux installer
    if [[ -f "$PROJECT_ROOT/installers/Installer-Linux.sh" ]]; then
        sed -i.bak "s/SDK_VERSION=.*/SDK_VERSION=\"$version_number\"/" "$PROJECT_ROOT/installers/Installer-Linux.sh"
        rm -f "$PROJECT_ROOT/installers/Installer-Linux.sh.bak"
    fi
    
    print_success "Installer scripts updated"
}

# Main function
main() {
    print_header
    
    echo "This script will:"
    echo "  1. Check requirements"
    echo "  2. Install dependencies"
    echo "  3. Build the application"
    echo "  4. Create GitHub release"
    echo "  5. Update installer scripts"
    echo
    
    # Confirm before proceeding
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    # Execute steps
    check_requirements
    echo
    
    install_dependencies
    echo
    
    build_application
    echo
    
    create_release
    echo
    
    update_installers
    echo
    
    # Final message
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}                    Build & Release Complete!${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo
    echo "🎉 Link Band SDK $VERSION has been built and released!"
    echo
    echo "📦 Release URL: https://github.com/LooxidLabs/link_band_sdk/releases/tag/$VERSION"
    echo "📋 Installer scripts updated with new version"
    echo
    echo "Next steps:"
    echo "  1. Test the installers"
    echo "  2. Update documentation if needed"
    echo "  3. Announce the release"
    echo
}

# Run main function
main "$@" 