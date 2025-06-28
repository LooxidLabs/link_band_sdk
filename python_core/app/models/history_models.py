"""
통합 히스토리 데이터 관리를 위한 데이터 모델
메트릭, 로그, 성능 데이터, 알림을 통합 관리
"""

from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field
from enum import Enum
import json

# ============================================================================
# 기본 열거형 정의
# ============================================================================

class LogLevel(str, Enum):
    """로그 레벨 정의"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class MetricType(str, Enum):
    """메트릭 타입 정의"""
    CPU = "cpu"
    MEMORY = "memory"
    DISK = "disk"
    NETWORK = "network"
    STREAMING = "streaming"
    BUFFER = "buffer"
    BATCH = "batch"

class ComponentType(str, Enum):
    """컴포넌트 타입 정의"""
    BUFFER = "buffer"
    BATCH = "batch"
    STREAM = "stream"
    OPTIMIZER = "optimizer"
    NETWORK = "network"
    DEVICE = "device"

class AlertCategory(str, Enum):
    """알림 카테고리 정의"""
    PERFORMANCE = "PERFORMANCE"
    SENSOR = "SENSOR"
    SYSTEM = "SYSTEM"
    DATA = "DATA"

class SummaryType(str, Enum):
    """요약 타입 정의"""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

# ============================================================================
# 핵심 데이터 모델
# ============================================================================

class SystemMetric(BaseModel):
    """시스템 메트릭 모델"""
    id: Optional[int] = None
    timestamp: datetime
    metric_type: MetricType
    metric_name: str
    value: float
    unit: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class PerformanceData(BaseModel):
    """성능 데이터 모델"""
    id: Optional[int] = None
    timestamp: datetime
    component: ComponentType
    operation: str
    duration_ms: Optional[float] = None
    throughput: Optional[float] = None
    efficiency_percent: Optional[float] = None
    error_count: int = 0
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

class SystemLog(BaseModel):
    """시스템 로그 모델"""
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

class AlertHistory(BaseModel):
    """알림 히스토리 모델"""
    id: Optional[int] = None
    timestamp: datetime
    alert_id: str
    level: LogLevel
    category: AlertCategory
    title: str
    description: Optional[str] = None
    source_component: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

class DataSummary(BaseModel):
    """데이터 요약 모델"""
    id: Optional[int] = None
    summary_type: SummaryType
    timestamp: datetime
    data_type: str
    summary_data: Dict[str, Any]
    created_at: Optional[datetime] = None

# ============================================================================
# 조회 및 응답 모델
# ============================================================================

class DataQuery(BaseModel):
    """통합 데이터 조회 쿼리"""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    data_types: Optional[List[str]] = None  # metrics, logs, performance, alerts
    levels: Optional[List[LogLevel]] = None
    components: Optional[List[ComponentType]] = None
    search_text: Optional[str] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)
    order_by: str = Field(default="timestamp")
    order_desc: bool = True

class MetricQuery(BaseModel):
    """메트릭 조회 쿼리"""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    metric_types: Optional[List[MetricType]] = None
    metric_names: Optional[List[str]] = None
    aggregation: Optional[str] = None  # avg, sum, min, max, count
    group_by: Optional[str] = None  # hour, day, week
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)

class LogQuery(BaseModel):
    """로그 조회 쿼리"""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    levels: Optional[List[LogLevel]] = None
    logger_names: Optional[List[str]] = None
    search_text: Optional[str] = None
    modules: Optional[List[str]] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)

class TrendQuery(BaseModel):
    """트렌드 분석 쿼리"""
    start_time: datetime
    end_time: datetime
    data_type: str  # metrics, performance, logs
    metric_name: Optional[str] = None
    component: Optional[ComponentType] = None
    analysis_type: str = Field(default="trend")  # trend, anomaly, forecast
    interval: str = Field(default="hour")  # minute, hour, day

# ============================================================================
# 응답 모델
# ============================================================================

class HistoryStats(BaseModel):
    """히스토리 통계"""
    total_records: int
    date_range: Dict[str, datetime]
    data_type_counts: Dict[str, int]
    level_counts: Dict[LogLevel, int] = {}
    component_counts: Dict[ComponentType, int] = {}
    storage_size_mb: float

class TrendAnalysis(BaseModel):
    """트렌드 분석 결과"""
    trend_direction: str  # increasing, decreasing, stable
    trend_strength: float  # 0-1
    anomalies: List[Dict[str, Any]]
    forecast: Optional[List[Dict[str, Any]]] = None
    correlation: Optional[Dict[str, float]] = None
    summary: str

class HistoryResponse(BaseModel):
    """히스토리 조회 응답"""
    data: List[Union[SystemMetric, SystemLog, PerformanceData, AlertHistory]]
    total_count: int
    page_info: Dict[str, Any]
    stats: Optional[HistoryStats] = None

class DashboardData(BaseModel):
    """대시보드 데이터"""
    overview: Dict[str, Any]
    recent_metrics: List[SystemMetric]
    recent_logs: List[SystemLog]
    recent_alerts: List[AlertHistory]
    performance_summary: Dict[str, Any]
    trends: List[TrendAnalysis]
    health_score: float

# ============================================================================
# 관리 모델
# ============================================================================

class ArchiveRequest(BaseModel):
    """아카이브 요청"""
    before_date: datetime
    data_types: Optional[List[str]] = None
    compress: bool = True
    archive_path: Optional[str] = None

class CleanupRequest(BaseModel):
    """정리 요청"""
    retention_days: int = Field(default=30, ge=1, le=365)
    data_types: Optional[List[str]] = None
    dry_run: bool = True

class StorageInfo(BaseModel):
    """스토리지 정보"""
    total_size_mb: float
    data_type_sizes: Dict[str, float]
    oldest_record: Optional[datetime]
    newest_record: Optional[datetime]
    record_counts: Dict[str, int]
    compression_ratio: float

class OptimizeRequest(BaseModel):
    """최적화 요청"""
    rebuild_indexes: bool = True
    vacuum_database: bool = True
    analyze_tables: bool = True
    compress_old_data: bool = False
    older_than_days: int = 7 