# Stream API

Real-time data streaming WebSocket API for Link Band SDK.

## WebSocket Connection

```
ws://localhost:8121
```

## Message Format

### Client → Server

All client messages follow this format:

```json
{
  "type": "command",
  "command": "command_name",
  "payload": {
    // Additional command-specific data
  }
}
```

### Server → Client

The server sends the following types of messages:

1. **Event Messages**
```json
{
  "type": "event",
  "event_type": "event_type",
  "data": {
    // Event-specific data
  }
}
```

2. **Sensor Data Messages**
```json
{
  "type": "raw_data" | "processed_data" | "sensor_data",
  "sensor_type": "eeg" | "ppg" | "acc" | "bat",
  "device_id": "device_MAC_address",
  "timestamp": 1234567890.123,
  "data": [
    // Sensor-specific data array
  ]
}
```

## Commands

### 1. Check Device Connection Status

**Request:**
```json
{
  "type": "command",
  "command": "check_device_connection"
}
```

**Response:** Sends current status via `device_info` event

### 2. Check Bluetooth Status

**Request:**
```json
{
  "type": "command",
  "command": "check_bluetooth_status"
}
```

**Response:**
```json
{
  "type": "event",
  "event_type": "bluetooth_status",
  "data": {
    "available": true,
    "message": "Bluetooth is available"
  }
}
```

### 3. Scan Devices

**Request:**
```json
{
  "type": "command",
  "command": "scan_devices"
}
```

**Response:**
```json
{
  "type": "event",
  "event_type": "scan_result",
  "data": {
    "status": "scanning" | "completed" | "failed",
    "devices": [
      {
        "name": "Link Band",
        "address": "AA:BB:CC:DD:EE:FF",
        "rssi": -45
      }
    ],
    "error": "Error message (on failure)"
  }
}
```

### 4. Connect Device

**Request:**
```json
{
  "type": "command",
  "command": "connect_device",
  "payload": {
    "address": "AA:BB:CC:DD:EE:FF"
  }
}
```

**Response:** `device_connected` or `device_connection_failed` event

### 5. Disconnect Device

**Request:**
```json
{
  "type": "command",
  "command": "disconnect_device"
}
```

**Response:** `device_disconnected` event

### 6. Start Streaming

**Request:**
```json
{
  "type": "command",
  "command": "start_streaming"
}
```

**Response:** `stream_started` event and real-time data stream begins

### 7. Stop Streaming

**Request:**
```json
{
  "type": "command",
  "command": "stop_streaming"
}
```

**Response:** `stream_stopped` event and data stream ends

### 8. Health Check

**Request:**
```json
{
  "type": "command",
  "command": "health_check"
}
```

**Response:**
```json
{
  "type": "health_check_response",
  "status": "ok",
  "clients_connected": 1,
  "is_streaming": true,
  "device_connected": true
}
```

## Event Types

### 1. device_info
Delivers device connection status and information.

```json
{
  "type": "event",
  "event_type": "device_info",
  "data": {
    "connected": true,
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "device_name": "Link Band",
    "battery_level": 85,
    "firmware_version": "1.2.3",
    "signal_quality": {
      "eeg": 0.95,
      "ppg": 0.88,
      "acc": 0.92
    }
  }
}
```

### 2. device_connected
Sent when device connection is successful.

```json
{
  "type": "event",
  "event_type": "device_connected",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "device_name": "Link Band",
    "connection_time": "2024-01-01T12:00:00.000Z",
    "battery_level": 85,
    "firmware_version": "1.2.3"
  }
}
```

### 3. device_disconnected
Sent when device is disconnected.

```json
{
  "type": "event",
  "event_type": "device_disconnected",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "reason": "user_initiated",
    "disconnection_time": "2024-01-01T12:30:00.000Z"
  }
}
```

### 4. device_connection_failed
Sent when device connection fails.

```json
{
  "type": "event",
  "event_type": "device_connection_failed",
  "data": {
    "device_address": "AA:BB:CC:DD:EE:FF",
    "error": "Connection timeout",
    "error_code": "TIMEOUT",
    "retry_count": 3
  }
}
```

### 5. stream_started
Sent when data streaming begins.

```json
{
  "type": "event",
  "event_type": "stream_started",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "sensors": ["eeg", "ppg", "acc"],
    "sampling_rates": {
      "eeg": 250,
      "ppg": 50,
      "acc": 25
    },
    "start_time": "2024-01-01T12:00:00.000Z"
  }
}
```

### 6. stream_stopped
Sent when data streaming ends.

```json
{
  "type": "event",
  "event_type": "stream_stopped",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "stop_time": "2024-01-01T12:05:00.000Z",
    "duration": 300.0,
    "total_samples": {
      "eeg": 75000,
      "ppg": 15000,
      "acc": 7500
    }
  }
}
```

### 7. battery_status
Sent periodically with battery information.

```json
{
  "type": "event",
  "event_type": "battery_status",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "battery_level": 75,
    "is_charging": false,
    "voltage": 3.7,
    "estimated_time_remaining": 7200
  }
}
```

