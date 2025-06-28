import asyncio
import gc
import psutil
import time
import threading
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import deque
import logging
import weakref

logger = logging.getLogger(__name__)

@dataclass
class MemoryMetrics:
    """메모리 사용 메트릭"""
    total_memory_mb: float = 0.0
    available_memory_mb: float = 0.0
    used_memory_mb: float = 0.0
    memory_percent: float = 0.0
    process_memory_mb: float = 0.0
    gc_collections: int = 0
    leaked_objects: int = 0
    buffer_memory_mb: float = 0.0
    timestamp: datetime = None

class DataSafetyGuard:
    """데이터 안전성 보장 시스템"""
    
    def __init__(self):
        self.data_integrity_checks = []
        self.critical_data_buffers = {}  # 중요 데이터 백업
        self.data_loss_detected = False
        self.safety_lock = threading.RLock()
        
    def register_critical_buffer(self, sensor_type: str, buffer_ref):
        """중요 데이터 버퍼 등록"""
        with self.safety_lock:
            self.critical_data_buffers[sensor_type] = weakref.ref(buffer_ref)
            logger.info(f"Critical buffer registered for {sensor_type}")
    
    def verify_data_integrity(self) -> bool:
        """데이터 무결성 검증"""
        with self.safety_lock:
            try:
                for sensor_type, buffer_ref in self.critical_data_buffers.items():
                    buffer = buffer_ref()
                    if buffer is None:
                        logger.error(f"CRITICAL: Buffer lost for {sensor_type}")
                        self.data_loss_detected = True
                        return False
                    
                    # 버퍼 크기 검증
                    if hasattr(buffer, 'size') and buffer.size == 0:
                        logger.warning(f"Empty buffer detected for {sensor_type}")
                
                return not self.data_loss_detected
                
            except Exception as e:
                logger.error(f"Data integrity check failed: {e}")
                return False
    
    def emergency_data_backup(self):
        """긴급 데이터 백업"""
        with self.safety_lock:
            backup_data = {}
            for sensor_type, buffer_ref in self.critical_data_buffers.items():
                buffer = buffer_ref()
                if buffer and hasattr(buffer, 'peek'):
                    backup_data[sensor_type] = buffer.peek()
            
            # 백업 데이터 저장 (메모리에 임시 보관)
            self._emergency_backup = backup_data
            logger.warning("Emergency data backup completed")

