import asyncio
import time
import threading
from collections import deque
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
import psutil
import logging

logger = logging.getLogger(__name__)

@dataclass
class BufferMetrics:
    """버퍼 성능 메트릭"""
    total_writes: int = 0
    total_reads: int = 0
    buffer_overflows: int = 0
    memory_usage_bytes: int = 0
    avg_write_time_ms: float = 0.0
    avg_read_time_ms: float = 0.0
    last_update: datetime = None

class CircularBuffer:
    """메모리 효율적인 순환 버퍼"""
    
    def __init__(self, 
                 max_size: int = 1000,
                 sensor_type: str = "unknown",
                 overflow_callback: Optional[Callable] = None):
        self.max_size = max_size
        self.sensor_type = sensor_type
        self.overflow_callback = overflow_callback
        
        # 데이터 저장소
        self._buffer = deque(maxlen=max_size)
        self._lock = threading.RLock()
        
        # 메트릭
        self.metrics = BufferMetrics()
        self.metrics.last_update = datetime.now()
        
        # 성능 추적
        self._write_times = deque(maxlen=100)  # 최근 100개 쓰기 시간
        self._read_times = deque(maxlen=100)   # 최근 100개 읽기 시간
        
        logger.info(f"CircularBuffer created for {sensor_type} with max_size {max_size}")
    
    def write(self, data: Any) -> bool:
        """데이터 쓰기"""
        start_time = time.perf_counter()
        
        try:
            with self._lock:
                # 버퍼가 가득 찬 경우
                if len(self._buffer) >= self.max_size:
                    self.metrics.buffer_overflows += 1
                    if self.overflow_callback:
                        try:
                            self.overflow_callback(self.sensor_type, data)
                        except Exception as e:
                            logger.error(f"Error in overflow callback for {self.sensor_type}: {e}")
                
                # 데이터 추가 (deque가 자동으로 오래된 데이터 제거)
                self._buffer.append({
                    'data': data,
                    'timestamp': time.time(),
                    'write_id': self.metrics.total_writes
                })
                
                self.metrics.total_writes += 1
                
                # 쓰기 시간 기록
                write_time = (time.perf_counter() - start_time) * 1000
                self._write_times.append(write_time)
                
                # 평균 쓰기 시간 업데이트
                if self._write_times:
                    self.metrics.avg_write_time_ms = sum(self._write_times) / len(self._write_times)
                
                return True
                
        except Exception as e:
            logger.error(f"Error writing to buffer for {self.sensor_type}: {e}")
            return False
    
    def read(self, count: Optional[int] = None) -> List[Any]:
        """데이터 읽기"""
        start_time = time.perf_counter()
        
        try:
            with self._lock:
                if not self._buffer:
                    return []
                
                # 읽을 개수 결정
                if count is None:
                    count = len(self._buffer)
                else:
                    count = min(count, len(self._buffer))
                
                # 데이터 추출
                result = []
                for _ in range(count):
                    if self._buffer:
                        item = self._buffer.popleft()
                        result.append(item)
                
                self.metrics.total_reads += len(result)
                
                # 읽기 시간 기록
                read_time = (time.perf_counter() - start_time) * 1000
                self._read_times.append(read_time)
                
                # 평균 읽기 시간 업데이트
                if self._read_times:
                    self.metrics.avg_read_time_ms = sum(self._read_times) / len(self._read_times)
                
                return result
                
        except Exception as e:
            logger.error(f"Error reading from buffer for {self.sensor_type}: {e}")
            return []
    
    def peek(self, count: Optional[int] = None) -> List[Any]:
        """데이터 읽기 (제거하지 않음)"""
        try:
            with self._lock:
                if not self._buffer:
                    return []
                
                if count is None:
                    return list(self._buffer)
                else:
                    count = min(count, len(self._buffer))
                    return list(self._buffer)[:count]
                    
        except Exception as e:
            logger.error(f"Error peeking buffer for {self.sensor_type}: {e}")
            return []
    
    def clear(self) -> int:
        """버퍼 비우기"""
        try:
            with self._lock:
                cleared_count = len(self._buffer)
                self._buffer.clear()
                logger.info(f"Cleared {cleared_count} items from {self.sensor_type} buffer")
                return cleared_count
        except Exception as e:
            logger.error(f"Error clearing buffer for {self.sensor_type}: {e}")
            return 0
    
    def resize(self, new_size: int) -> bool:
        """버퍼 크기 조정"""
        try:
            with self._lock:
                old_size = self.max_size
                self.max_size = new_size
                
                # 새로운 deque 생성
                old_data = list(self._buffer)
                self._buffer = deque(old_data[-new_size:], maxlen=new_size)
                
                logger.info(f"Buffer resized for {self.sensor_type}: {old_size} -> {new_size}")
                return True
        except Exception as e:
            logger.error(f"Error resizing buffer for {self.sensor_type}: {e}")
            return False
    
    @property
    def size(self) -> int:
        """현재 버퍼 크기"""
        with self._lock:
            return len(self._buffer)
    
    @property
    def is_full(self) -> bool:
        """버퍼가 가득 찬지 확인"""
        with self._lock:
            return len(self._buffer) >= self.max_size
    
    @property
    def utilization(self) -> float:
        """버퍼 사용률 (0.0 - 1.0)"""
        with self._lock:
            return len(self._buffer) / self.max_size if self.max_size > 0 else 0.0
    
    def get_metrics(self) -> Dict[str, Any]:
        """버퍼 메트릭 반환"""
        with self._lock:
            self.metrics.memory_usage_bytes = self._estimate_memory_usage()
            self.metrics.last_update = datetime.now()
            
            return {
                "sensor_type": self.sensor_type,
                "max_size": self.max_size,
                "current_size": len(self._buffer),
                "utilization": self.utilization,
                "total_writes": self.metrics.total_writes,
                "total_reads": self.metrics.total_reads,
                "buffer_overflows": self.metrics.buffer_overflows,
                "memory_usage_bytes": self.metrics.memory_usage_bytes,
                "avg_write_time_ms": self.metrics.avg_write_time_ms,
                "avg_read_time_ms": self.metrics.avg_read_time_ms,
                "last_update": self.metrics.last_update.isoformat()
            }
    
    def _estimate_memory_usage(self) -> int:
        """메모리 사용량 추정"""
        try:
            # 간단한 메모리 사용량 추정
            base_size = 64  # 기본 객체 크기
            item_size = 128  # 평균 아이템 크기 추정
            return base_size + (len(self._buffer) * item_size)
        except:
            return 0

