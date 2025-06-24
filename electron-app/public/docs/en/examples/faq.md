# Frequently Asked Questions (FAQ)

Common questions and solutions encountered while using the Link Band SDK.

## Installation and Setup

### Q1. The SDK doesn't run after installation.

**A1.** Please check the following:

1. **System Requirements Check**
   - Windows 10/11, macOS 10.15+, Ubuntu 18.04+
   - Minimum 4GB RAM, 2GB free space

2. **Firewall Settings**
   - Port 8121 (HTTP API)
   - Port 18765 (WebSocket)

3. **Permission Settings (macOS)**
   ```bash
   # Grant application execution permission
   sudo xattr -rd com.apple.quarantine /Applications/Link\ Band\ SDK.app
   ```

### Q2. Link Band device is not detected during scan.

**A2.** Please check the following:

1. **Bluetooth Connection Check**
   - Verify Bluetooth is enabled
   - Confirm device is in pairing mode

2. **Device Status Check**
   - Verify Link Band is powered on
   - Check battery level
   - Check LED status

3. **Permission Settings (Linux)**
   ```bash
   # Set Bluetooth permissions
   sudo usermod -a -G dialout $USER
   ```

## Data Collection

### Q3. Connection drops during data collection.

**A3.** Solutions for connection stability:

1. **Distance Check**
   - Keep distance between device and computer within 5m
   - Remove obstacles

2. **Interference Removal**
   - Turn off other Bluetooth devices
   - Minimize interference with WiFi 2.4GHz band

3. **Reconnection Settings**
   ```python
   # Auto-reconnection code
   def auto_reconnect():
       max_retries = 3
       for i in range(max_retries):
           try:
               result = controller.connect_device(device_id)
               if result["success"]:
                   return True
           except:
               time.sleep(2)
       return False
   ```

### Q4. Sensor data quality is poor.

**A4.** Methods to improve signal quality:

1. **Electrode Contact Check**
   - Check contact between skin and electrodes
   - Use conductive gel if necessary
   - Remove hair or oil

2. **Minimize Movement**
   - Minimize movement during measurement
   - Maintain comfortable posture

3. **Environment Improvement**
   - Minimize electromagnetic interference
   - Measure in quiet environment

## Data Analysis

### Q5. EEG signal shows a lot of noise.

**A5.** Noise removal methods:

1. **Hardware Noise**
   - Use filtering options provided by SDK
   - Utilize signal quality monitoring

2. **Movement Artifacts**
   - Minimize movement during measurement
   - Check Signal Quality Index (SQI)

### Q6. PPG heart rate measurement is inaccurate.

**A6.** Heart rate measurement improvement:

1. **Sensor Position Adjustment**
   - Position on back of wrist, over radial artery
   - Wear neither too tight nor too loose

2. **Signal Quality Check**
   - Check PPG signal waveform in Visualizer
   - Monitor signal quality index

## API Usage

### Q7. Timeout occurs during API calls.

**A7.** Timeout resolution methods:

1. **Increase Timeout Settings**
   ```python
   import requests
   
   response = requests.get(
       "http://localhost:8121/data/sessions",
       timeout=30  # Increase to 30 seconds
   )
   ```

2. **Check Server Status**
   - Check server status in Engine module
   - Check error messages in log files

### Q8. WebSocket connection drops frequently.

**A8.** WebSocket stability improvement:

1. **Implement Reconnection Logic**
   ```python
   import websocket
   import time
   
   class StableWebSocket:
       def __init__(self, url):
           self.url = url
           self.ws = None
           self.should_reconnect = True
           
       def connect(self):
           try:
               self.ws = websocket.WebSocketApp(
                   self.url,
                   on_open=self.on_open,
                   on_message=self.on_message,
                   on_error=self.on_error,
                   on_close=self.on_close
               )
               self.ws.run_forever()
           except Exception as e:
               print(f"Connection error: {e}")
               if self.should_reconnect:
                   time.sleep(5)
                   self.connect()
   ```

2. **Check Network Status**
   - Check firewall settings
   - Verify port 18765 accessibility

## Data Management

### Q9. Cannot find saved data.

**A9.** Check data storage location:

**Windows**
```
%USERPROFILE%\Documents\Link Band SDK\sessions\
```

**macOS**
```
~/Documents/Link Band SDK/sessions/
```

**Linux**
```
~/Documents/Link Band SDK/sessions/
```

### Q10. Data export fails.

**A10.** Export troubleshooting:

1. **Check Storage Space**
   - Verify sufficient disk space available

2. **Check Permissions**
   - Verify write permissions for export directory
   - Check file access permissions

3. **Check Export Format**
   - Verify supported export format
   - Check file size limitations

## Performance Issues

### Q11. SDK runs slowly.

**A11.** Performance optimization:

