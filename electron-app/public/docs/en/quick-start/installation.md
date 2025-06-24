# Installation

This guide provides step-by-step instructions for installing and setting up Link Band SDK.

## System Prerequisites

Before starting the installation, please verify the following:

- **Operating System**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **Memory**: Minimum 4GB RAM
- **Storage**: Minimum 2GB free space

## Installation Methods

### Using Pre-built Installation Files

This is the simplest installation method. No separate development environment setup is required.

**Windows**
1. Download the latest version from the [Release page](https://github.com/looxid-labs/link-band-sdk/releases)
2. Run the `Link-Band-SDK-Setup-x.x.x.exe` file
3. Follow the installation wizard instructions to complete the installation
4. Launch "Link Band SDK" from the desktop or start menu

**macOS**
1. Download the latest version from the [Release page](https://github.com/looxid-labs/link-band-sdk/releases)
2. Double-click the `Link-Band-SDK-x.x.x.dmg` file
3. Drag Link Band SDK to the Applications folder
4. Launch Link Band SDK from Applications
5. If you see an "Unidentified Developer" security warning, allow it in "System Preferences > Security & Privacy"

**Linux (Ubuntu/Debian)**
```bash
# Download and install .deb package
sudo dpkg -i Link-Band-SDK-x.x.x.deb
sudo apt-get install -f  # Resolve dependencies

# Or use AppImage
chmod +x Link-Band-SDK-x.x.x.AppImage
./Link-Band-SDK-x.x.x.AppImage
```

## Installation Verification

Once installation is complete, you can verify it as follows:

1. **Launch Link Band SDK**
   - Start the application
   - Click the "Engine" module in the left menu
   - Click the "Start" button to start the backend server

2. **Check Server Status**
   - Verify that the Engine status changes to "Started"
   - Check that system metrics (CPU, RAM, Disk) are displayed in the bottom status bar

3. **Test Link Band Connection**
   - Prepare your Link Band 2.0 device
   - Click the "Scan" button in the "Link Band" module
   - When the device is detected, click the "Connect" button

## Troubleshooting

### Common Installation Issues

**Permission-related Errors (macOS)**
```bash
# Grant application execution permission
sudo xattr -rd com.apple.quarantine /Applications/Link\ Band\ SDK.app
```

**Port Conflict Errors**
```bash
# If port 8121 is in use
lsof -ti:8121 | xargs kill -9

# If port 18765 is in use
lsof -ti:18765 | xargs kill -9
```

**Firewall Settings**
- Windows: Allow Link Band SDK in Windows Defender Firewall
- macOS: Allow in System Preferences > Security & Privacy > Firewall
- Linux: Allow ports 8121, 18765 in ufw or iptables

### Log File Locations

If problems occur, check the log files at the following locations:

**Windows**
```
%APPDATA%\Link Band SDK\logs\
```

**macOS**
```
~/Library/Application Support/Link Band SDK/logs/
```

**Linux**
```
~/.config/Link Band SDK/logs/
```

## Next Steps

Once installation is complete, learn how to use Link Band SDK through the [First Steps](first-steps.md) guide.

> **Need Help?**
> 
> If you encounter problems during installation, check the [Troubleshooting](../examples/faq.md) page or contact us through [GitHub Issues](https://github.com/looxid-labs/link-band-sdk/issues). 