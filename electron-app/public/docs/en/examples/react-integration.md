# React Integration Guide

This guide demonstrates how to integrate the Link Band SDK with React applications using modern hooks and components.

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Custom Hooks](#custom-hooks)
3. [React Components](#react-components)
4. [Complete Example](#complete-example)
5. [TypeScript Support](#typescript-support)
6. [Best Practices](#best-practices)

## Installation & Setup

### Prerequisites

```bash
npm install axios
npm install @types/node  # for TypeScript projects
```

### Environment Configuration

Create a `.env` file in your project root:

```env
REACT_APP_LINK_BAND_API_URL=http://localhost:8121
REACT_APP_WEBSOCKET_URL=ws://localhost:18765
```

## Custom Hooks

### useDeviceManager Hook

```typescript
// hooks/useDeviceManager.ts
import { useState, useCallback } from 'react';
import axios from 'axios';

interface Device {
  name: string;
  address: string;
  rssi?: number;
  is_connected: boolean;
}

interface DeviceStatus {
  is_connected: boolean;
  device_address?: string;
  device_name?: string;
  connection_time?: string;
  battery_level?: number;
}

export const useDeviceManager = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.REACT_APP_LINK_BAND_API_URL || 'http://localhost:8121';

  const scanDevices = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE}/device/scan`);
      setDevices(response.data.devices || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to scan devices');
    } finally {
      setIsScanning(false);
    }
  }, [API_BASE]);

  const connectDevice = useCallback(async (address: string) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      await axios.post(`${API_BASE}/device/connect`, { address });
      await getDeviceStatus(); // Refresh status after connection
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to connect device');
    } finally {
      setIsConnecting(false);
    }
  }, [API_BASE]);

  const disconnectDevice = useCallback(async () => {
    setError(null);
    
    try {
      await axios.post(`${API_BASE}/device/disconnect`);
      setDeviceStatus(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to disconnect device');
    }
  }, [API_BASE]);

  const getDeviceStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/device/status`);
      setDeviceStatus(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to get device status');
    }
  }, [API_BASE]);

  return {
    devices,
    deviceStatus,
    isScanning,
    isConnecting,
    error,
    scanDevices,
    connectDevice,
    disconnectDevice,
    getDeviceStatus
  };
};
```

### useDataStreaming Hook

```typescript
// hooks/useDataStreaming.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface StreamData {
  timestamp: number;
  eeg?: number[];
  ppg?: number[];
  acc?: { x: number; y: number; z: number };
  battery?: number;
}

interface StreamStatus {
  is_running: boolean;
  is_streaming: boolean;
  clients_connected: number;
  data_rate?: number;
}

export const useDataStreaming = () => {
  const [streamData, setStreamData] = useState<StreamData[]>([]);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const API_BASE = process.env.REACT_APP_LINK_BAND_API_URL || 'http://localhost:8121';
  const WS_URL = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:18765';

  const initializeStream = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/stream/init`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initialize stream');
    }
  }, [API_BASE]);

  const startStreaming = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/stream/start`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start streaming');
    }
  }, [API_BASE]);

  const stopStreaming = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/stream/stop`);
      if (wsRef.current) {
        wsRef.current.close();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to stop streaming');
    }
  }, [API_BASE]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    wsRef.current = new WebSocket(WS_URL);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      setError(null);
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStreamData(prev => [...prev.slice(-999), data]); // Keep last 1000 points
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      setError('WebSocket connection error');
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };
  }, [WS_URL]);

  const getStreamStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/stream/status`);
      setStreamStatus(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to get stream status');
    }
  }, [API_BASE]);

  const clearStreamData = useCallback(() => {
    setStreamData([]);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    streamData,
    streamStatus,
    isConnected,
    error,
    initializeStream,
    startStreaming,
    stopStreaming,
    connectWebSocket,
    getStreamStatus,
    clearStreamData
  };
};
```

### useRecording Hook