class BufferManager:
    """센서별 버퍼 통합 관리자"""
    
    def __init__(self):
        # 센서별 버퍼
        self.buffers: Dict[str, CircularBuffer] = {}
        
        # 기본 설정
        self.default_buffer_sizes = {
            "eeg": 2000,      # EEG 데이터는 많은 버퍼 필요
            "ppg": 1000,      # PPG 데이터
            "acc": 1000,      # 가속도 데이터
            "battery": 100,   # 배터리 데이터는 적은 버퍼
            "default": 500    # 기본값
        }
        
        # 적응형 크기 조정 설정
        self.adaptive_sizing_enabled = True
        self.size_adjustment_threshold = 0.8  # 80% 사용률에서 크기 조정
        self.max_size_multiplier = 4.0        # 최대 4배까지 증가
        self.min_size_divisor = 2.0           # 최소 1/2까지 감소
        
        # 모니터링
        self.monitoring_enabled = True
        self.monitoring_interval = 30.0  # 30초마다 모니터링
        self.monitoring_task: Optional[asyncio.Task] = None
        
        # 콜백
        self.overflow_callbacks: List[Callable] = []
        self.resize_callbacks: List[Callable] = []
        
        logger.info("BufferManager initialized")
    
    def create_buffer(self, sensor_type: str, 
                     max_size: Optional[int] = None,
                     overflow_callback: Optional[Callable] = None) -> bool:
        """센서 버퍼 생성"""
        if sensor_type in self.buffers:
            logger.warning(f"Buffer for {sensor_type} already exists")
            return False
        
        # 버퍼 크기 결정
        if max_size is None:
            max_size = self.default_buffer_sizes.get(sensor_type, 
                                                   self.default_buffer_sizes["default"])
        
        # 오버플로우 콜백 설정
        if overflow_callback is None:
            overflow_callback = self._default_overflow_callback
        
        # 버퍼 생성
        buffer = CircularBuffer(
            max_size=max_size,
            sensor_type=sensor_type,
            overflow_callback=overflow_callback
        )
        
        self.buffers[sensor_type] = buffer
        logger.info(f"Buffer created for {sensor_type} with size {max_size}")
        return True
    
    def remove_buffer(self, sensor_type: str) -> bool:
        """센서 버퍼 제거"""
        if sensor_type not in self.buffers:
            return False
        
        # 버퍼 정리
        self.buffers[sensor_type].clear()
        del self.buffers[sensor_type]
        
        logger.info(f"Buffer removed for {sensor_type}")
        return True
    
    def write_data(self, sensor_type: str, data: Any) -> bool:
        """데이터 쓰기"""
        if sensor_type not in self.buffers:
            # 자동으로 버퍼 생성
            self.create_buffer(sensor_type)
        
        return self.buffers[sensor_type].write(data)
    
    def read_data(self, sensor_type: str, count: Optional[int] = None) -> List[Any]:
        """데이터 읽기"""
        if sensor_type not in self.buffers:
            return []
        
        return self.buffers[sensor_type].read(count)
    
    def peek_data(self, sensor_type: str, count: Optional[int] = None) -> List[Any]:
        """데이터 읽기 (제거하지 않음)"""
        if sensor_type not in self.buffers:
            return []
        
        return self.buffers[sensor_type].peek(count)
    
    def clear_buffer(self, sensor_type: str) -> int:
        """버퍼 비우기"""
        if sensor_type not in self.buffers:
            return 0
        
        return self.buffers[sensor_type].clear()
    
    def clear_all_buffers(self) -> Dict[str, int]:
        """모든 버퍼 비우기"""
        results = {}
        for sensor_type in self.buffers:
            results[sensor_type] = self.clear_buffer(sensor_type)
        return results
    
    async def start_monitoring(self):
        """적응형 모니터링 시작"""
        if not self.monitoring_enabled or self.monitoring_task:
            return
        
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Buffer monitoring started")
    
    async def stop_monitoring(self):
        """모니터링 중지"""
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
            self.monitoring_task = None
            logger.info("Buffer monitoring stopped")
    
    async def _monitoring_loop(self):
        """모니터링 루프"""
        while True:
            try:
                await self._check_and_adjust_buffers()
                await asyncio.sleep(self.monitoring_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in buffer monitoring: {e}")
                await asyncio.sleep(5.0)
    
    async def _check_and_adjust_buffers(self):
        """버퍼 상태 확인 및 크기 조정"""
        if not self.adaptive_sizing_enabled:
            return
        
        for sensor_type, buffer in self.buffers.items():
            try:
                utilization = buffer.utilization
                current_size = buffer.max_size
                
                # 크기 증가 필요 (높은 사용률)
                if utilization > self.size_adjustment_threshold:
                    default_size = self.default_buffer_sizes.get(sensor_type, 
                                                               self.default_buffer_sizes["default"])
                    max_allowed_size = int(default_size * self.max_size_multiplier)
                    
                    if current_size < max_allowed_size:
                        new_size = min(int(current_size * 1.5), max_allowed_size)
                        buffer.resize(new_size)
                        await self._notify_resize(sensor_type, current_size, new_size, "increased")
                
                # 크기 감소 가능 (낮은 사용률)
                elif utilization < 0.3:  # 30% 미만 사용률
                    default_size = self.default_buffer_sizes.get(sensor_type, 
                                                               self.default_buffer_sizes["default"])
                    min_allowed_size = int(default_size / self.min_size_divisor)
                    
                    if current_size > min_allowed_size and current_size > default_size:
                        new_size = max(int(current_size * 0.8), min_allowed_size)
                        buffer.resize(new_size)
                        await self._notify_resize(sensor_type, current_size, new_size, "decreased")
                        
            except Exception as e:
                logger.error(f"Error adjusting buffer for {sensor_type}: {e}")
    
    def _default_overflow_callback(self, sensor_type: str, data: Any):
        """기본 오버플로우 콜백"""
        logger.warning(f"Buffer overflow for {sensor_type}, oldest data will be discarded")
        
        # 오버플로우 콜백 호출
        for callback in self.overflow_callbacks:
            try:
                callback(sensor_type, data)
            except Exception as e:
                logger.error(f"Error in overflow callback: {e}")
    
    async def _notify_resize(self, sensor_type: str, old_size: int, new_size: int, action: str):
        """크기 변경 알림"""
        logger.info(f"Buffer {action} for {sensor_type}: {old_size} -> {new_size}")
        
        for callback in self.resize_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(sensor_type, old_size, new_size, action)
                else:
                    callback(sensor_type, old_size, new_size, action)
            except Exception as e:
                logger.error(f"Error in resize callback: {e}")
    
    def add_overflow_callback(self, callback: Callable):
        """오버플로우 콜백 추가"""
        self.overflow_callbacks.append(callback)
    
    def add_resize_callback(self, callback: Callable):
        """크기 변경 콜백 추가"""
        self.resize_callbacks.append(callback)
    
    def get_buffer_status(self) -> Dict[str, Any]:
        """전체 버퍼 상태 반환"""
        buffer_stats = {}
        total_memory = 0
        total_items = 0
        
        for sensor_type, buffer in self.buffers.items():
            metrics = buffer.get_metrics()
            buffer_stats[sensor_type] = metrics
            total_memory += metrics.get("memory_usage_bytes", 0)
            total_items += metrics.get("current_size", 0)
        
        return {
            "total_buffers": len(self.buffers),
            "total_memory_bytes": total_memory,
            "total_items": total_items,
            "adaptive_sizing_enabled": self.adaptive_sizing_enabled,
            "monitoring_enabled": self.monitoring_enabled,
            "buffers": buffer_stats
        }
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """성능 요약 반환"""
        total_writes = 0
        total_reads = 0
        total_overflows = 0
        avg_utilization = 0
        
        for buffer in self.buffers.values():
            metrics = buffer.get_metrics()
            total_writes += metrics.get("total_writes", 0)
            total_reads += metrics.get("total_reads", 0)
            total_overflows += metrics.get("buffer_overflows", 0)
            avg_utilization += metrics.get("utilization", 0)
        
        if self.buffers:
            avg_utilization /= len(self.buffers)
        
        return {
            "total_writes": total_writes,
            "total_reads": total_reads,
            "total_overflows": total_overflows,
            "average_utilization": avg_utilization,
            "overflow_rate": (total_overflows / total_writes) if total_writes > 0 else 0,
            "buffer_efficiency": (total_reads / total_writes) if total_writes > 0 else 0
        }

# 전역 버퍼 매니저 인스턴스
global_buffer_manager = BufferManager() 