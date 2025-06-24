# 세션 관리

세션은 Link Band SDK에서 데이터 수집의 기본 단위입니다. 각 세션은 연속된 측정 기간 동안 수집된 모든 센서 데이터를 포함합니다.

## 세션 생성

### 자동 세션 생성
레코딩을 시작하면 자동으로 새 세션이 생성됩니다:

```
세션 ID: session_YYYYMMDD_HHMMSS
예시: session_20240101_120000
```

### 수동 세션 설정
레코딩 시작 전에 세션 정보를 미리 설정할 수 있습니다:

- **세션 이름**: 자동 설정된 세션 이름

## 세션 구조

### 디렉토리 구조
```
data/
└── session_20240101_120000/
    ├── meta.json                    # 세션 메타데이터
    ├── device_eeg_raw.json         # EEG 원시 데이터
    ├── device_eeg_processed.json   # EEG 처리된 데이터
    ├── device_ppg_raw.json         # PPG 원시 데이터
    ├── device_ppg_processed.json   # PPG 처리된 데이터
    ├── device_acc_raw.json         # ACC 원시 데이터
    ├── device_acc_processed.json   # ACC 처리된 데이터
    └── device_bat.json             # 배터리 상태 데이터
```

### 메타데이터 파일 (meta.json)
```json
{
  "session_info": {
    "session_id": "session_20240101_120000",
    "name": "Baseline Recording",
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
      "PPG": 50.0,
      "ACC": 25.0
    },
    "file_count": 7,
    "total_size_bytes": 2621440
  }
}
```

세션 관리를 통해 Link Band 데이터를 체계적으로 조직하고 효율적으로 활용할 수 있습니다. 