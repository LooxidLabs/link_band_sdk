# Link Band SDK Backend API & WebSocket 통신 참조 문서

## 📋 개요

Link Band SDK 백엔드는 FastAPI 기반의 REST API와 WebSocket 서버를 제공하며, Looxid Labs의 차세대 초경량 뇌파 밴드(Link Band 2.0)와의 통신을 담당합니다.

### 서버 구성
- **REST API 서버**: `http://localhost:8121`
- **WebSocket 서버**: `ws://localhost:18765`
- **API 문서**: `http://localhost:8121/docs` (Swagger UI)

---

## 🌐 REST API 엔드포인트

### 1. Device Management (`/device`)

#### 디바이스 스캔
```http
GET /device/scan?duration=10
```
**응답:**
```json
{
  "status": "success",
  "devices": [
    {
      "name": "Link Band 2.0",
      "address": "AA:BB:CC:DD:EE:FF",
      "rssi": -45
    }
  ]
}
```

#### 디바이스 연결
```http
POST /device/connect
Content-Type: application/json

{
  "address": "AA:BB:CC:DD:EE:FF"
}
```

#### 디바이스 해제
```http
POST /device/disconnect
```

#### 디바이스 상태 조회
```http
GET /device/status
```
**응답:**
```json
{
  "connected": true,
  "device_info": {
    "name": "Link Band 2.0",
    "address": "AA:BB:CC:DD:EE:FF",
    "battery_level": 85,
    "signal_strength": -45
  }
}
```

### 2. Streaming Control (`/stream`)

#### 스트리밍 서버 초기화
```http
POST /stream/init
Content-Type: application/json

{
  "host": "localhost",
  "port": 18765
}
```

#### 스트리밍 시작
```http
POST /stream/start
```

#### 스트리밍 중지
```http
POST /stream/stop
```

#### 스트리밍 상태 조회
```http
GET /stream/status
```
**응답:**
```json
{
  "is_running": true,
  "is_streaming": true,
  "clients_connected": 2,
  "eeg_sampling_rate": 250.0,
  "ppg_sampling_rate": 125.0,
  "acc_sampling_rate": 50.0
}
```

#### 스트리밍 서버 헬스체크
```http
GET /stream/health
```

### 3. Data Recording (`/data`)

#### 레코딩 시작
```http
POST /data/start-recording
Content-Type: application/json

{
  "session_name": "my_session",
  "description": "Test recording session"
}
```

#### 레코딩 중지
```http
POST /data/stop-recording
```

#### 레코딩 상태 조회
```http
GET /data/recording-status
```

#### 세션 목록 조회
```http
GET /data/sessions
```

#### 특정 세션 정보 조회
```http
GET /data/sessions/{session_name}
```

#### 세션 내보내기 준비
```http
POST /data/sessions/{session_name}/prepare-export
```

### 4. System Metrics (`/metrics`)

#### 시스템 메트릭 조회
```http
GET /metrics/
```
**응답:**
```json
{
  "timestamp": "2024-06-28T20:46:43.601619Z",
  "system": {
    "cpu_usage": 25.5,
    "memory_usage": 68.2,
    "disk_usage": 27.94,
    "uptime": "5 days, 05:54:00"
  },
  "data_quality": {
    "signal_quality": 95.0,
    "data_loss_rate": 0.1,
    "error_rate": 0.05,
    "throughput": 250.0
  },
  "device": {
    "connection_stability": 98.5,
    "battery_level": 85,
    "signal_strength": -45,
    "device_temperature": 32.5
  }
}
```

### 5. Monitoring System (`/monitoring`)

#### 모니터링 상태 조회
```http
GET /monitoring/status
```

#### 현재 메트릭 조회
```http
GET /monitoring/metrics
```

#### 메트릭 히스토리 조회
```http
GET /monitoring/metrics/history?hours=1&interval=60
```

#### 알림 목록 조회
```http
GET /monitoring/alerts?level=WARNING&active_only=true
```

#### 시스템 건강도 조회
```http
GET /monitoring/health
```

#### 버퍼 상태 조회
```http
GET /monitoring/buffers
```

#### 모니터링 시작/중지
```http
POST /monitoring/start
POST /monitoring/stop
```

### 6. History Data (`/history`)

#### 로그 조회
```http
GET /history/logs?level=INFO&start_time=2024-06-28T00:00:00Z&limit=100
```

#### 메트릭 히스토리 조회
```http
GET /history/metrics?metric_type=PERFORMANCE&hours=24
```

#### 통계 정보 조회
```http
GET /history/stats
```

---

## 🔌 WebSocket 통신

### 연결 방법
```javascript
const ws = new WebSocket('ws://localhost:18765');
```

### 메시지 타입

#### 1. 이벤트 메시지 (`type: "event"`)
```json
{
  "type": "event",
  "event_type": "device_connected",
  "data": {
    "device_address": "AA:BB:CC:DD:EE:FF",
    "device_info": {
      "name": "Link Band 2.0",
      "battery_level": 85
    }
  }
}
```

