from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
# from app.services import device_service # DeviceService는 직접 주입받을 것이므로 주석 처리 또는 삭제 가능
from app.services.device_service import DeviceService
# from app.services.stream_service import StreamService # StreamService 직접 사용 안 함
# from app.core.ws_singleton import ws_server # 삭제
from app.core.server import WebSocketServer # WebSocketServer 임포트

router = APIRouter()

# --- 의존성 주입 함수 --- 
def get_device_service(request: Request) -> DeviceService:
    """Get DeviceService instance from application state"""
    if not hasattr(request.app.state, 'device_service') or request.app.state.device_service is None:
        # 이 경우는 main.py의 startup_event에서 DeviceService가 제대로 설정되지 않은 경우
        raise HTTPException(status_code=503, detail="DeviceService is not available")
    return request.app.state.device_service

def get_ws_server(request: Request) -> WebSocketServer:
    """Get WebSocketServer instance from application state"""
    if not hasattr(request.app.state, 'ws_server') or request.app.state.ws_server is None:
        raise HTTPException(status_code=503, detail="WebSocket server is not available")
    return request.app.state.ws_server
# --- 의존성 주입 함수 끝 --- 

class ConnectRequest(BaseModel):
    """Request model for device connection"""
    address: str = Field(..., description="Bluetooth address of the device (e.g., 'AA:BB:CC:DD:EE:FF')", example="01:23:45:67:89:AB")

class DeviceRegisterRequest(BaseModel):
    """Request model for device registration"""
    name: str = Field(..., description="User-friendly name for the device", example="Link Band Device #1")
    address: str = Field(..., description="Bluetooth address of the device", example="01:23:45:67:89:AB")

class DeviceUnregisterRequest(BaseModel):
    """Request model for device unregistration"""
    address: str = Field(..., description="Bluetooth address of the device to unregister", example="01:23:45:67:89:AB")

class DeviceInfo(BaseModel):
    """Device information model"""
    name: str = Field(..., description="Device name")
    address: str = Field(..., description="Bluetooth address")
    rssi: Optional[int] = Field(None, description="Signal strength in dBm")
    is_connected: bool = Field(False, description="Connection status")

class DeviceListResponse(BaseModel):
    """Response model for device list"""
    devices: List[DeviceInfo] = Field(..., description="List of discovered devices")

class ConnectionResponse(BaseModel):
    """Response model for connection operations"""
    result: str = Field(..., description="Operation result", example="connected")

class DeviceStatusResponse(BaseModel):
    """Response model for device status"""
    is_connected: bool = Field(..., description="Whether a device is currently connected")
    device_address: Optional[str] = Field(None, description="Address of the connected device")
    device_name: Optional[str] = Field(None, description="Name of the connected device")
    connection_time: Optional[str] = Field(None, description="Time when device was connected")
    battery_level: Optional[int] = Field(None, description="Battery level percentage (0-100)")

class RegisterResponse(BaseModel):
    """Response model for device registration"""
    status: str = Field(..., description="Operation status", example="success")
    message: str = Field(..., description="Operation message")

class RegisteredDevicesResponse(BaseModel):
    """Response model for registered devices list"""
    devices: List[DeviceInfo] = Field(..., description="List of registered devices")
    count: int = Field(..., description="Number of registered devices")

