# Data API

The Data API controls storage, management, and export of data collected from Link Band. It provides recording session management and data file manipulation functionality.

## Basic Information

- **Base URL**: `http://localhost:8121`
- **Content-Type**: `application/json`

## Recording Management

### Start Recording

Starts a new data recording session.

```http
POST /data/start-recording
```

**Request Body:**
```json
{
  "session_name": "Baseline Recording",
  "participant_id": "P001",
  "condition": "eyes_closed",
  "sensors": ["EEG", "PPG", "ACC"],
  "notes": "5-minute measurement in relaxed state with eyes closed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recording started successfully",
  "data": {
    "session_id": "session_20240101_120000",
    "session_name": "Baseline Recording",
    "started_at": "2024-01-01T12:00:00.000Z",
    "sensors": ["EEG", "PPG", "ACC"],
    "output_directory": "/data/session_20240101_120000/"
  }
}
```

### Stop Recording

Stops the currently active recording.

```http
POST /data/stop-recording
```

**Request Body:**
```json
{
  "session_id": "session_20240101_120000"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recording stopped successfully",
  "data": {
    "session_id": "session_20240101_120000",
    "stopped_at": "2024-01-01T12:05:30.000Z",
    "duration": 330.0,
    "file_count": 7,
    "total_size": 2621440,
    "files": [
      "meta.json",
      "device_eeg_raw.json",
      "device_eeg_processed.json",
      "device_ppg_raw.json",
      "device_ppg_processed.json",
      "device_acc_raw.json",
      "device_acc_processed.json"
    ]
  }
}
```

### Check Recording Status

Checks the current recording status.

```http
GET /data/recording-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_recording": true,
    "session_id": "session_20240101_120000",
    "session_name": "Baseline Recording",
    "started_at": "2024-01-01T12:00:00.000Z",
    "duration": 120.5,
    "sensors": ["EEG", "PPG", "ACC"],
    "current_file_sizes": {
      "eeg_raw": 1048576,
      "eeg_processed": 524288,
      "ppg_raw": 262144,
      "ppg_processed": 131072,
      "acc_raw": 65536,
      "acc_processed": 32768
    },
    "estimated_total_size": 2064384
  }
}
```

## Session Management

### List Sessions

Retrieves a list of all saved sessions.

```http
GET /data/sessions
```

**Query Parameters:**
- `limit`: Number of sessions to return (default: 50)
- `offset`: Starting position (default: 0)
- `sort`: Sort criteria (`created_at`, `duration`, `size`)
- `order`: Sort order (`asc`, `desc`)
- `filter`: Filter conditions

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "session_id": "session_20240101_120000",
        "session_name": "Baseline Recording",
        "participant_id": "P001",
        "condition": "eyes_closed",
        "start_time": "2024-01-01T12:00:00.000Z",
        "end_time": "2024-01-01T12:05:30.000Z",
        "duration": 330.0,
        "sensors": ["EEG", "PPG", "ACC"],
        "file_count": 7,
        "total_size": 2621440,
        "tags": ["baseline", "eyes_closed"]
      }
    ],
    "total_count": 156,
    "page_info": {
      "limit": 50,
      "offset": 0,
      "has_more": true
    }
  }
}
```

### Session Details

Retrieves detailed information for a specific session.

```http
GET /data/sessions/{session_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_info": {
      "session_id": "session_20240101_120000",
      "session_name": "Baseline Recording",
      "participant_id": "P001",
      "condition": "eyes_closed",
      "start_time": "2024-01-01T12:00:00.000Z",
      "end_time": "2024-01-01T12:05:30.000Z",
      "duration": 330.0,
      "notes": "5-minute measurement in relaxed state with eyes closed"
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
        "PPG": 100.0,
        "ACC": 50.0
      },
      "file_count": 7,
      "total_size": 2621440,
      "files": [
        {
          "filename": "meta.json",
          "size": 1024,
          "type": "metadata"
        },
        {
          "filename": "015F2A8E-3772-FB6D-2197-548F305983B0_eeg_raw.json",
          "size": 1048576,
          "type": "raw_data",
          "sensor": "EEG"
        }
      ]
    },
    "quality_metrics": {
      "eeg_quality": 0.92,
      "ppg_quality": 0.88,
      "acc_quality": 0.95,
      "overall_quality": 0.91
    }
  }
}
```

### Update Session

Updates session metadata.

```http
PUT /data/sessions/{session_id}
```

**Request Body:**
```json
{
  "session_name": "Updated Baseline Recording",
  "participant_id": "P001",
  "condition": "eyes_closed_updated",
  "notes": "Updated notes for the session",
  "tags": ["baseline", "updated", "eyes_closed"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "session_id": "session_20240101_120000",
    "updated_fields": ["session_name", "condition", "notes", "tags"],
    "updated_at": "2024-01-01T13:00:00.000Z"
  }
}
```

### Delete Session

Deletes a session and all its associated files.

```http
DELETE /data/sessions/{session_id}
```

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully",
  "data": {
    "session_id": "session_20240101_120000",
    "deleted_files": 7,
    "freed_space": 2621440,
    "deleted_at": "2024-01-01T13:00:00.000Z"
  }
}
```

