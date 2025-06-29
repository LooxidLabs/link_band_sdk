# WebSocket 통합 가이드

Link Band SDK와 WebSocket을 통한 실시간 데이터 통합 방법을 설명합니다.

## 개요

Link Band SDK는 WebSocket을 통한 실시간 양방향 통신을 지원합니다. 이 가이드에서는 WebSocket 연결 설정, 메시지 처리, 에러 핸들링, 그리고 다양한 프로그래밍 언어에서의 통합 방법을 설명합니다.

## 기본 정보

- **WebSocket URL**: `ws://localhost:8121/ws`
- **프로토콜**: WebSocket (RFC 6455)
- **메시지 형식**: JSON
- **연결 제한**: 동시 연결 최대 10개
- **하트비트**: 30초 간격

## 연결 설정

### 기본 연결

```javascript
const ws = new WebSocket('ws://localhost:8121');

ws.onopen = function(event) {
    console.log('WebSocket 연결됨');
    
    // 연결 즉시 디바이스 상태 확인
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
    console.log('WebSocket 연결 종료:', event.code, event.reason);
};

ws.onerror = function(error) {
    console.error('WebSocket 오류:', error);
};
```

### Python 연결

```python
import asyncio
import websockets
import json

async def connect_to_linkband():
    uri = "ws://localhost:8121"
    
    async with websockets.connect(uri) as websocket:
        print("WebSocket 연결됨")
        
        # 디바이스 상태 확인
        await websocket.send(json.dumps({
            "type": "command",
            "command": "check_device_connection"
        }))
        
        async for message in websocket:
            data = json.loads(message)
            await handle_message(data)

asyncio.run(connect_to_linkband())
```

## 메시지 처리

### JavaScript 메시지 핸들러

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
            console.log('알 수 없는 메시지 타입:', data.type);
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
            console.log('알 수 없는 이벤트:', data.event_type);
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

### Python 메시지 핸들러

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
        print(f"알 수 없는 메시지 타입: {message_type}")

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
    sensor_data = data.get('data')
    
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

## 디바이스 관리

### 디바이스 스캔 및 연결

```javascript
class LinkBandManager {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.isStreaming = false;
        this.deviceInfo = null;
    }
    
    connect() {
        this.ws = new WebSocket('ws://localhost:8121');
        
        this.ws.onopen = () => {
            console.log('WebSocket 연결됨');
            this.checkBluetoothStatus();
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket 연결 종료');
            this.isConnected = false;
        };
    }
    
    checkBluetoothStatus() {
        this.sendCommand('check_bluetooth_status');
    }
    
    scanDevices() {
        this.sendCommand('scan_devices');
    }
    
    connectToDevice(address) {
        this.sendCommand('connect_device', { address });
    }
    
    disconnectDevice() {
        this.sendCommand('disconnect_device');
    }
    
    startStreaming() {
        this.sendCommand('start_streaming');
    }
    
    stopStreaming() {
        this.sendCommand('stop_streaming');
    }
    
    sendCommand(command, payload = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'command',
                command: command,
                payload: payload
            }));
        }
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'event':
                this.handleEvent(data);
                break;
            case 'raw_data':
            case 'processed_data':
            case 'sensor_data':
                this.handleSensorData(data);
                break;
        }
    }
    
    handleEvent(data) {
        switch (data.event_type) {
            case 'bluetooth_status':
                if (!data.data.available) {
                    console.error('블루투스가 비활성화되어 있습니다');
                } else {
                    this.scanDevices();
                }
                break;
                
            case 'scan_result':
                if (data.data.status === 'completed') {
                    const devices = data.data.devices || [];
                    if (devices.length > 0) {
                        console.log('발견된 디바이스:', devices);
                        // 첫 번째 디바이스에 자동 연결
                        // 안전을 위해 사용자가 직접 디바이스 선택
        this.showDeviceSelection(devices);
                    }
                }
                break;
                
            case 'device_connected':
                this.isConnected = true;
                this.deviceInfo = data.data;
                console.log('디바이스 연결됨:', data.data);
                this.startStreaming();
                break;
                
            case 'device_disconnected':
                this.isConnected = false;
                this.isStreaming = false;
                this.deviceInfo = null;
                console.log('디바이스 연결 해제됨');
                break;
                
            case 'stream_started':
                this.isStreaming = true;
                console.log('스트리밍 시작됨');
                break;
                
            case 'stream_stopped':
                this.isStreaming = false;
                console.log('스트리밍 중지됨');
                break;
                
            case 'error':
                console.error('오류:', data.data.error);
                break;
        }
    }
    
    handleSensorData(data) {
        // 센서 데이터 처리 로직
        console.log(`${data.sensor_type} 데이터 수신:`, data.data);
    }
}

// 사용 예제
const manager = new LinkBandManager();
manager.connect();
```

