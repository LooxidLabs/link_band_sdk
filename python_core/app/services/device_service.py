from app.core.device import DeviceManager

# Singleton DeviceManager instance
_device_manager = DeviceManager()

def get_device_manager():
    return _device_manager

async def scan():
    return await _device_manager.scan_devices()

async def connect(address: str):
    return await _device_manager.connect(address)

async def disconnect():
    return await _device_manager.disconnect()

def status():
    info = _device_manager.get_device_info()
    if info:
        return info
    return {"status": "disconnected"} 