# Session Management

Sessions are the basic unit of data collection in Link Band SDK. Each session contains all sensor data collected during a continuous measurement period.

## Session Creation

### Automatic Session Creation
A new session is automatically created when recording starts:

```
Session ID: session_YYYYMMDD_HHMMSS
Example: session_20240101_120000
```

### Manual Session Setup
You can preset session information before starting recording:

- **Session Name**: Automatically configured session name

## Session Structure

### Directory Structure
```
data/
└── session_20240101_120000/
    ├── meta.json                    # Session metadata
    ├── device_eeg_raw.json         # EEG raw data
    ├── device_eeg_processed.json   # EEG processed data
    ├── device_ppg_raw.json         # PPG raw data
    ├── device_ppg_processed.json   # PPG processed data
    ├── device_acc_raw.json         # ACC raw data
    ├── device_acc_processed.json   # ACC processed data
    └── device_bat.json             # Battery status data
```

### Metadata File (meta.json)
```json
{
  "session_info": {
    "session_id": "session_20240101_120000",
    "name": "Baseline Recording",
    "participant_id": "P001",
    "condition": "eyes_closed",
    "start_time": "2024-01-01T12:00:00.000Z",
    "end_time": "2024-01-01T12:05:30.000Z",
    "duration": 330.0,
    "notes": "5-minute measurement in resting state with eyes closed"
  },
  "device_info": {
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "firmware_version": "1.2.3",
    "battery_level": 85
  },
  "data_info": {
    "sensors": ["EEG", "PPG", "ACC"],
    "sampling_rates": {
      "EEG": 250.0,
      "PPG": 50.0,
      "ACC": 25.0
    },
    "file_count": 7,
    "total_size_bytes": 2621440
  }
}
```

You can systematically organize and efficiently utilize Link Band data through session management. 