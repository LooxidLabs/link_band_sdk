# 통합 예제

## 개요

이 문서에서는 Link Band SDK를 다양한 플랫폼과 프레임워크에 통합하는 실용적인 예제들을 제공합니다. React, Vue.js, Angular, Node.js 등 다양한 환경에서의 활용 방법을 다룹니다.

## React 통합

### React 컴포넌트 예제

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
        // 컴포넌트 마운트 시 클라이언트 초기화
        initializeClient();
        
        return () => {
            // 컴포넌트 언마운트 시 정리
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
                console.log('WebSocket 연결됨');
            };
            
            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleMessage(data);
            };
            
            wsRef.current.onclose = () => {
                setIsConnected(false);
                console.log('WebSocket 연결 종료됨');
            };
            
        } catch (error) {
            console.error('WebSocket 연결 오류:', error);
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
            console.error('스트리밍 시작 오류:', error);
        }
    };
    
    const stopStreaming = async () => {
        try {
            await clientRef.current.post('/stream/stop', {});
            if (wsRef.current) {
                wsRef.current.close();
            }
        } catch (error) {
            console.error('스트리밍 중지 오류:', error);
        }
    };
    
    const cleanup = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
    };
    
    // 차트 데이터 준비
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
            <h2>Link Band 모니터</h2>
            
            <div className="controls">
                <button 
                    onClick={startStreaming} 
                    disabled={isConnected}
                >
                    스트리밍 시작
                </button>
                <button 
                    onClick={stopStreaming} 
                    disabled={!isConnected}
                >
                    스트리밍 중지
                </button>
            </div>
            
            <div className="status">
                <p>연결 상태: {isConnected ? '연결됨' : '연결 안됨'}</p>
                <p>EEG 샘플: {sensorData.eeg.length}개</p>
                <p>PPG 샘플: {sensorData.ppg.length}개</p>
                <p>ACC 샘플: {sensorData.acc.length}개</p>
            </div>
            
            <div className="chart">
                <Line data={chartData} options={{ animation: false }} />
            </div>
        </div>
    );
};

export default LinkBandMonitor;
```

### React Hook 예제

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
        
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);
    
    const connectWebSocket = useCallback(async () => {
        try {
            wsRef.current = new WebSocket('ws://localhost:8121/ws');
            
            wsRef.current.onopen = () => {
                setIsConnected(true);
                setError(null);
            };
            
            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'raw_data') {
                    setSensorData(prev => ({
                        ...prev,
                        [data.sensor_type]: data.data
                    }));
                }
            };
            
            wsRef.current.onclose = () => {
                setIsConnected(false);
                setIsStreaming(false);
            };
            
            wsRef.current.onerror = (error) => {
                setError('WebSocket 연결 오류');
            };
            
        } catch (error) {
            setError(error.message);
        }
    }, []);
    
    const startStreaming = useCallback(async () => {
        try {
            if (!isConnected) {
                await connectWebSocket();
            }
            
            await clientRef.current.request('POST', '/stream/start');
            setIsStreaming(true);
            
        } catch (error) {
            setError(error.message);
        }
    }, [isConnected, connectWebSocket]);
    
    const stopStreaming = useCallback(async () => {
        try {
            await clientRef.current.request('POST', '/stream/stop');
            setIsStreaming(false);
            
            if (wsRef.current) {
                wsRef.current.close();
            }
            
        } catch (error) {
            setError(error.message);
        }
    }, []);
    
    const scanDevices = useCallback(async () => {
        try {
            return await clientRef.current.request('POST', '/device/scan', { duration: 10 });
        } catch (error) {
            setError(error.message);
            throw error;
        }
    }, []);
    
    const connectDevice = useCallback(async (address) => {
        try {
            return await clientRef.current.request('POST', '/device/connect', { address });
        } catch (error) {
            setError(error.message);
            throw error;
        }
    }, []);
    
    return {
        isConnected,
        isStreaming,
        sensorData,
        error,
        startStreaming,
        stopStreaming,
        scanDevices,
        connectDevice
    };
};

// Hook 사용 예제
const MyComponent = () => {
    const {
        isConnected,
        isStreaming,
        sensorData,
        error,
        startStreaming,
        stopStreaming,
        scanDevices,
        connectDevice
    } = useLinkBand();
    
    return (
        <div>
            {error && <div className="error">{error}</div>}
            <button onClick={startStreaming} disabled={isStreaming}>
                시작
            </button>
            <button onClick={stopStreaming} disabled={!isStreaming}>
                중지
            </button>
            <pre>{JSON.stringify(sensorData, null, 2)}</pre>
        </div>
    );
};
```

