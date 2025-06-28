"""
통합 히스토리 로그 핸들러
시스템 로그를 자동으로 히스토리 데이터베이스에 저장
"""

import logging
import threading
import traceback
import os
from datetime import datetime
from typing import Optional

from ..models.history_models import SystemLog, LogLevel
from ..database.history_db_manager import HistoryDatabaseManager

class HistoryLogHandler(logging.Handler):
    """히스토리 데이터베이스에 로그를 저장하는 핸들러"""
    
    def __init__(self, db_manager: Optional[HistoryDatabaseManager] = None):
        super().__init__()
        self.db_manager = db_manager or HistoryDatabaseManager()
        self._thread_id_cache = {}
        
        # 로그 레벨 매핑
        self._level_mapping = {
            logging.DEBUG: LogLevel.DEBUG,
            logging.INFO: LogLevel.INFO,
            logging.WARNING: LogLevel.WARNING,
            logging.ERROR: LogLevel.ERROR,
            logging.CRITICAL: LogLevel.CRITICAL
        }
    
    def emit(self, record: logging.LogRecord):
        """로그 레코드를 처리하여 데이터베이스에 저장"""
        try:
            # 현재 스레드 ID 가져오기
            thread_id = threading.get_ident()
            process_id = os.getpid()
            
            # 추가 데이터 수집
            extra_data = {}
            if hasattr(record, 'extra'):
                extra_data.update(record.extra)
            
            # 예외 정보가 있는 경우 추가
            if record.exc_info:
                extra_data['exception'] = {
                    'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                    'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                    'traceback': traceback.format_exception(*record.exc_info)
                }
            
            # SystemLog 모델 생성
            system_log = SystemLog(
                timestamp=datetime.fromtimestamp(record.created),
                level=self._level_mapping.get(record.levelno, LogLevel.INFO),
                logger_name=record.name,
                message=record.getMessage(),
                module=record.module if hasattr(record, 'module') else None,
                function_name=record.funcName,
                line_number=record.lineno,
                thread_id=thread_id,
                process_id=process_id,
                extra_data=extra_data if extra_data else None
            )
            
            # 데이터베이스에 저장
            self.db_manager.store_log(system_log)
            
        except Exception as e:
            # 로그 핸들러에서 오류가 발생해도 애플리케이션이 중단되지 않도록
            print(f"Error in HistoryLogHandler: {e}")
    
    def close(self):
        """핸들러 종료"""
        if self.db_manager:
            self.db_manager.force_flush()
        super().close()

class HistoryLogManager:
    """히스토리 로그 관리자"""
    
    def __init__(self, db_manager: Optional[HistoryDatabaseManager] = None):
        self.db_manager = db_manager or HistoryDatabaseManager()
        self.handler = HistoryLogHandler(self.db_manager)
        self._configured_loggers = set()
    
    def setup_logging(self, logger_names: Optional[list] = None, level: int = logging.INFO):
        """로깅 설정"""
        if logger_names is None:
            # 기본 로거들 설정
            logger_names = [
                'app.core',
                'app.api',
                'app.services',
                'app.main',
                'uvicorn',
                'fastapi'
            ]
        
        # 핸들러 포맷 설정
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.handler.setFormatter(formatter)
        self.handler.setLevel(level)
        
        # 각 로거에 핸들러 추가
        for logger_name in logger_names:
            logger = logging.getLogger(logger_name)
            if logger_name not in self._configured_loggers:
                logger.addHandler(self.handler)
                logger.setLevel(level)
                self._configured_loggers.add(logger_name)
        
        # 루트 로거에도 추가 (선택적)
        root_logger = logging.getLogger()
        if 'root' not in self._configured_loggers:
            root_logger.addHandler(self.handler)
            self._configured_loggers.add('root')
        
        logging.info("History logging system initialized")
    
    def add_custom_log(self, level: LogLevel, message: str, logger_name: str = "custom", 
                      module: str = None, extra_data: dict = None):
        """사용자 정의 로그 추가"""
        system_log = SystemLog(
            timestamp=datetime.now(),
            level=level,
            logger_name=logger_name,
            message=message,
            module=module,
            thread_id=threading.get_ident(),
            process_id=os.getpid(),
            extra_data=extra_data
        )
        
        self.db_manager.store_log(system_log)
    
    def flush(self):
        """버퍼된 로그 강제 플러시"""
        self.db_manager.force_flush()
    
    def close(self):
        """로그 매니저 종료"""
        self.handler.close()
        if self.db_manager:
            self.db_manager.close()

# 전역 인스턴스
_history_log_manager = None

def get_history_log_manager() -> HistoryLogManager:
    """히스토리 로그 매니저 싱글톤 인스턴스 반환"""
    global _history_log_manager
    if _history_log_manager is None:
        _history_log_manager = HistoryLogManager()
    return _history_log_manager

def setup_history_logging(logger_names: Optional[list] = None, level: int = logging.INFO):
    """히스토리 로깅 시스템 설정"""
    manager = get_history_log_manager()
    manager.setup_logging(logger_names, level)
    return manager 