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

## 분석 지표

Link Band SDK는 센서 데이터에서 파생된 다양한 분석 지표를 제공하여 생리학적 및 인지적 상태를 해석하는 데 도움을 줍니다. 이러한 지표들은 실시간으로 계산되어 처리된 데이터 파일에 포함됩니다.

### EEG 분석 지표

#### 집중 지수 (Focus Index)
- **설명**: 집중 지수는 인지적 집중 수준을 나타내며, 베타 파워를 알파 및 세타 파워의 합으로 나눈 비율로 계산됩니다. 높은 값은 깊은 집중을, 낮은 값은 주의 산만을 나타냅니다.
- **공식**: 집중 지수 = 베타 파워 / (알파 파워 + 세타 파워)
- **정상 범위**: 0.3 - 1.2 (정상 집중), 1.2 - 2.0 (높은 집중)
- **해석**: <0.3: 주의력 결핍 또는 졸음; >2.0: 과도한 긴장 또는 스트레스.
- **참고문헌**: Klimesch, W. (1999). EEG alpha and theta oscillations reflect cognitive and memory performance. Brain Research Reviews, 29(2-3), 169-195; Pope, A.T. et al. (1995). Biological Psychology, 40(1-2), 187-195.

#### 이완 지수 (Relaxation Index)
- **설명**: 이완 지수는 상대적 알파 활동을 기반으로 한 정신적 이완 상태를 측정합니다. 높은 값은 더 이완된 상태를 나타냅니다.
- **공식**: 이완 지수 = 알파 파워 / (알파 파워 + 베타 파워)
- **정상 범위**: 0.4 - 0.7 (정상 이완), 0.7 - 0.9 (깊은 이완)
- **해석**: <0.4: 긴장 또는 스트레스; >0.9: 과도한 이완, 각성도 감소.
- **참고문헌**: Bazanova, O. M., & Vernon, D. (2014). Neuroscience & Biobehavioral Reviews, 44, 94-110.

#### 스트레스 지수 (Stress Index)
- **설명**: 스트레스 지수는 정신적 스트레스와 각성을 나타내며, 고주파수(베타, 감마) 활동 증가와 함께 상승합니다.
- **공식**: 스트레스 지수 = (베타 파워 + 감마 파워) / (알파 파워 + 세타 파워)
- **정상 범위**: 0.5 - 1.5 (정상 각성)
- **해석**: <0.5: 낮은 각성 또는 졸음; >1.5: 높은 스트레스 또는 과각성; >2.5: 심각한 스트레스.
- **참고문헌**: Ahn, J. W., et al. (2019). Sensors, 19(21), 4644.

#### 반구 균형 (Hemispheric Balance)
- **설명**: 반구 균형은 좌우 반구 간 알파 활동의 균형을 나타내며, 감정적 및 인지적 편향을 반영합니다.
- **공식**: (좌측 알파 - 우측 알파) / (좌측 알파 + 우측 알파)
- **정상 범위**: -0.2 ~ 0.2 (균형)
- **해석**: <-0.2: 우반구 우세 (창의적, 직관적); >0.2: 좌반구 우세 (분석적, 논리적); >0.5 또는 <-0.5: 심각한 불균형.
- **참고문헌**: Davidson, R. J. (2004). Biological Psychology, 67(1-2), 219-234.

#### 인지 부하 (Cognitive Load)
- **설명**: 인지 부하는 세타/알파 비율을 기반으로 한 정신적 작업 부하와 노력을 반영합니다.
- **공식**: 인지 부하 = 세타 파워 / 알파 파워
- **정상 범위**: 0.3 - 0.8 (최적 부하)
- **해석**: <0.3: 낮은 참여도; >0.8: 높은 인지 부하; >1.2: 과부하.
- **참고문헌**: Gevins, A., & Smith, M. E. (2003). Theoretical Issues in Ergonomics Science, 4(1-2), 113-131.

#### 정서 안정성 (Emotional Stability)
- **설명**: 정서 안정성은 저주파수 대 감마 파워의 비율을 기반으로 한 감정 조절 능력을 측정합니다.
- **공식**: 정서 안정성 = (알파 파워 + 세타 파워) / 감마 파워
- **정상 범위**: 2.0 - 8.0 (안정 상태)
- **해석**: <2.0: 정서 불안정 또는 과각성; >8.0: 과도한 억제 또는 둔화된 감정.
- **참고문헌**: Knyazev, G. G. (2007). Neuroscience & Biobehavioral Reviews, 31(3), 377-395.

#### 총 파워 (Total Power)
- **설명**: 총 파워는 모든 EEG 대역 파워의 합으로, 전체적인 뇌 활동을 나타냅니다.
- **공식**: 델타, 세타, 알파, 베타, 감마 대역 파워의 합
- **정상 범위**: 개인 및 상황에 따라 다름
- **해석**: 높은 값은 증가된 신경 활동을 나타낼 수 있으며, 낮은 값은 낮은 각성 또는 졸음을 시사할 수 있습니다.
- **참고문헌**: 표준 EEG 문헌.

### PPG 분석 지표

#### 심박수 (BPM)
- **설명**: 분당 심박수로, 심혈관 건강의 기본적인 지표입니다.
- **공식**: BPM = 60,000 / 평균 RR 간격 (ms)
- **정상 범위**: 60 - 100 bpm (성인 안정 시); 40 - 60 bpm (훈련된 운동선수)
- **해석**: <60 bpm (서맥), >100 bpm (빈맥), >120 bpm (심각한 빈맥).
- **참고문헌**: 미국 심장 협회 가이드라인 (2020).

