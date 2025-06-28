import asyncio
import time
import json
import gzip
import threading
from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class BatchMetrics:
    """배치 처리 성능 메트릭"""
    total_batches_processed: int = 0
    total_items_processed: int = 0
    total_bytes_processed: int = 0
    total_bytes_compressed: int = 0
    avg_batch_size: float = 0.0
    avg_processing_time_ms: float = 0.0
    avg_compression_ratio: float = 0.0
    last_batch_time: Optional[datetime] = None
    errors_count: int = 0

class DataBatch:
    """데이터 배치 클래스"""
    
    def __init__(self, 
                 batch_id: str,
                 sensor_type: str,
                 max_size: int = 100,
                 max_age_seconds: float = 1.0):
        self.batch_id = batch_id
        self.sensor_type = sensor_type
        self.max_size = max_size
        self.max_age_seconds = max_age_seconds
        
        # 데이터 저장
        self.items: List[Any] = []
        self.timestamps: List[float] = []
        
        # 메타데이터
        self.created_at = time.time()
        self.last_updated = self.created_at
        self.is_sealed = False
        
        # 압축 옵션
        self.enable_compression = True
        self.compression_threshold = 1024  # 1KB 이상일 때 압축
    
    def add_item(self, item: Any) -> bool:
        """배치에 아이템 추가"""
        if self.is_sealed:
            return False
        
        if len(self.items) >= self.max_size:
            return False
        
        self.items.append(item)
        self.timestamps.append(time.time())
        self.last_updated = time.time()
        
        return True
    
    def is_ready(self) -> bool:
        """배치가 처리 준비되었는지 확인"""
        if self.is_sealed:
            return True
        
        # 크기 조건
        if len(self.items) >= self.max_size:
            return True
        
        # 시간 조건
        age = time.time() - self.created_at
        if age >= self.max_age_seconds and len(self.items) > 0:
            return True
        
        return False
    
    def seal(self) -> bool:
        """배치 봉인 (더 이상 아이템 추가 불가)"""
        if not self.is_sealed:
            self.is_sealed = True
            return True
        return False
    
    def to_dict(self) -> Dict[str, Any]:
        """배치를 딕셔너리로 변환"""
        return {
            "batch_id": self.batch_id,
            "sensor_type": self.sensor_type,
            "items": self.items,
            "timestamps": self.timestamps,
            "created_at": self.created_at,
            "last_updated": self.last_updated,
            "item_count": len(self.items)
        }
    
    def to_json(self, compress: bool = None) -> Union[str, bytes]:
        """배치를 JSON으로 직렬화 (선택적 압축)"""
        data = self.to_dict()
        json_str = json.dumps(data, separators=(',', ':'))
        
        # 압축 여부 결정
        if compress is None:
            compress = self.enable_compression and len(json_str) > self.compression_threshold
        
        if compress:
            return gzip.compress(json_str.encode('utf-8'))
        else:
            return json_str
    
    def get_size_bytes(self) -> int:
        """배치 크기 (바이트) 반환"""
        try:
            json_str = json.dumps(self.to_dict())
            return len(json_str.encode('utf-8'))
        except:
            return 0

