from app.core.device import DeviceManager
# from app.core.device_registry import DeviceRegistry # DeviceRegistry 직접 사용 안 함

# Singleton DeviceManager instance 제거
# _device_manager = DeviceManager() 

# 전역 함수들 제거
# def get_device_manager():
#     return _device_manager
# 
# async def scan():
#     return await _device_manager.scan_devices()
# 
# async def connect(address: str):
#     return await _device_manager.connect(address)
# 
# async def disconnect():
#     return await _device_manager.disconnect()
# 
# def status():
#     info = _device_manager.get_device_info()
#     if info:
#         return info
#     return {"status": "disconnected"}

class DeviceService:
    def __init__(self, device_manager: DeviceManager): # DeviceManager 주입
        # self.registry = DeviceRegistry() # DeviceRegistry 직접 생성 안 함
        self.device_manager = device_manager # 주입된 DeviceManager 사용

    async def scan(self):
        # 주입된 device_manager의 scan_devices 사용
        return await self.device_manager.scan_devices()

    # register/unregister 등 DeviceRegistry 관련 메소드들은 WebSocketServer가 담당하므로 삭제
    # def register_device(self, device_info: dict) -> bool:
    #     return self.registry.register_device(device_info)
    # 
    # def unregister_device(self, address: str) -> bool:
    #     return self.registry.unregister_device(address)
    # 
    # def get_registered_devices(self):
    #     return self.registry.get_registered_devices()
    # 
    # def is_device_registered(self, address: str) -> bool:
    #     return self.registry.is_device_registered(address)
    # 
    # def get_device_info(self, address: str):
    #     return self.registry.get_device_info(address)
    # 
    # def status(self):
    #     return status() 

    # def status(self):
    #     info = _device_manager.get_device_info()
    #     if info:
    #         return info
    #     return {"status": "disconnected"} 