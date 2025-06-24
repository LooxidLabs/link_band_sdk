# Data Formats

Link Band SDK stores and processes various sensor data in standardized formats. This document describes the format and structure of each sensor data type.

## Supported Sensor Data

### EEG (Electroencephalography)
- **Number of Channels**: Up to 8 channels
- **Sampling Rate**: 250Hz (default)
- **Data Type**: 16-bit signed integer
- **Unit**: μV (microvolts)

### PPG (Photoplethysmography)
- **Number of Channels**: 1 channel
- **Sampling Rate**: 100Hz (default)
- **Data Type**: 16-bit unsigned integer
- **Unit**: ADC counts

### ACC (Accelerometer)
- **Axes**: X, Y, Z 3 axes
- **Sampling Rate**: 50Hz (default)
- **Data Type**: 16-bit signed integer
- **Unit**: mg (milliG)

## File Formats

### JSON Format

#### Raw Data
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

#### Processed Data
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

### CSV Format

#### EEG Data
```csv
timestamp,CH1,CH2,CH3,CH4
1704110400.000,123.45,234.56,345.67,456.78
1704110400.004,124.67,235.78,346.89,457.90
1704110400.008,125.89,236.90,347.01,458.12
```

#### PPG Data
```csv
timestamp,PPG
1704110400.000,2048
1704110400.010,2056
1704110400.020,2064
```

#### ACC Data
```csv
timestamp,ACC_X,ACC_Y,ACC_Z
1704110400.000,0.123,0.456,0.789
1704110400.020,0.124,0.457,0.790
1704110400.040,0.125,0.458,0.791
```

### MAT Format (MATLAB)

.mat file format for use in MATLAB:

```matlab
% Load file
data = load('session_20240101_120000_eeg.mat');

% Access data
timestamps = data.timestamp;
eeg_ch1 = data.CH1;
eeg_ch2 = data.CH2;
sampling_rate = data.metadata.sampling_rate;
```

## Metadata Structure

Each data file includes the following metadata:

### Common Metadata
```json
{
  "device_id": "Unique device identifier",
  "session_id": "Session identifier",
  "start_time": "Start time (ISO 8601)",
  "end_time": "End time (ISO 8601)",
  "duration": "Duration (seconds)",
  "sampling_rate": "Sampling rate (Hz)",
  "data_points": "Total number of data points",
  "file_version": "File format version"
}
```

### Sensor-Specific Metadata

#### EEG Metadata
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

#### PPG Metadata
```json
{
  "sensor_type": "PPG",
  "wavelength": "660nm",
  "led_current": "20mA",
  "gain": "x4",
  "contact_quality": "good"
}
```

#### ACC Metadata
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

## Data Quality Metrics

Each data file includes quality assessment metrics:

### EEG Quality Metrics
```json
{
  "quality_metrics": {
    "signal_to_noise_ratio": 25.6,
    "artifact_percentage": 2.3,
    "electrode_contact": {
      "CH1": "good",
      "CH2": "excellent",
      "CH3": "fair",
      "CH4": "good"
    },
    "frequency_analysis": {
      "alpha_power": 45.2,
      "beta_power": 23.1,
      "theta_power": 18.7,
      "delta_power": 13.0
    }
  }
}
``` 