## File Management

### List Session Files

Lists all files in a specific session.

```http
GET /data/sessions/{session_id}/files
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "session_20240101_120000",
    "files": [
      {
        "filename": "meta.json",
        "path": "/data/session_20240101_120000/meta.json",
        "size": 1024,
        "type": "metadata",
        "created_at": "2024-01-01T12:00:00.000Z",
        "modified_at": "2024-01-01T12:05:30.000Z"
      },
      {
        "filename": "015F2A8E-3772-FB6D-2197-548F305983B0_eeg_raw.json",
        "path": "/data/session_20240101_120000/015F2A8E-3772-FB6D-2197-548F305983B0_eeg_raw.json",
        "size": 1048576,
        "type": "raw_data",
        "sensor": "EEG",
        "sample_count": 75000,
        "duration": 300.0,
        "created_at": "2024-01-01T12:00:00.000Z",
        "modified_at": "2024-01-01T12:05:00.000Z"
      }
    ],
    "total_files": 7,
    "total_size": 2621440
  }
}
```

### Download File

Downloads a specific file from a session.

```http
GET /data/sessions/{session_id}/files/{filename}
```

**Response:** File content with appropriate headers
- `Content-Type`: `application/json` or `text/csv`
- `Content-Disposition`: `attachment; filename="filename"`

### Delete File

Deletes a specific file from a session.

```http
DELETE /data/sessions/{session_id}/files/{filename}
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "filename": "015F2A8E-3772-FB6D-2197-548F305983B0_eeg_raw.json",
    "size": 1048576,
    "deleted_at": "2024-01-01T13:00:00.000Z"
  }
}
```

## Data Export

### Export Session

Exports session data in various formats.

```http
POST /data/sessions/{session_id}/export
```

**Request Body:**
```json
{
  "format": "json" | "csv" | "mat" | "edf",
  "sensors": ["EEG", "PPG", "ACC"],
  "data_types": ["raw", "processed"],
  "compression": "zip" | "gzip" | "none",
  "include_metadata": true,
  "time_range": {
    "start": "2024-01-01T12:00:00.000Z",
    "end": "2024-01-01T12:05:00.000Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Export started successfully",
  "data": {
    "export_id": "export_20240101_130000",
    "session_id": "session_20240101_120000",
    "format": "csv",
    "estimated_size": 5242880,
    "estimated_time": 30,
    "status": "processing"
  }
}
```

### Check Export Status

Checks the status of an export operation.