### Python 디바이스 관리

```python
import asyncio
import websockets
import json

class LinkBandManager:
    def __init__(self):
        self.ws = None
        self.is_connected = False
        self.is_streaming = False
        self.device_info = None
    
    async def connect(self):
        uri = "ws://localhost:8121"
        
        async with websockets.connect(uri) as websocket:
            self.ws = websocket
            print("WebSocket 연결됨")
            
            await self.check_bluetooth_status()
            
            async for message in websocket:
                data = json.loads(message)
                await self.handle_message(data)
    
    async def check_bluetooth_status(self):
        await self.send_command('check_bluetooth_status')
    
    async def scan_devices(self):
        await self.send_command('scan_devices')
    
    async def connect_to_device(self, address):
        await self.send_command('connect_device', {'address': address})
    
    async def disconnect_device(self):
        await self.send_command('disconnect_device')
    
    async def start_streaming(self):
        await self.send_command('start_streaming')
    
    async def stop_streaming(self):
        await self.send_command('stop_streaming')
    
    async def send_command(self, command, payload=None):
        if self.ws:
            message = {
                'type': 'command',
                'command': command,
                'payload': payload or {}
            }
            await self.ws.send(json.dumps(message))
    
    async def handle_message(self, data):
        message_type = data.get('type')
        
        if message_type == 'event':
            await self.handle_event(data)
        elif message_type in ['raw_data', 'processed_data', 'sensor_data']:
            await self.handle_sensor_data(data)
    
    async def handle_event(self, data):
        event_type = data.get('event_type')
        event_data = data.get('data', {})
        
        if event_type == 'bluetooth_status':
            if not event_data.get('available'):
                print("블루투스가 비활성화되어 있습니다")
            else:
                await self.scan_devices()
        
        elif event_type == 'scan_result':
            if event_data.get('status') == 'completed':
                devices = event_data.get('devices', [])
                if devices:
                    print(f"발견된 디바이스: {devices}")
                    # 첫 번째 디바이스에 자동 연결
                    await self.connect_to_device(devices[0]['address'])
        
        elif event_type == 'device_connected':
            self.is_connected = True
            self.device_info = event_data
            print(f"디바이스 연결됨: {event_data}")
            await self.start_streaming()
        
        elif event_type == 'device_disconnected':
            self.is_connected = False
            self.is_streaming = False
            self.device_info = None
            print("디바이스 연결 해제됨")
        
        elif event_type == 'stream_started':
            self.is_streaming = True
            print("스트리밍 시작됨")
        
        elif event_type == 'stream_stopped':
            self.is_streaming = False
            print("스트리밍 중지됨")
        
        elif event_type == 'error':
            print(f"오류: {event_data.get('error')}")
    
    async def handle_sensor_data(self, data):
        sensor_type = data.get('sensor_type')
        sensor_data = data.get('data')
        print(f"{sensor_type} 데이터 수신: {len(sensor_data) if isinstance(sensor_data, list) else 'N/A'} 샘플")

# 사용 예제
async def main():
    manager = LinkBandManager()
    await manager.connect()

if __name__ == "__main__":
    asyncio.run(main())
```

