# JavaScript Examples

## Overview

This document provides various examples of using the Link Band SDK in JavaScript/TypeScript. It covers practical examples that can be used in both web browser and Node.js environments.

## Basic Setup

### HTML Environment

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Band SDK Examples</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div id="app">
        <h1>Link Band Real-time Monitoring</h1>
        <div id="status"></div>
        <div id="charts"></div>
    </div>
    
    <script src="linkband-client.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

### Basic Client Class

```javascript
class LinkBandClient {
    constructor(baseUrl = 'http://localhost:8121') {
        this.baseUrl = baseUrl;
        this.websocket = null;
        this.isConnected = false;
    }
    
    async get(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    
    async post(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    
    connectWebSocket() {
        return new Promise((resolve, reject) => {
            this.websocket = new WebSocket('ws://localhost:8121/ws');
            
            this.websocket.onopen = () => {
                this.isConnected = true;
                console.log('WebSocket connected');
                resolve(this.websocket);
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
            
            this.websocket.onclose = () => {
                this.isConnected = false;
                console.log('WebSocket connection closed');
            };
        });
    }
    
    sendMessage(data) {
        if (this.isConnected && this.websocket) {
            this.websocket.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected');
        }
    }
}
```

## Example 1: Device Management

### Device Scanning and Connection

```javascript
class DeviceManager {
    constructor() {
        this.client = new LinkBandClient();
        this.connectedDevice = null;
    }
    
    async scanDevices() {
        try {
            console.log('Starting device scan...');
            
            // Start scan
            const scanResult = await this.client.post('/device/scan', {
                duration: 10
            });
            
            console.log('Scan result:', scanResult);
            
            // Wait for scan completion
            await this.waitForScanComplete();
            
            // Get scanned device list
            const devices = await this.client.get('/device/list');
            console.log(`Found ${devices.data.length} devices`);
            
            return devices.data;
            
        } catch (error) {
            console.error('Device scan error:', error);
            throw error;
        }
    }
    
    async waitForScanComplete() {
        return new Promise(resolve => {
            setTimeout(resolve, 12000); // Wait 12 seconds
        });
    }
    
    async connectDevice(deviceAddress) {
        try {
            console.log(`Connecting to device: ${deviceAddress}`);
            
            const result = await this.client.post('/device/connect', {
                address: deviceAddress
            });
            
            if (result.success) {
                this.connectedDevice = deviceAddress;
                console.log('Device connected successfully');
                
                // Check connection status
                await this.checkConnectionStatus();
                
                return true;
            } else {
                throw new Error(result.message || 'Connection failed');
            }
            
        } catch (error) {
            console.error('Device connection error:', error);
            throw error;
        }
    }
    
    async checkConnectionStatus() {
        try {
            const status = await this.client.get('/device/status');
            console.log('Connection status:', status);
            
            // Check battery information
            const battery = await this.client.get('/device/battery');
            console.log(`Battery level: ${battery.data.level}%`);
            
        } catch (error) {
            console.error('Status check error:', error);
        }
    }
    
    async disconnectDevice() {
        try {
            if (this.connectedDevice) {
                const result = await this.client.post('/device/disconnect', {});
                console.log('Device disconnected:', result);
                this.connectedDevice = null;
            }
        } catch (error) {
            console.error('Disconnection error:', error);
        }
    }
}

// Usage example
async function deviceManagementExample() {
    const deviceManager = new DeviceManager();
    
    try {
        // Scan devices
        const devices = await deviceManager.scanDevices();
        
        if (devices.length > 0) {
            // Connect to first device
            // Show device selection UI instead of auto-connecting
            displayDeviceSelection(devices);
            
            // Wait for user selection and connection
            await waitForUserConnection();
            await new Promise(resolve => setTimeout(resolve, 30000));
            
            // Disconnect device
            await deviceManager.disconnectDevice();
        } else {
            console.log('No devices found');
        }
        
    } catch (error) {
        console.error('Device management error:', error);
    }
}

// Add these helper functions for safe device selection

function displayDeviceSelection(devices) {
    console.log('Available devices:');
    devices.forEach((device, index) => {
        console.log(`${index + 1}. ${device.name} (${device.address}) - Signal: ${device.rssi} dBm`);
    });
    console.log('Please use connectToDevice(deviceAddress) to connect to a specific device');
}

async function connectToDevice(deviceAddress) {
    if (!deviceAddress) {
        console.error('Device address is required');
        return false;
    }
    
    try {
        console.log(`Connecting to device: ${deviceAddress}`);
        await deviceManager.connectDevice(deviceAddress);
        console.log('Device connected successfully');
        return true;
    } catch (error) {
        console.error('Connection failed:', error);
        return false;
    }
}

async function waitForUserConnection() {
    console.log('Waiting for user to select and connect a device...');
    // In a real application, this would wait for user interaction
    return new Promise(resolve => {
        setTimeout(() => {
            console.log('Timeout: No device connected by user');
            resolve(false);
        }, 30000);
    });
}
```

