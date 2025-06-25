# Advanced Python Integration Guide

This guide demonstrates advanced Python integration patterns for the Link Band SDK, including asyncio, real-time data processing, and machine learning applications.

## Table of Contents

1. [Async Integration](#async-integration)
2. [Data Processing Pipeline](#data-processing-pipeline)
3. [Machine Learning Integration](#machine-learning-integration)
4. [Real-time Visualization](#real-time-visualization)
5. [Complete Example](#complete-example)

## Async Integration

### Async Link Band Client

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
        async with self.session.get(f"{self.api_url}/device/scan") as response:
            data = await response.json()
            return data.get('devices', [])
    
    async def connect_device(self, address: str) -> bool:
        async with self.session.post(f"{self.api_url}/device/connect", 
                                   json={"address": address}) as response:
            return response.status == 200
    
    async def start_streaming(self) -> bool:
        await self.session.post(f"{self.api_url}/stream/init")
        async with self.session.post(f"{self.api_url}/stream/start") as response:
            return response.status == 200
    
    async def connect_websocket(self, data_callback: Callable[[StreamData], None]):
        self.data_callback = data_callback
        try:
            self.websocket = await websockets.connect(self.ws_url)
            await self._listen_websocket()
        except Exception as e:
            print(f"WebSocket connection failed: {e}")
    
    async def _listen_websocket(self):
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
            print("WebSocket connection closed")
```

## Data Processing Pipeline

### Real-time Signal Processing

```python
import numpy as np
from scipy import signal
from collections import deque
import asyncio

class SignalProcessor:
    def __init__(self, sampling_rate: int = 250, buffer_size: int = 1000):
        self.sampling_rate = sampling_rate
        self.buffer_size = buffer_size
        
        # Buffers for different signal types
        self.eeg_buffer = deque(maxlen=buffer_size)
        self.ppg_buffer = deque(maxlen=buffer_size)
        self.acc_buffer = deque(maxlen=buffer_size)
        
        # Filter coefficients
        self.eeg_filter = self._create_bandpass_filter(1, 50)
        self.ppg_filter = self._create_bandpass_filter(0.5, 8)
        
    def _create_bandpass_filter(self, low_freq: float, high_freq: float):
        nyquist = self.sampling_rate / 2
        low = low_freq / nyquist
        high = high_freq / nyquist
        return signal.butter(4, [low, high], btype='band')
    
    async def process_data(self, stream_data: StreamData) -> Dict[str, Any]:
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
        # Add to buffer
        self.eeg_buffer.extend(eeg_data)
        
        if len(self.eeg_buffer) < 100:  # Need minimum data
            return {'raw': eeg_data, 'filtered': eeg_data}
        
        # Convert to numpy array
        data_array = np.array(list(self.eeg_buffer))
        
        # Apply bandpass filter
        filtered = signal.filtfilt(self.eeg_filter[0], self.eeg_filter[1], data_array)
        
        # Calculate frequency bands
        bands = await self._calculate_frequency_bands(filtered[-len(eeg_data):])
        
        return {
            'raw': eeg_data,
            'filtered': filtered[-len(eeg_data):].tolist(),
            'bands': bands,
            'quality': self._calculate_signal_quality(eeg_data)
        }
    
    async def _process_ppg(self, ppg_data: list) -> Dict[str, Any]:
        self.ppg_buffer.extend(ppg_data)
        
        if len(self.ppg_buffer) < 50:
            return {'raw': ppg_data}
        
        data_array = np.array(list(self.ppg_buffer))
        filtered = signal.filtfilt(self.ppg_filter[0], self.ppg_filter[1], data_array)
        
        # Heart rate calculation
        heart_rate = await self._calculate_heart_rate(filtered)
        
        return {
            'raw': ppg_data,
            'filtered': filtered[-len(ppg_data):].tolist(),
            'heart_rate': heart_rate,
            'quality': self._calculate_signal_quality(ppg_data)
        }
    
    async def _process_acc(self, acc_data: Dict[str, float]) -> Dict[str, Any]:
        magnitude = np.sqrt(acc_data['x']**2 + acc_data['y']**2 + acc_data['z']**2)
        self.acc_buffer.append(magnitude)
        
        # Calculate activity level
        activity_level = await self._classify_activity(magnitude)
        
        return {
            'raw': acc_data,
            'magnitude': magnitude,
            'activity': activity_level
        }
    
    async def _calculate_frequency_bands(self, data: np.ndarray) -> Dict[str, float]:
        # FFT-based frequency band analysis
        fft = np.fft.fft(data)
        freqs = np.fft.fftfreq(len(data), 1/self.sampling_rate)
        power = np.abs(fft)**2
        
        # Define frequency bands
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
        # Peak detection for heart rate
        peaks, _ = signal.find_peaks(ppg_data, distance=30)
        if len(peaks) < 2:
            return 0.0
        
        # Calculate intervals and heart rate
        intervals = np.diff(peaks) / self.sampling_rate
        heart_rate = 60.0 / np.mean(intervals) if len(intervals) > 0 else 0.0
        return heart_rate
    
    async def _classify_activity(self, magnitude: float) -> str:
        if magnitude < 1.1:
            return 'rest'
        elif magnitude < 1.5:
            return 'light'
        elif magnitude < 2.0:
            return 'moderate'
        else:
            return 'vigorous'
    
    def _calculate_signal_quality(self, data: list) -> float:
        if not data:
            return 0.0
        
        # Simple quality metric based on signal variance
        variance = np.var(data)
        quality = max(0, min(100, 100 - variance * 10))
        return quality
```

## Machine Learning Integration

### EEG State Classification

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
        """Extract features from processed EEG data"""
        features = []
        
        if 'bands' in eeg_data:
            bands = eeg_data['bands']
            features.extend([
                bands['delta'],
                bands['theta'],
                bands['alpha'],
                bands['beta'],
                bands['alpha'] / bands['beta'] if bands['beta'] > 0 else 0,  # Alpha/Beta ratio
                bands['theta'] / bands['alpha'] if bands['alpha'] > 0 else 0  # Theta/Alpha ratio
            ])
        
        if 'filtered' in eeg_data:
            filtered_data = np.array(eeg_data['filtered'])
            features.extend([
                np.mean(filtered_data),
                np.std(filtered_data),
                np.max(filtered_data),
                np.min(filtered_data)
            ])
        
        return np.array(features)
    
    def train(self, training_data: list, labels: list):
        """Train the classifier with labeled data"""
        features = []
        for data in training_data:
            feature_vector = self.extract_features(data)
            features.append(feature_vector)
        
        X = np.array(features)
        y = np.array(labels)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        accuracy = self.model.score(X_test_scaled, y_test)
        print(f"Model accuracy: {accuracy:.2f}")
        
        self.is_trained = True
    
    def predict(self, eeg_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict mental state from EEG data"""
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
        """Save trained model"""
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'is_trained': self.is_trained
        }, filepath)
    
    def load_model(self, filepath: str):
        """Load trained model"""
        data = joblib.load(filepath)
        self.model = data['model']
        self.scaler = data['scaler']
        self.is_trained = data['is_trained']
```

## Real-time Visualization

### Live Data Dashboard

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
        
        # Setup the plot
        self.fig, self.axes = plt.subplots(3, 2, figsize=(15, 10))
        self.fig.suptitle('Link Band Real-time Data Dashboard')
        
        # EEG plot
        self.eeg_line, = self.axes[0, 0].plot([], [], 'b-')
        self.axes[0, 0].set_title('EEG Signal')
        self.axes[0, 0].set_ylabel('Amplitude')
        
        # PPG plot
        self.ppg_line, = self.axes[0, 1].plot([], [], 'r-')
        self.axes[0, 1].set_title('PPG Signal')
        self.axes[0, 1].set_ylabel('Amplitude')
        
        # Frequency bands
        self.band_bars = self.axes[1, 0].bar(['Delta', 'Theta', 'Alpha', 'Beta'], 
                                           [0, 0, 0, 0], color=['red', 'orange', 'green', 'blue'])
        self.axes[1, 0].set_title('EEG Frequency Bands')
        self.axes[1, 0].set_ylabel('Power')
        
        # Heart rate
        self.hr_text = self.axes[1, 1].text(0.5, 0.5, '0 BPM', 
                                          transform=self.axes[1, 1].transAxes,
                                          fontsize=20, ha='center')
        self.axes[1, 1].set_title('Heart Rate')
        self.axes[1, 1].set_xlim(0, 1)
        self.axes[1, 1].set_ylim(0, 1)
        
        # Activity level
        self.activity_text = self.axes[2, 0].text(0.5, 0.5, 'Rest', 
                                                transform=self.axes[2, 0].transAxes,
                                                fontsize=16, ha='center')
        self.axes[2, 0].set_title('Activity Level')
        self.axes[2, 0].set_xlim(0, 1)
        self.axes[2, 0].set_ylim(0, 1)
        
        # Mental state
        self.state_text = self.axes[2, 1].text(0.5, 0.5, 'Unknown', 
                                             transform=self.axes[2, 1].transAxes,
                                             fontsize=16, ha='center')
        self.axes[2, 1].set_title('Mental State')
        self.axes[2, 1].set_xlim(0, 1)
        self.axes[2, 1].set_ylim(0, 1)
        
        # Animation
        self.animation = animation.FuncAnimation(self.fig, self._update_plots, 
                                               interval=100, blit=False)
        
        # Current data storage
        self.current_data = {}
        self.lock = threading.Lock()
    
    def update_data(self, processed_data: Dict[str, Any]):
        """Update dashboard with new processed data"""
        with self.lock:
            self.current_data = processed_data.copy()
            
            # Add to time series
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
        """Update all plots with current data"""
        with self.lock:
            data = self.current_data.copy()
        
        if not data:
            return
        
        # Update time series plots
        if len(self.timestamps) > 1:
            times = list(self.timestamps)
            
            # EEG plot
            self.eeg_line.set_data(times, list(self.eeg_data))
            self.axes[0, 0].relim()
            self.axes[0, 0].autoscale_view()
            
            # PPG plot
            self.ppg_line.set_data(times, list(self.ppg_data))
            self.axes[0, 1].relim()
            self.axes[0, 1].autoscale_view()
        
        # Update frequency bands
        if data.get('eeg') and data['eeg'].get('bands'):
            bands = data['eeg']['bands']
            band_values = [bands['delta'], bands['theta'], bands['alpha'], bands['beta']]
            for bar, value in zip(self.band_bars, band_values):
                bar.set_height(value)
        
        # Update heart rate
        if data.get('ppg') and data['ppg'].get('heart_rate'):
            hr = data['ppg']['heart_rate']
            self.hr_text.set_text(f'{hr:.0f} BPM')
        
        # Update activity level
        if data.get('acc') and data['acc'].get('activity'):
            activity = data['acc']['activity'].title()
            self.activity_text.set_text(activity)
        
        # Update mental state (if available)
        if 'mental_state' in data:
            state = data['mental_state']['state']
            confidence = data['mental_state']['confidence']
            self.state_text.set_text(f'{state}\n({confidence:.1%})')
    
    def show(self):
        """Display the dashboard"""
        plt.tight_layout()
        plt.show()
```

## Complete Example

### Full Application

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
        
        # Load pre-trained model if available
        try:
            self.classifier.load_model('eeg_model.pkl')
            print("Loaded pre-trained EEG model")
        except:
            print("No pre-trained model found")
        
        self.is_running = False
        
    async def data_callback(self, stream_data: StreamData):
        """Process incoming stream data"""
        try:
            # Process the data
            processed = await self.processor.process_data(stream_data)
            
            # Add ML prediction if model is trained
            if processed.get('eeg') and self.classifier.is_trained:
                prediction = self.classifier.predict(processed['eeg'])
                processed['mental_state'] = prediction
            
            # Update dashboard
            self.dashboard.update_data(processed)
            
            # Log data quality
            if processed.get('eeg'):
                quality = processed['eeg'].get('quality', 0)
                if quality < 50:
                    logging.warning(f"Low EEG signal quality: {quality:.1f}")
            
        except Exception as e:
            logging.error(f"Error processing data: {e}")
    
    async def start(self):
        """Start the application"""
        try:
            async with self.client:
                print("Scanning for devices...")
                devices = await self.client.scan_devices()
                
                if not devices:
                    print("No devices found")
                    return
                
                print(f"Found {len(devices)} devices")
                device = devices[0]
                
                print(f"Connecting to {device['name']}...")
                if not await self.client.connect_device(device['address']):
                    print("Failed to connect")
                    return
                
                print("Starting data stream...")
                if not await self.client.start_streaming():
                    print("Failed to start streaming")
                    return
                
                self.is_running = True
                print("Application started successfully")
                
                # Start WebSocket connection and dashboard
                await asyncio.gather(
                    self.client.connect_websocket(self.data_callback),
                    self._run_dashboard()
                )
                
        except Exception as e:
            logging.error(f"Application error: {e}")
        finally:
            self.is_running = False
    
    async def _run_dashboard(self):
        """Run the dashboard in a separate thread"""
        import threading
        
        def show_dashboard():
            self.dashboard.show()
        
        dashboard_thread = threading.Thread(target=show_dashboard)
        dashboard_thread.daemon = True
        dashboard_thread.start()
        
        # Keep the async loop running
        while self.is_running:
            await asyncio.sleep(1)

# Usage
async def main():
    logging.basicConfig(level=logging.INFO)
    app = LinkBandApplication()
    await app.start()

if __name__ == "__main__":
    asyncio.run(main())
```

This advanced Python integration guide provides comprehensive examples for building sophisticated Link Band SDK applications with async processing, machine learning, and real-time visualization capabilities. 