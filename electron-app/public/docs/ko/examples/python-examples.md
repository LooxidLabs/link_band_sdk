# Python 예제

## 개요

이 문서에서는 Link Band SDK를 Python에서 활용하는 다양한 예제를 제공합니다. REST API 호출, WebSocket 연결, 데이터 처리 등의 실용적인 예제를 통해 SDK를 효과적으로 활용할 수 있습니다.

## 기본 설정

### 필요한 라이브러리 설치

```bash
pip install requests websockets asyncio numpy matplotlib pandas
```

### 기본 클라이언트 클래스

```python
import requests
import json
import asyncio
import websockets
from typing import Optional, Dict, Any, List

class LinkBandClient:
    def __init__(self, base_url: str = "http://localhost:8121"):
        self.base_url = base_url
        self.session = requests.Session()
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        
    def get(self, endpoint: str) -> Dict[str, Any]:
        """GET 요청"""
        response = self.session.get(f"{self.base_url}{endpoint}")
        response.raise_for_status()
        return response.json()
    
    def post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """POST 요청"""
        response = self.session.post(
            f"{self.base_url}{endpoint}",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    
    async def connect_websocket(self):
        """WebSocket 연결"""
        self.websocket = await websockets.connect(f"ws://localhost:8121/ws")
        return self.websocket
```

## 예제 1: 디바이스 관리

### 디바이스 스캔 및 연결

```python
import time

def device_management_example():
    client = LinkBandClient()
    
    print("1. 디바이스 스캔 시작...")
    scan_result = client.post("/device/scan", {"duration": 10})
    print(f"스캔 결과: {scan_result}")
    
    # 스캔 완료까지 대기
    time.sleep(12)
    
    print("2. 스캔된 디바이스 목록 조회...")
    devices = client.get("/device/list")
    print(f"발견된 디바이스: {len(devices['data'])}개")
    
    if devices['data']:
        device = devices['data'][0]
        device_address = device['address']
        
        print(f"3. 디바이스 연결: {device_address}")
        connect_result = client.post("/device/connect", {
            "address": device_address
        })
        print(f"연결 결과: {connect_result}")
        
        # 연결 상태 확인
        time.sleep(3)
        status = client.get("/device/status")
        print(f"연결 상태: {status}")
        
        # 배터리 정보 확인
        battery = client.get("/device/battery")
        print(f"배터리 레벨: {battery['data']['level']}%")
    
    else:
        print("스캔된 디바이스가 없습니다.")

if __name__ == "__main__":
    device_management_example()
```

## 예제 2: 실시간 데이터 스트리밍

### WebSocket을 통한 실시간 데이터 수신

