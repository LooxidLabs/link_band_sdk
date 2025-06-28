import asyncio
import logging
import time
from typing import Dict, Any, Optional, Callable, List
from enum import Enum, auto
from datetime import datetime, timedelta
import traceback

logger = logging.getLogger(__name__)

class ErrorSeverity(Enum):
    """에러 심각도 레벨"""
    LOW = "low"           # 경고성 에러 (로그만 기록)
    MEDIUM = "medium"     # 중간 에러 (재시도 가능)
    HIGH = "high"         # 심각한 에러 (즉시 복구 필요)
    CRITICAL = "critical" # 치명적 에러 (시스템 중단)

class ErrorType(Enum):
    """에러 타입 분류"""
    CONNECTION = "connection"         # 연결 관련 에러
    DATA_PROCESSING = "data_processing"  # 데이터 처리 에러
    STREAMING = "streaming"          # 스트리밍 에러
    BLUETOOTH = "bluetooth"          # 블루투스 에러
    WEBSOCKET = "websocket"          # WebSocket 에러
    FILE_IO = "file_io"             # 파일 입출력 에러
    BUFFER = "buffer"               # 버퍼 관련 에러
    SENSOR = "sensor"               # 센서 관련 에러
    SYSTEM = "system"               # 시스템 에러

class ErrorRecord:
    """에러 기록 클래스"""
    def __init__(self, 
                 error_type: ErrorType,
                 severity: ErrorSeverity,
                 message: str,
                 exception: Optional[Exception] = None,
                 context: Optional[Dict[str, Any]] = None,
                 sensor_type: Optional[str] = None):
        self.error_type = error_type
        self.severity = severity
        self.message = message
        self.exception = exception
        self.context = context or {}
        self.sensor_type = sensor_type
        self.timestamp = datetime.now()
        self.retry_count = 0
        self.resolved = False

