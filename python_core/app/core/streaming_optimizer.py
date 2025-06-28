import asyncio
import time
import threading
from typing import Dict, List, Any, Optional, Callable, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import deque, defaultdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class StreamPriority(Enum):
    """스트림 우선순위"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

class StreamMode(Enum):
    """스트림 모드"""
    CONTINUOUS = "continuous"    # 연속 스트리밍
    BURST = "burst"             # 버스트 모드
    ADAPTIVE = "adaptive"       # 적응형
    POWER_SAVE = "power_save"   # 절전 모드

@dataclass
class StreamConfig:
    """스트림 설정"""
    sensor_type: str
    priority: StreamPriority = StreamPriority.NORMAL
    mode: StreamMode = StreamMode.ADAPTIVE
    base_interval: float = 1.0
    min_interval: float = 0.1
    max_interval: float = 10.0
    burst_size: int = 10
    adaptive_threshold: float = 0.8
    enabled: bool = True

@dataclass
class StreamMetrics:
    """스트림 성능 메트릭"""
    sensor_type: str = ""
    current_interval: float = 0.0
    actual_rate: float = 0.0
    target_rate: float = 0.0
    latency_ms: float = 0.0
    jitter_ms: float = 0.0
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    efficiency_score: float = 0.0
    last_update: datetime = None

class AdaptiveController:
    """적응형 스트리밍 제어기"""
    
    def __init__(self, sensor_type: str, config: StreamConfig):
        self.sensor_type = sensor_type
        self.config = config
        
        # 현재 상태
        self.current_interval = config.base_interval
        self.target_rate = 1.0 / config.base_interval
        self.actual_rate = 0.0
        
        # 성능 추적
        self.latency_history = deque(maxlen=50)
        self.rate_history = deque(maxlen=50)
        self.cpu_history = deque(maxlen=20)
        
        # 적응형 제어 파라미터
        self.adaptation_factor = 0.1
        self.stability_threshold = 0.05
        self.performance_window = 10  # 성능 평가 윈도우 (초)
        
        # 제어 상태
        self.last_adjustment = time.time()
        self.adjustment_cooldown = 2.0  # 조정 간 최소 간격 (초)
        self.is_stable = True
        
        logger.info(f"AdaptiveController created for {sensor_type}")
    
    def update_metrics(self, latency_ms: float, actual_rate: float, cpu_usage: float):
        """메트릭 업데이트"""
        current_time = time.time()
        
        self.latency_history.append((current_time, latency_ms))
        self.rate_history.append((current_time, actual_rate))
        self.cpu_history.append((current_time, cpu_usage))
        
        self.actual_rate = actual_rate
    
    def should_adjust(self) -> bool:
        """조정이 필요한지 확인"""
        current_time = time.time()
        
        # 쿨다운 확인
        if current_time - self.last_adjustment < self.adjustment_cooldown:
            return False
        
        # 충분한 데이터 확인
        if len(self.latency_history) < 5:
            return False
        
        return True
    
    def calculate_optimal_interval(self) -> float:
        """최적 간격 계산"""
        if not self.should_adjust():
            return self.current_interval
        
        try:
            # 최근 성능 데이터 분석
            recent_latencies = [lat for _, lat in list(self.latency_history)[-10:]]
            recent_rates = [rate for _, rate in list(self.rate_history)[-10:]]
            recent_cpu = [cpu for _, cpu in list(self.cpu_history)[-5:]]
            
            if not recent_latencies or not recent_rates:
                return self.current_interval
            
            avg_latency = sum(recent_latencies) / len(recent_latencies)
            avg_rate = sum(recent_rates) / len(recent_rates)
            avg_cpu = sum(recent_cpu) / len(recent_cpu) if recent_cpu else 0
            
            # 성능 기반 조정
            optimal_interval = self.current_interval
            
            # 지연시간이 높으면 간격 증가
            if avg_latency > 50:  # 50ms 이상
                optimal_interval *= 1.2
            elif avg_latency < 20:  # 20ms 이하
                optimal_interval *= 0.9
            
            # CPU 사용률이 높으면 간격 증가
            if avg_cpu > 70:  # 70% 이상
                optimal_interval *= 1.3
            elif avg_cpu < 30:  # 30% 이하
                optimal_interval *= 0.95
            
            # 실제 레이트와 목표 레이트 비교
            rate_ratio = avg_rate / self.target_rate if self.target_rate > 0 else 1.0
            if rate_ratio < 0.8:  # 목표의 80% 이하
                optimal_interval *= 1.1
            elif rate_ratio > 1.2:  # 목표의 120% 이상
                optimal_interval *= 0.9
            
            # 제한 범위 적용
            optimal_interval = max(self.config.min_interval, 
                                 min(self.config.max_interval, optimal_interval))
            
            return optimal_interval
            
        except Exception as e:
            logger.error(f"Error calculating optimal interval for {self.sensor_type}: {e}")
            return self.current_interval
    
    def adjust_interval(self) -> Tuple[float, str]:
        """간격 조정"""
        if not self.should_adjust():
            return self.current_interval, "no_change"
        
        old_interval = self.current_interval
        new_interval = self.calculate_optimal_interval()
        
        # 변경이 미미한 경우 무시
        change_ratio = abs(new_interval - old_interval) / old_interval
        if change_ratio < self.stability_threshold:
            return self.current_interval, "stable"
        
        self.current_interval = new_interval
        self.target_rate = 1.0 / new_interval if new_interval > 0 else 0
        self.last_adjustment = time.time()
        
        # 변경 방향 결정
        if new_interval > old_interval:
            action = "increased"
        else:
            action = "decreased"
        
        logger.info(f"Interval {action} for {self.sensor_type}: {old_interval:.3f}s -> {new_interval:.3f}s")
        return self.current_interval, action
    
    def get_metrics(self) -> StreamMetrics:
        """현재 메트릭 반환"""
        recent_latencies = [lat for _, lat in list(self.latency_history)[-5:]]
        avg_latency = sum(recent_latencies) / len(recent_latencies) if recent_latencies else 0
        
        # 지터 계산 (지연시간 변동성)
        jitter = 0
        if len(recent_latencies) > 1:
            avg_lat = sum(recent_latencies) / len(recent_latencies)
            jitter = sum(abs(lat - avg_lat) for lat in recent_latencies) / len(recent_latencies)
        
        # 효율성 점수 계산
        efficiency = self._calculate_efficiency_score()
        
        return StreamMetrics(
            sensor_type=self.sensor_type,
            current_interval=self.current_interval,
            actual_rate=self.actual_rate,
            target_rate=self.target_rate,
            latency_ms=avg_latency,
            jitter_ms=jitter,
            cpu_usage=0,  # TODO: 실제 CPU 사용률
            memory_usage=0,  # TODO: 실제 메모리 사용률
            efficiency_score=efficiency,
            last_update=datetime.now()
        )
    
    def _calculate_efficiency_score(self) -> float:
        """효율성 점수 계산 (0-100)"""
        try:
            score = 100.0
            
            # 지연시간 점수 (낮을수록 좋음)
            recent_latencies = [lat for _, lat in list(self.latency_history)[-5:]]
            if recent_latencies:
                avg_latency = sum(recent_latencies) / len(recent_latencies)
                latency_score = max(0, 100 - (avg_latency / 2))  # 200ms = 0점
                score = min(score, latency_score)
            
            # 레이트 정확도 점수
            if self.target_rate > 0:
                rate_accuracy = min(1.0, self.actual_rate / self.target_rate)
                rate_score = rate_accuracy * 100
                score = min(score, rate_score)
            
            # 안정성 점수 (지터가 낮을수록 좋음)
            if len(self.latency_history) > 5:
                latencies = [lat for _, lat in list(self.latency_history)[-10:]]
                avg_lat = sum(latencies) / len(latencies)
                jitter = sum(abs(lat - avg_lat) for lat in latencies) / len(latencies)
                stability_score = max(0, 100 - (jitter * 2))
                score = min(score, stability_score)
            
            return score
            
        except Exception as e:
            logger.error(f"Error calculating efficiency score for {self.sensor_type}: {e}")
            return 50.0

class StreamingOptimizer:
    """스트리밍 최적화 시스템"""
    
    def __init__(self):
        # 스트림 설정 및 제어기
        self.stream_configs: Dict[str, StreamConfig] = {}
        self.controllers: Dict[str, AdaptiveController] = {}
        
        # 우선순위 큐
        self.priority_queues: Dict[StreamPriority, List[str]] = {
            priority: [] for priority in StreamPriority
        }
        
        # 최적화 설정
        self.optimization_enabled = True
        self.global_cpu_threshold = 80.0
        self.global_memory_threshold = 85.0
        self.optimization_interval = 5.0  # 5초마다 최적화
        
        # 모니터링
        self.optimization_task: Optional[asyncio.Task] = None
        self.is_optimizing = False
        
        # 성능 추적
        self.optimization_history: deque = deque(maxlen=100)
        self.global_metrics = {
            "total_streams": 0,
            "active_streams": 0,
            "avg_efficiency": 0.0,
            "total_adjustments": 0
        }
        
        # 콜백
        self.optimization_callbacks: List[Callable] = []
        self.adjustment_callbacks: List[Callable] = []
        
        # 기본 설정
        self._setup_default_configs()
        
        logger.info("StreamingOptimizer initialized")
    
    def _setup_default_configs(self):
        """기본 스트림 설정"""
        default_configs = {
            "eeg": StreamConfig(
                sensor_type="eeg",
                priority=StreamPriority.HIGH,
                mode=StreamMode.CONTINUOUS,
                base_interval=0.2,  # 5Hz
                min_interval=0.1,   # 최대 10Hz
                max_interval=1.0    # 최소 1Hz
            ),
            "ppg": StreamConfig(
                sensor_type="ppg",
                priority=StreamPriority.NORMAL,
                mode=StreamMode.ADAPTIVE,
                base_interval=0.5,  # 2Hz
                min_interval=0.25,  # 최대 4Hz
                max_interval=2.0    # 최소 0.5Hz
            ),
            "acc": StreamConfig(
                sensor_type="acc",
                priority=StreamPriority.NORMAL,
                mode=StreamMode.ADAPTIVE,
                base_interval=0.5,  # 2Hz
                min_interval=0.25,  # 최대 4Hz
                max_interval=2.0    # 최소 0.5Hz
            ),
            "battery": StreamConfig(
                sensor_type="battery",
                priority=StreamPriority.LOW,
                mode=StreamMode.POWER_SAVE,
                base_interval=5.0,  # 0.2Hz
                min_interval=2.0,   # 최대 0.5Hz
                max_interval=30.0   # 최소 0.033Hz
            )
        }
        
        for sensor_type, config in default_configs.items():
            self.register_stream(config)
    
    def register_stream(self, config: StreamConfig) -> bool:
        """스트림 등록"""
        try:
            sensor_type = config.sensor_type
            
            # 기존 스트림 정리
            if sensor_type in self.stream_configs:
                self.unregister_stream(sensor_type)
            
            # 새 스트림 등록
            self.stream_configs[sensor_type] = config
            self.controllers[sensor_type] = AdaptiveController(sensor_type, config)
            
            # 우선순위 큐에 추가
            if sensor_type not in self.priority_queues[config.priority]:
                self.priority_queues[config.priority].append(sensor_type)
            
            logger.info(f"Stream registered: {sensor_type} (priority: {config.priority.name})")
            return True
            
        except Exception as e:
            logger.error(f"Error registering stream {config.sensor_type}: {e}")
            return False
    
    def unregister_stream(self, sensor_type: str) -> bool:
        """스트림 등록 해제"""
        try:
            if sensor_type not in self.stream_configs:
                return False
            
            config = self.stream_configs[sensor_type]
            
            # 우선순위 큐에서 제거
            if sensor_type in self.priority_queues[config.priority]:
                self.priority_queues[config.priority].remove(sensor_type)
            
            # 설정 및 제어기 제거
            del self.stream_configs[sensor_type]
            del self.controllers[sensor_type]
            
            logger.info(f"Stream unregistered: {sensor_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error unregistering stream {sensor_type}: {e}")
            return False
    
    def update_stream_metrics(self, sensor_type: str, 
                            latency_ms: float = 0.0,
                            actual_rate: float = 0.0,
                            cpu_usage: float = 0.0):
        """스트림 메트릭 업데이트"""
        if sensor_type in self.controllers:
            self.controllers[sensor_type].update_metrics(latency_ms, actual_rate, cpu_usage)
    
    def get_optimal_interval(self, sensor_type: str) -> float:
        """최적 스트리밍 간격 가져오기"""
        if sensor_type not in self.controllers:
            # 기본 설정으로 등록
            default_config = StreamConfig(sensor_type=sensor_type)
            self.register_stream(default_config)
        
        return self.controllers[sensor_type].current_interval
    
    def adjust_stream_interval(self, sensor_type: str) -> Tuple[float, str]:
        """스트림 간격 조정"""
        if sensor_type not in self.controllers:
            return 1.0, "not_registered"
        
        interval, action = self.controllers[sensor_type].adjust_interval()
        
        if action not in ["no_change", "stable"]:
            self.global_metrics["total_adjustments"] += 1
            self._notify_adjustment_callbacks(sensor_type, interval, action)
        
        return interval, action
    
    async def start_optimization(self):
        """최적화 시작"""
        if self.is_optimizing:
            return
        
        self.is_optimizing = True
        self.optimization_task = asyncio.create_task(self._optimization_loop())
        logger.info("Stream optimization started")
    
    async def stop_optimization(self):
        """최적화 중지"""
        self.is_optimizing = False
        
        if self.optimization_task:
            self.optimization_task.cancel()
            try:
                await self.optimization_task
            except asyncio.CancelledError:
                pass
            self.optimization_task = None
        
        logger.info("Stream optimization stopped")
    
    async def _optimization_loop(self):
        """최적화 루프"""
        while self.is_optimizing:
            try:
                if self.optimization_enabled:
                    await self._perform_optimization()
                
                await asyncio.sleep(self.optimization_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in optimization loop: {e}")
                await asyncio.sleep(5.0)
    
    async def _perform_optimization(self):
        """최적화 수행"""
        try:
            optimization_start = time.time()
            adjustments_made = 0
            
            # 우선순위 순으로 처리
            for priority in [StreamPriority.CRITICAL, StreamPriority.HIGH, 
                           StreamPriority.NORMAL, StreamPriority.LOW]:
                
                for sensor_type in self.priority_queues[priority]:
                    if sensor_type in self.controllers:
                        _, action = self.adjust_stream_interval(sensor_type)
                        if action not in ["no_change", "stable"]:
                            adjustments_made += 1
            
            # 글로벌 리소스 기반 조정
            await self._apply_global_optimizations()
            
            # 최적화 이력 기록
            optimization_time = (time.time() - optimization_start) * 1000
            self.optimization_history.append({
                "timestamp": datetime.now().isoformat(),
                "adjustments_made": adjustments_made,
                "optimization_time_ms": optimization_time,
                "active_streams": len([c for c in self.controllers.values() if c.config.enabled])
            })
            
            # 글로벌 메트릭 업데이트
            self._update_global_metrics()
            
            # 콜백 호출
            await self._notify_optimization_callbacks(adjustments_made)
            
        except Exception as e:
            logger.error(f"Error performing optimization: {e}")
    
    async def _apply_global_optimizations(self):
        """글로벌 최적화 적용"""
        try:
            # TODO: 실제 시스템 리소스 모니터링 연동
            # 현재는 시뮬레이션된 값 사용
            
            # 고부하 상황에서 낮은 우선순위 스트림 조정
            for sensor_type in self.priority_queues[StreamPriority.LOW]:
                if sensor_type in self.controllers:
                    controller = self.controllers[sensor_type]
                    if controller.current_interval < controller.config.max_interval:
                        new_interval = min(controller.current_interval * 1.2, 
                                         controller.config.max_interval)
                        controller.current_interval = new_interval
                        logger.debug(f"Global optimization: increased interval for {sensor_type}")
            
        except Exception as e:
            logger.error(f"Error in global optimization: {e}")
    
    def _update_global_metrics(self):
        """글로벌 메트릭 업데이트"""
        try:
            self.global_metrics["total_streams"] = len(self.stream_configs)
            self.global_metrics["active_streams"] = len([c for c in self.controllers.values() 
                                                       if c.config.enabled])
            
            # 평균 효율성 계산
            efficiencies = []
            for controller in self.controllers.values():
                if controller.config.enabled:
                    metrics = controller.get_metrics()
                    efficiencies.append(metrics.efficiency_score)
            
            if efficiencies:
                self.global_metrics["avg_efficiency"] = sum(efficiencies) / len(efficiencies)
            
        except Exception as e:
            logger.error(f"Error updating global metrics: {e}")
    
    def force_optimize_all(self) -> Dict[str, Tuple[float, str]]:
        """모든 스트림 강제 최적화"""
        results = {}
        
        for sensor_type in self.controllers:
            interval, action = self.adjust_stream_interval(sensor_type)
            results[sensor_type] = (interval, action)
        
        logger.info(f"Force optimization completed for {len(results)} streams")
        return results
    
    def set_stream_mode(self, sensor_type: str, mode: StreamMode) -> bool:
        """스트림 모드 설정"""
        if sensor_type not in self.stream_configs:
            return False
        
        old_mode = self.stream_configs[sensor_type].mode
        self.stream_configs[sensor_type].mode = mode
        
        # 모드에 따른 간격 조정
        controller = self.controllers[sensor_type]
        config = self.stream_configs[sensor_type]
        
        if mode == StreamMode.POWER_SAVE:
            controller.current_interval = config.max_interval
        elif mode == StreamMode.CONTINUOUS:
            controller.current_interval = config.min_interval
        elif mode == StreamMode.ADAPTIVE:
            controller.current_interval = config.base_interval
        
        logger.info(f"Stream mode changed for {sensor_type}: {old_mode.value} -> {mode.value}")
        return True
    
    def enable_stream(self, sensor_type: str) -> bool:
        """스트림 활성화"""
        if sensor_type not in self.stream_configs:
            return False
        
        self.stream_configs[sensor_type].enabled = True
        logger.info(f"Stream enabled: {sensor_type}")
        return True
    
    def disable_stream(self, sensor_type: str) -> bool:
        """스트림 비활성화"""
        if sensor_type not in self.stream_configs:
            return False
        
        self.stream_configs[sensor_type].enabled = False
        logger.info(f"Stream disabled: {sensor_type}")
        return True
    
    def add_optimization_callback(self, callback: Callable):
        """최적화 콜백 추가"""
        self.optimization_callbacks.append(callback)
    
    def add_adjustment_callback(self, callback: Callable):
        """조정 콜백 추가"""
        self.adjustment_callbacks.append(callback)
    
    async def _notify_optimization_callbacks(self, adjustments_made: int):
        """최적화 콜백 알림"""
        for callback in self.optimization_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(adjustments_made)
                else:
                    callback(adjustments_made)
            except Exception as e:
                logger.error(f"Error in optimization callback: {e}")
    
    def _notify_adjustment_callbacks(self, sensor_type: str, interval: float, action: str):
        """조정 콜백 알림"""
        for callback in self.adjustment_callbacks:
            try:
                callback(sensor_type, interval, action)
            except Exception as e:
                logger.error(f"Error in adjustment callback: {e}")
    
    def get_optimization_status(self) -> Dict[str, Any]:
        """최적화 상태 반환"""
        stream_statuses = {}
        for sensor_type, controller in self.controllers.items():
            config = self.stream_configs[sensor_type]
            metrics = controller.get_metrics()
            
            stream_statuses[sensor_type] = {
                "config": asdict(config),
                "metrics": asdict(metrics),
                "is_enabled": config.enabled
            }
        
        return {
            "optimization_enabled": self.optimization_enabled,
            "is_optimizing": self.is_optimizing,
            "optimization_interval": self.optimization_interval,
            "global_metrics": self.global_metrics,
            "streams": stream_statuses,
            "optimization_history_count": len(self.optimization_history)
        }
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """성능 요약 반환"""
        total_efficiency = 0
        active_streams = 0
        total_adjustments = self.global_metrics["total_adjustments"]
        
        sensor_summaries = {}
        for sensor_type, controller in self.controllers.items():
            if self.stream_configs[sensor_type].enabled:
                metrics = controller.get_metrics()
                total_efficiency += metrics.efficiency_score
                active_streams += 1
                
                sensor_summaries[sensor_type] = {
                    "efficiency_score": metrics.efficiency_score,
                    "current_interval": metrics.current_interval,
                    "latency_ms": metrics.latency_ms,
                    "actual_rate": metrics.actual_rate
                }
        
        avg_efficiency = total_efficiency / active_streams if active_streams > 0 else 0
        
        return {
            "active_streams": active_streams,
            "average_efficiency": avg_efficiency,
            "total_adjustments": total_adjustments,
            "optimization_runs": len(self.optimization_history),
            "sensor_summaries": sensor_summaries
        }

# 전역 스트리밍 최적화기 인스턴스
global_streaming_optimizer = StreamingOptimizer() 