**이벤트 타입 목록:**
- `device_connected`: 디바이스 연결됨
- `device_disconnected`: 디바이스 연결 해제됨
- `device_connection_failed`: 디바이스 연결 실패
- `device_info`: 디바이스 정보 업데이트
- `scan_result`: 스캔 결과
- `bluetooth_status`: 블루투스 상태
- `stream_started`: 스트리밍 시작됨
- `stream_stopped`: 스트리밍 중지됨
- `data_received`: 데이터 수신됨
- `error`: 오류 발생
- `registered_devices`: 등록된 디바이스 목록

#### 2. 센서 데이터 메시지
```json
{
  "type": "raw_data",
  "sensor_type": "eeg",
  "device_id": "AA:BB:CC:DD:EE:FF",
  "timestamp": 1719602803.601,
  "data": [
    {
      "timestamp": 1719602803.601,
      "ch1": 0.123,
      "ch2": 0.456,
      "ch3": 0.789,
      "ch4": 0.012
    }
  ]
}
```

**센서 타입:**
- `eeg`: 뇌파 데이터 (4채널)
- `ppg`: 심박수 데이터
- `acc`: 가속도계 데이터 (X, Y, Z축)
- `battery`: 배터리 상태

#### 3. 명령 메시지 (`type: "command"`)
```json
{
  "type": "command",
  "command": "scan_devices",
  "parameters": {
    "duration": 10
  }
}
```

**지원되는 명령:**
- `scan_devices`: 디바이스 스캔
- `connect_device`: 디바이스 연결
- `disconnect_device`: 디바이스 해제
- `start_streaming`: 스트리밍 시작
- `stop_streaming`: 스트리밍 중지
- `health_check`: 헬스체크

#### 4. 상태 메시지 (`type: "status"`)
```json
{
  "type": "status",
  "timestamp": 1719602803.601,
  "data": {
    "connected_devices": 1,
    "connected_clients": 2,
    "stream_engine_status": {
      "is_streaming": true,
      "sampling_rates": {
        "eeg": 250.0,
        "ppg": 125.0,
        "acc": 50.0
      }
    }
  }
}
```

### 모니터링 시스템 WebSocket 채널

Priority 4 모니터링 시스템에서 제공하는 전용 채널들:

#### 1. `monitoring_metrics` (1초 간격)
```json
{
  "type": "monitoring_metrics",
  "timestamp": "2024-06-28T20:46:43.601Z",
  "data": {
    "system_metrics": {
      "cpu_usage": 25.5,
      "memory_usage": 68.2,
      "disk_usage": 27.94
    },
    "performance_metrics": {
      "buffer_efficiency": 19.05,
      "compression_ratio": 22.40,
      "stream_efficiency": 79.2
    },
    "health_score": 77.8
  }
}
```

#### 2. `system_alerts` (이벤트 기반)
```json
{
  "type": "system_alerts",
  "timestamp": "2024-06-28T20:46:43.601Z",
  "data": {
    "alert_id": "ALERT_001",
    "level": "WARNING",
    "category": "PERFORMANCE",
    "title": "High CPU Usage",
    "message": "CPU usage exceeded 80% threshold",
    "threshold": 80.0,
    "current_value": 85.2,
    "acknowledged": false
  }
}
```

#### 3. `health_updates` (10초 간격)
```json
{
  "type": "health_updates",
  "timestamp": "2024-06-28T20:46:43.601Z",
  "data": {
    "overall_health": 77.8,
    "component_health": {
      "system": 85.0,
      "device": 70.0,
      "streaming": 80.0,
      "data_quality": 75.0
    },
    "recommendations": [
      "Consider restarting device connection",
      "Check signal quality"
    ]
  }
}
```

#### 4. `buffer_status` (5초 간격)
```json
{
  "type": "buffer_status",
  "timestamp": "2024-06-28T20:46:43.601Z",
  "data": {
    "EEG": {
      "current_size": 1250,
      "max_size": 2500,
      "usage_percentage": 50.0,
      "efficiency": 19.05,
      "status": "HEALTHY"
    },
    "PPG": {
      "current_size": 625,
      "max_size": 1250,
      "usage_percentage": 50.0,
      "efficiency": 18.50,
      "status": "HEALTHY"
    }
  }
}
```

#### 5. `batch_status` (배치 완료 시)
```json
{
  "type": "batch_status",
  "timestamp": "2024-06-28T20:46:43.601Z",
  "data": {
    "sensor_type": "EEG",
    "batch_id": "BATCH_EEG_1719602803",
    "items_processed": 250,
    "compression_ratio": 22.40,
    "processing_time": 0.15,
    "status": "COMPLETED",
    "next_batch_eta": 2.5
  }
}
```

---

## 🔧 프론트엔드 구현 가이드

### 1. API 클라이언트 구현

