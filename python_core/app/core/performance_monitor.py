import asyncio
import time
import psutil
import threading
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import deque, defaultdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class SystemMetrics:
    """시스템 성능 메트릭"""
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    memory_used_mb: float = 0.0
    memory_available_mb: float = 0.0
    disk_usage_percent: float = 0.0
    network_bytes_sent: int = 0
    network_bytes_recv: int = 0
    process_memory_mb: float = 0.0
    process_cpu_percent: float = 0.0
    timestamp: datetime = None

@dataclass
class StreamingMetrics:
    """스트리밍 성능 메트릭"""
    sensor_type: str = ""
    data_rate_per_sec: float = 0.0
    avg_latency_ms: float = 0.0
    max_latency_ms: float = 0.0
    min_latency_ms: float = 0.0
    packet_loss_rate: float = 0.0
    throughput_mbps: float = 0.0
    buffer_utilization: float = 0.0
    error_rate: float = 0.0
    timestamp: datetime = None

@dataclass
class ProcessingMetrics:
    """데이터 처리 성능 메트릭"""
    total_processed: int = 0
    processing_rate_per_sec: float = 0.0
    avg_processing_time_ms: float = 0.0
    queue_depth: int = 0
    success_rate: float = 0.0
    error_count: int = 0
    timestamp: datetime = None

