# Integration Examples

## Overview

This document provides practical examples of integrating the Link Band SDK with various platforms and frameworks. It covers usage methods in different environments including React, Vue.js, Angular, Node.js, and more.

## React Integration

### React Component Example

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';

const LinkBandMonitor = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [deviceStatus, setDeviceStatus] = useState(null);
    const [sensorData, setSensorData] = useState({
        eeg: [],
        ppg: [],
        acc: []
    });
    
    const wsRef = useRef(null);
    const clientRef = useRef(null);
    
    useEffect(() => {
        // Initialize client when component mounts
        initializeClient();
        
        return () => {
            // Cleanup when component unmounts
            cleanup();
        };
    }, []);
    
    const initializeClient = () => {
        clientRef.current = {
            baseUrl: 'http://localhost:8121',
            
            async get(endpoint) {
                const response = await fetch(`${this.baseUrl}${endpoint}`);
                return await response.json();
            },
            
            async post(endpoint, data) {
                const response = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                return await response.json();
            }
        };
    };
    
    const connectWebSocket = async () => {
        try {
            wsRef.current = new WebSocket('ws://localhost:8121/ws');
            
            wsRef.current.onopen = () => {
                setIsConnected(true);
                console.log('WebSocket connected');
            };
            
            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleMessage(data);
            };
            
            wsRef.current.onclose = () => {
                setIsConnected(false);
                console.log('WebSocket connection closed');
            };
            
        } catch (error) {
            console.error('WebSocket connection error:', error);
        }
    };
    
    const handleMessage = (data) => {
        if (data.type === 'raw_data') {
            const sensorType = data.sensor_type;
            const samples = data.data;
            
            setSensorData(prevData => ({
                ...prevData,
                [sensorType]: [...prevData[sensorType], ...samples].slice(-100)
            }));
        }
    };
    
    const startStreaming = async () => {
        try {
            await connectWebSocket();
            await clientRef.current.post('/stream/start', {});
        } catch (error) {
            console.error('Streaming start error:', error);
        }
    };
    
    const stopStreaming = async () => {
        try {
            await clientRef.current.post('/stream/stop', {});
            if (wsRef.current) {
                wsRef.current.close();
            }
        } catch (error) {
            console.error('Streaming stop error:', error);
        }
    };
    
    const cleanup = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
    };
    
    // Prepare chart data
    const chartData = {
        labels: Array.from({ length: sensorData.eeg.length }, (_, i) => i),
        datasets: [
            {
                label: 'EEG CH1',
                data: sensorData.eeg.map(sample => sample.ch1),
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            }
        ]
    };
    
    return (
        <div className="linkband-monitor">
            <h2>Link Band Monitor</h2>
            
            <div className="controls">
                <button 
                    onClick={startStreaming} 
                    disabled={isConnected}
                >
                    Start Streaming
                </button>
                <button 
                    onClick={stopStreaming} 
                    disabled={!isConnected}
                >
                    Stop Streaming
                </button>
            </div>
            
            <div className="status">
                <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
                <p>EEG Samples: {sensorData.eeg.length}</p>
                <p>PPG Samples: {sensorData.ppg.length}</p>
                <p>ACC Samples: {sensorData.acc.length}</p>
            </div>
            
            <div className="chart">
                <Line data={chartData} options={{ animation: false }} />
            </div>
        </div>
    );
};

