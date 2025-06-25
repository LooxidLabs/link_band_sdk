# React 통합 가이드

이 가이드는 최신 훅과 컴포넌트를 사용하여 Link Band SDK를 React 애플리케이션과 통합하는 방법을 보여줍니다.

## 목차

1. [설치 및 설정](#설치-및-설정)
2. [커스텀 훅](#커스텀-훅)
3. [React 컴포넌트](#react-컴포넌트)
4. [완전한 예제](#완전한-예제)
5. [TypeScript 지원](#typescript-지원)
6. [모범 사례](#모범-사례)

## 설치 및 설정

### 필수 조건

```bash
npm install axios
npm install @types/node  # TypeScript 프로젝트용
```

### 환경 설정

프로젝트 루트에 `.env` 파일을 생성하세요:

```env
REACT_APP_LINK_BAND_API_URL=http://localhost:8121
REACT_APP_WEBSOCKET_URL=ws://localhost:18765
```

## 커스텀 훅

### useDeviceManager 훅

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
      setError(err.response?.data?.detail || '디바이스 스캔에 실패했습니다');
    } finally {
      setIsScanning(false);
    }
  }, [API_BASE]);

  const connectDevice = useCallback(async (address: string) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      await axios.post(`${API_BASE}/device/connect`, { address });
      await getDeviceStatus(); // 연결 후 상태 새로고침
    } catch (err: any) {
      setError(err.response?.data?.detail || '디바이스 연결에 실패했습니다');
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
      setError(err.response?.data?.detail || '디바이스 연결 해제에 실패했습니다');
    }
  }, [API_BASE]);

  const getDeviceStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/device/status`);
      setDeviceStatus(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '디바이스 상태 조회에 실패했습니다');
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

### useDataStreaming 훅

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
      setError(err.response?.data?.detail || '스트림 초기화에 실패했습니다');
    }
  }, [API_BASE]);

  const startStreaming = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/stream/start`);
    } catch (err: any) {
      setError(err.response?.data?.detail || '스트리밍 시작에 실패했습니다');
    }
  }, [API_BASE]);

  const stopStreaming = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/stream/stop`);
      if (wsRef.current) {
        wsRef.current.close();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '스트리밍 중지에 실패했습니다');
    }
  }, [API_BASE]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // 이미 연결됨
    }

    wsRef.current = new WebSocket(WS_URL);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      setError(null);
      console.log('WebSocket 연결됨');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStreamData(prev => [...prev.slice(-999), data]); // 최근 1000개 포인트 유지
      } catch (err) {
        console.error('WebSocket 메시지 파싱 실패:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      setError('WebSocket 연결 오류');
      console.error('WebSocket 오류:', error);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket 연결 해제됨');
    };
  }, [WS_URL]);

  const getStreamStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/stream/status`);
      setStreamStatus(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '스트림 상태 조회에 실패했습니다');
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

### useRecording 훅

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
      setError(err.response?.data?.detail || '녹화 시작에 실패했습니다');
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
      await getSessions(); // 세션 목록 새로고침
    } catch (err: any) {
      setError(err.response?.data?.detail || '녹화 중지에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  const getRecordingStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/data/recording-status`);
      setRecordingStatus(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '녹화 상태 조회에 실패했습니다');
    }
  }, [API_BASE]);

  const getSessions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/data/sessions`);
      setSessions(response.data.sessions || response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || '세션 목록 조회에 실패했습니다');
    }
  }, [API_BASE]);

  const exportSession = useCallback(async (sessionName: string) => {
    try {
      const response = await axios.post(`${API_BASE}/data/sessions/${sessionName}/prepare-export`);
      return response.data.download_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || '세션 내보내기에 실패했습니다');
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

## React 컴포넌트

### DeviceManager 컴포넌트

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
      <h3>디바이스 관리</h3>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* 디바이스 상태 */}
      <div className="device-status" style={{ marginBottom: '20px' }}>
        <h4>현재 상태</h4>
        {deviceStatus ? (
          <div>
            <p>연결됨: {deviceStatus.is_connected ? '예' : '아니오'}</p>
            {deviceStatus.is_connected && (
              <>
                <p>디바이스: {deviceStatus.device_name || deviceStatus.device_address}</p>
                <p>배터리: {deviceStatus.battery_level}%</p>
                <button onClick={disconnectDevice}>연결 해제</button>
              </>
            )}
          </div>
        ) : (
          <p>상태 로딩 중...</p>
        )}
      </div>

      {/* 디바이스 스캐너 */}
      {!deviceStatus?.is_connected && (
        <div className="device-scanner">
          <h4>사용 가능한 디바이스</h4>
          <button onClick={scanDevices} disabled={isScanning}>
            {isScanning ? '스캔 중...' : '디바이스 스캔'}
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
                  {isConnecting ? '연결 중...' : '연결'}
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

### DataVisualization 컴포넌트

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

  // 간단한 캔버스 기반 시각화
  useEffect(() => {
    if (!canvasRef.current || streamData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // EEG 데이터가 있으면 그리기
    const latestData = streamData.slice(-100); // 최근 100개 포인트
    if (latestData.length > 0 && latestData[0].eeg) {
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.beginPath();

      latestData.forEach((data, index) => {
        if (data.eeg && data.eeg.length > 0) {
          const x = (index / latestData.length) * canvas.width;
          const y = canvas.height / 2 - (data.eeg[0] * 100); // 스케일링 및 중앙 정렬
          
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
      <h3>데이터 스트리밍</h3>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* 스트림 컨트롤 */}
      <div className="stream-controls" style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleStartStreaming}
          disabled={!isDeviceConnected || streamStatus?.is_streaming}
        >
          스트리밍 시작
        </button>
        <button 
          onClick={stopStreaming}
          disabled={!streamStatus?.is_streaming}
          style={{ marginLeft: '10px' }}
        >
          스트리밍 중지
        </button>
        <button 
          onClick={clearStreamData}
          style={{ marginLeft: '10px' }}
        >
          데이터 지우기
        </button>
      </div>

      {/* 스트림 상태 */}
      <div className="stream-status" style={{ marginBottom: '20px' }}>
        <h4>스트림 상태</h4>
        {streamStatus ? (
          <div>
            <p>서버 실행 중: {streamStatus.is_running ? '예' : '아니오'}</p>
            <p>스트리밍 중: {streamStatus.is_streaming ? '예' : '아니오'}</p>
            <p>WebSocket 연결됨: {isConnected ? '예' : '아니오'}</p>
            <p>연결된 클라이언트: {streamStatus.clients_connected}</p>
            {streamStatus.data_rate && <p>데이터 전송률: {streamStatus.data_rate.toFixed(1)} Hz</p>}
          </div>
        ) : (
          <p>상태 로딩 중...</p>
        )}
      </div>

      {/* 데이터 시각화 */}
      <div className="visualization-area">
        <h4>실시간 EEG 데이터</h4>
        <canvas 
          ref={canvasRef}
          width={800}
          height={200}
          style={{ border: '1px solid #ccc', width: '100%', height: '200px' }}
        />
        <p>데이터 포인트: {streamData.length}</p>
      </div>
    </div>
  );
};
```

