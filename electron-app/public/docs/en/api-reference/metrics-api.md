# Metrics API

The Metrics API provides comprehensive system monitoring, performance analysis, and data quality assessment for Link Band SDK operations.

## Overview

The Metrics API enables real-time monitoring of:
- System performance metrics (CPU, memory, disk usage)
- Data quality indicators
- Device performance statistics
- API usage analytics
- Error tracking and diagnostics

## Base Information

- **Base URL**: `http://localhost:8121`
- **Content-Type**: `application/json`

## System Metrics

### Get System Performance

Retrieves current system performance metrics.

```http
GET /metrics/system
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "cpu": {
      "usage_percent": 25.5,
      "cores": 8,
      "frequency_mhz": 2800,
      "temperature_celsius": 45.2
    },
    "memory": {
      "total_bytes": 17179869184,
      "used_bytes": 8589934592,
      "available_bytes": 8589934592,
      "usage_percent": 50.0,
      "swap_total_bytes": 2147483648,
      "swap_used_bytes": 0
    },
    "disk": {
      "total_bytes": 1099511627776,
      "used_bytes": 549755813888,
      "available_bytes": 549755813888,
      "usage_percent": 50.0,
      "read_iops": 150,
      "write_iops": 75
    },
    "network": {
      "bytes_sent": 1048576000,
      "bytes_received": 2097152000,
      "packets_sent": 1000000,
      "packets_received": 1500000,
      "errors": 0
    }
  }
}
```

### Get Process Metrics

Retrieves metrics specific to Link Band SDK processes.

```http
GET /metrics/process
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "main_process": {
      "pid": 12345,
      "cpu_percent": 15.2,
      "memory_bytes": 134217728,
      "threads": 8,
      "uptime_seconds": 3600
    },
    "engine_process": {
      "pid": 12346,
      "cpu_percent": 8.5,
      "memory_bytes": 67108864,
      "threads": 4,
      "uptime_seconds": 3600
    },
    "data_recorder": {
      "pid": 12347,
      "cpu_percent": 5.1,
      "memory_bytes": 33554432,
      "threads": 2,
      "uptime_seconds": 1800
    }
  }
}
```

## Data Quality Metrics

### Get Signal Quality

Retrieves real-time signal quality metrics for all sensors.

```http
GET /metrics/signal-quality
```

**Query Parameters:**
- `device_id`: Filter by specific device (optional)
- `sensor`: Filter by sensor type (`eeg`, `ppg`, `acc`) (optional)
- `time_window`: Time window in seconds (default: 60)

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
    "overall_quality": 0.92,
    "sensors": {
      "eeg": {
        "overall_quality": 0.95,
        "signal_to_noise_ratio": 25.6,
        "artifact_percentage": 2.3,
        "electrode_impedance": [5.2, 4.8, 6.1, 5.5],
        "channel_quality": [0.96, 0.94, 0.93, 0.97],
        "frequency_analysis": {
          "delta_power": 15.2,
          "theta_power": 12.8,
          "alpha_power": 18.5,
          "beta_power": 14.3,
          "gamma_power": 8.7
        }
      },
      "ppg": {
        "overall_quality": 0.88,
        "signal_to_noise_ratio": 18.4,
        "perfusion_index": 2.1,
        "motion_artifact_level": 0.15,
        "heart_rate_variability": {
          "rmssd": 45.2,
          "sdnn": 52.8,
          "pnn50": 15.5
        }
      },
      "acc": {
        "overall_quality": 0.94,
        "noise_level": 0.02,
        "calibration_accuracy": 0.98,
        "motion_detection": {
          "activity_level": "low",
          "movement_intensity": 0.15,
          "stability_index": 0.92
        }
      }
    }
  }
}
```

### Get Data Completeness

Analyzes data completeness and identifies gaps or missing samples.

```http
GET /metrics/data-completeness
```

**Query Parameters:**
- `session_id`: Specific session to analyze (optional)
- `start_time`: Start time for analysis (ISO 8601)
- `end_time`: End time for analysis (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis_period": {
      "start_time": "2024-01-01T12:00:00.000Z",
      "end_time": "2024-01-01T12:05:00.000Z",
      "duration_seconds": 300
    },
    "completeness": {
      "eeg": {
        "expected_samples": 75000,
        "received_samples": 74850,
        "completeness_percent": 99.8,
        "missing_intervals": [
          {
            "start_time": "2024-01-01T12:02:15.000Z",
            "end_time": "2024-01-01T12:02:16.200Z",
            "duration_seconds": 1.2,
            "missing_samples": 300
          }
        ]
      },
      "ppg": {
        "expected_samples": 15000,
        "received_samples": 14995,
        "completeness_percent": 99.97,
        "missing_intervals": []
      },
      "acc": {
        "expected_samples": 7500,
        "received_samples": 7500,
        "completeness_percent": 100.0,
        "missing_intervals": []
      }
    }
  }
}
```

## Performance Metrics

### Get API Performance

Retrieves API endpoint performance statistics.

```http
GET /metrics/api-performance
```

**Query Parameters:**
- `endpoint`: Filter by specific endpoint (optional)
- `time_window`: Time window in seconds (default: 3600)