```python
import asyncio
import json
from datetime import datetime

class RealTimeDataStreamer:
    def __init__(self):
        self.client = LinkBandClient()
        self.is_streaming = False
        self.data_buffer = {
            'eeg': [],
            'ppg': [],
            'acc': []
        }
    
    async def start_streaming(self):
        """스트리밍 시작"""
        try:
            # WebSocket 연결
            ws = await self.client.connect_websocket()
            print("WebSocket 연결됨")
            
            # 스트리밍 시작 요청
            start_result = self.client.post("/stream/start", {})
            print(f"스트리밍 시작: {start_result}")
            
            self.is_streaming = True
            
            # 메시지 수신 대기
            async for message in ws:
                try:
                    data = json.loads(message)
                    await self.handle_message(data)
                except json.JSONDecodeError as e:
                    print(f"메시지 파싱 오류: {e}")
                    
        except Exception as e:
            print(f"스트리밍 오류: {e}")
        finally:
            self.is_streaming = False
    
    async def handle_message(self, data: Dict[str, Any]):
        """메시지 처리"""
        if data.get('type') == 'raw_data':
            sensor_type = data.get('sensor_type')
            samples = data.get('data', [])
            
            # 버퍼에 데이터 추가
            self.data_buffer[sensor_type].extend(samples)
            
            # 최근 1000개 샘플만 유지
            if len(self.data_buffer[sensor_type]) > 1000:
                self.data_buffer[sensor_type] = self.data_buffer[sensor_type][-1000:]
            
            print(f"{sensor_type.upper()} 데이터 수신: {len(samples)}개 샘플")
            
            # 특정 센서별 처리
            if sensor_type == 'eeg':
                await self.process_eeg_data(samples)
            elif sensor_type == 'ppg':
                await self.process_ppg_data(samples)
            elif sensor_type == 'acc':
                await self.process_acc_data(samples)
    
    async def process_eeg_data(self, samples: List[Dict]):
        """EEG 데이터 처리"""
        for sample in samples:
            ch1 = sample.get('ch1', 0)
            ch2 = sample.get('ch2', 0)
            timestamp = sample.get('timestamp', 0)
            
            # 신호 품질 확인
            if abs(ch1) > 10000 or abs(ch2) > 10000:
                print(f"⚠️  EEG 신호 포화 감지: CH1={ch1}, CH2={ch2}")
    
    async def process_ppg_data(self, samples: List[Dict]):
        """PPG 데이터 처리"""
        for sample in samples:
            red = sample.get('red', 0)
            ir = sample.get('ir', 0)
            
            # 간단한 심박수 계산 (실제로는 더 복잡한 알고리즘 필요)
            if red > 1000000:  # 임계값
                print(f"💓 심박 감지: Red={red}, IR={ir}")
    
    async def process_acc_data(self, samples: List[Dict]):
        """가속도계 데이터 처리"""
        for sample in samples:
            x = sample.get('x', 0)
            y = sample.get('y', 0)
            z = sample.get('z', 0)
            
            # 움직임 감지
            magnitude = (x**2 + y**2 + z**2) ** 0.5
            if magnitude > 20000:  # 임계값
                print(f"🏃 움직임 감지: 가속도 크기 = {magnitude:.2f}")

# 사용 예제
async def streaming_example():
    streamer = RealTimeDataStreamer()
    
    try:
        await streamer.start_streaming()
    except KeyboardInterrupt:
        print("스트리밍 중지됨")

if __name__ == "__main__":
    asyncio.run(streaming_example())
```

## 예제 3: 데이터 레코딩 및 분석

### 데이터 수집 및 저장

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

class DataRecorder:
    def __init__(self):
        self.client = LinkBandClient()
        self.session_id = None
    
    def start_recording(self, duration_minutes: int = 5):
        """레코딩 시작"""
        result = self.client.post("/data/start-recording", {
            "duration": duration_minutes * 60,
            "sensors": ["eeg", "ppg", "acc"],
            "metadata": {
                "subject": "test_subject",
                "experiment": "data_collection_example",
                "notes": "Python SDK 예제 레코딩"
            }
        })
        
        self.session_id = result['data']['session_id']
        print(f"레코딩 시작: {self.session_id}")
        print(f"예상 종료 시간: {datetime.now() + timedelta(minutes=duration_minutes)}")
        
        return self.session_id
    
    def stop_recording(self):
        """레코딩 중지"""
        if self.session_id:
            result = self.client.post("/data/stop-recording", {})
            print(f"레코딩 중지: {result}")
            return result
    
    def get_session_data(self, session_id: str):
        """세션 데이터 조회"""
        result = self.client.get(f"/data/sessions/{session_id}")
        return result['data']
    
    def analyze_session(self, session_id: str):
        """세션 데이터 분석"""
        session_data = self.get_session_data(session_id)
        
        print(f"세션 분석: {session_id}")
        print(f"시작 시간: {session_data['start_time']}")
        print(f"종료 시간: {session_data['end_time']}")
        print(f"지속 시간: {session_data['duration']:.2f}초")
        
        # 각 센서별 데이터 통계
        for sensor_type in ['eeg', 'ppg', 'acc']:
            if sensor_type in session_data['files']:
                file_info = session_data['files'][sensor_type]['raw']
                print(f"{sensor_type.upper()} 데이터: {file_info['sample_count']}개 샘플")

