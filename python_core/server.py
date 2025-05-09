import asyncio
import json
import logging
import websockets
import time # For timestamping batched data
from typing import Set, Dict, Any, Optional
from enum import Enum, auto
from datetime import datetime
from device import DeviceManager, DeviceStatus
from device_registry import DeviceRegistry
from bleak import BleakScanner

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 전역 변수 (좋은 방법은 아니지만 테스트 목적)
_current_server_instance = None

class EventType(Enum):
    DEVICE_DISCONNECTED = "device_disconnected"
    ERROR = "error"
    STREAM_STARTED = "stream_started"
    STREAM_STOPPED = "stream_stopped"
    SCAN_RESULT = "scan_result"
    DEVICE_CONNECTING = "device_connecting"
    DEVICE_CONNECTED = "device_connected"
    DEVICE_CONNECTION_FAILED = "device_connection_failed"
    DEVICE_INFO = "device_info"
    DATA_ACQUISITION_STARTED = "data_acquisition_started"
    DATA_ACQUISITION_STOPPED = "data_acquisition_stopped"
    REGISTERED_DEVICES = "registered_devices"
    BLUETOOTH_STATUS = "bluetooth_status"

class WebSocketServer:
    def __init__(self, host: str = "localhost", port: int = 18765):
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.is_streaming = False
        self.server: Optional[websockets.WebSocketServer] = None
        self.stream_tasks: Dict[str, Optional[asyncio.Task]] = {
            'eeg': None,
            'ppg': None,
            'acc': None,
            'battery': None  # 배터리 스트리밍 태스크 추가
        }
        self.device_manager = DeviceManager(server_disconnect_callback=self.handle_unexpected_disconnect)
        self.device_registry = DeviceRegistry()
        self.auto_connect_task: Optional[asyncio.Task] = None

    async def initialize(self):
        logger.info("Initializing WebSocket server...")
        self.server = await websockets.serve(
            self.handle_client,
            self.host,
            self.port
        )
        # 주기적으로 상태 업데이트를 시작
        asyncio.create_task(self._periodic_status_update())
        logger.info(f"WebSocket server initialized on {self.host}:{self.port}")

    async def _periodic_status_update(self):
        """주기적으로 모든 클라이언트에게 상태를 업데이트합니다."""
        while True:
            try:
                if self.clients:  # 연결된 클라이언트가 있을 때만 실행
                    is_connected = self.device_manager.is_connected()
                    device_info = self.device_manager.get_device_info() if is_connected else None
                    registered_devices = self.device_registry.get_registered_devices()
                    
                    status_data = {
                        "connected": is_connected,
                        "device_info": device_info,
                        "is_streaming": self.is_streaming if is_connected else False,
                        "registered_devices": registered_devices,
                        "clients_connected": len(self.clients)
                    }
                    await self.broadcast_event(EventType.DEVICE_INFO, status_data)
            except Exception as e:
                logger.error(f"Error in periodic status update: {e}")
            await asyncio.sleep(1)  # 1초마다 업데이트

    async def handle_client(self, websocket: websockets.WebSocketServerProtocol):
        """Handle new client connections"""
        client_address = websocket.remote_address
        logger.info(f"New connection attempt from {client_address}")

        # 같은 주소의 이전 연결을 제거
        for client in list(self.clients):
            if client.remote_address == websocket.remote_address:
                try:
                    await client.close(1000, "New connection from same address")
                    self.clients.remove(client)
                    logger.info(f"Removed existing connection from {client.remote_address}")
                except Exception as e:
                    logger.error(f"Error closing existing connection: {e}")

        try:
            # 새 연결 추가
            self.clients.add(websocket)
            logger.info(f"Client connected from {client_address}. Total clients: {len(self.clients)}")

            # 연결 즉시 블루투스 상태 확인 및 전송
            is_bluetooth_available = await self._check_bluetooth_status()
            await self._broadcast_bluetooth_status(is_bluetooth_available)
            
            await self._send_current_device_status(websocket)

            async for message in websocket:
                await self.handle_client_message(websocket, message)

        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"Client connection closed from {client_address}: {e}")
        except Exception as e:
            logger.error(f"Error handling client {client_address}: {e}", exc_info=True)
        finally:
            if websocket in self.clients:
                self.clients.remove(websocket)
                try:
                    await websocket.close(1000, "Normal closure")
                except Exception as e:
                    logger.error(f"Error closing websocket: {e}")
                logger.info(f"Client disconnected from {client_address}. Total clients: {len(self.clients)}")

    async def _send_current_device_status(self, websocket: websockets.WebSocketServerProtocol):
        """Send the current device connection status to a specific client."""
        is_connected = self.device_manager.is_connected()
        device_info = self.device_manager.get_device_info() if is_connected else None
        registered_devices = self.device_registry.get_registered_devices()

        # 배터리 정보 가져오기
        battery_data = []
        if is_connected and self.device_manager.battery_buffer:
            battery_data = [{"timestamp": time.time(), "level": self.device_manager.battery_level}] if self.device_manager.battery_level is not None else []
        
        status_data = {
            "connected": is_connected,
            "device_info": device_info,
            "is_streaming": self.is_streaming if is_connected else False,
            "registered_devices": registered_devices,
            "clients_connected": len(self.clients),
            "battery": battery_data[-1] if battery_data else None
        }
        await self.send_event_to_client(websocket, EventType.DEVICE_INFO, status_data)

    async def handle_unexpected_disconnect(self, device_address: Optional[str]):
        """Handle unexpected device disconnection."""
        logger.warning(f"Handling unexpected disconnect for address: {device_address}")
        
        # Stop streaming if it's active
        if self.is_streaming:
            await self.stop_streaming()
            
        # Get device info before cleanup
        device_info = self.device_manager.get_device_info()
        
        # Notify all clients about the disconnection
        await self.broadcast_event(EventType.DEVICE_DISCONNECTED, {
            "device_address": device_address,
            "device_info": device_info,
            "reason": "unexpected_disconnect"
        })

        # Send updated device status to all clients
        await self.broadcast_event(EventType.DEVICE_INFO, {
            "connected": False,
            "device_info": None,
            "is_streaming": False,
            # "battery": None
        })

    async def start(self):
        """Start the WebSocket server"""
        if not self.server:
            await self.initialize()
        logger.info("WebSocket server started")
        # Start auto-connect task
        self.auto_connect_task = asyncio.create_task(self._auto_connect_loop())

    async def stop(self):
        """Stop the WebSocket server and disconnect BLE device if connected."""
        logger.info("Stopping WebSocket server...")
        
        # 모든 클라이언트 연결 종료
        for client in list(self.clients):
            try:
                await client.close(1000, "Server shutdown")
            except Exception as e:
                logger.error(f"Error closing client connection: {e}")
        self.clients.clear()

        if self.auto_connect_task:
            self.auto_connect_task.cancel()
            try:
                await self.auto_connect_task
            except asyncio.CancelledError:
                pass

        # Cancel all streaming tasks
        for sensor_type, task in self.stream_tasks.items():
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                self.stream_tasks[sensor_type] = None

        if self.device_manager.is_connected():
            logger.info("Disconnecting BLE device during server shutdown...")
            await self.device_manager.disconnect()

        if self.server:
            self.server.close()
            try:
                await asyncio.wait_for(self.server.wait_closed(), timeout=5.0)
                logger.info("WebSocket server stopped gracefully.")
            except asyncio.TimeoutError:
                logger.warning("WebSocket server close timed out.")
        else:
            logger.warning("Server object not found, already stopped?")

    async def _auto_connect_loop(self):
        """Periodically check and connect to registered devices"""
        while True:
            try:
                if not self.device_manager.is_connected():
                    registered_devices = self.device_registry.get_registered_devices()
                    for device in registered_devices:
                        address = device.get('address')
                        if address:
                            logger.info(f"Attempting to connect to registered device: {address}")
                            await self._run_connect_and_notify(address)
                            if self.device_manager.is_connected():
                                break
                await asyncio.sleep(1)  # Check every second
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in auto-connect loop: {e}")
                await asyncio.sleep(1)

    async def handle_client_message(self, websocket: websockets.WebSocketServerProtocol, message: str):
        """Handle messages from clients"""
        try:
            data = json.loads(message)
            command = data.get("command")
            payload = data.get("payload", {})
            logger.debug(f"Received command: {command} with payload: {payload}")

            if command == "check_device_connection":
                await self._send_current_device_status(websocket)

            elif command == "check_bluetooth_status":
                is_bluetooth_available = await self._check_bluetooth_status()
                await self._broadcast_bluetooth_status(is_bluetooth_available)

            elif command == "scan_devices":
                # 스캔 전에 블루투스 상태 확인
                is_bluetooth_available = await self._check_bluetooth_status()
                if not is_bluetooth_available:
                    await self.send_error_to_client(websocket, "Bluetooth is turned off")
                    return
                asyncio.create_task(self._run_scan_and_notify(websocket))

            elif command == "connect_device":
                # 연결 전에 블루투스 상태 확인
                is_bluetooth_available = await self._check_bluetooth_status()
                if not is_bluetooth_available:
                    await self.send_error_to_client(websocket, "Bluetooth is turned off")
                    return
                address = payload.get("address")
                if address:
                    asyncio.create_task(self._run_connect_and_notify(address))
                else:
                    await self.send_error_to_client(websocket, "Address is required for connect_device command.")

            elif command == "disconnect_device":
                asyncio.create_task(self._run_disconnect_and_notify(websocket))

            elif command == "start_streaming":
                await self.start_streaming(websocket)

            elif command == "stop_streaming":
                await self.stop_streaming()

            elif command == "health_check":
                await websocket.send(json.dumps({
                    "type": "health_check_response",
                    "status": "ok",
                    "clients_connected": len(self.clients),
                    "is_streaming": self.is_streaming,
                    "device_connected": self.device_manager.is_connected()
                }))

            elif command == "get_registered_devices":
                devices = self.device_registry.get_registered_devices()
                await self.send_event_to_client(websocket, EventType.REGISTERED_DEVICES, {"devices": devices})

            elif command == "register_device":
                logger.info(f"Registering device: {payload}")
                if self.device_registry.register_device(payload):
                    devices = self.device_registry.get_registered_devices()
                    await self.broadcast_event(EventType.REGISTERED_DEVICES, {"devices": devices})
                else:
                    await self.send_error_to_client(websocket, "Failed to register device")

            elif command == "unregister_device":
                address = payload.get("address")
                if not address:
                    await self.send_error_to_client(websocket, "Address is required for unregister_device command.")
                    return

                # 현재 연결된 디바이스인 경우 연결 해제
                if self.device_manager.is_connected():
                    connected_device = self.device_manager.get_device_info()
                    if connected_device and connected_device.get("address") == address:
                        logger.info(f"Disconnecting device {address} before unregistering")
                        if self.is_streaming:
                            await self.stop_streaming()
                        await self.device_manager.disconnect()

                # 디바이스 등록 해제
                if self.device_registry.unregister_device(address):
                    devices = self.device_registry.get_registered_devices()
                    await self.broadcast_event(EventType.REGISTERED_DEVICES, {"devices": devices})
                    logger.info(f"Successfully unregistered device: {address}")
                else:
                    await self.send_error_to_client(websocket, "Failed to unregister device")

            elif command == "get_server_status":
                # 현재 디바이스 연결 상태
                is_connected = self.device_manager.is_connected()
                device_info = self.device_manager.get_device_info() if is_connected else None
                
                # 등록된 디바이스 정보
                registered_devices = self.device_registry.get_registered_devices()
                
                # 서버 상태 정보 구성
                status_data = {
                    "connected": is_connected,
                    "device_info": device_info,
                    "registered_devices": registered_devices,
                    "is_streaming": self.is_streaming,
                    "clients_connected": len(self.clients)
                }
                
                await self.send_event_to_client(websocket, EventType.DEVICE_INFO, status_data)

            else:
                logger.warning(f"Unknown command received: {command}")
                await self.send_error_to_client(websocket, f"Unknown command: {command}")

        except json.JSONDecodeError:
            logger.error("Invalid JSON message received")
            await self.send_error_to_client(websocket, "Invalid JSON format.")
        except Exception as e:
            logger.error(f"Error handling client message: {e}", exc_info=True)
            await self.send_error_to_client(websocket, f"Server error processing message: {e}")

    async def _run_scan_and_notify(self, websocket):
        await self.send_event_to_client(websocket, EventType.SCAN_RESULT, {"status": "scanning"})
        try:
            devices = await self.device_manager.scan_devices()
            await self.send_event_to_client(websocket, EventType.SCAN_RESULT, {"status": "completed", "devices": devices})
        except Exception as e:
            logger.error(f"Scan failed: {e}", exc_info=True)
            await self.send_event_to_client(websocket, EventType.SCAN_RESULT, {"status": "failed", "error": str(e)})

    async def _run_connect_and_notify(self, device_address: str):
        """Connect to device and start notifications."""
        try:
            # Connect to device
            if not await self.device_manager.connect(device_address):
                logger.error("Failed to connect to device")
                return

            # Start data acquisition
            if not await self.device_manager.start_data_acquisition():
                logger.error("Failed to start data acquisition")
                return

            # Start battery monitoring
            if not await self.device_manager.start_battery_monitoring():
                logger.error("Failed to start battery monitoring")
                return

            # Get device info and broadcast connection event
            device_info = self.device_manager.get_device_info()
            if device_info:
                # Create a new dictionary with only string values
                safe_device_info = {
                    "name": str(device_info["name"]),
                    "address": str(device_info["address"])
                }
                await self.broadcast_event(EventType.DEVICE_CONNECTED, safe_device_info)
                logger.info(f"Device connected: {safe_device_info}")
                
                # Automatically start streaming after successful connection
                await self.start_streaming()
            else:
                logger.error("Failed to get device info after connection")

        except Exception as e:
            logger.error(f"Error in _run_connect_and_notify: {e}", exc_info=True)
            await self._cleanup_connection()

    async def _cleanup_connection(self):
        """Clean up connection resources."""
        try:
            # Stop battery monitoring
            await self.device_manager.stop_battery_monitoring()
            
            # Stop data acquisition
            await self.device_manager.stop_data_acquisition()
            
            # Disconnect device
            await self.device_manager.disconnect()
            
            # Broadcast disconnection event
            await self.broadcast_event(EventType.DEVICE_DISCONNECTED, None)
            logger.info("Device disconnected and resources cleaned up")
        except Exception as e:
            logger.error(f"Error in _cleanup_connection: {e}", exc_info=True)

    async def _run_disconnect_and_notify(self, websocket):
        """Disconnect device and notify clients."""
        device_info = self.device_manager.get_device_info()
        if not device_info:
            await self.send_error_to_client(websocket, "No device currently connected.")
            return

        if self.is_streaming:
            await self.stop_streaming()

        try:
            success = await self.device_manager.disconnect()
            if success:
                # Notify about disconnection
                await self.broadcast_event(EventType.DEVICE_DISCONNECTED, {
                    "device_info": device_info,
                    "reason": "user_request"
                })
                # Update device status
                await self.broadcast_event(EventType.DEVICE_INFO, {
                    "connected": False,
                    "device_info": None
                })
            else:
                await self.send_error_to_client(websocket, f"Failed to disconnect device {device_info['address']}")
        except Exception as e:
            logger.error(f"Disconnection failed with exception: {e}", exc_info=True)
            await self.send_error_to_client(websocket, f"Error during disconnect: {str(e)}")

    async def start_streaming(self, websocket: Optional[websockets.WebSocketServerProtocol] = None):
        """Start the streaming tasks if conditions are met."""
        if not self.device_manager.is_connected():
            msg = "Cannot start streaming: Device not connected."
            logger.warning(msg)
            if websocket: await self.send_error_to_client(websocket, msg)
            return

        # Check if data acquisition is started
        if not self.device_manager._notifications_started:
            logger.info("Data acquisition not started, attempting to start...")
            if not await self.device_manager.start_data_acquisition():
                msg = "Cannot start streaming: Failed to start data acquisition."
                logger.warning(msg)
                if websocket: await self.send_error_to_client(websocket, msg)
                return

        # Start battery monitoring if not already running
        if not self.device_manager.battery_running:
            logger.info("Battery monitoring not started, attempting to start...")
            if not await self.device_manager.start_battery_monitoring():
                logger.warning("Failed to start battery monitoring, but continuing with other streams")

        if not self.is_streaming:
            self.is_streaming = True
            
            # Start individual streaming tasks for each sensor type
            if self.stream_tasks['eeg'] is None or self.stream_tasks['eeg'].done():
                self.stream_tasks['eeg'] = asyncio.create_task(self.stream_eeg_data())
                logger.info("Created and started EEG stream task.")
            
            if self.stream_tasks['ppg'] is None or self.stream_tasks['ppg'].done():
                self.stream_tasks['ppg'] = asyncio.create_task(self.stream_ppg_data())
                logger.info("Created and started PPG stream task.")
            
            if self.stream_tasks['acc'] is None or self.stream_tasks['acc'].done():
                self.stream_tasks['acc'] = asyncio.create_task(self.stream_acc_data())
                logger.info("Created and started ACC stream task.")

            if self.stream_tasks['battery'] is None or self.stream_tasks['battery'].done():
                self.stream_tasks['battery'] = asyncio.create_task(self.stream_battery_data())
                logger.info("Created and started battery stream task.")

            await self.broadcast_event(EventType.STREAM_STARTED, {"status": "streaming_started"})
            logger.info("Streaming started flag set.")
        else:
            logger.info("Streaming is already active.")

    async def stop_streaming(self):
        """Stop all streaming tasks."""
        if self.is_streaming:
            self.is_streaming = False
            
            # Cancel all streaming tasks
            for sensor_type, task in self.stream_tasks.items():
                if task:
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        logger.info(f"{sensor_type.upper()} streaming task successfully cancelled.")
                    except Exception as e:
                        logger.error(f"Error during {sensor_type} stream_task cancellation: {e}")
                    self.stream_tasks[sensor_type] = None

            await self.broadcast_event(EventType.STREAM_STOPPED, {"status": "streaming_stopped"})
            logger.info("Streaming stopped flag set.")
        else:
            logger.info("Streaming is not currently active.")

    async def stream_eeg_data(self):
        """Stream EEG data independently."""
        logger.info("EEG stream task started.")
        SEND_INTERVAL = 0.04  # 25Hz (40ms)
        NO_DATA_TIMEOUT = 5.0
        last_data_time = time.time()
        total_samples_sent = 0
        last_log_time = time.time()
        samples_since_last_log = 0

        try:
            while self.is_streaming:
                await asyncio.sleep(SEND_INTERVAL)
                if not self.is_streaming: break

                eeg_data = await self.device_manager.get_and_clear_eeg_buffer()
                if eeg_data:
                    last_data_time = time.time()
                    
                    # 데이터 구조 변환
                    processed_data = []
                    for sample in eeg_data:
                        processed_sample = {
                            "timestamp": sample["timestamp"],
                            "ch1": sample["ch1"],  # 이미 uV로 변환된 값
                            "ch2": sample["ch2"],  # 이미 uV로 변환된 값
                            "leadoff_ch1": sample["leadoff_ch1"],
                            "leadoff_ch2": sample["leadoff_ch2"]
                        }
                        processed_data.append(processed_sample)

                    message = {
                        "type": "sensor_data",
                        "sensor_type": "eeg",
                        "timestamp": time.time(),
                        "data": processed_data
                    }
                    try:
                        await self.broadcast(json.dumps(message))
                        total_samples_sent += len(eeg_data)
                        samples_since_last_log += len(eeg_data)

                        # 1초마다 스트리밍 상태 로깅
                        current_time = time.time()
                        if current_time - last_log_time >= 1.0:
                            logger.info(f"[EEG] Samples/sec: {samples_since_last_log:4d} | "
                                      f"Total: {total_samples_sent:6d} | "
                                      f"Buffer: {len(eeg_data):4d} samples")
                            samples_since_last_log = 0
                            last_log_time = current_time
                            
                    except Exception as e:
                        logger.error(f"Error broadcasting EEG data: {e}")
                elif time.time() - last_data_time > NO_DATA_TIMEOUT:
                    logger.warning("No EEG data received for too long")
                    break

        except asyncio.CancelledError:
            logger.info("EEG stream task received cancellation.")
        except Exception as e:
            logger.error(f"Error in EEG stream loop: {e}", exc_info=True)
        finally:
            logger.info(f"EEG stream task finished. Total samples sent: {total_samples_sent}")

    async def stream_ppg_data(self):
        """Stream PPG data independently."""
        logger.info("PPG stream task started.")
        SEND_INTERVAL = 0.016  # ~60Hz (16.7ms)
        NO_DATA_TIMEOUT = 5.0
        last_data_time = time.time()
        total_samples_sent = 0
        last_log_time = time.time()
        samples_since_last_log = 0

        try:
            while self.is_streaming:
                await asyncio.sleep(SEND_INTERVAL)
                if not self.is_streaming: break

                ppg_data = await self.device_manager.get_and_clear_ppg_buffer()
                if ppg_data:
                    last_data_time = time.time()
                    message = {
                        "type": "sensor_data",
                        "sensor_type": "ppg",
                        "timestamp": time.time(),
                        "data": ppg_data
                    }
                    try:
                        await self.broadcast(json.dumps(message))
                        total_samples_sent += len(ppg_data)
                        samples_since_last_log += len(ppg_data)
                        
                        # 1초마다 스트리밍 상태 로깅
                        current_time = time.time()
                        if current_time - last_log_time >= 1.0:
                            logger.info(f"[PPG] Samples/sec: {samples_since_last_log:4d} | "
                                      f"Total: {total_samples_sent:6d} | "
                                      f"Buffer: {len(ppg_data):4d} samples")
                            samples_since_last_log = 0
                            last_log_time = current_time
                            
                    except Exception as e:
                        logger.error(f"Error broadcasting PPG data: {e}")
                elif time.time() - last_data_time > NO_DATA_TIMEOUT:
                    logger.warning("No PPG data received for too long")
                    break

        except asyncio.CancelledError:
            logger.info("PPG stream task received cancellation.")
        except Exception as e:
            logger.error(f"Error in PPG stream loop: {e}", exc_info=True)
        finally:
            logger.info(f"PPG stream task finished. Total samples sent: {total_samples_sent}")

    async def stream_acc_data(self):
        """Stream accelerometer data independently."""
        logger.info("ACC stream task started.")
        SEND_INTERVAL = 0.033  # ~30Hz (33.3ms)
        NO_DATA_TIMEOUT = 5.0
        last_data_time = time.time()
        total_samples_sent = 0
        last_log_time = time.time()
        samples_since_last_log = 0

        try:
            while self.is_streaming:
                await asyncio.sleep(SEND_INTERVAL)
                if not self.is_streaming: break

                acc_data = await self.device_manager.get_and_clear_acc_buffer()
                if acc_data:
                    last_data_time = time.time()
                    message = {
                        "type": "sensor_data",
                        "sensor_type": "acc",
                        "timestamp": time.time(),
                        "data": acc_data
                    }
                    try:
                        await self.broadcast(json.dumps(message))
                        total_samples_sent += len(acc_data)
                        samples_since_last_log += len(acc_data)
                        
                        # 1초마다 스트리밍 상태 로깅
                        current_time = time.time()
                        if current_time - last_log_time >= 1.0:
                            logger.info(f"[ACC] Samples/sec: {samples_since_last_log:4d} | "
                                      f"Total: {total_samples_sent:6d} | "
                                      f"Buffer: {len(acc_data):4d} samples")
                            samples_since_last_log = 0
                            last_log_time = current_time
                            
                    except Exception as e:
                        logger.error(f"Error broadcasting ACC data: {e}")
                elif time.time() - last_data_time > NO_DATA_TIMEOUT:
                    logger.warning("No ACC data received for too long")
                    break

        except asyncio.CancelledError:
            logger.info("ACC stream task received cancellation.")
        except Exception as e:
            logger.error(f"Error in ACC stream loop: {e}", exc_info=True)
        finally:
            logger.info(f"ACC stream task finished. Total samples sent: {total_samples_sent}")

    async def stream_battery_data(self):
        """Stream battery data independently."""
        logger.info("Battery stream task started.")
        SEND_INTERVAL = 0.1  # 100ms마다 체크 (10Hz)
        last_data_time = time.time()
        total_samples_sent = 0
        last_log_time = time.time()
        samples_since_last_log = 0
        last_battery_level = None
        
        # 타임스탬프 기반 샘플링 레이트 계산을 위한 변수들
        timestamp_buffer = []  # 최근 1분간의 타임스탬프 저장
        WINDOW_SIZE = 60  # 1분 윈도우
        last_rate_log_time = time.time()
        RATE_LOG_INTERVAL = 5  # 5초마다 샘플링 레이트 로깅

        try:
            while self.is_streaming:
                await asyncio.sleep(SEND_INTERVAL)
                if not self.is_streaming: break

                current_time = time.time()
                
                # 배터리 버퍼에서 데이터 가져오기
                battery_data = await self.device_manager.get_and_clear_battery_buffer()
                
                # 배터리 데이터가 없고, 마지막 배터리 레벨이 있는 경우
                if not battery_data and last_battery_level is not None:
                    # 마지막 알려진 배터리 레벨로 데이터 생성
                    battery_data = [{
                        "timestamp": current_time,
                        "level": last_battery_level
                    }]
                
                if battery_data:
                    last_data_time = current_time
                    last_battery_level = battery_data[-1]['level']  # 마지막 배터리 레벨 저장
                    
                    # 타임스탬프 버퍼 업데이트
                    for sample in battery_data:
                        timestamp_buffer.append(sample['timestamp'])
                    
                    # 1분보다 오래된 타임스탬프 제거
                    cutoff_time = current_time - WINDOW_SIZE
                    timestamp_buffer = [ts for ts in timestamp_buffer if ts > cutoff_time]
                    
                    message = {
                        "type": "sensor_data",
                        "sensor_type": "battery",
                        "timestamp": current_time,
                        "data": battery_data
                    }
                    try:
                        await self.broadcast(json.dumps(message))
                        total_samples_sent += len(battery_data)
                        samples_since_last_log += len(battery_data)
                        
                        # 1초마다 스트리밍 상태 로깅
                        if current_time - last_log_time >= 1.0:
                            logger.info(f"[BAT] Updates/sec: {samples_since_last_log:4d} | "
                                      f"Total: {total_samples_sent:6d} | "
                                      f"Level: {last_battery_level}%")
                            samples_since_last_log = 0
                            last_log_time = current_time
                            
                        # 5초마다 실제 샘플링 레이트 로깅
                        if current_time - last_rate_log_time >= RATE_LOG_INTERVAL:
                            if timestamp_buffer:
                                # 타임스탬프 간격의 평균 계산
                                intervals = [timestamp_buffer[i+1] - timestamp_buffer[i] 
                                           for i in range(len(timestamp_buffer)-1)]
                                if intervals:
                                    avg_interval = sum(intervals) / len(intervals)
                                    actual_rate = 1.0 / avg_interval if avg_interval > 0 else 0
                                    logger.info(f"[BAT] Actual sampling rate: {actual_rate:.2f} Hz "
                                              f"(based on {len(timestamp_buffer)} samples in last {WINDOW_SIZE}s)")
                            last_rate_log_time = current_time
                            
                    except Exception as e:
                        logger.error(f"Error broadcasting battery data: {e}")
                else:
                    # 배터리 데이터가 없는 경우 로그만 출력
                    logger.debug("No new battery data available")

        except asyncio.CancelledError:
            logger.info("Battery stream task received cancellation.")
        except Exception as e:
            logger.error(f"Error in battery stream loop: {e}", exc_info=True)
        finally:
            logger.info(f"Battery stream task finished. Total updates sent: {total_samples_sent}")

    async def send_event_to_client(self, websocket: websockets.WebSocketServerProtocol, event_type: EventType, data: Dict[str, Any]):
        """Send an event message to a specific client."""
        if not websocket:
            logger.warning("Attempted to send event to None websocket.")
            return
        message = {
            "type": "event",
            "event_type": event_type.value,
            "data": data
        }
        try:
            await websocket.send(json.dumps(message))
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"Connection closed while sending event to {websocket.remote_address}")
            self.clients.discard(websocket)
        except Exception as e:
            logger.error(f"Error sending event to client {websocket.remote_address}: {e}")

    async def send_error_to_client(self, websocket: websockets.WebSocketServerProtocol, error_message: str):
        """Send an error event to a specific client."""
        await self.send_event_to_client(websocket, EventType.ERROR, {"error": error_message})

    async def broadcast_event(self, event_type: EventType, data: Dict[str, Any]):
        """Broadcast an event message to all connected clients."""
        message = {
            "type": "event",
            "event_type": event_type.value,
            "data": data
        }
        await self.broadcast(json.dumps(message))

    async def broadcast(self, message: str):
        """Broadcast message to all connected clients using asyncio.gather."""
        if not self.clients:
            return

        # 연결이 끊어진 클라이언트를 추적
        disconnected_clients = set()

        # 각 클라이언트에 메시지 전송 시도
        for client in list(self.clients):
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                logger.warning(f"Connection closed for client {client.remote_address}")
                disconnected_clients.add(client)
            except Exception as e:
                logger.error(f"Error sending message to client {client.remote_address}: {e}")
                disconnected_clients.add(client)

        # 연결이 끊어진 클라이언트 정리
        for client in disconnected_clients:
            if client in self.clients:
                self.clients.remove(client)
                try:
                    await client.close()
                except:
                    pass

        if disconnected_clients:
            logger.info(f"Removed {len(disconnected_clients)} disconnected clients. Total clients: {len(self.clients)}")

    def get_connected_clients(self) -> int:
        """Get the number of currently connected clients"""
        return len(self.clients)

    async def _check_bluetooth_status(self) -> bool:
        """블루투스 상태를 확인합니다."""
        try:
            await BleakScanner.discover(timeout=1.0)
            return True
        except Exception as e:
            if "Bluetooth device is turned off" in str(e):
                return False
            logger.error(f"Error checking Bluetooth status: {e}")
            return False

    async def _broadcast_bluetooth_status(self, is_available: bool):
        """블루투스 상태를 모든 클라이언트에게 전달합니다."""
        await self.broadcast_event(EventType.BLUETOOTH_STATUS, {
            "available": is_available,
            "message": "Bluetooth is available" if is_available else "Bluetooth is turned off"
        })
