# 데이터 형식

Link Band SDK는 다양한 센서 데이터를 표준화된 형식으로 저장하고 처리합니다. 이 문서에서는 각 센서 데이터의 형식과 구조를 설명합니다.

## 지원하는 센서 데이터

### EEG (뇌파)
- **채널 수**: 최대 8채널
- **샘플링 레이트**: 250Hz (기본값)
- **데이터 타입**: 16-bit signed integer
- **단위**: μV (마이크로볼트)

### PPG (광용적맥파)
- **채널 수**: 1채널
- **샘플링 레이트**: 100Hz (기본값)
- **데이터 타입**: 16-bit unsigned integer
- **단위**: ADC counts

### ACC (가속도계)
- **축**: X, Y, Z 3축
- **샘플링 레이트**: 50Hz (기본값)
- **데이터 타입**: 16-bit signed integer
- **단위**: mg (밀리G)

## 파일 형식

### JSON 형식

#### 원시 데이터 (Raw Data)
```json
{
  "metadata": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "session_id": "session_20240101_120000",
    "sensor_type": "EEG",
    "sampling_rate": 250.0,
    "channels": ["CH1", "CH2", "CH3", "CH4"],
    "start_time": "2024-01-01T12:00:00.000Z",
    "duration": 300.0,
    "data_type": "raw"
  },
  "data": {
    "timestamp": [1704110400.000, 1704110400.004, 1704110400.008, ...],
    "CH1": [123.45, 124.67, 125.89, ...],
    "CH2": [234.56, 235.78, 236.90, ...],
    "CH3": [345.67, 346.89, 347.01, ...],
    "CH4": [456.78, 457.90, 458.12, ...]
  }
}
```

#### 처리된 데이터 (Processed Data)
```json
{
  "metadata": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "session_id": "session_20240101_120000",
    "sensor_type": "EEG",
    "sampling_rate": 250.0,
    "channels": ["CH1", "CH2", "CH3", "CH4"],
    "start_time": "2024-01-01T12:00:00.000Z",
    "duration": 300.0,
    "data_type": "processed",
    "processing": {
      "filters": ["bandpass", "notch"],
      "bandpass": {"low": 0.5, "high": 100.0},
      "notch": {"frequency": 60.0},
      "artifacts_removed": true
    }
  },
  "data": {
    "timestamp": [1704110400.000, 1704110400.004, 1704110400.008, ...],
    "CH1": [98.76, 99.87, 100.98, ...],
    "CH2": [187.65, 188.76, 189.87, ...],
    "CH3": [276.54, 277.65, 278.76, ...],
    "CH4": [365.43, 366.54, 367.65, ...]
  }
}
```

### CSV 형식

#### EEG 데이터
```csv
timestamp,CH1,CH2,CH3,CH4
1704110400.000,123.45,234.56,345.67,456.78
1704110400.004,124.67,235.78,346.89,457.90
1704110400.008,125.89,236.90,347.01,458.12
```

#### PPG 데이터
```csv
timestamp,PPG
1704110400.000,2048
1704110400.010,2056
1704110400.020,2064
```

#### ACC 데이터
```csv
timestamp,ACC_X,ACC_Y,ACC_Z
1704110400.000,0.123,0.456,0.789
1704110400.020,0.124,0.457,0.790
1704110400.040,0.125,0.458,0.791
```

### MAT 형식 (MATLAB)

MATLAB에서 사용할 수 있는 .mat 파일 형식:

```matlab
% 파일 로드
data = load('session_20240101_120000_eeg.mat');

% 데이터 접근
timestamps = data.timestamp;
eeg_ch1 = data.CH1;
eeg_ch2 = data.CH2;
sampling_rate = data.metadata.sampling_rate;
```

## 메타데이터 구조

각 데이터 파일에는 다음과 같은 메타데이터가 포함됩니다:

