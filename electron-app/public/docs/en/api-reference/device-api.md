# Device API

Device API is a RESTful API for searching, connecting, and managing Link Band 2.0 devices. You can programmatically control devices and monitor their status.

## Basic Information

- **Base URL**: `http://localhost:8121`
- **Content-Type**: `application/json`
- **Authentication**: None (local server)

## Endpoint Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/device/scan` | Scan for nearby devices |
| POST | `/device/connect` | Connect to device |
| DELETE | `/device/disconnect` | Disconnect device |
| GET | `/device/status` | Get device status |
| GET | `/device/list` | List connected devices |
| PUT | `/device/settings` | Change device settings |

## Device Scanning

### `GET /device/scan`

Scans for nearby Link Band devices.

**Request**
```http
GET /device/scan HTTP/1.1
Host: localhost:8121
```

**Response**
```json
{
  "status": "success",
  "data": {
    "devices": [
      {
        "id": "015F2A8E-3772-FB6D-2197-548F305983B0",
        "name": "Link Band 2.0",
        "rssi": -45,
        "battery": 85,
        "is_connected": false,
        "is_connectable": true,
        "last_seen": "2024-01-15T10:30:25Z"
      },
      {
        "id": "A1B2C3D4-5678-90EF-GHIJ-KLMNOPQRSTUV",
        "name": "Link Band 2.0",
        "rssi": -65,
        "battery": 42,
        "is_connected": true,
        "is_connectable": false,
        "last_seen": "2024-01-15T10:29:18Z"
      }
    ],
    "scan_duration": 15.2,
    "total_found": 2
  },
  "timestamp": "2024-01-15T10:30:25Z"
}
```
   Note: RSSI may not function properly due to library issues.
  
**Response Field Description**
- `id`: Device unique identifier (UUID)
- `name`: Device name
- `rssi`: Signal strength (dBm, higher values indicate stronger signal)
   - Note: RSSI may not function properly due to library issues.
- `battery`: Battery level (%)
- `is_connected`: Current connection status
- `is_connectable`: Whether device is connectable
- `last_seen`: Last seen timestamp

**Error Response**
```json
{
  "status": "error",
  "error": {
    "code": "BLUETOOTH_ERROR",
    "message": "Bluetooth adapter not found",
    "details": "Please check if Bluetooth is enabled"
  },
  "timestamp": "2024-01-15T10:30:25Z"
}
```

## Device Connection

### `POST /device/connect`

Connects to a specific device.

**Request**
```http
POST /device/connect HTTP/1.1
Host: localhost:8121
Content-Type: application/json

{
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timeout": 30,
  "auto_reconnect": true
}
```

**Request Fields**
- `device_id` (required): Device ID to connect
- `timeout` (optional): Connection timeout in seconds (default: 30)
- `auto_reconnect` (optional): Auto-reconnect enabled (default: true)

**Response**
```json
{
  "status": "success",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "connection_status": "connected",
    "connection_time": 8.5,
    "device_info": {
      "name": "Link Band 2.0",
      "firmware_version": "2.1.3",
      "hardware_version": "1.0",
      "serial_number": "LB2024001234",
      "battery": 85,
      "rssi": -42
    },
    "sensor_status": {
      "eeg": {
        "enabled": true,
        "sampling_rate": 250,
        "channels": ["Fp1", "Fp2"],
        "contact_quality": [95, 87]
      },
      "ppg": {
        "enabled": true,
        "sampling_rate": 25,
        "contact_quality": 92
      },
      "acc": {
        "enabled": true,
        "sampling_rate": 50,
        "axes": ["x", "y", "z"]
      }
    }
  },
  "timestamp": "2024-01-15T10:31:15Z"
}
```

**Error Response**
```json
{
  "status": "error",
  "error": {
    "code": "CONNECTION_FAILED",
    "message": "Failed to connect to device",
    "details": "Device not found or already connected to another device"
  },
  "timestamp": "2024-01-15T10:31:15Z"
}
```

## Device Disconnection

### `DELETE /device/disconnect`

Disconnects from the device.

**Request**
```http
DELETE /device/disconnect HTTP/1.1
Host: localhost:8121
Content-Type: application/json

{
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0"
}
```

**Response**
```json
{
  "status": "success",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "disconnection_status": "disconnected",
    "last_connection_duration": 1847.3
  },
  "timestamp": "2024-01-15T11:02:42Z"
}
```

## Device Status

### `GET /device/status`

Gets the current status of connected devices.

**Request**
```http
GET /device/status?device_id=015F2A8E-3772-FB6D-2197-548F305983B0 HTTP/1.1
Host: localhost:8121
```

**Response**
```json
{
  "status": "success",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "connection_status": "connected",
    "battery": {
      "level": 78,
      "voltage": 3.7,
      "is_charging": false,
      "estimated_time_remaining": 420
    },
    "signal_quality": {
      "eeg_ch1": 95,
      "eeg_ch2": 87,
      "ppg": 92,
      "overall": 91
    },
    "sensor_contact": {
      "eeg_fp1": "good",
      "eeg_fp2": "fair", 
      "ppg": "good"
    },
    "data_streaming": {
      "is_active": true,
      "samples_per_second": {
        "eeg": 250.0,
        "ppg": 25.0,
        "acc": 50.0
      },
      "data_loss_rate": 0.02
    },
    "device_temperature": 32.5,
    "uptime": 1847.3
  },
  "timestamp": "2024-01-15T11:02:42Z"
}
```

## Device Settings

### `PUT /device/settings`

