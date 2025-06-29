from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any
from app.services.stream_service import StreamService

router = APIRouter()

# --- 의존성 주입 함수 ---
def get_stream_service(request: Request) -> StreamService:
    if not hasattr(request.app.state, 'stream_service') or request.app.state.stream_service is None:
        # 이 경우는 main.py의 startup_event에서 StreamService가 제대로 설정되지 않은 경우
        raise HTTPException(status_code=503, detail="StreamService is not available")
    return request.app.state.stream_service
# --- 의존성 주입 함수 끝 ---

@router.post("/init")
async def init_stream(host: str = "localhost", port: int = 18765, stream_svc: StreamService = Depends(get_stream_service)) -> Dict[str, Any]:
    """Initialize the streaming server"""
    try:
        success = await stream_svc.init_stream(host, port)
        if not success:
            # raise HTTPException(status_code=500, detail="Failed to initialize streaming server")
            return {"status": "fail", "message": "Failed to initialize streaming server"}
        return {"status": "success", "message": "Streaming server initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.post("/start")
async def start_stream(stream_svc: StreamService = Depends(get_stream_service)) -> Dict[str, Any]:
    """Start streaming"""
    try:
        success = await stream_svc.start_stream()
        if not success:
            return {"status": "fail", "message": "Streaming is already running or failed to start"}
        return {"status": "success", "message": "Streaming server initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.post("/stop")
async def stop_stream(stream_svc: StreamService = Depends(get_stream_service)) -> Dict[str, Any]:
    """Stop streaming"""
    try:
        success = await stream_svc.stop_stream()
        if not success:
            return {"status": "fail", "message": "Streaming is not running or failed to stop"}
        return {"status": "success", "message": "Streaming stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.get("/health")
async def health_check(stream_svc: StreamService = Depends(get_stream_service)) -> Dict[str, Any]:
    """Check streaming server health"""
    return await stream_svc.health_check()

@router.get("/status")
async def get_stream_status(stream_svc: StreamService = Depends(get_stream_service)) -> Dict[str, Any]:
    """Get streaming status and statistics"""
    return stream_svc.get_stream_status()

@router.get("/connection")
async def get_connection_info(stream_svc: StreamService = Depends(get_stream_service)) -> Dict[str, Any]:
    """Get WebSocket server connection information"""
    return stream_svc.get_connection_info()

@router.get("/device")
async def get_device_info(stream_svc: StreamService = Depends(get_stream_service)) -> Dict[str, Any]:
    """Get current device information"""
    return stream_svc.get_device_info()

@router.get("/info")
async def get_stream_info(stream_svc: StreamService = Depends(get_stream_service)) -> Dict[str, Any]:
    """Get WebSocket server connection information including host and port"""
    try:
        info = stream_svc.get_connection_info()
        if not info or info.get("status") == "not_initialized":
            return {
                "status": "not_initialized",
                "message": "Streaming server is not initialized",
                "host": "127.0.0.1",
                "port": 18765,
                "ws_url": "ws://127.0.0.1:18765"
            }
        
        health = await stream_svc.health_check()
        return {
            "status": "success",
            "host": info.get("host", "127.0.0.1"),
            "port": info.get("port", 18765),
            "ws_url": info.get("ws_url", "ws://127.0.0.1:18765"),
            "server_status": health.get("status", "unknown"),
            "is_streaming": health.get("is_streaming", False),
            "clients_connected": health.get("clients_connected", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stream info: {str(e)}")

# WebSocket endpoint placeholder (not implemented)
