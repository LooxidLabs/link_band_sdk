# Python Integration

Complete guide for integrating Link Band SDK with Python applications.

## Overview

The Link Band SDK provides comprehensive Python support through REST API and WebSocket connections. This guide covers installation, basic usage, and advanced integration patterns.

## Prerequisites

- Python 3.7+
- Link Band SDK running on localhost:8121
- Required Python packages: `requests`, `websocket-client`, `numpy`, `pandas` (optional)

## Installation

```bash
# Install required packages
pip install requests websocket-client numpy pandas matplotlib
```

## Basic Usage

### 1. Device Management

```python
import requests
import json
import time

class LinkBandController:
    def __init__(self, base_url="http://localhost:8121"):
        self.base_url = base_url
        self.device_id = None
    
    def scan_devices(self):
        """Scan for available Link Band devices"""
        response = requests.get(f"{self.base_url}/device/scan")
        return response.json()
    
    def connect_device(self, device_address):
        """Connect to a specific device"""
        data = {"address": device_address}
        response = requests.post(f"{self.base_url}/device/connect", json=data)
        result = response.json()
        
        if result["success"]:
            self.device_id = result["data"]["device_id"]
            print(f"Connected to device: {self.device_id}")
        
        return result
    
    def disconnect_device(self):
        """Disconnect current device"""
        response = requests.post(f"{self.base_url}/device/disconnect")
        result = response.json()
        
        if result["success"]:
            self.device_id = None
            print("Device disconnected")
        
        return result
    
    def get_device_status(self):
        """Get current device status"""
        response = requests.get(f"{self.base_url}/device/status")
        return response.json()

# Example usage
controller = LinkBandController()

# Scan and connect to device
devices = controller.scan_devices()
if devices["success"] and devices["data"]["devices"]:
    device_address = devices["data"]["devices"][0]["address"]
    controller.connect_device(device_address)
```

### 2. Data Recording

```python
class DataRecorder:
    def __init__(self, base_url="http://localhost:8121"):
        self.base_url = base_url
        self.session_id = None
    
    def start_recording(self, session_name, participant_id=None, condition=None):
        """Start a new recording session"""
        data = {
            "session_name": session_name,
            "sensors": ["EEG", "PPG", "ACC"]
        }
        
        if participant_id:
            data["participant_id"] = participant_id
        if condition:
            data["condition"] = condition
        
        response = requests.post(f"{self.base_url}/data/start-recording", json=data)
        result = response.json()
        
        if result["success"]:
            self.session_id = result["data"]["session_id"]
            print(f"Recording started: {self.session_id}")
        
        return result
    
    def stop_recording(self):
        """Stop current recording session"""
        if not self.session_id:
            return {"success": False, "error": "No active recording"}
        
        data = {"session_id": self.session_id}
        response = requests.post(f"{self.base_url}/data/stop-recording", json=data)
        result = response.json()
        
        if result["success"]:
            print(f"Recording stopped: {self.session_id}")
            self.session_id = None
        
        return result
    
    def get_recording_status(self):
        """Get current recording status"""
        response = requests.get(f"{self.base_url}/data/recording-status")
        return response.json()

# Example usage
recorder = DataRecorder()

# Start recording
recorder.start_recording("Baseline Test", "P001", "eyes_closed")

# Record for 30 seconds
time.sleep(30)

# Stop recording
recorder.stop_recording()
```

### 3. Real-time Data Streaming