## Vue.js 통합

### Vue 컴포넌트 예제

```vue
<template>
  <div class="linkband-dashboard">
    <h2>Link Band Dashboard</h2>
    
    <div class="controls">
      <button @click="connectDevice" :disabled="isConnected">
        디바이스 연결
      </button>
      <button @click="startMonitoring" :disabled="!isConnected || isMonitoring">
        모니터링 시작
      </button>
      <button @click="stopMonitoring" :disabled="!isMonitoring">
        모니터링 중지
      </button>
    </div>
    
    <div class="status">
      <div class="status-item">
        <span>연결 상태:</span>
        <span :class="{ connected: isConnected, disconnected: !isConnected }">
          {{ isConnected ? '연결됨' : '연결 안됨' }}
        </span>
      </div>
      <div class="status-item">
        <span>배터리:</span>
        <span>{{ batteryLevel }}%</span>
      </div>
      <div class="status-item">
        <span>심박수:</span>
        <span>{{ heartRate }} BPM</span>
      </div>
    </div>
    
    <div class="charts">
      <canvas ref="eegChart"></canvas>
      <canvas ref="ppgChart"></canvas>
    </div>
    
    <div class="data-summary">
      <h3>데이터 요약</h3>
      <ul>
        <li>EEG 샘플: {{ eegSamples.length }}</li>
        <li>PPG 샘플: {{ ppgSamples.length }}</li>
        <li>ACC 샘플: {{ accSamples.length }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
import Chart from 'chart.js/auto';

export default {
  name: 'LinkBandDashboard',
  
  data() {
    return {
      isConnected: false,
      isMonitoring: false,
      batteryLevel: 0,
      heartRate: 0,
      eegSamples: [],
      ppgSamples: [],
      accSamples: [],
      websocket: null,
      charts: {},
      client: null
    };
  },
  
  mounted() {
    this.initializeClient();
    this.initializeCharts();
  },
  
  beforeUnmount() {
    this.cleanup();
  },
  
  methods: {
    initializeClient() {
      this.client = {
        baseUrl: 'http://localhost:8121',
        
        async request(method, endpoint, data = null) {
          const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
          };
          
          if (data) {
            options.body = JSON.stringify(data);
          }
          
          const response = await fetch(`${this.baseUrl}${endpoint}`, options);
          return await response.json();
        }
      };
    },
    
    initializeCharts() {
      // EEG 차트
      this.charts.eeg = new Chart(this.$refs.eegChart, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'EEG Signal',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          animation: false,
          scales: {
            y: { title: { display: true, text: 'Amplitude (μV)' } }
          }
        }
      });
      
      // PPG 차트
      this.charts.ppg = new Chart(this.$refs.ppgChart, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'PPG Signal',
            data: [],
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          animation: false,
          scales: {
            y: { title: { display: true, text: 'Intensity' } }
          }
        }
      });
    },
    
    async connectDevice() {
      try {
        // 디바이스 스캔
        await this.client.request('POST', '/device/scan', { duration: 10 });
        
        // 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 12000));
        
        // 디바이스 목록 조회
        const devices = await this.client.request('GET', '/device/list');
        
        if (devices.data.length > 0) {
          // 첫 번째 디바이스에 연결
          const device = devices.data[0];
          await this.client.request('POST', '/device/connect', {
            address: device.address
          });
          
          this.isConnected = true;
          
          // 배터리 정보 조회
          const battery = await this.client.request('GET', '/device/battery');
          this.batteryLevel = battery.data.level;
        }
        
      } catch (error) {
        console.error('디바이스 연결 오류:', error);
        this.$emit('error', error.message);
      }
    },
    
    async startMonitoring() {
      try {
        // WebSocket 연결
        this.websocket = new WebSocket('ws://localhost:8121/ws');
        
        this.websocket.onopen = () => {
          console.log('WebSocket 연결됨');
        };
        
        this.websocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        };
        
        this.websocket.onclose = () => {
          console.log('WebSocket 연결 종료됨');
        };
        
        // 스트리밍 시작
        await this.client.request('POST', '/stream/start');
        this.isMonitoring = true;
        
      } catch (error) {
        console.error('모니터링 시작 오류:', error);
        this.$emit('error', error.message);
      }
    },
    
    async stopMonitoring() {
      try {
        await this.client.request('POST', '/stream/stop');
        
        if (this.websocket) {
          this.websocket.close();
        }
        
        this.isMonitoring = false;
        
      } catch (error) {
        console.error('모니터링 중지 오류:', error);
      }
    },
    
    handleMessage(data) {
      if (data.type === 'raw_data') {
        const sensorType = data.sensor_type;
        const samples = data.data;
        
        switch (sensorType) {
          case 'eeg':
            this.eegSamples.push(...samples);
            this.updateEEGChart();
            break;
          case 'ppg':
            this.ppgSamples.push(...samples);
            this.updatePPGChart();
            this.calculateHeartRate();
            break;
          case 'acc':
            this.accSamples.push(...samples);
            break;
        }
        
        // 버퍼 크기 제한
        this.limitBufferSize();
      }
    },
    
    updateEEGChart() {
      const chart = this.charts.eeg;
      const recentData = this.eegSamples.slice(-100).map(sample => sample.ch1);
      
      chart.data.labels = Array.from({ length: recentData.length }, (_, i) => i);
      chart.data.datasets[0].data = recentData;
      chart.update('none');
    },
    
    updatePPGChart() {
      const chart = this.charts.ppg;
      const recentData = this.ppgSamples.slice(-100).map(sample => sample.ir);
      
      chart.data.labels = Array.from({ length: recentData.length }, (_, i) => i);
      chart.data.datasets[0].data = recentData;
      chart.update('none');
    },
    
    calculateHeartRate() {
      if (this.ppgSamples.length >= 250) { // 5초간 데이터
        const recentSamples = this.ppgSamples.slice(-250);
        const irValues = recentSamples.map(sample => sample.ir);
        
        // 간단한 심박수 계산 (실제로는 더 정교한 알고리즘 필요)
        const peaks = this.detectPeaks(irValues);
        
        if (peaks.length >= 3) {
          const intervals = [];
          for (let i = 1; i < peaks.length; i++) {
            intervals.push((peaks[i] - peaks[i-1]) / 50); // 50Hz 샘플링
          }
          
          const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
          this.heartRate = Math.round(60 / avgInterval);
        }
      }
    },
    
    detectPeaks(signal) {
      const peaks = [];
      const threshold = signal.reduce((a, b) => a + b) / signal.length;
      
      for (let i = 1; i < signal.length - 1; i++) {
        if (signal[i] > signal[i-1] && 
            signal[i] > signal[i+1] && 
            signal[i] > threshold) {
          peaks.push(i);
        }
      }
      
      return peaks;
    },
    
    limitBufferSize() {
      const maxSize = 1000;
      
      if (this.eegSamples.length > maxSize) {
        this.eegSamples = this.eegSamples.slice(-maxSize);
      }
      if (this.ppgSamples.length > maxSize) {
        this.ppgSamples = this.ppgSamples.slice(-maxSize);
      }
      if (this.accSamples.length > maxSize) {
        this.accSamples = this.accSamples.slice(-maxSize);
      }
    },
    
    cleanup() {
      if (this.websocket) {
        this.websocket.close();
      }
      
      Object.values(this.charts).forEach(chart => {
        if (chart) chart.destroy();
      });
    }
  }
};
</script>

<style scoped>
.linkband-dashboard {
  padding: 20px;
}

.controls {
  margin: 20px 0;
}

.controls button {
  margin-right: 10px;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
}

.controls button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.status {
  margin: 20px 0;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.status-item {
  margin: 5px 0;
}

.connected {
  color: green;
  font-weight: bold;
}

.disconnected {
  color: red;
  font-weight: bold;
}

.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

.data-summary {
  margin: 20px 0;
  padding: 15px;
  background-color: #e9ecef;
  border-radius: 4px;
}
</style>
```