## Example 2: Real-time Data Streaming

### WebSocket Data Streaming

```javascript
class DataStreamer {
    constructor() {
        this.client = new LinkBandClient();
        this.isStreaming = false;
        this.dataBuffer = {
            eeg: [],
            ppg: [],
            acc: []
        };
    }
    
    async startStreaming() {
        try {
            // Connect WebSocket
            await this.client.connectWebSocket();
            
            // Set up message handler
            this.client.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };
            
            // Start streaming
            const result = await this.client.post('/stream/start', {
                sensors: ['eeg', 'ppg', 'acc'],
                sample_rate: 250
            });
            
            if (result.success) {
                this.isStreaming = true;
                console.log('Streaming started');
            }
            
        } catch (error) {
            console.error('Streaming start error:', error);
        }
    }
    
    async stopStreaming() {
        try {
            const result = await this.client.post('/stream/stop', {});
            
            if (result.success) {
                this.isStreaming = false;
                console.log('Streaming stopped');
            }
            
            if (this.client.websocket) {
                this.client.websocket.close();
            }
            
        } catch (error) {
            console.error('Streaming stop error:', error);
        }
    }
    
    handleMessage(data) {
        if (data.type === 'raw_data') {
            this.handleRawData(data);
        } else if (data.type === 'processed_data') {
            this.handleProcessedData(data);
        } else if (data.type === 'event') {
            this.handleEvent(data);
        }
    }
    
    handleRawData(data) {
        const { sensor_type, data: samples } = data;
        
        // Add to buffer
        if (this.dataBuffer[sensor_type]) {
            this.dataBuffer[sensor_type].push(...samples);
            
            // Limit buffer size
            if (this.dataBuffer[sensor_type].length > 1000) {
                this.dataBuffer[sensor_type] = this.dataBuffer[sensor_type].slice(-1000);
            }
        }
        
        // Process by sensor type
        switch (sensor_type) {
            case 'eeg':
                this.processEEGData(samples);
                break;
            case 'ppg':
                this.processPPGData(samples);
                break;
            case 'acc':
                this.processACCData(samples);
                break;
        }
    }
    
    handleProcessedData(data) {
        const { sensor_type, data: processedData } = data;
        
        switch (sensor_type) {
            case 'eeg':
                this.displayEEGMetrics(processedData);
                break;
            case 'ppg':
                this.displayPPGMetrics(processedData);
                break;
        }
    }
    
    handleEvent(data) {
        switch (data.event_type) {
            case 'stream_started':
                console.log('Stream started event received');
                break;
            case 'stream_stopped':
                console.log('Stream stopped event received');
                break;
            case 'device_disconnected':
                console.log('Device disconnected during streaming');
                this.isStreaming = false;
                break;
        }
    }
    
    processEEGData(samples) {
        samples.forEach(sample => {
            const { timestamp, ch1, ch2, leadoff_ch1, leadoff_ch2 } = sample;
            
            // Check electrode connection
            if (!leadoff_ch1 && !leadoff_ch2) {
                console.log(`EEG data - CH1: ${ch1.toFixed(2)}, CH2: ${ch2.toFixed(2)}`);
                
                // Update real-time chart
                this.updateEEGChart(ch1, ch2, timestamp);
            } else {
                console.warn('EEG electrode disconnected');
            }
        });
    }
    
    processPPGData(samples) {
        samples.forEach(sample => {
            const { timestamp, red, ir } = sample;
            
            console.log(`PPG data - Red: ${red}, IR: ${ir}`);
            
            // Update real-time chart
            this.updatePPGChart(red, ir, timestamp);
        });
    }
    
    processACCData(samples) {
        samples.forEach(sample => {
            const { timestamp, x, y, z } = sample;
            
            console.log(`ACC data - X: ${x}, Y: ${y}, Z: ${z}`);
            
            // Calculate magnitude
            const magnitude = Math.sqrt(x * x + y * y + z * z);
            this.updateACCChart(magnitude, timestamp);
        });
    }
    
    displayEEGMetrics(data) {
        const {
            focus_index,
            relaxation_index,
            stress_index,
            signal_quality,
            band_powers
        } = data;
        
        console.log('EEG Metrics:');
        console.log(`  Focus: ${focus_index.toFixed(2)}`);
        console.log(`  Relaxation: ${relaxation_index.toFixed(2)}`);
        console.log(`  Stress: ${stress_index.toFixed(2)}`);
        console.log(`  Signal Quality: ${signal_quality}`);
        
        // Update UI
        this.updateEEGMetricsUI(data);
    }
    
    displayPPGMetrics(data) {
        const {
            bpm,
            sdnn,
            rmssd,
            lf_hf,
            signal_quality
        } = data;
        
        console.log('PPG Metrics:');
        console.log(`  Heart Rate: ${bpm} BPM`);
        console.log(`  SDNN: ${sdnn.toFixed(2)} ms`);
        console.log(`  RMSSD: ${rmssd.toFixed(2)} ms`);
        console.log(`  LF/HF: ${lf_hf.toFixed(2)}`);
        console.log(`  Signal Quality: ${signal_quality}`);
        
        // Update UI
        this.updatePPGMetricsUI(data);
    }
    
    updateEEGChart(ch1, ch2, timestamp) {
        // Chart update logic
        // This would typically update a Chart.js or similar visualization
    }
    
    updatePPGChart(red, ir, timestamp) {
        // Chart update logic
    }
    
    updateACCChart(magnitude, timestamp) {
        // Chart update logic
    }
    
    updateEEGMetricsUI(data) {
        // UI update logic
        document.getElementById('focus-value').textContent = data.focus_index.toFixed(2);
        document.getElementById('relaxation-value').textContent = data.relaxation_index.toFixed(2);
        document.getElementById('stress-value').textContent = data.stress_index.toFixed(2);
    }
    
    updatePPGMetricsUI(data) {
        // UI update logic
        document.getElementById('heart-rate').textContent = `${data.bpm} BPM`;
        document.getElementById('hrv-sdnn').textContent = `${data.sdnn.toFixed(2)} ms`;
        document.getElementById('hrv-rmssd').textContent = `${data.rmssd.toFixed(2)} ms`;
    }
}

// Usage example
async function streamingExample() {
    const streamer = new DataStreamer();
    
    try {
        await streamer.startStreaming();
        
        // Stream for 60 seconds
        setTimeout(async () => {
            await streamer.stopStreaming();
        }, 60000);
        
    } catch (error) {
        console.error('Streaming example error:', error);
    }
}
```

