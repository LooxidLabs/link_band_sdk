# Engine Module

The Engine module is responsible for managing the core backend server of Link Band SDK. It allows you to start/stop the Python FastAPI-based server and monitor server status.

## Overview

Main features of the Engine module:
- **Server Management**: Start/stop Python backend server
- **Status Monitoring**: Real-time server status checking
- **Log Management**: Real-time server log monitoring
- **Auto Recovery**: Automatic restart option when server errors occur

## Interface Components

### Server Control Panel
- **Start Button**: Start backend server
- **Stop Button**: Stop backend server
- **Restart Button**: Restart server (stop then start)
- **Status Display**: Current server status (Stopped/Starting/Started/Error)

### Log Viewer
- **Real-time Logs**: Display all logs from server in real-time
- **Log Levels**: Color-coded by level (INFO, WARNING, ERROR, etc.)
- **Auto Scroll**: Automatically scrolls when new logs are added
- **Clear Logs**: Clear button to clear logs from screen

## Starting the Server

### 1. Basic Start
1. Click the Engine module
2. Click the **"Start"** button
3. Check the server startup process in the log window
4. Wait until status changes to **"Started"** (takes 2-5 seconds)

### 2. Understanding the Startup Process
The server goes through the following steps when starting:

```
[INFO] Starting Python server...
[INFO] Checking Python environment...
[INFO] Loading dependencies...
[INFO] Initializing FastAPI application...
[INFO] Starting WebSocket server on port 18765...
[INFO] Starting HTTP server on port 8121...
[INFO] Link Band SDK Server ready!
[INFO] Application startup complete.
```

### 3. Handling Startup Failures
When server startup fails:

**Port Conflict**
```bash
[ERROR] Port 8121 is already in use
```
Solution: Another application is using the port. Close that application or change the port.

**Python Environment Error**
```bash
[ERROR] Python interpreter not found
```
Solution: Verify that Python 3.8+ version is installed.

**Dependency Error**
```bash
[ERROR] ModuleNotFoundError: No module named 'fastapi'
```
Solution: Required Python packages are not installed. Run `pip install -r requirements.txt`.

## Server Status Monitoring

### Status Indicator
You can check the current status with the status indicator at the top of the Engine module:

- **Stopped**: Server is stopped
- **Starting**: Server is starting up
- **Started**: Server is running normally
- **Error**: Server has encountered an error

### Real-time Log Monitoring
You can check the following information in the log window:

**General Information Logs**
```
[INFO] 2024-01-15 10:30:25 - Server health check passed
[INFO] 2024-01-15 10:30:30 - WebSocket client connected
[INFO] 2024-01-15 10:30:35 - Device scan completed
```

**Warning Logs**
```
[WARNING] 2024-01-15 10:31:00 - Device connection unstable
[WARNING] 2024-01-15 10:31:05 - High CPU usage detected
```

**Error Logs**
```
[ERROR] 2024-01-15 10:31:10 - Failed to connect to device
[ERROR] 2024-01-15 10:31:15 - WebSocket connection lost
```

## Troubleshooting

### Common Issues

**Server Stops Frequently**
1. Check memory usage (RAM metric in bottom status bar)
2. Check CPU usage (CPU metric in bottom status bar)
3. Check error messages in logs
4. Enable auto-restart option

**Logs Not Displaying**
1. Refresh Engine module (click Restart button)
2. Check log file permissions
3. Check disk space

## API Endpoints

When Engine starts, the following API endpoints are activated:

### Basic Endpoints
- `GET /`: Check server status
- `GET /health`: Health check
- `GET /docs`: API documentation (Swagger UI)

### Device Management
- `GET /device/scan`: Scan for devices
- `POST /device/connect`: Connect device
- `DELETE /device/disconnect`: Disconnect device

### Data Streaming
- `POST /stream/start`: Start streaming
- `POST /stream/stop`: Stop streaming
- `GET /stream/status`: Streaming status

### WebSocket
- `ws://localhost:18765/ws`: Real-time data stream

> **💡 Tip**: You can access interactive API documentation by visiting [http://localhost:8121/docs](http://localhost:8121/docs) in your browser.

## Next Steps

Once you've successfully started the Engine module:
1. Learn how to connect devices in the [Link Band Module](linkband-module.md)
2. Check how to control the server programmatically in [API Reference](../api-reference/device-api.md)
3. Review common troubleshooting methods in [Troubleshooting](../examples/troubleshooting.md) 