export default LinkBandMonitor;
```

### React Hook Example

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';

const useLinkBand = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [sensorData, setSensorData] = useState({});
    const [error, setError] = useState(null);
    
    const wsRef = useRef(null);
    const clientRef = useRef(null);
    
    useEffect(() => {
        clientRef.current = {
            baseUrl: 'http://localhost:8121',
            
            async request(method, endpoint, data = null) {
                try {
                    const options = {
                        method,
                        headers: { 'Content-Type': 'application/json' }
                    };
                    
                    if (data) {
                        options.body = JSON.stringify(data);
                    }
                    
                    const response = await fetch(`${this.baseUrl}${endpoint}`, options);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    return await response.json();
                } catch (error) {
                    setError(error.message);
                    throw error;
                }
            }
        };
    }, []);
    
    const connect = useCallback(async () => {
        try {
            setError(null);
            wsRef.current = new WebSocket('ws://localhost:8121/ws');
            
            wsRef.current.onopen = () => {
                setIsConnected(true);
                console.log('WebSocket connected');
            };
            
            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleMessage(data);
            };
            
            wsRef.current.onclose = () => {
                setIsConnected(false);
                setIsStreaming(false);
                console.log('WebSocket connection closed');
            };
            
            wsRef.current.onerror = (error) => {
                setError('WebSocket connection error');
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            setError(error.message);
            console.error('Connection error:', error);
        }
    }, []);
    
    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        setIsConnected(false);
        setIsStreaming(false);
    }, []);
    
    const startStreaming = useCallback(async () => {
        try {
            if (!isConnected) {
                await connect();
            }
            
            await clientRef.current.request('POST', '/stream/start', {
                sensors: ['eeg', 'ppg', 'acc'],
                sample_rate: 250
            });
            
            setIsStreaming(true);
        } catch (error) {
            setError(error.message);
            console.error('Start streaming error:', error);
        }
    }, [isConnected, connect]);
    
    const stopStreaming = useCallback(async () => {
        try {
            await clientRef.current.request('POST', '/stream/stop');
            setIsStreaming(false);
        } catch (error) {
            setError(error.message);
            console.error('Stop streaming error:', error);
        }
    }, []);
    
    const handleMessage = useCallback((data) => {
        if (data.type === 'raw_data') {
            setSensorData(prevData => ({
                ...prevData,
                [data.sensor_type]: [...(prevData[data.sensor_type] || []), ...data.data].slice(-1000)
            }));
        } else if (data.type === 'processed_data') {
            // Handle processed data
            console.log('Processed data received:', data);
        }
    }, []);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);
    
    return {
        isConnected,
        isStreaming,
        sensorData,
        error,
        connect,
        disconnect,
        startStreaming,
        stopStreaming
    };
};

// Usage example
const LinkBandApp = () => {
    const {
        isConnected,
        isStreaming,
        sensorData,
        error,
        connect,
        disconnect,
        startStreaming,
        stopStreaming
    } = useLinkBand();
    
    return (
        <div className="linkband-app">
            <h1>Link Band React App</h1>
            
            {error && (
                <div className="error">
                    Error: {error}
                </div>
            )}
            
            <div className="controls">
                <button onClick={connect} disabled={isConnected}>
                    Connect
                </button>
                <button onClick={disconnect} disabled={!isConnected}>
                    Disconnect
                </button>
                <button onClick={startStreaming} disabled={!isConnected || isStreaming}>
                    Start Streaming
                </button>
                <button onClick={stopStreaming} disabled={!isStreaming}>
                    Stop Streaming
                </button>
            </div>
            
            <div className="status">
                <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
                <p>Streaming: {isStreaming ? 'Active' : 'Inactive'}</p>
                <p>EEG Data Points: {sensorData.eeg?.length || 0}</p>
                <p>PPG Data Points: {sensorData.ppg?.length || 0}</p>
                <p>ACC Data Points: {sensorData.acc?.length || 0}</p>
            </div>
        </div>
    );
};

export default LinkBandApp;
```

## Vue.js Integration

### Vue 3 Composition API Example

