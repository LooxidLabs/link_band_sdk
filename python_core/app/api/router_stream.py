from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.services.stream_service import StreamService

router = APIRouter()
stream_service = StreamService()

class StreamInitRequest(BaseModel):
    """Request model for stream initialization"""
    host: str = Field(default="localhost", description="WebSocket server host address", example="localhost")
    port: int = Field(default=18765, description="WebSocket server port number", example=18765)

class StreamResponse(BaseModel):
    """Standard response model for stream operations"""
    status: str = Field(..., description="Operation status", example="success")
    message: str = Field(..., description="Operation message")

class StreamHealthResponse(BaseModel):
    """Response model for stream health check"""
    status: str = Field(..., description="Server status")
    is_streaming: bool = Field(..., description="Whether streaming is active")
    clients_connected: int = Field(..., description="Number of connected clients")
    uptime: Optional[str] = Field(None, description="Server uptime")

class StreamStatusResponse(BaseModel):
    """Response model for stream status"""
    is_running: bool = Field(..., description="Whether streaming server is running")
    is_streaming: bool = Field(..., description="Whether data streaming is active")
    clients_connected: int = Field(..., description="Number of connected WebSocket clients")
    data_rate: Optional[float] = Field(None, description="Data transmission rate (messages/second)")
    total_messages: Optional[int] = Field(None, description="Total messages sent since start")

class ConnectionInfoResponse(BaseModel):
    """Response model for connection information"""
    status: str = Field(..., description="Connection status")
    host: str = Field(..., description="WebSocket server host")
    port: int = Field(..., description="WebSocket server port")
    ws_url: str = Field(..., description="WebSocket connection URL")

class DeviceInfoResponse(BaseModel):
    """Response model for device information"""
    device_connected: bool = Field(..., description="Whether a device is connected")
    device_address: Optional[str] = Field(None, description="Connected device address")
    device_name: Optional[str] = Field(None, description="Connected device name")
    signal_quality: Optional[int] = Field(None, description="Signal quality percentage")

class StreamInfoResponse(BaseModel):
    """Response model for comprehensive stream information"""
    status: str = Field(..., description="Stream status")
    host: str = Field(..., description="WebSocket server host")
    port: int = Field(..., description="WebSocket server port")
    ws_url: str = Field(..., description="WebSocket connection URL")
    server_status: str = Field(..., description="Server status")
    is_streaming: bool = Field(..., description="Whether streaming is active")
    clients_connected: int = Field(..., description="Number of connected clients")
    message: Optional[str] = Field(None, description="Additional status message")

@router.post("/init",
    response_model=StreamResponse,
    summary="Initialize the WebSocket streaming server",
    description="""
    Initialize the WebSocket streaming server with specified host and port.
    
    **Process:**
    1. Sets up WebSocket server configuration
    2. Initializes data streaming channels
    3. Prepares device communication protocols
    4. Validates network connectivity
    
    **Default Configuration:**
    - Host: localhost
    - Port: 18765
    - Protocol: WebSocket (ws://)
    
    **Note:** Server must be initialized before starting streaming or connecting devices.
    """,
    responses={
        200: {
            "description": "Stream server successfully initialized",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "message": "Streaming server initialized"
                    }
                }
            }
        },
        500: {"description": "Failed to initialize streaming server"}
    })
async def init_stream(host: str = "localhost", port: int = 18765) -> Dict[str, Any]:
    """
    Initialize the streaming server
    
    Sets up the WebSocket server for real-time data streaming from Link Band devices.
    
    Args:
        host: Server host address (default: localhost)
        port: Server port number (default: 18765)
        
    Returns:
        Initialization result status
        
    Raises:
        HTTPException: If initialization fails
    """
    try:
        success = await stream_service.init_stream(host, port)
        if not success:
            # raise HTTPException(status_code=500, detail="Failed to initialize streaming server")
            return {"status": "fail", "message": "Failed to initialize streaming server"}
        return {"status": "success", "message": "Streaming server initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.post("/start",
    response_model=StreamResponse,
    summary="Start data streaming",
    description="""
    Start real-time data streaming from connected Link Band device.
    
    **Prerequisites:**
    - Streaming server must be initialized (`/stream/init`)
    - Device must be connected (`/device/connect`)
    - WebSocket clients can connect to receive data
    
    **Data Types Streamed:**
    - EEG data (electroencephalography)
    - PPG data (photoplethysmography)
    - ACC data (accelerometer)
    - Battery status
    - Device metrics
    
    **Streaming Format:** JSON messages via WebSocket
    
    **Note:** Only one streaming session can be active at a time.
    """,
    responses={
        200: {
            "description": "Streaming started successfully",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "message": "Streaming server initialized"
                    }
                }
            }
        },
        400: {"description": "Streaming already running or failed to start"},
        500: {"description": "Internal server error"}
    })
