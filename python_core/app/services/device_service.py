from app.core.device import DeviceManager
from app.core.device_registry import DeviceRegistry

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

class DeviceService:
    def __init__(self):
        self.registry = DeviceRegistry()

    async def scan(self):
        return await scan()

    def register_device(self, device_info: dict) -> bool:
        return self.registry.register_device(device_info)

    def unregister_device(self, address: str) -> bool:
        return self.registry.unregister_device(address)

    def get_registered_devices(self):
        return self.registry.get_registered_devices()

    def is_device_registered(self, address: str) -> bool:
        return self.registry.is_device_registered(address)

    def get_device_info(self, address: str):
        return self.registry.get_device_info(address)

    def status(self):
        return status() 