```python
import websocket
import json
import threading
from collections import deque

class RealTimeStreamer:
    def __init__(self, websocket_url="ws://localhost:8121"):
        self.websocket_url = websocket_url
        self.ws = None
        self.data_buffer = {
            "eeg": deque(maxlen=1000),
            "ppg": deque(maxlen=1000),
            "acc": deque(maxlen=1000)
        }
        self.callbacks = {}
        self.is_connected = False
    
    def on_message(self, ws, message):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(message)
            
            if data["type"] == "event":
                self.handle_event(data)
            elif data["type"] in ["raw_data", "processed_data"]:
                self.handle_sensor_data(data)
            elif data["type"] == "error":
                self.handle_error(data)
                
        except json.JSONDecodeError:
            print(f"Invalid JSON received: {message}")
    
    def on_open(self, ws):
        """Handle WebSocket connection opened"""
        print("WebSocket connection opened")
        self.is_connected = True
        
        # Check device connection
        self.send_command("check_device_connection")
    
    def on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket connection closed"""
        print("WebSocket connection closed")
        self.is_connected = False
    
    def on_error(self, ws, error):
        """Handle WebSocket errors"""
        print(f"WebSocket error: {error}")
    
    def send_command(self, command, payload=None):
        """Send command to WebSocket server"""
        if not self.is_connected:
            return False
        
        message = {
            "type": "command",
            "command": command
        }
        
        if payload:
            message["payload"] = payload
        
        self.ws.send(json.dumps(message))
        return True
    
    def handle_event(self, data):
        """Handle event messages"""
        event_type = data["event_type"]
        
        if event_type == "device_connected":
            print("Device connected")
        elif event_type == "stream_started":
            print("Streaming started")
        elif event_type == "stream_stopped":
            print("Streaming stopped")
        
        # Call registered callbacks
        if event_type in self.callbacks:
            self.callbacks[event_type](data)
    
    def handle_sensor_data(self, data):
        """Handle sensor data messages"""
        sensor_type = data["sensor_type"]
        
        if sensor_type in self.data_buffer:
            self.data_buffer[sensor_type].append(data)
        
        # Call sensor data callback
        if "sensor_data" in self.callbacks:
            self.callbacks["sensor_data"](data)
    
    def handle_error(self, data):
        """Handle error messages"""
        print(f"Error: {data}")
    
    def register_callback(self, event_type, callback):
        """Register callback for specific event type"""
        self.callbacks[event_type] = callback
    
    def start_streaming(self):
        """Start data streaming"""
        return self.send_command("start_streaming")
    
    def stop_streaming(self):
        """Stop data streaming"""
        return self.send_command("stop_streaming")
    
    def connect(self):
        """Connect to WebSocket server"""
        self.ws = websocket.WebSocketApp(
            self.websocket_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_close=self.on_close,
            on_error=self.on_error
        )
        
        # Run in separate thread
        self.ws_thread = threading.Thread(target=self.ws.run_forever)
        self.ws_thread.daemon = True
        self.ws_thread.start()
    
    def disconnect(self):
        """Disconnect from WebSocket server"""
        if self.ws:
            self.ws.close()

# Example usage
def on_sensor_data(data):
    sensor_type = data["sensor_type"]
    timestamp = data["timestamp"]
    print(f"Received {sensor_type} data at {timestamp}")

streamer = RealTimeStreamer()
streamer.register_callback("sensor_data", on_sensor_data)
streamer.connect()

# Wait for connection
time.sleep(2)

# Start streaming
streamer.start_streaming()

# Stream for 10 seconds
time.sleep(10)

# Stop streaming
streamer.stop_streaming()
streamer.disconnect()
```

## Advanced Integration

### 1. Data Analysis Pipeline