class SafeMemoryOptimizer:
    """데이터 안전성을 보장하는 메모리 최적화기"""
    
    def __init__(self):
        self.safety_guard = DataSafetyGuard()
        self.optimization_enabled = True
        self.memory_threshold_critical = 95.0  # 95% 이상 시 긴급 최적화
        self.memory_threshold_warning = 85.0   # 85% 이상 시 예방적 최적화
        self.memory_threshold_safe = 70.0      # 70% 이하로 유지 목표
        
        # 최적화 통계
        self.optimization_stats = {
            'gc_runs': 0,
            'memory_freed_mb': 0.0,
            'optimization_blocked': 0,
            'data_safety_violations': 0
        }
        
        # 모니터링
        self.monitoring_active = False
        self.monitoring_task = None
        self.metrics_history = deque(maxlen=100)
        
        logger.info("SafeMemoryOptimizer initialized with data protection priority")
    
    async def start_monitoring(self):
        """메모리 모니터링 시작"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Memory monitoring started")
    
    async def stop_monitoring(self):
        """메모리 모니터링 중지"""
        self.monitoring_active = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("Memory monitoring stopped")
    
    async def _monitoring_loop(self):
        """메모리 모니터링 루프"""
        while self.monitoring_active:
            try:
                # 데이터 무결성 확인 (최우선)
                if not self.safety_guard.verify_data_integrity():
                    logger.critical("DATA INTEGRITY VIOLATION DETECTED - STOPPING OPTIMIZATION")
                    self.optimization_enabled = False
                    self.optimization_stats['data_safety_violations'] += 1
                    break
                
                # 메모리 메트릭 수집
                metrics = self._collect_memory_metrics()
                self.metrics_history.append(metrics)
                
                # 메모리 압박 상황 처리
                if metrics.memory_percent >= self.memory_threshold_critical:
                    logger.warning(f"CRITICAL memory usage: {metrics.memory_percent:.1f}%")
                    await self._emergency_memory_cleanup(metrics)
                elif metrics.memory_percent >= self.memory_threshold_warning:
                    logger.info(f"High memory usage: {metrics.memory_percent:.1f}%")
                    await self._preventive_memory_cleanup(metrics)
                
                await asyncio.sleep(2.0)  # 2초마다 체크
                
            except Exception as e:
                logger.error(f"Memory monitoring error: {e}")
                await asyncio.sleep(5.0)
    
    def _collect_memory_metrics(self) -> MemoryMetrics:
        """메모리 메트릭 수집"""
        try:
            memory = psutil.virtual_memory()
            process = psutil.Process()
            process_memory = process.memory_info().rss / 1024 / 1024
            
            # GC 통계
            gc_stats = gc.get_stats()
            total_collections = sum(stat['collections'] for stat in gc_stats)
            
            # 버퍼 메모리 계산 (추정)
            buffer_memory = self._estimate_buffer_memory()
            
            return MemoryMetrics(
                total_memory_mb=memory.total / 1024 / 1024,
                available_memory_mb=memory.available / 1024 / 1024,
                used_memory_mb=memory.used / 1024 / 1024,
                memory_percent=memory.percent,
                process_memory_mb=process_memory,
                gc_collections=total_collections,
                buffer_memory_mb=buffer_memory,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error collecting memory metrics: {e}")
            return MemoryMetrics(timestamp=datetime.now())
    
    def _estimate_buffer_memory(self) -> float:
        """버퍼 메모리 사용량 추정"""
        try:
            # 등록된 버퍼들의 메모리 사용량 계산
            total_buffer_memory = 0.0
            for sensor_type, buffer_ref in self.safety_guard.critical_data_buffers.items():
                buffer = buffer_ref()
                if buffer and hasattr(buffer, 'get_metrics'):
                    metrics = buffer.get_metrics()
                    if 'memory_usage_bytes' in metrics:
                        total_buffer_memory += metrics['memory_usage_bytes'] / 1024 / 1024
            
            return total_buffer_memory
        except:
            return 0.0
    
    async def _emergency_memory_cleanup(self, metrics: MemoryMetrics):
        """긴급 메모리 정리 (데이터 보호 우선)"""
        if not self.optimization_enabled:
            return
        
        logger.warning("Starting EMERGENCY memory cleanup - DATA PROTECTION PRIORITY")
        
        # 1. 데이터 백업 먼저
        self.safety_guard.emergency_data_backup()
        
        # 2. 데이터 무결성 재확인
        if not self.safety_guard.verify_data_integrity():
            logger.critical("Data integrity compromised - ABORTING memory cleanup")
            self.optimization_stats['optimization_blocked'] += 1
            return
        
        freed_memory = 0.0
        
        try:
            # 3. 비중요 객체부터 정리
            before_gc = psutil.virtual_memory().percent
            
            # 강제 가비지 컬렉션 (안전한 방법)
            collected = gc.collect()
            
            after_gc = psutil.virtual_memory().percent
            freed_memory = before_gc - after_gc
            
            logger.warning(f"Emergency cleanup completed: {freed_memory:.1f}% memory freed, {collected} objects collected")
            
            # 4. 정리 후 데이터 무결성 재확인
            if not self.safety_guard.verify_data_integrity():
                logger.critical("DATA LOST during emergency cleanup - CRITICAL ERROR")
                self.optimization_stats['data_safety_violations'] += 1
                # 긴급 복구 시도
                await self._emergency_data_recovery()
        
        except Exception as e:
            logger.error(f"Emergency memory cleanup failed: {e}")
        
        self.optimization_stats['gc_runs'] += 1
        self.optimization_stats['memory_freed_mb'] += freed_memory
    
    async def _preventive_memory_cleanup(self, metrics: MemoryMetrics):
        """예방적 메모리 정리 (부드러운 최적화)"""
        if not self.optimization_enabled:
            return
        
        # 데이터 무결성 확인
        if not self.safety_guard.verify_data_integrity():
            logger.warning("Data integrity check failed - skipping preventive cleanup")
            return
        
        try:
            # 부드러운 가비지 컬렉션
            before_memory = psutil.virtual_memory().percent
            
            # 세대별 가비지 컬렉션 (안전)
            collected = 0
            for generation in range(3):
                collected += gc.collect(generation)
                
                # 각 세대별로 데이터 무결성 확인
                if not self.safety_guard.verify_data_integrity():
                    logger.warning(f"Data integrity issue at generation {generation} - stopping cleanup")
                    break
            
            after_memory = psutil.virtual_memory().percent
            freed_memory = before_memory - after_memory
            
            if freed_memory > 0:
                logger.info(f"Preventive cleanup: {freed_memory:.1f}% memory freed, {collected} objects collected")
            
        except Exception as e:
            logger.error(f"Preventive memory cleanup failed: {e}")
    
    async def _emergency_data_recovery(self):
        """긴급 데이터 복구"""
        logger.critical("Attempting emergency data recovery...")
        
        try:
            if hasattr(self.safety_guard, '_emergency_backup'):
                backup_data = self.safety_guard._emergency_backup
                
                # 백업 데이터를 버퍼에 복원 시도
                for sensor_type, data in backup_data.items():
                    buffer_ref = self.safety_guard.critical_data_buffers.get(sensor_type)
                    if buffer_ref:
                        buffer = buffer_ref()
                        if buffer and hasattr(buffer, 'write'):
                            for item in data:
                                buffer.write(item)
                
                logger.warning("Emergency data recovery completed")
            
        except Exception as e:
            logger.critical(f"Emergency data recovery failed: {e}")
    
    def register_critical_buffer(self, sensor_type: str, buffer):
        """중요 데이터 버퍼 등록"""
        self.safety_guard.register_critical_buffer(sensor_type, buffer)
    
    def force_memory_optimization(self) -> Dict[str, Any]:
        """강제 메모리 최적화 (데이터 안전성 확인 후)"""
        if not self.safety_guard.verify_data_integrity():
            return {
                "status": "blocked",
                "reason": "data_integrity_violation",
                "memory_freed": 0.0
            }
        
        try:
            before_memory = psutil.virtual_memory().percent
            collected = gc.collect()
            after_memory = psutil.virtual_memory().percent
            
            freed_memory = before_memory - after_memory
            
            # 최적화 후 데이터 무결성 재확인
            if not self.safety_guard.verify_data_integrity():
                logger.critical("Data integrity compromised during forced optimization")
                return {
                    "status": "error",
                    "reason": "data_lost_during_optimization",
                    "memory_freed": 0.0
                }
            
            return {
                "status": "success",
                "memory_freed_percent": freed_memory,
                "objects_collected": collected,
                "memory_after": after_memory
            }
            
        except Exception as e:
            logger.error(f"Forced memory optimization failed: {e}")
            return {
                "status": "error",
                "reason": str(e),
                "memory_freed": 0.0
            }
    
    def get_memory_status(self) -> Dict[str, Any]:
        """메모리 상태 반환"""
        current_metrics = self._collect_memory_metrics()
        
        return {
            "current_memory": {
                "percent": current_metrics.memory_percent,
                "used_mb": current_metrics.used_memory_mb,
                "available_mb": current_metrics.available_memory_mb,
                "process_mb": current_metrics.process_memory_mb
            },
            "data_safety": {
                "integrity_ok": self.safety_guard.verify_data_integrity(),
                "optimization_enabled": self.optimization_enabled,
                "critical_buffers_count": len(self.safety_guard.critical_data_buffers)
            },
            "optimization_stats": self.optimization_stats.copy(),
            "thresholds": {
                "critical": self.memory_threshold_critical,
                "warning": self.memory_threshold_warning,
                "safe": self.memory_threshold_safe
            }
        }
    
    def get_recommendations(self) -> List[str]:
        """메모리 최적화 권장사항"""
        current_metrics = self._collect_memory_metrics()
        recommendations = []
        
        if current_metrics.memory_percent > self.memory_threshold_critical:
            recommendations.append("CRITICAL: Immediate memory cleanup required")
            recommendations.append("Consider reducing buffer sizes temporarily")
            recommendations.append("Stop non-essential processes")
        elif current_metrics.memory_percent > self.memory_threshold_warning:
            recommendations.append("High memory usage detected")
            recommendations.append("Run preventive garbage collection")
            recommendations.append("Monitor data streaming rates")
        else:
            recommendations.append("Memory usage is within safe limits")
            recommendations.append("Continue normal operations")
        
        if not self.safety_guard.verify_data_integrity():
            recommendations.insert(0, "CRITICAL: Data integrity violation detected")
            recommendations.insert(1, "All optimizations suspended for data safety")
        
        return recommendations 