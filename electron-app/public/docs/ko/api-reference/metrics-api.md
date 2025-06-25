# Metrics API

Link Band SDK의 시스템 메트릭스와 처리된 센서 데이터를 제공하는 API입니다.

## 개요

Metrics API는 Link Band 디바이스와 시스템의 성능 지표, 통계 정보, 상태 메트릭을 제공하는 API입니다. 실시간 성능 모니터링, 데이터 품질 평가, 시스템 상태 추적 등의 기능을 제공합니다.

## 기본 정보

- **Base URL**: `http://localhost:8121`
- **응답 형식**: JSON

## API 엔드포인트

### GET /metrics

시스템 메트릭스와 스트리밍 상태를 반환합니다.

**요청:**
```http
GET /metrics HTTP/1.1
Host: localhost:8121
```

**응답:**
```json
{
  "status": "running",
  "clients_connected": 1,
  "eeg_sampling_rate": 250.0,
  "ppg_sampling_rate": 50.0,
  "acc_sampling_rate": 25.0,
  "bat_sampling_rate": 10.0,
  "bat_level": 85,
  "device_connected": true,
  "is_streaming": true,
  "uptime": 3600.5
}
```

## 처리된 센서 데이터

### EEG 처리 데이터

EEG 신호 처리 결과는 0.5초마다 생성되며 다음 정보를 포함합니다:

```json
{
  "timestamp": 1234567890.123,
  "ch1_filtered": [1234.56, 2345.67, ...],
  "ch2_filtered": [1234.56, 2345.67, ...],
  "ch1_leadoff": false,
  "ch2_leadoff": false,
  "ch1_sqi": [0.85, 0.90, ...],
  "ch2_sqi": [0.88, 0.92, ...],
  "ch1_power": [10.5, 15.2, 8.7, ...],
  "ch2_power": [12.1, 16.8, 9.3, ...],
  "frequencies": [1, 2, 3, ..., 45],
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
```

#### EEG 주파수 밴드

- **Delta (δ)**: 1-4Hz - 깊은 수면 상태
- **Theta (θ)**: 4-8Hz - 명상, 창의적 사고
- **Alpha (α)**: 8-13Hz - 이완, 안정 상태
- **Beta (β)**: 13-30Hz - 집중, 활성 사고
- **Gamma (γ)**: 30-45Hz - 고차원 인지 처리

#### EEG 지표 설명

- **focus_index**: 집중도 지수 = β / (α + θ)
- **relaxation_index**: 이완도 지수 = α / (α + β)
- **stress_index**: 스트레스 지수 = (β + γ) / (α + θ)
- **hemispheric_balance**: 좌우뇌 균형 = (좌α - 우α) / (좌α + 우α)
- **cognitive_load**: 인지 부하 = θ / α
- **emotional_stability**: 감정 안정도 = (α + θ) / γ
- **signal_quality**: "good" (양호) 또는 "poor" (불량)
- **good_samples_ratio**: 양호한 샘플 비율 (0.0-1.0)

### PPG 처리 데이터

PPG 신호 처리 결과는 0.5초마다 생성되며 심박변이도(HRV) 분석을 포함합니다:

```json
{
  "timestamp": 1234567890.123,
  "filtered_ppg": [12345, 23456, ...],
  "ppg_sqi": [0.95, 0.98, ...],
  "bpm": 72.5,
  "sdnn": 45.2,
  "rmssd": 32.1,
  "signal_quality": "good",
  "red_mean": 12500.0,
  "ir_mean": 23000.0,
  "rr_intervals": [820, 850, 830, ...],
  "pnn50": 15.5,
  "sdsd": 28.3,
  "hr_mad": 3.2,
  "sd1": 22.8,
  "sd2": 61.5,
  "lf": 1245.3,
  "hf": 2156.7,
  "lf_hf": 0.58
}
```

#### PPG/HRV 지표 설명

**기본 심박 지표:**
- **bpm**: 분당 심박수 (beats per minute)
- **red_mean**: 적색광 평균값
- **ir_mean**: 적외선광 평균값
- **signal_quality**: "good" (양호) 또는 "poor" (불량)

**시간 영역 HRV 지표:**
- **sdnn**: RR 간격의 표준편차 (ms) - 전체적인 HRV
- **rmssd**: 연속된 RR 간격 차이의 제곱근 평균 (ms) - 단기 HRV
- **pnn50**: 50ms 이상 차이나는 RR 간격의 비율 (%) - 부교감신경 활성도
- **sdsd**: 연속된 RR 간격 차이의 표준편차 (ms)
- **hr_mad**: 심박수의 중앙절대편차 (bpm)

**기하학적 지표:**
- **sd1**: 포인카레 플롯의 단축 표준편차 - 단기 변이성
- **sd2**: 포인카레 플롯의 장축 표준편차 - 장기 변이성

**주파수 영역 지표:**
- **lf**: 저주파 파워 (0.04-0.15Hz) - 교감/부교감신경 활성도
- **hf**: 고주파 파워 (0.15-0.4Hz) - 부교감신경 활성도
- **lf_hf**: LF/HF 비율 - 자율신경계 균형

### ACC 처리 데이터

가속도계 데이터 처리 결과는 0.5초마다 생성되며 활동 분류를 포함합니다:

```json
{
  "timestamp": 1234567890.123,
  "x_change": [0.01, 0.02, ...],
  "y_change": [-0.01, 0.03, ...],
  "z_change": [0.005, -0.015, ...],
  "avg_movement": 150.5,
  "std_movement": 45.2,
  "max_movement": 250.8,
  "activity_state": "sitting",
  "x_change_mean": 0.015,
  "y_change_mean": 0.01,
  "z_change_mean": -0.005
}
```