### 8. signal_quality
Real-time signal quality information.

```json
{
  "type": "event",
  "event_type": "signal_quality",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "timestamp": 1234567890.123,
    "quality": {
      "eeg": {
        "overall": 0.95,
        "channels": [0.94, 0.96, 0.93, 0.97],
        "noise_level": 0.05
      },
      "ppg": {
        "overall": 0.88,
        "snr": 15.2,
        "motion_artifact": 0.12
      },
      "acc": {
        "overall": 0.92,
        "stability": 0.95
      }
    }
  }
}
```

## Sensor Data

### EEG Data

**Raw Data:**
```json
{
  "type": "raw_data",
  "sensor_type": "eeg",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "sample_id": 1001,
      "timestamp": 1234567890.123,
      "channels": [125.3, 98.7, 156.2, 87.9]
    }
  ]
}
```

**Processed Data:**
```json
{
  "type": "processed_data",
  "sensor_type": "eeg",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "sample_id": 1001,
      "timestamp": 1234567890.123,
      "channels": [0.125, 0.098, 0.156, 0.087],
      "filtered": [0.120, 0.095, 0.150, 0.085],
      "artifacts_removed": true,
      "quality_index": 0.95
    }
  ]
}
```

### PPG Data

**Raw Data:**
```json
{
  "type": "raw_data",
  "sensor_type": "ppg",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "sample_id": 501,
      "timestamp": 1234567890.123,
      "red": 65432,
      "infrared": 54321,
      "green": 43210
    }
  ]
}
```

**Processed Data:**
```json
{
  "type": "processed_data",
  "sensor_type": "ppg",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "sample_id": 501,
      "timestamp": 1234567890.123,
      "heart_rate": 72.5,
      "hrv": 45.2,
      "signal_quality": 0.88,
      "raw_values": {
        "red": 65432,
        "infrared": 54321,
        "green": 43210
      }
    }
  ]
}
```

### ACC Data

**Raw Data:**
```json
{
  "type": "raw_data",
  "sensor_type": "acc",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "sample_id": 251,
      "timestamp": 1234567890.123,
      "x": 0.125,
      "y": -0.987,
      "z": 0.156
    }
  ]
}
```

**Processed Data:**
```json
{
  "type": "processed_data",
  "sensor_type": "acc",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "sample_id": 251,
      "timestamp": 1234567890.123,
      "acceleration": {
        "x": 0.125,
        "y": -0.987,
        "z": 0.156
      },
      "magnitude": 1.023,
      "activity_level": "low",
      "motion_detected": false
    }
  ]
}
```

### Battery Data

```json
{
  "type": "sensor_data",
  "sensor_type": "bat",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "battery_level": 75,
      "voltage": 3.7,
      "is_charging": false,
      "temperature": 25.5,
      "estimated_time_remaining": 7200
    }
  ]
}
```

## Error Handling

### Error Event Format

```json
{
  "type": "error",
  "error_code": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "context": "Additional error context"
  }
}
```

### Common Error Codes

- `DEVICE_NOT_FOUND`: Device not found during scan
- `CONNECTION_FAILED`: Failed to connect to device
- `BLUETOOTH_UNAVAILABLE`: Bluetooth not available
- `STREAMING_ERROR`: Error during data streaming
- `INVALID_COMMAND`: Invalid command format
- `PERMISSION_DENIED`: Insufficient permissions
- `TIMEOUT`: Operation timeout

## Usage Examples

### JavaScript/TypeScript

```typescript
const ws = new WebSocket('ws://localhost:8121');

ws.onopen = () => {
  console.log('Connected to Link Band SDK');
  
  // Check device connection
  ws.send(JSON.stringify({
    type: 'command',
    command: 'check_device_connection'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'event':
      handleEvent(message);
      break;
    case 'raw_data':
    case 'processed_data':
      handleSensorData(message);
      break;
    case 'error':
      handleError(message);
      break;
  }
};

function handleEvent(message) {
  switch (message.event_type) {
    case 'device_info':
      console.log('Device info:', message.data);
      break;
    case 'stream_started':
      console.log('Streaming started');
      break;
  }
}

function handleSensorData(message) {
  console.log(`${message.sensor_type} data:`, message.data);
}
```

### Python

```python
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    
    if data['type'] == 'event':
        handle_event(data)
    elif data['type'] in ['raw_data', 'processed_data']:
        handle_sensor_data(data)
    elif data['type'] == 'error':
        handle_error(data)

def on_open(ws):
    print("Connected to Link Band SDK")
    
    # Start device scan
    command = {
        "type": "command",
        "command": "scan_devices"
    }
    ws.send(json.dumps(command))

def handle_event(data):
    event_type = data['event_type']
    if event_type == 'scan_result':
        devices = data['data']['devices']
        print(f"Found {len(devices)} devices")
        
def handle_sensor_data(data):
    sensor_type = data['sensor_type']
    print(f"Received {sensor_type} data: {len(data['data'])} samples")

ws = websocket.WebSocketApp("ws://localhost:8121",
                          on_open=on_open,
                          on_message=on_message)
ws.run_forever() 