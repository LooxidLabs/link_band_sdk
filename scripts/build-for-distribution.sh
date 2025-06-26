#!/bin/bash

# Build Link Band SDK for Distribution
# This script builds all platform-specific installers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INSTALLERS_DIR="$PROJECT_ROOT/installers"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    Link Band SDK Distribution Builder${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if we're in the right directory
if [[ ! -f "$PROJECT_ROOT/electron-app/package.json" ]]; then
    echo -e "${RED}❌ Error: Not in project root directory${NC}"
    echo "Please run this script from the project root"
    echo "Looking for: $PROJECT_ROOT/electron-app/package.json"
    exit 1
fi

echo -e "${GREEN}✅ Project root found: $PROJECT_ROOT${NC}"
echo ""

# Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
rm -rf "$PROJECT_ROOT/electron-app/dist"
rm -rf "$PROJECT_ROOT/electron-app/dist-electron"
rm -rf "$PROJECT_ROOT/python_core/dist"
rm -rf "$PROJECT_ROOT/python_core/build"

# Clean installer directories (keep scripts and README)
for platform in mac-arm64 mac-intel windows linux; do
    if [[ -d "$INSTALLERS_DIR/$platform" ]]; then
        find "$INSTALLERS_DIR/$platform" -type f ! -name "install-*" ! -name "README.md" -delete
    fi
done

echo -e "${GREEN}✅ Cleaned previous builds${NC}"
echo ""

# Build Electron app for all platforms
echo -e "${BLUE}📱 Building Electron applications...${NC}"
cd "$PROJECT_ROOT/electron-app"

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Build for macOS (universal - includes both Intel and ARM64)
echo "Building for macOS..."
npm run electron:build:mac

# Build for Windows
echo "Building for Windows..."
npm run electron:build:win

# Build for Linux
echo "Building for Linux..."
npm run electron:build:linux

echo -e "${GREEN}✅ Electron applications built${NC}"
echo ""

# Build Python backend server
echo -e "${BLUE}🐍 Building Python backend server...${NC}"
cd "$PROJECT_ROOT/python_core"

# Check if PyInstaller is available
if ! command -v pyinstaller >/dev/null 2>&1; then
    echo "Installing PyInstaller..."
    pip install pyinstaller
fi

# Build for current platform (you'll need to run this on each target platform)
echo "Building Python backend for current platform..."
pyinstaller server.spec --clean

echo -e "${GREEN}✅ Python backend server built${NC}"
echo ""

# Copy files to installer directories
echo -e "${BLUE}📦 Organizing distribution files...${NC}"

# macOS files
if [[ -d "$PROJECT_ROOT/electron-app/release" ]]; then
    echo "Copying macOS files..."
    
    # Find DMG files (latest version)
    ARM_DMG_FILE=$(find "$PROJECT_ROOT/electron-app/release" -name "*arm64.dmg" | sort -V | tail -1)
    INTEL_DMG_FILE=$(find "$PROJECT_ROOT/electron-app/release" -name "*.dmg" ! -name "*arm64.dmg" | sort -V | tail -1)
    
    if [[ -n "$ARM_DMG_FILE" ]]; then
        cp "$ARM_DMG_FILE" "$INSTALLERS_DIR/mac-arm64/LinkBandSDK.dmg"
        echo "  ✅ ARM64 DMG file copied"
    else
        echo -e "${YELLOW}  ⚠️  Warning: ARM64 DMG file not found${NC}"
    fi
    
    if [[ -n "$INTEL_DMG_FILE" ]]; then
        cp "$INTEL_DMG_FILE" "$INSTALLERS_DIR/mac-intel/LinkBandSDK.dmg"
        echo "  ✅ Intel DMG file copied"
    else
        echo -e "${YELLOW}  ⚠️  Warning: Intel DMG file not found${NC}"
    fi
    
    # Code sign the installation scripts with Developer ID
    echo "  🔐 Signing installation scripts..."
    DEVELOPER_ID="Developer ID Application: Looxid Labs Inc. (XJDDLS7BEH)"
    
    if codesign --sign "$DEVELOPER_ID" --force --options runtime "$INSTALLERS_DIR/mac-arm64/install-linkband.command" 2>/dev/null; then
        echo "  ✅ ARM64 installation script signed"
    else
        echo -e "${YELLOW}  ⚠️  Warning: Failed to sign ARM64 installation script${NC}"
    fi
    
    if codesign --sign "$DEVELOPER_ID" --force --options runtime "$INSTALLERS_DIR/mac-intel/install-linkband.command" 2>/dev/null; then
        echo "  ✅ Intel installation script signed"
    else
        echo -e "${YELLOW}  ⚠️  Warning: Failed to sign Intel installation script${NC}"
    fi
