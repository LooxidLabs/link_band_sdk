import asyncio
import logging
import time
from typing import Dict, Any, Optional, Callable, List, Set
from enum import Enum, auto
from datetime import datetime, timedelta
import json

from .error_handler import ErrorHandler, ErrorType, ErrorSeverity, global_error_handler

logger = logging.getLogger(__name__)

class StreamStatus(Enum):
    """스트림 상태"""
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"
    RECOVERING = "recovering"

class DataStreamManager:
    """데이터 스트림 통합 관리자"""
    
    def __init__(self, error_handler: Optional[ErrorHandler] = None):
        self.error_handler = error_handler or global_error_handler
        self.streams: Dict[str, Any] = {}
        self.is_streaming = False
        
        # 전역 상태 관리
        self.start_time: Optional[datetime] = None
        self.status_callbacks: List[Callable] = []
        
        # 스트림 설정
        self.stream_intervals = {
            'eeg': 0.04,     # 25Hz
            'ppg': 0.02,     # 50Hz  
            'acc': 0.033,    # 30Hz
            'battery': 1.0   # 1Hz
        }
        
        logger.info("DataStreamManager initialized")

    async def robust_stream_task(self, sensor_type: str, stream_function: Callable):
        """에러 복구 기능이 있는 스트리밍 태스크"""
        retry_count = 0
        max_retries = 3
        
        while self.is_streaming and retry_count < max_retries:
            try:
                if asyncio.iscoroutinefunction(stream_function):
                    await stream_function()
                else:
                    stream_function()
                retry_count = 0  # 성공 시 리셋
                
            except Exception as e:
                retry_count += 1
                await self.error_handler.handle_error(
                    error_type=ErrorType.STREAMING,
                    severity=ErrorSeverity.MEDIUM if retry_count < max_retries else ErrorSeverity.HIGH,
                    message=f"Stream error for {sensor_type} (attempt {retry_count}/{max_retries})",
                    exception=e,
                    sensor_type=sensor_type
                )
                
                if retry_count < max_retries:
                    await asyncio.sleep(1)  # 재시도 대기
                else:
                    logger.error(f"Max retries exceeded for {sensor_type}, stopping stream")
                    break
                    
            # 인터벌 대기
            interval = self.stream_intervals.get(sensor_type, 1.0)
            await asyncio.sleep(interval)

    def get_stream_status(self) -> Dict[str, Any]:
        """전체 스트림 상태 반환"""
        return {
            "is_streaming": self.is_streaming,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "error_stats": self.error_handler.get_error_stats()
        }

    def get_health_summary(self) -> Dict[str, Any]:
        """시스템 건강 상태 요약"""
        return {
            "overall_health": "healthy",
            "is_streaming": self.is_streaming,
            "error_stats": self.error_handler.get_error_stats()
        }
