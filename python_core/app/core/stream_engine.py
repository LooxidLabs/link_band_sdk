import asyncio
import logging
from typing import Optional, Dict, Any
from app.core.ws_singleton import ws_server
from app.core.server import WebSocketServer

logger = logging.getLogger(__name__)

class StreamEngine:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(StreamEngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.server: Optional[WebSocketServer] = None
        self._initialized = True
        self._stream_stats = {
            'eeg': {'samples_per_sec': 0, 'total_samples': 0},
            'ppg': {'samples_per_sec': 0, 'total_samples': 0},
            'acc': {'samples_per_sec': 0, 'total_samples': 0},
            'bat': {'samples_per_sec': 0, 'total_samples': 0}
        }
    
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
    
    def update_stream_stats(self, sensor_type: str, samples_per_sec: int, total_samples: int):
        """Update streaming statistics"""
        if sensor_type in self._stream_stats:
            self._stream_stats[sensor_type] = {
                'samples_per_sec': samples_per_sec,
                'total_samples': total_samples
            }