## 데이터 처리

### EEG 데이터 처리

```javascript
function handleRawEEG(data) {
    // Raw EEG 데이터 처리
    data.forEach(sample => {
        const { timestamp, ch1, ch2, leadoff_ch1, leadoff_ch2 } = sample;
        
        if (!leadoff_ch1 && !leadoff_ch2) {
            // 전극이 연결된 경우만 처리
            processEEGSample(ch1, ch2, timestamp);
        }
    });
}

function handleProcessedEEG(data) {
    const {
        ch1_filtered,
        ch2_filtered,
        ch1_band_powers,
        ch2_band_powers,
        focus_index,
        relaxation_index,
        stress_index,
        signal_quality
    } = data;
    
    if (signal_quality === 'good') {
        updateEEGVisualization(ch1_filtered, ch2_filtered);
        updateBrainStates({
            focus: focus_index,
            relaxation: relaxation_index,
            stress: stress_index
        });
        updateBandPowers(ch1_band_powers, ch2_band_powers);
    }
}
```

### PPG 데이터 처리

```javascript
function handleRawPPG(data) {
    // Raw PPG 데이터 처리
    data.forEach(sample => {
        const { timestamp, red, ir } = sample;
        processPPGSample(red, ir, timestamp);
    });
}

function handleProcessedPPG(data) {
    const {
        bpm,
        sdnn,
        rmssd,
        lf_hf,
        signal_quality
    } = data;
    
    if (signal_quality === 'good') {
        updateHeartRate(bpm);
        updateHRVMetrics({
            sdnn,
            rmssd,
            lf_hf
        });
    }
}
```

### 실시간 차트 업데이트

```javascript
class RealTimeChart {
    constructor(canvasId, maxPoints = 1000) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.maxPoints = maxPoints;
    }
    
    addData(value, timestamp) {
        this.data.push({ value, timestamp });
        
        // 최대 포인트 수 제한
        if (this.data.length > this.maxPoints) {
            this.data.shift();
        }
        
        this.draw();
    }
    
    draw() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        
        if (this.data.length < 2) return;
        
        // 데이터 범위 계산
        const values = this.data.map(d => d.value);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const range = maxValue - minValue || 1;
        
        // 선 그리기
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#007bff';
        this.ctx.lineWidth = 2;
        
        this.data.forEach((point, index) => {
            const x = (index / (this.data.length - 1)) * width;
            const y = height - ((point.value - minValue) / range) * height;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
    }
}

// EEG 차트 초기화
const eegChart = new RealTimeChart('eeg-chart');

function updateEEGVisualization(ch1_filtered, ch2_filtered) {
    const timestamp = Date.now();
    
    // CH1 데이터 추가
    ch1_filtered.forEach((value, index) => {
        eegChart.addData(value, timestamp + index);
    });
}
```

## 오류 처리

### 연결 오류 처리

```javascript
class RobustWebSocket {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 1000;
        this.messageQueue = [];
    }
    
    connect() {
        try {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => {
                console.log('WebSocket 연결됨');
                this.reconnectAttempts = 0;
                this.flushMessageQueue();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.onMessage(data);
                } catch (error) {
                    console.error('메시지 파싱 오류:', error);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('WebSocket 연결 종료:', event.code);
                this.attemptReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket 오류:', error);
            };
            
        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
            this.attemptReconnect();
        }
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectInterval * this.reconnectAttempts);
        } else {
            console.error('최대 재연결 시도 횟수 초과');
        }
    }
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            // 연결이 끊어진 경우 메시지를 큐에 저장
            this.messageQueue.push(data);
        }
    }
    
    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }
    
    onMessage(data) {
        // 메시지 처리 로직
    }
}
```

