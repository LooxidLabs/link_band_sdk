# WebSocket Integration Guide

Link Band SDK real-time data integration guide using WebSocket.

## Overview

Link Band SDK supports real-time bidirectional communication through WebSocket. This guide explains WebSocket connection setup, message handling, error handling, and integration methods in various programming languages.

## Basic Information

- **WebSocket URL**: `ws://localhost:8121/ws`
- **Protocol**: WebSocket (RFC 6455)
- **Message Format**: JSON
- **Connection Limit**: Maximum 10 simultaneous connections
- **Heartbeat**: 30-second intervals

## Connection Setup

### Basic Connection

```javascript
const ws = new WebSocket('ws://localhost:8121');

ws.onopen = function(event) {
    console.log('WebSocket connected');
    
    // Check device status immediately after connection
    ws.send(JSON.stringify({
        type: 'command',
        command: 'check_device_connection'
    }));
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    handleMessage(data);
};

ws.onclose = function(event) {
    console.log('WebSocket connection closed:', event.code, event.reason);
};

ws.onerror = function(error) {
    console.error('WebSocket error:', error);
};
```

### Python Connection

```python
import asyncio
import websockets
import json

async def connect_to_linkband():
    uri = "ws://localhost:8121"
    
    async with websockets.connect(uri) as websocket:
        print("WebSocket connected")
        
        # Check device status
        await websocket.send(json.dumps({
            "type": "command",
            "command": "check_device_connection"
        }))
        
        async for message in websocket:
            data = json.loads(message)
            await handle_message(data)

asyncio.run(connect_to_linkband())
```

## Message Handling

### JavaScript Message Handler

```javascript
function handleMessage(data) {
    switch (data.type) {
        case 'event':
            handleEvent(data);
            break;
        case 'raw_data':
        case 'processed_data':
        case 'sensor_data':
            handleSensorData(data);
            break;
        case 'health_check_response':
            handleHealthCheck(data);
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
}

function handleEvent(data) {
    switch (data.event_type) {
        case 'device_info':
            updateDeviceStatus(data.data);
            break;
        case 'device_connected':
            onDeviceConnected(data.data);
            break;
        case 'device_disconnected':
            onDeviceDisconnected(data.data);
            break;
        case 'device_connection_failed':
            onConnectionFailed(data.data);
            break;
        case 'stream_started':
            onStreamStarted(data.data);
            break;
        case 'stream_stopped':
            onStreamStopped(data.data);
            break;
        case 'scan_result':
            handleScanResult(data.data);
            break;
        case 'bluetooth_status':
            updateBluetoothStatus(data.data);
            break;
        case 'error':
            handleError(data.data);
            break;
        default:
            console.log('Unknown event:', data.event_type);
    }
}

function handleSensorData(data) {
    const { sensor_type, device_id, timestamp, data: sensorData } = data;
    
    switch (sensor_type) {
        case 'eeg':
            if (data.type === 'raw_data') {
                handleRawEEG(sensorData);
            } else if (data.type === 'processed_data') {
                handleProcessedEEG(sensorData);
            }
            break;
        case 'ppg':
            if (data.type === 'raw_data') {
                handleRawPPG(sensorData);
            } else if (data.type === 'processed_data') {
                handleProcessedPPG(sensorData);
            }
            break;
        case 'acc':
            if (data.type === 'raw_data') {
                handleRawACC(sensorData);
            } else if (data.type === 'processed_data') {
                handleProcessedACC(sensorData);
            }
            break;
        case 'bat':
            handleBatteryData(sensorData);
            break;
    }
}
```

### Python Message Handler

```python
async def handle_message(data):
    message_type = data.get('type')
    
    if message_type == 'event':
        await handle_event(data)
    elif message_type in ['raw_data', 'processed_data', 'sensor_data']:
        await handle_sensor_data(data)
    elif message_type == 'health_check_response':
        await handle_health_check(data)
    else:
        print(f"Unknown message type: {message_type}")

async def handle_event(data):
    event_type = data.get('event_type')
    event_data = data.get('data', {})
    
    if event_type == 'device_info':
        await update_device_status(event_data)
    elif event_type == 'device_connected':
        await on_device_connected(event_data)
    elif event_type == 'device_disconnected':
        await on_device_disconnected(event_data)
    elif event_type == 'stream_started':
        await on_stream_started(event_data)
    elif event_type == 'stream_stopped':
        await on_stream_stopped(event_data)
    elif event_type == 'scan_result':
        await handle_scan_result(event_data)
    elif event_type == 'error':
        await handle_error(event_data)

async def handle_sensor_data(data):
    sensor_type = data.get('sensor_type')
    device_id = data.get('device_id')
    timestamp = data.get('timestamp')
    sensor_data = data.get('data', {})
    
    if sensor_type == 'eeg':
        if data.get('type') == 'raw_data':
            await handle_raw_eeg(sensor_data)
        elif data.get('type') == 'processed_data':
            await handle_processed_eeg(sensor_data)
    elif sensor_type == 'ppg':
        if data.get('type') == 'raw_data':
            await handle_raw_ppg(sensor_data)
        elif data.get('type') == 'processed_data':
            await handle_processed_ppg(sensor_data)
    elif sensor_type == 'acc':
        if data.get('type') == 'raw_data':
            await handle_raw_acc(sensor_data)
        elif data.get('type') == 'processed_data':
            await handle_processed_acc(sensor_data)
    elif sensor_type == 'bat':
        await handle_battery_data(sensor_data)
```