```typescript
class LinkBandApiClient {
  private baseUrl = 'http://localhost:8121';

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics/`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async scanDevices(duration: number = 10) {
    const response = await fetch(`${this.baseUrl}/device/scan?duration=${duration}`);
    return await response.json();
  }

  async connectDevice(address: string) {
    const response = await fetch(`${this.baseUrl}/device/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });
    return await response.json();
  }

  async startStreaming() {
    const response = await fetch(`${this.baseUrl}/stream/start`, {
      method: 'POST'
    });
    return await response.json();
  }

  async getStreamStatus() {
    const response = await fetch(`${this.baseUrl}/stream/status`);
    return await response.json();
  }

  async getMetrics() {
    const response = await fetch(`${this.baseUrl}/metrics/`);
    return await response.json();
  }

  async getMonitoringStatus() {
    const response = await fetch(`${this.baseUrl}/monitoring/status`);
    return await response.json();
  }
}
```

### 2. WebSocket 클라이언트 구현

```typescript
class LinkBandWebSocketClient {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, ((data: any) => void)[]> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:18765');
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    });
  }

  subscribe(channel: string, handler: (data: any) => void): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }
    
    this.subscriptions.get(channel)!.push(handler);
    
    // 구독 해제 함수 반환
    return () => {
      const handlers = this.subscriptions.get(channel);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  private handleMessage(data: any): void {
    const channel = data.type || data.sensor_type || 'default';
    const handlers = this.subscriptions.get(channel) || [];
    
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in message handler for channel ${channel}:`, error);
      }
    });
  }

  sendCommand(command: string, parameters?: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'command',
        command,
        parameters
      }));
    }
  }
}
```

### 3. 사용 예시

```typescript
// API 클라이언트 초기화
const apiClient = new LinkBandApiClient();

// WebSocket 클라이언트 초기화
const wsClient = new LinkBandWebSocketClient();

// 연결 및 구독 설정
async function initializeSystem() {
  // 서버 헬스체크
  const isHealthy = await apiClient.healthCheck();
  if (!isHealthy) {
    throw new Error('Server is not healthy');
  }

  // WebSocket 연결
  await wsClient.connect();

  // 센서 데이터 구독
  wsClient.subscribe('eeg', (data) => {
    console.log('EEG data received:', data);
  });

  wsClient.subscribe('ppg', (data) => {
    console.log('PPG data received:', data);
  });

  // 모니터링 데이터 구독
  wsClient.subscribe('monitoring_metrics', (data) => {
    console.log('Monitoring metrics:', data);
  });

  wsClient.subscribe('system_alerts', (data) => {
    console.log('System alert:', data);
  });

  // 디바이스 이벤트 구독
  wsClient.subscribe('event', (data) => {
    switch (data.event_type) {
      case 'device_connected':
        console.log('Device connected:', data.data);
        break;
      case 'stream_started':
        console.log('Streaming started');
        break;
      // ... 기타 이벤트 처리
    }
  });
}

// 디바이스 연결 및 스트리밍 시작
async function startDataCollection() {
  // 디바이스 스캔
  const scanResult = await apiClient.scanDevices(10);
  const devices = scanResult.devices;

  if (devices.length > 0) {
    // 첫 번째 디바이스 연결
    await apiClient.connectDevice(devices[0].address);
    
    // 스트리밍 시작
    await apiClient.startStreaming();
  }
}
```

---

## ⚠️ 주의사항

### 1. 서버 시작 순서
1. Python 서버 먼저 실행 (`python run_server.py`)
2. 서버 완전 시작 대기 (2-3초)
3. 프론트엔드 연결 시도

### 2. 스트리밍 자동 제어
- **디바이스 연결 시**: 백엔드에서 자동으로 스트리밍 시작
- **디바이스 해제 시**: 백엔드에서 자동으로 스트리밍 중지
- **프론트엔드**: 수동 스트리밍 제어 불필요, 상태 표시만 담당
- **논리적 일관성**: 디바이스 연결 = 스트리밍 활성화

### 3. 에러 처리
- API 호출 시 항상 try-catch 사용
- WebSocket 연결 끊김에 대한 재연결 로직 구현
- 타임아웃 설정 (API: 5초, WebSocket: 30초)

### 4. 성능 고려사항
- 센서 데이터는 고주파수로 전송됨 (EEG: 250Hz)
- 버퍼링 및 배치 처리 고려
- 불필요한 리렌더링 방지

### 5. 플랫폼별 차이점
- **Windows**: 이모지 사용 금지 (서버 다운 위험)
- **macOS**: 정상 작동
- **Linux**: 정상 작동

---

## 🔍 디버깅 가이드

### API 연결 문제
1. `curl http://localhost:8121/metrics/` 테스트
2. 서버 로그 확인
3. CORS 설정 확인

### WebSocket 연결 문제
1. 브라우저 개발자 도구 Network 탭 확인
2. WebSocket 상태 확인 (`ws.readyState`)
3. 서버 WebSocket 로그 확인

### 데이터 수신 문제
1. 스트리밍 상태 확인 (`/stream/status`)
2. 디바이스 연결 상태 확인 (`/device/status`)
3. WebSocket 구독 상태 확인

이 문서는 Link Band SDK 백엔드와의 효율적인 통신을 위한 완전한 참조 자료입니다. 프론트엔드 개발 시 이 문서를 기준으로 구현하시기 바랍니다. 