### 공통 메타데이터
```json
{
  "device_id": "고유 디바이스 식별자",
  "session_id": "세션 식별자",
  "start_time": "시작 시간 (ISO 8601)",
  "end_time": "종료 시간 (ISO 8601)",
  "duration": "지속 시간 (초)",
  "sampling_rate": "샘플링 레이트 (Hz)",
  "data_points": "총 데이터 포인트 수",
  "file_version": "파일 형식 버전"
}
```

### 센서별 메타데이터

#### EEG 메타데이터
```json
{
  "sensor_type": "EEG",
  "channels": ["CH1", "CH2", "CH3", "CH4"],
  "reference": "common_reference",
  "impedance": {
    "CH1": 5.2,
    "CH2": 4.8,
    "CH3": 6.1,
    "CH4": 5.5
  },
  "electrode_positions": {
    "CH1": "Fp1",
    "CH2": "Fp2",
    "CH3": "F3",
    "CH4": "F4"
  }
}
```

#### PPG 메타데이터
```json
{
  "sensor_type": "PPG",
  "wavelength": "660nm",
  "led_current": "20mA",
  "gain": "x4",
  "contact_quality": "good"
}
```

#### ACC 메타데이터
```json
{
  "sensor_type": "ACC",
  "range": "±2g",
  "resolution": "16-bit",
  "axes": ["X", "Y", "Z"],
  "orientation": {
    "X": "left-right",
    "Y": "front-back", 
    "Z": "up-down"
  }
}
```

## 데이터 품질 지표

각 데이터 파일에는 품질 평가 지표가 포함됩니다:

### EEG 품질 지표
```json
{
  "quality_metrics": {
    "signal_to_noise_ratio": 25.6,
    "artifact_percentage": 2.3,
    "electrode_contact": {
      "CH1": "good",
      "CH2": "good", 
      "CH3": "fair",
      "CH4": "good"
    },
    "frequency_analysis": {
      "delta": 15.2,
      "theta": 12.8,
      "alpha": 35.6,
      "beta": 28.4,
      "gamma": 8.0
    }
  }
}
```

### PPG 품질 지표
```json
{
  "quality_metrics": {
    "signal_quality_index": 0.85,
    "heart_rate_variability": 45.2,
    "motion_artifacts": 1.2,
    "perfusion_index": 2.1
  }
}
```

### ACC 품질 지표
```json
{
  "quality_metrics": {
    "dynamic_range": 1.2,
    "static_periods": 78.5,
    "movement_intensity": "moderate",
    "calibration_offset": {
      "X": 0.002,
      "Y": -0.001,
      "Z": 0.003
    }
  }
}
```

## 데이터 압축

대용량 데이터의 효율적인 저장을 위해 압축 옵션을 제공합니다:

### 무손실 압축
- **gzip**: JSON 파일의 gzip 압축
- **lz4**: 빠른 압축/해제를 위한 lz4 압축

### 손실 압축
- **다운샘플링**: 샘플링 레이트 감소
- **비트 깊이 감소**: 16-bit에서 8-bit로 변환
- **델타 인코딩**: 연속 값의 차이만 저장

## 호환성

### 외부 도구 호환성
- **EEGLAB**: MATLAB 기반 EEG 분석 도구
- **MNE-Python**: Python 기반 신경생리학 데이터 분석
- **FieldTrip**: MATLAB 기반 MEG/EEG 분석 도구
- **BrainVision**: Brain Products의 분석 소프트웨어

### 변환 도구
SDK에는 다른 형식으로 변환하는 유틸리티가 포함되어 있습니다:

```python
# Python 변환 예제
from linkband_sdk import DataConverter

converter = DataConverter()
converter.json_to_edf('session_data.json', 'output.edf')
converter.json_to_bdf('session_data.json', 'output.bdf')
```

Link Band SDK의 표준화된 데이터 형식을 통해 다양한 분석 도구와 호환되는 데이터를 생성할 수 있습니다. 