```typescript
// hooks/useRecording.ts
import { useState, useCallback } from 'react';
import axios from 'axios';

interface RecordingStatus {
  is_recording: boolean;
  current_session?: string;
  start_time?: string;
}

interface Session {
  session_name: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  data_path: string;
  file_count: number;
  total_size: number;
}

export const useRecording = () => {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.REACT_APP_LINK_BAND_API_URL || 'http://localhost:8121';

  const startRecording = useCallback(async (sessionName?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const payload = sessionName ? { session_name: sessionName } : {};
      await axios.post(`${API_BASE}/data/start-recording`, payload);
      await getRecordingStatus();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start recording');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  const stopRecording = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await axios.post(`${API_BASE}/data/stop-recording`);
      await getRecordingStatus();
      await getSessions(); // Refresh sessions list
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to stop recording');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  const getRecordingStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/data/recording-status`);
      setRecordingStatus(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to get recording status');
    }
  }, [API_BASE]);

  const getSessions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/data/sessions`);
      setSessions(response.data.sessions || response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to get sessions');
    }
  }, [API_BASE]);

  const exportSession = useCallback(async (sessionName: string) => {
    try {
      const response = await axios.post(`${API_BASE}/data/sessions/${sessionName}/prepare-export`);
      return response.data.download_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to export session');
      return null;
    }
  }, [API_BASE]);

  return {
    recordingStatus,
    sessions,
    isLoading,
    error,
    startRecording,
    stopRecording,
    getRecordingStatus,
    getSessions,
    exportSession
  };
};
```

## React Components

### DeviceManager Component

```tsx
// components/DeviceManager.tsx
import React, { useEffect } from 'react';
import { useDeviceManager } from '../hooks/useDeviceManager';

interface DeviceManagerProps {
  onDeviceConnected?: (deviceAddress: string) => void;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({ onDeviceConnected }) => {
  const {
    devices,
    deviceStatus,
    isScanning,
    isConnecting,
    error,
    scanDevices,
    connectDevice,
    disconnectDevice,
    getDeviceStatus
  } = useDeviceManager();

  useEffect(() => {
    getDeviceStatus();
  }, [getDeviceStatus]);

  useEffect(() => {
    if (deviceStatus?.is_connected && deviceStatus.device_address) {
      onDeviceConnected?.(deviceStatus.device_address);
    }
  }, [deviceStatus, onDeviceConnected]);

  return (
    <div className="device-manager">
      <h3>Device Management</h3>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* Device Status */}
      <div className="device-status" style={{ marginBottom: '20px' }}>
        <h4>Current Status</h4>
        {deviceStatus ? (
          <div>
            <p>Connected: {deviceStatus.is_connected ? 'Yes' : 'No'}</p>
            {deviceStatus.is_connected && (
              <>
                <p>Device: {deviceStatus.device_name || deviceStatus.device_address}</p>
                <p>Battery: {deviceStatus.battery_level}%</p>
                <button onClick={disconnectDevice}>Disconnect</button>
              </>
            )}
          </div>
        ) : (
          <p>Loading status...</p>
        )}
      </div>

      {/* Device Scanner */}
      {!deviceStatus?.is_connected && (
        <div className="device-scanner">
          <h4>Available Devices</h4>
          <button onClick={scanDevices} disabled={isScanning}>
            {isScanning ? 'Scanning...' : 'Scan for Devices'}
          </button>
          
          <div className="devices-list" style={{ marginTop: '10px' }}>
            {devices.map((device) => (
              <div 
                key={device.address} 
                className="device-item"
                style={{ 
                  border: '1px solid #ccc', 
                  padding: '10px', 
                  margin: '5px 0',
                  borderRadius: '5px'
                }}
              >
                <div>
                  <strong>{device.name}</strong>
                  <br />
                  <small>{device.address}</small>
                  {device.rssi && <span> (RSSI: {device.rssi})</span>}
                </div>
                <button 
                  onClick={() => connectDevice(device.address)}
                  disabled={isConnecting}
                  style={{ marginTop: '5px' }}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### DataVisualization Component

```tsx
// components/DataVisualization.tsx
import React, { useEffect, useRef } from 'react';
import { useDataStreaming } from '../hooks/useDataStreaming';