Changes the device settings.

**Request**
```http
PUT /device/settings HTTP/1.1
Host: localhost:8121
Content-Type: application/json

{
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "settings": {
    "sampling_rates": {
      "eeg": 250,
      "ppg": 25,
      "acc": 50
    },
    "filters": {
      "highpass": 0.5,
      "lowpass": 125,
      "notch": 50
    },
    "power_management": {
      "auto_sleep": true,
      "sleep_timeout": 300
    }
  }
}
```

**Response**
```json
{
  "status": "success",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "settings_applied": {
      "sampling_rates": {
        "eeg": 250,
        "ppg": 25,
        "acc": 50
      },
      "filters": {
        "highpass": 0.5,
        "lowpass": 125,
        "notch": 50
      },
      "power_management": {
        "auto_sleep": true,
        "sleep_timeout": 300
      }
    },
    "restart_required": false
  },
  "timestamp": "2024-01-15T11:05:18Z"
}
```

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `BLUETOOTH_ERROR` | Bluetooth adapter error | Check if Bluetooth is enabled |
| `DEVICE_NOT_FOUND` | Device not found | Scan for devices and try again |
| `CONNECTION_FAILED` | Connection failed | Check device status and distance |
| `CONNECTION_TIMEOUT` | Connection timeout | Increase timeout value or try again |
| `DEVICE_BUSY` | Device in use | Disconnect other connections and try again |
| `INVALID_SETTINGS` | Invalid setting value | Check setting value range |
| `PERMISSION_DENIED` | Permission denied | Run as administrator |

## Usage Examples

### Python Example

```python
import requests
import json

# Base URL
BASE_URL = "http://localhost:8121"

def scan_devices():
    """Scan devices"""
    response = requests.get(f"{BASE_URL}/device/scan")
    if response.status_code == 200:
        data = response.json()
        return data['data']['devices']
    else:
        print(f"Error: {response.status_code}")
        return []

def connect_device(device_id):
    """Connect to device"""
    payload = {
        "device_id": device_id,
        "timeout": 30,
        "auto_reconnect": True
    }
    response = requests.post(
        f"{BASE_URL}/device/connect",
        json=payload
    )
    return response.json()

def get_device_status(device_id):
    """Get device status"""
    response = requests.get(
        f"{BASE_URL}/device/status",
        params={"device_id": device_id}
    )
    return response.json()

# Usage example
if __name__ == "__main__":
    # 1. Scan devices
    devices = scan_devices()
    print(f"Found devices: {len(devices)}")
    
    if devices:
        # 2. Connect to the first device
        device_id = devices[0]['id']
        result = connect_device(device_id)
        
        if result['status'] == 'success':
            print(f"Connection successful: {device_id}")
            
            # 3. Get device status
            status = get_device_status(device_id)
            battery = status['data']['battery']['level']
            print(f"Battery: {battery}%")
        else:
            print(f"Connection failed: {result['error']['message']}")
```

### JavaScript Example

```javascript
const BASE_URL = 'http://localhost:8121';

class DeviceAPI {
    async scanDevices() {
        try {
            const response = await fetch(`${BASE_URL}/device/scan`);
            const data = await response.json();
            return data.status === 'success' ? data.data.devices : [];
        } catch (error) {
            console.error('Scan error:', error);
            return [];
        }
    }

    async connectDevice(deviceId, options = {}) {
        const payload = {
            device_id: deviceId,
            timeout: options.timeout || 30,
            auto_reconnect: options.autoReconnect || true
        };

        try {
            const response = await fetch(`${BASE_URL}/device/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            console.error('Connection error:', error);
            return { status: 'error', error: { message: error.message } };
        }
    }

    async getDeviceStatus(deviceId) {
        try {
            const response = await fetch(
                `${BASE_URL}/device/status?device_id=${deviceId}`
            );
            return await response.json();
        } catch (error) {
            console.error('Status retrieval error:', error);
            return { status: 'error', error: { message: error.message } };
        }
    }
}

// Usage example
async function main() {
    const api = new DeviceAPI();
    
    // 1. Scan devices
    const devices = await api.scanDevices();
    console.log(`Found devices: ${devices.length}`);
    
    if (devices.length > 0) {
        // 2. Connect to the first device
        const deviceId = devices[0].id;
        const result = await api.connectDevice(deviceId);
        
        if (result.status === 'success') {
            console.log(`Connection successful: ${deviceId}`);
            
            // 3. Get device status
            const status = await api.getDeviceStatus(deviceId);
            const battery = status.data.battery.level;
            console.log(`Battery: ${battery}%`);
        } else {
            console.log(`Connection failed: ${result.error.message}`);
        }
    }
}

main();
```

## Best Practices

### 1. Connection Management
- Always scan for devices before connecting
- Set appropriate connection timeout (10-30 seconds)
- Use auto-reconnect feature
- Explicitly disconnect after use

### 2. Error Handling
- Use try-catch statements for all API calls
- Implement appropriate response logic for each error code
- Implement retry mechanism (max 3 retries)
- Provide clear error messages to users

### 3. Performance Optimization
- Minimize unnecessary status checks
- Batch processable tasks
- Consider WebSocket usage (for real-time data)
- Set appropriate polling interval (2-5 seconds)

## Next Steps

If you've mastered Device API usage:
1. Learn data streaming methods in [Stream API](stream-api.md)
2. Check real-time data reception methods in [WebSocket Integration](websocket-integration.md)
3. View more actual usage examples in [Python Examples](../examples/python-examples.md) 