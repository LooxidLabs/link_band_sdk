# Data API

Data API는 Link Band에서 수집된 데이터의 저장, 관리, 내보내기를 제어하는 API입니다. 레코딩 세션 관리와 데이터 파일 조작 기능을 제공합니다.

## 기본 정보

- **Base URL**: `http://localhost:8121`
- **Content-Type**: `application/json`

## 레코딩 관리

### 레코딩 시작

새로운 데이터 레코딩 세션을 시작합니다.

```http
POST /data/start-recording
```

**요청 본문:**
```json
{
  "session_name": "Baseline Recording",
  "participant_id": "P001",
  "condition": "eyes_closed",
  "sensors": ["EEG", "PPG", "ACC"],
  "notes": "5분간 눈 감고 안정 상태 측정"
}
```

**응답:**
```json
{
  "success": true,
  "message": "Recording started successfully",
  "data": {
    "session_id": "session_20240101_120000",
    "session_name": "Baseline Recording",
    "started_at": "2024-01-01T12:00:00.000Z",
    "sensors": ["EEG", "PPG", "ACC"],
    "output_directory": "/data/session_20240101_120000/"
  }
}
```

### 레코딩 중지

현재 진행 중인 레코딩을 중지합니다.

```http
POST /data/stop-recording
```

**요청 본문:**
```json
{
  "session_id": "session_20240101_120000"
}
```

**응답:**
```json
{
  "success": true,
  "message": "Recording stopped successfully",
  "data": {
    "session_id": "session_20240101_120000",
    "stopped_at": "2024-01-01T12:05:30.000Z",
    "duration": 330.0,
    "file_count": 7,
    "total_size": 2621440,
    "files": [
      "meta.json",
      "device_eeg_raw.json",
      "device_eeg_processed.json",
      "device_ppg_raw.json",
      "device_ppg_processed.json",
      "device_acc_raw.json",
      "device_acc_processed.json"
    ]
  }
}
```

### 레코딩 상태 확인

현재 레코딩 상태를 확인합니다.

```http
GET /data/recording-status
```

**응답:**
```json
{
  "success": true,
  "data": {
    "is_recording": true,
    "session_id": "session_20240101_120000",
    "session_name": "Baseline Recording",
    "started_at": "2024-01-01T12:00:00.000Z",
    "duration": 120.5,
    "sensors": ["EEG", "PPG", "ACC"],
    "current_file_sizes": {
      "eeg_raw": 1048576,
      "eeg_processed": 524288,
      "ppg_raw": 262144,
      "ppg_processed": 131072,
      "acc_raw": 65536,
      "acc_processed": 32768
    },
    "estimated_total_size": 2064384
  }
}
```

## 세션 관리

### 세션 목록 조회

저장된 모든 세션의 목록을 조회합니다.

```http
GET /data/sessions
```

**쿼리 파라미터:**
- `limit`: 반환할 세션 수 (기본값: 50)
- `offset`: 시작 위치 (기본값: 0)
- `sort`: 정렬 기준 (`created_at`, `duration`, `size`)
- `order`: 정렬 순서 (`asc`, `desc`)
- `filter`: 필터 조건