class MetricsCollector:
    """메트릭 수집기"""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        
        # 메트릭 히스토리
        self.system_history: deque = deque(maxlen=max_history)
        self.streaming_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_history))
        self.processing_history: deque = deque(maxlen=max_history)
        
        # 실시간 데이터
        self.current_system = SystemMetrics()
        self.current_streaming: Dict[str, StreamingMetrics] = {}
        self.current_processing = ProcessingMetrics()
        
        # 성능 추적
        self.latency_tracker: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.throughput_tracker: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        
        # 시스템 프로세스 정보
        self.process = psutil.Process()
        self.network_stats_baseline = None
        
        logger.info("MetricsCollector initialized")
    
    def collect_system_metrics(self) -> SystemMetrics:
        """시스템 메트릭 수집"""
        try:
            # CPU 및 메모리
            cpu_percent = psutil.cpu_percent(interval=None)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # 네트워크 (델타 계산)
            network = psutil.net_io_counters()
            if self.network_stats_baseline is None:
                self.network_stats_baseline = network
                network_sent = 0
                network_recv = 0
            else:
                network_sent = network.bytes_sent - self.network_stats_baseline.bytes_sent
                network_recv = network.bytes_recv - self.network_stats_baseline.bytes_recv
                self.network_stats_baseline = network
            
            # 프로세스별 정보
            process_memory = self.process.memory_info().rss / 1024 / 1024  # MB
            process_cpu = self.process.cpu_percent()
            
            metrics = SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_mb=memory.used / 1024 / 1024,
                memory_available_mb=memory.available / 1024 / 1024,
                disk_usage_percent=disk.percent,
                network_bytes_sent=network_sent,
                network_bytes_recv=network_recv,
                process_memory_mb=process_memory,
                process_cpu_percent=process_cpu,
                timestamp=datetime.now()
            )
            
            self.current_system = metrics
            self.system_history.append(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            return SystemMetrics(timestamp=datetime.now())
    
    def collect_streaming_metrics(self, sensor_type: str, 
                                data_count: int = 0,
                                latency_ms: float = 0.0,
                                bytes_transferred: int = 0,
                                errors: int = 0) -> StreamingMetrics:
        """스트리밍 메트릭 수집"""
        try:
            # 기존 메트릭 가져오기
            if sensor_type in self.current_streaming:
                prev_metrics = self.current_streaming[sensor_type]
            else:
                prev_metrics = StreamingMetrics(sensor_type=sensor_type)
            
            # 지연시간 추적
            if latency_ms > 0:
                self.latency_tracker[sensor_type].append(latency_ms)
            
            # 처리량 추적
            if bytes_transferred > 0:
                self.throughput_tracker[sensor_type].append(bytes_transferred)
            
            # 평균 계산
            latencies = list(self.latency_tracker[sensor_type])
            avg_latency = sum(latencies) / len(latencies) if latencies else 0
            max_latency = max(latencies) if latencies else 0
            min_latency = min(latencies) if latencies else 0
            
            # 처리량 계산 (Mbps)
            throughputs = list(self.throughput_tracker[sensor_type])
            total_bytes = sum(throughputs) if throughputs else 0
            throughput_mbps = (total_bytes * 8) / (1024 * 1024)  # Mbps
            
            # 데이터 레이트 계산 (초당 데이터 수)
            current_time = time.time()
            time_window = 1.0  # 1초 윈도우
            
            # 에러율 계산
            total_data = prev_metrics.total_processed if hasattr(prev_metrics, 'total_processed') else data_count
            error_rate = (errors / total_data) if total_data > 0 else 0
            
            metrics = StreamingMetrics(
                sensor_type=sensor_type,
                data_rate_per_sec=data_count,  # 단순화
                avg_latency_ms=avg_latency,
                max_latency_ms=max_latency,
                min_latency_ms=min_latency,
                packet_loss_rate=0.0,  # TODO: 실제 패킷 손실 계산
                throughput_mbps=throughput_mbps,
                buffer_utilization=0.0,  # 버퍼 매니저에서 가져와야 함
                error_rate=error_rate,
                timestamp=datetime.now()
            )
            
            self.current_streaming[sensor_type] = metrics
            self.streaming_history[sensor_type].append(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting streaming metrics for {sensor_type}: {e}")
            return StreamingMetrics(sensor_type=sensor_type, timestamp=datetime.now())
    
    def collect_processing_metrics(self, 
                                 processed_count: int = 0,
                                 processing_time_ms: float = 0.0,
                                 queue_size: int = 0,
                                 errors: int = 0) -> ProcessingMetrics:
        """데이터 처리 메트릭 수집"""
        try:
            # 이전 메트릭과 비교하여 증분 계산
            prev_total = self.current_processing.total_processed
            new_total = prev_total + processed_count
            
            # 처리 속도 계산
            time_diff = 1.0  # 단순화된 시간 차이
            processing_rate = processed_count / time_diff if time_diff > 0 else 0
            
            # 성공률 계산
            success_count = processed_count - errors
            success_rate = (success_count / processed_count) if processed_count > 0 else 1.0
            
            metrics = ProcessingMetrics(
                total_processed=new_total,
                processing_rate_per_sec=processing_rate,
                avg_processing_time_ms=processing_time_ms,
                queue_depth=queue_size,
                success_rate=success_rate,
                error_count=self.current_processing.error_count + errors,
                timestamp=datetime.now()
            )
            
            self.current_processing = metrics
            self.processing_history.append(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting processing metrics: {e}")
            return ProcessingMetrics(timestamp=datetime.now())
    
    def get_system_summary(self, duration_minutes: int = 5) -> Dict[str, Any]:
        """시스템 성능 요약"""
        cutoff_time = datetime.now() - timedelta(minutes=duration_minutes)
        recent_metrics = [m for m in self.system_history if m.timestamp > cutoff_time]
        
        if not recent_metrics:
            return {"error": "No recent metrics available"}
        
        return {
            "avg_cpu_percent": sum(m.cpu_percent for m in recent_metrics) / len(recent_metrics),
            "max_cpu_percent": max(m.cpu_percent for m in recent_metrics),
            "avg_memory_percent": sum(m.memory_percent for m in recent_metrics) / len(recent_metrics),
            "max_memory_percent": max(m.memory_percent for m in recent_metrics),
            "avg_process_memory_mb": sum(m.process_memory_mb for m in recent_metrics) / len(recent_metrics),
            "max_process_memory_mb": max(m.process_memory_mb for m in recent_metrics),
            "total_network_sent_mb": sum(m.network_bytes_sent for m in recent_metrics) / 1024 / 1024,
            "total_network_recv_mb": sum(m.network_bytes_recv for m in recent_metrics) / 1024 / 1024,
            "sample_count": len(recent_metrics),
            "duration_minutes": duration_minutes
        }
    
    def get_streaming_summary(self, sensor_type: Optional[str] = None) -> Dict[str, Any]:
        """스트리밍 성능 요약"""
        if sensor_type:
            if sensor_type not in self.current_streaming:
                return {"error": f"No metrics for sensor {sensor_type}"}
            
            metrics = self.current_streaming[sensor_type]
            return asdict(metrics)
        else:
            return {sensor: asdict(metrics) for sensor, metrics in self.current_streaming.items()}
    
    def get_processing_summary(self) -> Dict[str, Any]:
        """처리 성능 요약"""
        return asdict(self.current_processing)

class PerformanceMonitor:
    """통합 성능 모니터"""
    
    def __init__(self, collection_interval: float = 1.0):
        self.collection_interval = collection_interval
        self.is_monitoring = False
        self.monitoring_task: Optional[asyncio.Task] = None
        
        # 메트릭 수집기
        self.collector = MetricsCollector()
        
        # 알람 설정
        self.alert_thresholds = {
            "cpu_percent": 80.0,
            "memory_percent": 85.0,
            "latency_ms": 100.0,
            "error_rate": 0.05,  # 5%
            "buffer_utilization": 0.9  # 90%
        }
        
        # 콜백
        self.alert_callbacks: List[Callable] = []
        self.metrics_callbacks: List[Callable] = []
        
        # 성능 이력
        self.performance_snapshots: deque = deque(maxlen=100)
        
        logger.info("PerformanceMonitor initialized")
    
    async def start_monitoring(self):
        """모니터링 시작"""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Performance monitoring started")
    
    async def stop_monitoring(self):
        """모니터링 중지"""
        self.is_monitoring = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
            self.monitoring_task = None
        
        logger.info("Performance monitoring stopped")
    
    async def _monitoring_loop(self):
        """모니터링 루프"""
        while self.is_monitoring:
            try:
                # 메트릭 수집
                system_metrics = self.collector.collect_system_metrics()
                
                # 알람 확인
                await self._check_alerts(system_metrics)
                
                # 성능 스냅샷 생성
                snapshot = self._create_performance_snapshot()
                self.performance_snapshots.append(snapshot)
                
                # 콜백 호출
                await self._notify_metrics_callbacks(snapshot)
                
                await asyncio.sleep(self.collection_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(5.0)
    
    def record_streaming_event(self, sensor_type: str, 
                              data_count: int = 0,
                              latency_ms: float = 0.0,
                              bytes_transferred: int = 0,
                              errors: int = 0):
        """스트리밍 이벤트 기록"""
        self.collector.collect_streaming_metrics(
            sensor_type=sensor_type,
            data_count=data_count,
            latency_ms=latency_ms,
            bytes_transferred=bytes_transferred,
            errors=errors
        )
    
    def record_processing_event(self, 
                               processed_count: int = 0,
                               processing_time_ms: float = 0.0,
                               queue_size: int = 0,
                               errors: int = 0):
        """처리 이벤트 기록"""
        self.collector.collect_processing_metrics(
            processed_count=processed_count,
            processing_time_ms=processing_time_ms,
            queue_size=queue_size,
            errors=errors
        )
    
    async def _check_alerts(self, system_metrics: SystemMetrics):
        """알람 확인"""
        alerts = []
        
        # CPU 알람
        if system_metrics.cpu_percent > self.alert_thresholds["cpu_percent"]:
            alerts.append({
                "type": "cpu_high",
                "value": system_metrics.cpu_percent,
                "threshold": self.alert_thresholds["cpu_percent"],
                "message": f"High CPU usage: {system_metrics.cpu_percent:.1f}%"
            })
        
        # 메모리 알람
        if system_metrics.memory_percent > self.alert_thresholds["memory_percent"]:
            alerts.append({
                "type": "memory_high",
                "value": system_metrics.memory_percent,
                "threshold": self.alert_thresholds["memory_percent"],
                "message": f"High memory usage: {system_metrics.memory_percent:.1f}%"
            })
        
        # 스트리밍 알람
        for sensor_type, streaming_metrics in self.collector.current_streaming.items():
            if streaming_metrics.avg_latency_ms > self.alert_thresholds["latency_ms"]:
                alerts.append({
                    "type": "latency_high",
                    "sensor": sensor_type,
                    "value": streaming_metrics.avg_latency_ms,
                    "threshold": self.alert_thresholds["latency_ms"],
                    "message": f"High latency for {sensor_type}: {streaming_metrics.avg_latency_ms:.1f}ms"
                })
            
            if streaming_metrics.error_rate > self.alert_thresholds["error_rate"]:
                alerts.append({
                    "type": "error_rate_high",
                    "sensor": sensor_type,
                    "value": streaming_metrics.error_rate,
                    "threshold": self.alert_thresholds["error_rate"],
                    "message": f"High error rate for {sensor_type}: {streaming_metrics.error_rate:.1%}"
                })
        
        # 알람 발생 시 콜백 호출
        if alerts:
            await self._notify_alert_callbacks(alerts)
    
    def _create_performance_snapshot(self) -> Dict[str, Any]:
        """성능 스냅샷 생성"""
        return {
            "timestamp": datetime.now().isoformat(),
            "system": asdict(self.collector.current_system),
            "streaming": {k: asdict(v) for k, v in self.collector.current_streaming.items()},
            "processing": asdict(self.collector.current_processing)
        }
    
    async def _notify_alert_callbacks(self, alerts: List[Dict[str, Any]]):
        """알람 콜백 알림"""
        for callback in self.alert_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(alerts)
                else:
                    callback(alerts)
            except Exception as e:
                logger.error(f"Error in alert callback: {e}")
    
    async def _notify_metrics_callbacks(self, snapshot: Dict[str, Any]):
        """메트릭 콜백 알림"""
        for callback in self.metrics_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(snapshot)
                else:
                    callback(snapshot)
            except Exception as e:
                logger.error(f"Error in metrics callback: {e}")
    
    def add_alert_callback(self, callback: Callable):
        """알람 콜백 추가"""
        self.alert_callbacks.append(callback)
    
    def add_metrics_callback(self, callback: Callable):
        """메트릭 콜백 추가"""
        self.metrics_callbacks.append(callback)
    
    def update_alert_threshold(self, metric: str, threshold: float):
        """알람 임계값 업데이트"""
        if metric in self.alert_thresholds:
            old_value = self.alert_thresholds[metric]
            self.alert_thresholds[metric] = threshold
            logger.info(f"Alert threshold updated for {metric}: {old_value} -> {threshold}")
        else:
            logger.warning(f"Unknown alert metric: {metric}")
    
    def get_current_status(self) -> Dict[str, Any]:
        """현재 성능 상태 반환"""
        return {
            "is_monitoring": self.is_monitoring,
            "collection_interval": self.collection_interval,
            "alert_thresholds": self.alert_thresholds,
            "system_summary": self.collector.get_system_summary(),
            "streaming_summary": self.collector.get_streaming_summary(),
            "processing_summary": self.collector.get_processing_summary(),
            "snapshot_count": len(self.performance_snapshots)
        }
    
    def get_performance_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """성능 이력 반환"""
        return list(self.performance_snapshots)[-limit:]
    
    def get_health_score(self) -> Dict[str, Any]:
        """시스템 건강 점수 계산"""
        try:
            system = self.collector.current_system
            processing = self.collector.current_processing
            
            # 점수 계산 (0-100)
            cpu_score = max(0, 100 - system.cpu_percent)
            memory_score = max(0, 100 - system.memory_percent)
            error_score = processing.success_rate * 100
            
            # 스트리밍 점수
            streaming_scores = []
            for metrics in self.collector.current_streaming.values():
                latency_score = max(0, 100 - (metrics.avg_latency_ms / 2))  # 200ms = 0점
                error_score_stream = (1 - metrics.error_rate) * 100
                streaming_scores.append((latency_score + error_score_stream) / 2)
            
            avg_streaming_score = sum(streaming_scores) / len(streaming_scores) if streaming_scores else 100
            
            # 전체 건강 점수
            overall_score = (cpu_score + memory_score + error_score + avg_streaming_score) / 4
            
            # 건강 상태 등급
            if overall_score >= 90:
                health_grade = "excellent"
            elif overall_score >= 75:
                health_grade = "good"
            elif overall_score >= 60:
                health_grade = "fair"
            elif overall_score >= 40:
                health_grade = "poor"
            else:
                health_grade = "critical"
            
            return {
                "overall_score": overall_score,
                "health_grade": health_grade,
                "component_scores": {
                    "cpu": cpu_score,
                    "memory": memory_score,
                    "processing": error_score,
                    "streaming": avg_streaming_score
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating health score: {e}")
            return {
                "overall_score": 0,
                "health_grade": "unknown",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

# 전역 성능 모니터 인스턴스
global_performance_monitor = PerformanceMonitor() 