fi

# Windows files
if [[ -d "$PROJECT_ROOT/electron-app/release" ]]; then
    echo "Copying Windows files..."
    
    # Find EXE installer (Setup file)
    EXE_FILE=$(find "$PROJECT_ROOT/electron-app/release" -name "*Setup*.exe" | sort -V | tail -1)
    if [[ -n "$EXE_FILE" ]]; then
        cp "$EXE_FILE" "$INSTALLERS_DIR/windows/LinkBandSDK-Setup.exe"
        echo "  ✅ EXE installer copied"
    else
        echo -e "${YELLOW}  ⚠️  Warning: EXE installer not found${NC}"
    fi
fi

# Linux files
if [[ -d "$PROJECT_ROOT/electron-app/release" ]]; then
    echo "Copying Linux files..."
    
    # Find AppImage (latest version)
    APPIMAGE_FILE=$(find "$PROJECT_ROOT/electron-app/release" -name "*.AppImage" | sort -V | tail -1)
    if [[ -n "$APPIMAGE_FILE" ]]; then
        cp "$APPIMAGE_FILE" "$INSTALLERS_DIR/linux/LinkBandSDK.AppImage"
        chmod +x "$INSTALLERS_DIR/linux/LinkBandSDK.AppImage"
        echo "  ✅ AppImage copied"
    else
        echo -e "${YELLOW}  ⚠️  Warning: AppImage not found${NC}"
    fi
fi

# Python backend files
if [[ -d "$PROJECT_ROOT/python_core/dist" ]]; then
    echo "Copying Python backend files..."
    
    # Find server executable (linkband-server)
    SERVER_EXEC=$(find "$PROJECT_ROOT/python_core/dist" -name "linkband-server*" -type f | head -1)
    if [[ -n "$SERVER_EXEC" ]]; then
        # Determine current platform
        CURRENT_OS=$(uname -s)
        CURRENT_ARCH=$(uname -m)
        
        case "$CURRENT_OS" in
            Darwin)
                if [[ "$CURRENT_ARCH" == "arm64" ]]; then
                    cp "$SERVER_EXEC" "$INSTALLERS_DIR/mac-arm64/linkband-server-macos-arm64"
                    chmod +x "$INSTALLERS_DIR/mac-arm64/linkband-server-macos-arm64"
                    echo "  ✅ macOS ARM64 server copied"
                    # Also copy to Intel for universal compatibility
                    cp "$SERVER_EXEC" "$INSTALLERS_DIR/mac-intel/linkband-server-macos-x64"
                    chmod +x "$INSTALLERS_DIR/mac-intel/linkband-server-macos-x64"
                    echo "  ✅ macOS Intel server copied (universal binary)"
                    
                    # Code sign the Python backend servers
                    echo "  🔐 Signing Python backend servers..."
                    DEVELOPER_ID="Developer ID Application: Looxid Labs Inc. (XJDDLS7BEH)"
                    
                    if codesign --sign "$DEVELOPER_ID" --force --options runtime "$INSTALLERS_DIR/mac-arm64/linkband-server-macos-arm64" 2>/dev/null; then
                        echo "  ✅ ARM64 Python server signed"
                    else
                        echo -e "${YELLOW}  ⚠️  Warning: Failed to sign ARM64 Python server${NC}"
                    fi
                    
                    if codesign --sign "$DEVELOPER_ID" --force --options runtime "$INSTALLERS_DIR/mac-intel/linkband-server-macos-x64" 2>/dev/null; then
                        echo "  ✅ Intel Python server signed"
                    else
                        echo -e "${YELLOW}  ⚠️  Warning: Failed to sign Intel Python server${NC}"
                    fi
                else
                    cp "$SERVER_EXEC" "$INSTALLERS_DIR/mac-intel/linkband-server-macos-x64"
                    chmod +x "$INSTALLERS_DIR/mac-intel/linkband-server-macos-x64"
                    echo "  ✅ macOS Intel server copied"
                    
                    # Code sign the Python backend server
                    echo "  🔐 Signing Python backend server..."
                    DEVELOPER_ID="Developer ID Application: Looxid Labs Inc. (XJDDLS7BEH)"
                    
                    if codesign --sign "$DEVELOPER_ID" --force --options runtime "$INSTALLERS_DIR/mac-intel/linkband-server-macos-x64" 2>/dev/null; then
                        echo "  ✅ Intel Python server signed"
                    else
                        echo -e "${YELLOW}  ⚠️  Warning: Failed to sign Intel Python server${NC}"
                    fi
                fi
                ;;
            Linux)
                cp "$SERVER_EXEC" "$INSTALLERS_DIR/linux/linkband-server-linux"
                chmod +x "$INSTALLERS_DIR/linux/linkband-server-linux"
                echo "  ✅ Linux server copied"
                ;;
            MINGW*|CYGWIN*)
                cp "$SERVER_EXEC" "$INSTALLERS_DIR/windows/linkband-server-windows.exe"
                echo "  ✅ Windows server copied"
                ;;
            *)
                echo -e "${YELLOW}  ⚠️  Warning: Cannot build Windows server on this platform${NC}"
                echo -e "${YELLOW}     To build Windows server:${NC}"
                echo -e "${YELLOW}     1. Run this script on a Windows machine${NC}"
                echo -e "${YELLOW}     2. Or use: ./scripts/build-cross-platform.sh${NC}"
                ;;
        esac
    else
        echo -e "${YELLOW}  ⚠️  Warning: Python server executable not found${NC}"
    fi
