from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import device_service
from app.services.device_service import DeviceService
from app.services.stream_service import StreamService
from app.core.ws_singleton import ws_server

router = APIRouter()
device_service = DeviceService()
stream_service = StreamService()

class ConnectRequest(BaseModel):
    address: str

class DeviceRegisterRequest(BaseModel):
    name: str
    address: str

class DeviceUnregisterRequest(BaseModel):
    address: str

@router.get("/scan")
async def search_devices():
    try:
        devices = await device_service.scan()
        return {"devices": devices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.post("/connect")
async def connect_device(req: ConnectRequest):
    result = await ws_server.device_manager.connect(req.address)
    if not result:
        raise HTTPException(status_code=400, detail="Connection failed")
    return {"result": "connected"}

@router.post("/disconnect")
async def disconnect_device():
    result = await ws_server.device_manager.disconnect()
    if not result:
        raise HTTPException(status_code=400, detail="Disconnect failed")
    return {"result": "disconnected"}

@router.get("/status")
def device_status():
    return ws_server.get_device_status()

@router.post("/register_device")
async def register_device(req: DeviceRegisterRequest):
    if ws_server.is_device_registered(req.address):
        return {"status": "fail", "message": f"Device {req.address} is already registered"}
    success = ws_server.register_device(req.dict())
    if not success:
        raise HTTPException(status_code=400, detail="Failed to register device")
    return {"status": "success", "message": f"Device {req.address} registered"}

@router.post("/unregister_device")
async def unregister_device(req: DeviceUnregisterRequest):
    success = ws_server.unregister_device(req.address)
    if not success:
        return {"status": "fail", "message": f"Device {req.address} is not registered"}
    return {"status": "success", "message": f"Device {req.address} unregistered"}

@router.get("/registered_devices")
async def get_registered_devices():
    devices = ws_server.get_registered_devices()
    return {"devices": devices, "count": len(devices)} 