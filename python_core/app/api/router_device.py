from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
# from app.services import device_service # DeviceService는 직접 주입받을 것이므로 주석 처리 또는 삭제 가능
from app.services.device_service import DeviceService
# from app.services.stream_service import StreamService # StreamService 직접 사용 안 함
# from app.core.ws_singleton import ws_server # 삭제
from app.core.server import WebSocketServer # WebSocketServer 임포트

router = APIRouter()

# --- 의존성 주입 함수 --- 
def get_device_service(request: Request) -> DeviceService:
    if not hasattr(request.app.state, 'device_service') or request.app.state.device_service is None:
        # 이 경우는 main.py의 startup_event에서 DeviceService가 제대로 설정되지 않은 경우
        raise HTTPException(status_code=503, detail="DeviceService is not available")
    return request.app.state.device_service

def get_ws_server(request: Request) -> WebSocketServer:
    if not hasattr(request.app.state, 'ws_server') or request.app.state.ws_server is None:
        raise HTTPException(status_code=503, detail="WebSocket server is not available")
    return request.app.state.ws_server
# --- 의존성 주입 함수 끝 --- 

class ConnectRequest(BaseModel):
    address: str

class DeviceRegisterRequest(BaseModel):
    name: str
    address: str

class DeviceUnregisterRequest(BaseModel):
    address: str

@router.get("/scan")
async def search_devices(device_svc: DeviceService = Depends(get_device_service)):
    try:
        devices = await device_svc.scan() # 주입된 device_svc 사용
        return {"devices": devices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.post("/connect")
async def connect_device(req: ConnectRequest, ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    # ws_server_instance.device_manager는 WebSocketServer가 DeviceManager를 가지고 있다고 가정
    # WebSocketServer 클래스에 device_manager 속성이 있는지 확인 필요
    # 또는 DeviceManager를 직접 주입받아야 함
    # 현재 WebSocketServer는 init 시점에 device_manager를 받지 않음.
    # 따라서, DeviceManager를 직접 주입받거나, WebSocketServer가 DeviceManager를 속성으로 갖도록 수정 필요.
    # 여기서는 WebSocketServer가 device_manager를 가지고 있다고 가정하고 진행 (server.py 수정 필요할 수 있음)
    if not hasattr(ws_server_instance, 'device_manager') or ws_server_instance.device_manager is None:
         # 임시로 DeviceManager를 ws_server_instance에 할당 (main.py의 app.state.device_manager 사용)
         # 이 부분은 구조적으로 개선 필요. WebSocketServer가 DeviceManager를 갖거나, DeviceManager를 직접 주입.
         # 지금 수정은 main.py의 app.state.device_manager를 가져와서 사용하는 임시 방편.
         # logger.warning("Dynamically assigning device_manager to ws_server_instance in router_device. מאוד לא מומלץ.")
         # ws_server_instance.device_manager = device_manager_dependency # 아래처럼 device_manager를 직접 주입받는게 나음
        raise HTTPException(status_code=500, detail="DeviceManager not available via WebSocketServer")

    result = await ws_server_instance.device_manager.connect(req.address)
    if not result:
        raise HTTPException(status_code=400, detail="Connection failed")
    return {"result": "connected"}

@router.post("/disconnect")
async def disconnect_device(ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    if not hasattr(ws_server_instance, 'device_manager') or ws_server_instance.device_manager is None:
        raise HTTPException(status_code=500, detail="DeviceManager not available via WebSocketServer")
    result = await ws_server_instance.device_manager.disconnect()
    if not result:
        raise HTTPException(status_code=400, detail="Disconnect failed")
    return {"result": "disconnected"}

@router.get("/status")
def device_status(ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    return ws_server_instance.get_device_status()

@router.post("/register_device")
async def register_device(req: DeviceRegisterRequest, ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    if ws_server_instance.is_device_registered(req.address):
        return {"status": "fail", "message": f"Device {req.address} is already registered"}
    device_info_dict = req.dict()
    success = ws_server_instance.register_device(device_info_dict)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to register device")
    return {"status": "success", "message": f"Device {req.address} registered"}

@router.post("/unregister_device")
async def unregister_device(req: DeviceUnregisterRequest, ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    success = ws_server_instance.unregister_device(req.address)
    if not success:
        return {"status": "fail", "message": f"Device {req.address} is not registered"}
    return {"status": "success", "message": f"Device {req.address} unregistered"}

@router.get("/registered_devices")
async def get_registered_devices(ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    devices = ws_server_instance.get_registered_devices()
    return {"devices": devices, "count": len(devices)} 