# Link Band Module

The Link Band module is responsible for connecting, managing, and configuring Link Band 2.0 devices. It provides all device-related functions from Bluetooth connection to sensor status monitoring.

## Overview

Main features of the Link Band module:
- **Device Discovery**: Scan for nearby Link Band devices
- **Connection Management**: Connect/disconnect devices
- **Status Monitoring**: Battery, signal quality, sensor contact status
- **Device Settings**: Sampling rate, filter settings, etc.

## Interface Components

### Device Control Panel
- **Scan Button**: Search for nearby devices
- **Connect/Disconnect Button**: Connect/disconnect devices
- **Device List**: List of discovered devices
- **Connection Status**: Current connection status display

### Device Information Panel
- **Device ID**: Unique identifier of connected device
- **Battery Status**: Real-time battery level (%)

### Sensor Status Panel
- **EEG Sensor**: EEG sensor contact status
- **PPG Sensor**: PPG sensor contact status
- **Accelerometer**: Motion sensor status
- **Overall Contact Status**: Comprehensive sensor contact quality

## Connecting Devices

### 1. Device Preparation
Before connecting, verify the following:

**Device Status Check**
- Verify Link Band 2.0 is charged (check LED indicator)
- Confirm device is in pairing mode (rapidly blinking blue LED)
- Ensure device is not connected to other devices

**Wearing Preparation**
- Wear comfortably on head
- Apply moderate pressure, not too tight

### 2. Device Discovery
1. Click the Link Band module
2. Click the **"Scan"** button
3. Wait for the search process (10-30 seconds)
4. Check your device in the device list
5. After selection, press Register button to add to Registered Device list

**Search Results Example**
```
Discovered Devices:
├── Link Band 2.0 (015F2A8E-3772-FB6D-2197-548F305983B0)
│   └── Battery: 85%
└── Link Band 2.0 (A1B2C3D4-5678-90EF-GHIJ-KLMNOPQRSTUV)
    └── Battery: 42%
```

### 3. Device Connection
1. Select the device to connect from the device list
2. Click the **"Connect"** button
3. Wait for the connection process (2-5 seconds)
4. Verify that connection status changes to **"Connected"**

**Connection Process**
```
[INFO] Attempting connection...
[INFO] Bluetooth pairing complete
[INFO] Device authentication in progress...
[INFO] Sensor initialization in progress...
[INFO] Data streaming ready
[INFO] Connection successful!
```

## Checking Sensor Contact Status

### Understanding Contact Status
After device connection, it's important to check sensor contact status:

**EEG Sensor Contact**
- **Contacted**: Excellent contact (impedance < 50kΩ)
- **Not Contacted**: Poor contact (impedance > 50kΩ)

### Methods to Improve Contact Status

**Improving EEG Sensor Contact**
1. Adjust electrode position on forehead
2. Arrange hair so it doesn't touch electrodes
3. If necessary, lightly wipe electrode area with damp cloth
4. Move device slightly forward/backward to find optimal position

**Improving PPG Sensor Contact**
1. Check red LED sensor position on forehead
2. Ensure electrodes make direct contact with skin
3. Remove obstructions like hair
4. Adjust device length to secure device with appropriate pressure

## Battery Management

### Battery Status Monitoring
You can check real-time battery status in the Link Band module and bottom status bar:

- **90-100%**: Fully charged
- **70-89%**: Sufficient
- **50-69%**: Normal
- **30-49%**: Caution
- **10-29%**: Low
- **0-9%**: Critical

### Battery Saving Tips
- Disconnect device when not in use
- Disable unnecessary sensors (in settings)
- High sampling rates increase battery consumption
- Charge device regularly (2-3 times per week recommended)

### Low Power Mode
Low power mode is automatically activated when battery is low:
- Automatic sampling rate reduction
- Some sensors disabled
- Increased Bluetooth transmission intervals
- Reduced LED indicator brightness

## Advanced Settings

### Sampling Rate Adjustment
You can adjust sampling rates to balance data quality and battery life:

**EEG Sampling Rate**
- **250 Hz**: Standard (recommended)

**PPG Sampling Rate**
- **50 Hz**: High resolution

## Connection Troubleshooting

### Common Connection Issues

**Device Not Found**
1. Verify device is in pairing mode (LED blinking every 1 second)
2. Maintain distance within 2m from device
3. Check interference from other Bluetooth devices
4. Restart Bluetooth adapter

**Frequent Disconnections**
1. Check signal strength (RSSI > -70 dBm recommended)
2. Remove obstacles between device and computer
3. Check battery status (30% or higher recommended)

**Unstable Sensor Contact**
1. Readjust device wearing position
2. Clean electrode area (use alcohol swab)
3. Remove hair or cosmetics
4. Adjust device band length

### Advanced Troubleshooting

**Device Reset**
If connection problems persist, you can reset the device:
1. Hold device power button for 5 seconds
2. Wait until all LEDs turn off
3. Press power button again to restart
4. Switch to pairing mode and reconnect

**Bluetooth Cache Clear**
- **Windows**: Remove and reinstall Bluetooth adapter in Device Manager
- **macOS**: Remove device in System Preferences > Bluetooth and re-pair
- **Linux**: Run `sudo systemctl restart bluetooth`

## Data Quality Optimization

### Signal Quality Index (SQI)
Real-time monitoring of data quality for each sensor:
- **70-100%**: Excellent (research-grade data quality)
- **0-70%**: High noise (should be excluded from analysis)

### Quality Improvement Methods
1. **Environment Optimization**: Minimize electromagnetic interference
2. **Wearing Optimization**: Improve sensor contact status
3. **Movement Minimization**: Avoid excessive movement during data collection
4. **Filter Adjustment**: Set filters appropriate for noise

## Next Steps

Once you've completed Link Band device connection:
1. Learn real-time data visualization methods in [Visualizer Module](visualizer-module.md)
2. Check data storage and management methods in [Data Center Module](datacenter-module.md)
3. Learn how to control devices programmatically in [API Reference](../api-reference/device-api.md) 