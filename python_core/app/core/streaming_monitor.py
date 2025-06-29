import time
import threading
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict, deque
import logging

logger = logging.getLogger(__name__)

@dataclass
class SensorFlowData:
    """센서별 데이터 흐름 정보"""
    total_samples: int = 0
    samples_per_second: float = 0.0
    last_update: float = field(default_factory=time.time)
    sample_buffer: deque = field(default_factory=lambda: deque(maxlen=10))  # 최근 10초간 샘플링 레이트
    is_active: bool = False

class StreamingMonitor:
    """실시간 데이터 흐름 기반 스트리밍 상태 자동 감지"""
    
    def __init__(self):
        self.data_flow_tracker: Dict[str, SensorFlowData] = {
            'eeg': SensorFlowData(),
            'ppg': SensorFlowData(), 
            'acc': SensorFlowData(),
            'bat': SensorFlowData()
        }
        
        # 스트리밍 활성화 임계값 (samples/sec)
        # EEG만 보고 판단: EEG가 8개 이상 메시지가 오면 OK
        self.streaming_threshold = {
            'eeg': 8,     # EEG 최소 8 messages/sec
            'ppg': 0.1,   # PPG는 참고용 (판단에 사용 안함)  
            'acc': 0.1,   # ACC는 참고용 (판단에 사용 안함)
            'bat': 0.01   # Battery는 참고용 (판단에 사용 안함)
        }
        
        self.lock = threading.Lock()
        self.last_status_calculation = 0
        self.status_cache_duration = 0.5  # 0.5초간 상태 캐시
        self._cached_status: Optional[Dict[str, Any]] = None
        
        logger.info("[STREAMING_MONITOR] StreamingMonitor initialized")
    
    def track_data_flow(self, sensor_type: str, data_count: int):
        """실시간 데이터 흐름 추적"""
        logger.info(f"[STREAMING_MONITOR] track_data_flow called: {sensor_type}, count: {data_count}")
        
        if sensor_type not in self.data_flow_tracker:
            logger.warning(f"[STREAMING_MONITOR] Unknown sensor type: {sensor_type}")
            return
            
        with self.lock:
            current_time = time.time()
            flow_data = self.data_flow_tracker[sensor_type]
            
            # 총 샘플 수 업데이트
            flow_data.total_samples += data_count
            
            # 시간 간격 계산 (초)
            time_delta = current_time - flow_data.last_update
            if time_delta > 0:
                # 현재 sampling rate 계산
                current_rate = data_count / time_delta
                flow_data.sample_buffer.append((current_time, current_rate))
                
                # 최근 5초간 평균 sampling rate 계산
                recent_samples = [rate for timestamp, rate in flow_data.sample_buffer 
                                if current_time - timestamp <= 5.0]
                flow_data.samples_per_second = sum(recent_samples) / len(recent_samples) if recent_samples else 0
                
                # 활성화 상태 판정
                threshold = self.streaming_threshold.get(sensor_type, 0)
                flow_data.is_active = flow_data.samples_per_second >= threshold
                
                logger.info(f"[STREAMING_MONITOR] {sensor_type.upper()}: {data_count} samples, "
                           f"rate: {flow_data.samples_per_second:.1f}/sec, "
                           f"active: {flow_data.is_active}, threshold: {threshold}")
            
            flow_data.last_update = current_time
            
            # 캐시 무효화
            self._cached_status = None
    
    def calculate_streaming_status(self) -> Dict[str, Any]:
        """실제 데이터 흐름 기반 스트리밍 상태 계산"""
        current_time = time.time()
        
        # 캐시 확인
        if (self._cached_status and 
            current_time - self.last_status_calculation < self.status_cache_duration):
            return self._cached_status
        
        with self.lock:
            # 전체 스트리밍 활성화 상태 판정
            active_sensors = []
            sensor_details = {}
            
            for sensor_type, flow_data in self.data_flow_tracker.items():
                # 5초 이상 업데이트가 없으면 비활성화
                if current_time - flow_data.last_update > 5.0:
                    flow_data.is_active = False
                    flow_data.samples_per_second = 0
                
                sensor_details[sensor_type] = {
                    'sampling_rate': flow_data.samples_per_second,
                    'total_samples': flow_data.total_samples,
                    'is_active': flow_data.is_active,
                    'last_update': flow_data.last_update
                }
                
                if flow_data.is_active:
                    active_sensors.append(sensor_type)
            
            # 스트리밍 상태 결정
            # EEG만 보고 판단: EEG가 활성화되어 있으면 스트리밍 활성화
            is_streaming_active = 'eeg' in active_sensors
            
            # 데이터 흐름 품질 평가
            if 'eeg' in active_sensors and len(active_sensors) >= 3:
                data_flow_health = 'good'
            elif 'eeg' in active_sensors:
                data_flow_health = 'fair'
            else:
                data_flow_health = 'none'
            
            status = {
                'is_active': is_streaming_active,
                'active_sensors': active_sensors,
                'sensor_details': sensor_details,
                'data_flow_health': data_flow_health,
                'total_active_sensors': len(active_sensors),
                'last_data_received': max([flow_data.last_update for flow_data in self.data_flow_tracker.values()]),
                'calculated_at': current_time
            }
            
            # 캐시 업데이트
            self._cached_status = status
            self.last_status_calculation = current_time
            
            logger.debug(f"[STREAMING_MONITOR] Status calculated: active={is_streaming_active}, "
                        f"sensors={active_sensors}, health={data_flow_health}")
            
            return status
    
    def get_detailed_status(self) -> Dict[str, Any]:
        """상세 스트리밍 정보 반환"""
        status = self.calculate_streaming_status()
        
        # 추가 세부 정보
        with self.lock:
            detailed_info = {
                **status,
                'thresholds': self.streaming_threshold.copy(),
                'monitoring_duration': time.time() - min([flow_data.last_update for flow_data in self.data_flow_tracker.values()]),
                'cache_info': {
                    'last_calculation': self.last_status_calculation,
                    'cache_duration': self.status_cache_duration,
                    'is_cached': self._cached_status is not None
                }
            }
        
        return detailed_info
    
    def reset_tracking(self):
        """트래킹 데이터 초기화"""
        with self.lock:
            for flow_data in self.data_flow_tracker.values():
                flow_data.total_samples = 0
                flow_data.samples_per_second = 0.0
                flow_data.last_update = time.time()
                flow_data.sample_buffer.clear()
                flow_data.is_active = False
            
            self._cached_status = None
            self.last_status_calculation = 0
            
        logger.info("[STREAMING_MONITOR] Tracking data reset")
    
    def get_sensor_status(self, sensor_type: str) -> Optional[Dict[str, Any]]:
        """특정 센서의 상태 정보 반환"""
        if sensor_type not in self.data_flow_tracker:
            return None
            
        with self.lock:
            flow_data = self.data_flow_tracker[sensor_type]
            return {
                'sensor_type': sensor_type,
                'sampling_rate': flow_data.samples_per_second,
                'total_samples': flow_data.total_samples,
                'is_active': flow_data.is_active,
                'threshold': self.streaming_threshold.get(sensor_type, 0),
                'last_update': flow_data.last_update,
                'buffer_size': len(flow_data.sample_buffer)
            } 