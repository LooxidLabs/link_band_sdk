# Build Instructions - Link Band SDK

## Overview

This document provides detailed instructions for building Link Band SDK executables for all supported platforms.

## Prerequisites

### All Platforms
- Git (latest version)
- Python 3.9 or later
- Internet connection for dependency downloads

### Platform-Specific Requirements

#### Windows
- **OS**: Windows 10/11 64-bit
- **Python**: 3.9+ (from python.org)
- **Git**: Git for Windows
- **Admin Rights**: Required for some build operations

#### macOS
- **OS**: macOS 10.15+ (Catalina or later)
- **Xcode**: Command Line Tools (`xcode-select --install`)
- **Python**: 3.9+ (recommended: Homebrew or python.org)
- **Code Signing**: Apple Developer ID (for distribution)

#### Linux
- **OS**: Ubuntu 20.04+ or compatible distributions
- **Packages**: `build-essential`, `python3-dev`, `python3-venv`
- **Python**: 3.9+ (system package or pyenv)

## Build Scripts

### Windows Build

#### Quick Build (Recommended)
```bash
# For systems with Python and Git already installed
cd devops/build-scripts/
./build-linkband-quick.bat
```

#### Full Automatic Build
```bash
# Includes automatic Python/Git installation
cd devops/build-scripts/
./build-linkband-windows-english-only.bat
```

**Output**: `linkband-server-windows.exe`

#### Manual Build Process
1. Clone repository:
   ```bash
   git clone https://github.com/LooxidLabs/link_band_sdk.git
   cd link_band_sdk/python_core
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate.bat
   ```

3. Install dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   pip install pyinstaller
   ```

4. Build executable:
   ```bash
   pyinstaller --onefile --name linkband-server-windows run_server.py
   ```

### macOS Build

#### Automated Build
```bash
cd devops/build-scripts/
./build-and-install-macos.sh
```

#### Manual Build Process
1. Install dependencies:
   ```bash
   # Using Homebrew
   brew install python@3.11 git
   
   # Or using system Python
   python3 -m pip install --upgrade pip
   ```

2. Clone and build:
   ```bash
   git clone https://github.com/LooxidLabs/link_band_sdk.git
   cd link_band_sdk/python_core
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install pyinstaller
   ```

3. Build for current architecture:
   ```bash
   # For ARM64 (Apple Silicon)
   pyinstaller --onefile --name linkband-server-macos-arm64 run_server.py
   
   # For Intel (x86_64)
   pyinstaller --onefile --name linkband-server-macos-x64 run_server.py
   ```

4. Code signing (if distributing):
   ```bash
   codesign --force --sign "Developer ID Application: Your Name" dist/linkband-server-*
   ```

### Linux Build

#### Automated Build
```bash
cd devops/build-scripts/
./build-and-install-linux.sh
```

#### Manual Build Process
1. Install system dependencies:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install python3 python3-pip python3-venv build-essential git
   
   # CentOS/RHEL
   sudo yum install python3 python3-pip git gcc
   ```

2. Clone and build:
   ```bash
   git clone https://github.com/LooxidLabs/link_band_sdk.git
   cd link_band_sdk/python_core
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   pip install pyinstaller
   ```

3. Build executable:
   ```bash
   pyinstaller --onefile --name linkband-server-linux run_server.py
   ```

## Build Configuration

### PyInstaller Options
- `--onefile`: Create single executable file
- `--name`: Specify output filename
- `--hidden-import`: Include modules not detected automatically
- `--exclude-module`: Exclude unnecessary modules
- `--strip`: Reduce file size (Linux/macOS)

### Common Build Issues

#### Windows
- **Encoding errors**: Use `build-linkband-windows-english-only.bat`
- **Permission denied**: Run as administrator
- **Python not found**: Verify PATH environment variable

#### macOS
- **Code signing errors**: Check certificate validity
- **Permission denied**: Use `sudo` for system-wide installations
- **Architecture mismatch**: Specify target architecture explicitly

#### Linux
- **Missing libraries**: Install development packages
- **Permission errors**: Check file permissions and ownership
- **Distribution differences**: Test on target distributions

## Testing Built Executables

### Basic Functionality Test
```bash
# Test server startup
./linkband-server-{platform} --help

# Test version information
./linkband-server-{platform} --version

# Test configuration
./linkband-server-{platform} --config-test
```

### Integration Testing
1. Start the server
2. Verify WebSocket connection on port 18765
3. Test REST API endpoints
4. Verify device connection capabilities
5. Test data streaming functionality

## File Locations

### Build Outputs
- **Windows**: `dist/linkband-server-windows.exe`
- **macOS ARM64**: `dist/linkband-server-macos-arm64`
- **macOS Intel**: `dist/linkband-server-macos-x64`
- **Linux**: `dist/linkband-server-linux`

### Distribution Locations
- **Windows**: `distribution/windows/linkband-server-windows.exe`
- **macOS ARM64**: `distribution/macos-arm64/linkband-server-macos-arm64`
- **macOS Intel**: `distribution/macos-intel/linkband-server-macos-x64`
- **Linux**: `distribution/linux/linkband-server-linux`

## Version Management

### Updating Build Scripts
1. Test changes on development environment
2. Update version numbers in build scripts
3. Verify all platforms build successfully
4. Update documentation
5. Commit changes to repository

### Dependency Updates
1. Update `requirements.txt`
2. Test compatibility with new versions
3. Update build scripts if necessary
4. Document any breaking changes

---
**Last Updated**: December 2024
**Maintainer**: DevOps Team 