class BatchProcessor:
    """배치 처리 시스템"""
    
    def __init__(self):
        # 배치 관리
        self.active_batches: Dict[str, DataBatch] = {}
        self.completed_batches: List[DataBatch] = []
        self.max_completed_batches = 100  # 완료된 배치 최대 보관 수
        
        # 배치 설정
        self.batch_configs = {
            "eeg": {"max_size": 50, "max_age_seconds": 0.5},    # EEG: 빠른 처리
            "ppg": {"max_size": 30, "max_age_seconds": 1.0},    # PPG: 중간 처리
            "acc": {"max_size": 30, "max_age_seconds": 1.0},    # ACC: 중간 처리
            "battery": {"max_size": 10, "max_age_seconds": 5.0}, # Battery: 느린 처리
            "default": {"max_size": 20, "max_age_seconds": 1.0}  # 기본값
        }
        
        # 처리 설정
        self.processing_enabled = True
        self.processing_interval = 0.1  # 100ms마다 처리 확인
        self.processing_task: Optional[asyncio.Task] = None
        
        # 성능 메트릭
        self.metrics: Dict[str, BatchMetrics] = defaultdict(BatchMetrics)
        self.global_metrics = BatchMetrics()
        
        # 콜백
        self.batch_ready_callbacks: List[Callable] = []
        self.batch_processed_callbacks: List[Callable] = []
        self.error_callbacks: List[Callable] = []
        
        # 동기화
        self._lock = threading.RLock()
        
        logger.info("BatchProcessor initialized")
    
    def add_data(self, sensor_type: str, data: Any) -> bool:
        """데이터를 배치에 추가"""
        try:
            with self._lock:
                # 활성 배치 찾기 또는 생성
                batch = self._get_or_create_batch(sensor_type)
                
                # 배치에 데이터 추가
                success = batch.add_item(data)
                
                if not success:
                    # 배치가 가득 찬 경우 새 배치 생성
                    batch.seal()
                    self._move_to_completed(batch)
                    
                    # 새 배치 생성 후 다시 시도
                    batch = self._get_or_create_batch(sensor_type)
                    success = batch.add_item(data)
                
                return success
                
        except Exception as e:
            logger.error(f"Error adding data to batch for {sensor_type}: {e}")
            self._notify_error("add_data", sensor_type, e)
            return False
    
    def _get_or_create_batch(self, sensor_type: str) -> DataBatch:
        """활성 배치 가져오기 또는 생성"""
        # 기존 활성 배치 확인
        if sensor_type in self.active_batches:
            batch = self.active_batches[sensor_type]
            if not batch.is_sealed and not batch.is_ready():
                return batch
            else:
                # 준비된 배치는 완료로 이동
                batch.seal()
                self._move_to_completed(batch)
        
        # 새 배치 생성
        config = self.batch_configs.get(sensor_type, self.batch_configs["default"])
        batch_id = f"{sensor_type}_{int(time.time() * 1000000)}"  # 마이크로초 기반 ID
        
        batch = DataBatch(
            batch_id=batch_id,
            sensor_type=sensor_type,
            max_size=config["max_size"],
            max_age_seconds=config["max_age_seconds"]
        )
        
        self.active_batches[sensor_type] = batch
        return batch
    
    def _move_to_completed(self, batch: DataBatch):
        """배치를 완료 목록으로 이동"""
        # 활성 배치에서 제거
        if batch.sensor_type in self.active_batches:
            if self.active_batches[batch.sensor_type] == batch:
                del self.active_batches[batch.sensor_type]
        
        # 완료 목록에 추가
        self.completed_batches.append(batch)
        
        # 완료 목록 크기 제한
        if len(self.completed_batches) > self.max_completed_batches:
            self.completed_batches.pop(0)
        
        # 배치 준비 콜백 호출
        self._notify_batch_ready(batch)
    
    async def start_processing(self):
        """배치 처리 시작"""
        if self.processing_task:
            return
        
        self.processing_enabled = True
        self.processing_task = asyncio.create_task(self._processing_loop())
        logger.info("Batch processing started")
    
    async def stop_processing(self):
        """배치 처리 중지"""
        self.processing_enabled = False
        
        if self.processing_task:
            self.processing_task.cancel()
            try:
                await self.processing_task
            except asyncio.CancelledError:
                pass
            self.processing_task = None
        
        logger.info("Batch processing stopped")
    
    async def _processing_loop(self):
        """배치 처리 루프"""
        while self.processing_enabled:
            try:
                await self._check_and_process_batches()
                await asyncio.sleep(self.processing_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in batch processing loop: {e}")
                await asyncio.sleep(1.0)
    
    async def _check_and_process_batches(self):
        """배치 상태 확인 및 처리"""
        ready_batches = []
        
        with self._lock:
            # 준비된 배치 찾기
            for sensor_type, batch in list(self.active_batches.items()):
                if batch.is_ready():
                    batch.seal()
                    ready_batches.append(batch)
                    self._move_to_completed(batch)
        
        # 준비된 배치들 처리
        for batch in ready_batches:
            await self._process_batch(batch)
    
    async def _process_batch(self, batch: DataBatch):
        """개별 배치 처리"""
        start_time = time.perf_counter()
        
        try:
            # 배치 데이터 직렬화
            json_data = batch.to_json(compress=True)
            
            # 메트릭 업데이트
            processing_time = (time.perf_counter() - start_time) * 1000
            self._update_metrics(batch, json_data, processing_time)
            
            # 배치 처리 완료 콜백 호출
            await self._notify_batch_processed(batch, json_data)
            
            logger.debug(f"Batch processed: {batch.batch_id} ({len(batch.items)} items)")
            
        except Exception as e:
            logger.error(f"Error processing batch {batch.batch_id}: {e}")
            self._notify_error("process_batch", batch.sensor_type, e)
    
    def _update_metrics(self, batch: DataBatch, serialized_data: Union[str, bytes], processing_time: float):
        """메트릭 업데이트"""
        sensor_metrics = self.metrics[batch.sensor_type]
        
        # 배치별 메트릭
        sensor_metrics.total_batches_processed += 1
        sensor_metrics.total_items_processed += len(batch.items)
        sensor_metrics.last_batch_time = datetime.now()
        
        # 크기 메트릭
        original_size = batch.get_size_bytes()
        compressed_size = len(serialized_data) if isinstance(serialized_data, bytes) else len(serialized_data.encode('utf-8'))
        
        sensor_metrics.total_bytes_processed += original_size
        sensor_metrics.total_bytes_compressed += compressed_size
        
        # 평균 계산
        sensor_metrics.avg_batch_size = sensor_metrics.total_items_processed / sensor_metrics.total_batches_processed
        
        # 처리 시간 평균 (이동 평균)
        if sensor_metrics.avg_processing_time_ms == 0:
            sensor_metrics.avg_processing_time_ms = processing_time
        else:
            sensor_metrics.avg_processing_time_ms = (sensor_metrics.avg_processing_time_ms * 0.9) + (processing_time * 0.1)
        
        # 압축률 계산
        if sensor_metrics.total_bytes_processed > 0:
            sensor_metrics.avg_compression_ratio = sensor_metrics.total_bytes_compressed / sensor_metrics.total_bytes_processed
        
        # 전역 메트릭 업데이트
        self._update_global_metrics(sensor_metrics)
    
    def _update_global_metrics(self, sensor_metrics: BatchMetrics):
        """전역 메트릭 업데이트"""
        # 모든 센서의 메트릭 합계
        total_batches = sum(m.total_batches_processed for m in self.metrics.values())
        total_items = sum(m.total_items_processed for m in self.metrics.values())
        total_bytes = sum(m.total_bytes_processed for m in self.metrics.values())
        total_compressed = sum(m.total_bytes_compressed for m in self.metrics.values())
        total_errors = sum(m.errors_count for m in self.metrics.values())
        
        self.global_metrics.total_batches_processed = total_batches
        self.global_metrics.total_items_processed = total_items
        self.global_metrics.total_bytes_processed = total_bytes
        self.global_metrics.total_bytes_compressed = total_compressed
        self.global_metrics.errors_count = total_errors
        
        if total_batches > 0:
            self.global_metrics.avg_batch_size = total_items / total_batches
        
        if total_bytes > 0:
            self.global_metrics.avg_compression_ratio = total_compressed / total_bytes
    
    def force_process_all(self) -> Dict[str, int]:
        """모든 활성 배치 강제 처리"""
        processed_counts = {}
        
        with self._lock:
            for sensor_type, batch in list(self.active_batches.items()):
                if len(batch.items) > 0:
                    batch.seal()
                    processed_counts[sensor_type] = len(batch.items)
                    self._move_to_completed(batch)
                else:
                    processed_counts[sensor_type] = 0
        
        logger.info(f"Force processed batches: {processed_counts}")
        return processed_counts
    
    def get_ready_batches(self, sensor_type: Optional[str] = None) -> List[DataBatch]:
        """준비된 배치 목록 반환"""
        if sensor_type:
            return [b for b in self.completed_batches if b.sensor_type == sensor_type]
        else:
            return list(self.completed_batches)
    
    def clear_completed_batches(self, sensor_type: Optional[str] = None) -> int:
        """완료된 배치 정리"""
        if sensor_type:
            original_count = len(self.completed_batches)
            self.completed_batches = [b for b in self.completed_batches if b.sensor_type != sensor_type]
            cleared = original_count - len(self.completed_batches)
        else:
            cleared = len(self.completed_batches)
            self.completed_batches.clear()
        
        logger.info(f"Cleared {cleared} completed batches")
        return cleared
    
    def update_batch_config(self, sensor_type: str, max_size: int, max_age_seconds: float):
        """배치 설정 업데이트"""
        self.batch_configs[sensor_type] = {
            "max_size": max_size,
            "max_age_seconds": max_age_seconds
        }
        logger.info(f"Updated batch config for {sensor_type}: size={max_size}, age={max_age_seconds}s")
    
    def add_batch_ready_callback(self, callback: Callable):
        """배치 준비 콜백 추가"""
        self.batch_ready_callbacks.append(callback)
    
    def add_batch_processed_callback(self, callback: Callable):
        """배치 처리 완료 콜백 추가"""
        self.batch_processed_callbacks.append(callback)
    
    def add_error_callback(self, callback: Callable):
        """에러 콜백 추가"""
        self.error_callbacks.append(callback)
    
    def _notify_batch_ready(self, batch: DataBatch):
        """배치 준비 알림"""
        for callback in self.batch_ready_callbacks:
            try:
                callback(batch)
            except Exception as e:
                logger.error(f"Error in batch ready callback: {e}")
    
    async def _notify_batch_processed(self, batch: DataBatch, data: Union[str, bytes]):
        """배치 처리 완료 알림"""
        for callback in self.batch_processed_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(batch, data)
                else:
                    callback(batch, data)
            except Exception as e:
                logger.error(f"Error in batch processed callback: {e}")
    
    def _notify_error(self, operation: str, sensor_type: str, error: Exception):
        """에러 알림"""
        self.metrics[sensor_type].errors_count += 1
        
        for callback in self.error_callbacks:
            try:
                callback(operation, sensor_type, error)
            except Exception as e:
                logger.error(f"Error in error callback: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """배치 처리 상태 반환"""
        with self._lock:
            active_batches_info = {}
            for sensor_type, batch in self.active_batches.items():
                active_batches_info[sensor_type] = {
                    "batch_id": batch.batch_id,
                    "item_count": len(batch.items),
                    "max_size": batch.max_size,
                    "age_seconds": time.time() - batch.created_at,
                    "max_age_seconds": batch.max_age_seconds,
                    "is_ready": batch.is_ready()
                }
            
            return {
                "processing_enabled": self.processing_enabled,
                "active_batches": active_batches_info,
                "completed_batches_count": len(self.completed_batches),
                "global_metrics": asdict(self.global_metrics),
                "sensor_metrics": {k: asdict(v) for k, v in self.metrics.items()}
            }
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """성능 요약 반환"""
        total_throughput = 0
        if self.global_metrics.avg_processing_time_ms > 0:
            total_throughput = 1000 / self.global_metrics.avg_processing_time_ms  # batches per second
        
        return {
            "total_batches": self.global_metrics.total_batches_processed,
            "total_items": self.global_metrics.total_items_processed,
            "avg_batch_size": self.global_metrics.avg_batch_size,
            "avg_processing_time_ms": self.global_metrics.avg_processing_time_ms,
            "throughput_batches_per_sec": total_throughput,
            "compression_ratio": self.global_metrics.avg_compression_ratio,
            "data_reduction_percent": (1 - self.global_metrics.avg_compression_ratio) * 100,
            "total_errors": self.global_metrics.errors_count,
            "error_rate": (self.global_metrics.errors_count / self.global_metrics.total_batches_processed) 
                         if self.global_metrics.total_batches_processed > 0 else 0
        }

# 전역 배치 프로세서 인스턴스
global_batch_processor = BatchProcessor() 