import asyncio
import logging
import time
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
from app.core.server import WebSocketServer
from app.core.signal_processing import SignalProcessor
from app.core.event_types import EventType

# Link Band SDK 통합 로깅 사용
from .logging_config import get_stream_logger, LogTags

logger = get_stream_logger(__name__)

class StreamStatus(Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"

@dataclass
class StreamStats:
    eeg_samples: int = 0
    ppg_samples: int = 0
    acc_samples: int = 0
    bat_samples: int = 0
    bat_level: Optional[int] = None
    start_time: float = 0.0
    last_update: float = 0.0

class StreamEngine:
    """Singleton class for managing streaming functionality."""
    _instance = None
    _initialized_engines = {}

    def __new__(cls, ws_server_instance: WebSocketServer):
        if ws_server_instance not in cls._initialized_engines:
            instance = super(StreamEngine, cls).__new__(cls)
            instance.ws_server = ws_server_instance
            instance._initialized_internally = False
            cls._initialized_engines[ws_server_instance] = instance
            return instance
        return cls._initialized_engines[ws_server_instance]

    def __init__(self, ws_server_instance: WebSocketServer):
        if hasattr(self, '_initialized_internally') and self._initialized_internally:
            return

        self.status = StreamStatus.STOPPED
        self.stats = StreamStats()
        self.connected_clients: Dict[str, Any] = {}
        self.data_callbacks: List[callable] = []
        self._update_task: Optional[asyncio.Task] = None
        self.signal_processor = SignalProcessor()
        self._initialized_internally = True

    async def init_stream(self, host: str = "localhost", port: int = 18765) -> bool:
        logger.info("StreamEngine.init_stream called. WebSocketServer is managed externally.")
        return True
    
    async def start_stream(self) -> bool:
        return await self.ws_server.start_streaming()
    
    async def stop_stream(self) -> bool:
        return await self.ws_server.stop_streaming()
    
    async def health_check(self) -> Dict[str, Any]:
        return self.ws_server.health_check()
    
    def get_stream_status(self) -> Dict[str, Any]:
        return self.ws_server.get_stream_status()
    
    def get_connection_info(self) -> Dict[str, Any]:
        return self.ws_server.get_connection_info()
    
    def get_device_info(self) -> Dict[str, Any]:
        return self.ws_server.get_device_info()

    async def start(self):
        """Start the streaming engine."""
        if self.status == StreamStatus.RUNNING:
            logger.warning("Stream engine is already running")
            return True

        try:
            self.status = StreamStatus.STARTING
            self.stats = StreamStats(start_time=time.time())
            self._update_task = asyncio.create_task(self._update_stats())
            self.status = StreamStatus.RUNNING
            logger.info("Stream engine started successfully")
            return True
        except Exception as e:
            self.status = StreamStatus.ERROR
            logger.error(f"Error starting stream engine: {e}")
            return False

    async def stop(self):
        """Stop the streaming engine."""
        if self.status == StreamStatus.STOPPED:
            logger.warning("Stream engine is already stopped")
            return True

        try:
            self.status = StreamStatus.STOPPING
            if self._update_task:
                self._update_task.cancel()
                try:
                    await self._update_task
                except asyncio.CancelledError:
                    pass
                self._update_task = None

            self.connected_clients.clear()
            self.stats = StreamStats()
            self.status = StreamStatus.STOPPED
            logger.info("Stream engine stopped successfully")
            return True
        except Exception as e:
            self.status = StreamStatus.ERROR
            logger.error(f"Error stopping stream engine: {e}")
            return False

    def add_client(self, client_id: str, websocket: Any):
        """Add a new client to the streaming engine."""
        self.connected_clients[client_id] = {
            'websocket': websocket,
            'connected_at': time.time(),
            'last_activity': time.time()
        }
        logger.info(f"Client {client_id} added to stream engine")

    def remove_client(self, client_id: str):
        """Remove a client from the streaming engine."""
        if client_id in self.connected_clients:
            del self.connected_clients[client_id]
            logger.info(f"Client {client_id} removed from stream engine")

    def add_data_callback(self, callback: callable):
        """Add a callback function for data processing."""
        self.data_callbacks.append(callback)

    def remove_data_callback(self, callback: callable):
        """Remove a data callback function."""
        if callback in self.data_callbacks:
            self.data_callbacks.remove(callback)

    async def broadcast_data(self, data: Dict[str, Any]):
        """Broadcast data to all connected clients."""
        if not self.connected_clients:
            logger.warning("StreamEngine: No connected clients to broadcast data to.")
            return

        try:
            await self.ws_server.broadcast(json.dumps(data))
            logger.info(f"StreamEngine broadcasted data via ws_server: {data.get('type')}")
        except Exception as e:
            logger.error(f"Error in StreamEngine broadcasting data via ws_server: {e}")

    def update_stats(self, eeg: int = 0, ppg: int = 0, acc: int = 0, bat: int = 0, bat_level: Optional[int] = None):
        """Update streaming statistics."""
        self.stats.eeg_samples = eeg
        self.stats.ppg_samples = ppg
        self.stats.acc_samples = acc
        self.stats.bat_samples = bat
        self.stats.bat_level = bat_level
        self.stats.last_update = time.time()

    async def _update_stats(self):
        """Periodically update and broadcast statistics."""
        while True:
            try:
                elapsed = time.time() - self.stats.start_time
                if elapsed > 0 and self.status == StreamStatus.RUNNING:
                    eeg_rate = self.stats.eeg_samples / elapsed
                    ppg_rate = self.stats.ppg_samples / elapsed
                    acc_rate = self.stats.acc_samples / elapsed
                    bat_rate = self.stats.bat_samples / elapsed

                    stats_data = {
                        'type': 'engine_stats',
                        'timestamp': time.time(),
                        'eeg_rate': round(eeg_rate, 2),
                        'ppg_rate': round(ppg_rate, 2),
                        'acc_rate': round(acc_rate, 2),
                        'bat_rate': round(bat_rate, 2),
                        'bat_level': self.stats.bat_level,
                        'engine_connected_clients': len(self.connected_clients)
                    }
                    await self.broadcast_data(stats_data)
            except Exception as e:
                logger.error(f"Error updating stats: {e}")

            await asyncio.sleep(1.0)  # Update every second

    def get_status(self) -> Dict[str, Any]:
        """Get current engine status and statistics."""
        return {
            'status': self.status.value,
            'connected_clients': len(self.connected_clients),
            'stats': {
                'eeg_samples': self.stats.eeg_samples,
                'ppg_samples': self.stats.ppg_samples,
                'acc_samples': self.stats.acc_samples,
                'bat_samples': self.stats.bat_samples,
                'bat_level': self.stats.bat_level,
                'uptime': time.time() - self.stats.start_time if self.stats.start_time > 0 else 0
            }
        }

    async def send_processed_data(self, data_type: str, processed_data: Dict[str, Any]):
        """Send processed data through websocket"""
        try:
            if processed_data is None:
                logger.warning(f"No processed data to send for {data_type}")
                return

            message = {
                'type': 'processed_data',
                'sensor_type': data_type,
                'data': processed_data
            }
            logger.info(f"Attempting to broadcast {data_type} data via StreamEngine's ws_server")
            await self.ws_server.broadcast(json.dumps(message))
            logger.info(f"Successfully broadcast {data_type} data through StreamEngine's ws_server")

        except Exception as e:
            logger.error(f"Error sending processed {data_type} data: {e}", exc_info=True)

    # async def process_and_send_data(self, data_type: str, data: List[Dict[str, Any]]):
    #     """Process data and send through websocket"""
    #     try:
    #         logger.info(f"Processing {data_type} data with {len(data)} samples")
            
    #         # Process data based on type
    #         if data_type == 'eeg':
    #             processed_data = await self.signal_processor.process_eeg_data()
    #         elif data_type == 'ppg':
    #             processed_data = await self.signal_processor.process_ppg_data(data)
    #         elif data_type == 'acc':
    #             processed_data = await self.signal_processor.process_acc_data(data)
    #         elif data_type == 'bat':
    #             processed_data = await self.signal_processor.process_bat_data(data)
    #         else:
    #             logger.warning(f"Unknown data type: {data_type}")
    #             return

    #         # Send processed data
    #         if processed_data is not None:
    #             logger.info(f"Successfully processed {data_type} data, sending...")
    #             await self.send_processed_data(data_type, processed_data)
    #         else:
    #             logger.warning(f"No processed data returned for {data_type}")

    #     except Exception as e:
    #         logger.error(f"Error processing and sending {data_type} data: {e}", exc_info=True)
