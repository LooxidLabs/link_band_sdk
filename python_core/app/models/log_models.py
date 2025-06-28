"""
시스템 로그 관리를 위한 데이터 모델
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum
import json

class LogLevel(str, Enum):
    """로그 레벨 정의"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class LogEntry(BaseModel):
    """로그 엔트리 모델"""
    id: Optional[int] = None
    timestamp: datetime
    level: LogLevel
    logger_name: str
    message: str
    module: Optional[str] = None
    function_name: Optional[str] = None
    line_number: Optional[int] = None
    thread_id: Optional[int] = None
    process_id: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class LogQuery(BaseModel):
    """로그 조회 쿼리 모델"""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    level: Optional[LogLevel] = None
    logger_name: Optional[str] = None
    search_text: Optional[str] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)
    order_by: str = Field(default="timestamp", regex="^(timestamp|level|logger_name)$")
    order_desc: bool = True

class LogStats(BaseModel):
    """로그 통계 모델"""
    total_logs: int
    level_counts: Dict[LogLevel, int]
    recent_errors: List[LogEntry]
    top_loggers: List[Dict[str, Any]]
    time_range: Dict[str, datetime]

class LogResponse(BaseModel):
    """로그 응답 모델"""
    logs: List[LogEntry]
    total_count: int
    page_info: Dict[str, Any]
    stats: Optional[LogStats] = None

class LogArchiveRequest(BaseModel):
    """로그 아카이브 요청 모델"""
    before_date: datetime
    archive_path: Optional[str] = None
    compress: bool = True

class LogCleanupRequest(BaseModel):
    """로그 정리 요청 모델"""
    retention_days: int = Field(default=30, ge=1, le=365)
    level_filter: Optional[LogLevel] = None
    dry_run: bool = True 