```http
GET /data/exports/{export_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "export_id": "export_20240101_130000",
    "session_id": "session_20240101_120000",
    "status": "completed",
    "progress": 100,
    "format": "csv",
    "file_path": "/temp_exports/session_20240101_120000.zip",
    "file_size": 5242880,
    "created_at": "2024-01-01T13:00:00.000Z",
    "completed_at": "2024-01-01T13:00:30.000Z",
    "download_url": "/data/exports/export_20240101_130000/download"
  }
}
```

### Download Export

Downloads the exported file.

```http
GET /data/exports/{export_id}/download
```

**Response:** Exported file with appropriate headers

### List Exports

Lists all export operations.

```http
GET /data/exports
```

**Query Parameters:**
- `session_id`: Filter by session ID
- `status`: Filter by status (`processing`, `completed`, `failed`)
- `limit`: Number of exports to return
- `offset`: Starting position

**Response:**
```json
{
  "success": true,
  "data": {
    "exports": [
      {
        "export_id": "export_20240101_130000",
        "session_id": "session_20240101_120000",
        "status": "completed",
        "format": "csv",
        "file_size": 5242880,
        "created_at": "2024-01-01T13:00:00.000Z",
        "completed_at": "2024-01-01T13:00:30.000Z"
      }
    ],
    "total_count": 25,
    "page_info": {
      "limit": 50,
      "offset": 0,
      "has_more": false
    }
  }
}
```

## Data Analysis

### Basic Statistics

Gets basic statistics for session data.

```http
GET /data/sessions/{session_id}/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "session_20240101_120000",
    "duration": 330.0,
    "sensors": {
      "EEG": {
        "total_samples": 75000,
        "sampling_rate": 250.0,
        "channels": 4,
        "quality_metrics": {
          "average_quality": 0.92,
          "good_signal_percentage": 95.2,
          "artifact_percentage": 4.8
        },
        "signal_statistics": {
          "mean_amplitude": [125.3, 98.7, 156.2, 87.9],
          "std_amplitude": [45.2, 38.1, 52.7, 29.8],
          "min_amplitude": [-250.0, -180.0, -300.0, -150.0],
          "max_amplitude": [280.0, 220.0, 350.0, 180.0]
        }
      },
      "PPG": {
        "total_samples": 15000,
        "sampling_rate": 50.0,
        "quality_metrics": {
          "average_quality": 0.88,
          "good_signal_percentage": 92.1
        },
        "heart_rate_statistics": {
          "mean_hr": 72.5,
          "std_hr": 8.3,
          "min_hr": 58.0,
          "max_hr": 95.0,
          "hrv_rmssd": 45.2
        }
      },
      "ACC": {
        "total_samples": 7500,
        "sampling_rate": 25.0,
        "quality_metrics": {
          "average_quality": 0.95
        },
        "motion_statistics": {
          "mean_activity": 0.15,
          "max_activity": 2.3,
          "motion_periods": 12,
          "still_percentage": 78.5
        }
      }
    }
  }
}
```

### Signal Quality Report

Gets detailed signal quality analysis.

```http
GET /data/sessions/{session_id}/quality
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "session_20240101_120000",
    "overall_quality": 0.91,
    "quality_timeline": [
      {
        "timestamp": "2024-01-01T12:00:00.000Z",
        "eeg_quality": 0.95,
        "ppg_quality": 0.88,
        "acc_quality": 0.92
      }
    ],
    "issues_detected": [
      {
        "type": "electrode_disconnection",
        "sensor": "EEG",
        "channel": 2,
        "start_time": "2024-01-01T12:02:15.000Z",
        "end_time": "2024-01-01T12:02:18.000Z",
        "severity": "medium"
      }
    ],
    "recommendations": [
      "Check electrode contact for EEG channel 2",
      "Consider re-recording segments with quality below 0.8"
    ]
  }
}
```

## Error Responses

### Error Format

All API errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional error context",
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

### Common Error Codes