def recording_example():
    recorder = DataRecorder()
    
    try:
        # 1분간 레코딩
        session_id = recorder.start_recording(duration_minutes=1)
        
        # 레코딩 중 상태 확인
        import time
        for i in range(6):  # 10초마다 확인
            time.sleep(10)
            status = recorder.client.get("/data/recording-status")
            print(f"레코딩 상태: {status['data']['status']} ({i*10}초 경과)")
        
        # 레코딩 중지
        recorder.stop_recording()
        
        # 잠시 대기 후 분석
        time.sleep(2)
        recorder.analyze_session(session_id)
        
    except Exception as e:
        print(f"레코딩 오류: {e}")
        recorder.stop_recording()

if __name__ == "__main__":
    recording_example()
```

## 예제 4: 신호 처리 및 시각화

### EEG 신호 분석

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import signal
import json

class EEGAnalyzer:
    def __init__(self):
        self.client = LinkBandClient()
        self.sampling_rate = 250  # Hz
    
    def load_eeg_data(self, session_id: str):
        """EEG 데이터 로드"""
        session_data = self.client.get(f"/data/sessions/{session_id}")
        
        # 실제 구현에서는 파일에서 데이터를 읽어야 함
        # 여기서는 예시 데이터 생성
        duration = 60  # 60초
        samples = duration * self.sampling_rate
        
        # 예시 EEG 데이터 (실제로는 파일에서 로드)
        t = np.linspace(0, duration, samples)
        ch1 = np.random.normal(0, 100, samples) + 50 * np.sin(2 * np.pi * 10 * t)
        ch2 = np.random.normal(0, 100, samples) + 30 * np.sin(2 * np.pi * 8 * t)
        
        return t, ch1, ch2
    
    def filter_eeg(self, data: np.ndarray, low_freq: float = 1.0, high_freq: float = 50.0):
        """EEG 신호 필터링"""
        # 밴드패스 필터 설계
        nyquist = self.sampling_rate / 2
        low = low_freq / nyquist
        high = high_freq / nyquist
        
        b, a = signal.butter(4, [low, high], btype='band')
        filtered_data = signal.filtfilt(b, a, data)
        
        return filtered_data
    
    def compute_power_spectrum(self, data: np.ndarray):
        """파워 스펙트럼 계산"""
        frequencies, psd = signal.welch(
            data, 
            fs=self.sampling_rate, 
            nperseg=self.sampling_rate * 2
        )
        return frequencies, psd
    
    def analyze_frequency_bands(self, frequencies: np.ndarray, psd: np.ndarray):
        """주파수 대역별 분석"""
        bands = {
            'Delta (0.5-4 Hz)': (0.5, 4),
            'Theta (4-8 Hz)': (4, 8),
            'Alpha (8-13 Hz)': (8, 13),
            'Beta (13-30 Hz)': (13, 30),
            'Gamma (30-50 Hz)': (30, 50)
        }
        
        band_powers = {}
        for band_name, (low, high) in bands.items():
            mask = (frequencies >= low) & (frequencies <= high)
            power = np.trapz(psd[mask], frequencies[mask])
            band_powers[band_name] = power
        
        return band_powers
    
    def plot_analysis(self, t: np.ndarray, ch1: np.ndarray, ch2: np.ndarray):
        """분석 결과 시각화"""
        # 필터링
        ch1_filtered = self.filter_eeg(ch1)
        ch2_filtered = self.filter_eeg(ch2)
        
        # 파워 스펙트럼 계산
        freq1, psd1 = self.compute_power_spectrum(ch1_filtered)
        freq2, psd2 = self.compute_power_spectrum(ch2_filtered)
        
        # 주파수 대역별 분석
        bands1 = self.analyze_frequency_bands(freq1, psd1)
        bands2 = self.analyze_frequency_bands(freq2, psd2)
        
        # 플롯 생성
        fig, axes = plt.subplots(3, 2, figsize=(15, 12))
        
        # 원시 신호
        axes[0, 0].plot(t[:1000], ch1[:1000])
        axes[0, 0].set_title('CH1 Raw Signal (first 4 seconds)')
        axes[0, 0].set_xlabel('Time (s)')
        axes[0, 0].set_ylabel('Amplitude (μV)')
        
        axes[0, 1].plot(t[:1000], ch2[:1000])
        axes[0, 1].set_title('CH2 Raw Signal (first 4 seconds)')
        axes[0, 1].set_xlabel('Time (s)')
        axes[0, 1].set_ylabel('Amplitude (μV)')
        
        # 필터링된 신호
        axes[1, 0].plot(t[:1000], ch1_filtered[:1000])
        axes[1, 0].set_title('CH1 Filtered Signal (1-50 Hz)')
        axes[1, 0].set_xlabel('Time (s)')
        axes[1, 0].set_ylabel('Amplitude (μV)')
        
        axes[1, 1].plot(t[:1000], ch2_filtered[:1000])
        axes[1, 1].set_title('CH2 Filtered Signal (1-50 Hz)')
        axes[1, 1].set_xlabel('Time (s)')
        axes[1, 1].set_ylabel('Amplitude (μV)')
        
        # 파워 스펙트럼
        axes[2, 0].semilogy(freq1, psd1)
        axes[2, 0].set_title('CH1 Power Spectrum')
        axes[2, 0].set_xlabel('Frequency (Hz)')
        axes[2, 0].set_ylabel('PSD (μV²/Hz)')
        axes[2, 0].set_xlim(0, 50)
        
        axes[2, 1].semilogy(freq2, psd2)
        axes[2, 1].set_title('CH2 Power Spectrum')
        axes[2, 1].set_xlabel('Frequency (Hz)')
        axes[2, 1].set_ylabel('PSD (μV²/Hz)')
        axes[2, 1].set_xlim(0, 50)
        
        plt.tight_layout()
        plt.savefig('eeg_analysis.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        # 주파수 대역별 파워 출력
        print("\nCH1 주파수 대역별 파워:")
        for band, power in bands1.items():
            print(f"  {band}: {power:.2f} μV²")
        
        print("\nCH2 주파수 대역별 파워:")
        for band, power in bands2.items():
            print(f"  {band}: {power:.2f} μV²")

def eeg_analysis_example():
    analyzer = EEGAnalyzer()
    
    # 예시 세션 ID (실제로는 레코딩된 세션 사용)
    session_id = "session_20240101_120000"
    
    try:
        # EEG 데이터 로드
        t, ch1, ch2 = analyzer.load_eeg_data(session_id)
        
        # 분석 및 시각화
        analyzer.plot_analysis(t, ch1, ch2)
        
    except Exception as e:
        print(f"EEG 분석 오류: {e}")

if __name__ == "__main__":
    eeg_analysis_example()
```

