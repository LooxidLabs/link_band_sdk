# Python 고급 통합 가이드

이 가이드는 Link Band SDK의 고급 Python 통합 패턴을 다룹니다. asyncio, 실시간 데이터 처리, 머신러닝 애플리케이션을 포함합니다.

## 목차

1. [비동기 통합](#비동기-통합)
2. [데이터 처리 파이프라인](#데이터-처리-파이프라인)
3. [머신러닝 통합](#머신러닝-통합)
4. [실시간 시각화](#실시간-시각화)
5. [완전한 예제](#완전한-예제)

## 비동기 통합

### 비동기 Link Band 클라이언트

```python
import asyncio
import aiohttp
import websockets
import json
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass
from datetime import datetime

@dataclass
class StreamData:
    timestamp: float
    eeg: Optional[list] = None
    ppg: Optional[list] = None
    acc: Optional[Dict[str, float]] = None
    battery: Optional[float] = None

class AsyncLinkBandClient:
    def __init__(self, api_url: str = "http://localhost:8121", 
                 ws_url: str = "ws://localhost:18765"):
        self.api_url = api_url
        self.ws_url = ws_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.data_callback: Optional[Callable] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
        if self.websocket:
            await self.websocket.close()
    
    async def scan_devices(self) -> list:
        """디바이스 스캔"""
        async with self.session.get(f"{self.api_url}/device/scan") as response:
            data = await response.json()
            return data.get('devices', [])
    
    async def connect_device(self, address: str) -> bool:
        """디바이스 연결"""
        async with self.session.post(f"{self.api_url}/device/connect", 
                                   json={"address": address}) as response:
            return response.status == 200
    
    async def start_streaming(self) -> bool:
        """스트리밍 시작"""
        await self.session.post(f"{self.api_url}/stream/init")
        async with self.session.post(f"{self.api_url}/stream/start") as response:
            return response.status == 200
    
    async def connect_websocket(self, data_callback: Callable[[StreamData], None]):
        """WebSocket 연결 및 데이터 수신"""
        self.data_callback = data_callback
        try:
            self.websocket = await websockets.connect(self.ws_url)
            await self._listen_websocket()
        except Exception as e:
            print(f"WebSocket 연결 실패: {e}")
    
    async def _listen_websocket(self):
        """WebSocket 메시지 수신"""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                stream_data = StreamData(
                    timestamp=data.get('timestamp', datetime.now().timestamp()),
                    eeg=data.get('eeg'),
                    ppg=data.get('ppg'),
                    acc=data.get('acc'),
                    battery=data.get('battery')
                )
                if self.data_callback:
                    await self.data_callback(stream_data)
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket 연결이 종료되었습니다")
```

이 고급 Python 통합 가이드는 비동기 처리, 머신러닝, 실시간 시각화 기능을 갖춘 정교한 Link Band SDK 애플리케이션 구축을 위한 포괄적인 예제를 제공합니다.

## 데이터 처리 파이프라인

### 실시간 신호 처리

```python
import numpy as np
from scipy import signal
from collections import deque
import asyncio

class SignalProcessor:
    def __init__(self, sampling_rate: int = 250, buffer_size: int = 1000):
        self.sampling_rate = sampling_rate
        self.buffer_size = buffer_size
        
        # 각 신호 타입별 버퍼
        self.eeg_buffer = deque(maxlen=buffer_size)
        self.ppg_buffer = deque(maxlen=buffer_size)
        self.acc_buffer = deque(maxlen=buffer_size)
        
        # 필터 계수
        self.eeg_filter = self._create_bandpass_filter(1, 50)
        self.ppg_filter = self._create_bandpass_filter(0.5, 8)
        
    def _create_bandpass_filter(self, low_freq: float, high_freq: float):
        """밴드패스 필터 생성"""
        nyquist = self.sampling_rate / 2
        low = low_freq / nyquist
        high = high_freq / nyquist
        return signal.butter(4, [low, high], btype='band')
    
    async def process_data(self, stream_data: StreamData) -> Dict[str, Any]:
        """스트림 데이터 처리"""
        processed = {
            'timestamp': stream_data.timestamp,
            'eeg': None,
            'ppg': None,
            'acc': None
        }
        
        if stream_data.eeg:
            processed['eeg'] = await self._process_eeg(stream_data.eeg)
        
        if stream_data.ppg:
            processed['ppg'] = await self._process_ppg(stream_data.ppg)
            
        if stream_data.acc:
            processed['acc'] = await self._process_acc(stream_data.acc)
            
        return processed
    
    async def _process_eeg(self, eeg_data: list) -> Dict[str, Any]:
        """EEG 데이터 처리"""
        # 버퍼에 추가
        self.eeg_buffer.extend(eeg_data)
        
        if len(self.eeg_buffer) < 100:  # 최소 데이터 필요
            return {'raw': eeg_data, 'filtered': eeg_data}
        
        # numpy 배열로 변환
        data_array = np.array(list(self.eeg_buffer))
        
        # 밴드패스 필터 적용
        filtered = signal.filtfilt(self.eeg_filter[0], self.eeg_filter[1], data_array)
        
        # 주파수 대역 계산
        bands = await self._calculate_frequency_bands(filtered[-len(eeg_data):])
        
        return {
            'raw': eeg_data,
            'filtered': filtered[-len(eeg_data):].tolist(),
            'bands': bands,
            'quality': self._calculate_signal_quality(eeg_data)
        }
    
    async def _process_ppg(self, ppg_data: list) -> Dict[str, Any]:
        """PPG 데이터 처리"""
        self.ppg_buffer.extend(ppg_data)
        
        if len(self.ppg_buffer) < 50:
            return {'raw': ppg_data}
        
        data_array = np.array(list(self.ppg_buffer))
        filtered = signal.filtfilt(self.ppg_filter[0], self.ppg_filter[1], data_array)
        
        # 심박수 계산
        heart_rate = await self._calculate_heart_rate(filtered)
        
        return {
            'raw': ppg_data,
            'filtered': filtered[-len(ppg_data):].tolist(),
            'heart_rate': heart_rate,
            'quality': self._calculate_signal_quality(ppg_data)
        }
    
    async def _process_acc(self, acc_data: Dict[str, float]) -> Dict[str, Any]:
        """가속도계 데이터 처리"""
        magnitude = np.sqrt(acc_data['x']**2 + acc_data['y']**2 + acc_data['z']**2)
        self.acc_buffer.append(magnitude)
        
        # 활동 수준 계산
        activity_level = await self._classify_activity(magnitude)
        
        return {
            'raw': acc_data,
            'magnitude': magnitude,
            'activity': activity_level
        }
    
    async def _calculate_frequency_bands(self, data: np.ndarray) -> Dict[str, float]:
        """주파수 대역 분석 (FFT 기반)"""
        fft = np.fft.fft(data)
        freqs = np.fft.fftfreq(len(data), 1/self.sampling_rate)
        power = np.abs(fft)**2
        
        # 주파수 대역 정의
        delta = np.mean(power[(freqs >= 1) & (freqs <= 4)])
        theta = np.mean(power[(freqs >= 4) & (freqs <= 8)])
        alpha = np.mean(power[(freqs >= 8) & (freqs <= 13)])
        beta = np.mean(power[(freqs >= 13) & (freqs <= 30)])
        
        return {
            'delta': float(delta),
            'theta': float(theta),
            'alpha': float(alpha),
            'beta': float(beta)
        }
    
    async def _calculate_heart_rate(self, ppg_data: np.ndarray) -> float:
        """심박수 계산 (피크 검출)"""
        peaks, _ = signal.find_peaks(ppg_data, distance=30)
        if len(peaks) < 2:
            return 0.0
        
        # 간격 계산 및 심박수 산출
        intervals = np.diff(peaks) / self.sampling_rate
        heart_rate = 60.0 / np.mean(intervals) if len(intervals) > 0 else 0.0
        return heart_rate
    
    async def _classify_activity(self, magnitude: float) -> str:
        """활동 수준 분류"""
        if magnitude < 1.1:
            return 'rest'      # 휴식
        elif magnitude < 1.5:
            return 'light'     # 가벼운 활동
        elif magnitude < 2.0:
            return 'moderate'  # 보통 활동
        else:
            return 'vigorous'  # 격한 활동
    
    def _calculate_signal_quality(self, data: list) -> float:
        """신호 품질 계산"""
        if not data:
            return 0.0
        
        # 신호 분산을 기반으로 한 간단한 품질 메트릭
        variance = np.var(data)
        quality = max(0, min(100, 100 - variance * 10))
        return quality
```

## 머신러닝 통합

### EEG 상태 분류

```python
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib

class EEGStateClassifier:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def extract_features(self, eeg_data: Dict[str, Any]) -> np.ndarray:
        """처리된 EEG 데이터에서 특징 추출"""
        features = []
        
        if 'bands' in eeg_data:
            bands = eeg_data['bands']
            features.extend([
                bands['delta'],
                bands['theta'],
                bands['alpha'],
                bands['beta'],
                bands['alpha'] / bands['beta'] if bands['beta'] > 0 else 0,  # Alpha/Beta 비율
                bands['theta'] / bands['alpha'] if bands['alpha'] > 0 else 0  # Theta/Alpha 비율
            ])
        
        if 'filtered' in eeg_data:
            filtered_data = np.array(eeg_data['filtered'])
            features.extend([
                np.mean(filtered_data),  # 평균
                np.std(filtered_data),   # 표준편차
                np.max(filtered_data),   # 최대값
                np.min(filtered_data)    # 최소값
            ])
        
        return np.array(features)
    
    def train(self, training_data: list, labels: list):
        """라벨링된 데이터로 분류기 훈련"""
        features = []
        for data in training_data:
            feature_vector = self.extract_features(data)
            features.append(feature_vector)
        
        X = np.array(features)
        y = np.array(labels)
        
        # 데이터 분할
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        
        # 특징 스케일링
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # 모델 훈련
        self.model.fit(X_train_scaled, y_train)
        
        # 평가
        accuracy = self.model.score(X_test_scaled, y_test)
        print(f"모델 정확도: {accuracy:.2f}")
        
        self.is_trained = True
    
    def predict(self, eeg_data: Dict[str, Any]) -> Dict[str, Any]:
        """EEG 데이터로부터 정신 상태 예측"""
        if not self.is_trained:
            return {'state': 'unknown', 'confidence': 0.0}
        
        features = self.extract_features(eeg_data).reshape(1, -1)
        features_scaled = self.scaler.transform(features)
        
        prediction = self.model.predict(features_scaled)[0]
        probabilities = self.model.predict_proba(features_scaled)[0]
        confidence = np.max(probabilities)
        
        return {
            'state': prediction,
            'confidence': float(confidence),
            'probabilities': {
                class_name: float(prob) 
                for class_name, prob in zip(self.model.classes_, probabilities)
            }
        }
    
    def save_model(self, filepath: str):
        """훈련된 모델 저장"""
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'is_trained': self.is_trained
        }, filepath)
    
    def load_model(self, filepath: str):
        """훈련된 모델 로드"""
        data = joblib.load(filepath)
        self.model = data['model']
        self.scaler = data['scaler']
        self.is_trained = data['is_trained']
```

## 실시간 시각화

### 실시간 데이터 대시보드

```python
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.widgets import Button
import numpy as np
from collections import deque
import threading

class LiveDataDashboard:
    def __init__(self, max_points: int = 1000):
        self.max_points = max_points
        self.eeg_data = deque(maxlen=max_points)
        self.ppg_data = deque(maxlen=max_points)
        self.timestamps = deque(maxlen=max_points)
        
        # 플롯 설정
        self.fig, self.axes = plt.subplots(3, 2, figsize=(15, 10))
        self.fig.suptitle('Link Band 실시간 데이터 대시보드')
        
        # EEG 플롯
        self.eeg_line, = self.axes[0, 0].plot([], [], 'b-')
        self.axes[0, 0].set_title('EEG 신호')
        self.axes[0, 0].set_ylabel('진폭')
        
        # PPG 플롯
        self.ppg_line, = self.axes[0, 1].plot([], [], 'r-')
        self.axes[0, 1].set_title('PPG 신호')
        self.axes[0, 1].set_ylabel('진폭')
        
        # 주파수 대역
        self.band_bars = self.axes[1, 0].bar(['Delta', 'Theta', 'Alpha', 'Beta'], 
                                           [0, 0, 0, 0], color=['red', 'orange', 'green', 'blue'])
        self.axes[1, 0].set_title('EEG 주파수 대역')
        self.axes[1, 0].set_ylabel('파워')
        
        # 심박수
        self.hr_text = self.axes[1, 1].text(0.5, 0.5, '0 BPM', 
                                          transform=self.axes[1, 1].transAxes,
                                          fontsize=20, ha='center')
        self.axes[1, 1].set_title('심박수')
        self.axes[1, 1].set_xlim(0, 1)
        self.axes[1, 1].set_ylim(0, 1)
        
        # 활동 수준
        self.activity_text = self.axes[2, 0].text(0.5, 0.5, '휴식', 
                                                transform=self.axes[2, 0].transAxes,
                                                fontsize=16, ha='center')
        self.axes[2, 0].set_title('활동 수준')
        self.axes[2, 0].set_xlim(0, 1)
        self.axes[2, 0].set_ylim(0, 1)
        
        # 정신 상태
        self.state_text = self.axes[2, 1].text(0.5, 0.5, '알 수 없음', 
                                             transform=self.axes[2, 1].transAxes,
                                             fontsize=16, ha='center')
        self.axes[2, 1].set_title('정신 상태')
        self.axes[2, 1].set_xlim(0, 1)
        self.axes[2, 1].set_ylim(0, 1)
        
        # 애니메이션
        self.animation = animation.FuncAnimation(self.fig, self._update_plots, 
                                               interval=100, blit=False)
        
        # 현재 데이터 저장소
        self.current_data = {}
        self.lock = threading.Lock()
    
    def update_data(self, processed_data: Dict[str, Any]):
        """새로운 처리된 데이터로 대시보드 업데이트"""
        with self.lock:
            self.current_data = processed_data.copy()
            
            # 시계열에 추가
            timestamp = processed_data.get('timestamp', 0)
            self.timestamps.append(timestamp)
            
            if processed_data.get('eeg') and processed_data['eeg'].get('filtered'):
                eeg_value = np.mean(processed_data['eeg']['filtered'])
                self.eeg_data.append(eeg_value)
            else:
                self.eeg_data.append(0)
            
            if processed_data.get('ppg') and processed_data['ppg'].get('filtered'):
                ppg_value = np.mean(processed_data['ppg']['filtered'])
                self.ppg_data.append(ppg_value)
            else:
                self.ppg_data.append(0)
    
    def _update_plots(self, frame):
        """현재 데이터로 모든 플롯 업데이트"""
        with self.lock:
            data = self.current_data.copy()
        
        if not data:
            return
        
        # 시계열 플롯 업데이트
        if len(self.timestamps) > 1:
            times = list(self.timestamps)
            
            # EEG 플롯
            self.eeg_line.set_data(times, list(self.eeg_data))
            self.axes[0, 0].relim()
            self.axes[0, 0].autoscale_view()
            
            # PPG 플롯
            self.ppg_line.set_data(times, list(self.ppg_data))
            self.axes[0, 1].relim()
            self.axes[0, 1].autoscale_view()
        
        # 주파수 대역 업데이트
        if data.get('eeg') and data['eeg'].get('bands'):
            bands = data['eeg']['bands']
            band_values = [bands['delta'], bands['theta'], bands['alpha'], bands['beta']]
            for bar, value in zip(self.band_bars, band_values):
                bar.set_height(value)
        
        # 심박수 업데이트
        if data.get('ppg') and data['ppg'].get('heart_rate'):
            hr = data['ppg']['heart_rate']
            self.hr_text.set_text(f'{hr:.0f} BPM')
        
        # 활동 수준 업데이트
        if data.get('acc') and data['acc'].get('activity'):
            activity_map = {
                'rest': '휴식',
                'light': '가벼운 활동',
                'moderate': '보통 활동',
                'vigorous': '격한 활동'
            }
            activity = activity_map.get(data['acc']['activity'], '알 수 없음')
            self.activity_text.set_text(activity)
        
        # 정신 상태 업데이트 (사용 가능한 경우)
        if 'mental_state' in data:
            state = data['mental_state']['state']
            confidence = data['mental_state']['confidence']
            self.state_text.set_text(f'{state}\n({confidence:.1%})')
    
    def show(self):
        """대시보드 표시"""
        plt.tight_layout()
        plt.show()
```

## 완전한 예제

### 전체 애플리케이션

```python
import asyncio
import logging
from datetime import datetime

class LinkBandApplication:
    def __init__(self):
        self.client = AsyncLinkBandClient()
        self.processor = SignalProcessor()
        self.classifier = EEGStateClassifier()
        self.dashboard = LiveDataDashboard()
        
        # 사전 훈련된 모델이 있다면 로드
        try:
            self.classifier.load_model('eeg_model.pkl')
            print("사전 훈련된 EEG 모델을 로드했습니다")
        except:
            print("사전 훈련된 모델을 찾을 수 없습니다")
        
        self.is_running = False
        
    async def data_callback(self, stream_data: StreamData):
        """들어오는 스트림 데이터 처리"""
        try:
            # 데이터 처리
            processed = await self.processor.process_data(stream_data)
            
            # 모델이 훈련되어 있다면 ML 예측 추가
            if processed.get('eeg') and self.classifier.is_trained:
                prediction = self.classifier.predict(processed['eeg'])
                processed['mental_state'] = prediction
            
            # 대시보드 업데이트
            self.dashboard.update_data(processed)
            
            # 데이터 품질 로그
            if processed.get('eeg'):
                quality = processed['eeg'].get('quality', 0)
                if quality < 50:
                    logging.warning(f"낮은 EEG 신호 품질: {quality:.1f}")
            
        except Exception as e:
            logging.error(f"데이터 처리 오류: {e}")
    
    async def start(self):
        """애플리케이션 시작"""
        try:
            async with self.client:
                print("디바이스 스캔 중...")
                devices = await self.client.scan_devices()
                
                if not devices:
                    print("디바이스를 찾을 수 없습니다")
                    return
                
                print(f"{len(devices)}개의 디바이스를 찾았습니다")
                device = devices[0]
                
                print(f"{device['name']}에 연결 중...")
                if not await self.client.connect_device(device['address']):
                    print("연결에 실패했습니다")
                    return
                
                print("데이터 스트림 시작 중...")
                if not await self.client.start_streaming():
                    print("스트리밍 시작에 실패했습니다")
                    return
                
                self.is_running = True
                print("애플리케이션이 성공적으로 시작되었습니다")
                
                # WebSocket 연결 및 대시보드 시작
                await asyncio.gather(
                    self.client.connect_websocket(self.data_callback),
                    self._run_dashboard()
                )
                
        except Exception as e:
            logging.error(f"애플리케이션 오류: {e}")
        finally:
            self.is_running = False
    
    async def _run_dashboard(self):
        """별도 스레드에서 대시보드 실행"""
        import threading
        
        def show_dashboard():
            self.dashboard.show()
        
        dashboard_thread = threading.Thread(target=show_dashboard)
        dashboard_thread.daemon = True
        dashboard_thread.start()
        
        # async 루프 유지
        while self.is_running:
            await asyncio.sleep(1)

# 사용법
async def main():
    logging.basicConfig(level=logging.INFO)
    app = LinkBandApplication()
    await app.start()

if __name__ == "__main__":
    asyncio.run(main())
```

이 고급 Python 통합 가이드는 비동기 처리, 머신러닝, 실시간 시각화 기능을 갖춘 정교한 Link Band SDK 애플리케이션 구축을 위한 포괄적인 예제를 제공합니다.