1. **System Resources**
   - Close unnecessary applications
   - Check CPU and memory usage
   - Ensure sufficient RAM available

2. **Data Processing**
   - Reduce real-time processing load
   - Adjust visualization update frequency
   - Use data filtering options

### Q12. High CPU usage.

**A12.** CPU usage reduction:

1. **Processing Settings**
   ```python
   # Reduce processing frequency
   config = {
       "processing_interval": 1.0,  # Process every 1 second
       "visualization_fps": 30,     # Reduce FPS
       "buffer_size": 1000         # Adjust buffer size
   }
   ```

2. **Resource Management**
   - Close unused modules
   - Reduce concurrent connections
   - Optimize data storage

## Device Issues

### Q13. Device battery drains quickly.

**A13.** Battery optimization:

1. **Connection Settings**
   - Reduce transmission frequency
   - Use power-saving mode when available
   - Disconnect when not in use

2. **Usage Patterns**
   - Avoid continuous long sessions
   - Monitor battery level regularly
   - Charge device regularly

### Q14. Device firmware update fails.

**A14.** Firmware update troubleshooting:

1. **Pre-update Checks**
   - Ensure device battery > 50%
   - Maintain stable Bluetooth connection
   - Close other applications

2. **Update Process**
   - Use official firmware files only
   - Follow update procedure exactly
   - Do not interrupt update process

## Integration Issues

### Q15. Integration with external software fails.

**A15.** Integration solutions:

1. **API Compatibility**
   - Check API version compatibility
   - Verify data format requirements
   - Test with sample data first

2. **Data Format**
   ```python
   # Convert data format
   def convert_to_external_format(sdk_data):
       external_format = {
           "timestamp": sdk_data["timestamp"],
           "channels": sdk_data["data"],
           "sampling_rate": 250
       }
       return external_format
   ```

### Q16. Real-time streaming to external application doesn't work.

**A16.** Streaming solutions:

1. **Network Configuration**
   - Check port availability
   - Configure firewall exceptions
   - Test local connections first

2. **Data Pipeline**
   ```python
   # Real-time data forwarding
   import socket
   
   def forward_data_to_external(data, host, port):
       try:
           sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
           sock.connect((host, port))
           sock.send(json.dumps(data).encode())
           sock.close()
       except Exception as e:
           print(f"Forwarding error: {e}")
   ```

## Error Messages

### Q17. "Device not responding" error appears.

**A17.** Device response troubleshooting:

1. **Connection Check**
   - Verify Bluetooth connection
   - Check device power status
   - Try reconnecting device

2. **Reset Procedures**
   - Restart SDK application
   - Reset Bluetooth adapter
   - Power cycle the device

### Q18. "Data corruption detected" error appears.

**A18.** Data corruption solutions:

1. **Signal Quality**
   - Check electrode connections
   - Verify signal quality metrics
   - Reduce electromagnetic interference

2. **Storage Check**
   - Verify disk space availability
   - Check file system integrity
   - Use different storage location

## Advanced Troubleshooting

### Q19. Custom signal processing doesn't work.

**A19.** Signal processing troubleshooting:

1. **Algorithm Validation**
   ```python
   # Test with known data
   def test_custom_algorithm():
       test_data = generate_test_signal()
       result = custom_processing_function(test_data)
       validate_result(result)
   ```

2. **Performance Optimization**
   - Profile algorithm performance
   - Optimize computational complexity
   - Use vectorized operations

### Q20. Multiple device support issues.

**A20.** Multi-device solutions:

1. **Device Management**
   ```python
   # Multi-device connection manager
   class MultiDeviceManager:
       def __init__(self):
           self.devices = {}
           
       def connect_device(self, device_id):
           # Individual device connection logic
           pass
           
       def manage_data_streams(self):
           # Handle multiple data streams
           pass
   ```

2. **Data Synchronization**
   - Implement timestamp synchronization
   - Handle different sampling rates
   - Manage concurrent data streams

## Getting Help

If you cannot find a solution to your problem in this FAQ:

1. **Check Documentation**
   - Review API Reference
   - Check User Guide sections
   - Look at code examples

2. **Contact Support**
   - Provide detailed error descriptions
   - Include system information
   - Share relevant log files

3. **Community Resources**
   - Check community forums
   - Search for similar issues
   - Share solutions with others

## Quick Reference

### Common Commands

```bash
# Check SDK status
curl http://localhost:8121/health

# List connected devices
curl http://localhost:8121/device/list

# Check recording status
curl http://localhost:8121/data/recording-status
```

### Log File Locations

- **Windows**: `%APPDATA%\Link Band SDK\logs\`
- **macOS**: `~/Library/Logs/Link Band SDK/`
- **Linux**: `~/.local/share/Link Band SDK/logs/`

### Default Ports

- **HTTP API**: 8121
- **WebSocket**: 18765
- **Device Communication**: Auto-assigned 