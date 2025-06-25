# Link Band SDK Deployment Guide

## Overview
Link Band SDK is a comprehensive development kit for Looxid Labs' next-generation ultra-lightweight EEG headband (Link Band 2.0). This guide provides instructions for third-party developers and researchers.

## System Requirements

### macOS
- **Intel Mac**: macOS 10.15 (Catalina) or later
- **Apple Silicon Mac**: macOS 11.0 (Big Sur) or later
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 1GB free space

### Windows
- Windows 10 (64-bit) or later
- 4GB RAM minimum, 8GB recommended
- 1GB free space

### Linux
- Ubuntu 20.04 or later (or compatible distribution)
- 4GB RAM minimum, 8GB recommended
- 1GB free space

## What's Included

Link Band SDK comes with everything you need:
- **Python Runtime**: Bundled Python 3.13 environment
- **All Dependencies**: Pre-installed scientific computing libraries
- **No Additional Setup**: Works out of the box

## Installation

### macOS
1. Download the appropriate version:
   - **Intel Mac**: `Link Band SDK-1.0.0.dmg`
   - **Apple Silicon Mac**: `Link Band SDK-1.0.0-arm64.dmg`

2. Double-click the DMG file to mount it
3. Drag the "Link Band SDK" app to your Applications folder
4. On first launch, you may need to:
   - Right-click the app and select "Open" to bypass Gatekeeper
   - Go to System Preferences > Security & Privacy and click "Open Anyway"

### Windows
1. Download `Link Band SDK-1.0.0.exe`
2. Run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

### Linux
1. Download `Link Band SDK-1.0.0.AppImage`
2. Make it executable: `chmod +x Link\ Band\ SDK-1.0.0.AppImage`
3. Run the AppImage

## Features

### Device Management
- Bluetooth device discovery and connection
- Real-time device status monitoring
- Battery level tracking
- Multi-device support

### Data Streaming
- Real-time EEG data (250 Hz)
- PPG data for heart rate monitoring
- 3-axis accelerometer data
- WebSocket API for custom applications

### Data Recording
- Session-based recording
- Multiple export formats (JSON, CSV)
- Automatic data organization
- Session metadata management

### Developer API
- RESTful API endpoints
- WebSocket real-time streaming
- Comprehensive documentation
- Example code and integrations

## API Endpoints

### Base URL
```
http://localhost:8121
```

### WebSocket
```
ws://localhost:18765
```

### Key Endpoints
- `GET /device/scan` - Scan for devices
- `POST /device/connect` - Connect to device
- `POST /stream/start` - Start data streaming
- `POST /data/start-recording` - Start recording session
- `GET /metrics` - System performance metrics

## Quick Start

1. Launch Link Band SDK
2. The Python server will start automatically (no setup required)
3. Click "Scan for Devices"
4. Select your Link Band device
5. Click "Connect"
6. Start streaming or recording

## Troubleshooting

### Application Won't Start (macOS)
If you see "Link Band SDK is damaged and can't be opened":
1. Open Terminal
2. Run: `xattr -cr /Applications/Link\ Band\ SDK.app`
3. Try opening the app again

### Server Connection Issues
- The Python server starts automatically when you launch the app
- Check if port 8121 is already in use by another application
- Try restarting the application

### Device Not Found
- Ensure Bluetooth is enabled
- Check device battery level
- Try restarting the device
- Move closer to the computer

### Connection Issues
- Restart the application
- Check for other Bluetooth interference
- Update your system's Bluetooth drivers

### Data Export Issues
- Ensure sufficient disk space
- Check write permissions
- Try a different export format

## Technical Details

### Bundled Components
- Python 3.13 runtime
- FastAPI web framework
- Scientific libraries: NumPy, SciPy, MNE
- Bluetooth library: Bleak
- Signal processing: HeartPy

### Data Storage
- **Development**: `electron-app/data/`
- **Production (macOS)**: `~/Library/Application Support/Link Band SDK/`
- **Production (Windows)**: `%APPDATA%\Link Band SDK\`
- **Production (Linux)**: `~/.link-band-sdk/`

## Support

For technical support and updates:
- Website: https://looxidlabs.com
- Documentation: Available in-app
- Email: support@looxidlabs.com

## License

This software is proprietary and licensed by Looxid Labs.
See the license agreement for full terms and conditions.

## Version History

### v1.0.0 (Current)
- Initial release
- Full device support for Link Band 2.0
- Real-time streaming and recording
- Multi-platform support (macOS, Windows, Linux)
- Bundled Python environment (no installation required)

---

© 2024 Looxid Labs. All rights reserved. 