### RecordingManager 컴포넌트

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
      // 다운로드 링크 생성
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
      <h3>녹화 관리</h3>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* 녹화 컨트롤 */}
      <div className="recording-controls" style={{ marginBottom: '20px' }}>
        <h4>녹화 컨트롤</h4>
        
        {recordingStatus?.is_recording ? (
          <div>
            <p>녹화 중: <strong>{recordingStatus.current_session}</strong></p>
            <p>시작 시간: {recordingStatus.start_time}</p>
            <button onClick={stopRecording} disabled={isLoading}>
              {isLoading ? '중지 중...' : '녹화 중지'}
            </button>
          </div>
        ) : (
          <div>
            <input
              type="text"
              placeholder="세션 이름 (선택사항)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              style={{ marginRight: '10px', padding: '5px' }}
            />
            <button 
              onClick={handleStartRecording}
              disabled={!isStreaming || isLoading}
            >
              {isLoading ? '시작 중...' : '녹화 시작'}
            </button>
            {!isStreaming && <p style={{ color: 'orange' }}>먼저 스트리밍을 시작하세요</p>}
          </div>
        )}
      </div>

      {/* 세션 목록 */}
      <div className="sessions-list">
        <h4>녹화된 세션</h4>
        <button onClick={getSessions} style={{ marginBottom: '10px' }}>
          세션 새로고침
        </button>
        
        {sessions.length === 0 ? (
          <p>세션을 찾을 수 없습니다</p>
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
                <p>시작: {new Date(session.start_time).toLocaleString()}</p>
                {session.end_time && (
                  <p>종료: {new Date(session.end_time).toLocaleString()}</p>
                )}
                {session.duration && (
                  <p>지속 시간: {Math.round(session.duration)}초</p>
                )}
                <p>파일 수: {session.file_count}</p>
                <p>크기: {(session.total_size / 1024 / 1024).toFixed(2)} MB</p>
                
                <button 
                  onClick={() => handleExportSession(session.session_name)}
                  style={{ marginTop: '10px' }}
                >
                  세션 내보내기
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

## 완전한 예제

### 메인 앱 컴포넌트

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
    console.log('디바이스 연결됨:', deviceAddress);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Link Band SDK - React 통합</h1>
      </header>
      
      <main className="App-main">
        <div className="container">
          {/* 디바이스 관리 섹션 */}
          <section className="section">
            <DeviceManager onDeviceConnected={handleDeviceConnected} />
          </section>

          {/* 데이터 스트리밍 섹션 */}
          <section className="section">
            <DataVisualization 
              isDeviceConnected={isDeviceConnected}
            />
          </section>

          {/* 녹화 관리 섹션 */}
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

## TypeScript 지원

### 타입 정의

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

## 모범 사례

### 1. 오류 처리

```typescript
// utils/errorHandler.ts
export const handleApiError = (error: any): string => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.message) {
    return error.message;
  }
  return '예상치 못한 오류가 발생했습니다';
};
```

### 2. 환경 설정

```typescript
// config/api.ts
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_LINK_BAND_API_URL || 'http://localhost:8121',
  websocketURL: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:18765',
  timeout: 10000,
};
```

### 3. WebSocket 관리

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
        console.log('WebSocket 연결됨');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error('WebSocket 메시지 파싱 실패:', err);
        }
      };

      this.ws.onerror = () => {
        onError('WebSocket 연결 오류');
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
      onError('WebSocket 연결 생성 실패');
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

이 포괄적인 React 통합 가이드는 최신 React 패턴, TypeScript 지원, 실시간 데이터 처리를 위한 모범 사례를 포함하여 완전한 기능을 갖춘 Link Band SDK 애플리케이션을 구축하는 데 필요한 모든 것을 제공합니다. 