```vue
<template>
  <div class="linkband-vue-app">
    <h1>Link Band Vue.js App</h1>
    
    <div v-if="error" class="error">
      Error: {{ error }}
    </div>
    
    <div class="controls">
      <button @click="connectDevice" :disabled="isConnected">
        Connect Device
      </button>
      <button @click="disconnectDevice" :disabled="!isConnected">
        Disconnect Device
      </button>
      <button @click="startStreaming" :disabled="!isConnected || isStreaming">
        Start Streaming
      </button>
      <button @click="stopStreaming" :disabled="!isStreaming">
        Stop Streaming
      </button>
    </div>
    
    <div class="status">
      <p>Connection: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>
      <p>Streaming: {{ isStreaming ? 'Active' : 'Inactive' }}</p>
      <p>EEG Samples: {{ sensorData.eeg?.length || 0 }}</p>
      <p>PPG Samples: {{ sensorData.ppg?.length || 0 }}</p>
      <p>ACC Samples: {{ sensorData.acc?.length || 0 }}</p>
    </div>
    
    <div class="charts">
      <canvas ref="eegChart"></canvas>
      <canvas ref="ppgChart"></canvas>
      <canvas ref="accChart"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import Chart from 'chart.js/auto'

// Reactive state
const isConnected = ref(false)
const isStreaming = ref(false)
const error = ref(null)
const sensorData = reactive({
  eeg: [],
  ppg: [],
  acc: []
})

// Refs for DOM elements
const eegChart = ref(null)
const ppgChart = ref(null)
const accChart = ref(null)

// Chart instances
let charts = {}
let websocket = null
let client = null

// Initialize client
const initializeClient = () => {
  client = {
    baseUrl: 'http://localhost:8121',
    
    async get(endpoint) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return await response.json()
      } catch (err) {
        error.value = err.message
        throw err
      }
    },
    
    async post(endpoint, data) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return await response.json()
      } catch (err) {
        error.value = err.message
        throw err
      }
    }
  }
}

// Initialize charts
const initializeCharts = () => {
  // EEG Chart
  charts.eeg = new Chart(eegChart.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'EEG CH1',
          data: [],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          tension: 0.1
        },
        {
          label: 'EEG CH2',
          data: [],
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        y: {
          title: { display: true, text: 'Amplitude (µV)' }
        }
      }
    }
  })
  
  // PPG Chart
  charts.ppg = new Chart(ppgChart.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'PPG Red',
          data: [],
          borderColor: 'rgb(255, 0, 0)',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          tension: 0.1
        },
        {
          label: 'PPG IR',
          data: [],
          borderColor: 'rgb(128, 0, 128)',
          backgroundColor: 'rgba(128, 0, 128, 0.1)',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        y: {
          title: { display: true, text: 'Amplitude' }
        }
      }
    }
  })
  
  // ACC Chart
  charts.acc = new Chart(accChart.value, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'X-axis',
          data: [],
          borderColor: 'rgb(255, 99, 132)'
        },
        {
          label: 'Y-axis',
          data: [],
          borderColor: 'rgb(54, 162, 235)'
        },
        {
          label: 'Z-axis',
          data: [],
          borderColor: 'rgb(75, 192, 192)'
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        y: {
          title: { display: true, text: 'Acceleration (g)' }
        }
      }
    }
  })
}

// WebSocket connection
const connectWebSocket = () => {
  return new Promise((resolve, reject) => {
    websocket = new WebSocket('ws://localhost:8121/ws')
    
    websocket.onopen = () => {
      isConnected.value = true
      console.log('WebSocket connected')
      resolve()
    }
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleMessage(data)
    }
    
    websocket.onclose = () => {
      isConnected.value = false
      isStreaming.value = false
      console.log('WebSocket connection closed')
    }
    
    websocket.onerror = (err) => {
      error.value = 'WebSocket connection error'
      console.error('WebSocket error:', err)
      reject(err)
    }
  })
}

// Handle WebSocket messages
const handleMessage = (data) => {
  if (data.type === 'raw_data') {
    const sensorType = data.sensor_type
    const samples = data.data
    
    // Update sensor data
    sensorData[sensorType].push(...samples)
    
    // Limit buffer size
    if (sensorData[sensorType].length > 1000) {
      sensorData[sensorType] = sensorData[sensorType].slice(-1000)
    }
    
    // Update charts
    updateChart(sensorType, samples)
  }
}

// Update chart with new data
const updateChart = (sensorType, samples) => {
  const chart = charts[sensorType]
  if (!chart) return
  
  samples.forEach(sample => {
    if (sensorType === 'eeg') {
      chart.data.datasets[0].data.push(sample.ch1)
      chart.data.datasets[1].data.push(sample.ch2)
    } else if (sensorType === 'ppg') {
      chart.data.datasets[0].data.push(sample.red)
      chart.data.datasets[1].data.push(sample.ir)
    } else if (sensorType === 'acc') {
      chart.data.datasets[0].data.push(sample.x)
      chart.data.datasets[1].data.push(sample.y)
      chart.data.datasets[2].data.push(sample.z)
    }
    
    // Limit chart data points
    chart.data.datasets.forEach(dataset => {
      if (dataset.data.length > 100) {
        dataset.data.shift()
      }
    })
  })
  
  chart.update('none')
}

// Device connection methods
const connectDevice = async () => {
  try {
    error.value = null
    await connectWebSocket()
    
    // Scan and connect to first available device
    await client.post('/device/scan', { duration: 10 })
    
    // Wait for scan completion
    setTimeout(async () => {
      const devices = await client.get('/device/list')
      if (devices.data.length > 0) {
        await client.post('/device/connect', { 
          address: devices.data[0].address 
        })
      }
    }, 12000)
    
  } catch (err) {
    error.value = err.message
    console.error('Device connection error:', err)
  }
}

const disconnectDevice = async () => {
  try {
    if (isStreaming.value) {
      await stopStreaming()
    }
    
    await client.post('/device/disconnect', {})
    
    if (websocket) {
      websocket.close()
    }
    
    isConnected.value = false
    
  } catch (err) {
    error.value = err.message
    console.error('Device disconnection error:', err)
  }
}

// Streaming methods
const startStreaming = async () => {
  try {
    await client.post('/stream/start', {
      sensors: ['eeg', 'ppg', 'acc'],
      sample_rate: 250
    })
    
    isStreaming.value = true
    
  } catch (err) {
    error.value = err.message
    console.error('Start streaming error:', err)
  }
}

const stopStreaming = async () => {
  try {
    await client.post('/stream/stop', {})
    isStreaming.value = false
    
  } catch (err) {
    error.value = err.message
    console.error('Stop streaming error:', err)
  }
}

// Lifecycle hooks
onMounted(() => {
  initializeClient()
  initializeCharts()
})

onUnmounted(() => {
  if (websocket) {
    websocket.close()
  }
  
  // Destroy charts
  Object.values(charts).forEach(chart => {
    chart.destroy()
  })
})
</script>

<style scoped>
.linkband-vue-app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.controls button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #007bff;
  color: white;
}

.controls button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.status {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.charts canvas {
  border: 1px solid #ddd;
  border-radius: 4px;
}

.error {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}
</style>
```

