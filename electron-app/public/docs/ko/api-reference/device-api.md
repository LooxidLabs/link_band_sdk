# Device API

Device API는 Link Band 2.0 디바이스의 검색, 연결, 관리를 위한 RESTful API입니다. 프로그래밍 방식으로 디바이스를 제어하고 상태를 모니터링할 수 있습니다.

## 기본 정보

- **Base URL**: `http://localhost:8121`
- **Content-Type**: `application/json`
- **Authentication**: 없음 (로컬 서버)

## 엔드포인트 개요

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| GET | `/device/scan` | 주변 디바이스 검색 |
| POST | `/device/connect` | 디바이스 연결 |
| DELETE | `/device/disconnect` | 디바이스 연결 해제 |
| GET | `/device/status` | 디바이스 상태 조회 |
| GET | `/device/list` | 연결된 디바이스 목록 |
| PUT | `/device/settings` | 디바이스 설정 변경 |

## 디바이스 검색

### `GET /device/scan`

주변의 Link Band 디바이스를 검색합니다.

**요청**
```http
GET /device/scan HTTP/1.1
Host: localhost:8121
```

**응답**
```json
{
  "status": "success",
  "data": {
    "devices": [
      {
        "id": "015F2A8E-3772-FB6D-2197-548F305983B0",
        "name": "Link Band 2.0",
        "rssi": -45,
        "battery": 85,
        "is_connected": false,
        "is_connectable": true,
        "last_seen": "2024-01-15T10:30:25Z"
      },
      {
        "id": "A1B2C3D4-5678-90EF-GHIJ-KLMNOPQRSTUV",
        "name": "Link Band 2.0",
        "rssi": -65,
        "battery": 42,
        "is_connected": true,
        "is_connectable": false,
        "last_seen": "2024-01-15T10:29:18Z"
      }
    ],
    "scan_duration": 15.2,
    "total_found": 2
  },
  "timestamp": "2024-01-15T10:30:25Z"
}
```
   현재 RSSI 는 라이브러리 이슈로 정상적으로 동작하지 않을 수 있습니다.
  
**응답 필드 설명**
- `id`: 디바이스 고유 식별자 (UUID)
- `name`: 디바이스 이름
- `rssi`: 신호 강도 (dBm, 값이 클수록 강함)
   - 현재 RSSI 는 라이브러리 이슈로 정상적으로 동작하지 않을 수 있습니다.
- `battery`: 배터리 잔량 (%)
- `is_connected`: 현재 연결 상태
- `is_connectable`: 연결 가능 여부
- `last_seen`: 마지막 발견 시간

**오류 응답**
```json
{
  "status": "error",
  "error": {
    "code": "BLUETOOTH_ERROR",
    "message": "Bluetooth adapter not found",
    "details": "Please check if Bluetooth is enabled"
  },
  "timestamp": "2024-01-15T10:30:25Z"
}
```

## 디바이스 연결

### `POST /device/connect`

특정 디바이스에 연결합니다.

**요청**
```http
POST /device/connect HTTP/1.1
Host: localhost:8121
Content-Type: application/json

{
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "timeout": 30,
  "auto_reconnect": true
}
```

**요청 필드**
- `device_id` (필수): 연결할 디바이스 ID
- `timeout` (선택): 연결 타임아웃 (초, 기본값: 30)
- `auto_reconnect` (선택): 자동 재연결 여부 (기본값: true)

**응답**
```json
{
  "status": "success",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "connection_status": "connected",
    "connection_time": 8.5,
    "device_info": {
      "name": "Link Band 2.0",
      "firmware_version": "2.1.3",
      "hardware_version": "1.0",
      "serial_number": "LB2024001234",
      "battery": 85,
      "rssi": -42
    },
    "sensor_status": {
      "eeg": {
        "enabled": true,
        "sampling_rate": 250,
        "channels": ["Fp1", "Fp2"],
        "contact_quality": [95, 87]
      },
      "ppg": {
        "enabled": true,
        "sampling_rate": 25,
        "contact_quality": 92
      },
      "acc": {
        "enabled": true,
        "sampling_rate": 50,
        "axes": ["x", "y", "z"]
      }
    }
  },
  "timestamp": "2024-01-15T10:31:15Z"
}
```