```python
import numpy as np
import pandas as pd
from scipy import signal
from scipy.fft import fft, fftfreq

class DataAnalyzer:
    def __init__(self):
        self.sampling_rates = {
            "eeg": 250,
            "ppg": 50,
            "acc": 25
        }
    
    def analyze_eeg_data(self, eeg_data):
        """Analyze EEG data for frequency bands"""
        if not eeg_data:
            return None
        
        # Extract channel data
        channels = []
        timestamps = []
        
        for sample in eeg_data:
            channels.append(sample["channels"])
            timestamps.append(sample["timestamp"])
        
        channels = np.array(channels)
        
        # Frequency analysis for each channel
        results = {}
        fs = self.sampling_rates["eeg"]
        
        for ch_idx in range(channels.shape[1]):
            channel_data = channels[:, ch_idx]
            
            # Apply bandpass filter (1-45 Hz)
            sos = signal.butter(4, [1, 45], btype='band', fs=fs, output='sos')
            filtered_data = signal.sosfilt(sos, channel_data)
            
            # Compute power spectral density
            freqs, psd = signal.welch(filtered_data, fs, nperseg=fs*2)
            
            # Calculate band powers
            band_powers = self.calculate_band_powers(freqs, psd)
            
            results[f"channel_{ch_idx+1}"] = {
                "band_powers": band_powers,
                "total_power": np.sum(psd),
                "mean_amplitude": np.mean(filtered_data),
                "std_amplitude": np.std(filtered_data)
            }
        
        return results
    
    def calculate_band_powers(self, freqs, psd):
        """Calculate EEG frequency band powers"""
        bands = {
            "delta": (1, 4),
            "theta": (4, 8),
            "alpha": (8, 13),
            "beta": (13, 30),
            "gamma": (30, 45)
        }
        
        band_powers = {}
        
        for band_name, (low, high) in bands.items():
            band_mask = (freqs >= low) & (freqs <= high)
            band_power = np.trapz(psd[band_mask], freqs[band_mask])
            band_powers[band_name] = band_power
        
        return band_powers
    
    def analyze_ppg_data(self, ppg_data):
        """Analyze PPG data for heart rate and HRV"""
        if not ppg_data:
            return None
        
        # Extract heart rate values
        heart_rates = []
        hrv_values = []
        
        for sample in ppg_data:
            if "heart_rate" in sample:
                heart_rates.append(sample["heart_rate"])
            if "hrv" in sample:
                hrv_values.append(sample["hrv"])
        
        if not heart_rates:
            return None
        
        return {
            "mean_heart_rate": np.mean(heart_rates),
            "std_heart_rate": np.std(heart_rates),
            "min_heart_rate": np.min(heart_rates),
            "max_heart_rate": np.max(heart_rates),
            "mean_hrv": np.mean(hrv_values) if hrv_values else None,
            "heart_rate_trend": np.polyfit(range(len(heart_rates)), heart_rates, 1)[0]
        }
    
    def analyze_acc_data(self, acc_data):
        """Analyze accelerometer data for activity metrics"""
        if not acc_data:
            return None
        
        # Extract acceleration values
        accelerations = []
        
        for sample in acc_data:
            if "acceleration" in sample:
                acc = sample["acceleration"]
                magnitude = np.sqrt(acc["x"]**2 + acc["y"]**2 + acc["z"]**2)
                accelerations.append(magnitude)
        
        if not accelerations:
            return None
        
        accelerations = np.array(accelerations)
        
        return {
            "mean_acceleration": np.mean(accelerations),
            "std_acceleration": np.std(accelerations),
            "max_acceleration": np.max(accelerations),
            "activity_level": self.classify_activity(accelerations),
            "movement_intensity": np.std(accelerations)
        }
    
    def classify_activity(self, accelerations):
        """Classify activity level based on acceleration data"""
        mean_acc = np.mean(accelerations)
        
        if mean_acc < 1.2:
            return "stationary"
        elif mean_acc < 2.0:
            return "light_activity"
        elif mean_acc < 4.0:
            return "moderate_activity"
        else:
            return "vigorous_activity"

# Example usage
analyzer = DataAnalyzer()

# Analyze buffered data from streamer
eeg_analysis = analyzer.analyze_eeg_data(list(streamer.data_buffer["eeg"]))
ppg_analysis = analyzer.analyze_ppg_data(list(streamer.data_buffer["ppg"]))
acc_analysis = analyzer.analyze_acc_data(list(streamer.data_buffer["acc"]))

print("EEG Analysis:", eeg_analysis)
print("PPG Analysis:", ppg_analysis)
print("ACC Analysis:", acc_analysis)
```

### 2. Data Visualization