**Response:**
```json
{
  "success": true,
  "data": {
    "time_window_seconds": 3600,
    "total_requests": 1250,
    "average_response_time_ms": 45.2,
    "endpoints": {
      "/device/scan": {
        "request_count": 25,
        "average_response_time_ms": 1200.5,
        "min_response_time_ms": 800.0,
        "max_response_time_ms": 2500.0,
        "error_count": 2,
        "success_rate": 92.0
      },
      "/device/connect": {
        "request_count": 15,
        "average_response_time_ms": 3500.2,
        "min_response_time_ms": 2000.0,
        "max_response_time_ms": 8000.0,
        "error_count": 1,
        "success_rate": 93.3
      },
      "/data/start-recording": {
        "request_count": 50,
        "average_response_time_ms": 150.8,
        "min_response_time_ms": 100.0,
        "max_response_time_ms": 300.0,
        "error_count": 0,
        "success_rate": 100.0
      }
    }
  }
}
```

### Get Streaming Performance

Analyzes real-time data streaming performance.

```http
GET /metrics/streaming-performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "active_streams": 3,
    "total_data_throughput_mbps": 2.5,
    "websocket_connections": {
      "total_connections": 5,
      "active_connections": 3,
      "messages_sent": 125000,
      "messages_received": 1500,
      "average_latency_ms": 12.5,
      "connection_errors": 2
    },
    "data_processing": {
      "raw_data_rate_hz": 325,
      "processed_data_rate_hz": 2,
      "processing_latency_ms": 25.8,
      "buffer_utilization_percent": 65.2,
      "dropped_samples": 15
    },
    "sensors": {
      "eeg": {
        "sampling_rate_hz": 250,
        "transmission_rate_hz": 25,
        "data_throughput_kbps": 800,
        "latency_ms": 20.5
      },
      "ppg": {
        "sampling_rate_hz": 50,
        "transmission_rate_hz": 50,
        "data_throughput_kbps": 200,
        "latency_ms": 15.2
      },
      "acc": {
        "sampling_rate_hz": 25,
        "transmission_rate_hz": 30,
        "data_throughput_kbps": 100,
        "latency_ms": 18.7
      }
    }
  }
}
```

## Device Metrics

### Get Device Status

Retrieves comprehensive device status and health metrics.

```http
GET /metrics/device-status
```

**Query Parameters:**
- `device_id`: Specific device ID (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "connected_devices": 1,
    "devices": [
      {
        "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
        "device_name": "Link Band",
        "connection_status": "connected",
        "connection_quality": {
          "signal_strength_dbm": -45,
          "connection_stability": 0.95,
          "packet_loss_percent": 0.2,
          "reconnection_count": 0
        },
        "battery": {
          "level_percent": 85,
          "voltage": 3.7,
          "is_charging": false,
          "temperature_celsius": 25.5,
          "estimated_time_remaining_hours": 12.5,
          "charge_cycles": 156
        },
        "firmware": {
          "version": "1.2.3",
          "build_date": "2024-01-01",
          "update_available": false
        },
        "sensors": {
          "eeg": {
            "status": "active",
            "sampling_rate_hz": 250,
            "channels_active": 4,
            "electrode_impedance": [5.2, 4.8, 6.1, 5.5]
          },
          "ppg": {
            "status": "active",
            "sampling_rate_hz": 50,
            "led_current_ma": 15.5,
            "photodiode_sensitivity": 0.85
          },
          "acc": {
            "status": "active",
            "sampling_rate_hz": 25,
            "range_g": 16,
            "calibration_status": "calibrated"
          }
        }
      }
    ]
  }
}
```

## Error and Diagnostic Metrics

### Get Error Statistics

Retrieves error statistics and diagnostic information.

```http
GET /metrics/errors
```

**Query Parameters:**
- `severity`: Filter by error severity (`low`, `medium`, `high`, `critical`) (optional)
- `category`: Filter by error category (optional)
- `time_window`: Time window in seconds (default: 3600)

**Response:**
```json
{
  "success": true,
  "data": {
    "time_window_seconds": 3600,
    "total_errors": 15,
    "error_rate_per_hour": 15.0,
    "severity_breakdown": {
      "critical": 0,
      "high": 2,
      "medium": 5,
      "low": 8
    },
    "category_breakdown": {
      "device_connection": 5,
      "data_processing": 3,
      "api_errors": 4,
      "system_errors": 3
    },
    "recent_errors": [
      {
        "timestamp": "2024-01-01T11:58:30.000Z",
        "severity": "medium",
        "category": "device_connection",
        "error_code": "DEVICE_TIMEOUT",
        "message": "Device connection timeout after 10 seconds",
        "context": {
          "device_id": "015F2A8E-3772-FB6D-2197-548F305983B0",
          "retry_count": 3
        }
      }
    ]
  }
}
```

### Get Health Check

Provides overall system health assessment.

```http
GET /metrics/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "overall_status": "healthy",
    "components": {
      "api_server": {
        "status": "healthy",
        "response_time_ms": 5.2,
        "uptime_seconds": 7200
      },
      "websocket_server": {
        "status": "healthy",
        "active_connections": 3,
        "uptime_seconds": 7200
      },
      "device_manager": {
        "status": "healthy",
        "connected_devices": 1,
        "last_scan_time": "2024-01-01T11:55:00.000Z"
      },
      "data_recorder": {
        "status": "healthy",
        "active_recordings": 1,
        "disk_space_available_gb": 512.5
      },
      "signal_processor": {
        "status": "healthy",
        "processing_queue_size": 25,
        "average_processing_time_ms": 15.8
      }
    },
    "alerts": [
      {
        "level": "warning",
        "component": "device_manager",
        "message": "Device battery level below 20%",
        "timestamp": "2024-01-01T11:45:00.000Z"
      }
    ]
  }
}
```

## Historical Metrics

### Get Metrics History

Retrieves historical metrics data for trend analysis.

```http
GET /metrics/history
```

**Query Parameters:**
- `metric_type`: Type of metric (`system`, `performance`, `quality`) (required)
- `start_time`: Start time for data retrieval (ISO 8601) (required)
- `end_time`: End time for data retrieval (ISO 8601) (required)
- `interval`: Data aggregation interval (`1m`, `5m`, `15m`, `1h`, `1d`) (default: `5m`)

**Response:**
```json
{
  "success": true,
  "data": {
    "metric_type": "system",
    "interval": "5m",
    "data_points": [
      {
        "timestamp": "2024-01-01T11:00:00.000Z",
        "cpu_usage_percent": 22.5,
        "memory_usage_percent": 48.2,
        "disk_usage_percent": 50.0
      },
      {
        "timestamp": "2024-01-01T11:05:00.000Z",
        "cpu_usage_percent": 25.1,
        "memory_usage_percent": 49.8,
        "disk_usage_percent": 50.1
      }
    ]
  }
}
```

## Usage Examples

### Python

```python
import requests
import json