- `SESSION_NOT_FOUND`: Session ID does not exist
- `RECORDING_IN_PROGRESS`: Cannot perform operation while recording
- `INVALID_FORMAT`: Unsupported export format
- `INSUFFICIENT_SPACE`: Not enough disk space
- `FILE_NOT_FOUND`: Requested file does not exist
- `EXPORT_FAILED`: Export operation failed
- `INVALID_PARAMETERS`: Invalid request parameters
- `PERMISSION_DENIED`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Usage Examples

### Python

```python
import requests
import json

# Base URL
base_url = "http://localhost:8121"

# Start recording
def start_recording():
    data = {
        "session_name": "Test Recording",
        "participant_id": "P001",
        "condition": "eyes_closed",
        "sensors": ["EEG", "PPG", "ACC"],
        "notes": "Test recording session"
    }
    
    response = requests.post(f"{base_url}/data/start-recording", json=data)
    return response.json()

# Stop recording
def stop_recording(session_id):
    data = {"session_id": session_id}
    response = requests.post(f"{base_url}/data/stop-recording", json=data)
    return response.json()

# List sessions
def list_sessions():
    response = requests.get(f"{base_url}/data/sessions")
    return response.json()

# Export session
def export_session(session_id):
    data = {
        "format": "csv",
        "sensors": ["EEG", "PPG", "ACC"],
        "data_types": ["raw", "processed"],
        "compression": "zip",
        "include_metadata": True
    }
    
    response = requests.post(f"{base_url}/data/sessions/{session_id}/export", json=data)
    return response.json()

# Example usage
if __name__ == "__main__":
    # Start recording
    result = start_recording()
    if result["success"]:
        session_id = result["data"]["session_id"]
        print(f"Recording started: {session_id}")
        
        # Wait for some time...
        import time
        time.sleep(10)
        
        # Stop recording
        stop_result = stop_recording(session_id)
        if stop_result["success"]:
            print("Recording stopped successfully")
            
            # Export session
            export_result = export_session(session_id)
            if export_result["success"]:
                export_id = export_result["data"]["export_id"]
                print(f"Export started: {export_id}")
```

### JavaScript/TypeScript

```typescript
class DataAPI {
    private baseUrl = 'http://localhost:8121';
    
    async startRecording(sessionData: any) {
        const response = await fetch(`${this.baseUrl}/data/start-recording`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sessionData)
        });
        
        return await response.json();
    }
    
    async stopRecording(sessionId: string) {
        const response = await fetch(`${this.baseUrl}/data/stop-recording`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ session_id: sessionId })
        });
        
        return await response.json();
    }
    
    async listSessions(params: any = {}) {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${this.baseUrl}/data/sessions?${queryString}`);
        
        return await response.json();
    }
    
    async exportSession(sessionId: string, exportOptions: any) {
        const response = await fetch(`${this.baseUrl}/data/sessions/${sessionId}/export`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exportOptions)
        });
        
        return await response.json();
    }
}

// Example usage
const dataAPI = new DataAPI();

async function recordingExample() {
    try {
        // Start recording
        const sessionData = {
            session_name: "Test Recording",
            participant_id: "P001",
            condition: "eyes_closed",
            sensors: ["EEG", "PPG", "ACC"],
            notes: "Test recording session"
        };
        
        const startResult = await dataAPI.startRecording(sessionData);
        if (startResult.success) {
            const sessionId = startResult.data.session_id;
            console.log(`Recording started: ${sessionId}`);
            
            // Wait for some time...
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Stop recording
            const stopResult = await dataAPI.stopRecording(sessionId);
            if (stopResult.success) {
                console.log("Recording stopped successfully");
                
                // Export session
                const exportOptions = {
                    format: "csv",
                    sensors: ["EEG", "PPG", "ACC"],
                    data_types: ["raw", "processed"],
                    compression: "zip",
                    include_metadata: true
                };
                
                const exportResult = await dataAPI.exportSession(sessionId, exportOptions);
                if (exportResult.success) {
                    console.log(`Export started: ${exportResult.data.export_id}`);
                }
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
```