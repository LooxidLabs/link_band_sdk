# 저장소 정보

Link Band SDK는 수집된 데이터를 로컬 저장소에 체계적으로 저장하고 관리합니다. 이 문서에서는 데이터 저장 구조, 위치, 관리 방법에 대해 설명합니다.

## 저장 위치

### 운영체제별 기본 경로

#### Windows
```
C:\Users\[사용자명]\AppData\Roaming\LinkBandSDK\data\
```

#### macOS
```
/Users/[사용자명]/Library/Application Support/LinkBandSDK/data/
```

#### Linux
```
/home/[사용자명]/.config/LinkBandSDK/data/
```

### 사용자 정의 경로
설정에서 데이터 저장 위치를 변경할 수 있습니다:

```json
{
  "storage": {
    "data_directory": "/custom/path/to/data",
    "auto_create": true,
    "permissions": "755"
  }
}
```

## 디렉토리 구조

### 전체 구조
```
LinkBandSDK/
├── data/                           # 측정 데이터
│   ├── session_20240101_120000/    # 세션별 디렉토리
│   ├── session_20240101_130000/
│   └── ...
├── database/                       # 메타데이터 데이터베이스
│   └── data_center.db
├── exports/                        # 내보낸 파일들
│   ├── export_20240101_120000.zip
│   └── ...
├── logs/                          # 시스템 로그
│   ├── app.log
│   ├── device.log
│   └── error.log
├── temp/                          # 임시 파일
│   └── ...
└── config/                        # 설정 파일
    ├── app_config.json
    └── user_preferences.json
```

### 세션 디렉토리 구조
```
session_20240101_120000/
├── meta.json                      # 세션 메타데이터
├── 015F2A8E-3772-FB6D-2197-548F305983B0_eeg_raw.json
├── 015F2A8E-3772-FB6D-2197-548F305983B0_eeg_processed.json
├── 015F2A8E-3772-FB6D-2197-548F305983B0_ppg_raw.json
├── 015F2A8E-3772-FB6D-2197-548F305983B0_ppg_processed.json
├── 015F2A8E-3772-FB6D-2197-548F305983B0_acc_raw.json
├── 015F2A8E-3772-FB6D-2197-548F305983B0_acc_processed.json
└── 015F2A8E-3772-FB6D-2197-548F305983B0_bat.json
```

## 파일 명명 규칙

### 세션 디렉토리
```
session_YYYYMMDD_HHMMSS
```

### 데이터 파일
```
[DEVICE_ID]_[SENSOR_TYPE]_[DATA_TYPE].json

예시:
- 015F2A8E-3772-FB6D-2197-548F305983B0_eeg_raw.json
- 015F2A8E-3772-FB6D-2197-548F305983B0_ppg_processed.json
```

### 내보낸 파일
```
export_[SESSION_ID]_[FORMAT]_[TIMESTAMP].[EXTENSION]

예시:
- export_session_20240101_120000_csv_20240101_150000.zip
- export_batch_20240101_json_20240101_160000.tar.gz
```

## 저장소 관리

### 디스크 사용량 모니터링
실시간으로 저장소 사용량을 모니터링합니다:

```json
{
  "storage_info": {
    "total_space": "500 GB",
    "used_space": "125 GB", 
    "available_space": "375 GB",
    "usage_percentage": 25.0,
    "linkband_data_size": "2.5 GB",
    "session_count": 156
  }
}
```

### 자동 정리 정책
설정된 정책에 따라 자동으로 오래된 데이터를 정리합니다:

```json
{
  "cleanup_policy": {
    "enabled": true,
    "max_storage_size": "10 GB",
    "max_session_age_days": 90,
    "min_free_space": "1 GB",
    "cleanup_schedule": "weekly",
    "preserve_tagged_sessions": true
  }
}
```

### 백업 설정
중요한 데이터의 백업을 자동화합니다:

```json
{
  "backup": {
    "enabled": true,
    "local_backup": {
      "path": "/backup/linkband/",
      "frequency": "daily",
      "retention_days": 30
    },
    "cloud_backup": {
      "provider": "google_drive",
      "frequency": "weekly",
      "compression": true
    }
  }
}
```

## 문제 해결

### 일반적인 문제

#### 디스크 공간 부족
```bash
# 디스크 사용량 확인
df -h

# 큰 파일 찾기
find /path/to/linkband/data -type f -size +100M -ls

```

#### 권한 문제
```bash
# 권한 수정 (Linux/macOS)
chmod -R 755 /path/to/linkband/data
chown -R user:group /path/to/linkband/data
```


효율적인 저장소 관리를 통해 Link Band 데이터의 안전성과 접근성을 보장할 수 있습니다. 