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
from app.core.error_handler import ErrorHandler, ErrorType, ErrorSeverity, global_error_handler
from app.core.data_stream_manager import DataStreamManager
import socket
import platform
from .buffer_manager import BufferManager, global_buffer_manager
from .batch_processor import BatchProcessor, global_batch_processor
from .performance_monitor import PerformanceMonitor, global_performance_monitor
from .streaming_optimizer import StreamingOptimizer, global_streaming_optimizer, StreamPriority
from .monitoring_service import global_monitoring_service
from .streaming_monitor import StreamingMonitor

# Link Band SDK 통합 로깅 사용
from .logging_config import (
    get_websocket_logger, get_device_logger, get_stream_logger,
    LogTags, log_device_connection, log_stream_event, log_error
)

logger = get_websocket_logger(__name__)

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
                 host: str = "127.0.0.1",  # localhost 대신 명시적으로 127.0.0.1 사용 (Windows 호환성)
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
        # 클라이언트별 채널 구독 정보
        self.client_subscriptions: Dict[websockets.WebSocketServerProtocol, Set[str]] = {}
        self.device_manager = device_manager
        self.device_registry = device_registry
        self.auto_connect_task: Optional[asyncio.Task] = None
        self.periodic_task: Optional[asyncio.Task] = None  # 주기적 상태 업데이트 태스크
        
        # 에러 핸들링 및 스트림 관리 시스템 추가
        self.error_handler = global_error_handler
        self.stream_manager = DataStreamManager(self.error_handler)
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
        
        # 모니터링 서비스 통합
        self.monitoring_service = global_monitoring_service
        self.monitoring_service.set_websocket_server(self)
        
        # 스트리밍 모니터 초기화
        self.streaming_monitor = StreamingMonitor()
        
        logger.info(f"WebSocketServer initialized. Host: {host}, Port: {port}. "
                    f"DataRecorder {'IS' if self.data_recorder else 'IS NOT'} configured. "
                    f"DeviceManager {'IS' if self.device_manager else 'IS NOT'} configured. "
                    f"DeviceRegistry {'IS' if self.device_registry else 'IS NOT'} configured. "
                    f"MonitoringService {'IS' if self.monitoring_service else 'IS NOT'} configured. "
                    f"StreamingMonitor {'IS' if self.streaming_monitor else 'IS NOT'} configured.")
        if self.data_recorder:
            logger.info(f"WebSocketServer DataRecorder ID: {id(self.data_recorder)}")
        self.fastapi_ready = False  # Add flag to track FastAPI readiness

    def setup_routes(self):
        """Setup FastAPI routes and WebSocket endpoints."""
        pass  # Routes are now handled in main.py

    def set_fastapi_ready(self):
        """Mark FastAPI as ready to accept connections."""
        self.fastapi_ready = True
        logger.info("========================================")
        logger.info("FastAPI marked as ready for WebSocket connections")
        logger.info("WebSocket connections will now be accepted")
        logger.info("========================================")

    async def initialize(self):
        """Initialize the WebSocket server."""
        logger.info("Initializing WebSocket server...")

        # If port is None, we're using FastAPI WebSocket endpoints only
        if self.port is None:
            logger.info("Port is None, skipping standalone WebSocket server initialization")
            self.set_fastapi_ready()
            return True

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

        # Check if port is available with multiple attempts
        from app.core.utils import force_kill_port_processes
        
        if not ensure_port_available(self.port, max_retries=3):
            # Try force kill as last resort
            logger.warning(f"Standard port cleanup failed, trying force kill for port {self.port}")
            force_kill_port_processes(self.port)
            
            # Final check
            if not ensure_port_available(self.port, max_retries=1):
                logger.error(f"Cannot start server: Port {self.port} is in use and could not be freed")
                raise OSError(f"Port {self.port} is already in use")

        try:
            # Create new server
            logger.info(f"[WEBSOCKET_SERVER_DEBUG] Creating websockets.serve on {self.host}:{self.port}")
            
            # 크로스 플랫폼 WebSocket 서버 설정
            server_kwargs = {
                'ping_interval': None,     # ping 비활성화 (handshake 문제 방지)
                'ping_timeout': None,      # ping timeout 비활성화
                'close_timeout': 10,       # 연결 종료 타임아웃
                'max_size': 2**20,         # 1MB 메시지 크기 제한
                'max_queue': 32,           # 큐 크기 제한
                'compression': None,       # 압축 비활성화 (안정성 향상)
                'family': socket.AF_INET   # IPv4 강제 사용 (IPv6 연결 방지)
            }
            
            # 플랫폼별 추가 설정
            if platform.system() == 'Windows':
                logger.info("[WEBSOCKET_SERVER_DEBUG] Applying Windows-specific WebSocket settings")
                # Windows에서는 추가 설정 없이 기본값 사용
            elif platform.system() == 'Darwin':  # macOS
                logger.info("[WEBSOCKET_SERVER_DEBUG] Applying macOS-specific WebSocket settings")
                server_kwargs['reuse_port'] = True
            
            self.server = await websockets.serve(
                self.handle_client,
                self.host,
                self.port,
                **server_kwargs
            )
            logger.info(f"[WEBSOCKET_SERVER_DEBUG] websockets.serve created successfully")
            
            # Start auto-connect task
            logger.info(f"[WEBSOCKET_SERVER_DEBUG] Starting auto-connect task")
            self.auto_connect_task = asyncio.create_task(self._auto_connect_loop())
            
            # Start periodic status update
            logger.info(f"[WEBSOCKET_SERVER_DEBUG] Starting periodic status update task")
            self.periodic_task = asyncio.create_task(self._periodic_status_update())
            
            logger.info(f"[WEBSOCKET_SERVER_DEBUG] WebSocket server initialized on {self.host}:{self.port}")
            logger.info(f"[WEBSOCKET_SERVER_DEBUG] Server object: {self.server}")
            self.server_initialized = True
            return True
        except Exception as e:
            logger.error(f"[WEBSOCKET_SERVER_DEBUG] Failed to initialize WebSocket server: {e}")
            logger.error(f"[WEBSOCKET_SERVER_DEBUG] Exception type: {type(e)}")
            import traceback
            logger.error(f"[WEBSOCKET_SERVER_DEBUG] Traceback: {traceback.format_exc()}")
            raise

    async def _periodic_status_update(self):
        """주기적으로 모든 클라이언트에게 상태를 업데이트합니다."""
        logger.info("[PERIODIC_DEBUG] Starting periodic status updates")
        try:
            while True:
                try:
                    if len(self.clients) > 0:
                        logger.info(f"[PERIODIC_DEBUG] Sending periodic updates to {len(self.clients)} clients")
                        
                        # Check Bluetooth status
                        is_bluetooth_available = await self._check_bluetooth_status()
                        await self._broadcast_bluetooth_status(is_bluetooth_available)
                        
                        # Send device status
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
                        await self.broadcast_event(EventType.DEVICE_INFO, status_data)
                    else:
                        logger.debug("[PERIODIC_DEBUG] No clients connected, skipping periodic update")
                        
                except asyncio.CancelledError:
                    logger.info("[PERIODIC_DEBUG] Periodic status update task cancelled")
                    break
                except Exception as e:
                    logger.error(f"[PERIODIC_DEBUG] Error in periodic status update: {e}", exc_info=True)
                
                await asyncio.sleep(10)  # 10초마다 체크
        except asyncio.CancelledError:
            logger.info("[PERIODIC_DEBUG] Periodic status update task cancelled during shutdown")
        except Exception as e:
            logger.error(f"[PERIODIC_DEBUG] Unexpected error in periodic status update: {e}", exc_info=True)

    async def handle_client(self, websocket: websockets.WebSocketServerProtocol):
        """Handle new client connections with improved error handling for Windows"""
        client_address = websocket.remote_address
        logger.info(f"[CONNECTION_DEBUG] New connection attempt from {client_address}")
        # logger.info(f"[CONNECTION_DEBUG] WebSocket details: path={getattr(websocket, 'path', 'N/A')}, headers={dict(getattr(websocket, 'request_headers', {}))}")
        logger.info(f"[CONNECTION_DEBUG] FastAPI ready status: {self.fastapi_ready}")

        # Wait for FastAPI to be fully ready before accepting connections
        if not self.fastapi_ready:
            logger.warning(f"[CONNECTION_DEBUG] FastAPI not ready yet, sending wait message to {client_address}")
            
            # Send a "server initializing" message to client instead of closing connection
            try:
                wait_message = {
                    "type": "server_status",
                    "status": "initializing",
                    "message": "Server is still initializing, please wait...",
                    "retry_after": 5
                }
                await websocket.send(json.dumps(wait_message))
                logger.info(f"[CONNECTION_DEBUG] Sent initialization message to {client_address}")
            except Exception as e:
                logger.error(f"[CONNECTION_DEBUG] Failed to send wait message to {client_address}: {e}")
            
            # Wait for FastAPI to be ready
            max_wait_time = 10  # 10초로 단축
            wait_interval = 0.5  # seconds
            waited = 0
            
            while not self.fastapi_ready and waited < max_wait_time:
                await asyncio.sleep(wait_interval)
                waited += wait_interval
                # Send periodic updates every 2 seconds
                if waited % 2.0 < wait_interval:
                    try:
                        update_message = {
                            "type": "server_status",
                            "status": "initializing",
                            "message": f"Server initialization in progress... ({waited:.0f}s elapsed)",
                            "retry_after": 5
                        }
                        await websocket.send(json.dumps(update_message))
                        logger.info(f"[CONNECTION_DEBUG] Sent update message to {client_address} ({waited:.0f}s elapsed)")
                    except Exception as e:
                        logger.error(f"[CONNECTION_DEBUG] Failed to send update message: {e}")
                        break
                
            if not self.fastapi_ready:
                logger.error(f"[CONNECTION_DEBUG] CRITICAL: FastAPI still not ready after {max_wait_time}s for {client_address}")
                try:
                    error_message = {
                        "type": "server_status", 
                        "status": "error",
                        "message": "Server initialization timeout",
                        "retry_after": 30
                    }
                    await websocket.send(json.dumps(error_message))
                    await asyncio.sleep(1)  # Give time for message to be sent
                except Exception:
                    pass
                await websocket.close(1011, "Server initialization timeout")
                return
            else:
                logger.info(f"[CONNECTION_DEBUG] SUCCESS: FastAPI became ready after {waited:.1f}s for {client_address}")
                # Send ready message
                try:
                    ready_message = {
                        "type": "server_status",
                        "status": "ready", 
                        "message": "Server is now ready for connections"
                    }
                    await websocket.send(json.dumps(ready_message))
                    logger.info(f"[CONNECTION_DEBUG] Sent ready message to {client_address}")
                except Exception as e:
                    logger.error(f"[CONNECTION_DEBUG] Failed to send ready message: {e}")

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
            logger.info(f"[CONNECTION_DEBUG] Client connected from {client_address}. Total clients: {len(self.clients)}")
            logger.info(f"[CONNECTION_DEBUG] WebSocket state: {getattr(websocket, 'state', 'unknown')}")

            # Send initial status immediately for faster user experience
            logger.info("[CONNECTION_DEBUG] Connection established. Sending initial status.")
            
            # Add small delay to let connection stabilize on Windows
            if platform.system() == 'Windows':
                await asyncio.sleep(0.1)  # 100ms delay for Windows
            
            # Send current device status immediately
            await self._send_current_device_status(websocket)
            logger.info("[CONNECTION_DEBUG] Initial status sent successfully.")
            
            logger.info(f"[CONNECTION_DEBUG] About to start message handling loop for {client_address}")
            logger.info(f"[CONNECTION_DEBUG] WebSocket state before loop: {getattr(websocket, 'state', 'unknown')}")
            logger.info(f"[CONNECTION_DEBUG] WebSocket closed status: {getattr(websocket, 'closed', 'unknown')}")

            # Continue handling subsequent messages - using recv() instead of async for
            logger.info(f"[MESSAGE_LOOP_DEBUG] Starting message loop for {client_address}")
            try:
                while True:
                    try:
                        # Use recv() with timeout to handle messages
                        message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        print(f"[WEBSOCKET_MESSAGE_DEBUG] Raw message received from {client_address}: {message}")
                        print(f"[WEBSOCKET_MESSAGE_DEBUG] Message type: {type(message)}")
                        print(f"[WEBSOCKET_MESSAGE_DEBUG] Message length: {len(message) if hasattr(message, '__len__') else 'N/A'}")
                        logger.info(f"[MESSAGE_LOOP_DEBUG] Raw message received from {client_address}: {message}")
                        logger.info(f"[MESSAGE_LOOP_DEBUG] Message type: {type(message)}")
                        logger.info(f"[MESSAGE_LOOP_DEBUG] Message length: {len(message) if hasattr(message, '__len__') else 'N/A'}")
                        
                        # Handle both text and binary messages
                        if isinstance(message, bytes):
                            logger.info(f"[MESSAGE_LOOP_DEBUG] Converting bytes message to string")
                            message = message.decode('utf-8')
                            logger.info(f"[MESSAGE_LOOP_DEBUG] Decoded message: {message}")
                        
                        try:
                            logger.info(f"[MESSAGE_LOOP_DEBUG] About to call handle_client_message for {client_address}")
                            await self.handle_client_message(websocket, message)
                            logger.info(f"[MESSAGE_LOOP_DEBUG] handle_client_message completed successfully for {client_address}")
                        except Exception as e:
                            logger.error(f"[MESSAGE_LOOP_DEBUG] Error handling message from {client_address}: {e}")
                            logger.error(f"[MESSAGE_LOOP_DEBUG] Exception type: {type(e)}")
                            logger.error(f"[MESSAGE_LOOP_DEBUG] Exception details: {str(e)}", exc_info=True)
                            # Continue processing other messages instead of breaking
                    except asyncio.TimeoutError:
                        # Timeout is normal, continue loop
                        continue
                    except websockets.exceptions.ConnectionClosed:
                        logger.info(f"[MESSAGE_LOOP_DEBUG] WebSocket connection closed for {client_address}")
                        break
                    except Exception as msg_error:
                        logger.error(f"[MESSAGE_LOOP_DEBUG] Error receiving message from {client_address}: {msg_error}")
                        break
            except Exception as loop_error:
                logger.error(f"[MESSAGE_LOOP_DEBUG] Error in message loop for {client_address}: {loop_error}")
            finally:
                logger.info(f"[MESSAGE_LOOP_DEBUG] Message loop ended for {client_address}")

        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"Client connection closed from {client_address}: {e}")
        except ConnectionResetError as e:
            # Windows-specific: Handle connection reset errors gracefully
            logger.warning(f"Connection reset by client {client_address}: {e}")
        except OSError as e:
            # Handle other OS-level connection errors
            if e.errno in (995, 10054):  # WinError 995 or WSAECONNRESET
                logger.warning(f"Windows connection error for client {client_address}: {e}")
            else:
                logger.error(f"OS error handling client {client_address}: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Error handling client {client_address}: {e}", exc_info=True)
        finally:
            if websocket in self.clients:
                self.clients.remove(websocket)
                try:
                    if hasattr(websocket, 'close'):
                        # Windows 호환성을 위한 closed 상태 확인
                        is_closed = getattr(websocket, 'closed', None)
                        if is_closed is None:
                            try:
                                state = getattr(websocket, 'state', None)
                                is_closed = state is None or state != 1  # 1은 OPEN 상태
                            except:
                                is_closed = False
                        
                        if not is_closed:
                            await websocket.close(1000, "Normal closure")
                except Exception as e:
                    logger.debug(f"Error closing websocket: {e}")  # Reduced to debug level
                logger.info(f"Client disconnected from {client_address}. Total clients: {len(self.clients)}")

    async def _send_current_device_status(self, websocket: websockets.WebSocketServerProtocol):
        """Send the current device connection status to a specific client."""
        is_connected = self.device_manager.is_connected()
        device_info = self.device_manager.get_device_info() if is_connected else None
        registered_devices = self.device_registry.get_registered_devices()

        # 배터리 정보 가져오기
        battery_data = []
        if is_connected and self.device_manager.battery_buffer:
            battery_data = [{"timestamp": time.time(), "level": self.device_manager._battery_level}] if self.device_manager._battery_level is not None else []
        
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
        logger.info("[START_DEBUG] WebSocket server start() method called")
        logger.info(f"[START_DEBUG] Current server state: {self.server}")
        
        # If port is None, we're using FastAPI WebSocket endpoints only
        if self.port is None:
            logger.info("[START_DEBUG] Port is None, using FastAPI WebSocket endpoints only")
            self.set_fastapi_ready()
            return
        
        if not self.server:
            logger.info("[START_DEBUG] Server not initialized, calling initialize()...")
            await self.initialize()
            logger.info("[START_DEBUG] Initialize() completed")
        else:
            logger.info("[START_DEBUG] Server already initialized, skipping initialize()")
            
        logger.info("[START_DEBUG] WebSocket server start() method completed")

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
        
        logger.info(f"[{LogTags.SERVER}:{LogTags.STOP}] WebSocket server stopped")

    async def shutdown(self):
        """Complete shutdown of WebSocket server and cleanup all resources"""
        logger.info("Starting complete WebSocket server shutdown...")
        
        try:
            # 1. Cancel all background tasks first
            tasks_to_cancel = []
            
            if hasattr(self, 'auto_connect_task') and self.auto_connect_task:
                tasks_to_cancel.append(self.auto_connect_task)
            
            if hasattr(self, 'periodic_task') and self.periodic_task:
                tasks_to_cancel.append(self.periodic_task)
            
            # Cancel all background tasks
            for task in tasks_to_cancel:
                if not task.done():
                    task.cancel()
                    logger.info(f"Cancelled task: {task}")
            
            # Wait for all tasks to complete cancellation
            if tasks_to_cancel:
                await asyncio.gather(*tasks_to_cancel, return_exceptions=True)
                logger.info(f"Cancelled {len(tasks_to_cancel)} background tasks")
            
            # 2. Stop streaming if active
            if self.is_streaming:
                logger.info("Stopping active streaming...")
                await self.stop_streaming()
            
            # 3. Close all WebSocket connections
            if self.clients:
                logger.info(f"Closing {len(self.clients)} WebSocket connections...")
                close_tasks = []
                for client in list(self.clients):
                    # Windows 호환성을 위한 closed 상태 확인
                    is_closed = getattr(client, 'closed', None)
                    if is_closed is None:
                        try:
                            state = getattr(client, 'state', None)
                            is_closed = state is None or state != 1  # 1은 OPEN 상태
                        except:
                            is_closed = False
                    
                    if not is_closed:
                        close_tasks.append(self._close_client_safely(client))
                
                if close_tasks:
                    await asyncio.gather(*close_tasks, return_exceptions=True)
                
                self.clients.clear()
                logger.info("All WebSocket connections closed")
            
            # 4. Cleanup connected_clients dict
            if hasattr(self, 'connected_clients'):
                for client_id in list(self.connected_clients.keys()):
                    await self.handle_client_disconnect(client_id)
                self.connected_clients.clear()
            
            # 5. Stop the WebSocket server
            if hasattr(self, 'server') and self.server:
                logger.info("Stopping WebSocket server...")
                self.server.close()
                await self.server.wait_closed()
                logger.info("WebSocket server stopped")
                self.server = None
            
            # 6. Remove device callbacks
            if hasattr(self, 'device_manager') and self.device_manager:
                try:
                    self.device_manager.remove_processed_data_callback(self._handle_processed_data)
                except Exception as e:
                    logger.warning(f"Error removing device callback: {e}")
            
            # 7. Cancel any remaining tasks in the current event loop
            try:
                current_task = asyncio.current_task()
                all_tasks = [task for task in asyncio.all_tasks() if task != current_task and not task.done()]
                
                if all_tasks:
                    logger.info(f"Cancelling {len(all_tasks)} remaining tasks...")
                    for task in all_tasks:
                        task.cancel()
                    
                    # Give tasks a moment to cancel gracefully
                    try:
                        await asyncio.sleep(0.1)
                    except asyncio.CancelledError:
                        logger.info("Sleep cancelled during shutdown, continuing cleanup")
                    
                    # Wait for cancellation with timeout
                    try:
                        await asyncio.wait_for(
                            asyncio.gather(*all_tasks, return_exceptions=True),
                            timeout=2.0
                        )
                    except asyncio.TimeoutError:
                        logger.warning("Some tasks did not cancel within timeout")
            
            except Exception as e:
                logger.warning(f"Error during task cleanup: {e}")
            
            logger.info("WebSocket server shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during WebSocket server shutdown: {e}")
            import traceback
            logger.error(f"Shutdown traceback: {traceback.format_exc()}")
    
    async def _close_client_safely(self, client):
        """Safely close a WebSocket client connection"""
        try:
            # 클라이언트 구독 정보 정리
            if client in self.client_subscriptions:
                del self.client_subscriptions[client]
                logger.info(f"[CONNECTION_DEBUG] Client subscription info cleaned up")
                
            # Windows 호환성을 위한 closed 상태 확인
            is_closed = getattr(client, 'closed', None)
            if is_closed is None:
                try:
                    state = getattr(client, 'state', None)
                    is_closed = state is None or state != 1  # 1은 OPEN 상태
                except:
                    is_closed = False
            
            if not is_closed:
                await client.close(code=1000, reason="Server shutdown")
        except Exception as e:
            logger.warning(f"Error closing client connection: {e}")
            # 오류 발생 시에도 구독 정보 정리
            if client in self.client_subscriptions:
                del self.client_subscriptions[client]
                logger.info(f"[CONNECTION_DEBUG] Client subscription info forcibly cleaned up after error")

    async def _auto_connect_loop(self):
        """Periodically check and connect to registered devices"""
        device_logger = get_device_logger("auto_connect")
        device_logger.info(f"[{LogTags.AUTO_CONNECT}:{LogTags.START}] Auto-connect loop started")
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
                            device_logger.info(f"[{LogTags.AUTO_CONNECT}:{LogTags.SCAN}] Updating device cache via scan")
                            try:
                                await self.device_manager.scan_devices()
                                last_scan_time = current_time
                                device_logger.info(f"[{LogTags.AUTO_CONNECT}:{LogTags.SCAN}] Device cache updated")
                            except Exception as scan_error:
                                log_error(device_logger, LogTags.AUTO_CONNECT, f"Scan failed during auto-connect", scan_error)
                        
                        # 스캔된 디바이스들 가져오기
                        scanned_devices = getattr(self.device_manager, '_cached_devices', [])
                        
                        for device in registered_devices:
                            address = device.get('address')
                            device_name = device.get('name', '')
                            
                            if not address:
                                continue
                            
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
                            
                            # 크로스 플랫폼 주소 매칭: 이름으로 현재 플랫폼의 주소 찾기
                            target_address = address
                            if device_name and scanned_devices:
                                # 스캔된 디바이스 중에서 같은 이름을 가진 디바이스 찾기
                                for scanned_device in scanned_devices:
                                    scanned_name = getattr(scanned_device, 'name', None) or 'Unknown'
                                    scanned_addr = getattr(scanned_device, 'address', None)
                                    
                                    # 정확한 이름 매칭만 허용 (등록된 디바이스만 연결)
                                    if scanned_name == device_name:
                                        if scanned_addr != address:
                                            device_logger.info(f"[{LogTags.AUTO_CONNECT}] Cross-platform address update: {device_name}", 
                                                              extra={"registered_addr": address, "current_addr": scanned_addr})
                                            # 레지스트리의 주소 업데이트
                                            self.device_registry.update_device_address(address, scanned_addr, device_name)
                                            target_address = scanned_addr
                                        else:
                                            target_address = scanned_addr
                                        break
                            
                            device_logger.info(f"[{LogTags.AUTO_CONNECT}:{LogTags.CONNECT}] Attempting connection", 
                                              extra={
                                                  "address": target_address,
                                                  "attempt": f"{attempt_info['count'] + 1}/3",
                                                  "device_name": device_name if target_address != address else None
                                              })
                            
                            attempt_info['last_attempt'] = current_time
                            attempt_info['count'] += 1
                            
                            # 캐시된 디바이스 사용해서 연결 시도 (스캔 중복 방지)
                            success = await self.device_manager.connect(target_address, use_cached_device=True)
                            if success:
                                device_logger.info(f"[{LogTags.AUTO_CONNECT}:{LogTags.SUCCESS}] Auto-connection successful", 
                                                  extra={
                                                      "address": target_address,
                                                      "device_name": device_name,
                                                      "connection_type": "auto"
                                                  })
                                connection_attempts[address]['count'] = 0  # 성공 시 카운터 리셋
                                # 연결 성공 이벤트 브로드캐스트
                                await self.broadcast_event(EventType.DEVICE_CONNECTED, {
                                    "address": target_address,
                                    "name": self.device_manager.device_name or device_name or "Unknown",
                                    "connection_type": "auto"
                                })
                                break
                            else:
                                device_logger.warning(f"[{LogTags.AUTO_CONNECT}:{LogTags.FAILED}] Auto-connection failed", 
                                                     extra={
                                                         "address": target_address,
                                                         "attempt": f"{attempt_info['count']}/3"
                                                     })
                
                # 15초마다 체크 (더 긴 간격으로 시스템 부하 감소)
                await asyncio.sleep(15)
                
            except asyncio.CancelledError:
                device_logger.info(f"[{LogTags.AUTO_CONNECT}:{LogTags.STOP}] Auto-connect loop cancelled")
                break
            except Exception as e:
                device_logger.error(f"[{LogTags.AUTO_CONNECT}:{LogTags.ERROR}] Auto-connect error: {e}", exc_info=True)
                await asyncio.sleep(15)

    async def handle_client_message(self, websocket: websockets.WebSocketServerProtocol, message: str):
        """Handle messages from clients"""
        try:
            logger.info(f"[WEBSOCKET_DEBUG] ===== MESSAGE RECEIVED =====")
            logger.info(f"[WEBSOCKET_DEBUG] Raw message: {message}")
            logger.info(f"[WEBSOCKET_DEBUG] Message type: {type(message)}")
            logger.info(f"[WEBSOCKET_DEBUG] Client address: {websocket.remote_address}")
            
            # Handle ping/pong first (before JSON parsing)
            if isinstance(message, str) and message.strip() == "ping":
                logger.info("[WEBSOCKET_DEBUG] Handling ping, sending pong")
                await websocket.send("pong")
                return
            
            # Parse JSON message if it's a string
            if isinstance(message, str):
                try:
                    data = json.loads(message)
                    logger.info(f"[WEBSOCKET_DEBUG] Parsed JSON data: {data}")
                except json.JSONDecodeError as e:
                    logger.error(f"[WS_SERVER:ERROR] Invalid JSON string: {message} - Error: {e}")
                    # Send error response to client but don't return - continue processing
                    try:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": f"Invalid JSON format: {str(e)}",
                            "original_message": message[:100]  # First 100 chars for debugging
                        }))
                    except Exception as send_error:
                        logger.error(f"Failed to send JSON error response: {send_error}")
                    return
            else:
                data = message
                logger.info(f"[WEBSOCKET_DEBUG] Non-string message data: {data}")

            # Ensure data is a dictionary
            if not isinstance(data, dict):
                logger.error(f"[WEBSOCKET_DEBUG] Invalid message format: {data}")
                await self.send_error_to_client(websocket, "Invalid message format: expected JSON object")
                return

            message_type = data.get('type')
            logger.info(f"[WEBSOCKET_DEBUG] Message type extracted: {message_type}")
            
            # Handle heartbeat messages
            if message_type == 'heartbeat':
                logger.info("[WEBSOCKET_DEBUG] Handling heartbeat, sending heartbeat_response")
                await websocket.send(json.dumps({
                    "type": "heartbeat_response",
                    "timestamp": time.time()
                }))
                return
            
            # Handle ping messages
            if message_type == 'ping':
                logger.info("[WEBSOCKET_DEBUG] Handling ping, sending ping_response")
                await websocket.send(json.dumps({
                    "type": "ping_response",
                    "timestamp": time.time(),
                    "original_timestamp": data.get('timestamp')
                }))
                return
            
            # Handle subscription messages
            if message_type == 'subscribe':
                logger.info("[WEBSOCKET_DEBUG] ===== SUBSCRIPTION MESSAGE DETECTED =====")
                channel = data.get('channel')
                logger.info(f"[WEBSOCKET_DEBUG] Channel to subscribe: {channel}")
                
                if channel:
                    if websocket not in self.client_subscriptions:
                        self.client_subscriptions[websocket] = set()
                        logger.info(f"[WEBSOCKET_DEBUG] Created new subscription set for client {websocket.remote_address}")
                    
                    self.client_subscriptions[websocket].add(channel)
                    logger.info(f"[WEBSOCKET_SUBSCRIBE] Client {websocket.remote_address} subscribed to channel: {channel}")
                    logger.info(f"[WEBSOCKET_SUBSCRIBE] Current subscriptions for this client: {self.client_subscriptions[websocket]}")
                    logger.info(f"[WEBSOCKET_SUBSCRIBE] Total clients with subscriptions: {len(self.client_subscriptions)}")
                    
                    # 전체 구독 상태 디버깅
                    logger.info(f"[WEBSOCKET_SUBSCRIBE] === FULL SUBSCRIPTION STATE ===")
                    logger.info(f"[WEBSOCKET_SUBSCRIBE] Total clients connected: {len(self.clients)}")
                    logger.info(f"[WEBSOCKET_SUBSCRIBE] Total clients with subscriptions: {len(self.client_subscriptions)}")
                    for client, channels in self.client_subscriptions.items():
                        client_addr = getattr(client, 'remote_address', 'unknown')
                        logger.info(f"[WEBSOCKET_SUBSCRIBE] Client {client_addr}: {channels}")
                    
                    confirmation_message = {
                        "type": "subscription_confirmed",
                        "channel": channel,
                        "timestamp": time.time()
                    }
                    logger.info(f"[WEBSOCKET_DEBUG] Sending confirmation: {confirmation_message}")
                    await websocket.send(json.dumps(confirmation_message))
                    logger.info(f"[WEBSOCKET_DEBUG] Confirmation sent successfully for channel: {channel}")
                else:
                    logger.warning("[WEBSOCKET_SUBSCRIBE] Subscribe message missing channel")
                    await self.send_error_to_client(websocket, "Subscribe message missing channel")
                return
            
            # Handle unsubscription messages
            if message_type == 'unsubscribe':
                logger.info("[WEBSOCKET_DEBUG] ===== UNSUBSCRIPTION MESSAGE DETECTED =====")
                channel = data.get('channel')
                if channel and websocket in self.client_subscriptions:
                    self.client_subscriptions[websocket].discard(channel)
                    logger.info(f"[WEBSOCKET_SUBSCRIBE] Client unsubscribed from channel: {channel}")
                    await websocket.send(json.dumps({
                        "type": "unsubscription_confirmed",
                        "channel": channel,
                        "timestamp": time.time()
                    }))
                return
            logger.info(f"[WEBSOCKET_DEBUG] Message type: {message_type}")
            if not message_type:
                logger.warning("Message missing type")
                await self.send_error_to_client(websocket, "Message missing type")
                return

            if message_type == 'command':
                command = data.get('command')
                payload = data.get('payload', {})
                logger.info(f"[WEBSOCKET_DEBUG] Command: {command}, Payload: {payload}")
                
                if not command:
                    logger.warning("Command message missing command")
                    await self.send_error_to_client(websocket, "Command message missing command")
                    return

                # Handle check_device_connection command (maintain client compatibility)
                if command == "check_device_connection":
                    logger.info("[WEBSOCKET_DEBUG] Processing check_device_connection command")
                    try:
                        # Send simple handshake response for compatibility
                        response = {
                            "type": "handshake_response",
                            "status": "connected",
                            "message": "WebSocket connection established"
                        }
                        await websocket.send(json.dumps(response))
                        logger.info("[WEBSOCKET_DEBUG] Handshake response sent successfully")
                    except Exception as e:
                        logger.error(f"[WEBSOCKET_DEBUG] Error sending handshake response: {e}", exc_info=True)
                    return

                logger.info(f"Processing command: {command} with payload: {payload}")

                # Command handling logic
                if command == "check_bluetooth_status":
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
                elif command == "get_device_status":
                    # Send current device status as event (for compatibility)
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
                    
                    # Add battery info if available
                    if is_connected and hasattr(self.device_manager, 'battery_level') and self.device_manager.battery_level is not None:
                        status_data["battery"] = {
                            "level": self.device_manager.battery_level,
                            "timestamp": time.time()
                        }
                    
                    await self.send_event_to_client(websocket, EventType.DEVICE_INFO, status_data)
                elif command == "get_stream_status":
                    # Send streaming status
                    stream_status = {
                        "is_streaming": self.is_streaming,
                        "connected_clients": len(self.clients),
                        "device_connected": self.device_manager.is_connected()
                    }
                    
                    if self.is_streaming:
                        stream_status["stream_stats"] = self.data_stream_stats
                    
                    await self.send_event_to_client(websocket, EventType.STATUS, stream_status)
                elif command == "health_check":
                    # Send health check response in expected format
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
            # 보안 검증: 등록된 디바이스인지 확인
            if not self.device_registry.is_device_registered(device_address):
                device_logger.error(f"[{LogTags.DEVICE_MANAGER}:{LogTags.CONNECT}] SECURITY: Attempted to connect to unregistered device", 
                                  extra={"address": device_address})
                await self.broadcast_event(EventType.DEVICE_CONNECTION_FAILED, {
                    "address": device_address,
                    "reason": "device_not_registered",
                    "message": "Only registered devices can be connected"
                })
                return
            
            log_device_connection(device_logger, device_address, "attempting")
            
            # 크로스 플랫폼 주소 매칭: 등록된 디바이스 이름으로 현재 플랫폼의 주소 찾기
            target_address = device_address
            registered_device = None
            
            # 등록된 디바이스에서 해당 주소 찾기
            for device in self.device_registry.get_registered_devices():
                if device.get('address') == device_address:
                    registered_device = device
                    break
            
            # 등록된 디바이스가 있고 이름이 있으면 현재 스캔된 디바이스에서 같은 이름 찾기
            if registered_device and registered_device.get('name'):
                device_name = registered_device['name']
                scanned_devices = getattr(self.device_manager, '_cached_devices', [])
                
                if scanned_devices:
                    for scanned_device in scanned_devices:
                        scanned_name = getattr(scanned_device, 'name', None) or 'Unknown'
                        scanned_addr = getattr(scanned_device, 'address', None)
                        
                        # 정확한 이름 매칭만 허용 (등록된 디바이스만 연결)
                        if scanned_name == device_name:
                            if scanned_addr and scanned_addr != device_address:
                                device_logger.info(f"[{LogTags.DEVICE_MANAGER}:{LogTags.CONNECT}] Cross-platform address mapping found", 
                                                  extra={
                                                      "requested_address": device_address,
                                                      "device_name": device_name,
                                                      "current_platform_address": scanned_addr
                                                  })
                                # 레지스트리의 주소 업데이트
                                self.device_registry.update_device_address(device_address, scanned_addr, device_name)
                                target_address = scanned_addr
                            elif scanned_addr:
                                target_address = scanned_addr
                            break
            
            # DeviceManager의 connect 메서드가 이미 스캔을 포함하므로 직접 연결 시도
            if not await self.device_manager.connect(target_address):
                log_device_connection(device_logger, target_address, "failed")
                await self.broadcast_event(EventType.DEVICE_CONNECTION_FAILED, {
                    "address": device_address,
                    "target_address": target_address,
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
                
                # 디바이스 연결 시 StreamingMonitor 재초기화
                from app.core.streaming_monitor import streaming_monitor
                streaming_monitor.mark_system_initialized()
                logger.info("StreamingMonitor reinitialized due to device connection")
                
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
            # Stop streaming first
            if self.is_streaming:
                await self.stop_streaming()
            
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
            return False

        # Check if data acquisition is started
        if not self.device_manager._notifications_started:
            logger.info("Data acquisition not started, attempting to start...")
            if not await self.device_manager.start_data_acquisition():
                msg = "Cannot start streaming: Failed to start data acquisition."
                logger.warning(msg)
                if websocket: await self.send_error_to_client(websocket, msg)
                return False
            
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
            return True
        else:
            logger.info("Streaming is already active.")
            return True

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
        
        # Windows 디버깅
        if platform.system() == 'Windows':
            logger.info(f"[WINDOWS DEBUG] EEG stream task running on Windows")
            logger.info(f"[WINDOWS DEBUG] device_manager: {self.device_manager}")
            logger.info(f"[WINDOWS DEBUG] is_streaming: {self.is_streaming}")
        
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

        consecutive_no_data = 0
        
        try:
            while self.is_streaming:
                try:
                    await asyncio.sleep(SEND_INTERVAL)
                    
                    current_time = time.time()
                    
                    if not self.is_streaming: break

                    eeg_buffer = self.device_manager.get_and_clear_eeg_buffer()
                    
                    # Processed data는 raw data와 독립적으로 확인
                    try:
                        processed_data = await self.device_manager.get_and_clear_processed_eeg_buffer()
                    except Exception as e:
                        logger.error(f"Failed to get processed EEG buffer: {e}")
                        processed_data = None
                    
                    # Windows 디버깅
                    if platform.system() == 'Windows' and (consecutive_no_data == 0 or consecutive_no_data % 25 == 0):
                        logger.info(f"[WINDOWS DEBUG] EEG buffer check - Raw: {len(eeg_buffer) if eeg_buffer else 0}, Processed: {len(processed_data) if processed_data else 0}")
                        logger.info(f"[WINDOWS DEBUG] Device connected: {self.device_manager.is_connected()}")
                    
                    raw_data_len = len(eeg_buffer) if eeg_buffer else 0
                    processed_data_len = len(processed_data) if processed_data else 0
                    # logger.info(f"[STREAM_EEG_DEBUG] Raw data len: {raw_data_len}, Processed data len: {processed_data_len}")

                    if raw_data_len > 0:
                        logger.debug(f"[STREAM_EEG_DEBUG] First raw sample type: {type(eeg_buffer[0]) if raw_data_len > 0 else 'N/A'}")
                    if processed_data_len > 0:
                        logger.debug(f"[STREAM_EEG_DEBUG] First processed sample type: {type(processed_data[0]) if processed_data_len > 0 else 'N/A'}")

                    # 데이터 녹화 로직 - 클라이언트 연결과 독립적으로 실행
                    # 레코딩 중인 경우 데이터 저장
                    if self.data_recorder and self.data_recorder.is_recording:
                        if eeg_buffer:
                            for sample in eeg_buffer: 
                                if isinstance(sample, dict):
                                    self.data_recorder.add_data(
                                        data_type=f"{device_id_for_filename}_eeg_raw",
                                        data=sample 
                                    )
                        if processed_data:
                            for sample in processed_data: 
                                if isinstance(sample, dict):
                                    self.data_recorder.add_data(
                                        data_type=f"{device_id_for_filename}_eeg_processed",
                                        data=sample
                                    )
                    
                    if eeg_buffer:
                        raw_message = {
                            "type": "raw_data",
                            "sensor_type": "eeg",
                            "device_id": raw_device_id, # Broadcast original device_id
                            "timestamp": current_time,
                            "data": eeg_buffer
                        }
                        try:
                            await self.broadcast(json.dumps(raw_message))
                            # EEG 타임스탬프 추출
                            sample_timestamps = []
                            if eeg_buffer:
                                for sample in eeg_buffer:
                                    if isinstance(sample, dict) and "timestamp" in sample:
                                        sample_timestamps.append(sample["timestamp"])
                            # StreamingMonitor에 데이터 흐름 추적 (타임스탬프 포함)
                            self.streaming_monitor.track_data_flow('eeg', len(eeg_buffer), sample_timestamps)
                            total_samples_sent += len(eeg_buffer)
                            samples_since_last_log += len(eeg_buffer)
                            
                            for sample in eeg_buffer:
                                if isinstance(sample, dict) and "timestamp" in sample:
                                    timestamp_buffer.append(sample["timestamp"])
                            cutoff_time = current_time - WINDOW_SIZE
                            timestamp_buffer = [ts for ts in timestamp_buffer if ts > cutoff_time]
                            if eeg_buffer and isinstance(eeg_buffer, list) and len(eeg_buffer) > 0 and isinstance(eeg_buffer[0], dict):
                                self._update_sampling_rate('eeg', eeg_buffer)
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

                    if eeg_buffer or processed_data:
                        consecutive_no_data = 0  # 데이터가 있으면 카운터 리셋
                        last_data_time = current_time
                        if current_time - last_log_time >= 1.0:
                            logger.info(f"[EEG] Samples/sec: {samples_since_last_log:4d} | "
                                      f"Total: {total_samples_sent:6d} | "
                                      f"Raw Buffer: {len(eeg_buffer) if eeg_buffer else 0:4d} | "
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
                    else:
                        consecutive_no_data += 1  # 데이터가 없으면 카운터 증가
                        
                    if time.time() - last_data_time > NO_DATA_TIMEOUT:
                        logger.warning("No EEG data received for too long, stopping EEG stream task.")
                        break # Exit loop if no data

                except asyncio.CancelledError:
                    logger.info("EEG stream task received cancellation.")
                except Exception as e:
                    logger.error(f"Error in EEG stream loop: {e}", exc_info=True)
                finally:
                    logger.info(f"EEG stream task finished. Total samples sent: {total_samples_sent}")

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

                raw_data = self.device_manager.get_and_clear_ppg_buffer()
                processed_data = await self.device_manager.get_and_clear_processed_ppg_buffer()
                
                current_time = time.time()
                
                # 레코딩 중인 경우 데이터 저장
                if self.data_recorder and self.data_recorder.is_recording:
                    if raw_data:
                        for sample in raw_data:
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_ppg_raw",
                                    data=sample
                                )
                    if processed_data:
                        for sample in processed_data:
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_ppg_processed",
                                    data=sample
                                )
                
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
                        # StreamingMonitor에 데이터 흐름 추적 (실제 브로드캐스트 시점)
                        self.streaming_monitor.track_data_flow('ppg', len(raw_data))
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

                raw_data = self.device_manager.get_and_clear_acc_buffer()
                processed_data = await self.device_manager.get_and_clear_processed_acc_buffer()
                
                current_time = time.time()
                
                # 레코딩 중인 경우 데이터 저장
                if self.data_recorder and self.data_recorder.is_recording:
                    if raw_data:
                        for sample in raw_data:
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_acc_raw",
                                    data=sample
                                )
                    if processed_data:
                        for sample in processed_data:
                            if isinstance(sample, dict):
                                self.data_recorder.add_data(
                                    data_type=f"{device_id_for_filename}_acc_processed",
                                    data=sample
                                )
                
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
                        # StreamingMonitor에 데이터 흐름 추적 (실제 브로드캐스트 시점)
                        self.streaming_monitor.track_data_flow('acc', len(raw_data))
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
                actual_battery_data_list = self.device_manager.get_and_clear_battery_buffer() 
                
                # 강화된 디버깅 로그 (PPG/ACC와 동일)
                logger.info(f"[STREAM_BAT_DEBUG] === Battery Recording Check ===")
                logger.info(f"[STREAM_BAT_DEBUG] DataRecorder object exists: {self.data_recorder is not None}")
                if self.data_recorder:
                    logger.info(f"[STREAM_BAT_DEBUG] DataRecorder.is_recording: {self.data_recorder.is_recording}")
                else:
                    logger.warning(f"[STREAM_BAT_DEBUG] DataRecorder is None!")
                
                actual_battery_data_len = len(actual_battery_data_list) if actual_battery_data_list else 0
                logger.info(f"[STREAM_BAT_DEBUG] Actual battery data len: {actual_battery_data_len}")
                
                # 레코딩 조건 상세 체크
                recording_condition = self.data_recorder and self.data_recorder.is_recording
                logger.info(f"[STREAM_BAT_DEBUG] Recording condition met: {recording_condition}")
                if not recording_condition:
                    if not self.data_recorder:
                        logger.warning(f"[STREAM_BAT_DEBUG] Recording failed: DataRecorder is None")
                    elif not self.data_recorder.is_recording:
                        logger.warning(f"[STREAM_BAT_DEBUG] Recording failed: is_recording is False")
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
                        # StreamingMonitor에 데이터 흐름 추적 (실제 브로드캐스트 시점)
                        data_count = len(display_battery_data) if display_battery_data else 1  # 배터리 레벨 업데이트도 카운트
                        self.streaming_monitor.track_data_flow('bat', data_count)
                        total_samples_sent += len(display_battery_data) # display_battery_data 사용
                        samples_since_last_log += len(display_battery_data) # display_battery_data 사용
                        
                        if current_time - last_log_time >= 1.0:
                            logger.info(f"[BAT] Updates/sec: {samples_since_last_log:4d} | "
                                      f"Total: {total_samples_sent:6d} | "
                                      f"Level: {current_level_for_log if current_level_for_log is not None else 'N/A'}%")
                            samples_since_last_log = 0
                            last_log_time = current_time
                            
                        # Update battery level in device_sampling_stats immediately when we have data
                        if current_level_for_log is not None and isinstance(self.device_sampling_stats, dict):
                            self.device_sampling_stats['bat_level'] = current_level_for_log
                        
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
        """Broadcast message to all connected clients with improved error handling for Windows."""
        if not self.clients:
            return

        # 연결이 끊어진 클라이언트를 추적
        disconnected_clients = set()
        
        # 클라이언트 목록을 복사하여 순회 중 수정 방지
        clients_copy = list(self.clients)

        # 각 클라이언트에 메시지 전송 시도
        for client in clients_copy:
            try:
                # 클라이언트 연결 상태 확인 (Windows 호환성)
                is_closed = getattr(client, 'closed', None)
                if is_closed is None:
                    # closed 속성이 없는 경우 state로 확인
                    try:
                        state = getattr(client, 'state', None)
                        is_closed = state is None or state != 1  # 1은 OPEN 상태
                    except:
                        is_closed = False
                
                if is_closed:
                    disconnected_clients.add(client)
                    continue
                    
                # 메시지 전송 (타임아웃 설정)
                await asyncio.wait_for(client.send(message), timeout=1.0)
                
            except (websockets.exceptions.ConnectionClosed, ConnectionResetError, asyncio.TimeoutError):
                disconnected_clients.add(client)
            except OSError as e:
                # Handle Windows-specific OS errors
                if e.errno in (995, 10054):  # WinError 995 or WSAECONNRESET
                    pass
                disconnected_clients.add(client)
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")
                disconnected_clients.add(client)

        # 연결이 끊어진 클라이언트 정리
        for client in disconnected_clients:
            if client in self.clients:
                self.clients.remove(client)
                # 구독 정보도 정리
                if client in self.client_subscriptions:
                    del self.client_subscriptions[client]
                try:
                    if not getattr(client, 'closed', False):
                        await client.close(code=1000, reason="Client cleanup")
                except Exception:
                    pass

    async def broadcast_priority(self, message: str):
        """Priority broadcast for critical messages like monitoring_metrics with longer timeout."""
        logger.info(f"[PRIORITY_BROADCAST] Starting priority broadcast to {len(self.clients)} clients")
        
        if not self.clients:
            logger.warning(f"[PRIORITY_BROADCAST] No clients connected, skipping broadcast")
            return

        # 연결이 끊어진 클라이언트를 추적
        disconnected_clients = set()
        
        # 클라이언트 목록을 복사하여 순회 중 수정 방지
        clients_copy = list(self.clients)

        # 각 클라이언트에 메시지 전송 시도 (더 긴 타임아웃)
        for client in clients_copy:
            try:
                # 클라이언트 연결 상태 확인 (Windows 호환성)
                is_closed = getattr(client, 'closed', None)
                if is_closed is None:
                    # closed 속성이 없는 경우 state로 확인
                    try:
                        state = getattr(client, 'state', None)
                        is_closed = state is None or state != 1  # 1은 OPEN 상태
                    except:
                        is_closed = False
                
                if is_closed:
                    disconnected_clients.add(client)
                    continue
                    
                # 우선순위 메시지는 더 긴 타임아웃 (5초)
                await asyncio.wait_for(client.send(message), timeout=5.0)
                logger.info(f"[PRIORITY_BROADCAST] Successfully sent to client {getattr(client, 'remote_address', 'unknown')}")
                
            except (websockets.exceptions.ConnectionClosed, ConnectionResetError):
                disconnected_clients.add(client)
            except asyncio.TimeoutError:
                # 타임아웃이 발생해도 클라이언트를 제거하지 않음 (중요한 메시지이므로)
                logger.warning(f"Priority message timeout for client {getattr(client, 'remote_address', 'unknown')}")
            except OSError as e:
                # Handle Windows-specific OS errors
                if e.errno in (995, 10054):  # WinError 995 or WSAECONNRESET
                    pass
                disconnected_clients.add(client)
            except Exception as e:
                logger.error(f"Error sending priority message to client: {e}")
                # 우선순위 메시지에서는 연결 에러가 아닌 경우 클라이언트를 제거하지 않음

        # 실제 연결 에러가 발생한 클라이언트만 정리
        for client in disconnected_clients:
            if client in self.clients:
                self.clients.remove(client)
                # 구독 정보도 정리
                if client in self.client_subscriptions:
                    del self.client_subscriptions[client]
                try:
                    if not getattr(client, 'closed', False):
                        await client.close(code=1000, reason="Client cleanup")
                except Exception:
                    pass

    async def broadcast_to_channel(self, channel: str, message: str):
        """특정 채널을 구독한 클라이언트에게만 브로드캐스트"""
        if not self.clients:
            return

        # 해당 채널을 구독한 클라이언트 찾기
        subscribed_clients = []
        
        for client in self.clients:
            if client in self.client_subscriptions:
                client_channels = self.client_subscriptions[client]
                if channel in client_channels:
                    subscribed_clients.append(client)

        if not subscribed_clients:
            return
        
        disconnected_clients = []
        
        for client in subscribed_clients:
            try:
                # Check if client is still connected
                is_closed = getattr(client, 'closed', None)
                if is_closed is None:
                    try:
                        state = getattr(client, 'state', None)
                        is_closed = state is None or state != 1
                    except:
                        is_closed = False
                
                if is_closed:
                    disconnected_clients.append(client)
                    continue
                
                await asyncio.wait_for(client.send(message), timeout=1.0)
                
            except (websockets.exceptions.ConnectionClosed, Exception):
                disconnected_clients.append(client)
        
        # Remove disconnected clients
        for client in disconnected_clients:
            if client in self.clients:
                self.clients.remove(client)
            if client in self.client_subscriptions:
                del self.client_subscriptions[client]
            try:
                if not getattr(client, 'closed', False):
                    await client.close(code=1000, reason="Client cleanup")
            except Exception:
                pass

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
        # StreamingMonitor 기반 자동 감지 상태 사용
        streaming_status = self.streaming_monitor.calculate_streaming_status()
        
        return {
            "status": "running" if streaming_status['is_active'] else "stopped",
            "clients_connected": self.get_connected_clients(),
            "eeg_sampling_rate": streaming_status['sensor_details']['eeg']['sampling_rate'],
            "ppg_sampling_rate": streaming_status['sensor_details']['ppg']['sampling_rate'],
            "acc_sampling_rate": streaming_status['sensor_details']['acc']['sampling_rate'],
            "bat_sampling_rate": streaming_status['sensor_details']['bat']['sampling_rate'],
            "bat_level": self.device_sampling_stats.get('bat_level', 0),
            # 추가 정보
            "active_sensors": streaming_status['active_sensors'],
            "data_flow_health": streaming_status['data_flow_health'],
            "auto_detected": True  # 자동 감지됨을 표시
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
                
                # Check if streaming is active and we have actual sampling data
                stream_status = self.get_stream_status()
                logger.info(f"stream_status: {stream_status}")
                
                # Determine if we should use actual rates or expected rates
                has_actual_eeg_rate = (self.is_streaming and 
                                     self.device_sampling_stats.get('eeg', {}).get('samples_per_sec', 0) > 0)
                has_actual_ppg_rate = (self.is_streaming and 
                                     self.device_sampling_stats.get('ppg', {}).get('samples_per_sec', 0) > 0)
                has_actual_acc_rate = (self.is_streaming and 
                                     self.device_sampling_stats.get('acc', {}).get('samples_per_sec', 0) > 0)
                has_actual_bat_rate = (self.is_streaming and 
                                     self.device_sampling_stats.get('bat', {}).get('samples_per_sec', 0) > 0)
                
                # Expected sampling rates for Link Band devices when connected but not streaming
                expected_rates = {
                    'eeg': 250.0,  # EEG expected rate
                    'ppg': 50.0,   # PPG expected rate  
                    'acc': 30.0,   # ACC expected rate
                    'bat': 1.0     # Battery expected rate
                }
                
                # Use actual rates if available and streaming, otherwise use expected rates
                eeg_rate = self.device_sampling_stats.get('eeg', {}).get('samples_per_sec', expected_rates['eeg']) if has_actual_eeg_rate else expected_rates['eeg']
                ppg_rate = self.device_sampling_stats.get('ppg', {}).get('samples_per_sec', expected_rates['ppg']) if has_actual_ppg_rate else expected_rates['ppg']
                acc_rate = self.device_sampling_stats.get('acc', {}).get('samples_per_sec', expected_rates['acc']) if has_actual_acc_rate else expected_rates['acc']
                bat_rate = self.device_sampling_stats.get('bat', {}).get('samples_per_sec', expected_rates['bat']) if has_actual_bat_rate else expected_rates['bat']
                
                # For battery level, try to get actual level or use null
                battery_level = stream_status.get('bat_level', 0)
                if battery_level == 0 and not has_actual_bat_rate:
                    # Try to get battery level from device manager if available
                    if hasattr(self.device_manager, 'battery_level') and self.device_manager.battery_level is not None:
                        battery_level = self.device_manager.battery_level
                    else:
                        battery_level = None  # No battery data available
                
                status = {
                    "is_connected": True,
                    "device_address": info.get("address"),
                    "device_name": info.get("name"),
                    "connection_time": info.get("connection_time"),
                    "battery_level": battery_level,
                    "eeg_sampling_rate": eeg_rate,
                    "ppg_sampling_rate": ppg_rate,
                    "acc_sampling_rate": acc_rate,
                    "bat_sampling_rate": bat_rate
                }
                
                logger.info(f"Final status: {status}")
                logger.info(f"Streaming active: {self.is_streaming}, Using actual rates: EEG={has_actual_eeg_rate}, PPG={has_actual_ppg_rate}, ACC={has_actual_acc_rate}, BAT={has_actual_bat_rate}")
            else:
                logger.info("No device info, returning disconnected status")
                status = {
                    "is_connected": False,
                    "device_address": None,
                    "device_name": None,
                    "connection_time": None,
                    "battery_level": None,
                    "eeg_sampling_rate": 0,
                    "ppg_sampling_rate": 0,
                    "acc_sampling_rate": 0,
                    "bat_sampling_rate": 0
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
                "battery_level": None,
                "eeg_sampling_rate": 0,
                "ppg_sampling_rate": 0,
                "acc_sampling_rate": 0,
                "bat_sampling_rate": 0
            }

    async def handle_websocket_connection(self, websocket: WebSocket):
        """Handle new WebSocket connections."""
        client_id = str(uuid.uuid4())
        try:
            await websocket.accept()
            self.connected_clients[client_id] = websocket
            ws_logger = get_websocket_logger(__name__)
            ws_logger.info(f"[{LogTags.WEBSOCKET_SERVER}:{LogTags.CONNECT}] WebSocket client connected", 
                          extra={"client_id": client_id})

            # Send initial status
            await self.send_status(websocket)

            while True:
                try:
                    data = await websocket.receive_json()
                    await self.handle_fastapi_client_message(client_id, websocket, data)
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
            ws_logger = get_websocket_logger(__name__)
            ws_logger.info(f"[{LogTags.WEBSOCKET_SERVER}:{LogTags.CONNECT}] Processed data client connected", 
                          extra={"client_id": client_id})

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

    async def handle_fastapi_client_message(self, client_id: str, websocket: WebSocket, data: Dict[str, Any]):
        """Handle incoming messages from FastAPI clients."""
        try:
            # 데이터 타입 확인 및 변환
            if isinstance(data, str):
                # 문자열인 경우 JSON 파싱 시도
                try:
                    import json
                    data = json.loads(data)
                except json.JSONDecodeError:
                    ws_logger = get_websocket_logger(__name__)
                    ws_logger.error(f"[{LogTags.WEBSOCKET_SERVER}:{LogTags.ERROR}] Invalid JSON string", 
                                   extra={"client_id": client_id, "data_preview": str(data)[:100]})
                    return
            
            # 딕셔너리가 아닌 경우 처리 중단
            if not isinstance(data, dict):
                ws_logger = get_websocket_logger(__name__)
                ws_logger.error(f"[{LogTags.WEBSOCKET_SERVER}:{LogTags.ERROR}] Invalid data type", 
                               extra={"client_id": client_id, "data_type": type(data).__name__})
                return
            
            # 메시지 타입 확인
            message_type = data.get('type')
            
            # 구독 메시지 처리
            if message_type == 'subscribe':
                channel = data.get('channel')
                logger.info(f"[FASTAPI_WS_SUBSCRIBE] Client {client_id} subscribing to channel: {channel}")
                
                if channel:
                    # FastAPI 클라이언트도 client_subscriptions에 추가
                    if not hasattr(self, 'fastapi_client_subscriptions'):
                        self.fastapi_client_subscriptions = {}
                    
                    if client_id not in self.fastapi_client_subscriptions:
                        self.fastapi_client_subscriptions[client_id] = set()
                    
                    self.fastapi_client_subscriptions[client_id].add(channel)
                    logger.info(f"[FASTAPI_WS_SUBSCRIBE] Client {client_id} subscribed to {channel}")
                    logger.info(f"[FASTAPI_WS_SUBSCRIBE] Total FastAPI subscriptions: {len(self.fastapi_client_subscriptions)}")
                    
                    # 구독 확인 메시지 전송
                    confirmation_message = {
                        "type": "subscription_confirmed",
                        "channel": channel,
                        "timestamp": time.time()
                    }
                    await websocket.send_json(confirmation_message)
                    logger.info(f"[FASTAPI_WS_SUBSCRIBE] Confirmation sent to client {client_id}")
                else:
                    logger.warning(f"[FASTAPI_WS_SUBSCRIBE] Subscribe message missing channel from client {client_id}")
                return
            
            # 구독 해제 메시지 처리
            if message_type == 'unsubscribe':
                channel = data.get('channel')
                logger.info(f"[FASTAPI_WS_UNSUBSCRIBE] Client {client_id} unsubscribing from channel: {channel}")
                
                if channel and hasattr(self, 'fastapi_client_subscriptions') and client_id in self.fastapi_client_subscriptions:
                    self.fastapi_client_subscriptions[client_id].discard(channel)
                    
                    # 구독 해제 확인 메시지 전송
                    confirmation_message = {
                        "type": "unsubscription_confirmed",
                        "channel": channel,
                        "timestamp": time.time()
                    }
                    await websocket.send_json(confirmation_message)
                    logger.info(f"[FASTAPI_WS_UNSUBSCRIBE] Unsubscription confirmed for client {client_id}")
                return
            
            # health_check는 로그하지 않음 (너무 빈번함)
            if data.get('command') != 'health_check':
                ws_logger = get_websocket_logger(__name__)
                ws_logger.debug(f"[{LogTags.WEBSOCKET_SERVER}] Client message", 
                               extra={"client_id": client_id, "command": data.get('command', 'unknown')})
        except Exception as e:
            ws_logger = get_websocket_logger(__name__)
            ws_logger.error(f"[{LogTags.WEBSOCKET_SERVER}:{LogTags.ERROR}] Client message error", 
                           extra={"client_id": client_id, "error": str(e)}, exc_info=True)

    async def handle_command(self, client_id: str, data: Dict[str, Any]):
        """Handle command messages from clients."""
        # command = data.get('command')
        # if not command:
        #     logger.warning(f"Command message from client {client_id} missing command")
        #     return

        try:
            # 명령어 메시지는 이미 handle_client_message에서 처리됨
            pass
        except Exception as e:
            ws_logger = get_websocket_logger(__name__)
            ws_logger.error(f"[{LogTags.WEBSOCKET_SERVER}:{LogTags.ERROR}] Command error", 
                           extra={"client_id": client_id, "error": str(e)}, exc_info=True)
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
            
            # FastAPI 구독 정보도 정리
            if hasattr(self, 'fastapi_client_subscriptions') and client_id in self.fastapi_client_subscriptions:
                del self.fastapi_client_subscriptions[client_id]
                logger.info(f"[FASTAPI_WS_DISCONNECT] Cleaned up subscriptions for client {client_id}")
            
            ws_logger = get_websocket_logger(__name__)
            ws_logger.info(f"[{LogTags.WEBSOCKET_SERVER}:{LogTags.DISCONNECT}] WebSocket client disconnected", 
                          extra={"client_id": client_id})

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
                'connected_devices': 1 if self.device_manager.is_connected() else 0,
                'connected_clients': len(self.connected_clients),
                'stream_engine_status': getattr(self, 'stream_engine', {}).get_status() if hasattr(self, 'stream_engine') else {}
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
        
        logger.info(f"[{LogTags.SERVER}:{LogTags.STOP}] FastAPI WebSocket server stopped")

    async def _handle_processed_data(self, data_type: str, processed_data: dict):
        """Handle processed data from device manager"""
        try:
            # Raw data 직접 브로드캐스트 처리
            if data_type == "raw_data_broadcast":
                # 클라이언트가 기대하는 raw_data 형식으로 직접 브로드캐스트
                await self.broadcast(json.dumps(processed_data))
                return
            
            # Processed data 직접 브로드캐스트 처리
            if data_type == "processed_data_broadcast":
                # 클라이언트가 기대하는 processed_data 형식으로 직접 브로드캐스트
                await self.broadcast(json.dumps(processed_data))
                return
            
            # 기존 event 방식 (하위 호환성)
            await self.broadcast_event(EventType.DATA_RECEIVED, {
                'type': data_type,
                'data': processed_data,
                'timestamp': time.time()
            })
        except Exception as e:
            logger.error(f"Error handling processed data: {e}")

    # 에러 핸들링이 강화된 로버스트 스트리밍 함수들
    async def stream_eeg_data_robust(self):
        """에러 복구 기능이 있는 EEG 스트리밍"""
        return await self.error_handler.robust_execute(
            func=self._stream_eeg_data_core,
            error_type=ErrorType.STREAMING,
            sensor_type="eeg",
            context={"stream_type": "eeg", "interval": 0.04}
        )
    
    async def stream_ppg_data_robust(self):
        """에러 복구 기능이 있는 PPG 스트리밍"""
        return await self.error_handler.robust_execute(
            func=self._stream_ppg_data_core,
            error_type=ErrorType.STREAMING,
            sensor_type="ppg",
            context={"stream_type": "ppg", "interval": 0.02}
        )
    
    async def stream_acc_data_robust(self):
        """에러 복구 기능이 있는 ACC 스트리밍"""
        return await self.error_handler.robust_execute(
            func=self._stream_acc_data_core,
            error_type=ErrorType.STREAMING,
            sensor_type="acc",
            context={"stream_type": "acc", "interval": 0.033}
        )
    
    async def stream_battery_data_robust(self):
        """에러 복구 기능이 있는 배터리 스트리밍"""
        return await self.error_handler.robust_execute(
            func=self._stream_battery_data_core,
            error_type=ErrorType.STREAMING,
            sensor_type="battery",
            context={"stream_type": "battery", "interval": 1.0}
        )

    async def _stream_eeg_data_core(self):
        """EEG 스트리밍 핵심 로직"""
        SEND_INTERVAL = 0.04  # 25Hz (40ms)
        current_time = time.time()
        
        if not self.is_streaming:
            return
            
        if not self.device_manager or not self.device_manager.is_connected():
            raise Exception("Device not connected")
        
        eeg_buffer = self.device_manager.get_and_clear_eeg_buffer()
        processed_data = await self.device_manager.get_and_clear_processed_eeg_buffer()
        
        raw_device_id = "unknown_device"
        if self.device_manager and self.device_manager.get_device_info():
            device_info = self.device_manager.get_device_info()
            if device_info and isinstance(device_info, dict):
                raw_device_id = device_info.get('address', 'unknown_device')
        
        device_id_for_filename = raw_device_id.replace(":", "-").replace(" ", "_")
        
        # 데이터 레코딩
        if self.data_recorder and self.data_recorder.is_recording:
            if eeg_buffer:
                for sample in eeg_buffer:
                    if isinstance(sample, dict):
                        self.data_recorder.add_data(
                            data_type=f"{device_id_for_filename}_eeg_raw",
                            data=sample
                        )
            if processed_data:
                for sample in processed_data:
                    if isinstance(sample, dict):
                        self.data_recorder.add_data(
                            data_type=f"{device_id_for_filename}_eeg_processed",
                            data=sample
                        )
        
        # WebSocket 브로드캐스트
        if eeg_buffer:
            # StreamingMonitor에 데이터 흐름 추적
            self.streaming_monitor.track_data_flow('eeg', len(eeg_buffer))
            
            raw_message = {
                "type": "raw_data",
                "sensor_type": "eeg",
                "device_id": raw_device_id,
                "timestamp": current_time,
                "data": eeg_buffer
            }
            await self.broadcast(json.dumps(raw_message))
        
        if processed_data:
            processed_message = {
                "type": "processed_data",
                "sensor_type": "eeg",
                "device_id": raw_device_id,
                "timestamp": current_time,
                "data": processed_data
            }
            await self.broadcast(json.dumps(processed_message))

    async def _stream_ppg_data_core(self):
        """PPG 스트리밍 핵심 로직"""
        current_time = time.time()
        
        if not self.is_streaming:
            return
            
        if not self.device_manager or not self.device_manager.is_connected():
            raise Exception("Device not connected")
        
        raw_data = self.device_manager.get_and_clear_ppg_buffer()
        processed_data = await self.device_manager.get_and_clear_processed_ppg_buffer()
        
        raw_device_id = "unknown_device"
        if self.device_manager and self.device_manager.get_device_info():
            device_info = self.device_manager.get_device_info()
            if device_info and isinstance(device_info, dict):
                raw_device_id = device_info.get('address', 'unknown_device')
        
        device_id_for_filename = raw_device_id.replace(":", "-").replace(" ", "_")
        
        # 데이터 레코딩 (Priority 1에서 수정된 부분)
        if self.data_recorder and self.data_recorder.is_recording:
            logger.info(f"[STREAM_PPG_DEBUG] Recording PPG data - Raw: {len(raw_data) if raw_data else 0}, Processed: {len(processed_data) if processed_data else 0}")
            if raw_data:
                for sample in raw_data:
                    if isinstance(sample, dict):
                        self.data_recorder.add_data(
                            data_type=f"{device_id_for_filename}_ppg_raw",
                            data=sample
                        )
            if processed_data:
                for sample in processed_data:
                    if isinstance(sample, dict):
                        self.data_recorder.add_data(
                            data_type=f"{device_id_for_filename}_ppg_processed",
                            data=sample
                        )
        
        # WebSocket 브로드캐스트
        if raw_data:
            # StreamingMonitor에 데이터 흐름 추적
            self.streaming_monitor.track_data_flow('ppg', len(raw_data))
            
            raw_message = {
                "type": "raw_data",
                "sensor_type": "ppg",
                "device_id": raw_device_id,
                "timestamp": current_time,
                "data": raw_data
            }
            await self.broadcast(json.dumps(raw_message))
        
        if processed_data:
            processed_message = {
                "type": "processed_data",
                "sensor_type": "ppg",
                "device_id": raw_device_id,
                "timestamp": current_time,
                "data": processed_data
            }
            await self.broadcast(json.dumps(processed_message))

    async def _stream_acc_data_core(self):
        """ACC 스트리밍 핵심 로직"""
        current_time = time.time()
        
        if not self.is_streaming:
            return
            
        if not self.device_manager or not self.device_manager.is_connected():
            raise Exception("Device not connected")
        
        raw_data = self.device_manager.get_and_clear_acc_buffer()
        processed_data = await self.device_manager.get_and_clear_processed_acc_buffer()
        
        raw_device_id = "unknown_device"
        if self.device_manager and self.device_manager.get_device_info():
            device_info = self.device_manager.get_device_info()
            if device_info and isinstance(device_info, dict):
                raw_device_id = device_info.get('address', 'unknown_device')
        
        device_id_for_filename = raw_device_id.replace(":", "-").replace(" ", "_")
        
        # 데이터 레코딩 (Priority 1에서 수정된 부분)
        if self.data_recorder and self.data_recorder.is_recording:
            logger.info(f"[STREAM_ACC_DEBUG] Recording ACC data - Raw: {len(raw_data) if raw_data else 0}, Processed: {len(processed_data) if processed_data else 0}")
            if raw_data:
                for sample in raw_data:
                    if isinstance(sample, dict):
                        self.data_recorder.add_data(
                            data_type=f"{device_id_for_filename}_acc_raw",
                            data=sample
                        )
            if processed_data:
                for sample in processed_data:
                    if isinstance(sample, dict):
                        self.data_recorder.add_data(
                            data_type=f"{device_id_for_filename}_acc_processed",
                            data=sample
                        )
        
        # WebSocket 브로드캐스트
        if raw_data:
            # StreamingMonitor에 데이터 흐름 추적
            self.streaming_monitor.track_data_flow('acc', len(raw_data))
            
            raw_message = {
                "type": "raw_data",
                "sensor_type": "acc",
                "device_id": raw_device_id,
                "timestamp": current_time,
                "data": raw_data
            }
            await self.broadcast(json.dumps(raw_message))
        
        if processed_data:
            processed_message = {
                "type": "processed_data",
                "sensor_type": "acc",
                "device_id": raw_device_id,
                "timestamp": current_time,
                "data": processed_data
            }
            await self.broadcast(json.dumps(processed_message))

    async def _stream_battery_data_core(self):
        """배터리 스트리밍 핵심 로직"""
        current_time = time.time()
        
        if not self.is_streaming:
            return
            
        if not self.device_manager or not self.device_manager.is_connected():
            raise Exception("Device not connected")
        
        battery_buffer = self.device_manager.get_and_clear_battery_buffer()
        battery_level = self.device_manager.battery_level
        
        raw_device_id = "unknown_device"
        if self.device_manager and self.device_manager.get_device_info():
            device_info = self.device_manager.get_device_info()
            if device_info and isinstance(device_info, dict):
                raw_device_id = device_info.get('address', 'unknown_device')
        
        device_id_for_filename = raw_device_id.replace(":", "-").replace(" ", "_")
        
        # 데이터 레코딩 (Priority 1에서 수정된 부분)
        if self.data_recorder and self.data_recorder.is_recording:
            logger.info(f"[STREAM_BATTERY_DEBUG] Recording battery data - Buffer: {len(battery_buffer) if battery_buffer else 0}, Level: {battery_level}")
            if battery_buffer:
                for sample in battery_buffer:
                    if isinstance(sample, dict):
                        self.data_recorder.add_data(
                            data_type=f"{device_id_for_filename}_battery",
                            data=sample
                        )
        
        # WebSocket 브로드캐스트
        if battery_buffer or battery_level is not None:
            # StreamingMonitor에 데이터 흐름 추적
            data_count = len(battery_buffer) if battery_buffer else 1  # 배터리 레벨 업데이트도 카운트
            self.streaming_monitor.track_data_flow('bat', data_count)
            
            battery_message = {
                "type": "battery_data",
                "sensor_type": "battery",
                "device_id": raw_device_id,
                "timestamp": current_time,
                "data": battery_buffer if battery_buffer else [],
                "battery_level": battery_level
            }
            await self.broadcast(json.dumps(battery_message))