## Command Messages

### Device Control Commands

```javascript
// Device scan
ws.send(JSON.stringify({
    type: 'command',
    command: 'scan_devices',
    parameters: {
        duration: 10  // Scan duration in seconds
    }
}));

// Device connection
ws.send(JSON.stringify({
    type: 'command',
    command: 'connect_device',
    parameters: {
        address: 'AA:BB:CC:DD:EE:FF'
    }
}));

// Device disconnection
ws.send(JSON.stringify({
    type: 'command',
    command: 'disconnect_device'
}));

// Connection status check
ws.send(JSON.stringify({
    type: 'command',
    command: 'check_device_connection'
}));
```

### Streaming Control Commands

```javascript
// Start streaming
ws.send(JSON.stringify({
    type: 'command',
    command: 'start_streaming',
    parameters: {
        sensors: ['eeg', 'ppg', 'acc'],  // Sensors to stream
        sample_rate: 250,                // Sample rate (Hz)
        duration: 60                     // Duration in seconds (optional)
    }
}));

// Stop streaming
ws.send(JSON.stringify({
    type: 'command',
    command: 'stop_streaming'
}));

// Streaming status check
ws.send(JSON.stringify({
    type: 'command',
    command: 'get_streaming_status'
}));
```

### Recording Control Commands

```javascript
// Start recording
ws.send(JSON.stringify({
    type: 'command',
    command: 'start_recording',
    parameters: {
        session_name: 'test_session',
        sensors: ['eeg', 'ppg', 'acc'],
        sample_rate: 250,
        duration: 300  // 5 minutes
    }
}));

// Stop recording
ws.send(JSON.stringify({
    type: 'command',
    command: 'stop_recording'
}));

// Recording status check
ws.send(JSON.stringify({
    type: 'command',
    command: 'get_recording_status'
}));
```

## Response Messages

### Command Response Format