## Node.js 통합

### Express 서버 예제

```javascript
const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Link Band 클라이언트 클래스
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
            console.error(`API 요청 오류 (${method} ${endpoint}):`, error.message);
            throw error;
        }
    }
    
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            this.websocket = new WebSocket('ws://localhost:8121/ws');
            
            this.websocket.on('open', () => {
                this.isConnected = true;
                console.log('Link Band WebSocket 연결됨');
                resolve();
            });
            
            this.websocket.on('error', (error) => {
                console.error('Link Band WebSocket 오류:', error);
                reject(error);
            });
            
            this.websocket.on('close', () => {
                this.isConnected = false;
                console.log('Link Band WebSocket 연결 종료됨');
            });
        });
    }
}

// Link Band 클라이언트 인스턴스
const linkBandClient = new LinkBandClient();

// API 라우트
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

// 데이터 수집 및 저장
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

// WebSocket 서버 (클라이언트와 통신)
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('클라이언트 연결됨');
    
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
        console.log('클라이언트 연결 종료됨');
    });
});

async function startMonitoring(clientWs) {
    try {
        // Link Band WebSocket 연결
        await linkBandClient.connectWebSocket();
        
        // 메시지 핸들러 설정
        linkBandClient.websocket.on('message', (data) => {
            const message = JSON.parse(data);
            
            if (message.type === 'raw_data') {
                // 데이터 수집
                const sensorType = message.sensor_type;
                collectedData[sensorType].push(...message.data);
                
                // 버퍼 크기 제한
                if (collectedData[sensorType].length > 1000) {
                    collectedData[sensorType] = collectedData[sensorType].slice(-1000);
                }
                
                // 클라이언트에 전달
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify(message));
                }
            }
        });
        
        // 스트리밍 시작
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
        console.error('모니터링 중지 오류:', error);
    }
}

// 서버 시작
server.listen(port, () => {
    console.log(`서버가 http://localhost:${port}에서 실행 중입니다.`);
});