## 예제 5: 심박수 모니터링

### PPG 신호를 이용한 심박수 계산

```python
import numpy as np
from scipy import signal
import matplotlib.pyplot as plt

class HeartRateMonitor:
    def __init__(self):
        self.client = LinkBandClient()
        self.sampling_rate = 50  # PPG 샘플링 레이트
    
    def detect_peaks(self, ppg_signal: np.ndarray, min_distance: int = 25):
        """PPG 신호에서 피크 검출"""
        # 신호 전처리
        filtered_signal = self.preprocess_ppg(ppg_signal)
        
        # 피크 검출
        peaks, _ = signal.find_peaks(
            filtered_signal,
            distance=min_distance,  # 최소 피크 간격 (1.2초 = 50Hz * 1.2)
            height=np.mean(filtered_signal) + np.std(filtered_signal)
        )
        
        return peaks, filtered_signal
    
    def preprocess_ppg(self, ppg_signal: np.ndarray):
        """PPG 신호 전처리"""
        # 밴드패스 필터 (0.5-8 Hz)
        nyquist = self.sampling_rate / 2
        low = 0.5 / nyquist
        high = 8.0 / nyquist
        
        b, a = signal.butter(4, [low, high], btype='band')
        filtered = signal.filtfilt(b, a, ppg_signal)
        
        return filtered
    
    def calculate_heart_rate(self, peaks: np.ndarray, window_size: int = 10):
        """심박수 계산"""
        if len(peaks) < 2:
            return []
        
        # RR 간격 계산 (초 단위)
        rr_intervals = np.diff(peaks) / self.sampling_rate
        
        # 슬라이딩 윈도우로 심박수 계산
        heart_rates = []
        for i in range(len(rr_intervals) - window_size + 1):
            window_rr = rr_intervals[i:i + window_size]
            avg_rr = np.mean(window_rr)
            hr = 60 / avg_rr  # BPM
            heart_rates.append(hr)
        
        return np.array(heart_rates)
    
    def analyze_hrv(self, peaks: np.ndarray):
        """심박 변이도 분석"""
        if len(peaks) < 10:
            return {}
        
        # RR 간격 계산 (밀리초 단위)
        rr_intervals = np.diff(peaks) / self.sampling_rate * 1000
        
        # HRV 지표 계산
        hrv_metrics = {
            'RMSSD': np.sqrt(np.mean(np.diff(rr_intervals) ** 2)),
            'SDNN': np.std(rr_intervals),
            'Mean_RR': np.mean(rr_intervals),
            'pNN50': np.sum(np.abs(np.diff(rr_intervals)) > 50) / len(rr_intervals) * 100
        }
        
        return hrv_metrics

async def heart_rate_monitoring_example():
    monitor = HeartRateMonitor()
    client = LinkBandClient()
    
    # 실시간 심박수 모니터링
    ws = await client.connect_websocket()
    
    # 스트리밍 시작
    client.post("/stream/start", {})
    
    ppg_buffer = []
    
    try:
        async for message in ws:
            data = json.loads(message)
            
            if data.get('type') == 'raw_data' and data.get('sensor_type') == 'ppg':
                samples = data.get('data', [])
                
                # PPG 데이터 추출 (IR 채널 사용)
                ir_values = [sample.get('ir', 0) for sample in samples]
                ppg_buffer.extend(ir_values)
                
                # 10초간의 데이터가 모이면 분석
                if len(ppg_buffer) >= 500:  # 10초 * 50Hz
                    ppg_signal = np.array(ppg_buffer[-500:])
                    
                    # 피크 검출 및 심박수 계산
                    peaks, filtered_signal = monitor.detect_peaks(ppg_signal)
                    
                    if len(peaks) >= 5:
                        heart_rates = monitor.calculate_heart_rate(peaks)
                        
                        if len(heart_rates) > 0:
                            current_hr = heart_rates[-1]
                            print(f"💓 현재 심박수: {current_hr:.1f} BPM")
                            
                            # HRV 분석
                            hrv_metrics = monitor.analyze_hrv(peaks)
                            if hrv_metrics:
                                print(f"   RMSSD: {hrv_metrics['RMSSD']:.2f}ms")
                                print(f"   SDNN: {hrv_metrics['SDNN']:.2f}ms")
                    
                    # 버퍼 크기 제한
                    if len(ppg_buffer) > 1500:  # 30초치 데이터
                        ppg_buffer = ppg_buffer[-1000:]  # 20초치만 유지
                        
    except KeyboardInterrupt:
        print("심박수 모니터링 중지됨")
    finally:
        client.post("/stream/stop", {})

if __name__ == "__main__":
    asyncio.run(heart_rate_monitoring_example())
```

