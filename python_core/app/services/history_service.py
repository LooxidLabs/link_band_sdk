"""
통합 히스토리 데이터 관리 서비스
메트릭, 로그, 성능 데이터의 통합 관리 및 분석
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor

from ..models.history_models import (
    SystemMetric, SystemLog, PerformanceData, AlertHistory,
    MetricQuery, LogQuery, HistoryStats, StorageInfo,
    MetricType, LogLevel, ComponentType,
    TrendAnalysis, DashboardData
)
from ..database.history_db_manager import HistoryDatabaseManager
from ..core.history_log_handler import setup_history_logging, get_history_log_manager

logger = logging.getLogger(__name__)

class HistoryDataService:
    """통합 히스토리 데이터 서비스"""
    
    def __init__(self):
        self.db_manager = HistoryDatabaseManager()
        self.log_manager = get_history_log_manager()
        self._executor = ThreadPoolExecutor(max_workers=4)
        self._running = False
        self._collection_task = None
        
        # 히스토리 로깅 시스템 설정
        setup_history_logging()
        
        logger.info("History data service initialized")
    
    async def start(self):
        """서비스 시작"""
        if self._running:
            return
        
        self._running = True
        # 주기적 데이터 수집 태스크 시작
        self._collection_task = asyncio.create_task(self._periodic_collection())
        
        logger.info("History data service started")
    
    async def stop(self):
        """서비스 중지"""
        self._running = False
        
        if self._collection_task:
            self._collection_task.cancel()
            try:
                await self._collection_task
            except asyncio.CancelledError:
                pass
        
        # 버퍼 플러시
        self.db_manager.force_flush()
        self.log_manager.flush()
        
        logger.info("History data service stopped")
    
    async def _periodic_collection(self):
        """주기적 데이터 수집"""
        while self._running:
            try:
                await asyncio.sleep(60)  # 1분마다 실행
                
                # 시스템 메트릭 수집
                await self._collect_system_metrics()
                
                # 성능 데이터 정리
                await self._cleanup_old_performance_data()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic collection: {e}")
                await asyncio.sleep(30)  # 오류 시 30초 대기
    
    async def _collect_system_metrics(self):
        """시스템 메트릭 수집"""
        try:
            import psutil
            
            # CPU 메트릭
            cpu_percent = psutil.cpu_percent(interval=1)
            await self.store_metric(
                MetricType.CPU,
                "cpu_usage_percent",
                cpu_percent,
                unit="%"
            )
            
            # 메모리 메트릭
            memory = psutil.virtual_memory()
            await self.store_metric(
                MetricType.MEMORY,
                "memory_usage_percent",
                memory.percent,
                unit="%"
            )
            
            # 디스크 메트릭
            disk = psutil.disk_usage('/')
            await self.store_metric(
                MetricType.DISK,
                "disk_usage_percent",
                (disk.used / disk.total) * 100,
                unit="%"
            )
            
        except ImportError:
            # psutil이 없는 경우 기본 메트릭만 수집
            pass
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    async def _cleanup_old_performance_data(self):
        """오래된 성능 데이터 정리"""
        try:
            # 7일 이상 된 상세 데이터 정리
            await asyncio.get_event_loop().run_in_executor(
                self._executor,
                self.db_manager.cleanup_old_data,
                7,  # retention_days
                False  # dry_run
            )
        except Exception as e:
            logger.error(f"Error cleaning up old data: {e}")
    
    # ============================================================================
    # 데이터 저장 메서드
    # ============================================================================
    
    async def store_metric(self, metric_type: MetricType, metric_name: str, 
                          value: float, unit: str = None, tags: Dict[str, Any] = None):
        """메트릭 저장"""
        metric = SystemMetric(
            timestamp=datetime.now(),
            metric_type=metric_type,
            metric_name=metric_name,
            value=value,
            unit=unit,
            tags=tags
        )
        
        await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.db_manager.store_metric,
            metric
        )
    
    async def store_performance_data(self, component: ComponentType, operation: str,
                                   duration_ms: float = None, throughput: float = None,
                                   efficiency_percent: float = None, error_count: int = 0,
                                   metadata: Dict[str, Any] = None):
        """성능 데이터 저장"""
        perf_data = PerformanceData(
            timestamp=datetime.now(),
            component=component,
            operation=operation,
            duration_ms=duration_ms,
            throughput=throughput,
            efficiency_percent=efficiency_percent,
            error_count=error_count,
            metadata=metadata
        )
        
        await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.db_manager.store_performance_data,
            perf_data
        )
    
    async def add_custom_log(self, level: LogLevel, message: str, 
                           logger_name: str = "history_service",
                           module: str = None, extra_data: Dict[str, Any] = None):
        """사용자 정의 로그 추가"""
        await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.log_manager.add_custom_log,
            level,
            message,
            logger_name,
            module,
            extra_data
        )
    
    # ============================================================================
    # 데이터 조회 메서드
    # ============================================================================
    
    async def query_logs(self, query: LogQuery) -> List[SystemLog]:
        """로그 조회"""
        return await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.db_manager.query_logs,
            query
        )
    
    async def query_metrics(self, query: MetricQuery) -> List[SystemMetric]:
        """메트릭 조회"""
        return await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.db_manager.query_metrics,
            query
        )
    
    async def get_recent_logs(self, limit: int = 100, 
                            levels: List[LogLevel] = None) -> List[SystemLog]:
        """최근 로그 조회"""
        query = LogQuery(
            start_time=datetime.now() - timedelta(hours=24),
            end_time=datetime.now(),
            levels=levels,
            limit=limit
        )
        return await self.query_logs(query)
    
    async def get_recent_metrics(self, limit: int = 100,
                               metric_types: List[MetricType] = None) -> List[SystemMetric]:
        """최근 메트릭 조회"""
        query = MetricQuery(
            start_time=datetime.now() - timedelta(hours=24),
            end_time=datetime.now(),
            metric_types=metric_types,
            limit=limit
        )
        return await self.query_metrics(query)
    
    async def search_logs(self, search_text: str, limit: int = 100) -> List[SystemLog]:
        """로그 검색"""
        query = LogQuery(
            search_text=search_text,
            limit=limit
        )
        return await self.query_logs(query)
    
    # ============================================================================
    # 통계 및 분석 메서드
    # ============================================================================
    
    async def get_history_stats(self) -> HistoryStats:
        """히스토리 통계 조회"""
        return await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.db_manager.get_history_stats
        )
    
    async def get_storage_info(self) -> StorageInfo:
        """스토리지 정보 조회"""
        return await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.db_manager.get_storage_info
        )
    
    async def analyze_log_trends(self, hours: int = 24) -> TrendAnalysis:
        """로그 트렌드 분석"""
        start_time = datetime.now() - timedelta(hours=hours)
        
        # 시간대별 로그 레벨 통계
        logs = await self.query_logs(LogQuery(
            start_time=start_time,
            limit=10000
        ))
        
        # 레벨별 카운트
        level_counts = {}
        hourly_counts = {}
        
        for log in logs:
            # 레벨별 카운트
            level = log.level.value
            level_counts[level] = level_counts.get(level, 0) + 1
            
            # 시간별 카운트
            hour_key = log.timestamp.strftime('%Y-%m-%d %H:00')
            if hour_key not in hourly_counts:
                hourly_counts[hour_key] = {}
            hourly_counts[hour_key][level] = hourly_counts[hour_key].get(level, 0) + 1
        
        # 트렌드 분석
        error_count = level_counts.get('ERROR', 0) + level_counts.get('CRITICAL', 0)
        total_count = sum(level_counts.values())
        error_rate = (error_count / total_count) if total_count > 0 else 0
        
        # 트렌드 방향 결정
        if error_rate > 0.1:
            trend_direction = "increasing"
            trend_strength = min(error_rate * 10, 1.0)
        elif error_rate < 0.01:
            trend_direction = "stable"
            trend_strength = 0.1
        else:
            trend_direction = "stable"
            trend_strength = 0.5
        
        # 이상 징후 탐지
        anomalies = []
        for hour, counts in hourly_counts.items():
            hour_error_rate = (counts.get('ERROR', 0) + counts.get('CRITICAL', 0)) / sum(counts.values())
            if hour_error_rate > 0.2:  # 20% 이상 에러율
                anomalies.append({
                    'timestamp': hour,
                    'type': 'high_error_rate',
                    'value': hour_error_rate,
                    'description': f"High error rate: {hour_error_rate:.1%}"
                })
        
        return TrendAnalysis(
            trend_direction=trend_direction,
            trend_strength=trend_strength,
            anomalies=anomalies,
            summary=f"Log analysis for last {hours} hours: {total_count} total logs, {error_rate:.1%} error rate"
        )
    
    async def get_dashboard_data(self) -> DashboardData:
        """대시보드 데이터 조회"""
        # 병렬로 데이터 수집
        tasks = [
            self.get_recent_logs(50),
            self.get_recent_metrics(50),
            self.get_history_stats(),
            self.analyze_log_trends(24)
        ]
        
        recent_logs, recent_metrics, stats, log_trends = await asyncio.gather(*tasks)
        
        # 개요 데이터 생성
        overview = {
            'total_logs': stats.data_type_counts.get('logs', 0),
            'total_metrics': stats.data_type_counts.get('metrics', 0),
            'storage_size_mb': stats.storage_size_mb,
            'date_range': {
                'start': stats.date_range['start'].isoformat(),
                'end': stats.date_range['end'].isoformat()
            }
        }
        
        # 성능 요약
        performance_summary = {
            'log_error_rate': log_trends.trend_strength if log_trends.trend_direction == "increasing" else 0.0,
            'storage_efficiency': min(stats.storage_size_mb / 100, 1.0),  # 100MB 기준
            'data_freshness': (datetime.now() - stats.date_range['end']).total_seconds() / 3600  # 시간 단위
        }
        
        # 건강 점수 계산
        health_score = 100.0
        health_score -= performance_summary['log_error_rate'] * 50  # 에러율 페널티
        health_score -= min(performance_summary['data_freshness'] * 10, 30)  # 데이터 신선도 페널티
        health_score = max(health_score, 0.0)
        
        return DashboardData(
            overview=overview,
            recent_metrics=recent_metrics,
            recent_logs=recent_logs,
            recent_alerts=[],  # TODO: 알림 데이터 추가
            performance_summary=performance_summary,
            trends=[log_trends],
            health_score=health_score
        )
    
    # ============================================================================
    # 관리 메서드
    # ============================================================================
    
    async def cleanup_old_data(self, retention_days: int = 30, 
                             dry_run: bool = True) -> Dict[str, int]:
        """오래된 데이터 정리"""
        return await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.db_manager.cleanup_old_data,
            retention_days,
            dry_run
        )
    
    async def optimize_database(self) -> Dict[str, Any]:
        """데이터베이스 최적화"""
        return await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.db_manager.optimize_database
        )
    
    async def force_flush(self):
        """버퍼 강제 플러시"""
        await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.db_manager.force_flush
        )
        
        await asyncio.get_event_loop().run_in_executor(
            self._executor,
            self.log_manager.flush
        )

# 전역 서비스 인스턴스
_history_service = None

def get_history_service() -> HistoryDataService:
    """히스토리 서비스 싱글톤 인스턴스 반환"""
    global _history_service
    if _history_service is None:
        _history_service = HistoryDataService()
    return _history_service 