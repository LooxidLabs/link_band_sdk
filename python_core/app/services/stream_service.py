from typing import Dict, Any
from app.core.stream_engine import StreamEngine
from app.core.server import WebSocketServer

class StreamService:
    def __init__(self, ws_server: WebSocketServer):
        self._engine = StreamEngine(ws_server_instance=ws_server)
    
    async def init_stream(self, host: str = "localhost", port: int = 18765) -> bool:
        """Initialize the streaming engine (server is managed externally)."""
        return await self._engine.init_stream(host, port)
    
    async def start_stream(self) -> bool:
        """Start streaming"""
        return await self._engine.start_stream()
    
    async def stop_stream(self) -> bool:
        """Stop streaming"""
        return await self._engine.stop_stream()
    
    async def health_check(self) -> Dict[str, Any]:
        """Check streaming server health"""
        return await self._engine.health_check()
    
    def get_stream_status(self) -> Dict[str, Any]:
        """Get streaming status and statistics"""
        return self._engine.get_stream_status()
    
    def get_connection_info(self) -> Dict[str, Any]:
        """Get WebSocket server connection information"""
        return self._engine.get_connection_info()
    
    def get_device_info(self) -> Dict[str, Any]:
        """Get current device information"""
        return self._engine.get_device_info()
    
    def update_stream_stats(self, sensor_type: str, samples_per_sec: int, total_samples: int):
        """Update streaming statistics"""
        self._engine.update_stream_stats(sensor_type, samples_per_sec, total_samples)
    
    async def get_auto_streaming_status(self) -> Dict[str, Any]:
        """Get automatically detected streaming status from StreamingMonitor"""
        return await self._engine.get_auto_streaming_status()
