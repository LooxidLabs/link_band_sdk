# Link Band SDK - DevOps Management Guide

## Overview

This guide is for DevOps administrators managing the Link Band SDK build and distribution process.

## Folder Structure

```
installers/
├── devops/                    # DevOps management files (THIS FOLDER)
│   ├── build-scripts/         # All build automation scripts
│   ├── config/               # Configuration files
│   ├── tools/                # Management tools
│   ├── docs/                 # DevOps documentation
│   └── legacy/               # Legacy build scripts (for reference)
├── distribution/             # User distribution packages
│   ├── windows/              # Windows distribution package
│   ├── macos-arm64/          # macOS ARM64 distribution package
│   ├── macos-intel/          # macOS Intel distribution package
│   └── linux/                # Linux distribution package
└── releases/                 # Final release packages (ZIP/DMG files)
```

## Responsibilities

### DevOps Administrator
- **Manage**: `devops/` folder contents
- **Build**: Platform-specific executables
- **Package**: Distribution packages for users
- **Release**: Final ZIP/DMG files
- **Maintain**: Build scripts and automation

### End Users
- **Receive**: `distribution/{platform}/` folder contents
- **Install**: Using provided installation scripts
- **Use**: Pre-built executables and applications

## Quick Start

### 1. Building All Platforms
```bash
# Build all platform executables
cd devops/build-scripts/
./build-for-distribution.sh
```

### 2. Creating Distribution Packages
```bash
# Package for specific platform
./package-distribution.sh windows
./package-distribution.sh macos-arm64
./package-distribution.sh macos-intel
./package-distribution.sh linux
```

### 3. Creating Release Files
```bash
# Create final ZIP packages
./create-release-packages.sh
```

## Platform-Specific Build Instructions

### Windows
- **Script**: `build-linkband-windows-english-only.bat`
- **Output**: `linkband-server-windows.exe`
- **Requirements**: Python 3.9+, Git, PyInstaller
- **Target**: Windows 10/11 64-bit

### macOS (ARM64)
- **Script**: `build-and-install-macos.sh`
- **Output**: `linkband-server-macos-arm64`
- **Requirements**: Python 3.9+, Xcode Command Line Tools
- **Target**: Apple Silicon Macs (M1/M2/M3)

### macOS (Intel)
- **Script**: `build-and-install-macos.sh`
- **Output**: `linkband-server-macos-x64`
- **Requirements**: Python 3.9+, Xcode Command Line Tools
- **Target**: Intel-based Macs

### Linux
- **Script**: `build-and-install-linux.sh`
- **Output**: `linkband-server-linux`
- **Requirements**: Python 3.9+, build-essential
- **Target**: Ubuntu 20.04+ and compatible distributions

## Configuration Management

### Repository Settings
- **GitHub URL**: `https://github.com/LooxidLabs/link_band_sdk.git`
- **Branch**: `main`
- **Build Source**: `python_core/` directory

### Build Configuration
- **Python Version**: 3.9+
- **PyInstaller**: Latest stable version
- **Dependencies**: See `config/requirements.txt`

## Troubleshooting

### Common Issues
1. **Python Version Conflicts**: Ensure consistent Python version across platforms
2. **Dependency Issues**: Update `requirements.txt` when adding new dependencies
3. **Build Failures**: Check platform-specific build logs
4. **Code Signing**: Ensure certificates are valid (macOS/Windows)

### Platform-Specific Issues
- **Windows**: Encoding issues with batch files
- **macOS**: Gatekeeper warnings, code signing requirements
- **Linux**: Distribution-specific package dependencies

## Maintenance Tasks

### Regular Tasks
- [ ] Update Python dependencies
- [ ] Test build scripts on all platforms
- [ ] Verify code signing certificates
- [ ] Update documentation

### Release Tasks
- [ ] Build all platform executables
- [ ] Test installation on target platforms
- [ ] Create distribution packages
- [ ] Generate release ZIP/DMG files
- [ ] Update version numbers
- [ ] Create release notes

## Security Considerations

- **Code Signing**: Required for macOS and recommended for Windows
- **Certificate Management**: Keep signing certificates secure and up-to-date
- **Source Code Protection**: Build scripts download from private repository
- **Binary Distribution**: Only distribute signed executables

## Contact Information

For DevOps support or questions:
- **Email**: devops@looxidlabs.com
- **Documentation**: Internal DevOps Wiki
- **Repository**: https://github.com/LooxidLabs/link_band_sdk

---
**Last Updated**: December 2024
**Version**: 1.0
**Maintainer**: DevOps Team 