## 예제 6: 종합 모니터링 대시보드

### 실시간 다중 센서 모니터링

```python
import asyncio
import json
import time
from datetime import datetime
import threading

class MultiSensorDashboard:
    def __init__(self):
        self.client = LinkBandClient()
        self.is_running = False
        self.sensor_data = {
            'eeg': {'ch1': [], 'ch2': [], 'quality': 0},
            'ppg': {'red': [], 'ir': [], 'heart_rate': 0},
            'acc': {'x': [], 'y': [], 'z': [], 'activity': 'still'},
            'battery': {'level': 100, 'voltage': 3.7}
        }
        self.last_update = time.time()
    
    async def start_monitoring(self):
        """모니터링 시작"""
        self.is_running = True
        
        # WebSocket 연결
        ws = await self.client.connect_websocket()
        
        # 스트리밍 시작
        self.client.post("/stream/start", {})
        
        # 상태 출력 스레드 시작
        status_thread = threading.Thread(target=self.print_status_loop)
        status_thread.daemon = True
        status_thread.start()
        
        try:
            async for message in ws:
                data = json.loads(message)
                await self.process_sensor_data(data)
                
        except Exception as e:
            print(f"모니터링 오류: {e}")
        finally:
            self.is_running = False
            self.client.post("/stream/stop", {})
    
    async def process_sensor_data(self, data):
        """센서 데이터 처리"""
        if data.get('type') == 'raw_data':
            sensor_type = data.get('sensor_type')
            samples = data.get('data', [])
            
            if sensor_type == 'eeg':
                await self.process_eeg_samples(samples)
            elif sensor_type == 'ppg':
                await self.process_ppg_samples(samples)
            elif sensor_type == 'acc':
                await self.process_acc_samples(samples)
        
        elif data.get('type') == 'event_type':
            event_type = data.get('event_type')
            if event_type == 'battery_update':
                self.sensor_data['battery'] = data.get('data', {})
    
    async def process_eeg_samples(self, samples):
        """EEG 샘플 처리"""
        for sample in samples:
            ch1 = sample.get('ch1', 0)
            ch2 = sample.get('ch2', 0)
            
            # 버퍼에 추가 (최근 250개 샘플만 유지)
            self.sensor_data['eeg']['ch1'].append(ch1)
            self.sensor_data['eeg']['ch2'].append(ch2)
            
            if len(self.sensor_data['eeg']['ch1']) > 250:
                self.sensor_data['eeg']['ch1'].pop(0)
                self.sensor_data['eeg']['ch2'].pop(0)
            
            # 신호 품질 평가 (간단한 예시)
            if len(self.sensor_data['eeg']['ch1']) >= 100:
                recent_ch1 = self.sensor_data['eeg']['ch1'][-100:]
                std_ch1 = np.std(recent_ch1)
                
                if std_ch1 < 50:
                    quality = 'Poor'
                elif std_ch1 < 200:
                    quality = 'Good'
                else:
                    quality = 'Excellent'
                
                self.sensor_data['eeg']['quality'] = quality
    
    async def process_ppg_samples(self, samples):
        """PPG 샘플 처리"""
        for sample in samples:
            red = sample.get('red', 0)
            ir = sample.get('ir', 0)
            
            # 버퍼에 추가 (최근 100개 샘플만 유지)
            self.sensor_data['ppg']['red'].append(red)
            self.sensor_data['ppg']['ir'].append(ir)
            
            if len(self.sensor_data['ppg']['ir']) > 100:
                self.sensor_data['ppg']['red'].pop(0)
                self.sensor_data['ppg']['ir'].pop(0)
            
            # 간단한 심박수 추정
            if len(self.sensor_data['ppg']['ir']) >= 50:
                # 실제로는 더 정교한 알고리즘 필요
                ir_signal = np.array(self.sensor_data['ppg']['ir'][-50:])
                if np.std(ir_signal) > 1000:  # 신호가 있는 경우
                    estimated_hr = 70 + np.random.randint(-10, 10)  # 예시
                    self.sensor_data['ppg']['heart_rate'] = estimated_hr
    
    async def process_acc_samples(self, samples):
        """가속도계 샘플 처리"""
        for sample in samples:
            x = sample.get('x', 0)
            y = sample.get('y', 0)
            z = sample.get('z', 0)
            
            # 버퍼에 추가 (최근 25개 샘플만 유지)
            self.sensor_data['acc']['x'].append(x)
            self.sensor_data['acc']['y'].append(y)
            self.sensor_data['acc']['z'].append(z)
            
            if len(self.sensor_data['acc']['x']) > 25:
                self.sensor_data['acc']['x'].pop(0)
                self.sensor_data['acc']['y'].pop(0)
                self.sensor_data['acc']['z'].pop(0)
            
            # 활동 상태 감지
            if len(self.sensor_data['acc']['x']) >= 10:
                recent_acc = np.array([
                    self.sensor_data['acc']['x'][-10:],
                    self.sensor_data['acc']['y'][-10:],
                    self.sensor_data['acc']['z'][-10:]
                ])
                
                magnitude = np.sqrt(np.sum(recent_acc**2, axis=0))
                activity_level = np.std(magnitude)
                
                if activity_level < 1000:
                    activity = 'Still'
                elif activity_level < 5000:
                    activity = 'Light Movement'
                else:
                    activity = 'Active Movement'
                
                self.sensor_data['acc']['activity'] = activity
    
    def print_status_loop(self):
        """상태 출력 루프"""
        while self.is_running:
            self.print_status()
            time.sleep(2)  # 2초마다 업데이트
    
    def print_status(self):
        """현재 상태 출력"""
        print("\n" + "="*60)
        print(f"Link Band 실시간 모니터링 - {datetime.now().strftime('%H:%M:%S')}")
        print("="*60)
        
        # EEG 상태
        eeg_samples = len(self.sensor_data['eeg']['ch1'])
        eeg_quality = self.sensor_data['eeg']['quality']
        print(f"🧠 EEG: {eeg_samples}개 샘플, 품질: {eeg_quality}")
        
        # PPG 상태
        ppg_samples = len(self.sensor_data['ppg']['ir'])
        heart_rate = self.sensor_data['ppg']['heart_rate']
        print(f"💓 PPG: {ppg_samples}개 샘플, 심박수: {heart_rate} BPM")
        
        # 가속도계 상태
        acc_samples = len(self.sensor_data['acc']['x'])
        activity = self.sensor_data['acc']['activity']
        print(f"🏃 ACC: {acc_samples}개 샘플, 활동: {activity}")
        
        # 배터리 상태
        battery_level = self.sensor_data['battery']['level']
        battery_voltage = self.sensor_data['battery'].get('voltage', 0)
        print(f"🔋 배터리: {battery_level}%, {battery_voltage:.2f}V")
        
        # 데이터 수신율
        current_time = time.time()
        time_diff = current_time - self.last_update
        self.last_update = current_time
        
        print(f"📊 업데이트 간격: {time_diff:.2f}초")

async def dashboard_example():
    dashboard = MultiSensorDashboard()
    
    try:
        print("Link Band 종합 모니터링 대시보드 시작...")
        print("Ctrl+C로 중지할 수 있습니다.")
        
        await dashboard.start_monitoring()
        
    except KeyboardInterrupt:
        print("\n모니터링 중지됨")

if __name__ == "__main__":
    asyncio.run(dashboard_example())
```