@router.get("/scan", 
    response_model=DeviceListResponse,
    summary="Scan for nearby Link Band devices",
    description="""
    Scan for nearby Link Band devices using Bluetooth Low Energy (BLE).
    
    This endpoint will discover all available Link Band devices in the vicinity.
    The scan typically takes 5-10 seconds to complete.
    
    **Returns:**
    - List of discovered devices with their names, addresses, and signal strength
    
    **Common Issues:**
    - Ensure Bluetooth is enabled on your system
    - Make sure Link Band device is in pairing mode
    - Check that no other application is using the device
    """,
    responses={
        200: {
            "description": "Successfully scanned for devices",
            "content": {
                "application/json": {
                    "example": {
                        "devices": [
                            {
                                "name": "Link Band 2.0",
                                "address": "01:23:45:67:89:AB",
                                "rssi": -45,
                                "is_connected": False
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Internal server error during scanning"}
    })
async def search_devices(device_svc: DeviceService = Depends(get_device_service)):
    """
    Scan for nearby Link Band devices
    
    Performs a Bluetooth Low Energy scan to discover available Link Band devices.
    The scan duration is typically 5-10 seconds.
    """
    try:
        devices = await device_svc.scan() # 주입된 device_svc 사용
        return {"devices": devices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exception: {e}")

@router.post("/connect",
    response_model=ConnectionResponse,
    summary="Connect to a Link Band device",
    description="""
    Establish a connection to a specific Link Band device using its Bluetooth address.
    
    **Prerequisites:**
    - Device must be discovered via `/device/scan` first
    - Device should be in pairing/connectable mode
    - No other device should be currently connected
    
    **Process:**
    1. Validates the device address format
    2. Attempts to establish BLE connection
    3. Initializes data streaming channels
    4. Sets up device communication protocols
    
    **Connection Timeout:** 30 seconds
    
    **Note:** Only one device can be connected at a time. Disconnect the current device before connecting to a new one.
    """,
    responses={
        200: {
            "description": "Successfully connected to device",
            "content": {
                "application/json": {
                    "example": {"result": "connected"}
                }
            }
        },
        400: {"description": "Connection failed - device not found or not connectable"},
        500: {"description": "Internal server error during connection"}
    })
async def connect_device(req: ConnectRequest, ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    """
    Connect to a Link Band device
    
    Establishes a Bluetooth Low Energy connection to the specified device.
    Only one device can be connected at a time.
    
    Args:
        req: Connection request containing device address
        
    Returns:
        Connection result status
        
    Raises:
        HTTPException: If connection fails or device is not available
    """
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

@router.post("/disconnect",
    response_model=ConnectionResponse,
    summary="Disconnect from the current device",
    description="""
    Disconnect from the currently connected Link Band device.
    
    **Process:**
    1. Stops all active data streaming
    2. Closes BLE connection gracefully
    3. Cleans up device resources
    4. Updates connection status
    
    **Note:** This operation is safe to call even if no device is connected.
    """,
    responses={
        200: {
            "description": "Successfully disconnected from device",
            "content": {
                "application/json": {
                    "example": {"result": "disconnected"}
                }
            }
        },
        400: {"description": "Disconnect failed - no device connected or operation failed"},
        500: {"description": "Internal server error during disconnection"}
    })
async def disconnect_device(ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    """
    Disconnect from the currently connected device
    
    Safely disconnects from the Link Band device and stops all data streaming.
    
    Returns:
        Disconnection result status
        
    Raises:
        HTTPException: If disconnection fails
    """
    if not hasattr(ws_server_instance, 'device_manager') or ws_server_instance.device_manager is None:
        raise HTTPException(status_code=500, detail="DeviceManager not available via WebSocketServer")
    result = await ws_server_instance.device_manager.disconnect()
    if not result:
        raise HTTPException(status_code=400, detail="Disconnect failed")
    return {"result": "disconnected"}

@router.get("/status",
    response_model=DeviceStatusResponse,
    summary="Get current device connection status",
    description="""
    Retrieve the current status of device connection and basic device information.
    
    **Information Provided:**
    - Connection status (connected/disconnected)
    - Connected device details (name, address)
    - Connection timestamp
    - Battery level (if available)
    - Signal quality metrics
    
    **Use Cases:**
    - Monitor connection health
    - Display device info in UI
    - Check battery status
    - Verify device availability before operations
    """,
    responses={
        200: {
            "description": "Current device status",
            "content": {
                "application/json": {
                    "example": {
                        "is_connected": True,
                        "device_address": "01:23:45:67:89:AB",
                        "device_name": "Link Band 2.0",
                        "connection_time": "2024-06-24T10:30:00Z",
                        "battery_level": 85
                    }
                }
            }
        },
        500: {"description": "Internal server error"}
    })
def device_status(ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    """
    Get current device connection status
    
    Returns detailed information about the currently connected device
    including battery level, connection time, and signal quality.
    
    Returns:
        Device status information
    """
    return ws_server_instance.get_device_status()

@router.post("/register_device",
    response_model=RegisterResponse,
    summary="Register a device for quick access",
    description="""
    Register a Link Band device in the system for quick access and management.
    
    **Benefits of Registration:**
    - Quick connection without scanning
    - Device nickname/alias support
    - Connection history tracking
    - Preferred device settings storage
    
    **Requirements:**
    - Device must be discoverable via scan
    - Unique Bluetooth address
    - Valid device name
    
    **Note:** Registration does not establish a connection. Use `/device/connect` after registration.
    """,
    responses={
        200: {
            "description": "Device successfully registered",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "message": "Device 01:23:45:67:89:AB registered"
                    }
                }
            }
        },
        400: {"description": "Registration failed - device already registered or invalid data"},
        500: {"description": "Internal server error during registration"}
    })
async def register_device(req: DeviceRegisterRequest, ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    """
    Register a device for quick access
    
    Adds a device to the registry for quick connection and management.
    Registered devices can be connected to without scanning.
    
    Args:
        req: Device registration request with name and address
        
    Returns:
        Registration result status
    """
    if ws_server_instance.is_device_registered(req.address):
        return {"status": "fail", "message": f"Device {req.address} is already registered"}
    device_info_dict = req.dict()
    success = ws_server_instance.register_device(device_info_dict)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to register device")
    return {"status": "success", "message": f"Device {req.address} registered"}

@router.post("/unregister_device",
    response_model=RegisterResponse,
    summary="Unregister a device from the system",
    description="""
    Remove a device from the system registry.
    
    **Effects:**
    - Removes device from quick access list
    - Clears stored device preferences
    - Removes connection history
    
    **Note:** This does not disconnect the device if currently connected. 
    Use `/device/disconnect` first if needed.
    """,
    responses={
        200: {
            "description": "Device successfully unregistered",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "message": "Device 01:23:45:67:89:AB unregistered"
                    }
                }
            }
        },
        400: {"description": "Device not found in registry"},
        500: {"description": "Internal server error during unregistration"}
    })
async def unregister_device(req: DeviceUnregisterRequest, ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    """
    Unregister a device from the system
    
    Removes the device from the registry and clears associated data.
    
    Args:
        req: Device unregistration request with address
        
    Returns:
        Unregistration result status
    """
    success = ws_server_instance.unregister_device(req.address)
    if not success:
        return {"status": "fail", "message": f"Device {req.address} is not registered"}
    return {"status": "success", "message": f"Device {req.address} unregistered"}

@router.get("/registered_devices",
    response_model=RegisteredDevicesResponse,
    summary="Get list of registered devices",
    description="""
    Retrieve all devices that have been registered in the system.
    
    **Information Included:**
    - Device names and addresses
    - Registration timestamps
    - Last connection times
    - Device preferences
    
    **Use Cases:**
    - Display available devices in UI
    - Quick device selection
    - Device management operations
    """,
    responses={
        200: {
            "description": "List of registered devices",
            "content": {
                "application/json": {
                    "example": {
                        "devices": [
                            {
                                "name": "Link Band 2.0",
                                "address": "01:23:45:67:89:AB",
                                "rssi": None,
                                "is_connected": False
                            }
                        ],
                        "count": 1
                    }
                }
            }
        },
        500: {"description": "Internal server error"}
    })
async def get_registered_devices(ws_server_instance: WebSocketServer = Depends(get_ws_server)):
    """
    Get list of registered devices
    
    Returns all devices that have been registered in the system
    for quick access and connection.
    
    Returns:
        List of registered devices with count
    """
    devices = ws_server_instance.get_registered_devices()
    return {"devices": devices, "count": len(devices)} 