// 종료 시 정리
process.on('SIGINT', async () => {
    console.log('서버 종료 중...');
    
    try {
        await stopMonitoring();
    } catch (error) {
        console.error('종료 중 오류:', error);
    }
    
    process.exit(0);
});
```

## 모바일 앱 통합 (React Native)

### React Native 컴포넌트

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
  
  const baseUrl = 'http://192.168.1.100:8121'; // 실제 서버 IP로 변경
  
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
      Alert.alert('API 오류', error.message);
      throw error;
    }
  };
  
  const connectDevice = async () => {
    try {
      // 디바이스 스캔
      await apiRequest('POST', '/device/scan', { duration: 10 });
      
      Alert.alert('스캔 중', '10초간 디바이스를 스캔합니다...');
      
      // 스캔 완료 대기
      setTimeout(async () => {
        try {
          const devices = await apiRequest('GET', '/device/list');
          
          if (devices.data.length > 0) {
            const device = devices.data[0];
            await apiRequest('POST', '/device/connect', { address: device.address });
            
            setIsConnected(true);
            Alert.alert('연결 성공', `${device.name}에 연결되었습니다.`);
            
            // 배터리 상태 확인
            const battery = await apiRequest('GET', '/device/battery');
            setSensorData(prev => ({ ...prev, battery: battery.data.level }));
            
          } else {
            Alert.alert('디바이스 없음', '스캔된 디바이스가 없습니다.');
          }
        } catch (error) {
          Alert.alert('연결 실패', error.message);
        }
      }, 12000);
      
    } catch (error) {
      Alert.alert('스캔 실패', error.message);
    }
  };
  
  const startMonitoring = async () => {
    try {
      // WebSocket 연결
      const ws = new WebSocket(`ws://${baseUrl.replace('http://', '')}/ws`);
      
      ws.onopen = () => {
        console.log('WebSocket 연결됨');
        setWebsocket(ws);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'raw_data') {
          const sensorType = data.sensor_type;
          const samples = data.data;
          
          // 최신 샘플 수 업데이트
          setSensorData(prev => ({
            ...prev,
            [sensorType]: samples.length
          }));
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket 연결 종료됨');
        setWebsocket(null);
        setIsMonitoring(false);
      };
      
      ws.onerror = (error) => {
        Alert.alert('WebSocket 오류', error.message);
      };
      
      // 스트리밍 시작
      await apiRequest('POST', '/stream/start');
      setIsMonitoring(true);
      
    } catch (error) {
      Alert.alert('모니터링 시작 실패', error.message);
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
      Alert.alert('모니터링 중지 실패', error.message);
    }
  };
  
  const disconnectDevice = async () => {
    try {
      if (isMonitoring) {
        await stopMonitoring();
      }
      
      await apiRequest('POST', '/device/disconnect');
      setIsConnected(false);
      
      Alert.alert('연결 해제', '디바이스 연결이 해제되었습니다.');
      
    } catch (error) {
      Alert.alert('연결 해제 실패', error.message);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Link Band 모니터</Text>
      
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>연결 상태:</Text>
          <Text style={[styles.statusValue, isConnected ? styles.connected : styles.disconnected]}>
            {isConnected ? '연결됨' : '연결 안됨'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>모니터링:</Text>
          <Text style={[styles.statusValue, isMonitoring ? styles.active : styles.inactive]}>
            {isMonitoring ? '활성' : '비활성'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>배터리:</Text>
          <Text style={styles.statusValue}>{sensorData.battery}%</Text>
        </View>
      </View>
      
      <View style={styles.dataContainer}>
        <Text style={styles.sectionTitle}>센서 데이터</Text>
        
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>EEG 샘플:</Text>
          <Text style={styles.dataValue}>{sensorData.eeg}</Text>
        </View>
        
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>PPG 샘플:</Text>
          <Text style={styles.dataValue}>{sensorData.ppg}</Text>
        </View>
        
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>ACC 샘플:</Text>
          <Text style={styles.dataValue}>{sensorData.acc}</Text>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isConnected && styles.buttonDisabled]}
          onPress={connectDevice}
          disabled={isConnected}
        >
          <Text style={styles.buttonText}>디바이스 연결</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, (!isConnected || isMonitoring) && styles.buttonDisabled]}
          onPress={startMonitoring}
          disabled={!isConnected || isMonitoring}
        >
          <Text style={styles.buttonText}>모니터링 시작</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, !isMonitoring && styles.buttonDisabled]}
          onPress={stopMonitoring}
          disabled={!isMonitoring}
        >
          <Text style={styles.buttonText}>모니터링 중지</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, !isConnected && styles.buttonDisabled]}
          onPress={disconnectDevice}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>연결 해제</Text>
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

## 참고사항

1. **네트워크 설정**: 모바일 앱에서는 실제 서버 IP 주소를 사용해야 합니다.
2. **CORS 설정**: 웹 애플리케이션에서는 CORS 정책을 적절히 설정해야 합니다.
3. **에러 처리**: 네트워크 연결 실패나 디바이스 연결 오류에 대한 적절한 처리가 필요합니다.
4. **성능 최적화**: 대용량 데이터 처리 시 메모리 사용량과 렌더링 성능을 고려해야 합니다.
5. **보안**: 프로덕션 환경에서는 인증 및 암호화를 구현하는 것이 좋습니다. 