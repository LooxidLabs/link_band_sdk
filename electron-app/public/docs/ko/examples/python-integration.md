# Python 통합 예제

Link Band SDK를 Python 환경에서 활용하는 다양한 예제를 제공합니다.

## 환경 설정

### 필수 라이브러리 설치

```bash
pip install requests websocket-client numpy scipy matplotlib pandas
```

## 기본 API 사용법

### 1. Link Band 디바이스 제어

```python
import requests
import time

class LinkBandController:
    def __init__(self, base_url="http://localhost:8121"):
        self.base_url = base_url
        self.session_id = None
    
    def connect_device(self, device_id):
        """디바이스 연결"""
        response = requests.post(f"{self.base_url}/device/connect", json={
            "device_id": device_id
        })
        return response.json()
    
    def start_recording(self, session_name="Python Session"):
        """레코딩 시작"""
        response = requests.post(f"{self.base_url}/data/start-recording", json={
            "session_name": session_name,
            "sensors": ["EEG", "PPG", "ACC"]
        })
        
        if response.json()["success"]:
            self.session_id = response.json()["data"]["session_id"]
            
        return response.json()
    
    def stop_recording(self):
        """레코딩 중지"""
        response = requests.post(f"{self.base_url}/data/stop-recording", json={
            "session_id": self.session_id
        })
        return response.json()

# 사용 예제
controller = LinkBandController()

# 5초간 레코딩
result = controller.start_recording("Test Recording")
time.sleep(5)
result = controller.stop_recording()
print(f"레코딩 완료: {result}")
```

### 2. 실시간 데이터 스트리밍

```python
import websocket
import json
import threading
from collections import deque

class RealTimeStreamer:
    def __init__(self, ws_url="ws://localhost:18765"):
        self.ws_url = ws_url
        self.data_buffers = {
            'EEG': deque(maxlen=1000),
            'PPG': deque(maxlen=1000),
            'ACC': deque(maxlen=1000)
        }
        
    def connect(self):
        """WebSocket 연결"""
        def on_message(ws, message):
            data = json.loads(message)
            self.process_data(data)
        
        def on_open(ws):
            print("WebSocket 연결 성공")
            ws.send(json.dumps({
                "type": "subscribe",
                "sensors": ["EEG", "PPG", "ACC"]
            }))
        
        self.ws = websocket.WebSocketApp(
            self.ws_url,
            on_open=on_open,
            on_message=on_message
        )
        
        wst = threading.Thread(target=self.ws.run_forever)
        wst.daemon = True
        wst.start()
        
        return True
    
    def process_data(self, data):
        """실시간 데이터 처리"""
        if data.get("type") == "sensor_data":
            sensor = data["sensor"]
            values = data["data"]
            
            self.data_buffers[sensor].append({
                'timestamp': data["timestamp"],
                'data': values
            })
            
            # 센서별 간단한 처리
            if sensor == "EEG":
                print(f"EEG 데이터 수신: {len(self.data_buffers['EEG'])} 샘플")
            elif sensor == "PPG":
                print(f"PPG 데이터 수신: {values}")

# 사용 예제
streamer = RealTimeStreamer()
streamer.connect()
time.sleep(10)  # 10초간 데이터 수집
```

## 데이터 분석 예제

### 3. 저장된 데이터 불러오기 및 분석

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import signal

class DataAnalyzer:
    def __init__(self, sampling_rate=250):
        self.fs = sampling_rate
        
    def load_session_data(self, session_id):
        """세션 데이터 불러오기"""
        base_url = "http://localhost:8121"
        
        # EEG 데이터 가져오기
        eeg_response = requests.get(f"{base_url}/data/sessions/{session_id}/files/eeg")
        eeg_data = eeg_response.json()["data"]
        
        # PPG 데이터 가져오기
        ppg_response = requests.get(f"{base_url}/data/sessions/{session_id}/files/ppg")
        ppg_data = ppg_response.json()["data"]
        
        return eeg_data, ppg_data
    
    def analyze_eeg_bands(self, eeg_data):
        """EEG 주파수 대역 분석"""
        freq_bands = {
            'delta': (0.5, 4),
            'theta': (4, 8),
            'alpha': (8, 13),
            'beta': (13, 30),
            'gamma': (30, 100)
        }
        
        results = {}
        
        for channel in eeg_data['channels']:
            channel_data = np.array(eeg_data['data'][channel])
            
            # 주파수 대역별 파워 계산
            freqs, psd = signal.welch(channel_data, self.fs, nperseg=1024)
            
            band_powers = {}
            for band_name, (low, high) in freq_bands.items():
                band_mask = (freqs >= low) & (freqs <= high)
                band_power = np.trapz(psd[band_mask], freqs[band_mask])
                band_powers[band_name] = band_power
            
            total_power = sum(band_powers.values())
            relative_powers = {band: power/total_power 
                             for band, power in band_powers.items()}
            
            results[channel] = relative_powers
            
            print(f"\n{channel} 분석 결과:")
            for band, rel_power in relative_powers.items():
                print(f"  {band}: {rel_power:.3f} ({rel_power*100:.1f}%)")
        
        return results