#### SDNN (NN 간격의 표준편차)
- **설명**: NN 간격의 표준편차로, 전체적인 심박 변이도를 반영합니다.
- **공식**: SDNN = √(Σ(RRᵢ - RR̄)² / (N-1))
- **정상 범위**: >50 ms (건강함); 20–50 ms (경계선)
- **해석**: <20 ms: 자율신경계 기능 장애; >200 ms: 잠재적 부정맥.
- **참고문헌**: Task Force, ESC (1996). Circulation, 93(5), 1043-1065.

#### RMSSD (연속 차이의 제곱근 평균)
- **설명**: 연속 RR 차이의 제곱근 평균으로, 부교감신경 활동을 나타냅니다.
- **공식**: RMSSD = √(Σ(RRᵢ₊₁ - RRᵢ)² / (N-1))
- **정상 범위**: ~20 ms (건강함)
- **해석**: <20 ms: 부교감신경 활동 감소; >100 ms: 과도한 부교감신경 우세.
- **참고문헌**: Shaffer, F., & Ginsberg, J. P. (2017). Frontiers in Public Health, 5, 258.

#### PNN50
- **설명**: 50ms보다 큰 연속 RR 간격 차이의 백분율입니다.
- **공식**: PNN50 = (NN50 개수 / 총 NN 간격) × 100%
- **정상 범위**: ~3%
- **해석**: <3%: 부교감신경 활동 감소; >30%: 높은 변이도.
- **참고문헌**: Mietus, J. E., et al. (2002). Heart, 88(4), 378-380.

#### 저주파수 (LF)
- **설명**: 저주파수 파워 (0.04–0.15 Hz)로, 교감신경과 부교감신경의 복합 활동을 반영합니다.
- **정상 범위**: 519–1052 ms²
- **해석**: 낮음: 자율신경 활동 감소; 높음: 스트레스 또는 교감신경 과활성.
- **참고문헌**: ESC Task Force (1996). Circulation, 93(5), 1043-1065.

#### 고주파수 (HF)
- **설명**: 고주파수 파워 (0.15–0.4 Hz)로, 부교감신경(미주신경) 활동을 나타냅니다.
- **정상 범위**: 657–2147 ms²
- **해석**: 낮음: 미주신경 긴장도 감소; 높음: 과도한 부교감신경 활동.
- **참고문헌**: Shaffer, F., & Ginsberg, J. P. (2017). Frontiers in Public Health, 5, 258.

#### LF/HF 비율
- **설명**: LF 대 HF 파워의 비율로, 교감-부교감신경 균형을 나타냅니다.
- **공식**: LF/HF 비율 = LF 파워 / HF 파워
- **정상 범위**: 0.5–2.0
- **해석**: <0.5: 부교감신경 우세; >2.0: 교감신경 우세; >4.0: 심각한 불균형.
- **참고문헌**: Billman, G. E. (2013). Frontiers in Physiology, 4, 26.

#### SDSD (연속 차이의 표준편차)
- **설명**: 연속 RR 차이의 표준편차입니다.
- **해석**: 심박 변이도의 급속한 변화를 반영합니다.
- **참고문헌**: 표준 HRV 문헌.

### ACC 분석 지표

#### 활동 상태 (Activity State)
- **설명**: 가속도계 데이터를 기반으로 분류된 신체 활동 수준입니다.
- **공식**: 움직임 크기 = √(∇x² + ∇y² + ∇z²); 평균 움직임 = 크기의 평균.
- **임계값**: <200: 정지; 200–600: 앉기; 600–1000: 걷기; >1000: 뛰기.
- **해석**: 신진대사율 및 칼로리 소모와 상관관계가 있습니다.
- **참고문헌**: Troiano, R. P., et al. (2008). Medicine & Science in Sports & Exercise, 40(1), 181-188.

#### 평균 움직임 (Average Movement)
- **설명**: 버퍼 기간 동안의 평균 움직임 크기입니다.
- **해석**: 높은 값은 더 역동적인 움직임을 나타냅니다.

#### 움직임 표준편차 (Standard Deviation Movement)
- **설명**: 움직임 크기의 변이도입니다.
- **해석**: 높은 변이도: 불규칙한 움직임; 낮은 변이도: 일관된 활동.

#### 최대 움직임 (Max Movement)
- **설명**: 감지된 최대 움직임 크기입니다.
- **해석**: 최대 가속도 이벤트를 나타냅니다.

## 데이터 내보내기 옵션

### 지원되는 내보내기 형식
- **JSON**: 전체 메타데이터를 포함한 네이티브 형식
- **CSV**: 분석 도구를 위한 간소화된 형식
- **MAT**: MATLAB 호환 형식
- **EDF**: 임상 응용을 위한 유럽 데이터 형식
- **BDF**: BioSemi 데이터 형식

### 내보내기 구성
```json
{
  "export_settings": {
    "format": "CSV",
    "include_metadata": true,
    "include_quality_metrics": true,
    "include_analytics_indices": true,
    "time_format": "ISO8601",
    "decimal_precision": 6,
    "compression": "gzip"
  }
}
```

## 분석 도구와의 통합

### Python 통합
```python
import pandas as pd
import numpy as np

# CSV 데이터 로드
data = pd.read_csv('session_data.csv')

# 분석 지표 접근
focus_index = data['focus_index']
heart_rate = data['heart_rate']
activity_state = data['activity_state']
```

### MATLAB 통합
```matlab
% MAT 파일 로드
load('session_data.mat');

% 분석 지표 접근
focus_index = data.focus_index;
heart_rate = data.heart_rate;
activity_state = data.activity_state;
```

### R 통합
```r
# CSV 데이터 로드
data <- read.csv('session_data.csv')

# 분석 지표 접근
focus_index <- data$focus_index
heart_rate <- data$heart_rate
activity_state <- data$activity_state
```