# First Steps

This is a step-by-step guide for first-time users of Link Band SDK. Following this guide, you can collect your first EEG data within 5 minutes.

## Step 1: Launch SDK and Start Engine

### Launch SDK
Run the installed Link Band SDK.
- **Windows**: Click "Link Band SDK" from the start menu or desktop
- **macOS**: Run "Link Band SDK" from the Applications folder
- **Linux**: Run `link-band-sdk` from terminal or execute AppImage

### Start Engine Module
1. Click **"Engine"** in the left menu
2. Click the **"Start"** button
3. Check the server startup logs
4. Wait until the status changes to **"Started"** (approximately 2-5 seconds)

> **💡 Tip**: If the Engine doesn't start, check the [Troubleshooting](../examples/faq.md#engine-start-issues) page.

## Step 2: Connect Link Band Device

### Device Preparation
1. Prepare your **Link Band 2.0** device
2. Ensure the device is **charged** (check LED indicator)
3. **Wear the device** on your head
   - Adjust so electrodes make good contact with forehead and behind ears
   - Wear comfortably without over-tightening

### Device Connection
1. Click **"Link Band"** in the left menu
2. Click the **"Scan"** button to search for devices
3. Check your device in the detected device list
4. Use Register to register the device
5. The SDK will **automatically connect to the registered device**
6. Verify that the connection status changes to **"Connected"**

### Check Sensor Contact
After connection, check the **"Sensor Contact"** status in the top status bar:
- **🟢 Contacted**: Sensors are well contacted (data collection possible)
- **🔴 Not Contact**: Poor sensor contact (re-wear device and check sensor position)

## Step 3: Check Real-time Data

### Open Visualizer Module
1. Click **"Visualizer"** in the left menu
2. Verify that real-time graphs are displayed

### Start Data Stream
1. Click the **"Start Streaming"** button
2. Verify that the following data is displayed in real-time:
   - **EEG**: 2-channel EEG signals
   - **PPG**: Heart rate signals
   - **ACC**: Motion data

### Check Signal Quality
- **EEG Graph**: Regular waveforms should appear
- **PPG Graph**: Check periodic waveforms according to heartbeat
- **Signal Quality**: Check quality index for each signal

## Step 4: First Data Recording

### Start Recording
1. Click **"Data Center"** in the left menu
2. Click the **"Start Recording"** button
3. Verify that the recording status changes to **"Recording"**
4. Check that recording time is counting in the bottom status bar

### Perform Test Activities
During recording, try these simple activities:
- **30 seconds rest with eyes closed** (Total Power and related index changes)
- **30 seconds simple calculation** (Beta wave increase, Cognitive Load increase)
- **30 seconds deep breathing** (BPM and HRV related index changes)

### Stop Recording
1. Click the **"Stop Recording"** button
2. Verify that the session is automatically saved
3. Check saved files in the **"Session List"** tab
4. Use **"Open"** or **"Export"** to download files

## Step 5: Check and Export Data

### Check Saved Data
In the **"Session List"** tab of Data Center:
1. Click the **"Open"** button for the session folder you just recorded
2. Verify that the following files have been created:
   - `*_eeg_raw.json`: Raw EEG data
   - `*_eeg_processed.json`: Processed EEG data
   - `*_ppg_raw.json`: Raw PPG data
   - `*_ppg_processed.json`: Processed PPG data
   - `*_acc_raw.json`: Accelerometer data
   - `*_acc_processed.json`: Processed accelerometer data
   - `*_bat.json`: Battery data

### Export Data (Optional)
1. Click the **"Export"** button
2. Check the location of exported files
3. Verify that JSON files are inside the zip file
4. Process JSON with Python or your preferred method

## Understanding Status Bar Information

You can check the following information in real-time from the bottom status bar:

### System Status
- **Streaming**: Data streaming status (ACTIVE/INACTIVE)
- **Recording**: Recording status (shows recording time/IDLE)
- **Clients**: Number of connected clients

### Signal Information
- **EEG**: EEG sampling rate (e.g., 250.0 Hz)
- **PPG**: PPG sampling rate (e.g., 50.0 Hz)
- **ACC**: Accelerometer sampling rate (e.g., 25.0 Hz)
- **Battery**: Device battery level (%)

### System Metrics
- **CPU**: Processor usage (%)
- **RAM**: Memory usage (MB)
- **Disk**: Disk usage (MB)

## Next Steps

Congratulations! You've completed your first EEG data collection. Now proceed with the following steps:

### Learn More Detailed Usage
- [Visualizer Module](../user-guide/visualizer-module.md): Real-time visualization and analysis
- [Data Center Module](../user-guide/datacenter-module.md): Data management and export

### Information for Developers
- [API Reference](../api-reference/stream-api.md): REST API usage
- [Python Examples](../examples/python-integration.md): Data collection with Python

### Troubleshooting
If problems occur, use the following resources:
- [FAQ](../examples/faq.md): Frequently Asked Questions
- [GitHub Issues](https://github.com/looxid-labs/link-band-sdk/issues): Technical support

> **🎉 Successfully Completed!**
> 
> You've learned the basic usage of Link Band SDK. Now start your project utilizing EEG data in earnest! 