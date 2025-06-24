# Troubleshooting

This guide covers common issues that may occur while using the Link Band SDK and their solutions.

## Engine Related Issues

### Engine Won't Start

**Symptoms**
- Status doesn't change to "Started" after clicking the "Start" button
- Error messages appear in logs

**Causes and Solutions**

**1. Python Environment Issues**
```bash
[ERROR] Python interpreter not found
```
Solution:
```bash
# Check Python version (3.8+ required)
python --version
python3 --version

# Check Python path
which python
which python3

# Install Python if needed
# macOS: brew install python
# Ubuntu: sudo apt install python3
# Windows: Download from python.org
```

**2. Missing Dependencies**
```bash
[ERROR] ModuleNotFoundError: No module named 'fastapi'
```
Solution:
```bash
cd python_core
pip install -r requirements.txt

# Virtual environment recommended
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**3. Port Conflicts**
```bash
[ERROR] Port 8121 is already in use
```
Solution:
```bash
# Find and kill processes using the ports
# macOS/Linux
lsof -ti:8121 | xargs kill -9
lsof -ti:18765 | xargs kill -9

# Windows
netstat -ano | findstr :8121
taskkill /PID <PID_NUMBER> /F
```

**4. Permission Issues**
```bash
[ERROR] Permission denied
```
Solution:
```bash
# macOS/Linux
sudo chown -R $USER:$USER python_core/
chmod +x python_core/app/main.py

# Windows: Run as administrator
```

### Engine Stops Frequently

**Causes and Solutions**

**1. Insufficient Memory**
- Check RAM usage in the bottom status bar
- Close other applications
- Increase virtual memory

**2. CPU Overload**
- Check CPU usage in the bottom status bar
- Clean up background processes
- Reduce sampling rate

**3. Insufficient Disk Space**
- Check available storage
- Delete old session data
- Clean temporary files

## Device Connection Issues

### Device Not Found During Scan

**Symptoms**
- Device list remains empty after clicking "Scan"
- Scanning takes too long

**Causes and Solutions**

**1. Bluetooth Disabled**
```bash
# Check Bluetooth status
# macOS
system_profiler SPBluetoothDataType

# Linux
bluetoothctl show
```
Solution: Enable Bluetooth in system settings

**2. Device Status Issues**
- Ensure Link Band 2.0 is charged
- Verify device is in pairing mode (blue LED blinking)
- Check if device is not connected to another device

**3. Distance and Interference**
- Maintain distance within 2 meters from device
- Minimize interference from other Bluetooth devices
- Keep distance from Wi-Fi routers and electronic devices

### Connection Drops Frequently

**Symptoms**
- Connection automatically disconnects within minutes
- "Connection lost" message appears

**Causes and Solutions**

**1. Weak Signal Strength**
- Check RSSI value (recommend -70 dBm or higher)
- Remove obstacles (walls, metal objects)
- Reduce distance

**2. Low Battery**
- Maintain device battery above 30%
- Regular charging (2-3 times per week)
- Use low power mode

**3. Bluetooth Driver Issues**
```bash
# Windows: Update Bluetooth driver in Device Manager
# macOS: Check for system updates
# Linux
sudo apt update && sudo apt upgrade bluez
```

### Poor Sensor Contact

**Symptoms**
- "No Contact" indicator shown
- Low signal quality (below 50%)

**Causes and Solutions**

**1. Incorrect Wearing Position**
- Adjust electrodes to make direct skin contact
- Clear hair from electrode area
- Secure with appropriate pressure

**2. Skin Condition**
- Clean electrode area (use alcohol wipes)
- Remove makeup or lotion
- Slightly moisten dry skin

**3. Device Condition**
- Clean electrodes (use soft cloth)
- Check for electrode corrosion
- Contact support if needed

## Data Related Issues

### Data Not Being Saved

**Symptoms**
- No files created after recording
- Sessions not shown in "File List"

**Causes and Solutions**

**1. Storage Permission Issues**
```bash
# Check data folder permissions
ls -la data/
chmod 755 data/
```

**2. Insufficient Disk Space**
- Check available storage
- Delete unnecessary files
- Move data folder to another drive

**3. Recording Settings Issues**
- Verify recording is properly started
- Check sensor enable status
- Confirm data format settings

### Poor Data Quality

**Symptoms**
- High noise levels in signals
- Frequent signal dropouts
- Low SQI (Signal Quality Index) values

**Causes and Solutions**

**1. Environmental Interference**
- Move away from electrical devices
- Avoid fluorescent lighting
- Use in electrically quiet environment

**2. Movement Artifacts**
- Minimize head movement during recording
- Secure device properly
- Use appropriate recording posture

**3. Electrode Issues**
- Ensure proper electrode contact
- Clean electrodes regularly
- Check for electrode wear

## Performance Issues

### Slow Data Processing

**Symptoms**
- Delayed visualization updates
- High CPU usage
- Application lag

**Causes and Solutions**

**1. System Resources**
- Close unnecessary applications
- Increase available RAM
- Use SSD for data storage

**2. Processing Settings**
- Reduce buffer size
- Lower visualization update rate
- Disable unnecessary processing

**3. Hardware Limitations**
- Check minimum system requirements
- Consider hardware upgrade
- Use performance mode

### WebSocket Connection Issues

**Symptoms**
- Real-time data not updating
- Connection timeout errors
- WebSocket connection failures

**Causes and Solutions**

**1. Network Configuration**
- Check localhost connectivity
- Verify port 18765 is open
- Disable firewall temporarily for testing

**2. Server Issues**
- Restart Python server
- Check server logs for errors
- Verify WebSocket server is running

**3. Client Configuration**
- Clear browser cache (if using web interface)
- Check WebSocket client settings
- Update to latest SDK version

## Common Error Messages

### `[ERROR] Device disconnected unexpectedly`
- Check battery level
- Verify Bluetooth connection stability
- Restart device and reconnect

### `[ERROR] Data buffer overflow`
- Reduce sampling rate
- Increase buffer size
- Improve system performance

### `[ERROR] Signal processing failed`
- Check input data validity
- Verify filter parameters
- Restart processing pipeline

### `[ERROR] File write permission denied`
- Check folder permissions
- Run with administrator privileges
- Change data output directory

## Getting Help

If you continue to experience issues:

1. **Check System Requirements**
   - Python 3.8+
   - 4GB RAM minimum
   - Bluetooth 4.0+
   - 1GB free storage

2. **Update Software**
   - Latest SDK version
   - Updated system drivers
   - Current Python packages

3. **Collect Debug Information**
   - Application logs
   - System specifications
   - Error screenshots

4. **Contact Support**
   - Email: support@looxidlabs.com
   - Include debug information
   - Describe reproduction steps

## Frequently Asked Questions

**Q: Can I use multiple devices simultaneously?**
A: Currently, the SDK supports one device connection at a time.

**Q: What's the maximum recording duration?**
A: Limited by available disk space. Approximately 1GB per hour of recording.

**Q: Is the SDK compatible with all operating systems?**
A: Supports Windows 10+, macOS 10.14+, and Ubuntu 18.04+.

**Q: How do I export data to other analysis software?**
A: Use the export feature in Data Center to export in CSV or JSON format.

**Q: What should I do if the device firmware needs updating?**
A: Contact Looxid Labs support for firmware update procedures. 