class MetricsAPI:
    def __init__(self, base_url="http://localhost:8121"):
        self.base_url = base_url
    
    def get_system_metrics(self):
        """Get current system performance metrics"""
        response = requests.get(f"{self.base_url}/metrics/system")
        return response.json()
    
    def get_signal_quality(self, device_id=None, sensor=None):
        """Get signal quality metrics"""
        params = {}
        if device_id:
            params['device_id'] = device_id
        if sensor:
            params['sensor'] = sensor
            
        response = requests.get(f"{self.base_url}/metrics/signal-quality", params=params)
        return response.json()
    
    def monitor_health(self):
        """Monitor overall system health"""
        response = requests.get(f"{self.base_url}/metrics/health")
        health_data = response.json()
        
        if health_data["success"]:
            status = health_data["data"]["overall_status"]
            print(f"System Status: {status}")
            
            # Check for alerts
            alerts = health_data["data"]["alerts"]
            if alerts:
                print("Active Alerts:")
                for alert in alerts:
                    print(f"  {alert['level']}: {alert['message']}")
        
        return health_data

# Example usage
metrics = MetricsAPI()

# Get system performance
system_metrics = metrics.get_system_metrics()
print(f"CPU Usage: {system_metrics['data']['cpu']['usage_percent']}%")

# Monitor signal quality
quality_metrics = metrics.get_signal_quality()
print(f"Overall Quality: {quality_metrics['data']['overall_quality']}")

# Health monitoring
health_status = metrics.monitor_health()
```

### JavaScript/TypeScript

```typescript
class MetricsAPI {
    private baseUrl = 'http://localhost:8121';
    
    async getSystemMetrics() {
        const response = await fetch(`${this.baseUrl}/metrics/system`);
        return await response.json();
    }
    
    async getSignalQuality(deviceId?: string, sensor?: string) {
        const params = new URLSearchParams();
        if (deviceId) params.append('device_id', deviceId);
        if (sensor) params.append('sensor', sensor);
        
        const response = await fetch(`${this.baseUrl}/metrics/signal-quality?${params}`);
        return await response.json();
    }
    
    async getStreamingPerformance() {
        const response = await fetch(`${this.baseUrl}/metrics/streaming-performance`);
        return await response.json();
    }
    
    async monitorMetrics() {
        try {
            // Get various metrics
            const [system, quality, performance] = await Promise.all([
                this.getSystemMetrics(),
                this.getSignalQuality(),
                this.getStreamingPerformance()
            ]);
            
            return {
                system: system.data,
                quality: quality.data,
                performance: performance.data
            };
        } catch (error) {
            console.error('Error fetching metrics:', error);
            throw error;
        }
    }
}

// Example usage
const metrics = new MetricsAPI();

// Real-time monitoring
setInterval(async () => {
    try {
        const data = await metrics.monitorMetrics();
        console.log('CPU Usage:', data.system.cpu.usage_percent + '%');
        console.log('Signal Quality:', data.quality.overall_quality);
        console.log('Streaming Latency:', data.performance.websocket_connections.average_latency_ms + 'ms');
    } catch (error) {
        console.error('Monitoring error:', error);
    }
}, 5000); // Update every 5 seconds
``` 