**응답:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "session_id": "session_20240101_120000",
        "session_name": "Baseline Recording",
        "participant_id": "P001",
        "condition": "eyes_closed",
        "start_time": "2024-01-01T12:00:00.000Z",
        "end_time": "2024-01-01T12:05:30.000Z",
        "duration": 330.0,
        "sensors": ["EEG", "PPG", "ACC"],
        "file_count": 7,
        "total_size": 2621440,
        "tags": ["baseline", "eyes_closed"]
      }
    ],
    "total_count": 156,
    "page_info": {
      "limit": 50,
      "offset": 0,
      "has_more": true
    }
  }
}
```

### 세션 상세 정보

특정 세션의 상세 정보를 조회합니다.

```http
GET /data/sessions/{session_id}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "session_info": {
      "session_id": "session_20240101_120000",
      "session_name": "Baseline Recording",
      "participant_id": "P001",
      "condition": "eyes_closed",
      "start_time": "2024-01-01T12:00:00.000Z",
      "end_time": "2024-01-01T12:05:30.000Z",
      "duration": 330.0,
      "notes": "5분간 눈 감고 안정 상태 측정"
    },
    "device_info": {
      "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
      "firmware_version": "1.2.3",
      "battery_level": 85
    },
    "data_info": {
      "sensors": ["EEG", "PPG", "ACC"],
      "sampling_rates": {
        "EEG": 250.0,
        "PPG": 100.0,
        "ACC": 50.0
      },
      "file_count": 7,
      "total_size": 2621440
    },
    "files": [
      {
        "filename": "meta.json",
        "size": 1024,
        "type": "metadata"
      },
      {
        "filename": "device_eeg_raw.json",
        "size": 1048576,
        "type": "sensor_data",
        "sensor": "EEG",
        "data_type": "raw"
      }
    ],
    "quality_metrics": {
      "EEG": {
        "signal_quality": 0.92,
        "artifact_percentage": 2.3
      },
      "PPG": {
        "signal_quality": 0.88,
        "heart_rate_variability": 45.2
      },
      "ACC": {
        "signal_quality": 0.95,
        "movement_intensity": "low"
      }
    }
  }
}
```

### 세션 삭제

특정 세션을 삭제합니다.

```http
DELETE /data/sessions/{session_id}
```

**응답:**
```json
{
  "success": true,
  "message": "Session deleted successfully",
  "data": {
    "session_id": "session_20240101_120000",
    "deleted_at": "2024-01-01T15:30:00.000Z",
    "deleted_files": 7,
    "freed_space": 2621440
  }
}
```

## 데이터 내보내기

### 세션 내보내기

특정 세션을 지정된 형식으로 내보냅니다.

```http
POST /data/export
```

**요청 본문:**
```json
{
  "session_ids": ["session_20240101_120000"],
  "format": "csv",
  "sensors": ["EEG", "PPG"],
  "data_type": "processed",
  "time_range": {
    "start": 30.0,
    "end": 300.0
  },
  "compression": "gzip",
  "output_filename": "baseline_data"
}
```

**응답:**
```json
{
  "success": true,
  "message": "Export started successfully",
  "data": {
    "export_id": "export_20240101_150000",
    "status": "processing",
    "estimated_completion": "2024-01-01T15:02:00.000Z",
    "output_path": "/exports/baseline_data.csv.gz"
  }
}
```

### 내보내기 상태 확인

내보내기 작업의 진행 상태를 확인합니다.

```http
GET /data/export/{export_id}/status
```

**응답:**
```json
{
  "success": true,
  "data": {
    "export_id": "export_20240101_150000",
    "status": "completed",
    "progress": 100,
    "started_at": "2024-01-01T15:00:00.000Z",
    "completed_at": "2024-01-01T15:01:45.000Z",
    "output_files": [
      "/exports/baseline_data.csv.gz"
    ],
    "file_sizes": {
      "baseline_data.csv.gz": 524288
    }
  }
}
```

### 내보낸 파일 다운로드

내보낸 파일을 다운로드합니다.

```http
GET /data/export/{export_id}/download
```

**응답:** 파일 스트림

## 데이터 파일 조작

### 파일 목록 조회

세션의 개별 파일 목록을 조회합니다.

```http
GET /data/sessions/{session_id}/files
```

**응답:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "filename": "device_eeg_raw.json",
        "path": "/data/session_20240101_120000/device_eeg_raw.json",
        "size": 1048576,
        "created_at": "2024-01-01T12:00:00.000Z",
        "modified_at": "2024-01-01T12:05:30.000Z",
        "checksum": "sha256:abc123...",
        "sensor": "EEG",
        "data_type": "raw"
      }
    ]
  }
}
```

### 파일 내용 조회

특정 파일의 내용을 조회합니다.

```http
GET /data/sessions/{session_id}/files/{filename}
```

**쿼리 파라미터:**
- `start`: 시작 라인 (기본값: 0)
- `limit`: 반환할 라인 수 (기본값: 1000)
- `format`: 반환 형식 (`json`, `csv`)

**응답:**
```json
{
  "success": true,
  "data": {
    "filename": "device_eeg_raw.json",
    "metadata": {
      "sensor_type": "EEG",
      "sampling_rate": 250.0,
      "channels": ["CH1", "CH2", "CH3", "CH4"],
      "data_points": 82500
    },
    "data": {
      "timestamp": [1704110400.000, 1704110400.004, ...],
      "CH1": [123.45, 124.67, ...],
      "CH2": [234.56, 235.78, ...],
      "CH3": [345.67, 346.89, ...],
      "CH4": [456.78, 457.90, ...]
    },
    "pagination": {
      "start": 0,
      "limit": 1000,
      "total": 82500,
      "has_more": true
    }
  }
}
```

## 데이터 분석

### 기본 통계

세션 데이터의 기본 통계를 계산합니다.

```http
GET /data/sessions/{session_id}/statistics
```

**응답:**
```json
{
  "success": true,
  "data": {
    "session_id": "session_20240101_120000",
    "duration": 330.0,
    "data_points": {
      "EEG": 82500,
      "PPG": 33000,
      "ACC": 16500
    },
    "statistics": {
      "EEG": {
        "CH1": {
          "mean": 0.125,
          "std": 12.34,
          "min": -45.67,
          "max": 56.78,
          "rms": 12.35
        }
      },
      "PPG": {
        "mean": 2048.5,
        "std": 123.4,
        "min": 1800,
        "max": 2300,
        "heart_rate": {
          "mean": 72.5,
          "std": 5.2,
          "min": 65,
          "max": 85
        }
      },
      "ACC": {
        "X": {"mean": 0.001, "std": 0.123},
        "Y": {"mean": -0.002, "std": 0.098},
        "Z": {"mean": 0.998, "std": 0.045}
      }
    }
  }
}
```

