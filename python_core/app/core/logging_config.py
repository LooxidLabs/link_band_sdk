"""
Link Band SDK 통합 로그 관리 시스템
중앙 집중식 로그 설정 및 컨텍스트 기반 로깅 제공
"""

import logging
import os
import time
from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime
from .history_log_handler import setup_history_logging

class LogLevel(Enum):
    """로그 레벨 정의"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class LogContext(Enum):
    """로그 컨텍스트 분류"""
    DEVICE = "DEVICE"
    STREAM = "STREAM"
    API = "API"
    WEBSOCKET = "WEBSOCKET"
    SYSTEM = "SYSTEM"
    TEST = "TEST"

class LogTags:
    """표준화된 로그 태그"""
    
    # 액션 태그
    CONNECT = "CONNECT"
    DISCONNECT = "DISCONNECT"
    SCAN = "SCAN"
    STREAM_START = "STREAM_START"
    STREAM_STOP = "STREAM_STOP"
    DATA_RECEIVED = "DATA_RECEIVED"
    AUTO_CONNECT = "AUTO_CONNECT"
    
    # 컴포넌트 태그
    DEVICE_MANAGER = "DEVICE_MGR"
    WEBSOCKET_SERVER = "WS_SERVER"
    API_ROUTER = "API"
    SIGNAL_PROCESSOR = "SIGNAL_PROC"
    SERVER = "SERVER"
    
    # 센서 태그
    EEG = "EEG"
    PPG = "PPG"
    ACC = "ACC"
    BATTERY = "BAT"
    
    # 상태 태그
    START = "START"
    STOP = "STOP"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    ERROR = "ERROR"
    SYSTEM = "SYSTEM"

class LinkBandLogger:
    """Link Band SDK 통합 로거"""
    
    _instance = None
    _configured = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def configure(self, 
                 environment: str = "development",
                 enable_history: bool = True,
                 log_file: Optional[str] = None,
                 console_level: Optional[str] = None):
        """로그 시스템 전역 설정"""
        if self._configured:
            return
        
        # 환경별 로그 레벨 설정
        level_map = {
            "development": logging.DEBUG,
            "testing": logging.INFO,
            "production": logging.WARNING
        }
        
        log_level = level_map.get(environment, logging.INFO)
        if console_level:
            console_log_level = getattr(logging, console_level.upper(), log_level)
        else:
            console_log_level = log_level
        
        # 기존 핸들러 제거 (중복 방지)
        root_logger = logging.getLogger()
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # 루트 로거 설정
        root_logger.setLevel(logging.DEBUG)  # 가장 낮은 레벨로 설정
        
        # 콘솔 핸들러 (간단한 포맷)
        console_handler = logging.StreamHandler()
        console_formatter = logging.Formatter(
            '%(asctime)s | %(name)s | %(levelname)s | %(message)s',
            datefmt='%H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        console_handler.setLevel(console_log_level)
        root_logger.addHandler(console_handler)
        
        # 파일 핸들러 (상세한 포맷)
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_formatter = logging.Formatter(
                '%(asctime)s | %(name)s | %(levelname)s | %(funcName)s:%(lineno)d | %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            file_handler.setLevel(log_level)
            root_logger.addHandler(file_handler)
        
        # 히스토리 로그 시스템 활성화
        if enable_history:
            try:
                setup_history_logging()
            except Exception as e:
                # 히스토리 로그 실패해도 기본 로깅은 계속
                print(f"Warning: History logging setup failed: {e}")
        
        # 외부 라이브러리 로그 레벨 조정
        logging.getLogger('uvicorn').setLevel(logging.WARNING)
        logging.getLogger('fastapi').setLevel(logging.WARNING)
        logging.getLogger('bleak').setLevel(logging.WARNING)
        logging.getLogger('asyncio').setLevel(logging.WARNING)
        
        self._configured = True
        
        # 설정 완료 로그
        system_logger = self.get_logger("logging_config", LogContext.SYSTEM)
        system_logger.info(f"[{LogTags.SYSTEM}:{LogTags.START}] Link Band logging system initialized", 
                          extra={
                              "environment": environment,
                              "console_level": console_log_level,
                              "history_enabled": enable_history,
                              "log_file": log_file
                          })
    
    def get_logger(self, name: str, context: LogContext = LogContext.SYSTEM) -> logging.Logger:
        """컨텍스트 정보가 포함된 로거 반환"""
        logger_name = f"{context.value}.{name}"
        return logging.getLogger(logger_name)
    
    def is_configured(self) -> bool:
        """로그 시스템 설정 여부 확인"""
        return self._configured
    
    def reconfigure(self, **kwargs):
        """로그 시스템 재설정"""
        self._configured = False
        self.configure(**kwargs)

# 전역 인스턴스
linkband_logger = LinkBandLogger()

# 편의 함수들
def get_device_logger(name: str) -> logging.Logger:
    """디바이스 관련 로거 반환"""
    return linkband_logger.get_logger(name, LogContext.DEVICE)

def get_stream_logger(name: str) -> logging.Logger:
    """스트림 관련 로거 반환"""
    return linkband_logger.get_logger(name, LogContext.STREAM)

def get_api_logger(name: str) -> logging.Logger:
    """API 관련 로거 반환"""
    return linkband_logger.get_logger(name, LogContext.API)

def get_websocket_logger(name: str) -> logging.Logger:
    """WebSocket 관련 로거 반환"""
    return linkband_logger.get_logger(name, LogContext.WEBSOCKET)

def get_system_logger(name: str) -> logging.Logger:
    """시스템 관련 로거 반환"""
    return linkband_logger.get_logger(name, LogContext.SYSTEM)

def get_test_logger(name: str) -> logging.Logger:
    """테스트 관련 로거 반환"""
    return linkband_logger.get_logger(name, LogContext.TEST)

# 로그 유틸리티 함수들
def log_device_connection(logger: logging.Logger, address: str, status: str, **extra):
    """디바이스 연결 로그"""
    logger.info(f"[{LogTags.DEVICE_MANAGER}:{LogTags.CONNECT}] Device connection", 
                extra={
                    "address": address,
                    "status": status,
                    "timestamp": time.time(),
                    "action": LogTags.CONNECT,
                    **extra
                })

def log_stream_event(logger: logging.Logger, sensor_type: str, action: str, **extra):
    """스트림 이벤트 로그"""
    logger.info(f"[{LogTags.STREAM}:{sensor_type.upper()}] {action}", 
                extra={
                    "sensor_type": sensor_type,
                    "action": action,
                    "timestamp": time.time(),
                    **extra
                })

def log_api_request(logger: logging.Logger, endpoint: str, method: str, **extra):
    """API 요청 로그"""
    logger.info(f"[{LogTags.API_ROUTER}] {method} {endpoint}", 
                extra={
                    "endpoint": endpoint,
                    "method": method,
                    "timestamp": time.time(),
                    **extra
                })

def log_error(logger: logging.Logger, component: str, error_msg: str, exception: Exception = None, **extra):
    """에러 로그"""
    logger.error(f"[{component}:{LogTags.ERROR}] {error_msg}", 
                extra={
                    "component": component,
                    "error_message": error_msg,
                    "exception_type": type(exception).__name__ if exception else None,
                    "timestamp": time.time(),
                    **extra
                }, exc_info=exception) 