```json
{
    "type": "command_response",
    "command": "connect_device",
    "success": true,
    "message": "Device connected successfully",
    "data": {
        "device_id": "LinkBand_12345",
        "address": "AA:BB:CC:DD:EE:FF",
        "battery_level": 85,
        "firmware_version": "1.2.3"
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Event Message Format

```json
{
    "type": "event",
    "event_type": "device_connected",
    "data": {
        "device_id": "LinkBand_12345",
        "address": "AA:BB:CC:DD:EE:FF",
        "signal_strength": -65
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Sensor Data Format

```json
{
    "type": "raw_data",
    "sensor_type": "eeg",
    "device_id": "LinkBand_12345",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "sample_rate": 250,
    "data": [
        {
            "timestamp": 1642248600000,
            "ch1": 1234.5,
            "ch2": 2345.6,
            "ch3": 3456.7,
            "ch4": 4567.8
        }
    ]
}
```

## Error Handling

### JavaScript Error Handling

```javascript
function handleError(errorData) {
    const { error_code, error_message, details } = errorData;
    
    switch (error_code) {
        case 'DEVICE_NOT_FOUND':
            console.error('Device not found:', error_message);
            showUserMessage('Device not found. Please check the device and try again.');
            break;
        case 'CONNECTION_FAILED':
            console.error('Connection failed:', error_message);
            showUserMessage('Failed to connect to device. Please try again.');
            break;
        case 'BLUETOOTH_ERROR':
            console.error('Bluetooth error:', error_message);
            showUserMessage('Bluetooth error occurred. Please check Bluetooth settings.');
            break;
        case 'STREAMING_ERROR':
            console.error('Streaming error:', error_message);
            handleStreamingError(details);
            break;
        default:
            console.error('Unknown error:', error_code, error_message);
            showUserMessage('An unknown error occurred.');
    }
}

function handleStreamingError(details) {
    if (details.sensor_type) {
        console.error(`Streaming error for ${details.sensor_type}:`, details.message);
        // Attempt to restart streaming for specific sensor
        restartSensorStreaming(details.sensor_type);
    }
}

async function restartSensorStreaming(sensorType) {
    try {
        // Stop current streaming
        ws.send(JSON.stringify({
            type: 'command',
            command: 'stop_streaming'
        }));
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Restart streaming
        ws.send(JSON.stringify({
            type: 'command',
            command: 'start_streaming',
            parameters: {
                sensors: [sensorType]
            }
        }));
        
    } catch (error) {
        console.error('Failed to restart streaming:', error);
    }
}
```

### Python Error Handling

```python
async def handle_error(error_data):
    error_code = error_data.get('error_code')
    error_message = error_data.get('error_message')
    details = error_data.get('details', {})
    
    if error_code == 'DEVICE_NOT_FOUND':
        print(f"Device not found: {error_message}")
        await show_user_message("Device not found. Please check the device and try again.")
    elif error_code == 'CONNECTION_FAILED':
        print(f"Connection failed: {error_message}")
        await show_user_message("Failed to connect to device. Please try again.")
    elif error_code == 'BLUETOOTH_ERROR':
        print(f"Bluetooth error: {error_message}")
        await show_user_message("Bluetooth error occurred. Please check Bluetooth settings.")
    elif error_code == 'STREAMING_ERROR':
        print(f"Streaming error: {error_message}")
        await handle_streaming_error(details)
    else:
        print(f"Unknown error: {error_code} - {error_message}")
        await show_user_message("An unknown error occurred.")

async def handle_streaming_error(details):
    sensor_type = details.get('sensor_type')
    if sensor_type:
        print(f"Streaming error for {sensor_type}: {details.get('message')}")
        await restart_sensor_streaming(sensor_type)

async def restart_sensor_streaming(sensor_type):
    try:
        # Stop current streaming
        await websocket.send(json.dumps({
            "type": "command",
            "command": "stop_streaming"
        }))
        
        # Wait a moment
        await asyncio.sleep(1)
        
        # Restart streaming
        await websocket.send(json.dumps({
            "type": "command",
            "command": "start_streaming",
            "parameters": {
                "sensors": [sensor_type]
            }
        }))
        
    except Exception as error:
        print(f"Failed to restart streaming: {error}")
```

## Connection Management

### Reconnection Logic

```javascript
class WebSocketManager {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 1000; // Start with 1 second
        this.maxReconnectInterval = 30000; // Max 30 seconds
    }
    
    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.reconnectInterval = 1000;
                resolve(this.ws);
            };
            
            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };
            
            this.ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                this.attemptReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
        });
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }, this.reconnectInterval);
            
            // Exponential backoff
            this.reconnectInterval = Math.min(this.reconnectInterval * 2, this.maxReconnectInterval);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket is not connected');
        }
    }
    
    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
    
    handleMessage(data) {
        // Override this method in subclass
        console.log('Received message:', data);
    }
}
```

### Python Connection Management

```python
import asyncio
import websockets
import json
import logging

class WebSocketManager:
    def __init__(self, url):
        self.url = url
        self.websocket = None
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_interval = 1  # Start with 1 second
        self.max_reconnect_interval = 30  # Max 30 seconds
        self.is_running = False
        
    async def connect(self):
        """Connect to WebSocket with retry logic"""
        while self.reconnect_attempts < self.max_reconnect_attempts:
            try:
                self.websocket = await websockets.connect(self.url)
                logging.info("WebSocket connected")
                self.reconnect_attempts = 0
                self.reconnect_interval = 1
                self.is_running = True
                return self.websocket
                
            except Exception as error:
                self.reconnect_attempts += 1
                logging.error(f"Connection failed (attempt {self.reconnect_attempts}): {error}")
                
                if self.reconnect_attempts < self.max_reconnect_attempts:
                    await asyncio.sleep(self.reconnect_interval)
                    self.reconnect_interval = min(self.reconnect_interval * 2, self.max_reconnect_interval)
                else:
                    logging.error("Max reconnection attempts reached")
                    raise
    
    async def listen(self):
        """Listen for messages with automatic reconnection"""
        while self.is_running:
            try:
                if not self.websocket:
                    await self.connect()
                
                async for message in self.websocket:
                    data = json.loads(message)
                    await self.handle_message(data)
                    
            except websockets.exceptions.ConnectionClosed:
                logging.warning("WebSocket connection closed, attempting to reconnect...")
                self.websocket = None
                await self.connect()
            except Exception as error:
                logging.error(f"Error in listen loop: {error}")
                await asyncio.sleep(1)
    
    async def send(self, data):
        """Send message with connection check"""
        if self.websocket:
            try:
                await self.websocket.send(json.dumps(data))
            except websockets.exceptions.ConnectionClosed:
                logging.warning("WebSocket connection closed while sending")
                self.websocket = None
        else:
            logging.warning("WebSocket is not connected")
    
    async def close(self):
        """Close WebSocket connection"""
        self.is_running = False
        if self.websocket:
            await self.websocket.close()
    
    async def handle_message(self, data):
        """Override this method in subclass"""
        print(f"Received message: {data}")
```

## Health Check and Monitoring

### Health Check Implementation

```javascript
class HealthMonitor {
    constructor(wsManager) {
        this.wsManager = wsManager;
        this.healthCheckInterval = null;
        this.lastHealthCheck = null;
        this.healthCheckTimeout = 5000; // 5 seconds
    }
    
    startHealthCheck() {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000); // Every 30 seconds
    }
    
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    
    performHealthCheck() {
        const healthCheckId = Date.now().toString();
        this.lastHealthCheck = healthCheckId;
        
        this.wsManager.send({
            type: 'health_check',
            id: healthCheckId,
            timestamp: new Date().toISOString()
        });
        
        // Set timeout for health check response
        setTimeout(() => {
            if (this.lastHealthCheck === healthCheckId) {
                console.warn('Health check timeout');
                this.handleHealthCheckTimeout();
            }
        }, this.healthCheckTimeout);
    }
    
    handleHealthCheckResponse(data) {
        if (data.id === this.lastHealthCheck) {
            console.log('Health check successful');
            this.lastHealthCheck = null;
        }
    }
    
    handleHealthCheckTimeout() {
        console.error('Health check failed - connection may be unstable');
        // Optionally trigger reconnection
        this.wsManager.attemptReconnect();
    }
}
```

## Complete Integration Example

### Full JavaScript Implementation

```javascript
class LinkBandWebSocketClient {
    constructor() {
        this.wsManager = new WebSocketManager('ws://localhost:8121/ws');
        this.healthMonitor = new HealthMonitor(this.wsManager);
        this.eventHandlers = {};
    }
    
    async connect() {
        try {
            await this.wsManager.connect();
            this.wsManager.handleMessage = (data) => this.handleMessage(data);
            this.healthMonitor.startHealthCheck();
            console.log('Link Band WebSocket client connected');
        } catch (error) {
            console.error('Failed to connect:', error);
            throw error;
        }
    }
    
    disconnect() {
        this.healthMonitor.stopHealthCheck();
        this.wsManager.close();
    }
    
    on(eventType, handler) {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType].push(handler);
    }
    
    emit(eventType, data) {
        if (this.eventHandlers[eventType]) {
            this.eventHandlers[eventType].forEach(handler => handler(data));
        }
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'health_check_response':
                this.healthMonitor.handleHealthCheckResponse(data);
                break;
            case 'event':
                this.emit(data.event_type, data.data);
                break;
            case 'raw_data':
            case 'processed_data':
                this.emit('sensor_data', data);
                break;
            case 'command_response':
                this.emit('command_response', data);
                break;
            case 'error':
                this.emit('error', data);
                break;
        }
    }
    
    // Command methods
    async scanDevices(duration = 10) {
        this.wsManager.send({
            type: 'command',
            command: 'scan_devices',
            parameters: { duration }
        });
    }
    
    async connectDevice(address) {
        this.wsManager.send({
            type: 'command',
            command: 'connect_device',
            parameters: { address }
        });
    }
    
    async startStreaming(options = {}) {
        this.wsManager.send({
            type: 'command',
            command: 'start_streaming',
            parameters: {
                sensors: options.sensors || ['eeg', 'ppg', 'acc'],
                sample_rate: options.sampleRate || 250,
                duration: options.duration
            }
        });
    }
    
    async stopStreaming() {
        this.wsManager.send({
            type: 'command',
            command: 'stop_streaming'
        });
    }
}

// Usage example
const client = new LinkBandWebSocketClient();

client.on('device_connected', (data) => {
    console.log('Device connected:', data);
});

client.on('sensor_data', (data) => {
    console.log(`Received ${data.sensor_type} data:`, data.data);
});

client.on('error', (error) => {
    console.error('Error:', error);
});

// Connect and start streaming
async function main() {
    try {
        await client.connect();
        await client.scanDevices();
        // Wait for device selection and connection
        // await client.connectDevice('AA:BB:CC:DD:EE:FF');
        // await client.startStreaming();
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
}

main();
```

This comprehensive WebSocket integration guide provides all the necessary information for implementing real-time communication with the Link Band SDK across different programming languages and scenarios. 