#### ACC 지표 설명

**움직임 지표:**
- **x_change, y_change, z_change**: 각 축의 변화량 배열
- **avg_movement**: 평균 움직임 크기
- **std_movement**: 움직임의 표준편차
- **max_movement**: 최대 움직임 크기
- **x_change_mean, y_change_mean, z_change_mean**: 각 축 변화량의 평균

**활동 상태 분류:**
- **"stationary"**: 정지 상태 (avg_movement < 200)
- **"sitting"**: 앉은 상태 (200 ≤ avg_movement < 600)
- **"walking"**: 걷기 상태 (600 ≤ avg_movement < 1000)
- **"running"**: 뛰기 상태 (avg_movement ≥ 1000)

### 배터리 처리 데이터

배터리 데이터 처리 결과는 1.0초마다 생성됩니다:

```json
{
  "timestamp": 1234567890.123,
  "battery_level": 85.0,
  "battery_status": "high"
}
```

#### 배터리 지표 설명

- **battery_level**: 배터리 잔량 (0-100%)
- **battery_status**: 배터리 상태
  - **"high"**: 높음 (80% 이상)
  - **"medium"**: 보통 (20-80%)
  - **"low"**: 낮음 (20% 미만)

## 신호 품질 지표

### Signal Quality Index (SQI)

모든 센서 데이터에 대해 신호 품질을 평가합니다:

**EEG SQI:**
- 진폭 기반 SQI: 신호 진폭이 임계값(100μV) 이내인 샘플 비율
- 주파수 기반 SQI: 관심 주파수 대역(1-45Hz) 내 파워 비율
- 결합 SQI: 진폭 SQI × 1.0 + 주파수 SQI × 0.0

**PPG SQI:**
- 진폭 기반 SQI: 신호 진폭이 임계값(250) 이내인 샘플 비율

**품질 임계값:**
- EEG: SQI ≥ 0.7 (양호)
- PPG: SQI ≥ 0.95 (양호)

## 처리 파라미터

### 버퍼 크기
- **EEG**: 2000 samples (8초, 250Hz)
- **PPG**: 3000 samples (60초, 50Hz)
- **ACC**: 150 samples (6초, 25Hz)
- **배터리**: 50 samples (5초, 10Hz)

### 처리 간격
- **EEG**: 0.5초마다
- **PPG**: 0.5초마다
- **ACC**: 0.5초마다
- **배터리**: 1.0초마다

### 필터링 설정

**EEG 필터:**
- 노치 필터: 60Hz (전원 잡음 제거)
- 밴드패스 필터: 1-45Hz (관심 주파수 대역)

**PPG 필터:**
- 밴드패스 필터: 0.5-5.0Hz (심박 신호 대역)

## 사용 예제

### Python으로 메트릭스 조회

```python
import requests
import json

# 메트릭스 조회
response = requests.get('http://localhost:8121/metrics')
metrics = response.json()

print(f"스트리밍 상태: {metrics['status']}")
print(f"연결된 클라이언트: {metrics['clients_connected']}")
print(f"EEG 샘플링 레이트: {metrics['eeg_sampling_rate']}Hz")
print(f"배터리 레벨: {metrics['bat_level']}%")
```

### JavaScript로 메트릭스 조회

```javascript
fetch('http://localhost:8121/metrics')
  .then(response => response.json())
  .then(metrics => {
    console.log('스트리밍 상태:', metrics.status);
    console.log('연결된 클라이언트:', metrics.clients_connected);
    console.log('EEG 샘플링 레이트:', metrics.eeg_sampling_rate + 'Hz');
    console.log('배터리 레벨:', metrics.bat_level + '%');
  })
  .catch(error => {
    console.error('메트릭스 조회 실패:', error);
  });
```

## 성능 지표

### 실시간 스트리밍 성능

- **EEG**: 250Hz 수집, 25Hz 전송 (10:1 압축)
- **PPG**: 50Hz 수집 및 전송
- **ACC**: 25Hz 수집, ~30Hz 전송
- **배터리**: ~10Hz 전송

### 지연시간

- **원시 데이터**: 실시간 전송 (< 50ms)
- **처리된 데이터**: 0.5-1.0초 지연 (처리 시간 포함)

### 메모리 사용량

- **EEG 버퍼**: ~32KB (2000 samples × 16 bytes)
- **PPG 버퍼**: ~24KB (3000 samples × 8 bytes)
- **ACC 버퍼**: ~1.8KB (150 samples × 12 bytes)
- **배터리 버퍼**: ~400B (50 samples × 8 bytes)

## 오류 처리

### 일반적인 오류

#### 메트릭 수집 실패
```json
{
  "success": false,
  "error": "METRICS_COLLECTION_FAILED",
  "message": "Unable to collect system metrics"
}
```

#### 디바이스 연결 없음
```json
{
  "success": false,
  "error": "NO_DEVICE_CONNECTED",
  "message": "No device connected to collect metrics"
}
```

## 참고사항

1. 메트릭 데이터는 실시간으로 수집되며 약간의 지연이 있을 수 있습니다.
2. 성능 통계는 서버 재시작 시 초기화됩니다.
3. 대용량 데이터 요청 시 응답 시간이 길어질 수 있습니다.
4. WebSocket 연결을 통한 실시간 메트릭 구독을 권장합니다. 