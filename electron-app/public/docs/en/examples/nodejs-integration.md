# Node.js Integration Guide

This guide demonstrates how to integrate the Link Band SDK with Node.js applications, including Express servers, WebSocket clients, and data processing pipelines.

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Express Server Integration](#express-server-integration)
3. [WebSocket Client](#websocket-client)
4. [Data Processing](#data-processing)
5. [Complete Example](#complete-example)
6. [TypeScript Support](#typescript-support)
7. [Best Practices](#best-practices)

## Installation & Setup

### Prerequisites

```bash
npm init -y
npm install express axios ws cors helmet morgan
npm install --save-dev nodemon @types/node typescript ts-node
```

### Project Structure

```
project/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── utils/
│   ├── types/
│   └── app.ts
├── config/
├── package.json
└── tsconfig.json
```

### Environment Configuration

Create a `.env` file:

```env
PORT=3000
LINK_BAND_API_URL=http://localhost:8121
WEBSOCKET_URL=ws://localhost:18765
NODE_ENV=development
```

## Express Server Integration

### Main Server Setup

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { deviceRouter } from './routes/device';
import { streamRouter } from './routes/stream';
import { dataRouter } from './routes/data';
import { LinkBandService } from './services/LinkBandService';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Link Band Service
const linkBandService = new LinkBandService();

// Routes
app.use('/api/device', deviceRouter);
app.use('/api/stream', streamRouter);
app.use('/api/data', dataRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

### Link Band Service

```typescript
// src/services/LinkBandService.ts
import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface Device {
  name: string;
  address: string;
  rssi?: number;
  is_connected: boolean;
}

export interface StreamData {
  timestamp: number;
  eeg?: number[];
  ppg?: number[];
  acc?: { x: number; y: number; z: number };
  battery?: number;
}

export class LinkBandService extends EventEmitter {
  private api: AxiosInstance;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    super();
    this.api = axios.create({
      baseURL: process.env.LINK_BAND_API_URL || 'http://localhost:8121',
      timeout: 10000,
    });
  }

  // Device Management
  async scanDevices(): Promise<Device[]> {
    try {
      const response = await this.api.get('/device/scan');
      return response.data.devices || [];
    } catch (error) {
      this.emit('error', 'Failed to scan devices');
      throw error;
    }
  }

  async connectDevice(address: string): Promise<void> {
    try {
      await this.api.post('/device/connect', { address });
      this.emit('deviceConnected', address);
    } catch (error) {
      this.emit('error', 'Failed to connect device');
      throw error;
    }
  }

  async disconnectDevice(): Promise<void> {
    try {
      await this.api.post('/device/disconnect');
      this.emit('deviceDisconnected');
    } catch (error) {
      this.emit('error', 'Failed to disconnect device');
      throw error;
    }
  }

  async getDeviceStatus() {
    try {
      const response = await this.api.get('/device/status');
      return response.data;
    } catch (error) {
      this.emit('error', 'Failed to get device status');
      throw error;
    }
  }

  // Stream Management
  async initializeStream(): Promise<void> {
    try {
      await this.api.post('/stream/init');
    } catch (error) {
      this.emit('error', 'Failed to initialize stream');
      throw error;
    }
  }

  async startStreaming(): Promise<void> {
    try {
      await this.api.post('/stream/start');
      this.emit('streamingStarted');
    } catch (error) {
      this.emit('error', 'Failed to start streaming');
      throw error;
    }
  }

  async stopStreaming(): Promise<void> {
    try {
      await this.api.post('/stream/stop');
      this.disconnectWebSocket();
      this.emit('streamingStopped');
    } catch (error) {
      this.emit('error', 'Failed to stop streaming');
      throw error;
    }
  }

  async getStreamStatus() {
    try {
      const response = await this.api.get('/stream/status');
      return response.data;
    } catch (error) {
      this.emit('error', 'Failed to get stream status');
      throw error;
    }
  }

  // WebSocket Connection
  connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = process.env.WEBSOCKET_URL || 'ws://localhost:18765';
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.emit('websocketConnected');
      console.log('WebSocket connected');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const parsedData = JSON.parse(data.toString());
        this.emit('streamData', parsedData);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    this.ws.on('error', (error) => {
      this.emit('error', 'WebSocket connection error');
      console.error('WebSocket error:', error);
    });

    this.ws.on('close', () => {
      this.emit('websocketDisconnected');
      console.log('WebSocket disconnected');
      
      // Auto-reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connectWebSocket();
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    });
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Recording Management
  async startRecording(sessionName?: string) {
    try {
      const payload = sessionName ? { session_name: sessionName } : {};
      await this.api.post('/data/start-recording', payload);
      this.emit('recordingStarted', sessionName);
    } catch (error) {
      this.emit('error', 'Failed to start recording');
      throw error;
    }
  }

  async stopRecording() {
    try {
      await this.api.post('/data/stop-recording');
      this.emit('recordingStopped');
    } catch (error) {
      this.emit('error', 'Failed to stop recording');
      throw error;
    }
  }

  async getRecordingStatus() {
    try {
      const response = await this.api.get('/data/recording-status');
      return response.data;
    } catch (error) {
      this.emit('error', 'Failed to get recording status');
      throw error;
    }
  }

  async getSessions() {
    try {
      const response = await this.api.get('/data/sessions');
      return response.data.sessions || response.data || [];
    } catch (error) {
      this.emit('error', 'Failed to get sessions');
      throw error;
    }
  }
}
```

### Device Controller

```typescript
// src/controllers/DeviceController.ts
import { Request, Response } from 'express';
import { LinkBandService } from '../services/LinkBandService';

export class DeviceController {
  constructor(private linkBandService: LinkBandService) {}

  async scanDevices(req: Request, res: Response): Promise<void> {
    try {
      const devices = await this.linkBandService.scanDevices();
      res.json({ success: true, devices });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to scan devices' });
    }
  }

  async connectDevice(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.body;
      if (!address) {
        res.status(400).json({ success: false, error: 'Device address is required' });
        return;
      }

      await this.linkBandService.connectDevice(address);
      res.json({ success: true, message: 'Device connected successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to connect device' });
    }
  }

  async disconnectDevice(req: Request, res: Response): Promise<void> {
    try {
      await this.linkBandService.disconnectDevice();
      res.json({ success: true, message: 'Device disconnected successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to disconnect device' });
    }
  }

  async getDeviceStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.linkBandService.getDeviceStatus();
      res.json({ success: true, status });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get device status' });
    }
  }
}
```

### Stream Controller

```typescript
// src/controllers/StreamController.ts
import { Request, Response } from 'express';
import { LinkBandService } from '../services/LinkBandService';

export class StreamController {
  constructor(private linkBandService: LinkBandService) {}

  async initializeStream(req: Request, res: Response): Promise<void> {
    try {
      await this.linkBandService.initializeStream();
      res.json({ success: true, message: 'Stream initialized successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to initialize stream' });
    }
  }

  async startStreaming(req: Request, res: Response): Promise<void> {
    try {
      await this.linkBandService.startStreaming();
      this.linkBandService.connectWebSocket();
      res.json({ success: true, message: 'Streaming started successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to start streaming' });
    }
  }

  async stopStreaming(req: Request, res: Response): Promise<void> {
    try {
      await this.linkBandService.stopStreaming();
      res.json({ success: true, message: 'Streaming stopped successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to stop streaming' });
    }
  }

  async getStreamStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.linkBandService.getStreamStatus();
      res.json({ success: true, status });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to get stream status' });
    }
  }
}
```

## WebSocket Client

### Standalone WebSocket Client

```typescript
// src/clients/WebSocketClient.ts
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface StreamData {
  timestamp: number;
  eeg?: number[];
  ppg?: number[];
  acc?: { x: number; y: number; z: number };
  battery?: number;
}

export class LinkBandWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private url: string;

  constructor(url: string = 'ws://localhost:18765') {
    super();
    this.url = url;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.emit('connected');
      console.log('WebSocket connected to Link Band');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const parsedData: StreamData = JSON.parse(data.toString());
        this.emit('data', parsedData);
        
        // Emit specific data types
        if (parsedData.eeg) this.emit('eeg', parsedData.eeg, parsedData.timestamp);
        if (parsedData.ppg) this.emit('ppg', parsedData.ppg, parsedData.timestamp);
        if (parsedData.acc) this.emit('acc', parsedData.acc, parsedData.timestamp);
        if (parsedData.battery) this.emit('battery', parsedData.battery, parsedData.timestamp);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.emit('error', error);
      }
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
      console.error('WebSocket error:', error);
    });

    this.ws.on('close', () => {
      this.emit('disconnected');
      console.log('WebSocket disconnected');
      
      // Auto-reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
      } else {
        this.emit('maxReconnectAttemptsReached');
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(data: any): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }
}
```

## Data Processing

### Data Processor

```typescript
// src/services/DataProcessor.ts
import { EventEmitter } from 'events';

export interface ProcessedData {
  timestamp: number;
  eeg?: {
    raw: number[];
    filtered: number[];
    alpha: number;
    beta: number;
    theta: number;
    delta: number;
  };
  ppg?: {
    raw: number[];
    heartRate: number;
    hrv: number;
  };
  acc?: {
    raw: { x: number; y: number; z: number };
    magnitude: number;
    activity: 'rest' | 'light' | 'moderate' | 'vigorous';
  };
}

export class DataProcessor extends EventEmitter {
  private eegBuffer: number[][] = [];
  private ppgBuffer: number[][] = [];
  private accBuffer: Array<{ x: number; y: number; z: number }> = [];
  private bufferSize = 100;

  processData(data: any): ProcessedData {
    const processed: ProcessedData = {
      timestamp: data.timestamp
    };

    if (data.eeg) {
      processed.eeg = this.processEEG(data.eeg);
    }

    if (data.ppg) {
      processed.ppg = this.processPPG(data.ppg);
    }

    if (data.acc) {
      processed.acc = this.processACC(data.acc);
    }

    this.emit('processedData', processed);
    return processed;
  }

  private processEEG(eegData: number[]): ProcessedData['eeg'] {
    // Add to buffer
    this.eegBuffer.push(eegData);
    if (this.eegBuffer.length > this.bufferSize) {
      this.eegBuffer.shift();
    }

    // Simple band-pass filter (placeholder)
    const filtered = this.applyBandPassFilter(eegData);

    // Calculate frequency bands (simplified)
    const bands = this.calculateFrequencyBands(filtered);

    return {
      raw: eegData,
      filtered,
      alpha: bands.alpha,
      beta: bands.beta,
      theta: bands.theta,
      delta: bands.delta
    };
  }

  private processPPG(ppgData: number[]): ProcessedData['ppg'] {
    // Add to buffer
    this.ppgBuffer.push(ppgData);
    if (this.ppgBuffer.length > this.bufferSize) {
      this.ppgBuffer.shift();
    }

    // Calculate heart rate (simplified)
    const heartRate = this.calculateHeartRate(ppgData);
    const hrv = this.calculateHRV();

    return {
      raw: ppgData,
      heartRate,
      hrv
    };
  }

  private processACC(accData: { x: number; y: number; z: number }): ProcessedData['acc'] {
    // Add to buffer
    this.accBuffer.push(accData);
    if (this.accBuffer.length > this.bufferSize) {
      this.accBuffer.shift();
    }

    // Calculate magnitude
    const magnitude = Math.sqrt(
      accData.x ** 2 + accData.y ** 2 + accData.z ** 2
    );

    // Classify activity level
    const activity = this.classifyActivity(magnitude);

    return {
      raw: accData,
      magnitude,
      activity
    };
  }

  private applyBandPassFilter(data: number[]): number[] {
    // Simplified band-pass filter
    // In practice, you would use a proper DSP library
    return data.map(value => value * 0.8); // Placeholder
  }

  private calculateFrequencyBands(data: number[]) {
    // Simplified frequency band calculation
    // In practice, you would use FFT
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    
    return {
      alpha: Math.abs(avg) * 0.3,
      beta: Math.abs(avg) * 0.4,
      theta: Math.abs(avg) * 0.2,
      delta: Math.abs(avg) * 0.1
    };
  }

  private calculateHeartRate(ppgData: number[]): number {
    // Simplified heart rate calculation
    // In practice, you would use peak detection
    return 72 + Math.random() * 20; // Placeholder
  }

  private calculateHRV(): number {
    // Simplified HRV calculation
    return Math.random() * 50; // Placeholder
  }

  private classifyActivity(magnitude: number): 'rest' | 'light' | 'moderate' | 'vigorous' {
    if (magnitude < 1.1) return 'rest';
    if (magnitude < 1.5) return 'light';
    if (magnitude < 2.0) return 'moderate';
    return 'vigorous';
  }
}
```

### Real-time Analytics

```typescript
// src/services/AnalyticsService.ts
import { EventEmitter } from 'events';

export interface AnalyticsReport {
  sessionDuration: number;
  dataQuality: {
    eeg: number; // 0-100
    ppg: number; // 0-100
    acc: number; // 0-100
  };
  averageHeartRate: number;
  stressLevel: number; // 0-100
  activityLevel: number; // 0-100
  focusLevel: number; // 0-100
}

export class AnalyticsService extends EventEmitter {
  private sessionStart: number = Date.now();
  private dataHistory: any[] = [];
  private maxHistorySize = 1000;

  addDataPoint(data: any): void {
    this.dataHistory.push({
      ...data,
      timestamp: Date.now()
    });

    // Keep history size manageable
    if (this.dataHistory.length > this.maxHistorySize) {
      this.dataHistory.shift();
    }

    // Generate real-time analytics
    const analytics = this.generateAnalytics();
    this.emit('analytics', analytics);
  }

  generateAnalytics(): AnalyticsReport {
    const now = Date.now();
    const sessionDuration = (now - this.sessionStart) / 1000; // seconds

    // Calculate data quality
    const dataQuality = this.calculateDataQuality();

    // Calculate metrics
    const averageHeartRate = this.calculateAverageHeartRate();
    const stressLevel = this.calculateStressLevel();
    const activityLevel = this.calculateActivityLevel();
    const focusLevel = this.calculateFocusLevel();

    return {
      sessionDuration,
      dataQuality,
      averageHeartRate,
      stressLevel,
      activityLevel,
      focusLevel
    };
  }

  private calculateDataQuality() {
    const recentData = this.dataHistory.slice(-50); // Last 50 points
    
    return {
      eeg: this.calculateSignalQuality(recentData, 'eeg'),
      ppg: this.calculateSignalQuality(recentData, 'ppg'),
      acc: this.calculateSignalQuality(recentData, 'acc')
    };
  }

  private calculateSignalQuality(data: any[], signal: string): number {
    if (data.length === 0) return 0;
    
    // Simplified quality calculation based on signal consistency
    const values = data
      .filter(d => d[signal])
      .map(d => Array.isArray(d[signal]) ? d[signal][0] : d[signal]);
    
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const quality = Math.max(0, 100 - variance * 10);
    
    return Math.min(100, quality);
  }

  private calculateAverageHeartRate(): number {
    const ppgData = this.dataHistory
      .filter(d => d.ppg && d.ppg.heartRate)
      .map(d => d.ppg.heartRate);
    
    if (ppgData.length === 0) return 0;
    
    return ppgData.reduce((a, b) => a + b, 0) / ppgData.length;
  }

  private calculateStressLevel(): number {
    // Simplified stress calculation based on HRV and EEG
    const recentData = this.dataHistory.slice(-20);
    
    if (recentData.length === 0) return 0;
    
    // Mock calculation
    return Math.random() * 100;
  }

  private calculateActivityLevel(): number {
    const accData = this.dataHistory
      .filter(d => d.acc && d.acc.magnitude)
      .map(d => d.acc.magnitude);
    
    if (accData.length === 0) return 0;
    
    const avgMagnitude = accData.reduce((a, b) => a + b, 0) / accData.length;
    return Math.min(100, avgMagnitude * 50);
  }

  private calculateFocusLevel(): number {
    // Simplified focus calculation based on EEG alpha/beta ratio
    const eegData = this.dataHistory
      .filter(d => d.eeg && d.eeg.alpha && d.eeg.beta)
      .slice(-10);
    
    if (eegData.length === 0) return 0;
    
    const avgAlpha = eegData.reduce((a, d) => a + d.eeg.alpha, 0) / eegData.length;
    const avgBeta = eegData.reduce((a, d) => a + d.eeg.beta, 0) / eegData.length;
    
    const ratio = avgBeta / (avgAlpha + 0.001); // Avoid division by zero
    return Math.min(100, ratio * 20);
  }

  reset(): void {
    this.sessionStart = Date.now();
    this.dataHistory = [];
  }
}
```

## Complete Example

### Main Application

```typescript
// src/examples/CompleteExample.ts
import { LinkBandService } from '../services/LinkBandService';
import { LinkBandWebSocketClient } from '../clients/WebSocketClient';
import { DataProcessor } from '../services/DataProcessor';
import { AnalyticsService } from '../services/AnalyticsService';

export class LinkBandApplication {
  private linkBandService: LinkBandService;
  private wsClient: LinkBandWebSocketClient;
  private dataProcessor: DataProcessor;
  private analyticsService: AnalyticsService;
  private isRunning = false;

  constructor() {
    this.linkBandService = new LinkBandService();
    this.wsClient = new LinkBandWebSocketClient();
    this.dataProcessor = new DataProcessor();
    this.analyticsService = new AnalyticsService();
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Link Band Service Events
    this.linkBandService.on('deviceConnected', (address) => {
      console.log(`Device connected: ${address}`);
    });

    this.linkBandService.on('streamingStarted', () => {
      console.log('Streaming started');
      this.wsClient.connect();
    });

    this.linkBandService.on('error', (error) => {
      console.error('Link Band Service Error:', error);
    });

    // WebSocket Client Events
    this.wsClient.on('connected', () => {
      console.log('WebSocket connected');
    });

    this.wsClient.on('data', (data) => {
      // Process incoming data
      const processed = this.dataProcessor.processData(data);
      this.analyticsService.addDataPoint(processed);
    });

    this.wsClient.on('error', (error) => {
      console.error('WebSocket Error:', error);
    });

    // Data Processor Events
    this.dataProcessor.on('processedData', (data) => {
      console.log('Processed data:', data);
    });

    // Analytics Service Events
    this.analyticsService.on('analytics', (report) => {
      console.log('Analytics Report:', report);
    });
  }

  async start(): Promise<void> {
    try {
      console.log('Starting Link Band Application...');
      
      // 1. Scan for devices
      const devices = await this.linkBandService.scanDevices();
      console.log('Found devices:', devices);
      
      if (devices.length === 0) {
        throw new Error('No devices found');
      }

      // 2. Connect to first available device
      await this.linkBandService.connectDevice(devices[0].address);
      
      // 3. Initialize and start streaming
      await this.linkBandService.initializeStream();
      await this.linkBandService.startStreaming();
      
      // 4. Start recording
      await this.linkBandService.startRecording(`session_${Date.now()}`);
      
      this.isRunning = true;
      console.log('Application started successfully');
      
    } catch (error) {
      console.error('Failed to start application:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      console.log('Stopping Link Band Application...');
      
      // Stop recording
      await this.linkBandService.stopRecording();
      
      // Stop streaming
      await this.linkBandService.stopStreaming();
      
      // Disconnect WebSocket
      this.wsClient.disconnect();
      
      // Disconnect device
      await this.linkBandService.disconnectDevice();
      
      this.isRunning = false;
      console.log('Application stopped successfully');
      
    } catch (error) {
      console.error('Failed to stop application:', error);
      throw error;
    }
  }

  async getStatus() {
    const deviceStatus = await this.linkBandService.getDeviceStatus();
    const streamStatus = await this.linkBandService.getStreamStatus();
    const recordingStatus = await this.linkBandService.getRecordingStatus();
    const analytics = this.analyticsService.generateAnalytics();

    return {
      device: deviceStatus,
      stream: streamStatus,
      recording: recordingStatus,
      analytics,
      isRunning: this.isRunning,
      websocketConnected: this.wsClient.isConnected()
    };
  }
}

// Usage Example
async function main() {
  const app = new LinkBandApplication();
  
  try {
    await app.start();
    
    // Run for 30 seconds
    setTimeout(async () => {
      const status = await app.getStatus();
      console.log('Final Status:', status);
      
      await app.stop();
      process.exit(0);
    }, 30000);
    
  } catch (error) {
    console.error('Application error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

## TypeScript Support

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/app.js",
    "dev": "nodemon --exec ts-node src/app.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "clean": "rm -rf dist"
  }
}
```

## Best Practices

### 1. Error Handling

```typescript
// src/utils/errorHandler.ts
export class LinkBandError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'LinkBandError';
  }
}

export const handleApiError = (error: any): LinkBandError => {
  if (error.response?.data?.detail) {
    return new LinkBandError(
      error.response.data.detail,
      'API_ERROR',
      error.response.status
    );
  }
  
  if (error.code === 'ECONNREFUSED') {
    return new LinkBandError(
      'Unable to connect to Link Band API',
      'CONNECTION_ERROR',
      503
    );
  }
  
  return new LinkBandError(
    error.message || 'Unknown error occurred',
    'UNKNOWN_ERROR'
  );
};
```

### 2. Configuration Management

```typescript
// src/config/index.ts
export const config = {
  api: {
    baseUrl: process.env.LINK_BAND_API_URL || 'http://localhost:8121',
    timeout: parseInt(process.env.API_TIMEOUT || '10000'),
  },
  websocket: {
    url: process.env.WEBSOCKET_URL || 'ws://localhost:18765',
    reconnectAttempts: parseInt(process.env.WS_RECONNECT_ATTEMPTS || '5'),
    reconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY || '1000'),
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || 'localhost',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  }
};
```

### 3. Logging

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

This comprehensive Node.js integration guide provides everything needed to build a full-featured Link Band SDK application with Express servers, WebSocket clients, real-time data processing, and analytics capabilities. 