async def start_stream() -> Dict[str, Any]:
    """
    Start streaming
    
    Begins real-time data transmission from the connected Link Band device
    to all connected WebSocket clients.
    
    Returns:
        Streaming start result status
        
    Raises:
        HTTPException: If streaming fails to start
    """
    try:
        success = await stream_service.start_stream()
        if not success:
            return {"status": "fail", "message": "Streaming is already running or failed to start"}
        return {"status": "success", "message": "Streaming server initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.post("/stop",
    response_model=StreamResponse,
    summary="Stop data streaming",
    description="""
    Stop the current data streaming session.
    
    **Process:**
    1. Stops data transmission from device
    2. Notifies all connected WebSocket clients
    3. Maintains server connection for future streaming
    4. Preserves device connection
    
    **Note:** This only stops streaming, not the WebSocket server or device connection.
    Use `/device/disconnect` to disconnect the device.
    """,
    responses={
        200: {
            "description": "Streaming stopped successfully",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "message": "Streaming stopped"
                    }
                }
            }
        },
        400: {"description": "Streaming not running or failed to stop"},
        500: {"description": "Internal server error"}
    })
async def stop_stream() -> Dict[str, Any]:
    """
    Stop streaming
    
    Stops the current data streaming session while maintaining
    the WebSocket server and device connections.
    
    Returns:
        Streaming stop result status
        
    Raises:
        HTTPException: If streaming fails to stop
    """
    try:
        success = await stream_service.stop_stream()
        if not success:
            return {"status": "fail", "message": "Streaming is not running or failed to stop"}
        return {"status": "success", "message": "Streaming stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.get("/health",
    response_model=StreamHealthResponse,
    summary="Check streaming server health",
    description="""
    Perform a comprehensive health check of the streaming server.
    
    **Health Metrics:**
    - Server status (running/stopped)
    - Streaming status (active/inactive)
    - Connected clients count
    - Server uptime
    - Memory usage
    - Network connectivity
    
    **Use Cases:**
    - Monitor server health
    - Diagnose connection issues
    - Check system performance
    - Automated health monitoring
    """,
    responses={
        200: {
            "description": "Health check results",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "is_streaming": True,
                        "clients_connected": 2,
                        "uptime": "00:15:32"
                    }
                }
            }
        },
        500: {"description": "Health check failed"}
    })
async def health_check() -> Dict[str, Any]:
    """
    Check streaming server health
    
    Performs a comprehensive health check including server status,
    streaming status, and client connections.
    
    Returns:
        Health check results
    """
    return await stream_service.health_check()

@router.get("/status",
    response_model=StreamStatusResponse,
    summary="Get detailed streaming status and statistics",
    description="""
    Retrieve detailed information about the current streaming session.
    
    **Information Provided:**
    - Streaming server status
    - Active streaming status
    - Connected clients count
    - Data transmission statistics
    - Performance metrics
    - Error counts
    
    **Use Cases:**
    - Monitor streaming performance
    - Display status in UI
    - Performance analysis
    - Troubleshooting
    """,
    responses={
        200: {
            "description": "Detailed streaming status",
            "content": {
                "application/json": {
                    "example": {
                        "is_running": True,
                        "is_streaming": True,
                        "clients_connected": 2,
                        "data_rate": 125.5,
                        "total_messages": 15032
                    }
                }
            }
        },
        500: {"description": "Failed to get status"}
    })
async def get_stream_status() -> Dict[str, Any]:
    """
    Get streaming status and statistics
    
    Returns detailed information about the current streaming session
    including performance metrics and connection statistics.
    
    Returns:
        Streaming status and statistics
    """
    return stream_service.get_stream_status()