### 데이터 품질 평가

세션 데이터의 품질을 평가합니다.

```http
GET /data/sessions/{session_id}/quality
```

**응답:**
```json
{
  "success": true,
  "data": {
    "session_id": "session_20240101_120000",
    "overall_quality": 0.90,
    "sensor_quality": {
      "EEG": {
        "overall": 0.92,
        "signal_to_noise_ratio": 25.6,
        "artifact_percentage": 2.3,
        "channel_quality": {
          "CH1": 0.95,
          "CH2": 0.93,
          "CH3": 0.89,
          "CH4": 0.91
        }
      },
      "PPG": {
        "overall": 0.88,
        "signal_quality_index": 0.85,
        "motion_artifacts": 1.2,
        "perfusion_index": 2.1
      },
      "ACC": {
        "overall": 0.95,
        "calibration_accuracy": 0.98,
        "noise_level": 0.02
      }
    },
    "recommendations": [
      "EEG CH3 품질이 다소 낮습니다. 전극 접촉을 확인하세요.",
      "PPG 신호에 약간의 움직임 아티팩트가 있습니다."
    ]
  }
}
```

## Python 클라이언트 예제

### 기본 사용법
```python
import requests
import json

class LinkBandDataAPI:
    def __init__(self, base_url="http://localhost:8121"):
        self.base_url = base_url
    
    def start_recording(self, session_name, participant_id=None, condition=None):
        """레코딩 시작"""
        data = {
            "session_name": session_name,
            "sensors": ["EEG", "PPG", "ACC"]
        }
        if participant_id:
            data["participant_id"] = participant_id
        if condition:
            data["condition"] = condition
            
        response = requests.post(f"{self.base_url}/data/start-recording", json=data)
        return response.json()
    
    def stop_recording(self, session_id):
        """레코딩 중지"""
        response = requests.post(f"{self.base_url}/data/stop-recording", json={
            "session_id": session_id
        })
        return response.json()
    
    def get_sessions(self, limit=50, offset=0):
        """세션 목록 조회"""
        params = {"limit": limit, "offset": offset}
        response = requests.get(f"{self.base_url}/data/sessions", params=params)
        return response.json()
    
    def get_session_details(self, session_id):
        """세션 상세 정보"""
        response = requests.get(f"{self.base_url}/data/sessions/{session_id}")
        return response.json()
    
    def export_session(self, session_ids, format="csv", sensors=None):
        """세션 내보내기"""
        data = {
            "session_ids": session_ids if isinstance(session_ids, list) else [session_ids],
            "format": format
        }
        if sensors:
            data["sensors"] = sensors
            
        response = requests.post(f"{self.base_url}/data/export", json=data)
        return response.json()

# 사용 예제
api = LinkBandDataAPI()

# 레코딩 시작
result = api.start_recording("Test Session", "P001", "baseline")
session_id = result["data"]["session_id"]
print(f"레코딩 시작: {session_id}")

# 10초 후 레코딩 중지
import time
time.sleep(10)
result = api.stop_recording(session_id)
print(f"레코딩 중지: {result}")

# 세션 목록 조회
sessions = api.get_sessions()
print(f"총 세션 수: {sessions['data']['total_count']}")

# 세션 내보내기
export_result = api.export_session(session_id, "csv", ["EEG"])
print(f"내보내기 시작: {export_result}")
```

### 고급 사용법
```python
class AdvancedDataAPI(LinkBandDataAPI):
    def monitor_recording(self, check_interval=1.0):
        """레코딩 모니터링"""
        while True:
            response = requests.get(f"{self.base_url}/data/recording-status")
            status = response.json()
            
            if status["success"] and status["data"]["is_recording"]:
                duration = status["data"]["duration"]
                size = status["data"]["estimated_total_size"]
                print(f"레코딩 중... 시간: {duration:.1f}s, 크기: {size//1024}KB")
            else:
                print("레코딩이 중지되었습니다.")
                break
                
            time.sleep(check_interval)
    
    def batch_export(self, session_ids, export_config):
        """배치 내보내기"""
        export_jobs = []
        
        for session_id in session_ids:
            result = self.export_session([session_id], **export_config)
            if result["success"]:
                export_jobs.append(result["data"]["export_id"])
        
        # 모든 작업 완료 대기
        completed_jobs = []
        while len(completed_jobs) < len(export_jobs):
            for export_id in export_jobs:
                if export_id in completed_jobs:
                    continue
                    
                response = requests.get(f"{self.base_url}/data/export/{export_id}/status")
                status = response.json()
                
                if status["data"]["status"] == "completed":
                    completed_jobs.append(export_id)
                    print(f"내보내기 완료: {export_id}")
                elif status["data"]["status"] == "failed":
                    print(f"내보내기 실패: {export_id}")
                    completed_jobs.append(export_id)
            
            time.sleep(1)
        
        return completed_jobs
```

Data API를 통해 Link Band 데이터를 체계적으로 관리하고 분석할 수 있습니다. 