interface DataVisualizationProps {
  isDeviceConnected: boolean;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({ isDeviceConnected }) => {
  const {
    streamData,
    streamStatus,
    isConnected,
    error,
    initializeStream,
    startStreaming,
    stopStreaming,
    connectWebSocket,
    getStreamStatus,
    clearStreamData
  } = useDataStreaming();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isDeviceConnected) {
      initializeStream();
    }
  }, [isDeviceConnected, initializeStream]);

  useEffect(() => {
    getStreamStatus();
    const interval = setInterval(getStreamStatus, 5000);
    return () => clearInterval(interval);
  }, [getStreamStatus]);

  // Simple canvas-based visualization
  useEffect(() => {
    if (!canvasRef.current || streamData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw EEG data if available
    const latestData = streamData.slice(-100); // Last 100 points
    if (latestData.length > 0 && latestData[0].eeg) {
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.beginPath();

      latestData.forEach((data, index) => {
        if (data.eeg && data.eeg.length > 0) {
          const x = (index / latestData.length) * canvas.width;
          const y = canvas.height / 2 - (data.eeg[0] * 100); // Scale and center
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });

      ctx.stroke();
    }
  }, [streamData]);

  const handleStartStreaming = async () => {
    await startStreaming();
    connectWebSocket();
  };

  return (
    <div className="data-visualization">
      <h3>Data Streaming</h3>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* Stream Controls */}
      <div className="stream-controls" style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleStartStreaming}
          disabled={!isDeviceConnected || streamStatus?.is_streaming}
        >
          Start Streaming
        </button>
        <button 
          onClick={stopStreaming}
          disabled={!streamStatus?.is_streaming}
          style={{ marginLeft: '10px' }}
        >
          Stop Streaming
        </button>
        <button 
          onClick={clearStreamData}
          style={{ marginLeft: '10px' }}
        >
          Clear Data
        </button>
      </div>

      {/* Stream Status */}
      <div className="stream-status" style={{ marginBottom: '20px' }}>
        <h4>Stream Status</h4>
        {streamStatus ? (
          <div>
            <p>Server Running: {streamStatus.is_running ? 'Yes' : 'No'}</p>
            <p>Streaming: {streamStatus.is_streaming ? 'Yes' : 'No'}</p>
            <p>WebSocket Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Clients Connected: {streamStatus.clients_connected}</p>
            {streamStatus.data_rate && <p>Data Rate: {streamStatus.data_rate.toFixed(1)} Hz</p>}
          </div>
        ) : (
          <p>Loading status...</p>
        )}
      </div>

      {/* Data Visualization */}
      <div className="visualization-area">
        <h4>Real-time EEG Data</h4>
        <canvas 
          ref={canvasRef}
          width={800}
          height={200}
          style={{ border: '1px solid #ccc', width: '100%', height: '200px' }}
        />
        <p>Data Points: {streamData.length}</p>
      </div>
    </div>
  );
};
```

### RecordingManager Component

```tsx
// components/RecordingManager.tsx
import React, { useEffect, useState } from 'react';
import { useRecording } from '../hooks/useRecording';

interface RecordingManagerProps {
  isStreaming: boolean;
}

