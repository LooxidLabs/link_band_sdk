# Stream API

Link Band SDK의 실시간 데이터 스트리밍을 위한 WebSocket API입니다.

## WebSocket 연결

```
ws://localhost:8121
```

## 메시지 형식

### 클라이언트 → 서버

모든 클라이언트 메시지는 다음 형식을 따릅니다:

```json
{
  "type": "command",
  "command": "명령어",
  "payload": {
    // 명령어별 추가 데이터
  }
}
```

### 서버 → 클라이언트

서버는 다음 타입의 메시지를 전송합니다:

1. **이벤트 메시지**
```json
{
  "type": "event",
  "event_type": "이벤트_타입",
  "data": {
    // 이벤트별 데이터
  }
}
```

2. **센서 데이터 메시지**
```json
{
  "type": "raw_data" | "processed_data" | "sensor_data",
  "sensor_type": "eeg" | "ppg" | "acc" | "bat",
  "device_id": "디바이스_MAC_주소",
  "timestamp": 1234567890.123,
  "data": [
    // 센서별 데이터 배열
  ]
}
```

## 명령어

### 1. 디바이스 연결 상태 확인

**요청:**
```json
{
  "type": "command",
  "command": "check_device_connection"
}
```

**응답:** `device_info` 이벤트로 현재 상태 전송

### 2. 블루투스 상태 확인

**요청:**
```json
{
  "type": "command",
  "command": "check_bluetooth_status"
}
```

**응답:**
```json
{
  "type": "event",
  "event_type": "bluetooth_status",
  "data": {
    "available": true,
    "message": "Bluetooth is available"
  }
}
```

### 3. 디바이스 스캔

**요청:**
```json
{
  "type": "command",
  "command": "scan_devices"
}
```

**응답:**
```json
{
  "type": "event",
  "event_type": "scan_result",
  "data": {
    "status": "scanning" | "completed" | "failed",
    "devices": [
      {
        "name": "Link Band",
        "address": "AA:BB:CC:DD:EE:FF",
        "rssi": -45
      }
    ],
    "error": "에러 메시지 (실패 시)"
  }
}
```

### 4. 디바이스 연결

**요청:**
```json
{
  "type": "command",
  "command": "connect_device",
  "payload": {
    "address": "AA:BB:CC:DD:EE:FF"
  }
}
```

**응답:** `device_connected` 또는 `device_connection_failed` 이벤트

### 5. 디바이스 연결 해제

**요청:**
```json
{
  "type": "command",
  "command": "disconnect_device"
}
```

**응답:** `device_disconnected` 이벤트

### 6. 스트리밍 시작

**요청:**
```json
{
  "type": "command",
  "command": "start_streaming"
}
```

**응답:** `stream_started` 이벤트 및 실시간 데이터 스트림 시작

### 7. 스트리밍 중지

**요청:**
```json
{
  "type": "command",
  "command": "stop_streaming"
}
```

**응답:** `stream_stopped` 이벤트 및 데이터 스트림 중지

### 8. 헬스 체크

**요청:**
```json
{
  "type": "command",
  "command": "health_check"
}
```

**응답:**
```json
{
  "type": "health_check_response",
  "status": "ok",
  "clients_connected": 1,
  "is_streaming": true,
  "device_connected": true
}
```

## 이벤트 타입

### 1. device_info
디바이스 연결 상태와 정보를 전달합니다.

```json
{
  "type": "event",
  "event_type": "device_info",
  "data": {
    "connected": true,
    "device_info": {
      "name": "Link Band",
      "address": "015F2A8E-3772-FB6D-2197-548F305983B0"
    },
    "is_streaming": true,
    "registered_devices": [
      {
        "name": "Link Band",
        "address": "015F2A8E-3772-FB6D-2197-548F305983B0"
      }
    ],
    "clients_connected": 1,
    "battery": {
      "timestamp": 1234567890.123,
      "level": 85
    }
  }
}
```

### 2. device_connected
디바이스 연결 성공 시 전송됩니다.

```json
{
  "type": "event",
  "event_type": "device_connected",
  "data": {
    "name": "Link Band",
    "address": "015F2A8E-3772-FB6D-2197-548F305983B0"
  }
}
```

### 3. device_disconnected
디바이스 연결 해제 시 전송됩니다.

```json
{
  "type": "event",
  "event_type": "device_disconnected",
  "data": {
    "device_address": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "device_info": {
      "name": "Link Band",
      "address": "015F2A8E-3772-FB6D-2197-548F305983B0"
    },
    "reason": "user_request" | "unexpected_disconnect"
  }
}
```

### 4. device_connection_failed
디바이스 연결 실패 시 전송됩니다.

```json
{
  "type": "event",
  "event_type": "device_connection_failed",
  "data": {
    "address": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "reason": "connection_failed" | "data_acquisition_failed" | "device_info_failed"
  }
}
```

### 5. stream_started / stream_stopped
스트리밍 상태 변경 시 전송됩니다.