**오류 응답**
```json
{
  "status": "error",
  "error": {
    "code": "CONNECTION_FAILED",
    "message": "Failed to connect to device",
    "details": "Device not found or already connected to another device"
  },
  "timestamp": "2024-01-15T10:31:15Z"
}
```

## 디바이스 연결 해제

### `DELETE /device/disconnect`

디바이스 연결을 해제합니다.

**요청**
```http
DELETE /device/disconnect HTTP/1.1
Host: localhost:8121
Content-Type: application/json

{
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0"
}
```

**응답**
```json
{
  "status": "success",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "disconnection_status": "disconnected",
    "last_connection_duration": 1847.3
  },
  "timestamp": "2024-01-15T11:02:42Z"
}
```

## 디바이스 상태 조회

### `GET /device/status`

연결된 디바이스의 현재 상태를 조회합니다.

**요청**
```http
GET /device/status?device_id=015F2A8E-3772-FB6D-2197-548F305983B0 HTTP/1.1
Host: localhost:8121
```

**응답**
```json
{
  "status": "success",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "connection_status": "connected",
    "battery": {
      "level": 78,
      "voltage": 3.7,
      "is_charging": false,
      "estimated_time_remaining": 420
    },
    "signal_quality": {
      "eeg_ch1": 95,
      "eeg_ch2": 87,
      "ppg": 92,
      "overall": 91
    },
    "sensor_contact": {
      "eeg_fp1": "good",
      "eeg_fp2": "fair", 
      "ppg": "good"
    },
    "data_streaming": {
      "is_active": true,
      "samples_per_second": {
        "eeg": 250.0,
        "ppg": 25.0,
        "acc": 50.0
      },
      "data_loss_rate": 0.02
    },
    "device_temperature": 32.5,
    "uptime": 1847.3
  },
  "timestamp": "2024-01-15T11:02:42Z"
}
```

## 디바이스 설정 변경

### `PUT /device/settings`

디바이스의 설정을 변경합니다.

**요청**
```http
PUT /device/settings HTTP/1.1
Host: localhost:8121
Content-Type: application/json

{
  "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
  "settings": {
    "sampling_rates": {
      "eeg": 250,
      "ppg": 25,
      "acc": 50
    },
    "filters": {
      "highpass": 0.5,
      "lowpass": 125,
      "notch": 50
    },
    "power_management": {
      "auto_sleep": true,
      "sleep_timeout": 300
    }
  }
}
```

**응답**
```json
{
  "status": "success",
  "data": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "settings_applied": {
      "sampling_rates": {
        "eeg": 250,
        "ppg": 25,
        "acc": 50
      },
      "filters": {
        "highpass": 0.5,
        "lowpass": 125,
        "notch": 50
      },
      "power_management": {
        "auto_sleep": true,
        "sleep_timeout": 300
      }
    },
    "restart_required": false
  },
  "timestamp": "2024-01-15T11:05:18Z"
}
```

## 오류 코드

| 코드 | 설명 | 해결 방법 |
|------|------|-----------|
| `BLUETOOTH_ERROR` | 블루투스 어댑터 오류 | 블루투스 활성화 확인 |
| `DEVICE_NOT_FOUND` | 디바이스를 찾을 수 없음 | 디바이스 검색 후 재시도 |
| `CONNECTION_FAILED` | 연결 실패 | 디바이스 상태 및 거리 확인 |
| `CONNECTION_TIMEOUT` | 연결 타임아웃 | 타임아웃 값 증가 또는 재시도 |
| `DEVICE_BUSY` | 디바이스 사용 중 | 다른 연결 해제 후 재시도 |
| `INVALID_SETTINGS` | 잘못된 설정 값 | 설정 값 범위 확인 |
| `PERMISSION_DENIED` | 권한 없음 | 관리자 권한으로 실행 |

## 사용 예제

### Python 예제