@router.get("/connection",
    response_model=ConnectionInfoResponse,
    summary="Get WebSocket server connection information",
    description="""
    Retrieve WebSocket server connection details for client applications.
    
    **Information Provided:**
    - Server host and port
    - WebSocket URL for connections
    - Connection status
    - Server availability
    
    **Use Cases:**
    - Configure WebSocket clients
    - Verify server accessibility
    - Dynamic connection setup
    - Network troubleshooting
    """,
    responses={
        200: {
            "description": "WebSocket connection information",
            "content": {
                "application/json": {
                    "example": {
                        "status": "available",
                        "host": "localhost",
                        "port": 18765,
                        "ws_url": "ws://localhost:18765"
                    }
                }
            }
        },
        500: {"description": "Failed to get connection info"}
    })
async def get_connection_info() -> Dict[str, Any]:
    """
    Get WebSocket server connection information
    
    Returns the connection details needed for WebSocket clients
    to connect to the streaming server.
    
    Returns:
        WebSocket connection information
    """
    return stream_service.get_connection_info()

@router.get("/device",
    response_model=DeviceInfoResponse,
    summary="Get current device information for streaming",
    description="""
    Retrieve information about the device currently connected for streaming.
    
    **Device Information:**
    - Connection status
    - Device identification (name, address)
    - Signal quality metrics
    - Battery status
    - Data quality indicators
    
    **Use Cases:**
    - Verify device readiness for streaming
    - Monitor signal quality
    - Display device info in streaming UI
    - Troubleshoot connection issues
    """,
    responses={
        200: {
            "description": "Current device information",
            "content": {
                "application/json": {
                    "example": {
                        "device_connected": True,
                        "device_address": "01:23:45:67:89:AB",
                        "device_name": "Link Band 2.0",
                        "signal_quality": 95
                    }
                }
            }
        },
        500: {"description": "Failed to get device info"}
    })
async def get_device_info() -> Dict[str, Any]:
    """
    Get current device information
    
    Returns information about the device currently connected
    and available for streaming.
    
    Returns:
        Device information for streaming
    """
    return stream_service.get_device_info()

@router.get("/info",
    response_model=StreamInfoResponse,
    summary="Get comprehensive streaming server information",
    description="""
    Retrieve comprehensive information about the WebSocket streaming server.
    
    **Comprehensive Information:**
    - Server configuration (host, port, URL)
    - Server and streaming status
    - Connected clients count
    - Health status
    - Initialization status
    
    **Use Cases:**
    - One-stop status check
    - Client configuration
    - System monitoring
    - Debugging and troubleshooting
    
    **Note:** This endpoint combines information from multiple other endpoints
    for convenience and efficiency.
    """,
    responses={
        200: {
            "description": "Comprehensive streaming server information",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "host": "localhost",
                        "port": 18765,
                        "ws_url": "ws://localhost:18765",
                        "server_status": "healthy",
                        "is_streaming": True,
                        "clients_connected": 2
                    }
                }
            }
        },
        500: {"description": "Failed to get stream info"}
    })
async def get_stream_info() -> Dict[str, Any]:
    """
    Get WebSocket server connection information including host and port
    
    Returns comprehensive information about the streaming server
    including configuration, status, and health metrics.
    
    Returns:
        Comprehensive streaming server information
        
    Raises:
        HTTPException: If unable to retrieve stream information
    """
    try:
        info = stream_service.get_connection_info()
        if not info or info.get("status") == "not_initialized":
            return {
                "status": "not_initialized",
                "message": "Streaming server is not initialized",
                "host": "localhost",
                "port": 18765,
                "ws_url": "ws://localhost:18765"
            }
        
        health = await stream_service.health_check()
        return {
            "status": "success",
            "host": info.get("host", "localhost"),
            "port": info.get("port", 18765),
            "ws_url": info.get("ws_url", "ws://localhost:18765"),
            "server_status": health.get("status", "unknown"),
            "is_streaming": health.get("is_streaming", False),
            "clients_connected": health.get("clients_connected", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stream info: {str(e)}")

# WebSocket endpoint placeholder (not implemented)
