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
        
        # 초기화 인식 기능 추가
        self.initialization_timestamp: Optional[float] = None
        self.initialization_phase_duration = 15.0  # 15초로 설정
        self.is_post_initialization = False
        self.logical_streaming_active = False  # 논리적 스트리밍 상태
        
        # 재초기화 쿨다운 메커니즘
        self.last_reinitialization_time = 0
        self.reinitialization_cooldown = 15.0  # 15초간 재초기화 방지
        
        logger.info("[STREAMING_MONITOR] StreamingMonitor initialized")
    
    def mark_system_initialized(self):
        """시스템 초기화 시점 기록"""
        with self.lock:
            self.initialization_timestamp = time.time()
            self.is_post_initialization = True
            logger.info("[STREAMING_MONITOR] System initialization marked at timestamp: {:.2f}".format(self.initialization_timestamp))
    
    def set_logical_streaming_status(self, active: bool):
        """논리적 스트리밍 상태 설정 (백엔드에서 스트리밍 시작/중지 시 호출)"""
        with self.lock:
            self.logical_streaming_active = active
            logger.info(f"[STREAMING_MONITOR] Logical streaming status set to: {active}")
            # 캐시 무효화
            self._cached_status = None
    
    def is_in_initialization_phase(self) -> bool:
        """초기화 단계 여부 확인"""
        if not self.initialization_timestamp:
            return False
        return (time.time() - self.initialization_timestamp) < self.initialization_phase_duration
    
    def get_time_since_initialization(self) -> float:
        """초기화 후 경과 시간 반환"""
        if not self.initialization_timestamp:
            return 0.0
        return time.time() - self.initialization_timestamp
    
    def get_initialization_time_remaining(self) -> float:
        """초기화 단계 남은 시간 반환"""
        if not self.is_in_initialization_phase():
            return 0.0
        return self.initialization_phase_duration - self.get_time_since_initialization()
    
    def track_data_flow(self, sensor_type: str, data_count: int, sample_timestamps: list = None):
        """실시간 데이터 흐름 추적 및 자동 재초기화"""
        logger.info(f"[STREAMING_MONITOR] track_data_flow called: {sensor_type}, count: {data_count}, timestamps: {len(sample_timestamps) if sample_timestamps else 0}")
        
        if sensor_type not in self.data_flow_tracker:
            logger.warning(f"[STREAMING_MONITOR] Unknown sensor type: {sensor_type}")
            return
            
        with self.lock:
            current_time = time.time()
            flow_data = self.data_flow_tracker[sensor_type]
            
            # 🔄 데이터 흐름 기반 재초기화 로직
            was_inactive_before = not flow_data.is_active
            previous_total_samples = flow_data.total_samples
            
            # 총 샘플 수 업데이트
            flow_data.total_samples += data_count
            
            # 시간 간격 계산 (초)
            time_delta = current_time - flow_data.last_update
            if time_delta > 0:
                # EEG 타임스탬프 기반 계산 우선 적용
                if sensor_type == 'eeg' and sample_timestamps and len(sample_timestamps) >= 2:
                    # 타임스탬프 기반 정확한 샘플링 레이트 계산
                    time_span = sample_timestamps[-1] - sample_timestamps[0]
                    if time_span > 0:
                        timestamp_based_rate = (len(sample_timestamps) - 1) / time_span
                        flow_data.samples_per_second = timestamp_based_rate
                        logger.info(f"[STREAMING_MONITOR] EEG: Using timestamp-based rate: {timestamp_based_rate:.1f} Hz (batch: {data_count} samples)")
                    else:
                        # 폴백: 기존 방식
                        current_rate = data_count / time_delta
                        flow_data.sample_buffer.append((current_time, current_rate))
                        recent_samples = [rate for timestamp, rate in flow_data.sample_buffer 
                                        if current_time - timestamp <= 5.0]
                        flow_data.samples_per_second = sum(recent_samples) / len(recent_samples) if recent_samples else 0
                else:
                    # 다른 센서들은 기존 방식 사용
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
                
                # 🔍 데이터 흐름 감지 로그만 남기고 자동 재초기화는 비활성화
                if (sensor_type == 'eeg' and 
                    was_inactive_before and 
                    flow_data.is_active and 
                    data_count > 0):
                    logger.info(f"[STREAMING_MONITOR] EEG data flow detected after inactivity (auto-reinitialization disabled)")
                
                if (previous_total_samples == 0 and 
                    data_count > 0 and 
                    sensor_type in ['eeg', 'ppg', 'acc']):
                    logger.info(f"[STREAMING_MONITOR] First {sensor_type.upper()} data received (auto-reinitialization disabled)")
            
            flow_data.last_update = current_time
            
            # 캐시 무효화
            self._cached_status = None
    
    def calculate_streaming_status(self) -> Dict[str, Any]:
        """초기화 단계를 고려한 스트리밍 상태 계산"""
        current_time = time.time()
        
        # 캐시 확인 (초기화 단계에서는 캐시 지속 시간 단축)
        cache_duration = 0.2 if self.is_in_initialization_phase() else self.status_cache_duration
        if (self._cached_status and 
            current_time - self.last_status_calculation < cache_duration):
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
            
            # 스트리밍 상태 결정 (초기화 단계 고려)
            is_streaming_active = False
            phase = 'normal'
            message = None
            
            if self.is_in_initialization_phase():
                # 초기화 단계에서의 상태 판정
                phase = 'initializing'
                time_remaining = self.get_initialization_time_remaining()
                
                if len(active_sensors) > 0 and 'eeg' in active_sensors:
                    # 🚀 실제 데이터가 흐르고 있으면 즉시 초기화 완료 처리
                    is_streaming_active = True
                    phase = 'ready'
                    message = 'Data flow detected, streaming active'
                    # 초기화 단계를 즉시 종료
                    self.initialization_timestamp = current_time - self.initialization_phase_duration
                elif self.logical_streaming_active and len(active_sensors) == 0:
                    # 논리적으로는 스트리밍 중이지만 아직 데이터가 없음
                    is_streaming_active = False
                    message = f'Streaming started, waiting for data flow... ({time_remaining:.0f}s remaining)'
                else:
                    # 아직 스트리밍이 시작되지 않음
                    is_streaming_active = False
                    message = f'System initializing... ({time_remaining:.0f}s remaining)'
            else:
                # 정상 단계에서의 기존 로직
                is_streaming_active = 'eeg' in active_sensors
                if is_streaming_active:
                    message = 'Streaming active with data flow'
                else:
                    message = 'No active data flow detected'
            
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
                'last_data_received': max([flow_data.last_update for flow_data in self.data_flow_tracker.values()]) if self.data_flow_tracker else current_time,
                'calculated_at': current_time,
                'phase': phase,
                'message': message,
                'logical_streaming_active': self.logical_streaming_active
            }
            
            # 캐시 업데이트
            self._cached_status = status
            self.last_status_calculation = current_time
            
            logger.debug(f"[STREAMING_MONITOR] Status calculated: active={is_streaming_active}, "
                        f"sensors={active_sensors}, health={data_flow_health}, phase={phase}")
            
            return status
    
    def get_detailed_status(self) -> Dict[str, Any]:
        """초기화 정보를 포함한 상세 스트리밍 정보 반환"""
        status = self.calculate_streaming_status()
        
        # 추가 세부 정보
        with self.lock:
            detailed_info = {
                **status,
                'thresholds': self.streaming_threshold.copy(),
                'monitoring_duration': time.time() - min([flow_data.last_update for flow_data in self.data_flow_tracker.values()]) if self.data_flow_tracker else 0,
                'cache_info': {
                    'last_calculation': self.last_status_calculation,
                    'cache_duration': self.status_cache_duration,
                    'is_cached': self._cached_status is not None
                },
                'initialization_info': {
                    'is_in_init_phase': self.is_in_initialization_phase(),
                    'time_since_init': self.get_time_since_initialization(),
                    'time_remaining': self.get_initialization_time_remaining(),
                    'init_phase_duration': self.initialization_phase_duration,
                    'is_post_initialization': self.is_post_initialization,
                    'initialization_timestamp': self.initialization_timestamp
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
            
            # 재초기화 쿨다운도 리셋
            self.last_reinitialization_time = 0
            
        logger.info("[STREAMING_MONITOR] Tracking data reset (including reinitialization cooldown)")
    
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