# 사용 예제
analyzer = DataAnalyzer()

# 최근 세션 분석
sessions_response = requests.get("http://localhost:8121/data/sessions?limit=1")
if sessions_response.json()["success"]:
    latest_session = sessions_response.json()["data"][0]
    session_id = latest_session["session_id"]
    
    eeg_data, ppg_data = analyzer.load_session_data(session_id)
    results = analyzer.analyze_eeg_bands(eeg_data)
```

### 4. 심박수 분석

```python
def analyze_heart_rate(ppg_data, sampling_rate=25):
    """PPG 데이터에서 심박수 분석"""
    ppg_signal = np.array(ppg_data['data'])
    
    # 심박수 계산 (간단한 피크 검출)
    peaks, _ = signal.find_peaks(ppg_signal, height=np.mean(ppg_signal))
    
    # 심박수 계산 (BPM)
    time_diff = len(ppg_signal) / sampling_rate  # 전체 시간 (초)
    heart_rate = (len(peaks) / time_diff) * 60
    
    print(f"평균 심박수: {heart_rate:.1f} BPM")
    
    # 심박변이도 계산
    if len(peaks) > 1:
        rr_intervals = np.diff(peaks) / sampling_rate * 1000  # ms
        hrv_rmssd = np.sqrt(np.mean(np.diff(rr_intervals)**2))
        print(f"HRV RMSSD: {hrv_rmssd:.1f} ms")
    
    return heart_rate, peaks

# 사용 예제
heart_rate, peaks = analyze_heart_rate(ppg_data)
```

## 세션 관리

### 5. 세션 목록 조회 및 관리

```python
def list_sessions(limit=10):
    """세션 목록 조회"""
    response = requests.get(f"http://localhost:8121/data/sessions?limit={limit}")
    
    if response.json()["success"]:
        sessions = response.json()["data"]
        
        print("최근 세션 목록:")
        for session in sessions:
            print(f"- {session['session_name']} ({session['created_at']})")
            print(f"  ID: {session['session_id']}")
            print(f"  길이: {session['duration']}초")
            print()
        
        return sessions
    
    return []

def export_session(session_id, format="json"):
    """세션 데이터 내보내기"""
    response = requests.post(f"http://localhost:8121/data/export", json={
        "session_id": session_id,
        "format": format,
        "sensors": ["EEG", "PPG", "ACC"]
    })
    
    if response.json()["success"]:
        export_path = response.json()["data"]["export_path"]
        print(f"데이터 내보내기 완료: {export_path}")
        return export_path
    
    return None

# 사용 예제
sessions = list_sessions()
if sessions:
    # 첫 번째 세션 내보내기
    export_path = export_session(sessions[0]["session_id"], "csv")
```

## 실시간 모니터링

### 6. 실시간 신호 품질 모니터링

```python
class SignalQualityMonitor:
    def __init__(self):
        self.quality_threshold = 0.7
        
    def check_signal_quality(self):
        """신호 품질 확인"""
        response = requests.get("http://localhost:8121/device/status")
        
        if response.json()["success"]:
            status = response.json()["data"]
            
            eeg_quality = status.get("eeg_quality", 0)
            ppg_quality = status.get("ppg_quality", 0)
            
            print(f"EEG 신호 품질: {eeg_quality:.2f}")
            print(f"PPG 신호 품질: {ppg_quality:.2f}")
            
            if eeg_quality < self.quality_threshold:
                print("⚠️ EEG 신호 품질이 낮습니다. 전극 접촉을 확인해주세요.")
            
            if ppg_quality < self.quality_threshold:
                print("⚠️ PPG 신호 품질이 낮습니다. 센서 위치를 조정해주세요.")
            
            return eeg_quality, ppg_quality
        
        return None, None

# 사용 예제
monitor = SignalQualityMonitor()
eeg_q, ppg_q = monitor.check_signal_quality()
```

## 고급 활용 예제

### 7. 자동화된 데이터 수집

```python
import schedule
import time

def automated_recording():
    """자동화된 데이터 수집"""
    controller = LinkBandController()
    
    # 5분간 자동 레코딩
    session_name = f"Auto Recording {time.strftime('%Y%m%d_%H%M%S')}"
    
    print(f"자동 레코딩 시작: {session_name}")
    result = controller.start_recording(session_name)
    
    if result["success"]:
        time.sleep(300)  # 5분 대기
        stop_result = controller.stop_recording()
        print(f"자동 레코딩 완료: {stop_result}")
    else:
        print(f"레코딩 시작 실패: {result}")

# 매일 오전 9시에 자동 레코딩 실행
schedule.every().day.at("09:00").do(automated_recording)

# 스케줄 실행
while True:
    schedule.run_pending()
    time.sleep(60)
```

이 예제들을 통해 Link Band SDK의 API를 활용하여 다양한 뇌파 데이터 수집 및 분석 작업을 자동화할 수 있습니다. 더 자세한 API 문서는 [API 참조](../api-reference/stream-api.md) 섹션을 확인해주세요. 