## 유틸리티 함수

### 공통 유틸리티

```python
import os
import json
from datetime import datetime
from typing import Dict, Any, List

class LinkBandUtils:
    @staticmethod
    def save_data_to_file(data: Dict[str, Any], filename: str):
        """데이터를 JSON 파일로 저장"""
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"데이터 저장됨: {filename}")
    
    @staticmethod
    def load_data_from_file(filename: str) -> Dict[str, Any]:
        """JSON 파일에서 데이터 로드"""
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    @staticmethod
    def format_timestamp(timestamp: float) -> str:
        """타임스탬프를 읽기 쉬운 형식으로 변환"""
        return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
    
    @staticmethod
    def calculate_data_rate(sample_count: int, duration: float) -> float:
        """데이터 전송률 계산 (samples/second)"""
        if duration > 0:
            return sample_count / duration
        return 0
    
    @staticmethod
    def check_server_health() -> bool:
        """서버 상태 확인"""
        try:
            client = LinkBandClient()
            response = client.get("/health")
            return response.get('status') == 'healthy'
        except:
            return False

# 사용 예제
if __name__ == "__main__":
    # 서버 상태 확인
    if LinkBandUtils.check_server_health():
        print(" Link Band 서버가 정상적으로 실행 중입니다.")
    else:
        print(" Link Band 서버에 연결할 수 없습니다.")
```

## 참고사항

1. 모든 예제는 Link Band SDK 서버가 `localhost:8121`에서 실행 중이어야 합니다.
2. 실제 디바이스 연결 없이도 시뮬레이션 모드로 테스트할 수 있습니다.
3. 대용량 데이터 처리 시 메모리 사용량을 주의하세요.
4. WebSocket 연결은 네트워크 상태에 따라 불안정할 수 있으므로 재연결 로직을 구현하는 것이 좋습니다.
5. 신호 처리 알고리즘은 실제 사용 환경에 맞게 조정이 필요할 수 있습니다. 