## Example 3: Data Recording and Analysis

### Recording Management

```javascript
class RecordingManager {
    constructor() {
        this.client = new LinkBandClient();
        this.isRecording = false;
        this.currentSession = null;
    }
    
    async startRecording(sessionName, duration = 300) {
        try {
            const result = await this.client.post('/recording/start', {
                session_name: sessionName,
                sensors: ['eeg', 'ppg', 'acc'],
                sample_rate: 250,
                duration: duration
            });
            
            if (result.success) {
                this.isRecording = true;
                this.currentSession = result.data.session_id;
                console.log(`Recording started: ${sessionName} (ID: ${this.currentSession})`);
                
                // Monitor recording progress
                this.monitorRecording();
                
                return result.data;
            } else {
                throw new Error(result.message || 'Recording start failed');
            }
            
        } catch (error) {
            console.error('Recording start error:', error);
            throw error;
        }
    }
    
    async stopRecording() {
        try {
            const result = await this.client.post('/recording/stop', {});
            
            if (result.success) {
                this.isRecording = false;
                console.log('Recording stopped');
                
                // Get recording information
                const recordingInfo = await this.getRecordingInfo(this.currentSession);
                console.log('Recording info:', recordingInfo);
                
                this.currentSession = null;
                return recordingInfo;
            }
            
        } catch (error) {
            console.error('Recording stop error:', error);
            throw error;
        }
    }
    
    async getRecordingInfo(sessionId) {
        try {
            const result = await this.client.get(`/recording/sessions/${sessionId}`);
            return result.data;
        } catch (error) {
            console.error('Recording info error:', error);
            throw error;
        }
    }
    
    async monitorRecording() {
        const checkInterval = setInterval(async () => {
            if (!this.isRecording) {
                clearInterval(checkInterval);
                return;
            }
            
            try {
                const status = await this.client.get('/recording/status');
                console.log('Recording status:', status.data);
                
                // Check if recording completed
                if (status.data.status === 'completed') {
                    this.isRecording = false;
                    clearInterval(checkInterval);
                    console.log('Recording completed automatically');
                }
                
            } catch (error) {
                console.error('Recording status check error:', error);
            }
        }, 5000); // Check every 5 seconds
    }
    
    async listRecordings() {
        try {
            const result = await this.client.get('/recording/sessions');
            return result.data;
        } catch (error) {
            console.error('List recordings error:', error);
            throw error;
        }
    }
    
    async deleteRecording(sessionId) {
        try {
            const result = await this.client.post(`/recording/sessions/${sessionId}/delete`, {});
            return result.success;
        } catch (error) {
            console.error('Delete recording error:', error);
            throw error;
        }
    }
    
    async exportRecording(sessionId, format = 'csv') {
        try {
            const result = await this.client.post(`/recording/sessions/${sessionId}/export`, {
                format: format
            });
            
            if (result.success) {
                console.log(`Recording exported: ${result.data.file_path}`);
                return result.data.file_path;
            }
            
        } catch (error) {
            console.error('Export recording error:', error);
            throw error;
        }
    }
}

// Usage example
async function recordingExample() {
    const recorder = new RecordingManager();
    
    try {
        // Start 5-minute recording
        const sessionInfo = await recorder.startRecording('test_session', 300);
        console.log('Recording started:', sessionInfo);
        
        // Wait for recording to complete (or stop manually)
        // await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
        
        // Or stop manually after 30 seconds
        setTimeout(async () => {
            await recorder.stopRecording();
        }, 30000);
        
        // List all recordings
        setTimeout(async () => {
            const recordings = await recorder.listRecordings();
            console.log('All recordings:', recordings);
            
            // Export latest recording
            if (recordings.length > 0) {
                const filePath = await recorder.exportRecording(recordings[0].session_id);
                console.log('Exported to:', filePath);
            }
        }, 35000);
        
    } catch (error) {
        console.error('Recording example error:', error);
    }
}
```

