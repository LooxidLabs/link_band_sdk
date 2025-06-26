import asyncio
import json
import logging
import websockets
import time # For timestamping batched data
from typing import Set, Dict, Any, Optional, List, Callable
from enum import Enum, auto
from datetime import datetime
from app.core.device import DeviceManager, DeviceStatus
from app.core.device_registry import DeviceRegistry
from bleak import BleakScanner
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
from app.core.utils import ensure_port_available
from app.data.data_recorder import DataRecorder
from app.core.signal_processing import SignalProcessor

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
    DATA_RECEIVED = "data_received"
    STATUS = "status"

class WebSocketServer:
    def __init__(self, 
                 host: str = "localhost", 
                 port: int = 18765, 
                 data_recorder: Optional[DataRecorder] = None,
                 device_manager: Optional[DeviceManager] = None,
                 device_registry: Optional[DeviceRegistry] = None
                ):
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.is_streaming = False
        self.server: Optional[websockets.WebSocketServer] = None
        self.stream_tasks: Dict[str, Optional[asyncio.Task]] = {
            'eeg': None,
            'ppg': None,
            'acc': None,
            'battery': None
        }
        self.device_manager = device_manager
        self.device_registry = device_registry
        self.auto_connect_task: Optional[asyncio.Task] = None
        self.data_stream_stats = {
            'eeg': {'samples_per_sec': 0},
            'ppg': {'samples_per_sec': 0},
            'acc': {'samples_per_sec': 0},
            'bat': {'samples_per_sec': 0},
            'bat_level': 0
        }
        self.device_sampling_stats = {
            'eeg': {'samples_per_sec': 0},
            'ppg': {'samples_per_sec': 0},
            'acc': {'samples_per_sec': 0},
            'bat': {'samples_per_sec': 0},
            'bat_level': 0
        }
        self.connected_clients: Dict[str, WebSocket] = {}
        self.event_callbacks: Dict[str, List[Callable]] = {
            EventType.DEVICE_CONNECTED.value: [],
            EventType.DEVICE_DISCONNECTED.value: [],
            EventType.DATA_RECEIVED.value: [],
            EventType.ERROR.value: [],
            EventType.STATUS.value: []
        }
        # Ensure device_manager is available before adding callback
        if self.device_manager:
            self.device_manager.add_processed_data_callback(self._handle_processed_data)
        else:
            logger.warning("DeviceManager not provided to WebSocketServer, processed data callback not added.")
            
        self.data_recorder = data_recorder
        self.loop = None
        self.server_task = None
        self.acc_timestamps: Dict[str, List[float]] = {}
        self.ecg_timestamps: Dict[str, List[float]] = {}
        self.server_initialized = False
        logger.info(f"WebSocketServer initialized. Host: {host}, Port: {port}. "
                    f"DataRecorder {'IS' if self.data_recorder else 'IS NOT'} configured. "
                    f"DeviceManager {'IS' if self.device_manager else 'IS NOT'} configured. "
                    f"DeviceRegistry {'IS' if self.device_registry else 'IS NOT'} configured.")

    def setup_routes(self):
        """Setup FastAPI routes and WebSocket endpoints."""
        pass  # Routes are now handled in main.py

    async def initialize(self):
        """Initialize the WebSocket server."""
        logger.info("Initializing WebSocket server...")

        # 서버 재시작
        # If a server already exists, close it before creating a new one
        if self.server:
            logger.info("Existing WebSocket server found. Closing before re-initializing...")
            self.server.close()
            try:
                await asyncio.wait_for(self.server.wait_closed(), timeout=5.0)
                logger.info("Previous WebSocket server closed successfully.")
            except asyncio.TimeoutError:
                logger.warning("Timeout while closing previous WebSocket server.")
            self.server = None

        # Cancel auto-connect task if it exists
        if self.auto_connect_task:
            self.auto_connect_task.cancel()
            try:
                await self.auto_connect_task
            except asyncio.CancelledError:
                pass
            self.auto_connect_task = None

        # Cancel all streaming tasks
        for sensor_type, task in self.stream_tasks.items():
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                self.stream_tasks[sensor_type] = None

        # Clear all clients
        for client in list(self.clients):
            try:
                await client.close(1000, "Server reinitializing")
            except Exception as e:
                logger.error(f"Error closing client connection: {e}")
        self.clients.clear()

        # Check if port is available
        if not ensure_port_available(self.port):
            logger.error(f"Cannot start server: Port {self.port} is in use and could not be freed")
            raise OSError(f"Port {self.port} is already in use")

        try:
            # Create new server
            self.server = await websockets.serve(
                self.handle_client,
                self.host,
                self.port
            )
            
            # Start auto-connect task
            self.auto_connect_task = asyncio.create_task(self._auto_connect_loop())
            
            # Start periodic status update
            asyncio.create_task(self._periodic_status_update())
            
            logger.info(f"WebSocket server initialized on {self.host}:{self.port}")
            self.server_initialized = True
            return True
        except Exception as e:
            logger.error(f"Failed to initialize WebSocket server: {e}")
            raise

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

    async def stop(self):
        """Stop the WebSocket server."""
        # Remove callback before stopping
        self.device_manager.remove_processed_data_callback(self._handle_processed_data)
        
        # Cleanup connections
        for client_id in list(self.connected_clients.keys()):
            await self.handle_client_disconnect(client_id)
        
        # Stop stream engine
        if hasattr(self, 'stream_engine'):
            await self.stream_engine.stop()
        
        print("WebSocket server stopped")

    async def _auto_connect_loop(self):
        """Periodically check and connect to registered devices"""
        print("🔄 Auto-connect loop started")
        connection_attempts = {}  # 각 디바이스별 연결 시도 횟수 추적
        last_scan_time = 0
        scan_interval = 30  # 30초마다 스캔
        
        while True:
            try:
                current_time = time.time()
                
                # 연결된 디바이스가 없으면 등록된 디바이스 중 하나를 연결
                if not self.device_manager.is_connected():
                    registered_devices = self.device_registry.get_registered_devices()
                    if registered_devices:
                        # 주기적으로 스캔 실행 (디바이스 캐시 업데이트)
                        if current_time - last_scan_time > scan_interval:
                            print("🔍 Updating device cache via scan...")
                            try:
                                await self.device_manager.scan_devices()
                                last_scan_time = current_time
                                print("✅ Device cache updated")
                            except Exception as scan_error:
                                print(f"⚠️ Scan failed during auto-connect: {scan_error}")
                        
                        for device in registered_devices:
                            address = device.get('address')
                            if address:
                                # 연결 시도 횟수 제한 (3번 실패 후 60초 대기)
                                if address not in connection_attempts:
                                    connection_attempts[address] = {'count': 0, 'last_attempt': 0}
                                
                                attempt_info = connection_attempts[address]
                                
                                # 3번 연속 실패 후 60초 대기
                                if attempt_info['count'] >= 3:
                                    if current_time - attempt_info['last_attempt'] < 60:
                                        continue  # 아직 대기 시간
                                    else:
                                        attempt_info['count'] = 0  # 대기 시간 끝, 재시도
                                
                                # 마지막 시도로부터 최소 15초 간격 유지
                                if current_time - attempt_info['last_attempt'] < 15:
                                    continue
                                
                                print(f"🔍 Auto-connecting to {address} (attempt {attempt_info['count'] + 1}/3)")
                                attempt_info['last_attempt'] = current_time
                                attempt_info['count'] += 1
                                
                                # 캐시된 디바이스 사용해서 연결 시도 (스캔 중복 방지)
                                success = await self.device_manager.connect(address, use_cached_device=True)
                                if success:
                                    print(f"✅ Successfully auto-connected to {address}")
                                    connection_attempts[address]['count'] = 0  # 성공 시 카운터 리셋
                                    # 연결 성공 이벤트 브로드캐스트
                                    await self.broadcast_event(EventType.DEVICE_CONNECTED, {
                                        "address": address,
                                        "name": self.device_manager.device_name or "Unknown",
                                        "connection_type": "auto"
                                    })
                                    break
                                else:
                                    print(f"❌ Auto-connect failed to {address}")
                
                # 15초마다 체크 (더 긴 간격으로 시스템 부하 감소)
                await asyncio.sleep(15)
                
            except asyncio.CancelledError:
                print("🛑 Auto-connect loop cancelled")
                break
            except Exception as e:
                print(f"❌ Auto-connect error: {e}")
                await asyncio.sleep(15)

    async def handle_client_message(self, websocket: websockets.WebSocketServerProtocol, message: str):
        """Handle messages from clients"""
        try:
            logger.info(f"Received message: {message}")
            # Parse JSON message if it's a string
            if isinstance(message, str):
                try:
                    data = json.loads(message)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON message received: {message}")
                    return
            else:
                data = message

            # Handle ping/pong
            if isinstance(data, str) and data.strip() == "ping":
                await websocket.send("pong")
                return

            # Ensure data is a dictionary
            if not isinstance(data, dict):
                logger.error(f"Invalid message format: {data}")
                await self.send_error_to_client(websocket, "Invalid message format: expected JSON object")
                return

            message_type = data.get('type')
            if not message_type:
                logger.warning("Message missing type")
                await self.send_error_to_client(websocket, "Message missing type")
                return

            if message_type == 'command':
                command = data.get('command')
                payload = data.get('payload', {})
                
                if not command:
                    logger.warning("Command message missing command")
                    await self.send_error_to_client(websocket, "Command message missing command")
                    return

                logger.info(f"Processing command: {command} with payload: {payload}")

                # Command handling logic
                if command == "check_device_connection":
                    await self._send_current_device_status(websocket)
                elif command == "check_bluetooth_status":
                    is_bluetooth_available = await self._check_bluetooth_status()
                    await self._broadcast_bluetooth_status(is_bluetooth_available)
                elif command == "scan_devices":
                    is_bluetooth_available = await self._check_bluetooth_status()
                    if not is_bluetooth_available:
                        await self.send_error_to_client(websocket, "Bluetooth is turned off")
                        return
                    asyncio.create_task(self._run_scan_and_notify(websocket))
                elif command == "connect_device":
                    is_bluetooth_available = await self._check_bluetooth_status()
                    if not is_bluetooth_available:
                        await self.send_error_to_client(websocket, "Bluetooth is turned off")
                        return
                    address = payload.get("address")
                    if address:
                        asyncio.create_task(self._run_connect_and_notify(address))
                    else:
                        await self.send_error_to_client(websocket, "Address is required for connect_device command")
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
                else:
                    logger.warning(f"Unknown command received: {command}")
                    await self.send_error_to_client(websocket, f"Unknown command: {command}")

            elif message_type == 'data':
                # Process the data
                try:
                    # Get the sensor type from the data
                    sensor_type = data.get('sensor_type')
                    if not sensor_type:
                        logger.warning("Data message missing sensor_type")
                        await self.send_error_to_client(websocket, "Data message missing sensor_type")
                        return

                    # Process the data based on sensor type
                    if sensor_type == 'eeg':
                        eeg_data = data.get('data', [])
                        if eeg_data:
                            await self.broadcast_event(EventType.DATA_RECEIVED, {
                                'type': 'eeg',
                                'data': eeg_data
                            })
                    elif sensor_type == 'ppg':
                        ppg_data = data.get('data', [])
                        if ppg_data:
                            await self.broadcast_event(EventType.DATA_RECEIVED, {
                                'type': 'ppg',
                                'data': ppg_data
                            })
                    elif sensor_type == 'acc':
                        acc_data = data.get('data', [])
                        if acc_data:
                            await self.broadcast_event(EventType.DATA_RECEIVED, {
                                'type': 'acc',
                                'data': acc_data
                            })
                    elif sensor_type == 'battery':
                        battery_data = data.get('data', [])
                        if battery_data:
                            await self.broadcast_event(EventType.DATA_RECEIVED, {
                                'type': 'battery',
                                'data': battery_data
                            })
                    else:
                        logger.warning(f"Unknown sensor type: {sensor_type}")
                        await self.send_error_to_client(websocket, f"Unknown sensor type: {sensor_type}")

                except Exception as e:
                    logger.error(f"Error processing data: {e}")
                    await self.send_error_to_client(websocket, f"Error processing data: {e}")

            else:
                logger.warning(f"Unknown message type: {message_type}")
                await self.send_error_to_client(websocket, f"Unknown message type: {message_type}")

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
            print(f"Attempting connection to {device_address}")
            
            # DeviceManager의 connect 메서드가 이미 스캔을 포함하므로 직접 연결 시도
            if not await self.device_manager.connect(device_address):
                print(f"Failed to connect to device {device_address}")
                await self.broadcast_event(EventType.DEVICE_CONNECTION_FAILED, {
                    "address": device_address,
                    "reason": "connection_failed"
                })
                return

            # Start data acquisition
            if not await self.device_manager.start_data_acquisition():
                logger.error("Failed to start data acquisition")
                await self._cleanup_connection()
                await self.broadcast_event(EventType.DEVICE_CONNECTION_FAILED, {
                    "address": device_address,
                    "reason": "data_acquisition_failed"
                })
                return

            # Start battery monitoring
            if not await self.device_manager.start_battery_monitoring():
                logger.error("Failed to start battery monitoring")
                # 배터리 모니터링 실패는 치명적이지 않으므로 계속 진행

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
                
                # Wait a moment for WebSocket clients to connect before starting streaming
                logger.info("Waiting 2 seconds for WebSocket clients to connect...")
                await asyncio.sleep(2)
                
                # Automatically start streaming after successful connection
                await self.start_streaming()
            else:
                logger.error("Failed to get device info after connection")
                await self._cleanup_connection()
                await self.broadcast_event(EventType.DEVICE_CONNECTION_FAILED, {
                    "address": device_address,
                    "reason": "device_info_failed"
                })

        except Exception as e:
            logger.error(f"Error in _run_connect_and_notify: {e}", exc_info=True)
            await self._cleanup_connection()
            await self.broadcast_event(EventType.DEVICE_CONNECTION_FAILED, {
                "address": device_address,
                "reason": str(e)
            })

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
            
            # Wait a moment for data acquisition to stabilize
            logger.info("Waiting 1 second for data acquisition to stabilize...")
            await asyncio.sleep(1)

        # Start battery monitoring if not already running
        if not self.device_manager.battery_running:
            logger.info("Battery monitoring not started, attempting to start...")
            if not await self.device_manager.start_battery_monitoring():
                logger.warning("Failed to start battery monitoring, but continuing with other streams")
            else:
                # Wait a moment for battery monitoring to stabilize
                logger.info("Waiting 0.5 seconds for battery monitoring to stabilize...")
                await asyncio.sleep(0.5)

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
        tasks_cancelled = False
        if self.is_streaming:
            self.is_streaming = False
        # Cancel all streaming tasks regardless of is_streaming
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
                tasks_cancelled = True
        if tasks_cancelled:
            await self.broadcast_event(EventType.STREAM_STOPPED, {"status": "streaming_stopped"})
            logger.info("Streaming stopped flag set.")
            return True
        else:
            logger.info("No streaming tasks were active.")
            return False

    def _update_sampling_rate(self, sensor_type, processed_data):
        if len(processed_data) < 2:
            return
        timestamps = [sample["timestamp"] for sample in processed_data]
        intervals = [t2 - t1 for t1, t2 in zip(timestamps[:-1], timestamps[1:])]
        avg_interval = sum(intervals) / len(intervals)
        if avg_interval > 0:
            sampling_rate = 1.0 / avg_interval
        else:
            sampling_rate = 0
        self.device_sampling_stats[sensor_type]["samples_per_sec"] = round(sampling_rate, 2)

    async def stream_eeg_data(self):
        logger.info("EEG stream task started.")
        SEND_INTERVAL = 0.04  # 25Hz (40ms)
        NO_DATA_TIMEOUT = 5.0 # 5초 동안 데이터 없으면 경고 후 종료
        last_data_time = time.time()
        total_samples_sent = 0
        last_log_time = time.time()
        samples_since_last_log = 0
        timestamp_buffer = []
        WINDOW_SIZE = 60
        last_rate_log_time = time.time()
        RATE_LOG_INTERVAL = 5
        
        raw_device_id = "unknown_device" 
        if self.device_manager and self.device_manager.get_device_info():
            device_info = self.device_manager.get_device_info()
            if device_info and isinstance(device_info, dict):
                raw_device_id = device_info.get('address', 'unknown_device')
        
        device_id_for_filename = raw_device_id.replace(":", "-").replace(" ", "_")

        try:
            while self.is_streaming:
                await asyncio.sleep(SEND_INTERVAL)
                if not self.is_streaming: break

                raw_data = await self.device_manager.get_and_clear_eeg_buffer()
                processed_data = await self.device_manager.get_and_clear_processed_eeg_buffer()
                
                current_time = time.time()
                
                # logger.info(f"[STREAM_EEG_DEBUG] Attempting data recording. DataRecorder object: {self.data_recorder}")
                # if self.data_recorder:
                #     logger.info(f"[STREAM_EEG_DEBUG] data_recorder.is_recording: {self.data_recorder.is_recording}")
                
                raw_data_len = len(raw_data) if raw_data else 0
                processed_data_len = len(processed_data) if processed_data else 0
                # logger.info(f"[STREAM_EEG_DEBUG] Raw data len: {raw_data_len}, Processed data len: {processed_data_len}")

                if raw_data_len > 0:
                    logger.debug(f"[STREAM_EEG_DEBUG] First raw sample type: {type(raw_data[0]) if raw_data_len > 0 else 'N/A'}")
                if processed_data_len > 0:
                    logger.debug(f"[STREAM_EEG_DEBUG] First processed sample type: {type(processed_data[0]) if processed_data_len > 0 else 'N/A'}")

                if self.data_recorder and self.data_recorder.is_recording:
                    logger.info(f"[STREAM_EEG_DEBUG] REC_CONDITION_MET. Raw data len: {raw_data_len}, Processed data len: {processed_data_len}")
                    if raw_data:
                        for i, sample in enumerate(raw_data): 
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_eeg_raw",
                                    data=sample 
                                )
                            else:
                                logger.warning(f"Skipping non-dict EEG raw sample at index {i} for recording. Type: {type(sample)}, Data: {str(sample)[:100]}...")
                    if processed_data:
                        for i, sample in enumerate(processed_data): 
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_eeg_processed",
                                    data=sample
                                )
                            else:
                                logger.warning(f"Skipping non-dict EEG processed sample at index {i} for recording. Type: {type(sample)}, Data: {str(sample)[:100]}...")
                
                if raw_data:
                    raw_message = {
                        "type": "raw_data",
                        "sensor_type": "eeg",
                        "device_id": raw_device_id, # Broadcast original device_id
                        "timestamp": current_time,
                        "data": raw_data
                    }
                    try:
                        await self.broadcast(json.dumps(raw_message))
                        total_samples_sent += len(raw_data)
                        samples_since_last_log += len(raw_data)
                        
                        for sample in raw_data:
                            if isinstance(sample, dict) and "timestamp" in sample:
                                timestamp_buffer.append(sample["timestamp"])
                        cutoff_time = current_time - WINDOW_SIZE
                        timestamp_buffer = [ts for ts in timestamp_buffer if ts > cutoff_time]
                        if raw_data and isinstance(raw_data, list) and len(raw_data) > 0 and isinstance(raw_data[0], dict):
                            self._update_sampling_rate('eeg', raw_data)
                    except Exception as e:
                        logger.error(f"Error broadcasting raw EEG data: {e}", exc_info=True)

                if processed_data:
                    processed_message = {
                        "type": "processed_data",
                        "sensor_type": "eeg",
                        "device_id": raw_device_id, # Broadcast original device_id
                        "timestamp": current_time,
                        "data": processed_data
                    }
                    try:
                        await self.broadcast(json.dumps(processed_message))
                    except Exception as e:
                        logger.error(f"Error broadcasting processed EEG data: {e}", exc_info=True)

                if raw_data or processed_data:
                    last_data_time = current_time
                    if current_time - last_log_time >= 1.0:
                        logger.info(f"[EEG] Samples/sec: {samples_since_last_log:4d} | "
                                  f"Total: {total_samples_sent:6d} | "
                                  f"Raw Buffer: {len(raw_data) if raw_data else 0:4d} | "
                                  f"Processed Buffer: {len(processed_data) if processed_data else 0:4d} samples")
                        samples_since_last_log = 0
                        last_log_time = current_time
                    if current_time - last_rate_log_time >= RATE_LOG_INTERVAL:
                        if len(timestamp_buffer) > 1:
                            intervals = [timestamp_buffer[i+1] - timestamp_buffer[i] for i in range(len(timestamp_buffer)-1)]
                            if intervals:
                                avg_interval = sum(intervals) / len(intervals)
                                actual_rate = 1.0 / avg_interval if avg_interval > 0 else 0
                                logger.info(f"[EEG] Actual sampling rate: {actual_rate:.2f} Hz "
                                          f"(based on {len(timestamp_buffer)} samples in last {WINDOW_SIZE}s)")
                                if isinstance(self.device_sampling_stats, dict) and 'eeg' in self.device_sampling_stats and isinstance(self.device_sampling_stats['eeg'], dict):
                                    self.device_sampling_stats['eeg']['samples_per_sec'] = actual_rate
                        last_rate_log_time = current_time
                elif time.time() - last_data_time > NO_DATA_TIMEOUT:
                    logger.warning("No EEG data received for too long, stopping EEG stream task.")
                    break # Exit loop if no data

        except asyncio.CancelledError:
            logger.info("EEG stream task received cancellation.")
        except Exception as e:
            logger.error(f"Error in EEG stream loop: {e}", exc_info=True)
        finally:
            logger.info(f"EEG stream task finished. Total samples sent: {total_samples_sent}")

    async def stream_ppg_data(self):
        logger.info("PPG stream task started.")
        SEND_INTERVAL = 0.02  # 50Hz (20ms)
        NO_DATA_TIMEOUT = 5.0
        last_data_time = time.time()
        total_samples_sent = 0
        last_log_time = time.time()
        samples_since_last_log = 0
        timestamp_buffer = []
        WINDOW_SIZE = 60
        last_rate_log_time = time.time()
        RATE_LOG_INTERVAL = 5
        
        raw_device_id = "unknown_device"
        if self.device_manager and self.device_manager.get_device_info():
            device_info = self.device_manager.get_device_info()
            if device_info and isinstance(device_info, dict):
                raw_device_id = device_info.get('address', 'unknown_device')
        
        device_id_for_filename = raw_device_id.replace(":", "-").replace(" ", "_")

        try:
            while self.is_streaming:
                await asyncio.sleep(SEND_INTERVAL)
                if not self.is_streaming: break

                raw_data = await self.device_manager.get_and_clear_ppg_buffer()
                processed_data = await self.device_manager.get_and_clear_processed_ppg_buffer()
                
                current_time = time.time()
                
                # logger.info(f"[STREAM_PPG_DEBUG] Attempting data recording. DataRecorder object: {self.data_recorder}")
                # if self.data_recorder:
                #     logger.info(f"[STREAM_PPG_DEBUG] data_recorder.is_recording: {self.data_recorder.is_recording}")
                
                raw_data_len = len(raw_data) if raw_data else 0
                processed_data_len = len(processed_data) if processed_data else 0
                # logger.info(f"[STREAM_PPG_DEBUG] Raw data len: {raw_data_len}, Processed data len: {processed_data_len}")
                
                if raw_data_len > 0:
                    logger.debug(f"[STREAM_PPG_DEBUG] First raw sample type: {type(raw_data[0]) if raw_data_len > 0 else 'N/A'}")
                if processed_data_len > 0:
                    logger.debug(f"[STREAM_PPG_DEBUG] First processed sample type: {type(processed_data[0]) if processed_data_len > 0 else 'N/A'}")

                if self.data_recorder and self.data_recorder.is_recording:
                    logger.info(f"[STREAM_PPG_DEBUG] REC_CONDITION_MET. Raw data len: {raw_data_len}, Processed data len: {processed_data_len}")
                    if raw_data:
                        for i, sample in enumerate(raw_data):
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_ppg_raw",
                                    data=sample
                                )
                            else:
                                logger.warning(f"Skipping non-dict PPG raw sample at index {i} for recording. Type: {type(sample)}, Data: {str(sample)[:100]}...")
                    if processed_data:
                        for i, sample in enumerate(processed_data):
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_ppg_processed",
                                    data=sample
                                )
                            else:
                                logger.warning(f"Skipping non-dict PPG processed sample at index {i} for recording. Type: {type(sample)}, Data: {str(sample)[:100]}...")
                
                if raw_data:
                    raw_message = {
                        "type": "raw_data",
                        "sensor_type": "ppg",
                        "device_id": raw_device_id,
                        "timestamp": current_time,
                        "data": raw_data
                    }
                    try:
                        await self.broadcast(json.dumps(raw_message))
                        total_samples_sent += len(raw_data)
                        samples_since_last_log += len(raw_data)
                        
                        for sample in raw_data:
                            if isinstance(sample, dict) and "timestamp" in sample:
                                timestamp_buffer.append(sample["timestamp"])
                        cutoff_time = current_time - WINDOW_SIZE
                        timestamp_buffer = [ts for ts in timestamp_buffer if ts > cutoff_time]
                        if raw_data and isinstance(raw_data, list) and len(raw_data) > 0 and isinstance(raw_data[0], dict):
                            self._update_sampling_rate('ppg', raw_data)
                    except Exception as e:
                        logger.error(f"Error broadcasting raw PPG data: {e}", exc_info=True)

                if processed_data:
                    processed_message = {
                        "type": "processed_data",
                        "sensor_type": "ppg",
                        "device_id": raw_device_id,
                        "timestamp": current_time,
                        "data": processed_data
                    }
                    try:
                        await self.broadcast(json.dumps(processed_message))
                    except Exception as e:
                        logger.error(f"Error broadcasting processed PPG data: {e}", exc_info=True)

                if raw_data or processed_data:
                    last_data_time = current_time
                    if current_time - last_log_time >= 1.0:
                        logger.info(f"[PPG] Samples/sec: {samples_since_last_log:4d} | "
                                  f"Total: {total_samples_sent:6d} | "
                                  f"Raw Buffer: {len(raw_data) if raw_data else 0:4d} | "
                                  f"Processed Buffer: {len(processed_data) if processed_data else 0:4d} samples")
                        samples_since_last_log = 0
                        last_log_time = current_time
                    if current_time - last_rate_log_time >= RATE_LOG_INTERVAL:
                        if len(timestamp_buffer) > 1:
                            intervals = [timestamp_buffer[i+1] - timestamp_buffer[i] for i in range(len(timestamp_buffer)-1)]
                            if intervals:
                                avg_interval = sum(intervals) / len(intervals)
                                actual_rate = 1.0 / avg_interval if avg_interval > 0 else 0
                                logger.info(f"[PPG] Actual sampling rate: {actual_rate:.2f} Hz "
                                          f"(based on {len(timestamp_buffer)} samples in last {WINDOW_SIZE}s)")
                                if isinstance(self.device_sampling_stats, dict) and 'ppg' in self.device_sampling_stats and isinstance(self.device_sampling_stats['ppg'], dict):
                                    self.device_sampling_stats['ppg']['samples_per_sec'] = actual_rate
                        last_rate_log_time = current_time
                elif time.time() - last_data_time > NO_DATA_TIMEOUT:
                    logger.warning("No PPG data received for too long, stopping PPG stream task.")
                    break

        except asyncio.CancelledError:
            logger.info("PPG stream task received cancellation.")
        except Exception as e:
            logger.error(f"Error in PPG stream loop: {e}", exc_info=True)
        finally:
            logger.info(f"PPG stream task finished. Total samples sent: {total_samples_sent}")

    async def stream_acc_data(self):
        logger.info("ACC stream task started.")
        SEND_INTERVAL = 0.033  # ~30Hz (33.3ms)
        NO_DATA_TIMEOUT = 5.0
        last_data_time = time.time()
        total_samples_sent = 0
        last_log_time = time.time()
        samples_since_last_log = 0
        timestamp_buffer = []
        WINDOW_SIZE = 60
        last_rate_log_time = time.time()
        RATE_LOG_INTERVAL = 5
        
        raw_device_id = "unknown_device"
        if self.device_manager and self.device_manager.get_device_info():
            device_info = self.device_manager.get_device_info()
            if device_info and isinstance(device_info, dict):
                raw_device_id = device_info.get('address', 'unknown_device')
        
        device_id_for_filename = raw_device_id.replace(":", "-").replace(" ", "_")

        try:
            while self.is_streaming:
                await asyncio.sleep(SEND_INTERVAL)
                if not self.is_streaming: break

                raw_data = await self.device_manager.get_and_clear_acc_buffer()
                processed_data = await self.device_manager.get_and_clear_processed_acc_buffer()
                
                current_time = time.time()
                
                # ACC 레코딩 상태는 EEG에서 이미 출력하므로 생략
                raw_data_len = len(raw_data) if raw_data else 0
                processed_data_len = len(processed_data) if processed_data else 0

                if raw_data_len > 0:
                    logger.debug(f"[STREAM_ACC_DEBUG] First raw sample type: {type(raw_data[0]) if raw_data_len > 0 else 'N/A'}")
                if processed_data_len > 0:
                    logger.debug(f"[STREAM_ACC_DEBUG] First processed sample type: {type(processed_data[0]) if processed_data_len > 0 else 'N/A'}")

                if self.data_recorder and self.data_recorder.is_recording:
                    logger.info(f"[STREAM_ACC_DEBUG] REC_CONDITION_MET. Raw data len: {raw_data_len}, Processed data len: {processed_data_len}")
                    if raw_data:
                        for i, sample in enumerate(raw_data):
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_acc_raw",
                                    data=sample
                                )
                            else:
                                logger.warning(f"Skipping non-dict ACC raw sample at index {i} for recording. Type: {type(sample)}, Data: {str(sample)[:100]}...")
                    if processed_data:
                        for i, sample in enumerate(processed_data):
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_acc_processed",
                                    data=sample
                                )
                            else:
                                logger.warning(f"Skipping non-dict ACC processed sample at index {i} for recording. Type: {type(sample)}, Data: {str(sample)[:100]}...")
                
                if raw_data:
                    raw_message = {
                        "type": "raw_data",
                        "sensor_type": "acc",
                        "device_id": raw_device_id,
                        "timestamp": current_time,
                        "data": raw_data
                    }
                    try:
                        await self.broadcast(json.dumps(raw_message))
                        total_samples_sent += len(raw_data)
                        samples_since_last_log += len(raw_data)
                        
                        for sample in raw_data:
                            if isinstance(sample, dict) and "timestamp" in sample:
                                timestamp_buffer.append(sample["timestamp"])
                        cutoff_time = current_time - WINDOW_SIZE
                        timestamp_buffer = [ts for ts in timestamp_buffer if ts > cutoff_time]
                        if raw_data and isinstance(raw_data, list) and len(raw_data) > 0 and isinstance(raw_data[0], dict):
                            self._update_sampling_rate('acc', raw_data)
                    except Exception as e:
                        logger.error(f"Error broadcasting raw ACC data: {e}", exc_info=True)

                if processed_data:
                    processed_message = {
                        "type": "processed_data",
                        "sensor_type": "acc",
                        "device_id": raw_device_id,
                        "timestamp": current_time,
                        "data": processed_data
                    }
                    try:
                        await self.broadcast(json.dumps(processed_message))
                    except Exception as e:
                        logger.error(f"Error broadcasting processed ACC data: {e}", exc_info=True)

                if raw_data or processed_data:
                    last_data_time = current_time
                    if current_time - last_log_time >= 1.0:
                        logger.info(f"[ACC] Samples/sec: {samples_since_last_log:4d} | "
                                  f"Total: {total_samples_sent:6d} | "
                                  f"Raw Buffer: {len(raw_data) if raw_data else 0:4d} | "
                                  f"Processed Buffer: {len(processed_data) if processed_data else 0:4d} samples")
                        samples_since_last_log = 0
                        last_log_time = current_time
                    if current_time - last_rate_log_time >= RATE_LOG_INTERVAL:
                        if len(timestamp_buffer) > 1:
                            intervals = [timestamp_buffer[i+1] - timestamp_buffer[i] for i in range(len(timestamp_buffer)-1)]
                            if intervals:
                                avg_interval = sum(intervals) / len(intervals)
                                actual_rate = 1.0 / avg_interval if avg_interval > 0 else 0
                                logger.info(f"[ACC] Actual sampling rate: {actual_rate:.2f} Hz "
                                          f"(based on {len(timestamp_buffer)} samples in last {WINDOW_SIZE}s)")
                                if isinstance(self.device_sampling_stats, dict) and 'acc' in self.device_sampling_stats and isinstance(self.device_sampling_stats['acc'], dict):
                                    self.device_sampling_stats['acc']['samples_per_sec'] = actual_rate
                        last_rate_log_time = current_time
                elif time.time() - last_data_time > NO_DATA_TIMEOUT:
                    logger.warning("No ACC data received for too long, stopping ACC stream task.")
                    break

        except asyncio.CancelledError:
            logger.info("ACC stream task received cancellation.")
        except Exception as e:
            logger.error(f"Error in ACC stream loop: {e}", exc_info=True)
        finally:
            logger.info(f"ACC stream task finished. Total samples sent: {total_samples_sent}")

    async def stream_battery_data(self):
        logger.info("Battery stream task started.")
        SEND_INTERVAL = 0.1  # 100ms마다 체크 (10Hz)
        NO_DATA_TIMEOUT = 10.0 
        last_data_time = time.time()
        total_samples_sent = 0
        last_log_time = time.time()
        samples_since_last_log = 0
        last_battery_level_reported = None 
        
        timestamp_buffer = [] 
        WINDOW_SIZE = 60 
        last_rate_log_time = time.time()
        RATE_LOG_INTERVAL = 5  
        
        raw_device_id = "unknown_device"
        if self.device_manager and self.device_manager.get_device_info():
            device_info = self.device_manager.get_device_info()
            if device_info and isinstance(device_info, dict): 
                raw_device_id = device_info.get('address', 'unknown_device')
        
        device_id_for_filename = raw_device_id.replace(":", "-").replace(" ", "_")

        try:
            while self.is_streaming:
                await asyncio.sleep(SEND_INTERVAL)
                if not self.is_streaming: break

                current_time = time.time()
                actual_battery_data_list = await self.device_manager.get_and_clear_battery_buffer() 
                
                # 배터리 레코딩 상태는 EEG에서 이미 출력하므로 생략
                actual_battery_data_len = len(actual_battery_data_list) if actual_battery_data_list else 0
                if actual_battery_data_len > 0 :
                     logger.debug(f"[STREAM_BAT_DEBUG] First battery sample type: {type(actual_battery_data_list[0]) if actual_battery_data_len > 0 else 'N/A'}")

                if self.data_recorder and self.data_recorder.is_recording:
                    logger.info(f"[STREAM_BAT_DEBUG] REC_CONDITION_MET. Actual battery data len: {actual_battery_data_len}")
                    if actual_battery_data_list: 
                        for i, sample in enumerate(actual_battery_data_list): 
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_bat", 
                                    data=sample 
                                )
                                if 'level' in sample: # Update last reported level from actual data
                                     last_battery_level_reported = sample['level']
                            else:
                                logger.warning(f"Skipping non-dict actual battery sample at index {i} for recording. Type: {type(sample)}, Data: {str(sample)[:100]}...")
                
                # 브로드캐스트는 추정된 값이라도 할 수 있도록 기존 로직 유지 (단, 저장과는 별개)
                display_battery_data = actual_battery_data_list
                if not display_battery_data and last_battery_level_reported is not None:
                     display_battery_data = [{"timestamp": current_time, "level": last_battery_level_reported, "source": "estimated"}]
                
                if display_battery_data: # display_battery_data 사용
                    last_data_time = current_time
                    if display_battery_data and isinstance(display_battery_data[-1], dict) and 'level' in display_battery_data[-1]:
                        current_level_for_log = display_battery_data[-1]['level']
                        if 'source' not in display_battery_data[-1] or display_battery_data[-1]['source'] != 'estimated':
                             last_battery_level_reported = current_level_for_log # 실제 데이터일 때만 업데이트
                    else:
                        current_level_for_log = last_battery_level_reported # 이전 값 사용

                    
                    for sample in display_battery_data: # display_battery_data 사용
                        if isinstance(sample, dict) and 'timestamp' in sample:
                            timestamp_buffer.append(sample['timestamp'])
                    
                    cutoff_time = current_time - WINDOW_SIZE
                    timestamp_buffer = [ts for ts in timestamp_buffer if ts > cutoff_time]
                    
                    message = {
                        "type": "sensor_data",
                        "sensor_type": "bat",
                        "device_id": raw_device_id,
                        "timestamp": current_time,
                        "data": display_battery_data # display_battery_data 사용
                    }
                    
                    if display_battery_data and isinstance(display_battery_data, list) and len(display_battery_data) > 0 and isinstance(display_battery_data[0], dict):
                        self._update_sampling_rate('bat', display_battery_data) 
                    
                    try:
                        await self.broadcast(json.dumps(message))
                        total_samples_sent += len(display_battery_data) # display_battery_data 사용
                        samples_since_last_log += len(display_battery_data) # display_battery_data 사용
                        
                        if current_time - last_log_time >= 1.0:
                            logger.info(f"[BAT] Updates/sec: {samples_since_last_log:4d} | "
                                      f"Total: {total_samples_sent:6d} | "
                                      f"Level: {current_level_for_log if current_level_for_log is not None else 'N/A'}%")
                            samples_since_last_log = 0
                            last_log_time = current_time
                            
                        if current_time - last_rate_log_time >= RATE_LOG_INTERVAL:
                            if timestamp_buffer:
                                intervals = [timestamp_buffer[i+1] - timestamp_buffer[i] 
                                           for i in range(len(timestamp_buffer)-1)]
                                if intervals:
                                    avg_interval = sum(intervals) / len(intervals)
                                    actual_rate = 1.0 / avg_interval if avg_interval > 0 else 0
                                    logger.info(f"[BAT] Actual sampling rate: {actual_rate:.2f} Hz "
                                              f"(based on {len(timestamp_buffer)} samples in last {WINDOW_SIZE}s)")
                                    if isinstance(self.device_sampling_stats, dict) and 'bat' in self.device_sampling_stats and isinstance(self.device_sampling_stats['bat'], dict):
                                        self.device_sampling_stats['bat']['samples_per_sec'] = actual_rate
                                    if isinstance(self.device_sampling_stats, dict) and 'bat_level' in self.device_sampling_stats and current_level_for_log is not None:
                                        self.device_sampling_stats['bat_level'] = current_level_for_log
                            last_rate_log_time = current_time
                            
                    except Exception as e:
                        logger.error(f"Error broadcasting battery data: {e}", exc_info=True)
                elif time.time() - last_data_time > NO_DATA_TIMEOUT: # 배터리 데이터가 일정 시간 동안 없을 때
                    logger.warning("No Battery data (real or estimated) for too long, stopping battery stream task.")
                    break # 루프 종료

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

    def register_device(self, device_info: dict) -> bool:
        return self.device_registry.register_device(device_info)

    def unregister_device(self, address: str) -> bool:
        # 현재 연결된 디바이스인 경우 연결 해제
        current_device = self.device_manager.get_device_info()
        if current_device and current_device.get("address") == address:
            # 연결 해제 및 스트리밍 중단
            if self.is_streaming:
                # stop_streaming은 async이므로, 동기적으로 실행
                import asyncio
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    coro = self.stop_streaming()
                    asyncio.create_task(coro)
                else:
                    loop.run_until_complete(self.stop_streaming())
            # 디바이스 연결 해제
            if self.device_manager.is_connected():
                if loop.is_running():
                    coro = self.device_manager.disconnect()
                    asyncio.create_task(coro)
                else:
                    loop.run_until_complete(self.device_manager.disconnect())
        return self.device_registry.unregister_device(address)

    def get_registered_devices(self):
        return self.device_registry.get_registered_devices()

    def is_device_registered(self, address: str) -> bool:
        return self.device_registry.is_device_registered(address)

    def get_stream_status(self):
        return {
            "status": "running" if self.is_streaming else "stopped",
            "clients_connected": self.get_connected_clients(),
            "eeg_sampling_rate": self.device_sampling_stats.get('eeg', {}).get('samples_per_sec', 0),
            "ppg_sampling_rate": self.device_sampling_stats.get('ppg', {}).get('samples_per_sec', 0),
            "acc_sampling_rate": self.device_sampling_stats.get('acc', {}).get('samples_per_sec', 0),
            "bat_sampling_rate": self.device_sampling_stats.get('bat', {}).get('samples_per_sec', 0),
            "bat_level": self.device_sampling_stats.get('bat_level', 0)
        }

    def health_check(self):
        return {
            "status": "running" if self.is_streaming else "stopped",
            "clients_connected": self.get_connected_clients(),
            "is_streaming": self.is_streaming
        }

    def get_connection_info(self):
        return {
            "host": self.host,
            "port": self.port,
            "ws_url": f"ws://{self.host}:{self.port}"
        }

    def get_device_info(self):
        device_info = self.device_manager.get_device_info()
        if not device_info:
            return {"status": "no_device_connected"}
        return {
            "status": "connected",
            "name": device_info.get("name"),
            "address": device_info.get("address"),
            "is_connected": self.device_manager.is_connected()
        }

    def update_stream_stats(self, eeg=None, ppg=None, acc=None, bat=None):
        if eeg is not None:
            self.stream_stats['eeg']['samples_per_sec'] = eeg
        if ppg is not None:
            self.stream_stats['ppg']['samples_per_sec'] = ppg
        if acc is not None:
            self.stream_stats['acc']['samples_per_sec'] = acc
        if bat is not None:
            self.stream_stats['bat']['samples_per_sec'] = bat

    def get_device_status(self):
        try:
            logger.info("get_device_status called")
            info = self.device_manager.get_device_info()
            logger.info(f"device_info: {info}")
            status = {}

            if info:
                logger.info("Device info exists, getting stream status")
                # 스트림 상태에서 샘플링 레이트 가져오기
                stream_status = self.get_stream_status()
                logger.info(f"stream_status: {stream_status}")
                
                status = {
                    "is_connected": True,
                    "device_address": info.get("address"),
                    "device_name": info.get("name"),
                    "connection_time": info.get("connection_time"),
                    "battery_level": stream_status.get('bat_level', 0),
                    "eeg_sampling_rate": stream_status.get('eeg_sampling_rate', 0),
                    "ppg_sampling_rate": stream_status.get('ppg_sampling_rate', 0),
                    "acc_sampling_rate": stream_status.get('acc_sampling_rate', 0),
                    "bat_sampling_rate": stream_status.get('bat_sampling_rate', 0)
                }
                logger.info(f"Final status: {status}")
            else:
                logger.info("No device info, returning disconnected status")
                status = {
                    "is_connected": False,
                    "device_address": None,
                    "device_name": None,
                    "connection_time": None,
                    "battery_level": None
                }
            return status
        except Exception as e:
            logger.error(f"Error in get_device_status: {e}")
            # 예외 발생 시 기본 상태 반환
            return {
                "is_connected": False,
                "device_address": None,
                "device_name": None,
                "connection_time": None,
                "battery_level": None
            }

    async def handle_websocket_connection(self, websocket: WebSocket):
        """Handle new WebSocket connections."""
        client_id = str(uuid.uuid4())
        try:
            await websocket.accept()
            self.connected_clients[client_id] = websocket
            print(f"WebSocket client connected")

            # Send initial status
            await self.send_status(websocket)

            while True:
                try:
                    data = await websocket.receive_json()
                    await self.handle_client_message(client_id, data)
                except WebSocketDisconnect:
                    break
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from client {client_id}")
                except Exception as e:
                    logger.error(f"Error handling message from client {client_id}: {e}")
                    await self.broadcast_event(EventType.ERROR, {"error": str(e)})

        except Exception as e:
            logger.error(f"Error in websocket connection for client {client_id}: {e}")
        finally:
            await self.handle_client_disconnect(client_id)

    async def handle_processed_websocket_connection(self, websocket: WebSocket):
        """Handle WebSocket connections for processed data."""
        client_id = str(uuid.uuid4())
        try:
            await websocket.accept()
            self.connected_clients[client_id] = websocket
            print(f"Processed data client connected")

            # Add data callback for this client
            async def data_callback(data: Dict[str, Any]):
                try:
                    await websocket.send_json(data)
                except Exception as e:
                    logger.error(f"Error sending processed data to client {client_id}: {e}")
                    await self.handle_client_disconnect(client_id)

            self.stream_engine.add_data_callback(data_callback)

            while True:
                try:
                    await websocket.receive_text()  # Keep connection alive
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error in processed websocket connection for client {client_id}: {e}")
                    break

        except Exception as e:
            logger.error(f"Error in processed websocket connection for client {client_id}: {e}")
        finally:
            self.stream_engine.remove_data_callback(data_callback)
            await self.handle_client_disconnect(client_id)

    async def handle_client_message(self, client_id: str, data: Dict[str, Any]):
        """Handle incoming messages from clients."""
        try:
            # 데이터 타입 확인 및 변환
            if isinstance(data, str):
                # 문자열인 경우 JSON 파싱 시도
                try:
                    import json
                    data = json.loads(data)
                except json.JSONDecodeError:
                    print(f"Invalid JSON string: {data}")
                    return
            
            # 딕셔너리가 아닌 경우 처리 중단
            if not isinstance(data, dict):
                print(f"Invalid data type: {type(data)}")
                return
            
            # health_check는 로그하지 않음 (너무 빈번함)
            if data.get('command') != 'health_check':
                print(f"Client message: {data.get('command', 'unknown')}")
        except Exception as e:
            print(f"Client message error: {e}")
            # await self.broadcast_event(EventType.ERROR, {"error": str(e)})

    async def handle_command(self, client_id: str, data: Dict[str, Any]):
        """Handle command messages from clients."""
        # command = data.get('command')
        # if not command:
        #     logger.warning(f"Command message from client {client_id} missing command")
        #     return

        try:
            # if command == 'scan':
            #     devices = await self.device_manager.scan_devices()
            #     await self.send_to_client(client_id, {
            #         'type': 'scan_result',
            #         'devices': devices
            #     })
            # elif command == 'connect':
            #     address = data.get('address')
            #     if not address:
            #         raise ValueError("Connect command missing address")
            #     success = await self.device_manager.connect(address)
            #     await self.broadcast_event(EventType.STATUS, {
            #         'type': 'connection',
            #         'address': address,
            #         'success': success
            #     })
            # elif command == 'disconnect':
            #     address = data.get('address')
            #     if not address:
            #         raise ValueError("Disconnect command missing address")
            #     success = await self.device_manager.disconnect()
            #     await self.broadcast_event(EventType.STATUS, {
            #         'type': 'disconnection',
            #         'address': address,
            #         'success': success
            #     })
            # else:
            #     logger.warning(f"Unknown command from client {client_id}: {command}")
            # 명령어 메시지는 이미 handle_client_message에서 처리됨
            pass
        except Exception as e:
            print(f"Command error: {e}")
            # await self.broadcast_event(EventType.ERROR, {"error": str(e)})

    async def handle_data(self, client_id: str, data: Dict[str, Any]):
        """Handle data messages from clients."""
        try:
            # Process the data
            processed_data = await self.signal_processor.process_data(data)
            
            # Broadcast processed data
            await self.broadcast_event(EventType.DATA_RECEIVED, processed_data)
            
            # Update stream engine stats
            self.stream_engine.update_stats(
                eeg=len(data.get('eeg', [])),
                ppg=len(data.get('ppg', [])),
                acc=len(data.get('acc', [])),
                bat=len(data.get('battery', [])),
                bat_level=data.get('battery_level')
            )

        except Exception as e:
            logger.error(f"Error handling data from client {client_id}: {e}")
            await self.broadcast_event(EventType.ERROR, {"error": str(e)})

    async def handle_client_disconnect(self, client_id: str):
        """Handle client disconnection."""
        if client_id in self.connected_clients:
            del self.connected_clients[client_id]
            print(f"WebSocket client disconnected")

    async def send_to_client(self, client_id: str, data: Dict[str, Any]):
        """Send data to a specific client."""
        if client_id in self.connected_clients:
            try:
                await self.connected_clients[client_id].send_json(data)
            except Exception as e:
                logger.error(f"Error sending data to client {client_id}: {e}")
                await self.handle_client_disconnect(client_id)

    async def send_status(self, websocket: WebSocket):
        """Send current status to a client."""
        status = {
            'type': 'status',
            'timestamp': time.time(),
            'data': {
                'connected_devices': len(self.device_manager.get_connected_devices()),
                'connected_clients': len(self.connected_clients),
                'stream_engine_status': self.stream_engine.get_status()
            }
        }
        await websocket.send_json(status)

    def add_event_callback(self, event_type: str, callback: Callable):
        """Add a callback for a specific event type."""
        if event_type in self.event_callbacks:
            self.event_callbacks[event_type].append(callback)

    def remove_event_callback(self, event_type: str, callback: Callable):
        """Remove a callback for a specific event type."""
        if event_type in self.event_callbacks and callback in self.event_callbacks[event_type]:
            self.event_callbacks[event_type].remove(callback)

    async def start(self):
        """Start the WebSocket server."""
        if not self.server:
            await self.initialize()
        # WebSocket 서버 시작 로그는 main.py에서 출력됨

    async def stop(self):
        """Stop the WebSocket server."""
        # Remove callback before stopping
        self.device_manager.remove_processed_data_callback(self._handle_processed_data)
        
        # Cleanup connections
        for client_id in list(self.connected_clients.keys()):
            await self.handle_client_disconnect(client_id)
        
        # Stop stream engine
        if hasattr(self, 'stream_engine'):
            await self.stream_engine.stop()
        
        print("FastAPI WebSocket server stopped")

    async def _handle_processed_data(self, data_type: str, processed_data: dict):
        """Handle processed data from device manager"""
        try:
            # Broadcast processed data to all clients
            await self.broadcast_event(EventType.DATA_RECEIVED, {
                'type': data_type,
                'data': processed_data,
                'timestamp': time.time()
            })
        except Exception as e:
            logger.error(f"Error handling processed data: {e}")
