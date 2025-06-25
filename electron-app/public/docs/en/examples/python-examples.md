# Python Examples

## Overview

This document provides various examples of using the Link Band SDK in Python. Through practical examples including REST API calls, WebSocket connections, and data processing, you can effectively utilize the SDK.

## Basic Setup

### Required Libraries Installation

```bash
pip install requests websockets asyncio numpy matplotlib pandas
```

### Basic Client Class

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
        """GET request"""
        response = self.session.get(f"{self.base_url}{endpoint}")
        response.raise_for_status()
        return response.json()
    
    def post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """POST request"""
        response = self.session.post(
            f"{self.base_url}{endpoint}",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    
    async def connect_websocket(self):
        """WebSocket connection"""
        self.websocket = await websockets.connect(f"ws://localhost:8121/ws")
        return self.websocket
```

## Example 1: Device Management

### Device Scanning and Connection

```python
import time

def device_management_example():
    client = LinkBandClient()
    
    print("1. Starting device scan...")
    scan_result = client.post("/device/scan", {"duration": 10})
    print(f"Scan result: {scan_result}")
    
    # Wait for scan completion
    time.sleep(12)
    
    print("2. Retrieving scanned device list...")
    devices = client.get("/device/list")
    print(f"Found devices: {len(devices['data'])} devices")
    
    if devices['data']:
        device = devices['data'][0]
        device_address = device['address']
        
        print(f"3. Connecting to device: {device_address}")
        connect_result = client.post("/device/connect", {
            "address": device_address
        })
        print(f"Connection result: {connect_result}")
        
        # Check connection status
        time.sleep(3)
        status = client.get("/device/status")
        print(f"Connection status: {status}")
        
        # Check battery information
        battery = client.get("/device/battery")
        print(f"Battery level: {battery['data']['level']}%")
    
    else:
        print("No devices found.")

if __name__ == "__main__":
    device_management_example()
```

## Example 2: Real-time Data Streaming

### Real-time Data Reception via WebSocket

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
        """Start streaming"""
        try:
            # WebSocket connection
            ws = await self.client.connect_websocket()
            print("WebSocket connected")
            
            # Request streaming start
            start_result = self.client.post("/stream/start", {})
            print(f"Streaming started: {start_result}")
            
            self.is_streaming = True
            
            # Wait for message reception
            async for message in ws:
                try:
                    data = json.loads(message)
                    await self.handle_message(data)
                except json.JSONDecodeError as e:
                    print(f"Message parsing error: {e}")
                    
        except Exception as e:
            print(f"Streaming error: {e}")
        finally:
            self.is_streaming = False
    
    async def handle_message(self, data: Dict[str, Any]):
        """Message handling"""
        if data.get('type') == 'raw_data':
            sensor_type = data.get('sensor_type')
            samples = data.get('data', [])
            
            # Add data to buffer
            self.data_buffer[sensor_type].extend(samples)
            
            # Keep only last 1000 samples
            if len(self.data_buffer[sensor_type]) > 1000:
                self.data_buffer[sensor_type] = self.data_buffer[sensor_type][-1000:]
            
            print(f"{sensor_type.upper()} data received: {len(samples)} samples")
            
            # Process by specific sensor
            if sensor_type == 'eeg':
                await self.process_eeg_data(samples)
            elif sensor_type == 'ppg':
                await self.process_ppg_data(samples)
            elif sensor_type == 'acc':
                await self.process_acc_data(samples)
    
    async def process_eeg_data(self, samples: List[Dict]):
        """EEG data processing"""
        for sample in samples:
            ch1 = sample.get('ch1', 0)
            ch2 = sample.get('ch2', 0)
            timestamp = sample.get('timestamp', 0)
            
            # Signal quality check
            if abs(ch1) > 10000 or abs(ch2) > 10000:
                print(f"⚠️  EEG signal saturation detected: CH1={ch1}, CH2={ch2}")
    
    async def process_ppg_data(self, samples: List[Dict]):
        """PPG data processing"""
        for sample in samples:
            red = sample.get('red', 0)
            ir = sample.get('ir', 0)
            
            # Simple heart rate calculation (actual implementation requires more complex algorithms)
            if red > 1000000:  # Threshold
                print(f"💓 Heartbeat detected: Red={red}, IR={ir}")
    
    async def process_acc_data(self, samples: List[Dict]):
        """Accelerometer data processing"""
        for sample in samples:
            x = sample.get('x', 0)
            y = sample.get('y', 0)
            z = sample.get('z', 0)
            
            # Motion detection
            magnitude = (x**2 + y**2 + z**2) ** 0.5
            if magnitude > 20000:  # Threshold
                print(f"🏃 Motion detected: Acceleration magnitude = {magnitude:.2f}")

# Usage example
async def streaming_example():
    streamer = RealTimeDataStreamer()
    
    # Start streaming for 30 seconds
    streaming_task = asyncio.create_task(streamer.start_streaming())
    
    # Wait for 30 seconds
    await asyncio.sleep(30)
    
    # Stop streaming
    streamer.is_streaming = False
    streaming_task.cancel()
    
    print("Streaming stopped")

if __name__ == "__main__":
    asyncio.run(streaming_example())
```

## Example 3: Data Recording and Analysis

### Session Recording and Data Analysis

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import signal
from datetime import datetime

class DataRecorderAnalyzer:
    def __init__(self):
        self.client = LinkBandClient()
        self.current_session_id = None
    
    def start_recording(self, session_name: str, duration_seconds: int = 60):
        """Start data recording"""
        try:
            # Start recording
            start_result = self.client.post("/data/start-recording", {
                "session_name": session_name,
                "participant_id": "P001",
                "condition": "baseline",
                "sensors": ["EEG", "PPG", "ACC"],
                "notes": f"Recording duration: {duration_seconds} seconds"
            })
            
            if start_result['success']:
                self.current_session_id = start_result['data']['session_id']
                print(f"Recording started: {self.current_session_id}")
                
                # Record for specified duration
                print(f"Recording for {duration_seconds} seconds...")
                time.sleep(duration_seconds)
                
                # Stop recording
                self.stop_recording()
                
                return self.current_session_id
            else:
                print(f"Recording start failed: {start_result}")
                return None
                
        except Exception as e:
            print(f"Recording error: {e}")
            return None
    
    def stop_recording(self):
        """Stop recording"""
        if self.current_session_id:
            try:
                stop_result = self.client.post("/data/stop-recording", {
                    "session_id": self.current_session_id
                })
                print(f"Recording stopped: {stop_result}")
                return stop_result
            except Exception as e:
                print(f"Recording stop error: {e}")
        return None
    
    def analyze_session(self, session_id: str):
        """Analyze recorded session data"""
        try:
            # Get session information
            session_info = self.client.get(f"/data/sessions/{session_id}")
            print(f"Session info: {session_info['data']['session_name']}")
            
            # Get session files
            files = self.client.get(f"/data/sessions/{session_id}/files")
            print(f"Files in session: {len(files['data']['files'])}")
            
            # Analyze each sensor data
            analysis_results = {}
            
            for file_info in files['data']['files']:
                filename = file_info['filename']
                
                if 'eeg' in filename.lower():
                    eeg_data = self.load_file_data(session_id, filename)
                    analysis_results['eeg'] = self.analyze_eeg(eeg_data)
                
                elif 'ppg' in filename.lower():
                    ppg_data = self.load_file_data(session_id, filename)
                    analysis_results['ppg'] = self.analyze_ppg(ppg_data)
                
                elif 'acc' in filename.lower():
                    acc_data = self.load_file_data(session_id, filename)
                    analysis_results['acc'] = self.analyze_acc(acc_data)
            
            # Generate analysis report
            self.generate_report(analysis_results)
            
            return analysis_results
            
        except Exception as e:
            print(f"Analysis error: {e}")
            return None
    
    def load_file_data(self, session_id: str, filename: str):
        """Load file data"""
        try:
            response = self.client.get(f"/data/sessions/{session_id}/files/{filename}")
            return response
        except Exception as e:
            print(f"File loading error: {e}")
            return None
    
    def analyze_eeg(self, eeg_data):
        """EEG data analysis"""
        if not eeg_data or 'data' not in eeg_data:
            return None
        
        try:
            # Extract EEG samples
            samples = eeg_data['data']
            
            # Convert to numpy array
            ch1_data = np.array([sample['ch1'] for sample in samples])
            ch2_data = np.array([sample['ch2'] for sample in samples])
            
            # Frequency band analysis
            fs = 250  # Sampling rate
            results = {}
            
            for ch_idx, channel_data in enumerate([ch1_data, ch2_data], 1):
                # Apply bandpass filter (1-45 Hz)
                sos = signal.butter(4, [1, 45], btype='band', fs=fs, output='sos')
                filtered_data = signal.sosfilt(sos, channel_data)
                
                # Power spectral density
                freqs, psd = signal.welch(filtered_data, fs, nperseg=1024)
                
                # Calculate band powers
                bands = {
                    'delta': (1, 4),
                    'theta': (4, 8),
                    'alpha': (8, 13),
                    'beta': (13, 30),
                    'gamma': (30, 45)
                }
                
                band_powers = {}
                for band_name, (low, high) in bands.items():
                    band_mask = (freqs >= low) & (freqs <= high)
                    band_power = np.trapz(psd[band_mask], freqs[band_mask])
                    band_powers[band_name] = band_power
                
                total_power = sum(band_powers.values())
                relative_powers = {band: power/total_power for band, power in band_powers.items()}
                
                results[f'channel_{ch_idx}'] = {
                    'band_powers': band_powers,
                    'relative_powers': relative_powers,
                    'total_power': total_power,
                    'mean_amplitude': np.mean(filtered_data),
                    'std_amplitude': np.std(filtered_data)
                }
            
            return results
            
        except Exception as e:
            print(f"EEG analysis error: {e}")
            return None
    
    def analyze_ppg(self, ppg_data):
        """PPG data analysis"""
        if not ppg_data or 'data' not in ppg_data:
            return None
        
        try:
            samples = ppg_data['data']
            
            # Extract heart rate values
            heart_rates = []
            for sample in samples:
                if 'heart_rate' in sample and sample['heart_rate'] > 0:
                    heart_rates.append(sample['heart_rate'])
            
            if not heart_rates:
                return None
            
            heart_rates = np.array(heart_rates)
            
            results = {
                'mean_heart_rate': np.mean(heart_rates),
                'std_heart_rate': np.std(heart_rates),
                'min_heart_rate': np.min(heart_rates),
                'max_heart_rate': np.max(heart_rates),
                'sample_count': len(heart_rates)
            }
            
            # Heart rate variability analysis
            if len(heart_rates) > 1:
                rr_intervals = 60000 / heart_rates  # Convert to RR intervals (ms)
                
                # Time domain HRV metrics
                results['hrv_rmssd'] = np.sqrt(np.mean(np.diff(rr_intervals)**2))
                results['hrv_sdnn'] = np.std(rr_intervals)
                
                # Calculate pNN50
                diff_rr = np.abs(np.diff(rr_intervals))
                pnn50 = (np.sum(diff_rr > 50) / len(diff_rr)) * 100
                results['hrv_pnn50'] = pnn50
            
            return results
            
        except Exception as e:
            print(f"PPG analysis error: {e}")
            return None
    
    def analyze_acc(self, acc_data):
        """Accelerometer data analysis"""
        if not acc_data or 'data' not in acc_data:
            return None
        
        try:
            samples = acc_data['data']
            
            # Extract acceleration values
            x_values = np.array([sample['x'] for sample in samples])
            y_values = np.array([sample['y'] for sample in samples])
            z_values = np.array([sample['z'] for sample in samples])
            
            # Calculate magnitude
            magnitude = np.sqrt(x_values**2 + y_values**2 + z_values**2)
            
            results = {
                'mean_magnitude': np.mean(magnitude),
                'std_magnitude': np.std(magnitude),
                'max_magnitude': np.max(magnitude),
                'min_magnitude': np.min(magnitude),
                'sample_count': len(magnitude)
            }
            
            # Activity classification
            activity_threshold = {
                'stationary': 1000,
                'light_activity': 5000,
                'moderate_activity': 15000
            }
            
            mean_mag = results['mean_magnitude']
            if mean_mag < activity_threshold['stationary']:
                activity_level = 'stationary'
            elif mean_mag < activity_threshold['light_activity']:
                activity_level = 'light_activity'
            elif mean_mag < activity_threshold['moderate_activity']:
                activity_level = 'moderate_activity'
            else:
                activity_level = 'vigorous_activity'
            
            results['activity_level'] = activity_level
            
            return results
            
        except Exception as e:
            print(f"ACC analysis error: {e}")
            return None
    
    def generate_report(self, analysis_results):
        """Generate analysis report"""
        print("\n" + "="*50)
        print("DATA ANALYSIS REPORT")
        print("="*50)
        
        # EEG analysis results
        if 'eeg' in analysis_results and analysis_results['eeg']:
            print("\n[EEG Analysis]")
            eeg_results = analysis_results['eeg']
            
            for channel, data in eeg_results.items():
                print(f"\n{channel.upper()}:")
                print(f"  Total Power: {data['total_power']:.2f}")
                print(f"  Mean Amplitude: {data['mean_amplitude']:.2f} µV")
                print(f"  Std Amplitude: {data['std_amplitude']:.2f} µV")
                
                print("  Relative Band Powers:")
                for band, power in data['relative_powers'].items():
                    print(f"    {band.capitalize()}: {power:.3f} ({power*100:.1f}%)")
        
        # PPG analysis results
        if 'ppg' in analysis_results and analysis_results['ppg']:
            print("\n[PPG Analysis]")
            ppg_results = analysis_results['ppg']
            
            print(f"  Mean Heart Rate: {ppg_results['mean_heart_rate']:.1f} BPM")
            print(f"  Heart Rate Range: {ppg_results['min_heart_rate']:.1f} - {ppg_results['max_heart_rate']:.1f} BPM")
            print(f"  Heart Rate Std: {ppg_results['std_heart_rate']:.1f} BPM")
            
            if 'hrv_rmssd' in ppg_results:
                print(f"  HRV RMSSD: {ppg_results['hrv_rmssd']:.1f} ms")
                print(f"  HRV SDNN: {ppg_results['hrv_sdnn']:.1f} ms")
                print(f"  HRV pNN50: {ppg_results['hrv_pnn50']:.1f}%")
        
        # ACC analysis results
        if 'acc' in analysis_results and analysis_results['acc']:
            print("\n[Accelerometer Analysis]")
            acc_results = analysis_results['acc']
            
            print(f"  Activity Level: {acc_results['activity_level']}")
            print(f"  Mean Magnitude: {acc_results['mean_magnitude']:.2f}")
            print(f"  Magnitude Range: {acc_results['min_magnitude']:.2f} - {acc_results['max_magnitude']:.2f}")
            print(f"  Movement Variability: {acc_results['std_magnitude']:.2f}")
        
        print("\n" + "="*50)

# Usage example
def recording_analysis_example():
    recorder = DataRecorderAnalyzer()
    
    # Start recording
    session_name = f"Python_Test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    session_id = recorder.start_recording(session_name, duration_seconds=30)
    
    if session_id:
        # Analyze recorded data
        print(f"\nAnalyzing session: {session_id}")
        analysis_results = recorder.analyze_session(session_id)
        
        if analysis_results:
            print("Analysis completed successfully!")
        else:
            print("Analysis failed!")
    else:
        print("Recording failed!")

if __name__ == "__main__":
    recording_analysis_example()
```

## Example 4: Real-time Signal Quality Monitoring

### Signal Quality Assessment and Alerts

```python
import time
from datetime import datetime, timedelta

class SignalQualityMonitor:
    def __init__(self):
        self.client = LinkBandClient()
        self.quality_thresholds = {
            'eeg': 0.7,
            'ppg': 0.8,
            'acc': 0.9
        }
        self.monitoring = False
        self.quality_history = []
    
    def start_monitoring(self, duration_minutes: int = 5):
        """Start signal quality monitoring"""
        print(f"Starting signal quality monitoring for {duration_minutes} minutes...")
        
        self.monitoring = True
        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        try:
            while self.monitoring and datetime.now() < end_time:
                # Check signal quality
                quality_data = self.check_signal_quality()
                
                if quality_data:
                    # Store quality history
                    self.quality_history.append({
                        'timestamp': datetime.now(),
                        'quality': quality_data
                    })
                    
                    # Check for quality issues
                    self.check_quality_alerts(quality_data)
                    
                    # Display current quality
                    self.display_quality_status(quality_data)
                
                # Wait 5 seconds before next check
                time.sleep(5)
                
        except KeyboardInterrupt:
            print("\nMonitoring stopped by user")
        finally:
            self.monitoring = False
            self.generate_quality_report()
    
    def check_signal_quality(self):
        """Check current signal quality"""
        try:
            # Get device status
            status = self.client.get("/device/status")
            
            if not status.get('success', False):
                return None
            
            device_data = status.get('data', {})
            
            # Extract quality metrics
            quality_data = {
                'eeg_quality': device_data.get('eeg_signal_quality', 0),
                'ppg_quality': device_data.get('ppg_signal_quality', 0),
                'acc_quality': device_data.get('acc_signal_quality', 0),
                'battery_level': device_data.get('battery_level', 0),
                'connection_strength': device_data.get('connection_strength', 0)
            }
            
            return quality_data
            
        except Exception as e:
            print(f"Quality check error: {e}")
            return None
    
    def check_quality_alerts(self, quality_data):
        """Check for quality alerts"""
        alerts = []
        
        # Check EEG quality
        if quality_data['eeg_quality'] < self.quality_thresholds['eeg']:
            alerts.append(f"⚠️ EEG signal quality low: {quality_data['eeg_quality']:.2f}")
        
        # Check PPG quality
        if quality_data['ppg_quality'] < self.quality_thresholds['ppg']:
            alerts.append(f"⚠️ PPG signal quality low: {quality_data['ppg_quality']:.2f}")
        
        # Check ACC quality
        if quality_data['acc_quality'] < self.quality_thresholds['acc']:
            alerts.append(f"⚠️ ACC signal quality low: {quality_data['acc_quality']:.2f}")
        
        # Check battery level
        if quality_data['battery_level'] < 20:
            alerts.append(f"🔋 Low battery: {quality_data['battery_level']}%")
        
        # Check connection strength
        if quality_data['connection_strength'] < 0.5:
            alerts.append(f"📶 Weak connection: {quality_data['connection_strength']:.2f}")
        
        # Display alerts
        for alert in alerts:
            print(alert)
    
    def display_quality_status(self, quality_data):
        """Display current quality status"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        print(f"[{timestamp}] Quality Status:")
        print(f"  EEG: {quality_data['eeg_quality']:.2f}")
        print(f"  PPG: {quality_data['ppg_quality']:.2f}")
        print(f"  ACC: {quality_data['acc_quality']:.2f}")
        print(f"  Battery: {quality_data['battery_level']}%")
        print(f"  Connection: {quality_data['connection_strength']:.2f}")
        print("-" * 30)
    
    def generate_quality_report(self):
        """Generate quality monitoring report"""
        if not self.quality_history:
            print("No quality data collected")
            return
        
        print("\n" + "="*40)
        print("SIGNAL QUALITY MONITORING REPORT")
        print("="*40)
        
        # Calculate average quality
        total_samples = len(self.quality_history)
        
        avg_eeg = np.mean([q['quality']['eeg_quality'] for q in self.quality_history])
        avg_ppg = np.mean([q['quality']['ppg_quality'] for q in self.quality_history])
        avg_acc = np.mean([q['quality']['acc_quality'] for q in self.quality_history])
        
        print(f"\nMonitoring Duration: {total_samples * 5} seconds ({total_samples} samples)")
        print(f"Average Signal Quality:")
        print(f"  EEG: {avg_eeg:.3f}")
        print(f"  PPG: {avg_ppg:.3f}")
        print(f"  ACC: {avg_acc:.3f}")
        
        # Quality distribution
        eeg_good = sum(1 for q in self.quality_history if q['quality']['eeg_quality'] >= self.quality_thresholds['eeg'])
        ppg_good = sum(1 for q in self.quality_history if q['quality']['ppg_quality'] >= self.quality_thresholds['ppg'])
        acc_good = sum(1 for q in self.quality_history if q['quality']['acc_quality'] >= self.quality_thresholds['acc'])
        
        print(f"\nGood Quality Percentage:")
        print(f"  EEG: {(eeg_good/total_samples)*100:.1f}%")
        print(f"  PPG: {(ppg_good/total_samples)*100:.1f}%")
        print(f"  ACC: {(acc_good/total_samples)*100:.1f}%")
        
        # Battery and connection statistics
        battery_levels = [q['quality']['battery_level'] for q in self.quality_history]
        connection_strengths = [q['quality']['connection_strength'] for q in self.quality_history]
        
        print(f"\nBattery Level:")
        print(f"  Start: {battery_levels[0]}%")
        print(f"  End: {battery_levels[-1]}%")
        print(f"  Average: {np.mean(battery_levels):.1f}%")
        
        print(f"\nConnection Strength:")
        print(f"  Average: {np.mean(connection_strengths):.3f}")
        print(f"  Minimum: {np.min(connection_strengths):.3f}")
        
        print("\n" + "="*40)

# Usage example
def quality_monitoring_example():
    monitor = SignalQualityMonitor()
    
    # Monitor for 2 minutes
    monitor.start_monitoring(duration_minutes=2)

if __name__ == "__main__":
    quality_monitoring_example()
```

## Example 5: Data Export and Visualization

### Export Data and Create Visualizations

```python
import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.animation import FuncAnimation

class DataExportVisualizer:
    def __init__(self):
        self.client = LinkBandClient()
    
    def export_session_data(self, session_id: str, export_format: str = "csv"):
        """Export session data"""
        try:
            # Request data export
            export_result = self.client.post(f"/data/sessions/{session_id}/export", {
                "format": export_format,
                "sensors": ["EEG", "PPG", "ACC"],
                "data_types": ["raw", "processed"],
                "compression": "zip",
                "include_metadata": True
            })
            
            if export_result['success']:
                export_id = export_result['data']['export_id']
                print(f"Export started: {export_id}")
                
                # Wait for export completion
                while True:
                    status = self.client.get(f"/data/exports/{export_id}")
                    
                    if status['data']['status'] == 'completed':
                        print("Export completed!")
                        download_url = status['data']['download_url']
                        return download_url
                    elif status['data']['status'] == 'failed':
                        print("Export failed!")
                        return None
                    else:
                        print(f"Export progress: {status['data']['progress']}%")
                        time.sleep(2)
            else:
                print(f"Export request failed: {export_result}")
                return None
                
        except Exception as e:
            print(f"Export error: {e}")
            return None
    
    def visualize_session_data(self, session_id: str):
        """Visualize session data"""
        try:
            # Get session files
            files = self.client.get(f"/data/sessions/{session_id}/files")
            
            fig, axes = plt.subplots(3, 1, figsize=(12, 10))
            fig.suptitle(f'Session Data Visualization: {session_id}', fontsize=16)
            
            # Plot EEG data
            eeg_file = next((f for f in files['data']['files'] if 'eeg' in f['filename'].lower()), None)
            if eeg_file:
                eeg_data = self.load_file_data(session_id, eeg_file['filename'])
                self.plot_eeg_data(axes[0], eeg_data)
            
            # Plot PPG data
            ppg_file = next((f for f in files['data']['files'] if 'ppg' in f['filename'].lower()), None)
            if ppg_file:
                ppg_data = self.load_file_data(session_id, ppg_file['filename'])
                self.plot_ppg_data(axes[1], ppg_data)
            
            # Plot ACC data
            acc_file = next((f for f in files['data']['files'] if 'acc' in f['filename'].lower()), None)
            if acc_file:
                acc_data = self.load_file_data(session_id, acc_file['filename'])
                self.plot_acc_data(axes[2], acc_data)
            
            plt.tight_layout()
            plt.show()
            
            # Save plot
            plot_filename = f"session_{session_id}_visualization.png"
            plt.savefig(plot_filename, dpi=300, bbox_inches='tight')
            print(f"Visualization saved: {plot_filename}")
            
        except Exception as e:
            print(f"Visualization error: {e}")
    
    def load_file_data(self, session_id: str, filename: str):
        """Load file data"""
        return self.client.get(f"/data/sessions/{session_id}/files/{filename}")
    
    def plot_eeg_data(self, ax, eeg_data):
        """Plot EEG data"""
        if not eeg_data or 'data' not in eeg_data:
            ax.text(0.5, 0.5, 'No EEG data available', ha='center', va='center', transform=ax.transAxes)
            return
        
        samples = eeg_data['data'][:1000]  # Plot first 1000 samples
        
        timestamps = [i/250 for i in range(len(samples))]  # 250 Hz sampling rate
        ch1_data = [sample['ch1'] for sample in samples]
        ch2_data = [sample['ch2'] for sample in samples]
        
        ax.plot(timestamps, ch1_data, label='Channel 1', alpha=0.7)
        ax.plot(timestamps, ch2_data, label='Channel 2', alpha=0.7)
        ax.set_title('EEG Signal')
        ax.set_xlabel('Time (seconds)')
        ax.set_ylabel('Amplitude (µV)')
        ax.legend()
        ax.grid(True, alpha=0.3)
    
    def plot_ppg_data(self, ax, ppg_data):
        """Plot PPG data"""
        if not ppg_data or 'data' not in ppg_data:
            ax.text(0.5, 0.5, 'No PPG data available', ha='center', va='center', transform=ax.transAxes)
            return
        
        samples = ppg_data['data'][:500]  # Plot first 500 samples
        
        timestamps = [i/50 for i in range(len(samples))]  # 50 Hz sampling rate
        red_data = [sample.get('red', 0) for sample in samples]
        ir_data = [sample.get('ir', 0) for sample in samples]
        
        ax.plot(timestamps, red_data, 'r-', label='Red', alpha=0.7)
        ax.plot(timestamps, ir_data, 'darkred', label='IR', alpha=0.7)
        ax.set_title('PPG Signal')
        ax.set_xlabel('Time (seconds)')
        ax.set_ylabel('Amplitude')
        ax.legend()
        ax.grid(True, alpha=0.3)
    
    def plot_acc_data(self, ax, acc_data):
        """Plot accelerometer data"""
        if not acc_data or 'data' not in acc_data:
            ax.text(0.5, 0.5, 'No ACC data available', ha='center', va='center', transform=ax.transAxes)
            return
        
        samples = acc_data['data'][:250]  # Plot first 250 samples
        
        timestamps = [i/25 for i in range(len(samples))]  # 25 Hz sampling rate
        x_data = [sample['x'] for sample in samples]
        y_data = [sample['y'] for sample in samples]
        z_data = [sample['z'] for sample in samples]
        
        ax.plot(timestamps, x_data, 'r-', label='X-axis', alpha=0.7)
        ax.plot(timestamps, y_data, 'g-', label='Y-axis', alpha=0.7)
        ax.plot(timestamps, z_data, 'b-', label='Z-axis', alpha=0.7)
        ax.set_title('Accelerometer Signal')
        ax.set_xlabel('Time (seconds)')
        ax.set_ylabel('Acceleration')
        ax.legend()
        ax.grid(True, alpha=0.3)

# Usage example
def export_visualization_example():
    visualizer = DataExportVisualizer()
    
    # Get latest session
    client = LinkBandClient()
    sessions = client.get("/data/sessions?limit=1")
    
    if sessions['success'] and sessions['data']['sessions']:
        latest_session = sessions['data']['sessions'][0]
        session_id = latest_session['session_id']
        
        print(f"Processing session: {session_id}")
        
        # Export data
        download_url = visualizer.export_session_data(session_id, "csv")
        if download_url:
            print(f"Data exported successfully: {download_url}")
        
        # Create visualization
        visualizer.visualize_session_data(session_id)
        
    else:
        print("No sessions found for visualization")

if __name__ == "__main__":
    export_visualization_example()
```

These Python examples demonstrate comprehensive usage of the Link Band SDK, from basic device management to advanced data analysis and visualization. Each example can be run independently and modified according to your specific needs. 