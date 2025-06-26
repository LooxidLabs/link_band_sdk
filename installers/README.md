# Link Band SDK - Installers

This directory contains organized installation packages and build management tools for Link Band SDK.

## 📁 Folder Structure

```
installers/
├── devops/          # DevOps management (INTERNAL USE ONLY)
│   ├── build-scripts/   # Build automation scripts
│   ├── config/         # Configuration files
│   ├── tools/          # Management tools
│   ├── docs/           # DevOps documentation
│   └── legacy/         # Legacy scripts (reference)
├── distribution/    # User installation packages
│   ├── windows/        # Windows distribution
│   ├── macos-arm64/    # macOS Apple Silicon
│   ├── macos-intel/    # macOS Intel
│   └── linux/          # Linux distribution
├── releases/        # Final release packages (ZIP/DMG)
└── README.md        # This file
```

## 👥 For End Users

### Download Your Platform Package

Navigate to the appropriate folder in `distribution/`:

- **🪟 Windows**: `distribution/windows/`
- **🍎 macOS (Apple Silicon)**: `distribution/macos-arm64/`
- **💻 macOS (Intel)**: `distribution/macos-intel/`
- **🐧 Linux**: `distribution/linux/`

### Installation

Each platform folder contains everything you need:
- ✅ **Pre-built server executable** (`linkband-server-*`)
- ✅ **Installation script** (`install-linkband.*`)
- ✅ **Platform-specific README** with detailed instructions
- ✅ **Troubleshooting guides** (Windows only)

#### Quick Installation
```bash
# macOS (double-click or terminal)
cd distribution/macos-arm64/  # or macos-intel/
./install-linkband.command

# Windows (run as administrator)
cd distribution\windows\
install-linkband.bat

# Linux
cd distribution/linux/
./install-linkband.sh
```

### What's Included in Each Package

| Component | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| **Backend Server** | `linkband-server-windows.exe` | `linkband-server-macos-*` | `linkband-server-linux` |
| **App Installer** | `LinkBandSDK-Setup.exe` | Via DMG | Via AppImage |
| **Install Script** | `install-linkband.bat` | `install-linkband.command` | `install-linkband.sh` |
| **User Guide** | `README.md` | `README.md` | `README.md` |
| **Troubleshooting** | Multiple guides | Included in README | Included in README |

## ⚙️ For DevOps Administrators

### Management Overview

All DevOps management files are located in the `devops/` folder:

- **📜 Scripts**: `devops/build-scripts/` - All build automation
- **⚙️ Config**: `devops/config/` - Configuration files
- **🛠️ Tools**: `devops/tools/` - Management utilities
- **📚 Docs**: `devops/docs/` - Complete DevOps documentation

### Quick Start for DevOps

```bash
# 1. Read the main DevOps guide
cat devops/docs/DEVOPS_GUIDE.md

# 2. Build for specific platforms
cd devops/build-scripts/

# Windows build (with auto Python/Git install)
./build-linkband-windows-english-only.bat

# Windows quick build (requires Python/Git)
./build-linkband-quick.bat

# macOS build
./build-and-install-macos.sh

# Linux build
./build-and-install-linux.sh
```

### DevOps Documentation

| Document | Purpose |
|----------|---------|
| **`DEVOPS_GUIDE.md`** | Complete DevOps management guide |
| **`BUILD_INSTRUCTIONS.md`** | Detailed build instructions for all platforms |
| **`FOLDER_STRUCTURE.md`** | Detailed explanation of folder organization |

### Build Process Flow

```
1. DevOps Admin → devops/build-scripts/ → Build executables
2. Built executables → distribution/{platform}/ → Package with user files  
3. distribution/{platform}/ → releases/ → Create final ZIP/DMG packages
```

## 🔒 Access Control & Security

### DevOps Administrators
- **Full access**: `devops/` folder
- **Read access**: `distribution/` and `releases/` folders
- **Responsibilities**: Building, packaging, releasing

### End Users
- **Receive**: Contents of `distribution/{platform}/` folder only
- **No access**: `devops/` folder contents
- **Download**: Final packages from `releases/` folder

### Security Features
- ✅ **Source code protection**: No source code in user packages
- ✅ **Code signing**: macOS executables signed with Developer ID
- ✅ **Minimal distribution**: Only necessary files included
- ✅ **Pre-compiled binaries**: No compilation required by users

## 🚀 Platform Support

### Supported Platforms
- **Windows**: 10/11 64-bit
- **macOS**: 10.15+ (both Apple Silicon and Intel)
- **Linux**: Ubuntu 20.04+ and compatible distributions

### System Requirements
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB available space
- **Network**: Internet connection for initial download only
- **Permissions**: Administrator/sudo access for installation

## 📞 Support

For technical support:
- **Users**: Check platform-specific README in `distribution/{platform}/`
- **DevOps**: See documentation in `devops/docs/`
- **Email**: support@looxidlabs.com
- **Documentation**: [Link Band SDK Docs](https://docs.looxidlabs.com)

---

**🎯 Choose your role above and get started with Link Band SDK!** 