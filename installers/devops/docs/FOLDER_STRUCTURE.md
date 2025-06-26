# Folder Structure - Link Band SDK Installers

## Overview

This document explains the reorganized folder structure for Link Band SDK installers, separating DevOps management files from user distribution packages.

## Root Structure

```
installers/
├── devops/                    # DevOps management (INTERNAL USE ONLY)
├── distribution/             # User distribution packages
├── releases/                 # Final release files (ZIP/DMG)
└── README.md                 # Main installer documentation
```

## DevOps Folder (`devops/`)

**Purpose**: Internal DevOps management and build automation
**Access**: DevOps administrators only

```
devops/
├── build-scripts/            # Build automation scripts
│   ├── build-linkband-windows-english-only.bat    # Windows full build
│   ├── build-linkband-quick.bat                   # Windows quick build
│   ├── build-and-install-macos.sh                 # macOS build script
│   ├── build-and-install-linux.sh                 # Linux build script
│   ├── install-linkband.sh                        # Universal installer
│   ├── Installer-Linux.sh                         # Linux installer
│   ├── Installer.sh                               # Generic installer
│   ├── Installer.bat                              # Windows installer
│   └── [other build scripts]
├── config/                   # Configuration files
│   └── requirements.txt                           # Python dependencies
├── tools/                    # Management tools
│   └── create-installer-app.sh                    # macOS installer creator
├── docs/                     # DevOps documentation
│   ├── DEVOPS_GUIDE.md                           # Main DevOps guide
│   ├── BUILD_INSTRUCTIONS.md                     # Build instructions
│   └── FOLDER_STRUCTURE.md                       # This document
└── legacy/                   # Legacy build scripts (reference only)
    └── [legacy scripts for reference]
```

### DevOps File Descriptions

#### Build Scripts
- **`build-linkband-windows-english-only.bat`**: Complete Windows build with auto-installation
- **`build-linkband-quick.bat`**: Fast Windows build (requires pre-installed Python/Git)
- **`build-and-install-macos.sh`**: macOS build script for both ARM64 and Intel
- **`build-and-install-linux.sh`**: Linux build script for multiple distributions
- **`install-linkband.sh`**: Universal installer for all platforms

#### Configuration
- **`requirements.txt`**: Python package dependencies for building

#### Tools
- **`create-installer-app.sh`**: Creates macOS installer applications

#### Documentation
- **`DEVOPS_GUIDE.md`**: Complete DevOps management guide
- **`BUILD_INSTRUCTIONS.md`**: Detailed build instructions for all platforms
- **`FOLDER_STRUCTURE.md`**: This document

## Distribution Folder (`distribution/`)

**Purpose**: User-ready installation packages
**Access**: End users receive these files

```
distribution/
├── windows/                  # Windows distribution package
│   ├── linkband-server-windows.exe              # Python server executable
│   ├── LinkBandSDK-Setup.exe                    # Electron app installer
│   ├── install-linkband.bat                     # Installation script
│   ├── README.md                                # User installation guide
│   ├── PYTHON_INSTALL_GUIDE.md                  # Python installation help
│   ├── GIT_INSTALL_GUIDE.md                     # Git installation help
│   └── MANUAL_COPY_GUIDE.md                     # Manual installation guide
├── macos-arm64/              # macOS ARM64 distribution package
│   ├── linkband-server-macos-arm64              # Python server executable
│   ├── install-linkband.command                 # Installation script
│   └── README.md                                # User installation guide
├── macos-intel/              # macOS Intel distribution package
│   ├── linkband-server-macos-x64                # Python server executable
│   ├── install-linkband.command                 # Installation script
│   └── README.md                                # User installation guide
└── linux/                   # Linux distribution package
    ├── linkband-server-linux                    # Python server executable
    ├── install-linkband.sh                      # Installation script
    └── README.md                                # User installation guide
```

### Distribution File Descriptions

#### Windows Package
- **`linkband-server-windows.exe`**: Standalone Python backend server
- **`LinkBandSDK-Setup.exe`**: Electron application installer
- **`install-linkband.bat`**: Automated installation script
- **`README.md`**: Windows-specific installation and usage guide
- **`*_GUIDE.md`**: Troubleshooting and manual installation guides

#### macOS Packages (ARM64 & Intel)
- **`linkband-server-*`**: Platform-specific Python backend server
- **`install-linkband.command`**: Double-click installation script
- **`README.md`**: macOS-specific installation and usage guide

#### Linux Package
- **`linkband-server-linux`**: Linux Python backend server
- **`install-linkband.sh`**: Shell installation script
- **`README.md`**: Linux-specific installation and usage guide

## Releases Folder (`releases/`)

**Purpose**: Final packaged release files
**Access**: Public distribution

```
releases/
├── LinkBandSDK-windows.zip              # Windows complete package
├── LinkBandSDK-macos-arm64.zip          # macOS ARM64 complete package
├── LinkBandSDK-macos-intel.zip          # macOS Intel complete package
├── LinkBandSDK-linux.zip                # Linux complete package
├── Link Band SDK-1.0.0-arm64.dmg       # macOS ARM64 DMG installer
└── Link Band SDK-1.0.0.dmg             # macOS Intel DMG installer
```

### Release File Descriptions
- **ZIP files**: Complete platform packages ready for distribution
- **DMG files**: macOS disk image installers with drag-and-drop installation

## File Flow Process

### 1. Development Phase
```
DevOps Administrator → devops/build-scripts/ → Build executables
```

### 2. Distribution Phase
```
Built executables → distribution/{platform}/ → Package with user files
```

### 3. Release Phase
```
distribution/{platform}/ → releases/ → Create ZIP/DMG packages
```

## Access Control

### DevOps Administrators
- **Full access**: `devops/` folder
- **Read access**: `distribution/` and `releases/` folders
- **Responsibilities**: Building, packaging, releasing

### End Users
- **Receive**: Contents of `distribution/{their-platform}/` folder
- **No access**: `devops/` folder contents
- **Download**: Final packages from `releases/` folder

## Maintenance Guidelines

### Adding New Platforms
1. Create new folder in `distribution/{new-platform}/`
2. Add build script to `devops/build-scripts/`
3. Update documentation in `devops/docs/`
4. Test complete build-to-release process

### Updating Build Process
1. Modify scripts in `devops/build-scripts/`
2. Test on all target platforms
3. Update `devops/docs/BUILD_INSTRUCTIONS.md`
4. Regenerate distribution packages

### Version Updates
1. Update version numbers in build scripts
2. Rebuild all platform executables
3. Regenerate distribution packages
4. Create new release packages
5. Update all documentation

## Security Considerations

### Source Code Protection
- Build scripts download from private repository
- No source code included in distribution packages
- Only compiled executables distributed to users

### Access Control
- DevOps folder should not be shared with end users
- Distribution packages contain only necessary files
- Release packages are publicly accessible

---
**Last Updated**: December 2024
**Version**: 1.0
**Maintainer**: DevOps Team 