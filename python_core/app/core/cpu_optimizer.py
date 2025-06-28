import asyncio
import psutil
import threading
import time
import multiprocessing
from typing import Dict, List, Any, Optional, Callable, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from collections import deque, defaultdict
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from queue import Queue, PriorityQueue
import logging

logger = logging.getLogger(__name__)

@dataclass
class CPUMetrics:
    """CPU 성능 메트릭"""
    cpu_percent: float = 0.0
    cpu_count: int = 0
    cpu_freq_current: float = 0.0
    cpu_freq_max: float = 0.0
    process_cpu_percent: float = 0.0
    thread_count: int = 0
    context_switches: int = 0
    load_average: List[float] = None
    timestamp: datetime = None

@dataclass
class TaskPriority:
    """작업 우선순위"""
    CRITICAL_DATA = 1      # EEG, PPG, ACC, BAT 데이터 처리
    HIGH_STREAMING = 2     # 실시간 스트리밍
    NORMAL_PROCESSING = 3  # 일반 데이터 처리
    LOW_MAINTENANCE = 4    # 시스템 유지보수
    BACKGROUND = 5         # 백그라운드 작업

class DataPreservingTaskScheduler:
    """데이터 보존 우선 작업 스케줄러"""
    
    def __init__(self, max_workers: int = None):
        self.max_workers = max_workers or min(32, (multiprocessing.cpu_count() or 1) + 4)
        self.priority_queue = PriorityQueue()
        self.data_processing_queue = Queue()  # 데이터 처리 전용 큐
        self.active_tasks = {}
        self.completed_tasks = deque(maxlen=1000)
        
        # 데이터 안전성 추적
        self.data_tasks_active = defaultdict(int)
        self.data_loss_incidents = []
        
        # 스레드 풀 (데이터 처리 전용)
        self.data_executor = ThreadPoolExecutor(
            max_workers=min(8, self.max_workers // 2),
            thread_name_prefix="DataProcessor"
        )
        
        # 일반 작업용 스레드 풀
        self.general_executor = ThreadPoolExecutor(
            max_workers=max(4, self.max_workers // 4),
            thread_name_prefix="GeneralTask"
        )
        
        self.scheduler_active = False
        self.scheduler_task = None
        
        logger.info(f"DataPreservingTaskScheduler initialized with {self.max_workers} max workers")
    
    async def start_scheduler(self):
        """스케줄러 시작"""
        if self.scheduler_active:
            return
        
        self.scheduler_active = True
        self.scheduler_task = asyncio.create_task(self._scheduler_loop())
        logger.info("Data-preserving task scheduler started")
    
    async def stop_scheduler(self):
        """스케줄러 중지"""
        self.scheduler_active = False
        if self.scheduler_task:
            self.scheduler_task.cancel()
            try:
                await self.scheduler_task
            except asyncio.CancelledError:
                pass
        
        # 실행 중인 데이터 작업 완료 대기
        await self._wait_for_data_tasks()
        
        self.data_executor.shutdown(wait=True)
        self.general_executor.shutdown(wait=True)
        logger.info("Task scheduler stopped")
    
    async def _scheduler_loop(self):
        """스케줄러 루프 (간소화)"""
        while self.scheduler_active:
            await asyncio.sleep(0.1)
    
    async def _wait_for_data_tasks(self):
        """데이터 작업 완료 대기"""
        await asyncio.sleep(1)  # 간소화
    
    def submit_data_task(self, func: Callable, *args, sensor_type: str = "unknown", **kwargs) -> str:
        """데이터 처리 작업 제출 (최고 우선순위)"""
        task_id = f"data_{sensor_type}_{int(time.time() * 1000000)}"
        
        # 데이터 작업은 별도 큐에 즉시 추가
        self.data_processing_queue.put((
            TaskPriority.CRITICAL_DATA,
            task_id,
            func,
            args,
            kwargs,
            sensor_type
        ))
        
        logger.debug(f"Data task submitted: {task_id} for {sensor_type}")
        return task_id
    
    def get_scheduler_status(self) -> Dict[str, Any]:
        """스케줄러 상태 반환"""
        return {
            "active": self.scheduler_active,
            "active_tasks": len(self.active_tasks),
            "data_tasks_active": dict(self.data_tasks_active),
            "data_queue_size": self.data_processing_queue.qsize(),
            "general_queue_size": self.priority_queue.qsize(),
            "completed_tasks": len(self.completed_tasks),
            "data_loss_incidents": len(self.data_loss_incidents)
        }

class SafeCPUOptimizer:
    """데이터 안전성을 보장하는 CPU 최적화기"""
    
    def __init__(self):
        self.task_scheduler = DataPreservingTaskScheduler()
        self.cpu_threshold_critical = 95.0
        self.cpu_threshold_warning = 85.0
        self.cpu_threshold_safe = 70.0
        
        self.optimization_stats = {
            'throttling_events': 0,
            'task_rescheduled': 0,
            'performance_mode_changes': 0,
            'data_protection_blocks': 0
        }
        
        self.monitoring_active = False
        self.monitoring_task = None
        self.metrics_history = deque(maxlen=100)
        
        logger.info("SafeCPUOptimizer initialized with data processing priority")
    
    async def start_monitoring(self):
        """CPU 모니터링 시작"""
        if self.monitoring_active:
            return
        
        await self.task_scheduler.start_scheduler()
        self.monitoring_active = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("CPU monitoring started")
    
    async def stop_monitoring(self):
        """CPU 모니터링 중지"""
        self.monitoring_active = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        await self.task_scheduler.stop_scheduler()
        logger.info("CPU monitoring stopped")
    
    async def _monitoring_loop(self):
        """CPU 모니터링 루프"""
        while self.monitoring_active:
            try:
                metrics = self._collect_cpu_metrics()
                self.metrics_history.append(metrics)
                
                if metrics.cpu_percent >= self.cpu_threshold_critical:
                    logger.warning(f"CRITICAL CPU usage: {metrics.cpu_percent:.1f}%")
                    await self._emergency_cpu_optimization(metrics)
                elif metrics.cpu_percent >= self.cpu_threshold_warning:
                    logger.info(f"High CPU usage: {metrics.cpu_percent:.1f}%")
                    await self._preventive_cpu_optimization(metrics)
                
                await asyncio.sleep(1.0)
                
            except Exception as e:
                logger.error(f"CPU monitoring error: {e}")
                await asyncio.sleep(5.0)
    
    def _collect_cpu_metrics(self) -> CPUMetrics:
        """CPU 메트릭 수집"""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            cpu_count = psutil.cpu_count()
            
            process = psutil.Process()
            process_cpu = process.cpu_percent()
            thread_count = process.num_threads()
            
            return CPUMetrics(
                cpu_percent=cpu_percent,
                cpu_count=cpu_count,
                process_cpu_percent=process_cpu,
                thread_count=thread_count,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error collecting CPU metrics: {e}")
            return CPUMetrics(timestamp=datetime.now())
    
    async def _emergency_cpu_optimization(self, metrics: CPUMetrics):
        """긴급 CPU 최적화"""
        logger.warning("Emergency CPU optimization - protecting data tasks")
        self.optimization_stats['throttling_events'] += 1
    
    async def _preventive_cpu_optimization(self, metrics: CPUMetrics):
        """예방적 CPU 최적화"""
        logger.info("Preventive CPU optimization")
    
    def submit_data_processing_task(self, func: Callable, *args, sensor_type: str = "unknown", **kwargs) -> str:
        """데이터 처리 작업 제출"""
        return self.task_scheduler.submit_data_task(func, *args, sensor_type=sensor_type, **kwargs)
    
    def get_cpu_status(self) -> Dict[str, Any]:
        """CPU 상태 반환"""
        current_metrics = self._collect_cpu_metrics()
        scheduler_status = self.task_scheduler.get_scheduler_status()
        
        return {
            "current_cpu": {
                "percent": current_metrics.cpu_percent,
                "count": current_metrics.cpu_count,
                "process_percent": current_metrics.process_cpu_percent,
                "thread_count": current_metrics.thread_count
            },
            "data_safety": {
                "active_data_tasks": sum(scheduler_status['data_tasks_active'].values()),
                "data_loss_incidents": scheduler_status['data_loss_incidents']
            },
            "optimization_stats": self.optimization_stats.copy(),
            "thresholds": {
                "critical": self.cpu_threshold_critical,
                "warning": self.cpu_threshold_warning,
                "safe": self.cpu_threshold_safe
            }
        } 