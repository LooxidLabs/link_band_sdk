from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.stream_service import StreamService

router = APIRouter()
stream_service = StreamService()

@router.post("/init")
async def init_stream(host: str = "localhost", port: int = 18765) -> Dict[str, Any]:
    """Initialize the streaming server"""
    try:
        success = await stream_service.init_stream(host, port)
        if not success:
            # raise HTTPException(status_code=500, detail="Failed to initialize streaming server")
            return {"status": "fail", "message": "Failed to initialize streaming server"}
        return {"status": "success", "message": "Streaming server initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.post("/start")
async def start_stream() -> Dict[str, Any]:
    """Start streaming"""
    try:
        success = await stream_service.start_stream()
        if not success:
            return {"status": "fail", "message": "Streaming is already running or failed to start"}
        return {"status": "success", "message": "Streaming server initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.post("/stop")
async def stop_stream() -> Dict[str, Any]:
    """Stop streaming"""
    try:
        success = await stream_service.stop_stream()
        if not success:
            return {"status": "fail", "message": "Streaming is not running or failed to stop"}
        return {"status": "success", "message": "Streaming stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Check streaming server health"""
    return await stream_service.health_check()

@router.get("/status")
async def get_stream_status() -> Dict[str, Any]:
    """Get streaming status and statistics"""
    return stream_service.get_stream_status()

@router.get("/connection")
async def get_connection_info() -> Dict[str, Any]:
    """Get WebSocket server connection information"""
    return stream_service.get_connection_info()

@router.get("/device")
async def get_device_info() -> Dict[str, Any]:
    """Get current device information"""
    return stream_service.get_device_info()

@router.get("/info")
async def get_stream_info() -> Dict[str, Any]:
    """Get WebSocket server connection information including host and port"""
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
