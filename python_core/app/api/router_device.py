from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import device_service

router = APIRouter()

class ConnectRequest(BaseModel):
    address: str

@router.get("/search")
async def search_devices():
    devices = await device_service.scan()
    return {"devices": devices}

@router.post("/connect")
async def connect_device(req: ConnectRequest):
    result = await device_service.connect(req.address)
    if not result:
        raise HTTPException(status_code=400, detail="Connection failed")
    return {"result": "connected"}

@router.post("/disconnect")
async def disconnect_device():
    result = await device_service.disconnect()
    if not result:
        raise HTTPException(status_code=400, detail="Disconnect failed")
    return {"result": "disconnected"}

@router.get("/status")
def device_status():
    return device_service.status() 