# Link Band SDK - Linux

Link Band SDK for Linux distributions.

## System Requirements

- **Distribution**: Ubuntu 18.04+, Fedora 30+, CentOS 8+, Arch Linux, openSUSE Leap 15+
- **Architecture**: x86_64 (64-bit)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB available space
- **Dependencies**: FUSE, NSS, GTK3, ALSA (installed automatically)

## Installation

### Quick Install (Recommended)
```bash
bash install-linkband.sh
```

### Manual Install
1. Install system dependencies (varies by distribution)
2. Copy `LinkBandSDK.AppImage` to `~/.local/bin/`
3. Copy `linkband-server-linux` to `~/.local/bin/linkband-server`
4. Make both executable: `chmod +x ~/.local/bin/LinkBandSDK.AppImage ~/.local/bin/linkband-server`
5. Add `~/.local/bin` to your PATH

## Usage

### Starting Link Band SDK
- **Easy way**: Run `linkband-start` in terminal
- **Application menu**: Search for "Link Band SDK"
- **Separate components**:
  - Backend: `linkband-server`
  - Frontend: `LinkBandSDK.AppImage`

### First Time Setup
1. The installer will install system dependencies
2. Both the application and backend server will be installed to `~/.local/bin`
3. Desktop entry will be created for application menu
4. PATH will be updated in your shell profile

## Supported Distributions

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install fuse libfuse2 libnss3 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2
```

### Fedora/CentOS/RHEL
```bash
sudo dnf install fuse fuse-libs nss atk at-spi2-atk libdrm libXcomposite libXdamage libXrandr mesa-libgbm libXScrnSaver alsa-lib
```

### Arch Linux
```bash
sudo pacman -S fuse2 nss atk at-spi2-atk libdrm libxcomposite libxdamage libxrandr mesa alsa-lib
```

### openSUSE
```bash
sudo zypper install fuse libnss3 libatk-bridge-2_0-0 libdrm2 libXcomposite1 libXdamage1 libXrandr2 libgbm1 libXss1 alsa
```

## Troubleshooting

### AppImage Won't Run
1. Install FUSE: Your distribution's package manager (see above)
2. Make executable: `chmod +x LinkBandSDK.AppImage`
3. Try running from terminal to see error messages

### Permission Denied Errors
- Ensure files are executable: `chmod +x ~/.local/bin/linkband-server ~/.local/bin/LinkBandSDK.AppImage`
- Check if `~/.local/bin` is in PATH: `echo $PATH | grep .local/bin`
- Restart terminal or run: `source ~/.bashrc`

### Backend Server Issues
- Check if server is running: `ps aux | grep linkband-server`
- Check for port conflicts: `netstat -tulpn | grep :18765`
- Run server manually to see errors: `linkband-server`

### Desktop Integration Issues
- Update desktop database: `update-desktop-database ~/.local/share/applications`
- Check desktop entry: `cat ~/.local/share/applications/linkband-sdk.desktop`
- Log out and back in to refresh application menu

### Missing Dependencies
- Install missing packages using your distribution's package manager
- Check error messages when running AppImage from terminal
- Some older distributions may need newer versions of libraries

## Uninstallation

To remove Link Band SDK:
```bash
# Remove installed files
rm -f ~/.local/bin/LinkBandSDK.AppImage
rm -f ~/.local/bin/linkband-server
rm -f ~/.local/bin/linkband-start

# Remove desktop entry
rm -f ~/.local/share/applications/linkband-sdk.desktop

# Remove PATH entries (edit manually)
nano ~/.bashrc
nano ~/.profile

# Remove user data (optional)
rm -rf ~/.config/LinkBandSDK
rm -rf ~/.local/share/LinkBandSDK
```

## Support

For technical support or questions:
- Email: support@looxidlabs.com
- Documentation: [Link Band SDK Docs](https://docs.looxidlabs.com)

## Security Notes

- AppImage runs in a sandboxed environment
- Backend server only binds to localhost
- No system-wide installation required
- All data stored in user directory

---
**Note**: This installer supports most modern Linux distributions. If you encounter issues, please check the troubleshooting section or contact support. 