fi

# Check for missing platform servers and provide guidance
echo
echo -e "${BLUE}📋 Platform Server Status:${NC}"

if [[ ! -f "$INSTALLERS_DIR/windows/linkband-server-windows.exe" ]]; then
    echo -e "${RED}❌ Windows server: MISSING${NC}"
    echo -e "${YELLOW}   To build Windows server:${NC}"
    echo -e "${YELLOW}   • On Windows: Run this script${NC}"
    echo -e "${YELLOW}   • On macOS/Linux: Run ./scripts/build-cross-platform.sh${NC}"
    echo -e "${YELLOW}   • Manual: Use PyInstaller on Windows${NC}"
else
    echo -e "${GREEN}✅ Windows server: Available${NC}"
fi

if [[ ! -f "$INSTALLERS_DIR/linux/linkband-server-linux" ]]; then
    echo -e "${RED}❌ Linux server: MISSING${NC}"
    echo -e "${YELLOW}   To build: Run ./scripts/build-cross-platform.sh${NC}"
else
    echo -e "${GREEN}✅ Linux server: Available${NC}"
fi

if [[ -f "$INSTALLERS_DIR/mac-arm64/linkband-server-macos-arm64" ]]; then
    echo -e "${GREEN}✅ macOS ARM64 server: Available${NC}"
else
    echo -e "${RED}❌ macOS ARM64 server: MISSING${NC}"
fi

if [[ -f "$INSTALLERS_DIR/mac-intel/linkband-server-macos-x64" ]]; then
    echo -e "${GREEN}✅ macOS Intel server: Available${NC}"
else
    echo -e "${RED}❌ macOS Intel server: MISSING${NC}"
fi

echo -e "${GREEN}✅ Distribution files organized${NC}"
echo ""

# Create distribution packages
echo -e "${BLUE}📦 Creating distribution packages...${NC}"
cd "$INSTALLERS_DIR"

for platform in mac-arm64 mac-intel windows linux; do
    if [[ -d "$platform" ]]; then
        echo "Creating package for $platform..."
        zip -r "LinkBandSDK-$platform.zip" "$platform"/ -x "*.DS_Store"
        echo "  ✅ Created LinkBandSDK-$platform.zip"
    fi
done

echo -e "${GREEN}✅ Distribution packages created${NC}"
echo ""

# Summary
echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Distribution Summary:${NC}"
echo "  Generated packages:"
for zip_file in LinkBandSDK-*.zip; do
    if [[ -f "$zip_file" ]]; then
        echo "    - $zip_file ($(du -h "$zip_file" | cut -f1))"
    fi
done
echo ""
echo -e "${BLUE}📁 Platform directories:${NC}"
for platform in mac-arm64 mac-intel windows linux; do
    if [[ -d "$platform" ]]; then
        echo "  - $platform/"
        ls -la "$platform/" | grep -v "^total" | tail -n +2 | sed 's/^/    /'
        echo ""
    fi
done

echo -e "${YELLOW}💡 Next steps:${NC}"
echo "  1. Test each platform package on target systems"
echo "  2. Distribute the appropriate ZIP files to users"
echo "  3. Users should extract and run the install script"
echo ""
echo -e "${YELLOW}📝 Note:${NC}"
echo "  - Python backend was built for current platform only"
echo "  - To build for other platforms, run this script on each target OS"
echo "  - Cross-compilation may require additional setup" 