## Node.js Integration

### Express Server Example

```javascript
const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Link Band Client class
class LinkBandClient {
    constructor(baseUrl = 'http://localhost:8121') {
        this.baseUrl = baseUrl;
        this.websocket = null;
        this.isConnected = false;
    }
    
    async request(method, endpoint, data = null) {
        try {
            const config = {
                method,
                url: `${this.baseUrl}${endpoint}`,
                headers: { 'Content-Type': 'application/json' }
            };
            
            if (data) {
                config.data = data;
            }
            
            const response = await axios(config);
            return response.data;
            
        } catch (error) {
            console.error(`API request error (${method} ${endpoint}):`, error.message);
            throw error;
        }
    }
    
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            this.websocket = new WebSocket('ws://localhost:8121/ws');
            
            this.websocket.on('open', () => {
                this.isConnected = true;
                console.log('Link Band WebSocket connected');
                resolve();
            });
            
            this.websocket.on('error', (error) => {
                console.error('Link Band WebSocket error:', error);
                reject(error);
            });
            
            this.websocket.on('close', () => {
                this.isConnected = false;
                console.log('Link Band WebSocket connection closed');
            });
        });
    }
}

// Link Band Client instance
const linkBandClient = new LinkBandClient();

// API routes
app.get('/api/health', async (req, res) => {
    try {
        const health = await linkBandClient.request('GET', '/health');
        res.json({ status: 'ok', linkband: health });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.post('/api/device/scan', async (req, res) => {
    try {
        const { duration = 10 } = req.body;
        const result = await linkBandClient.request('POST', '/device/scan', { duration });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/device/list', async (req, res) => {
    try {
        const devices = await linkBandClient.request('GET', '/device/list');
        res.json(devices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/device/connect', async (req, res) => {
    try {
        const { address } = req.body;
        const result = await linkBandClient.request('POST', '/device/connect', { address });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/stream/start', async (req, res) => {
    try {
        const result = await linkBandClient.request('POST', '/stream/start', {});
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/stream/stop', async (req, res) => {
    try {
        const result = await linkBandClient.request('POST', '/stream/stop', {});
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Data collection and storage
let collectedData = {
    eeg: [],
    ppg: [],
    acc: []
};

app.get('/api/data/collected', (req, res) => {
    res.json(collectedData);
});

app.delete('/api/data/collected', (req, res) => {
    collectedData = { eeg: [], ppg: [], acc: [] };
    res.json({ message: 'Data cleared' });
});

// WebSocket server (client communication)
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'start_monitoring':
                    await startMonitoring(ws);
                    break;
                case 'stop_monitoring':
                    await stopMonitoring();
                    break;
                default:
                    ws.send(JSON.stringify({ error: 'Unknown message type' }));
            }
        } catch (error) {
            ws.send(JSON.stringify({ error: error.message }));
        }
    });
    
    ws.on('close', () => {
        console.log('Client connection closed');
    });
});

async function startMonitoring(clientWs) {
    try {
        // Link Band WebSocket connection
        await linkBandClient.connectWebSocket();
        
        // Message handler setup
        linkBandClient.websocket.on('message', (data) => {
            const message = JSON.parse(data);
            
            if (message.type === 'raw_data') {
                // Data collection
                const sensorType = message.sensor_type;
                collectedData[sensorType].push(...message.data);
                
                // Limit buffer size
                if (collectedData[sensorType].length > 1000) {
                    collectedData[sensorType] = collectedData[sensorType].slice(-1000);
                }
                
                // Pass data to client
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify(message));
                }
            }
        });
        
        // Streaming start
        await linkBandClient.request('POST', '/stream/start');
        
        clientWs.send(JSON.stringify({ 
            type: 'monitoring_started',
            message: 'Monitoring started successfully'
        }));
        
    } catch (error) {
        clientWs.send(JSON.stringify({ 
            type: 'error',
            message: error.message 
        }));
    }
}

async function stopMonitoring() {
    try {
        await linkBandClient.request('POST', '/stream/stop');
        
        if (linkBandClient.websocket) {
            linkBandClient.websocket.close();
        }
        
    } catch (error) {
        console.error('Monitoring stop error:', error);
    }
}

// Server start
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Cleanup on exit
process.on('SIGINT', async () => {
    console.log('Server shutting down...');
    
    try {
        await stopMonitoring();
    } catch (error) {
        console.error('Shutdown error:', error);
    }
    
    process.exit(0);
});
```

