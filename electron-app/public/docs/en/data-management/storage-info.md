# Storage Information

Link Band SDK systematically stores and manages collected data in local storage. This document describes data storage structure, locations, and management methods.

## Storage Locations

### Default Paths by Operating System

#### Windows
```
C:\Users\[username]\AppData\Roaming\LinkBandSDK\data\
```

#### macOS
```
/Users/[username]/Library/Application Support/LinkBandSDK/data/
```

#### Linux
```
/home/[username]/.config/LinkBandSDK/data/
```

### Custom Paths
You can change the data storage location in settings:

```json
{
  "storage": {
    "data_directory": "/custom/path/to/data",
    "auto_create": true,
    "permissions": "755"
  }
}
```

## Directory Structure

### Overall Structure
```
LinkBandSDK/
├── data/                           # Measurement data
│   ├── session_20240101_120000/    # Session directories
│   ├── session_20240101_130000/
│   └── ...
├── database/                       # Metadata database
│   └── data_center.db
├── exports/                        # Exported files
│   ├── export_20240101_120000.zip
│   └── ...
├── logs/                          # System logs
│   ├── app.log
│   ├── device.log
│   └── error.log
├── temp/                          # Temporary files
│   └── ...
└── config/                        # Configuration files
    ├── app_config.json
    └── user_preferences.json
```

### Session Directory Structure
```
session_20240101_120000/
├── meta.json                      # Session metadata
├── 015F2A8E-3772-FB6D-2197-548F305983B0_eeg_raw.json
├── 015F2A8E-3772-FB6D-2197-548F305983B0_eeg_processed.json
├── 015F2A8E-3772-FB6D-2197-548F305983B0_ppg_raw.json
├── 015F2A8E-3772-FB6D-2197-548F305983B0_ppg_processed.json
├── 015F2A8E-3772-FB6D-2197-548F305983B0_acc_raw.json
├── 015F2A8E-3772-FB6D-2197-548F305983B0_acc_processed.json
└── 015F2A8E-3772-FB6D-2197-548F305983B0_bat.json
```

## File Naming Conventions

### Session Directory
```
session_YYYYMMDD_HHMMSS
```

### Data Files
```
[DEVICE_ID]_[SENSOR_TYPE]_[DATA_TYPE].json

Examples:
- 015F2A8E-3772-FB6D-2197-548F305983B0_eeg_raw.json
- 015F2A8E-3772-FB6D-2197-548F305983B0_ppg_processed.json
```

### Exported Files
```
export_[SESSION_ID]_[FORMAT]_[TIMESTAMP].[EXTENSION]

Examples:
- export_session_20240101_120000_csv_20240101_150000.zip
- export_batch_20240101_json_20240101_160000.tar.gz
```

## Storage Management

### Disk Usage Monitoring
Real-time monitoring of storage usage:

```json
{
  "storage_info": {
    "total_space": "500 GB",
    "used_space": "125 GB", 
    "available_space": "375 GB",
    "usage_percentage": 25.0,
    "linkband_data_size": "2.5 GB",
    "session_count": 156
  }
}
```

### Automatic Cleanup Policy
Automatically cleans up old data according to configured policies:

```json
{
  "cleanup_policy": {
    "enabled": true,
    "max_storage_size": "10 GB",
    "max_session_age_days": 90,
    "min_free_space": "1 GB",
    "cleanup_schedule": "weekly",
    "preserve_tagged_sessions": true
  }
}
```

### Backup Settings
Automates backup of important data:

```json
{
  "backup": {
    "enabled": true,
    "local_backup": {
      "path": "/backup/linkband/",
      "frequency": "daily",
      "retention_days": 30
    },
    "cloud_backup": {
      "provider": "google_drive",
      "frequency": "weekly",
      "compression": true
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Insufficient Disk Space
```bash
# Check disk usage
df -h

# Find large files
find /path/to/linkband/data -type f -size +100M -ls
```

#### Permission Issues
```bash
# Fix permissions (Linux/macOS)
chmod -R 755 /path/to/linkband/data
chown -R user:group /path/to/linkband/data
```

You can ensure the safety and accessibility of Link Band data through efficient storage management. 