```python
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from datetime import datetime

class RealTimeVisualizer:
    def __init__(self, streamer):
        self.streamer = streamer
        self.fig, self.axes = plt.subplots(3, 1, figsize=(12, 8))
        
        # Initialize plots
        self.eeg_line, = self.axes[0].plot([], [], 'b-')
        self.ppg_line, = self.axes[1].plot([], [], 'r-')
        self.acc_line, = self.axes[2].plot([], [], 'g-')
        
        # Setup axes
        self.axes[0].set_title("EEG Signal")
        self.axes[0].set_ylabel("Amplitude (µV)")
        self.axes[1].set_title("PPG Signal")
        self.axes[1].set_ylabel("Heart Rate (BPM)")
        self.axes[2].set_title("Accelerometer")
        self.axes[2].set_ylabel("Magnitude (g)")
        self.axes[2].set_xlabel("Time (s)")
        
        # Data storage for plotting
        self.plot_data = {
            "eeg": {"x": [], "y": []},
            "ppg": {"x": [], "y": []},
            "acc": {"x": [], "y": []}
        }
        
        self.start_time = time.time()
    
    def update_plot(self, frame):
        """Update plots with new data"""
        current_time = time.time() - self.start_time
        
        # Update EEG data
        if self.streamer.data_buffer["eeg"]:
            latest_eeg = list(self.streamer.data_buffer["eeg"])[-1]
            if "data" in latest_eeg and latest_eeg["data"]:
                eeg_value = latest_eeg["data"][0]["channels"][0]  # First channel
                self.plot_data["eeg"]["x"].append(current_time)
                self.plot_data["eeg"]["y"].append(eeg_value)
        
        # Update PPG data
        if self.streamer.data_buffer["ppg"]:
            latest_ppg = list(self.streamer.data_buffer["ppg"])[-1]
            if "data" in latest_ppg and latest_ppg["data"]:
                ppg_value = latest_ppg["data"][0].get("heart_rate", 0)
                self.plot_data["ppg"]["x"].append(current_time)
                self.plot_data["ppg"]["y"].append(ppg_value)
        
        # Update ACC data
        if self.streamer.data_buffer["acc"]:
            latest_acc = list(self.streamer.data_buffer["acc"])[-1]
            if "data" in latest_acc and latest_acc["data"]:
                acc_data = latest_acc["data"][0]["acceleration"]
                magnitude = np.sqrt(acc_data["x"]**2 + acc_data["y"]**2 + acc_data["z"]**2)
                self.plot_data["acc"]["x"].append(current_time)
                self.plot_data["acc"]["y"].append(magnitude)
        
        # Keep only last 100 points
        for sensor in self.plot_data:
            if len(self.plot_data[sensor]["x"]) > 100:
                self.plot_data[sensor]["x"] = self.plot_data[sensor]["x"][-100:]
                self.plot_data[sensor]["y"] = self.plot_data[sensor]["y"][-100:]
        
        # Update line plots
        self.eeg_line.set_data(self.plot_data["eeg"]["x"], self.plot_data["eeg"]["y"])
        self.ppg_line.set_data(self.plot_data["ppg"]["x"], self.plot_data["ppg"]["y"])
        self.acc_line.set_data(self.plot_data["acc"]["x"], self.plot_data["acc"]["y"])
        
        # Auto-scale axes
        for i, sensor in enumerate(["eeg", "ppg", "acc"]):
            if self.plot_data[sensor]["x"]:
                self.axes[i].set_xlim(min(self.plot_data[sensor]["x"]), max(self.plot_data[sensor]["x"]))
                if self.plot_data[sensor]["y"]:
                    y_min, y_max = min(self.plot_data[sensor]["y"]), max(self.plot_data[sensor]["y"])
                    margin = (y_max - y_min) * 0.1
                    self.axes[i].set_ylim(y_min - margin, y_max + margin)
        
        return self.eeg_line, self.ppg_line, self.acc_line
    
    def start_visualization(self):
        """Start real-time visualization"""
        ani = animation.FuncAnimation(self.fig, self.update_plot, interval=100, blit=True)
        plt.tight_layout()
        plt.show()
        return ani

# Example usage
# visualizer = RealTimeVisualizer(streamer)
# ani = visualizer.start_visualization()
```

### 3. Complete Integration Example