## Example 4: Real-time Visualization

### Chart.js Integration

```javascript
class RealTimeVisualization {
    constructor() {
        this.client = new LinkBandClient();
        this.charts = {};
        this.dataPoints = 100; // Number of points to display
    }
    
    async initialize() {
        // Initialize charts
        this.initializeEEGChart();
        this.initializePPGChart();
        this.initializeACCChart();
        this.initializeMetricsChart();
        
        // Connect WebSocket
        await this.client.connectWebSocket();
        this.client.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleData(data);
        };
    }
    
    initializeEEGChart() {
        const ctx = document.getElementById('eeg-chart').getContext('2d');
        this.charts.eeg = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: this.dataPoints}, (_, i) => i),
                datasets: [
                    {
                        label: 'EEG CH1',
                        data: Array(this.dataPoints).fill(0),
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.1,
                        pointRadius: 0
                    },
                    {
                        label: 'EEG CH2',
                        data: Array(this.dataPoints).fill(0),
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.1,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Amplitude (µV)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time (samples)'
                        }
                    }
                }
            }
        });
    }
    
    initializePPGChart() {
        const ctx = document.getElementById('ppg-chart').getContext('2d');
        this.charts.ppg = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: this.dataPoints}, (_, i) => i),
                datasets: [
                    {
                        label: 'PPG Red',
                        data: Array(this.dataPoints).fill(0),
                        borderColor: 'rgb(255, 0, 0)',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        tension: 0.1,
                        pointRadius: 0
                    },
                    {
                        label: 'PPG IR',
                        data: Array(this.dataPoints).fill(0),
                        borderColor: 'rgb(128, 0, 128)',
                        backgroundColor: 'rgba(128, 0, 128, 0.1)',
                        tension: 0.1,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Amplitude'
                        }
                    }
                }
            }
        });
    }
    
    initializeACCChart() {
        const ctx = document.getElementById('acc-chart').getContext('2d');
        this.charts.acc = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: this.dataPoints}, (_, i) => i),
                datasets: [
                    {
                        label: 'X-axis',
                        data: Array(this.dataPoints).fill(0),
                        borderColor: 'rgb(255, 99, 132)',
                        pointRadius: 0
                    },
                    {
                        label: 'Y-axis',
                        data: Array(this.dataPoints).fill(0),
                        borderColor: 'rgb(54, 162, 235)',
                        pointRadius: 0
                    },
                    {
                        label: 'Z-axis',
                        data: Array(this.dataPoints).fill(0),
                        borderColor: 'rgb(75, 192, 192)',
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Acceleration (g)'
                        }
                    }
                }
            }
        });
    }
    
    initializeMetricsChart() {
        const ctx = document.getElementById('metrics-chart').getContext('2d');
        this.charts.metrics = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Focus', 'Relaxation', 'Stress', 'Heart Rate'],
                datasets: [{
                    label: 'Current Values',
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
    
    handleData(data) {
        if (data.type === 'raw_data') {
            this.updateRawDataChart(data);
        } else if (data.type === 'processed_data') {
            this.updateProcessedDataChart(data);
        }
    }
    
    updateRawDataChart(data) {
        const { sensor_type, data: samples } = data;
        
        switch (sensor_type) {
            case 'eeg':
                this.updateEEGChart(samples);
                break;
            case 'ppg':
                this.updatePPGChart(samples);
                break;
            case 'acc':
                this.updateACCChart(samples);
                break;
        }
    }
    
    updateEEGChart(samples) {
        const chart = this.charts.eeg;
        
        samples.forEach(sample => {
            const { ch1, ch2 } = sample;
            
            // Add new data point
            chart.data.datasets[0].data.push(ch1);
            chart.data.datasets[1].data.push(ch2);
            
            // Remove old data points
            if (chart.data.datasets[0].data.length > this.dataPoints) {
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
            }
        });
        
        chart.update('none'); // No animation for real-time updates
    }
    
    updatePPGChart(samples) {
        const chart = this.charts.ppg;
        
        samples.forEach(sample => {
            const { red, ir } = sample;
            
            chart.data.datasets[0].data.push(red);
            chart.data.datasets[1].data.push(ir);
            
            if (chart.data.datasets[0].data.length > this.dataPoints) {
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
            }
        });
        
        chart.update('none');
    }
    
    updateACCChart(samples) {
        const chart = this.charts.acc;
        
        samples.forEach(sample => {
            const { x, y, z } = sample;
            
            chart.data.datasets[0].data.push(x);
            chart.data.datasets[1].data.push(y);
            chart.data.datasets[2].data.push(z);
            
            if (chart.data.datasets[0].data.length > this.dataPoints) {
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
                chart.data.datasets[2].data.shift();
            }
        });
        
        chart.update('none');
    }
    
    updateProcessedDataChart(data) {
        const { sensor_type, data: processedData } = data;
        
        if (sensor_type === 'eeg') {
            const { focus_index, relaxation_index, stress_index } = processedData;
            
            this.charts.metrics.data.datasets[0].data[0] = focus_index;
            this.charts.metrics.data.datasets[0].data[1] = relaxation_index;
            this.charts.metrics.data.datasets[0].data[2] = stress_index;
            
            this.charts.metrics.update('none');
        } else if (sensor_type === 'ppg') {
            const { bpm } = processedData;
            
            this.charts.metrics.data.datasets[0].data[3] = bpm;
            this.charts.metrics.update('none');
        }
    }
    
    async startVisualization() {
        try {
            await this.initialize();
            
            // Start streaming
            await this.client.post('/stream/start', {
                sensors: ['eeg', 'ppg', 'acc'],
                sample_rate: 250
            });
            
            console.log('Real-time visualization started');
            
        } catch (error) {
            console.error('Visualization start error:', error);
        }
    }
    
    async stopVisualization() {
        try {
            await this.client.post('/stream/stop', {});
            
            if (this.client.websocket) {
                this.client.websocket.close();
            }
            
            console.log('Real-time visualization stopped');
            
        } catch (error) {
            console.error('Visualization stop error:', error);
        }
    }
}

// Usage example
async function visualizationExample() {
    const visualization = new RealTimeVisualization();
    
    try {
        await visualization.startVisualization();
        
        // Run for 2 minutes
        setTimeout(async () => {
            await visualization.stopVisualization();
        }, 120000);
        
    } catch (error) {
        console.error('Visualization example error:', error);
    }
}
```