```json
{
  "type": "event",
  "event_type": "stream_started",
  "data": {
    "status": "streaming_started"
  }
}
```

### 6. error
에러 발생 시 전송됩니다.

```json
{
  "type": "event",
  "event_type": "error",
  "data": {
    "error": "에러 메시지"
  }
}
```

## 센서 데이터

### EEG 데이터

**Raw 데이터 (25Hz 전송):**
```json
{
  "type": "raw_data",
  "sensor_type": "eeg",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "timestamp": 1234567890.120,
      "ch1": 1234.56,
      "ch2": 2345.67,
      "leadoff_ch1": false,
      "leadoff_ch2": false
    }
  ]
}
```

**Processed 데이터 (0.5초마다):**
```json
{
  "type": "processed_data",
  "sensor_type": "eeg",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": {
    "timestamp": 1234567890.123,
    "ch1_filtered": [1234.56, 2345.67],
    "ch2_filtered": [1234.56, 2345.67],
    "ch1_leadoff": false,
    "ch2_leadoff": false,
    "ch1_sqi": [0.85, 0.90],
    "ch2_sqi": [0.88, 0.92],
    "ch1_power": [10.5, 15.2, 8.7],
    "ch2_power": [12.1, 16.8, 9.3],
    "frequencies": [1, 2, 3],
    "ch1_band_powers": {
      "delta": 12.5,
      "theta": 8.3,
      "alpha": 15.7,
      "beta": 10.2,
      "gamma": 5.1
    },
    "ch2_band_powers": {
      "delta": 11.8,
      "theta": 9.1,
      "alpha": 14.9,
      "beta": 11.5,
      "gamma": 4.8
    },
    "signal_quality": "good",
    "good_samples_ratio": 0.95,
    "total_power": 52.8,
    "focus_index": 0.75,
    "relaxation_index": 0.65,
    "stress_index": 0.45,
    "hemispheric_balance": 0.05,
    "cognitive_load": 0.53,
    "emotional_stability": 3.92
  }
}
```

### PPG 데이터

**Raw 데이터 (50Hz 전송):**
```json
{
  "type": "raw_data",
  "sensor_type": "ppg",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "timestamp": 1234567890.120,
      "red": 12345,
      "ir": 23456
    }
  ]
}
```

**Processed 데이터 (0.5초마다):**
```json
{
  "type": "processed_data",
  "sensor_type": "ppg",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": {
    "timestamp": 1234567890.123,
    "filtered_ppg": [12345, 23456],
    "ppg_sqi": [0.95, 0.98],
    "bpm": 72.5,
    "sdnn": 45.2,
    "rmssd": 32.1,
    "signal_quality": "good",
    "red_mean": 12500.0,
    "ir_mean": 23000.0,
    "rr_intervals": [820, 850, 830],
    "pnn50": 15.5,
    "sdsd": 28.3,
    "hr_mad": 3.2,
    "sd1": 22.8,
    "sd2": 61.5,
    "lf": 1245.3,
    "hf": 2156.7,
    "lf_hf": 0.58
  }
}
```

### ACC 데이터

**Raw 데이터 (~30Hz 전송):**
```json
{
  "type": "raw_data",
  "sensor_type": "acc",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "timestamp": 1234567890.120,
      "x": 0.123,
      "y": -0.456,
      "z": 0.789
    }
  ]
}
```

**Processed 데이터 (0.5초마다):**
```json
{
  "type": "processed_data",
  "sensor_type": "acc",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": {
    "timestamp": 1234567890.123,
    "x_change": [0.01, 0.02],
    "y_change": [-0.01, 0.03],
    "z_change": [0.005, -0.015],
    "avg_movement": 150.5,
    "std_movement": 45.2,
    "max_movement": 250.8,
    "activity_state": "sitting",
    "x_change_mean": 0.015,
    "y_change_mean": 0.01,
    "z_change_mean": -0.005
  }
}
```

### 배터리 데이터

**배터리 데이터 (10Hz 전송):**
```json
{
  "type": "sensor_data",
  "sensor_type": "bat",
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timestamp": 1234567890.123,
  "data": [
    {
      "timestamp": 1234567890.120,
      "level": 85,
      "source": "actual"
    }
  ]
}
```

## 샘플링 레이트

- **EEG**: 250Hz (수집), 25Hz (전송)
- **PPG**: 50Hz (수집 및 전송)
- **ACC**: 25Hz (수집), ~30Hz (전송)
- **배터리**: ~10Hz (전송)

## 처리 간격

- **EEG**: 0.5초마다 처리된 데이터 생성
- **PPG**: 0.5초마다 처리된 데이터 생성
- **ACC**: 0.5초마다 처리된 데이터 생성
- **배터리**: 1.0초마다 처리된 데이터 생성

## 연결 유지

WebSocket 연결은 ping/pong 메커니즘으로 유지됩니다:

**클라이언트 → 서버:**
```
"ping"
```

**서버 → 클라이언트:**
```
"pong"
``` 