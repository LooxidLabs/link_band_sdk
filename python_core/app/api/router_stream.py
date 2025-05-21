from fastapi import APIRouter

router = APIRouter()

@router.post("/start")
def start_stream():
    return {"result": "stream started"}

@router.post("/stop")
def stop_stream():
    return {"result": "stream stopped"}

# WebSocket endpoint placeholder (not implemented)