## Mobile App Integration (React Native)

### React Native Component

```jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';

const LinkBandApp = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [sensorData, setSensorData] = useState({
    eeg: 0,
    ppg: 0,
    acc: 0,
    battery: 100
  });
  const [websocket, setWebsocket] = useState(null);
  
  const baseUrl = 'http://192.168.1.100:8121'; // Replace with actual server IP
  
  const apiRequest = async (method, endpoint, data = null) => {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (data) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(`${baseUrl}${endpoint}`, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }
      
      return result;
    } catch (error) {
      Alert.alert('API Error', error.message);
      throw error;
    }
  };
  
  const connectDevice = async () => {
    try {
      // Device scan
      await apiRequest('POST', '/device/scan', { duration: 10 });
      
      Alert.alert('Scanning', 'Scanning devices for 10 seconds...');
      
      // Wait for scan completion
      setTimeout(async () => {
        try {
          const devices = await apiRequest('GET', '/device/list');
          
          if (devices.data.length > 0) {
            const device = devices.data[0];
            await apiRequest('POST', '/device/connect', { address: device.address });
            
            setIsConnected(true);
            Alert.alert('Connection Successful', `${device.name} connected`);
            
            // Check battery status
            const battery = await apiRequest('GET', '/device/battery');
            setSensorData(prev => ({ ...prev, battery: battery.data.level }));
            
          } else {
            Alert.alert('No Devices', 'No devices scanned');
          }
        } catch (error) {
          Alert.alert('Connection Failed', error.message);
        }
      }, 12000);
      
    } catch (error) {
      Alert.alert('Scan Failed', error.message);
    }
  };
  
  const startMonitoring = async () => {
    try {
      // WebSocket connection
      const ws = new WebSocket(`ws://${baseUrl.replace('http://', '')}/ws`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setWebsocket(ws);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'raw_data') {
          const sensorType = data.sensor_type;
          const samples = data.data;
          
          // Update sensor data
          setSensorData(prev => ({
            ...prev,
            [sensorType]: samples.length
          }));
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setWebsocket(null);
        setIsMonitoring(false);
      };
      
      ws.onerror = (error) => {
        Alert.alert('WebSocket Error', error.message);
      };
      
      // Streaming start
      await apiRequest('POST', '/stream/start');
      setIsMonitoring(true);
      
    } catch (error) {
      Alert.alert('Monitoring Start Error', error.message);
    }
  };
  
  const stopMonitoring = async () => {
    try {
      await apiRequest('POST', '/stream/stop');
      
      if (websocket) {
        websocket.close();
      }
      
      setIsMonitoring(false);
      
    } catch (error) {
      Alert.alert('Monitoring Stop Error', error.message);
    }
  };
  
  const disconnectDevice = async () => {
    try {
      if (isMonitoring) {
        await stopMonitoring();
      }
      
      await apiRequest('POST', '/device/disconnect');
      setIsConnected(false);
      
      Alert.alert('Disconnection Successful', 'Device disconnected');
      
    } catch (error) {
      Alert.alert('Disconnection Error', error.message);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Link Band Monitor</Text>
      
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Connection Status:</Text>
          <Text style={[styles.statusValue, isConnected ? styles.connected : styles.disconnected]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Monitoring:</Text>
          <Text style={[styles.statusValue, isMonitoring ? styles.active : styles.inactive]}>
            {isMonitoring ? 'Active' : 'Inactive'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Battery:</Text>
          <Text style={styles.statusValue}>{sensorData.battery}%</Text>
        </View>
      </View>
      
      <View style={styles.dataContainer}>
        <Text style={styles.sectionTitle}>Sensor Data</Text>
        
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>EEG Samples:</Text>
          <Text style={styles.dataValue}>{sensorData.eeg}</Text>
        </View>
        
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>PPG Samples:</Text>
          <Text style={styles.dataValue}>{sensorData.ppg}</Text>
        </View>
        
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>ACC Samples:</Text>
          <Text style={styles.dataValue}>{sensorData.acc}</Text>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isConnected && styles.buttonDisabled]}
          onPress={connectDevice}
          disabled={isConnected}
        >
          <Text style={styles.buttonText}>Connect Device</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, (!isConnected || isMonitoring) && styles.buttonDisabled]}
          onPress={startMonitoring}
          disabled={!isConnected || isMonitoring}
        >
          <Text style={styles.buttonText}>Start Monitoring</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, !isMonitoring && styles.buttonDisabled]}
          onPress={stopMonitoring}
          disabled={!isMonitoring}
        >
          <Text style={styles.buttonText}>Stop Monitoring</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, !isConnected && styles.buttonDisabled]}
          onPress={disconnectDevice}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333'
  },
  statusContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  statusLabel: {
    fontSize: 16,
    color: '#666'
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  connected: {
    color: '#4CAF50'
  },
  disconnected: {
    color: '#F44336'
  },
  active: {
    color: '#2196F3'
  },
  inactive: {
    color: '#9E9E9E'
  },
  dataContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  dataLabel: {
    fontSize: 16,
    color: '#666'
  },
  dataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  buttonContainer: {
    gap: 15
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center'
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default LinkBandApp;
```

## Notes

1. **Network Setup**: Mobile apps should use the actual server IP address.
2. **CORS Setup**: Web applications should properly set CORS policies.
3. **Error Handling**: Proper error handling is necessary for network failures or device connection issues.
4. **Performance Optimization**: Consider memory usage and rendering performance for large data handling.
5. **Security**: Implement authentication and encryption for production environments. 