```python
class LinkBandIntegration:
    def __init__(self):
        self.controller = LinkBandController()
        self.recorder = DataRecorder()
        self.streamer = RealTimeStreamer()
        self.analyzer = DataAnalyzer()
        
        # Setup callbacks
        self.streamer.register_callback("sensor_data", self.on_sensor_data)
        self.streamer.register_callback("device_connected", self.on_device_connected)
        
        self.analysis_results = []
    
    def on_sensor_data(self, data):
        """Handle incoming sensor data"""
        # Perform real-time analysis every 100 samples
        sensor_type = data["sensor_type"]
        buffer_size = len(self.streamer.data_buffer[sensor_type])
        
        if buffer_size % 100 == 0 and buffer_size > 0:
            self.perform_analysis()
    
    def on_device_connected(self, data):
        """Handle device connection event"""
        print(f"Device connected: {data['data']['device_id']}")
        
        # Start streaming automatically
        time.sleep(1)  # Wait for connection to stabilize
        self.streamer.start_streaming()
    
    def perform_analysis(self):
        """Perform analysis on buffered data"""
        # Get recent data
        eeg_data = list(self.streamer.data_buffer["eeg"])[-50:]  # Last 50 samples
        ppg_data = list(self.streamer.data_buffer["ppg"])[-50:]
        acc_data = list(self.streamer.data_buffer["acc"])[-50:]
        
        # Analyze data
        analysis = {
            "timestamp": datetime.now().isoformat(),
            "eeg": self.analyzer.analyze_eeg_data(eeg_data),
            "ppg": self.analyzer.analyze_ppg_data(ppg_data),
            "acc": self.analyzer.analyze_acc_data(acc_data)
        }
        
        self.analysis_results.append(analysis)
        
        # Print summary
        if analysis["ppg"]:
            print(f"Heart Rate: {analysis['ppg']['mean_heart_rate']:.1f} BPM")
        
        if analysis["acc"]:
            print(f"Activity: {analysis['acc']['activity_level']}")
    
    def run_experiment(self, duration_seconds=60):
        """Run a complete experiment"""
        print("Starting Link Band experiment...")
        
        # 1. Scan and connect to device
        print("Scanning for devices...")
        devices = self.controller.scan_devices()
        
        if not devices["success"] or not devices["data"]["devices"]:
            print("No devices found!")
            return False
        
        device_address = devices["data"]["devices"][0]["address"]
        print(f"Connecting to {device_address}...")
        
        if not self.controller.connect_device(device_address)["success"]:
            print("Failed to connect to device!")
            return False
        
        # 2. Start WebSocket connection
        print("Connecting to WebSocket...")
        self.streamer.connect()
        time.sleep(2)  # Wait for connection
        
        # 3. Start recording
        session_name = f"Experiment_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"Starting recording: {session_name}")
        self.recorder.start_recording(session_name)
        
        # 4. Run experiment for specified duration
        print(f"Running experiment for {duration_seconds} seconds...")
        time.sleep(duration_seconds)
        
        # 5. Stop recording and streaming
        print("Stopping recording...")
        self.recorder.stop_recording()
        self.streamer.stop_streaming()
        
        # 6. Disconnect
        print("Disconnecting...")
        self.streamer.disconnect()
        self.controller.disconnect_device()
        
        # 7. Generate report
        self.generate_report()
        
        print("Experiment completed!")
        return True
    
    def generate_report(self):
        """Generate analysis report"""
        if not self.analysis_results:
            print("No analysis data available")
            return
        
        print("\n=== Experiment Report ===")
        print(f"Total analysis points: {len(self.analysis_results)}")
        
        # Calculate averages
        heart_rates = []
        activity_levels = []
        
        for result in self.analysis_results:
            if result["ppg"] and result["ppg"]["mean_heart_rate"]:
                heart_rates.append(result["ppg"]["mean_heart_rate"])
            
            if result["acc"] and result["acc"]["activity_level"]:
                activity_levels.append(result["acc"]["activity_level"])
        
        if heart_rates:
            print(f"Average Heart Rate: {np.mean(heart_rates):.1f} ± {np.std(heart_rates):.1f} BPM")
            print(f"Heart Rate Range: {np.min(heart_rates):.1f} - {np.max(heart_rates):.1f} BPM")
        
        if activity_levels:
            activity_counts = {}
            for activity in activity_levels:
                activity_counts[activity] = activity_counts.get(activity, 0) + 1
            
            print("Activity Distribution:")
            for activity, count in activity_counts.items():
                percentage = (count / len(activity_levels)) * 100
                print(f"  {activity}: {percentage:.1f}%")

# Example usage
if __name__ == "__main__":
    integration = LinkBandIntegration()
    integration.run_experiment(duration_seconds=30)
```

This comprehensive Python integration guide provides everything needed to work with the Link Band SDK in Python applications, from basic device control to advanced real-time analysis and visualization. 