### Python 오류 처리

```python
import asyncio
import websockets
import json
import logging

class RobustWebSocket:
    def __init__(self, url):
        self.url = url
        self.ws = None
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_interval = 1
        self.message_queue = []
        
    async def connect(self):
        while self.reconnect_attempts < self.max_reconnect_attempts:
            try:
                async with websockets.connect(self.url) as websocket:
                    self.ws = websocket
                    print("WebSocket 연결됨")
                    self.reconnect_attempts = 0
                    
                    # 큐에 저장된 메시지 전송
                    await self.flush_message_queue()
                    
                    async for message in websocket:
                        try:
                            data = json.loads(message)
                            await self.on_message(data)
                        except json.JSONDecodeError as e:
                            logging.error(f"메시지 파싱 오류: {e}")
                        except Exception as e:
                            logging.error(f"메시지 처리 오류: {e}")
                            
            except websockets.exceptions.ConnectionClosed:
                print("WebSocket 연결 종료")
                await self.attempt_reconnect()
            except Exception as e:
                logging.error(f"WebSocket 연결 오류: {e}")
                await self.attempt_reconnect()
    
    async def attempt_reconnect(self):
        if self.reconnect_attempts < self.max_reconnect_attempts:
            self.reconnect_attempts += 1
            print(f"재연결 시도 {self.reconnect_attempts}/{self.max_reconnect_attempts}")
            await asyncio.sleep(self.reconnect_interval * self.reconnect_attempts)
        else:
            logging.error("최대 재연결 시도 횟수 초과")
            raise Exception("WebSocket 연결 실패")
    
    async def send(self, data):
        if self.ws:
            try:
                await self.ws.send(json.dumps(data))
            except websockets.exceptions.ConnectionClosed:
                # 연결이 끊어진 경우 메시지를 큐에 저장
                self.message_queue.append(data)
        else:
            self.message_queue.append(data)
    
    async def flush_message_queue(self):
        while self.message_queue:
            message = self.message_queue.pop(0)
            await self.send(message)
    
    async def on_message(self, data):
        # 메시지 처리 로직
        pass
```

## 성능 최적화

### 데이터 버퍼링

```javascript
class DataBuffer {
    constructor(maxSize = 1000) {
        this.buffer = [];
        this.maxSize = maxSize;
    }
    
    add(data) {
        this.buffer.push(data);
        
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }
    
    getLatest(count = 100) {
        return this.buffer.slice(-count);
    }
    
    clear() {
        this.buffer = [];
    }
}

// 센서별 버퍼 생성
const eegBuffer = new DataBuffer(2500);  // 10초 분량 (250Hz)
const ppgBuffer = new DataBuffer(500);   // 10초 분량 (50Hz)
const accBuffer = new DataBuffer(250);   // 10초 분량 (25Hz)
```

### 메시지 스로틀링

```javascript
class MessageThrottler {
    constructor(interval = 100) {
        this.interval = interval;
        this.lastProcessTime = 0;
        this.pendingData = null;
    }
    
    process(data, callback) {
        this.pendingData = data;
        
        const now = Date.now();
        if (now - this.lastProcessTime >= this.interval) {
            callback(this.pendingData);
            this.lastProcessTime = now;
            this.pendingData = null;
        } else if (!this.timeoutId) {
            this.timeoutId = setTimeout(() => {
                if (this.pendingData) {
                    callback(this.pendingData);
                    this.pendingData = null;
                }
                this.timeoutId = null;
            }, this.interval - (now - this.lastProcessTime));
        }
    }
}

// 차트 업데이트 스로틀링
const chartThrottler = new MessageThrottler(50); // 20fps

function handleSensorData(data) {
    chartThrottler.process(data, (throttledData) => {
        updateChart(throttledData);
    });
}
```

이 가이드를 통해 Link Band SDK와 안정적이고 효율적인 WebSocket 통합을 구현할 수 있습니다. 