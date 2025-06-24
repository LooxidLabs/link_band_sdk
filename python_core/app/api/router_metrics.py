from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.services import metric_service

router = APIRouter()

class SystemMetrics(BaseModel):
    """System performance metrics model"""
    cpu_usage: float = Field(..., description="CPU usage percentage (0-100)")
    memory_usage: float = Field(..., description="Memory usage percentage (0-100)")
    disk_usage: float = Field(..., description="Disk usage percentage (0-100)")
    uptime: str = Field(..., description="System uptime")

class DataQualityMetrics(BaseModel):
    """Data quality metrics model"""
    signal_quality: float = Field(..., description="Overall signal quality (0-100)")
    data_loss_rate: float = Field(..., description="Data loss percentage (0-100)")
    error_rate: float = Field(..., description="Error rate percentage (0-100)")
    throughput: float = Field(..., description="Data throughput (samples/second)")

class DeviceMetrics(BaseModel):
    """Device performance metrics model"""
    connection_stability: float = Field(..., description="Connection stability (0-100)")
    battery_level: Optional[int] = Field(None, description="Battery level percentage (0-100)")
    signal_strength: Optional[int] = Field(None, description="Signal strength in dBm")
    device_temperature: Optional[float] = Field(None, description="Device temperature in Celsius")

class MetricsResponse(BaseModel):
    """Comprehensive metrics response model"""
    timestamp: str = Field(..., description="Metrics collection timestamp")
    system: SystemMetrics = Field(..., description="System performance metrics")
    data_quality: DataQualityMetrics = Field(..., description="Data quality metrics")
    device: DeviceMetrics = Field(..., description="Device performance metrics")

@router.get("/",
    response_model=MetricsResponse,
    summary="Get comprehensive system and device metrics",
    description="""
    Retrieve comprehensive performance and health metrics for the Link Band SDK system.
    
    **System Metrics:**
    - CPU usage and performance
    - Memory utilization
    - Disk space usage
    - System uptime
    
    **Data Quality Metrics:**
    - Signal quality indicators
    - Data loss and error rates
    - Throughput measurements
    - Processing performance
    
    **Device Metrics:**
    - Connection stability
    - Battery status
    - Signal strength
    - Device temperature
    
    **Use Cases:**
    - System health monitoring
    - Performance optimization
    - Troubleshooting issues
    - Quality assurance
    - Automated monitoring systems
    
    **Update Frequency:**
    Metrics are updated in real-time and reflect the current system state.
    """,
    responses={
        200: {
            "description": "Comprehensive system metrics",
            "content": {
                "application/json": {
                    "example": {
                        "timestamp": "2024-06-24T14:30:22Z",
                        "system": {
                            "cpu_usage": 25.5,
                            "memory_usage": 68.2,
                            "disk_usage": 45.8,
                            "uptime": "2 days, 14:30:22"
                        },
                        "data_quality": {
                            "signal_quality": 95.2,
                            "data_loss_rate": 0.1,
                            "error_rate": 0.05,
                            "throughput": 250.0
                        },
                        "device": {
                            "connection_stability": 98.5,
                            "battery_level": 85,
                            "signal_strength": -45,
                            "device_temperature": 32.5
                        }
                    }
                }
            }
        },
        500: {"description": "Failed to retrieve metrics"}
    })
def get_metrics():
    """
    Get comprehensive system and device metrics
    
    Returns real-time performance and health metrics for the entire
    Link Band SDK system including hardware, software, and data quality indicators.
    
    Returns:
        Comprehensive metrics data
        
    Raises:
        HTTPException: If metrics collection fails
    """
    try:
        return metric_service.get_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve metrics: {str(e)}")

@router.get("/metrics",
    response_model=MetricsResponse,
    summary="Get detailed system metrics (alias for root endpoint)",
    description="""
    Alternative endpoint for retrieving comprehensive system metrics.
    
    This endpoint provides the same functionality as the root metrics endpoint (`/`)
    but with a more explicit path for API clarity.
    
    **Identical Functionality:**
    - Same data as root endpoint
    - Same real-time updates
    - Same comprehensive coverage
    
    **Use Cases:**
    - Explicit API endpoint naming
    - REST API conventions
    - Documentation clarity
    - Client library consistency
    """,
    responses={
        200: {
            "description": "Detailed system metrics",
            "content": {
                "application/json": {
                    "example": {
                        "timestamp": "2024-06-24T14:30:22Z",
                        "system": {
                            "cpu_usage": 25.5,
                            "memory_usage": 68.2,
                            "disk_usage": 45.8,
                            "uptime": "2 days, 14:30:22"
                        },
                        "data_quality": {
                            "signal_quality": 95.2,
                            "data_loss_rate": 0.1,
                            "error_rate": 0.05,
                            "throughput": 250.0
                        },
                        "device": {
                            "connection_stability": 98.5,
                            "battery_level": 85,
                            "signal_strength": -45,
                            "device_temperature": 32.5
                        }
                    }
                }
            }
        },
        500: {"description": "Failed to retrieve detailed metrics"}
    })
def get_metrics_detail():
    """
    Get detailed system metrics
    
    Alternative endpoint that provides the same comprehensive metrics
    as the root endpoint with explicit naming for API clarity.
    
    Returns:
        Detailed system metrics data
        
    Raises:
        HTTPException: If metrics collection fails
    """
    try:
        return metric_service.get_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve detailed metrics: {str(e)}")
