# Link Band SDK - Windows

Link Band SDK for Windows systems.

## System Requirements

- **Windows**: 10 (64-bit) or later
- **Processor**: x86_64 (Intel/AMD 64-bit)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB available space
- **Administrator**: Required for installation

## Installation

### Quick Install (Recommended)
1. **Right-click** `install-linkband.bat`
2. Select **"Run as administrator"**
3. Follow the on-screen instructions

### Manual Install
1. Run `LinkBandSDK-Setup.exe` to install the application
2. Copy `linkband-server-windows.exe` to `C:\Program Files\LinkBandSDK\` (if available)
3. Add `C:\Program Files\LinkBandSDK\` to your system PATH

### Building Python Backend (If Not Available)
If `linkband-server-windows.exe` is not included, you can build it yourself:

#### Option 1: Quick Build (Recommended)
1. **Run** `build-linkband-quick.bat` as administrator
2. **No input required** - uses fixed GitHub repository URL
3. **Wait** for automatic download, build, and setup
4. The script will create `linkband-server-windows.exe` automatically

#### Option 1b: Full Automatic Build
1. **Run** `build-linkband-windows-english-only.bat` as administrator
2. **No input required** - now uses fixed GitHub repository URL
3. Includes Python/Git auto-installation if needed
4. More comprehensive error handling and logging

#### Option 2: Manual Build
1. Install Python 3.9+ from [python.org](https://python.org)
2. Install Git from [git-scm.com](https://git-scm.com)
3. Download the Link Band SDK source code
4. Install dependencies: `pip install -r requirements.txt`
5. Build server: `pyinstaller --onefile --name linkband-server-windows run_server.py`

#### Encoding Issues
If you encounter encoding errors with batch files:
- Use `build-linkband-windows-english-only.bat` instead of other versions
- This version is specifically designed to avoid Windows encoding issues

## Usage

### Starting Link Band SDK
- **Easy way**: Double-click "Link Band SDK" desktop shortcut
- **Command line**: Run `linkband-start` in Command Prompt
- **Separate components**:
  - Backend: `linkband-server`
  - Frontend: "LinkBandSDK" from Start Menu

### First Time Setup
1. The installer requires administrator privileges
2. Both the application and backend server will be installed
3. Desktop shortcut and launch scripts will be created
4. System PATH will be updated automatically

## Troubleshooting

### "Windows protected your PC" Error
1. Click **"More info"**
2. Click **"Run anyway"**
3. This is normal for unsigned applications

### Backend Server Issues
- Check if server is running: Open Task Manager and look for "linkband-server"
- Restart server: Close "LinkBand Server" window and run `linkband-server`
- Check Windows Event Viewer for error logs

### Permission Issues
- Ensure you ran the installer as administrator
- Check if `C:\Program Files\LinkBandSDK\` is in your PATH
- Run: `echo %PATH%` in Command Prompt

### Firewall/Antivirus Issues
- Add exception for `linkband-server.exe` in Windows Defender
- Allow network access when prompted
- Some antivirus software may quarantine the files

## Uninstallation

To remove Link Band SDK:
1. **Uninstall application**: Control Panel > Programs > LinkBandSDK > Uninstall
2. **Remove backend server**: Delete `C:\Program Files\LinkBandSDK\` folder
3. **Remove from PATH**: System Properties > Environment Variables > Edit PATH
4. **Remove desktop shortcut**: Delete "Link Band SDK.lnk" from desktop

## Support

For technical support or questions:
- Email: support@looxidlabs.com
- Documentation: [Link Band SDK Docs](https://docs.looxidlabs.com)

## Security Notes

- The installer requires administrator privileges to install system-wide
- Windows Defender may show warnings for unsigned executables
- Backend server opens network ports for local communication only
- All data is stored locally on your computer

---
**Note**: This installer is for Windows 10/11 64-bit systems only. 