class ErrorHandler:
    """중앙집중식 에러 처리 시스템"""
    
    def __init__(self):
        self.error_history: List[ErrorRecord] = []
        self.error_callbacks: Dict[ErrorType, List[Callable]] = {}
        self.recovery_strategies: Dict[ErrorType, Callable] = {}
        self.max_retry_attempts = 3
        self.retry_delays = [1, 2, 5]  # 재시도 간격 (초)
        self.error_rate_threshold = 10  # 분당 에러 임계치
        self.error_rate_window = timedelta(minutes=1)
        
        # 에러 통계
        self.error_stats: Dict[str, int] = {}
        self.sensor_error_stats: Dict[str, Dict[str, int]] = {}
        
        # 복구 중인 태스크들
        self.recovery_tasks: Dict[str, asyncio.Task] = {}
        
        logger.info("ErrorHandler initialized")

    def register_error_callback(self, error_type: ErrorType, callback: Callable):
        """에러 타입별 콜백 등록"""
        if error_type not in self.error_callbacks:
            self.error_callbacks[error_type] = []
        self.error_callbacks[error_type].append(callback)

    def register_recovery_strategy(self, error_type: ErrorType, strategy: Callable):
        """에러 타입별 복구 전략 등록"""
        self.recovery_strategies[error_type] = strategy

    async def handle_error(self, 
                          error_type: ErrorType,
                          severity: ErrorSeverity,
                          message: str,
                          exception: Optional[Exception] = None,
                          context: Optional[Dict[str, Any]] = None,
                          sensor_type: Optional[str] = None) -> bool:
        """에러 처리 메인 메서드"""
        
        # 에러 기록 생성
        error_record = ErrorRecord(
            error_type=error_type,
            severity=severity,
            message=message,
            exception=exception,
            context=context,
            sensor_type=sensor_type
        )
        
        # 에러 기록 저장
        self.error_history.append(error_record)
        self._update_error_stats(error_record)
        
        # 로깅
        self._log_error(error_record)
        
        # 에러율 체크
        if self._check_error_rate():
            logger.warning("High error rate detected! Taking preventive measures...")
            await self._handle_high_error_rate()
        
        # 콜백 실행
        await self._execute_callbacks(error_type, error_record)
        
        # 복구 시도
        recovery_success = False
        if severity in [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH]:
            recovery_success = await self._attempt_recovery(error_record)
        
        return recovery_success

    def _log_error(self, error_record: ErrorRecord):
        """에러 로깅"""
        log_message = f"[{error_record.error_type.value.upper()}] {error_record.message}"
        
        if error_record.sensor_type:
            log_message += f" (Sensor: {error_record.sensor_type})"
        
        if error_record.context:
            log_message += f" Context: {error_record.context}"
        
        if error_record.severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message, exc_info=error_record.exception)
        elif error_record.severity == ErrorSeverity.HIGH:
            logger.error(log_message, exc_info=error_record.exception)
        elif error_record.severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message)
        else:
            logger.info(log_message)

    def _update_error_stats(self, error_record: ErrorRecord):
        """에러 통계 업데이트"""
        error_key = error_record.error_type.value
        
        # 전체 에러 통계
        self.error_stats[error_key] = self.error_stats.get(error_key, 0) + 1
        
        # 센서별 에러 통계
        if error_record.sensor_type:
            if error_record.sensor_type not in self.sensor_error_stats:
                self.sensor_error_stats[error_record.sensor_type] = {}
            
            sensor_stats = self.sensor_error_stats[error_record.sensor_type]
            sensor_stats[error_key] = sensor_stats.get(error_key, 0) + 1

    def _check_error_rate(self) -> bool:
        """에러율 체크"""
        current_time = datetime.now()
        recent_errors = [
            error for error in self.error_history
            if current_time - error.timestamp <= self.error_rate_window
        ]
        
        return len(recent_errors) >= self.error_rate_threshold

    async def _handle_high_error_rate(self):
        """높은 에러율 처리"""
        logger.warning("Implementing error rate mitigation strategies...")
        
        # 최근 에러 패턴 분석
        recent_errors = self._get_recent_errors()
        error_patterns = self._analyze_error_patterns(recent_errors)
        
        # 패턴별 대응
        for pattern, count in error_patterns.items():
            if count >= 5:  # 같은 패턴이 5번 이상 반복
                logger.warning(f"Detected error pattern: {pattern} ({count} times)")
                await self._handle_error_pattern(pattern)

    def _get_recent_errors(self) -> List[ErrorRecord]:
        """최근 에러 목록 반환"""
        current_time = datetime.now()
        return [
            error for error in self.error_history
            if current_time - error.timestamp <= self.error_rate_window
        ]

    def _analyze_error_patterns(self, errors: List[ErrorRecord]) -> Dict[str, int]:
        """에러 패턴 분석"""
        patterns = {}
        for error in errors:
            pattern_key = f"{error.error_type.value}_{error.sensor_type or 'system'}"
            patterns[pattern_key] = patterns.get(pattern_key, 0) + 1
        return patterns

    async def _handle_error_pattern(self, pattern: str):
        """에러 패턴별 처리"""
        if "streaming" in pattern:
            logger.info(f"Restarting streaming for pattern: {pattern}")
            # 스트리밍 재시작 로직 (실제 구현은 상위 클래스에서)
        elif "connection" in pattern:
            logger.info(f"Attempting connection recovery for pattern: {pattern}")
            # 연결 복구 로직
        elif "bluetooth" in pattern:
            logger.info(f"Attempting Bluetooth recovery for pattern: {pattern}")
            # 블루투스 복구 로직

    async def _execute_callbacks(self, error_type: ErrorType, error_record: ErrorRecord):
        """에러 콜백 실행"""
        if error_type in self.error_callbacks:
            for callback in self.error_callbacks[error_type]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(error_record)
                    else:
                        callback(error_record)
                except Exception as e:
                    logger.error(f"Error in error callback: {e}")

    async def _attempt_recovery(self, error_record: ErrorRecord) -> bool:
        """복구 시도"""
        if error_record.error_type not in self.recovery_strategies:
            logger.warning(f"No recovery strategy for {error_record.error_type.value}")
            return False
        
        strategy = self.recovery_strategies[error_record.error_type]
        max_attempts = self.max_retry_attempts
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"Recovery attempt {attempt + 1}/{max_attempts} for {error_record.error_type.value}")
                
                # 재시도 간격 대기
                if attempt > 0:
                    delay = self.retry_delays[min(attempt - 1, len(self.retry_delays) - 1)]
                    await asyncio.sleep(delay)
                
                # 복구 전략 실행
                if asyncio.iscoroutinefunction(strategy):
                    success = await strategy(error_record)
                else:
                    success = strategy(error_record)
                
                if success:
                    logger.info(f"Recovery successful for {error_record.error_type.value}")
                    error_record.resolved = True
                    error_record.retry_count = attempt + 1
                    return True
                    
            except Exception as e:
                logger.error(f"Recovery attempt {attempt + 1} failed: {e}")
                error_record.retry_count = attempt + 1
        
        logger.error(f"All recovery attempts failed for {error_record.error_type.value}")
        return False

    async def robust_execute(self, 
                           func: Callable,
                           error_type: ErrorType,
                           sensor_type: Optional[str] = None,
                           context: Optional[Dict[str, Any]] = None,
                           max_retries: int = 3) -> Any:
        """로버스트 함수 실행 (자동 에러 처리 및 재시도)"""
        
        for attempt in range(max_retries):
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func()
                else:
                    return func()
                    
            except Exception as e:
                severity = ErrorSeverity.MEDIUM if attempt < max_retries - 1 else ErrorSeverity.HIGH
                
                await self.handle_error(
                    error_type=error_type,
                    severity=severity,
                    message=f"Function execution failed (attempt {attempt + 1}/{max_retries}): {str(e)}",
                    exception=e,
                    context=context,
                    sensor_type=sensor_type
                )
                
                if attempt < max_retries - 1:
                    delay = self.retry_delays[min(attempt, len(self.retry_delays) - 1)]
                    await asyncio.sleep(delay)
                else:
                    raise

    def get_error_stats(self) -> Dict[str, Any]:
        """에러 통계 반환"""
        return {
            "total_errors": len(self.error_history),
            "error_by_type": self.error_stats.copy(),
            "sensor_errors": self.sensor_error_stats.copy(),
            "recent_error_rate": len(self._get_recent_errors()),
            "unresolved_errors": len([e for e in self.error_history if not e.resolved])
        }

    def get_sensor_health(self, sensor_type: str) -> Dict[str, Any]:
        """센서별 건강 상태 반환"""
        sensor_errors = self.sensor_error_stats.get(sensor_type, {})
        recent_errors = [
            e for e in self._get_recent_errors() 
            if e.sensor_type == sensor_type
        ]
        
        return {
            "sensor_type": sensor_type,
            "total_errors": sum(sensor_errors.values()),
            "recent_errors": len(recent_errors),
            "error_types": sensor_errors.copy(),
            "health_status": self._calculate_health_status(sensor_type)
        }

    def _calculate_health_status(self, sensor_type: str) -> str:
        """센서 건강 상태 계산"""
        recent_errors = [
            e for e in self._get_recent_errors() 
            if e.sensor_type == sensor_type
        ]
        
        if len(recent_errors) == 0:
            return "healthy"
        elif len(recent_errors) <= 2:
            return "warning"
        elif len(recent_errors) <= 5:
            return "degraded"
        else:
            return "critical"

    def clear_old_errors(self, hours: int = 24):
        """오래된 에러 기록 정리"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        self.error_history = [
            error for error in self.error_history
            if error.timestamp > cutoff_time
        ]
        logger.info(f"Cleared error records older than {hours} hours")

# 전역 에러 핸들러 인스턴스
global_error_handler = ErrorHandler() 