```python
import requests
import json

# 기본 URL
BASE_URL = "http://localhost:8121"

def scan_devices():
    """디바이스 검색"""
    response = requests.get(f"{BASE_URL}/device/scan")
    if response.status_code == 200:
        data = response.json()
        return data['data']['devices']
    else:
        print(f"Error: {response.status_code}")
        return []

def connect_device(device_id):
    """디바이스 연결"""
    payload = {
        "device_id": device_id,
        "timeout": 30,
        "auto_reconnect": True
    }
    response = requests.post(
        f"{BASE_URL}/device/connect",
        json=payload
    )
    return response.json()

def get_device_status(device_id):
    """디바이스 상태 조회"""
    response = requests.get(
        f"{BASE_URL}/device/status",
        params={"device_id": device_id}
    )
    return response.json()

# 사용 예시
if __name__ == "__main__":
    # 1. 디바이스 검색
    devices = scan_devices()
    print(f"발견된 디바이스: {len(devices)}개")
    
    if devices:
        # 2. 첫 번째 디바이스 연결
        device_id = devices[0]['id']
        result = connect_device(device_id)
        
        if result['status'] == 'success':
            print(f"연결 성공: {device_id}")
            
            # 3. 디바이스 상태 확인
            status = get_device_status(device_id)
            battery = status['data']['battery']['level']
            print(f"배터리: {battery}%")
        else:
            print(f"연결 실패: {result['error']['message']}")
```

### JavaScript 예제

```javascript
const BASE_URL = 'http://localhost:8121';

class DeviceAPI {
    async scanDevices() {
        try {
            const response = await fetch(`${BASE_URL}/device/scan`);
            const data = await response.json();
            return data.status === 'success' ? data.data.devices : [];
        } catch (error) {
            console.error('스캔 오류:', error);
            return [];
        }
    }

    async connectDevice(deviceId, options = {}) {
        const payload = {
            device_id: deviceId,
            timeout: options.timeout || 30,
            auto_reconnect: options.autoReconnect || true
        };

        try {
            const response = await fetch(`${BASE_URL}/device/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            console.error('연결 오류:', error);
            return { status: 'error', error: { message: error.message } };
        }
    }

    async getDeviceStatus(deviceId) {
        try {
            const response = await fetch(
                `${BASE_URL}/device/status?device_id=${deviceId}`
            );
            return await response.json();
        } catch (error) {
            console.error('상태 조회 오류:', error);
            return { status: 'error', error: { message: error.message } };
        }
    }
}

// 사용 예시
async function main() {
    const api = new DeviceAPI();
    
    // 1. 디바이스 검색
    const devices = await api.scanDevices();
    console.log(`발견된 디바이스: ${devices.length}개`);
    
    if (devices.length > 0) {
        // 2. 첫 번째 디바이스 연결
        const deviceId = devices[0].id;
        const result = await api.connectDevice(deviceId);
        
        if (result.status === 'success') {
            console.log(`연결 성공: ${deviceId}`);
            
            // 3. 디바이스 상태 확인
            const status = await api.getDeviceStatus(deviceId);
            const battery = status.data.battery.level;
            console.log(`배터리: ${battery}%`);
        } else {
            console.log(`연결 실패: ${result.error.message}`);
        }
    }
}

main();
```

## 모범 사례

### 1. 연결 관리
- 연결 전 항상 디바이스 스캔 수행
- 연결 타임아웃 적절히 설정 (10-30초)
- 자동 재연결 기능 활용
- 사용 후 명시적으로 연결 해제

### 2. 오류 처리
- 모든 API 호출에 try-catch 구문 사용
- 오류 코드별 적절한 대응 로직 구현
- 재시도 메커니즘 구현 (최대 3회)
- 사용자에게 명확한 오류 메시지 제공

### 3. 성능 최적화
- 불필요한 상태 조회 최소화
- 배치 처리 가능한 작업은 한 번에 처리
- WebSocket 사용 고려 (실시간 데이터용)
- 적절한 폴링 간격 설정 (2-5초)

## 다음 단계

Device API 사용법을 익혔다면:
1. [Stream API](stream-api.md)에서 데이터 스트리밍 방법을 학습하세요
2. [WebSocket 통합](websocket-integration.md)에서 실시간 데이터 수신 방법을 확인하세요
3. [Python 예제](../examples/python-examples.md)에서 더 많은 실제 사용 예제를 확인하세요 