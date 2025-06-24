# Data Center Module

The Data Center module is a core component responsible for storing, managing, and exporting sensor data collected from Link Band. You can manage measurement sessions and export data in various formats.

## Key Features

### Data Recording
- **Session-based Recording**: Manage each measurement as an independent session
- **Real-time Storage**: Save collected data in real-time

### Session Management
- **Session List**: Display list of all measurement sessions
- **Session Information**: Detailed information and metadata for each session

### Data Export
- **Selective Export**: Export only specific sensor data

## How to Use

### 1. Start Recording

To start data collection:

```
1. Check Link Band connection
2. Check Engine startup
3. Click Data Center tab
4. Click "Start Recording" button
5. Enter session name (optional)
```

### 2. Monitor During Recording

During recording, you can check the following information in real-time:

- **Recording Time**: Current recording elapsed time
- **Data Size**: Size of accumulated data
- **Sensor Status**: Data collection status for each sensor
- **Storage Location**: Directory where data is being saved

### 3. Stop Recording

To stop recording:

```
1. Click "Stop Recording" button
2. Enter session metadata (optional)
3. Confirm save completion
```

## Session Management

### Session List
All measurement sessions are displayed in chronological order:

- **Session ID**: Unique session identifier
- **Start Time**: Recording start time
- **Duration**: Total recording time
- **Data Size**: Total data size of session
- **Sensor Information**: Types of collected sensor data

## Data Export

### Supported Formats

#### JSON Format
```json
{
  "timestamp": [1704110400.0, 1704110400.004, ...],
  "eeg_ch1": [123.45, 124.67, ...],
  "eeg_ch2": [234.56, 235.78, ...],
  "ppg": [345.67, 346.89, ...],
  "acc_x": [0.123, 0.124, ...],
  "acc_y": [0.234, 0.235, ...],
  "acc_z": [0.345, 0.346, ...]
}
```

#### Data Processing
- **Raw Data**: Unfiltered original data
- **Processed Data**: Analyzed data with noise removal and filtering applied (includes indices)

## Storage Management

### Storage Location
Data is saved in the following locations:

- **Windows**: `%APPDATA%/LinkBandSDK/data/`
- **macOS**: `~/Library/Application Support/LinkBandSDK/data/`
- **Linux**: `~/.config/LinkBandSDK/data/`

### Directory Structure
```
data/
├── session_20240101_120000/
│   ├── meta.json
│   ├── device_acc_raw.json
│   ├── device_acc_processed.json
│   ├── device_eeg_raw.json
│   ├── device_eeg_processed.json
│   ├── device_ppg_raw.json
│   └── device_ppg_processed.json
└── session_20240101_130000/
    └── ...
```

## Troubleshooting

### Cannot Start Recording
1. Check Link Band connection status
2. Check Engine startup status
3. Check disk space
4. Check permission settings

### Export Errors
1. Check target directory permissions
2. Check disk space
3. Verify data integrity

You can systematically manage all Link Band data and utilize it for analysis through the Data Center module. 