## Example 5: Complete Application

### Full Application Integration

```javascript
class LinkBandApp {
    constructor() {
        this.client = new LinkBandClient();
        this.deviceManager = new DeviceManager();
        this.dataStreamer = new DataStreamer();
        this.recordingManager = new RecordingManager();
        this.visualization = new RealTimeVisualization();
        
        this.state = {
            isConnected: false,
            isStreaming: false,
            isRecording: false,
            connectedDevice: null,
            currentSession: null
        };
        
        this.initializeUI();
    }
    
    initializeUI() {
        // Connect button
        document.getElementById('connect-btn').addEventListener('click', () => {
            this.connectDevice();
        });
        
        // Disconnect button
        document.getElementById('disconnect-btn').addEventListener('click', () => {
            this.disconnectDevice();
        });
        
        // Start streaming button
        document.getElementById('start-stream-btn').addEventListener('click', () => {
            this.startStreaming();
        });
        
        // Stop streaming button
        document.getElementById('stop-stream-btn').addEventListener('click', () => {
            this.stopStreaming();
        });
        
        // Start recording button
        document.getElementById('start-record-btn').addEventListener('click', () => {
            const sessionName = document.getElementById('session-name').value || 'default_session';
            this.startRecording(sessionName);
        });
        
        // Stop recording button
        document.getElementById('stop-record-btn').addEventListener('click', () => {
            this.stopRecording();
        });
        
        // Export data button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });
        
        this.updateUI();
    }
    
    async scanDevices() {
        try {
            this.updateStatus('Scanning for devices...');
            
            const devices = await this.deviceManager.scanDevices();
            
            if (devices.length > 0) {
                this.availableDevices = devices;
                this.updateStatus(`Found ${devices.length} devices. Please select one to connect.`);
                this.displayDeviceList(devices);
            } else {
                this.updateStatus('No devices found');
            }
            
        } catch (error) {
            this.updateStatus(`Scan error: ${error.message}`);
            console.error('Scan device error:', error);
        }
    }

    async connectDevice(deviceAddress) {
        if (!deviceAddress) {
            this.updateStatus('Please select a device first');
            return;
        }
        
        try {
            this.updateStatus(`Connecting to device ${deviceAddress}...`);
            await this.deviceManager.connectDevice(deviceAddress);
            
            this.state.isConnected = true;
            this.state.connectedDevice = this.availableDevices.find(d => d.address === deviceAddress);
            
            this.updateStatus('Device connected successfully');
            this.updateUI();
            
        } catch (error) {
            this.updateStatus(`Connection error: ${error.message}`);
            console.error('Connect device error:', error);
        }
    }

    displayDeviceList(devices) {
        const deviceListElement = document.getElementById('device-list');
        if (!deviceListElement) return;
        
        deviceListElement.innerHTML = '<h3>Available Devices</h3>';
        devices.forEach((device, index) => {
            const deviceElement = document.createElement('div');
            deviceElement.className = 'device-item';
            deviceElement.innerHTML = `
                <button onclick="app.connectDevice('${device.address}')" class="device-button">
                    <strong>${device.name}</strong><br>
                    <small>${device.address} (${device.rssi} dBm)</small>
                </button>
            `;
            deviceListElement.appendChild(deviceElement);
        });
    }
    
    async disconnectDevice() {
        try {
            if (this.state.isStreaming) {
                await this.stopStreaming();
            }
            
            if (this.state.isRecording) {
                await this.stopRecording();
            }
            
            await this.deviceManager.disconnectDevice();
            
            this.state.isConnected = false;
            this.state.connectedDevice = null;
            
            this.updateStatus('Device disconnected');
            this.updateUI();
            
        } catch (error) {
            this.updateStatus(`Disconnection error: ${error.message}`);
            console.error('Disconnect device error:', error);
        }
    }
    
    async startStreaming() {
        try {
            await this.dataStreamer.startStreaming();
            await this.visualization.startVisualization();
            
            this.state.isStreaming = true;
            this.updateStatus('Streaming started');
            this.updateUI();
            
        } catch (error) {
            this.updateStatus(`Streaming error: ${error.message}`);
            console.error('Start streaming error:', error);
        }
    }
    
    async stopStreaming() {
        try {
            await this.dataStreamer.stopStreaming();
            await this.visualization.stopVisualization();
            
            this.state.isStreaming = false;
            this.updateStatus('Streaming stopped');
            this.updateUI();
            
        } catch (error) {
            this.updateStatus(`Stop streaming error: ${error.message}`);
            console.error('Stop streaming error:', error);
        }
    }
    
    async startRecording(sessionName) {
        try {
            const sessionInfo = await this.recordingManager.startRecording(sessionName);
            
            this.state.isRecording = true;
            this.state.currentSession = sessionInfo;
            
            this.updateStatus(`Recording started: ${sessionName}`);
            this.updateUI();
            
        } catch (error) {
            this.updateStatus(`Recording error: ${error.message}`);
            console.error('Start recording error:', error);
        }
    }
    
    async stopRecording() {
        try {
            const recordingInfo = await this.recordingManager.stopRecording();
            
            this.state.isRecording = false;
            this.state.currentSession = null;
            
            this.updateStatus('Recording stopped');
            this.updateUI();
            
            return recordingInfo;
            
        } catch (error) {
            this.updateStatus(`Stop recording error: ${error.message}`);
            console.error('Stop recording error:', error);
        }
    }
    
    async exportData() {
        try {
            const recordings = await this.recordingManager.listRecordings();
            
            if (recordings.length > 0) {
                const latestRecording = recordings[0];
                const filePath = await this.recordingManager.exportRecording(latestRecording.session_id);
                
                this.updateStatus(`Data exported to: ${filePath}`);
            } else {
                this.updateStatus('No recordings available for export');
            }
            
        } catch (error) {
            this.updateStatus(`Export error: ${error.message}`);
            console.error('Export data error:', error);
        }
    }
    
    updateStatus(message) {
        document.getElementById('status').textContent = message;
        console.log(message);
    }
    
    updateUI() {
        // Update button states
        document.getElementById('connect-btn').disabled = this.state.isConnected;
        document.getElementById('disconnect-btn').disabled = !this.state.isConnected;
        document.getElementById('start-stream-btn').disabled = !this.state.isConnected || this.state.isStreaming;
        document.getElementById('stop-stream-btn').disabled = !this.state.isStreaming;
        document.getElementById('start-record-btn').disabled = !this.state.isConnected || this.state.isRecording;
        document.getElementById('stop-record-btn').disabled = !this.state.isRecording;
        
        // Update device info
        if (this.state.connectedDevice) {
            document.getElementById('device-info').innerHTML = `
                <h3>Connected Device</h3>
                <p>Name: ${this.state.connectedDevice.name}</p>
                <p>Address: ${this.state.connectedDevice.address}</p>
                <p>RSSI: ${this.state.connectedDevice.rssi} dBm</p>
            `;
        } else {
            document.getElementById('device-info').innerHTML = '<p>No device connected</p>';
        }
        
        // Update session info
        if (this.state.currentSession) {
            document.getElementById('session-info').innerHTML = `
                <h3>Current Recording</h3>
                <p>Session: ${this.state.currentSession.session_name}</p>
                <p>Duration: ${this.state.currentSession.duration}s</p>
                <p>Started: ${new Date(this.state.currentSession.start_time).toLocaleString()}</p>
            `;
        } else {
            document.getElementById('session-info').innerHTML = '<p>No active recording</p>';
        }
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    const app = new LinkBandApp();
    console.log('Link Band application initialized');
});
```

