import asyncio
import logging
import time
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
from app.core.ws_singleton import ws_server
from app.core.server import WebSocketServer
from app.core.signal_processing import SignalProcessor
from app.core.event_types import EventType

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(StreamEngine, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if StreamEngine._initialized:
            return

        self.status = StreamStatus.STOPPED
        self.stats = StreamStats()
        self.connected_clients: Dict[str, Any] = {}
        self.data_callbacks: List[callable] = []
        self._update_task: Optional[asyncio.Task] = None
        self.signal_processor = SignalProcessor()  # Initialize signal processor
        StreamEngine._initialized = True

    async def init_stream(self, host: str = "localhost", port: int = 18765) -> bool:
        """Initialize the streaming server"""
        return await ws_server.initialize()
    
    async def start_stream(self) -> bool:
        """Start streaming"""
        return await ws_server.start_streaming()
    
    async def stop_stream(self) -> bool:
        """Stop streaming"""
        return await ws_server.stop_streaming()
    
    async def health_check(self) -> Dict[str, Any]:
        """Check streaming server health"""
        return ws_server.health_check()
    
    def get_stream_status(self) -> Dict[str, Any]:
        """Get streaming status and statistics"""
        return ws_server.get_stream_status()
    
    def get_connection_info(self) -> Dict[str, Any]:
        """Get WebSocket server connection information"""
        return ws_server.get_connection_info()
    
    def get_device_info(self) -> Dict[str, Any]:
        """Get current device information"""
        return ws_server.get_device_info()

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
            return

        disconnected_clients = []
        for client_id, client_info in self.connected_clients.items():
            try:
                await client_info['websocket'].send_json(data)
                client_info['last_activity'] = time.time()
            except Exception as e:
                logger.error(f"Error broadcasting to client {client_id}: {e}")
                disconnected_clients.append(client_id)

        # Remove disconnected clients
        for client_id in disconnected_clients:
            self.remove_client(client_id)

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
                # Calculate rates
                elapsed = time.time() - self.stats.start_time
                if elapsed > 0:
                    eeg_rate = self.stats.eeg_samples / elapsed
                    ppg_rate = self.stats.ppg_samples / elapsed
                    acc_rate = self.stats.acc_samples / elapsed
                    bat_rate = self.stats.bat_samples / elapsed

                    stats_data = {
                        'type': 'stats',
                        'timestamp': time.time(),
                        'eeg_rate': round(eeg_rate, 2),
                        'ppg_rate': round(ppg_rate, 2),
                        'acc_rate': round(acc_rate, 2),
                        'bat_rate': round(bat_rate, 2),
                        'bat_level': self.stats.bat_level,
                        'connected_clients': len(self.connected_clients)
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

            # Create message with processed data
            message = {
                'type': 'processed_data',
                'sensor_type': data_type,
                'data': processed_data
            }

            logger.info(f"Attempting to broadcast {data_type} data")
            
            # Broadcast through ws_server
            await ws_server.broadcast(json.dumps(message))
            logger.info(f"Successfully broadcast {data_type} data through ws_server")

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
