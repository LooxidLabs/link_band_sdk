# Link Band SDK - macOS (Apple Silicon)

Link Band SDK for Apple Silicon Macs (M1, M2, M3, M4).

## System Requirements

- **macOS**: 10.15 (Catalina) or later
- **Processor**: Apple Silicon (M1, M2, M3, M4)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB available space
- **Administrator**: Required for installation

## Installation

### Quick Install (Recommended)
1. **Double-click** `install-linkband.command`
2. **Enter your password** when prompted (for administrator access)
3. **Follow** the on-screen instructions

### What Gets Installed
- ✅ **Link Band SDK.app** → `/Applications/`
- ✅ **Backend Server** → `/usr/local/bin/linkband-server`
- ✅ **Launch Script** → `/usr/local/bin/linkband-start`

## Usage

### Starting Link Band SDK

#### Option 1: Use the Launch Script (Recommended)
```bash
linkband-start
```
This starts both the backend server and frontend application.

#### Option 2: Start Components Separately
```bash
# Start backend server
linkband-server

# Start frontend application (in another terminal)
open -a "Link Band SDK"
```

#### Option 3: Use the Application
- Open **Link Band SDK** from Applications folder
- Backend server will start automatically

### Stopping Link Band SDK
```bash
# Find and stop the server process
pkill linkband-server

# Or if you know the process ID
kill [PID]
```

## Troubleshooting

### "Cannot be opened because the developer cannot be verified"
1. **Right-click** on `install-linkband.command`
2. Select **"Open"**
3. Click **"Open"** in the security dialog

### Installation Fails
1. **Check permissions**: Ensure you have administrator access
2. **Check files**: Ensure all files are in the same folder:
   - `install-linkband.command`
   - `linkband-server-macos-arm64`
   - `LinkBandSDK.dmg`
   - `README.md`

### Backend Server Issues
- **Check if running**: `ps aux | grep linkband-server`
- **Check port**: Backend runs on `localhost:18765`
- **Restart server**: `pkill linkband-server && linkband-server`

### Frontend Application Issues
- **Reinstall app**: Delete from Applications and run installer again
- **Check console**: Open Console.app and look for "Link Band SDK" logs
- **Reset preferences**: Delete `~/Library/Preferences/com.looxidlabs.linkbandsdk.plist`

## Uninstallation

To remove Link Band SDK:
1. **Delete application**: Move "Link Band SDK.app" to Trash
2. **Remove backend server**: `sudo rm /usr/local/bin/linkband-server`
3. **Remove launch script**: `sudo rm /usr/local/bin/linkband-start`
4. **Remove preferences**: `rm ~/Library/Preferences/com.looxidlabs.linkbandsdk.*`

## File Locations

- **Application**: `/Applications/Link Band SDK.app`
- **Backend Server**: `/usr/local/bin/linkband-server`
- **Launch Script**: `/usr/local/bin/linkband-start`
- **Logs**: `~/Library/Logs/LinkBandSDK/`
- **Data**: `~/Library/Application Support/LinkBandSDK/`

## Support

For technical support:
- **Email**: support@looxidlabs.com
- **Documentation**: [Link Band SDK Docs](https://docs.looxidlabs.com)

## Security Notes

- The installer requires administrator privileges for system-wide installation
- All executables are code-signed with Apple Developer ID
- Backend server only accepts connections from localhost (127.0.0.1)
- No data is transmitted to external servers

---
**Designed for Apple Silicon Macs (M1, M2, M3, M4)** 