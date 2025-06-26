# Link Band SDK - macOS (Intel)

Link Band SDK for macOS Intel processors.

## System Requirements

- **macOS**: 10.15 (Catalina) or later
- **Processor**: Intel x86_64
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB available space

## Installation

### Quick Install (Recommended)
1. **Double-click** `install-linkband.command`
2. Enter your password when prompted
3. Follow the on-screen instructions

### Manual Install
1. Install the application: Open `LinkBandSDK.dmg` and drag to Applications
2. Install the backend server: Copy `linkband-server-macos-x64` to `/usr/local/bin/linkband-server`
3. Make it executable: `chmod +x /usr/local/bin/linkband-server`

## Usage

### Starting Link Band SDK
- **Easy way**: Run `linkband-start` in Terminal
- **Separate components**:
  - Backend: `linkband-server`
  - Frontend: Open "Link Band SDK" from Applications

### First Time Setup
1. The installer will ask for administrator privileges
2. Both the application and backend server will be installed
3. Launch scripts will be created for easy startup

## Troubleshooting

### "App can't be opened" Error
1. Go to **System Preferences** > **Security & Privacy**
2. Click **"Open Anyway"** for Link Band SDK
3. Or run: `sudo xattr -rd com.apple.quarantine /Applications/Link\ Band\ SDK.app`

### Backend Server Issues
- Check if server is running: `ps aux | grep linkband-server`
- Restart server: `killall linkband-server && linkband-server`
- Check logs in Console app for "linkband" entries

### Permission Issues
- Ensure `/usr/local/bin` is in your PATH
- Run: `echo $PATH | grep /usr/local/bin`
- If missing, add to your shell profile: `export PATH="$PATH:/usr/local/bin"`

## Uninstallation

To remove Link Band SDK:
```bash
# Remove application
sudo rm -rf "/Applications/Link Band SDK.app"

# Remove backend server
sudo rm -f /usr/local/bin/linkband-server
sudo rm -f /usr/local/bin/linkband-start

# Remove user data (optional)
rm -rf ~/Library/Application\ Support/LinkBandSDK
```

## Support

For technical support or questions:
- Email: support@looxidlabs.com
- Documentation: [Link Band SDK Docs](https://docs.looxidlabs.com)

---
**Note**: This installer is specifically for Intel Macs. If you have an Apple Silicon Mac (M1/M2/M3/M4), please download the Apple Silicon version. 