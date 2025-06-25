# Link Band SDK Installers

This directory contains comprehensive installation scripts for the Link Band SDK across all supported platforms.

## Quick Installation

### Windows
Simply double-click `Installer.bat` to start the automated installation process.

### macOS
Double-click `Installer.sh` or run in Terminal:
```bash
./Installer.sh
```

### Linux
Run in Terminal:
```bash
./Installer-Linux.sh
```

## What the Installers Do

Each installer performs the following steps automatically:

1. **Check Python Installation**
   - Verifies Python 3.9+ is installed
   - Offers to install Python if missing

2. **Install Python Dependencies**
   - Installs required packages from requirements.txt
   - Handles system-specific dependencies

3. **Download/Install SDK**
   - Uses local installer files if available
   - Downloads from GitHub releases as fallback
   - Installs platform-appropriate version

4. **Create Shortcuts**
   - Desktop shortcuts
   - Start menu/Applications folder entries
   - PATH configuration where applicable

5. **Setup Uninstaller**
   - Creates platform-specific uninstall scripts

## File Structure

```
installers/
├── Installer.bat           # Windows main installer
├── Installer.sh            # macOS main installer  
├── Installer-Linux.sh      # Linux main installer
├── requirements.txt        # Python dependencies
├── downloads/              # Downloaded files cache
├── scripts/                # Helper scripts
├── Uninstall.bat          # Windows uninstaller (created after install)
├── Uninstall.sh           # macOS uninstaller (created after install)
├── Uninstall-Linux.sh     # Linux uninstaller (created after install)
└── Link Band SDK-*.dmg    # macOS installers (if available locally)
```

## Installation Methods

### Method 1: Local Installation (Recommended)
If you have the installer files locally:
1. Place the appropriate installer file in this directory:
   - Windows: `Link-Band-SDK-Setup-1.0.0.exe`
   - macOS Intel: `Link Band SDK-1.0.0.dmg`
   - macOS Apple Silicon: `Link Band SDK-1.0.0-arm64.dmg`
   - Linux: `Link Band SDK-1.0.0.AppImage` or `Link Band SDK-1.0.0-arm64.AppImage`
2. Run the appropriate installer script
3. The script will use the local file instead of downloading

### Method 2: Online Installation
If no local installer files are found:
1. Run the installer script
2. It will automatically download the latest version from GitHub releases
3. Continue with normal installation

## Platform-Specific Notes

### Windows
- Requires Windows 10 or later
- May prompt for administrator privileges during Python installation
- Automatically handles Python PATH configuration
- Creates Start Menu shortcuts and desktop shortcut

### macOS
- Supports both Intel and Apple Silicon Macs
- Requires macOS 10.15 (Catalina) or later
- May prompt for admin password during installation
- Automatically detects architecture and installs appropriate version
- Creates Applications folder entry and desktop alias

### Linux
- Supports major distributions (Ubuntu, Fedora, Arch, openSUSE, etc.)
- Requires sudo privileges for system package installation
- Installs as AppImage for maximum compatibility
- Creates desktop entries and adds to PATH

## Troubleshooting

### Python Installation Issues
- **Windows**: Ensure "Add Python to PATH" was checked during Python installation
- **macOS**: Install Homebrew first if Python installation fails
- **Linux**: Install development tools for your distribution

### Download Failures
1. Check internet connection
2. Manually download from: https://github.com/LooxidLabs/link_band_sdk/releases
3. Place downloaded file in the installers directory
4. Re-run the installer

### Permission Issues
- **Windows**: Run Command Prompt as Administrator
- **macOS/Linux**: Ensure script has execute permissions: `chmod +x Installer.sh`

### Python 3.13+ Issues
If you encounter "externally-managed-environment" errors:
- The installer will automatically handle this with appropriate flags
- For manual installation, use virtual environments

## Advanced Usage

### Custom Installation Directory
Edit the installer script and modify the installation paths:
- Windows: Change `INSTALL_DIR` variable
- macOS/Linux: Modify the application directories

### Offline Installation
1. Download all required files:
   - SDK installer for your platform
   - requirements.txt
   - Python installer (Windows only)
2. Place in installers directory
3. Run installer script

### Silent Installation
For automated deployments:
- Windows: Use `/S` flag with the SDK installer
- macOS: Modify script to skip user prompts
- Linux: Set environment variables to skip confirmations

## Uninstallation

After installation, uninstaller scripts are created:
- Windows: `Uninstall.bat`
- macOS: `Uninstall.sh`
- Linux: `Uninstall-Linux.sh`

These scripts will:
- Remove installed applications
- Clean up shortcuts and desktop entries
- Remove PATH modifications
- Preserve user data and Python installation

## Support

For issues with the installers:
1. Check the installation log: `install.log`
2. Review troubleshooting section above
3. Visit: https://github.com/LooxidLabs/link_band_sdk/issues

## Legacy Installers

The following files are legacy installers (still functional):
- `install-windows.bat` - Original Windows installer
- `install-macos.sh` - Original macOS installer
- `install-macos.command` - macOS double-click installer
- `install-macos-venv.sh` - macOS virtual environment installer
- `install-linux.sh` - Original Linux installer
- `*.app` folders - macOS app bundle installers

Use the new `Installer.*` scripts for the best experience. 