## HTML Template for Complete Application

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Band SDK - Complete Application</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        button:enabled {
            background-color: #007bff;
            color: white;
        }
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .status {
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 4px;
            background-color: #e9ecef;
            border-left: 4px solid #007bff;
        }
        .info-panel {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .info-box {
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f8f9fa;
        }
        .charts {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .chart-container {
            position: relative;
            height: 300px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        input[type="text"] {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Link Band SDK - Complete Application</h1>
        
        <div class="controls">
            <button id="connect-btn">Connect Device</button>
            <button id="disconnect-btn" disabled>Disconnect Device</button>
            <button id="start-stream-btn" disabled>Start Streaming</button>
            <button id="stop-stream-btn" disabled>Stop Streaming</button>
            <input type="text" id="session-name" placeholder="Session name">
            <button id="start-record-btn" disabled>Start Recording</button>
            <button id="stop-record-btn" disabled>Stop Recording</button>
            <button id="export-btn">Export Data</button>
        </div>
        
        <div id="status" class="status">Ready to connect</div>
        
        <div class="info-panel">
            <div id="device-info" class="info-box">
                <p>No device connected</p>
            </div>
            <div id="session-info" class="info-box">
                <p>No active recording</p>
            </div>
        </div>
        
        <div class="charts">
            <div class="chart-container">
                <canvas id="eeg-chart"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="ppg-chart"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="acc-chart"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="metrics-chart"></canvas>
            </div>
        </div>
    </div>
    
    <script src="linkband-complete-app.js"></script>
</body>
</html>
```

These examples provide comprehensive JavaScript implementations for working with the Link Band SDK, covering device management, real-time data streaming, recording, visualization, and complete application integration. 