export const RecordingManager: React.FC<RecordingManagerProps> = ({ isStreaming }) => {
  const {
    recordingStatus,
    sessions,
    isLoading,
    error,
    startRecording,
    stopRecording,
    getRecordingStatus,
    getSessions,
    exportSession
  } = useRecording();

  const [sessionName, setSessionName] = useState('');

  useEffect(() => {
    getRecordingStatus();
    getSessions();
  }, [getRecordingStatus, getSessions]);

  useEffect(() => {
    const interval = setInterval(getRecordingStatus, 2000);
    return () => clearInterval(interval);
  }, [getRecordingStatus]);

  const handleStartRecording = async () => {
    await startRecording(sessionName || undefined);
    setSessionName('');
  };

  const handleExportSession = async (sessionName: string) => {
    const downloadUrl = await exportSession(sessionName);
    if (downloadUrl) {
      // Create download link
      const link = document.createElement('a');
      link.href = `${process.env.REACT_APP_LINK_BAND_API_URL}${downloadUrl}`;
      link.download = `${sessionName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="recording-manager">
      <h3>Recording Management</h3>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* Recording Controls */}
      <div className="recording-controls" style={{ marginBottom: '20px' }}>
        <h4>Recording Controls</h4>
        
        {recordingStatus?.is_recording ? (
          <div>
            <p>Recording: <strong>{recordingStatus.current_session}</strong></p>
            <p>Started: {recordingStatus.start_time}</p>
            <button onClick={stopRecording} disabled={isLoading}>
              {isLoading ? 'Stopping...' : 'Stop Recording'}
            </button>
          </div>
        ) : (
          <div>
            <input
              type="text"
              placeholder="Session name (optional)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              style={{ marginRight: '10px', padding: '5px' }}
            />
            <button 
              onClick={handleStartRecording}
              disabled={!isStreaming || isLoading}
            >
              {isLoading ? 'Starting...' : 'Start Recording'}
            </button>
            {!isStreaming && <p style={{ color: 'orange' }}>Start streaming first</p>}
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="sessions-list">
        <h4>Recorded Sessions</h4>
        <button onClick={getSessions} style={{ marginBottom: '10px' }}>
          Refresh Sessions
        </button>
        
        {sessions.length === 0 ? (
          <p>No sessions found</p>
        ) : (
          <div className="sessions-grid">
            {sessions.map((session) => (
              <div 
                key={session.session_name}
                className="session-item"
                style={{ 
                  border: '1px solid #ccc', 
                  padding: '15px', 
                  margin: '10px 0',
                  borderRadius: '5px'
                }}
              >
                <h5>{session.session_name}</h5>
                <p>Start: {new Date(session.start_time).toLocaleString()}</p>
                {session.end_time && (
                  <p>End: {new Date(session.end_time).toLocaleString()}</p>
                )}
                {session.duration && (
                  <p>Duration: {Math.round(session.duration)} seconds</p>
                )}
                <p>Files: {session.file_count}</p>
                <p>Size: {(session.total_size / 1024 / 1024).toFixed(2)} MB</p>
                
                <button 
                  onClick={() => handleExportSession(session.session_name)}
                  style={{ marginTop: '10px' }}
                >
                  Export Session
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

## Complete Example

### Main App Component

```tsx
// App.tsx
import React, { useState } from 'react';
import { DeviceManager } from './components/DeviceManager';
import { DataVisualization } from './components/DataVisualization';
import { RecordingManager } from './components/RecordingManager';
import './App.css';

function App() {
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleDeviceConnected = (deviceAddress: string) => {
    setIsDeviceConnected(true);
    console.log('Device connected:', deviceAddress);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Link Band SDK - React Integration</h1>
      </header>
      
      <main className="App-main">
        <div className="container">
          {/* Device Management Section */}
          <section className="section">
            <DeviceManager onDeviceConnected={handleDeviceConnected} />
          </section>

          {/* Data Streaming Section */}
          <section className="section">
            <DataVisualization 
              isDeviceConnected={isDeviceConnected}
            />
          </section>

          {/* Recording Management Section */}
          <section className="section">
            <RecordingManager 
              isStreaming={isStreaming}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
```

### CSS Styles

```css
/* App.css */
.App {
  text-align: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  margin-bottom: 30px;
  border-radius: 8px;
}

.App-main {
  text-align: left;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.section {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.device-manager,
.data-visualization,
.recording-manager {
  width: 100%;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
}

.devices-list {
  max-height: 300px;
  overflow-y: auto;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sessions-grid {
  max-height: 400px;
  overflow-y: auto;
}

.session-item {
  background-color: white;
}

button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background-color: #0056b3;
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

input {
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

h3 {
  color: #495057;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

h4 {
  color: #6c757d;
  margin-bottom: 15px;
}

@media (min-width: 768px) {
  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }
  
  .section:first-child {
    grid-column: 1 / -1;
  }
}
```

## TypeScript Support

### Type Definitions

```typescript
// types/linkband.ts
export interface Device {
  name: string;
  address: string;
  rssi?: number;
  is_connected: boolean;
}

export interface DeviceStatus {
  is_connected: boolean;
  device_address?: string;
  device_name?: string;
  connection_time?: string;
  battery_level?: number;
}

export interface StreamData {
  timestamp: number;
  eeg?: number[];
  ppg?: number[];
  acc?: {
    x: number;
    y: number;
    z: number;
  };
  battery?: number;
  device_id?: string;
}

export interface StreamStatus {
  is_running: boolean;
  is_streaming: boolean;
  clients_connected: number;
  data_rate?: number;
  total_messages?: number;
}

export interface RecordingStatus {
  is_recording: boolean;
  current_session?: string;
  start_time?: string;
}

export interface Session {
  session_name: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  data_path: string;
  file_count: number;
  total_size: number;
}

export interface ApiResponse<T = any> {
  status: 'success' | 'fail';
  message?: string;
  data?: T;
}
```

## Best Practices

### 1. Error Handling

```typescript
// utils/errorHandler.ts
export const handleApiError = (error: any): string => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
```

### 2. Environment Configuration

```typescript
// config/api.ts
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_LINK_BAND_API_URL || 'http://localhost:8121',
  websocketURL: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:18765',
  timeout: 10000,
};
```

### 3. WebSocket Management

```typescript
// utils/websocket.ts
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private url: string) {}

  connect(onMessage: (data: any) => void, onError: (error: string) => void) {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        console.log('WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onerror = () => {
        onError('WebSocket connection error');
      };

      this.ws.onclose = () => {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(onMessage, onError);
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };
    } catch (error) {
      onError('Failed to create WebSocket connection');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
```

### 4. Performance Optimization

```typescript
// hooks/useThrottledEffect.ts
import { useEffect, useRef } from 'react';

export const useThrottledEffect = (
  callback: () => void,
  delay: number,
  deps: React.DependencyList
) => {
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun.current >= delay) {
        callback();
        lastRun.current = Date.now();
      }
    }, delay - (Date.now() - lastRun.current));

    return () => {
      clearTimeout(handler);
    };
  }, [callback, delay, ...deps]);
};
```

This comprehensive React integration guide provides everything needed to build a full-featured Link Band SDK application with modern React patterns, TypeScript support, and best practices for real-time data handling. 