"""
통합 히스토리 데이터 관리를 위한 데이터베이스 매니저
SQLite 기반 고성능 데이터 저장 및 조회 시스템
"""

import sqlite3
import json
import logging
import os
import gzip
import shutil
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Union, Tuple
from pathlib import Path
import threading
import asyncio
from contextlib import asynccontextmanager
import aiosqlite

from ..models.history_models import (
    SystemMetric, PerformanceData, SystemLog, AlertHistory, DataSummary,
    MetricType, ComponentType, LogLevel, AlertCategory, SummaryType,
    MetricQuery, LogQuery, TrendQuery, HistoryStats, StorageInfo
)

logger = logging.getLogger(__name__)

class HistoryDatabaseManager:
    """통합 히스토리 데이터베이스 매니저"""
    
    def __init__(self, db_path: str = "database/history.db"):
        self.db_path = db_path
        self.archive_path = "database/archives"
        self._lock = threading.Lock()
        self._batch_buffer = {
            'metrics': [],
            'performance': [],
            'logs': [],
            'alerts': [],
            'summaries': []
        }
        self._batch_size = 1000
        self._last_flush = datetime.now()
        self._flush_interval = timedelta(seconds=30)
        
        # 데이터베이스 초기화
        self._ensure_database_exists()
        self._create_tables()
        self._create_indexes()
    
    def _ensure_database_exists(self):
        """데이터베이스 디렉토리 및 파일 확인"""
        db_dir = os.path.dirname(self.db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
        
        archive_dir = Path(self.archive_path)
        archive_dir.mkdir(parents=True, exist_ok=True)
    
    def _create_tables(self):
        """데이터베이스 테이블 생성"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 시스템 메트릭 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    metric_type TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    value REAL NOT NULL,
                    unit TEXT,
                    tags TEXT,  -- JSON
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 성능 데이터 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS performance_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    component TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    duration_ms REAL,
                    throughput REAL,
                    efficiency_percent REAL,
                    error_count INTEGER DEFAULT 0,
                    metadata TEXT,  -- JSON
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 시스템 로그 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    level TEXT NOT NULL,
                    logger_name TEXT NOT NULL,
                    message TEXT NOT NULL,
                    module TEXT,
                    function_name TEXT,
                    line_number INTEGER,
                    thread_id INTEGER,
                    process_id INTEGER,
                    extra_data TEXT,  -- JSON
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 알림 히스토리 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alert_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME NOT NULL,
                    alert_id TEXT NOT NULL,
                    level TEXT NOT NULL,
                    category TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    source_component TEXT,
                    acknowledged_at DATETIME,
                    resolved_at DATETIME,
                    metadata TEXT,  -- JSON
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 데이터 요약 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS data_summaries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    summary_type TEXT NOT NULL,
                    timestamp DATETIME NOT NULL,
                    data_type TEXT NOT NULL,
                    summary_data TEXT NOT NULL,  -- JSON
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            logger.info("Database tables created successfully")
    
    def _create_indexes(self):
        """성능 최적화를 위한 인덱스 생성"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 시간 기반 인덱스 (가장 중요)
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON system_metrics(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_data(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alert_history(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_summaries_timestamp ON data_summaries(timestamp)",
                
                # 타입 기반 인덱스
                "CREATE INDEX IF NOT EXISTS idx_metrics_type ON system_metrics(metric_type, metric_name)",
                "CREATE INDEX IF NOT EXISTS idx_performance_component ON performance_data(component, operation)",
                "CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level, logger_name)",
                "CREATE INDEX IF NOT EXISTS idx_alerts_category ON alert_history(category, level)",
                
                # 복합 인덱스
                "CREATE INDEX IF NOT EXISTS idx_metrics_time_type ON system_metrics(timestamp, metric_type)",
                "CREATE INDEX IF NOT EXISTS idx_logs_time_level ON system_logs(timestamp, level)",
                "CREATE INDEX IF NOT EXISTS idx_alerts_time_category ON alert_history(timestamp, category)",
            ]
            
            for index_sql in indexes:
                cursor.execute(index_sql)
            
            conn.commit()
            logger.info("Database indexes created successfully")
    
    # ============================================================================
    # 데이터 저장 메서드 (배치 처리)
    # ============================================================================
    
    def store_metric(self, metric: SystemMetric):
        """메트릭 데이터 저장 (배치 버퍼링)"""
        with self._lock:
            self._batch_buffer['metrics'].append(metric)
            self._check_flush_needed()
    
    def store_performance_data(self, perf_data: PerformanceData):
        """성능 데이터 저장 (배치 버퍼링)"""
        with self._lock:
            self._batch_buffer['performance'].append(perf_data)
            self._check_flush_needed()
    
    def store_log(self, log: SystemLog):
        """로그 데이터 저장 (배치 버퍼링)"""
        with self._lock:
            self._batch_buffer['logs'].append(log)
            self._check_flush_needed()
    
    def store_alert(self, alert: AlertHistory):
        """알림 데이터 저장 (배치 버퍼링)"""
        with self._lock:
            self._batch_buffer['alerts'].append(alert)
            self._check_flush_needed()
    
    def store_summary(self, summary: DataSummary):
        """요약 데이터 저장 (배치 버퍼링)"""
        with self._lock:
            self._batch_buffer['summaries'].append(summary)
            self._check_flush_needed()
    
    def _check_flush_needed(self):
        """플러시 필요성 확인"""
        total_items = sum(len(buffer) for buffer in self._batch_buffer.values())
        time_elapsed = datetime.now() - self._last_flush
        
        if total_items >= self._batch_size or time_elapsed >= self._flush_interval:
            self._flush_buffers()
    
    def _flush_buffers(self):
        """배치 버퍼 플러시"""
        if not any(self._batch_buffer.values()):
            return
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # 메트릭 저장
                if self._batch_buffer['metrics']:
                    metrics_data = [
                        (
                            m.timestamp.isoformat(),
                            m.metric_type.value,
                            m.metric_name,
                            m.value,
                            m.unit,
                            json.dumps(m.tags) if m.tags else None
                        )
                        for m in self._batch_buffer['metrics']
                    ]
                    cursor.executemany("""
                        INSERT INTO system_metrics 
                        (timestamp, metric_type, metric_name, value, unit, tags)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, metrics_data)
                
                # 성능 데이터 저장
                if self._batch_buffer['performance']:
                    perf_data = [
                        (
                            p.timestamp.isoformat(),
                            p.component.value,
                            p.operation,
                            p.duration_ms,
                            p.throughput,
                            p.efficiency_percent,
                            p.error_count,
                            json.dumps(p.metadata) if p.metadata else None
                        )
                        for p in self._batch_buffer['performance']
                    ]
                    cursor.executemany("""
                        INSERT INTO performance_data 
                        (timestamp, component, operation, duration_ms, throughput, 
                         efficiency_percent, error_count, metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, perf_data)
                
                # 로그 저장
                if self._batch_buffer['logs']:
                    logs_data = [
                        (
                            l.timestamp.isoformat(),
                            l.level.value,
                            l.logger_name,
                            l.message,
                            l.module,
                            l.function_name,
                            l.line_number,
                            l.thread_id,
                            l.process_id,
                            json.dumps(l.extra_data) if l.extra_data else None
                        )
                        for l in self._batch_buffer['logs']
                    ]
                    cursor.executemany("""
                        INSERT INTO system_logs 
                        (timestamp, level, logger_name, message, module, 
                         function_name, line_number, thread_id, process_id, extra_data)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, logs_data)
                
                # 알림 저장
                if self._batch_buffer['alerts']:
                    alerts_data = [
                        (
                            a.timestamp.isoformat(),
                            a.alert_id,
                            a.level.value,
                            a.category.value,
                            a.title,
                            a.description,
                            a.source_component,
                            a.acknowledged_at.isoformat() if a.acknowledged_at else None,
                            a.resolved_at.isoformat() if a.resolved_at else None,
                            json.dumps(a.metadata) if a.metadata else None
                        )
                        for a in self._batch_buffer['alerts']
                    ]
                    cursor.executemany("""
                        INSERT INTO alert_history 
                        (timestamp, alert_id, level, category, title, description,
                         source_component, acknowledged_at, resolved_at, metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, alerts_data)
                
                # 요약 저장
                if self._batch_buffer['summaries']:
                    summaries_data = [
                        (
                            s.summary_type.value,
                            s.timestamp.isoformat(),
                            s.data_type,
                            json.dumps(s.summary_data)
                        )
                        for s in self._batch_buffer['summaries']
                    ]
                    cursor.executemany("""
                        INSERT INTO data_summaries 
                        (summary_type, timestamp, data_type, summary_data)
                        VALUES (?, ?, ?, ?)
                    """, summaries_data)
                
                conn.commit()
                
                # 버퍼 초기화
                for buffer in self._batch_buffer.values():
                    buffer.clear()
                
                self._last_flush = datetime.now()
                logger.debug(f"Flushed batch data to database")
                
        except Exception as e:
            logger.error(f"Failed to flush batch data: {e}")
    
    def force_flush(self):
        """강제 플러시"""
        with self._lock:
            self._flush_buffers()
    
    # ============================================================================
    # 데이터 조회 메서드
    # ============================================================================
    
    def query_metrics(self, query: MetricQuery) -> List[SystemMetric]:
        """메트릭 조회"""
        self.force_flush()  # 최신 데이터 반영
        
        sql = "SELECT * FROM system_metrics WHERE 1=1"
        params = []
        
        if query.start_time:
            sql += " AND timestamp >= ?"
            params.append(query.start_time.isoformat())
        
        if query.end_time:
            sql += " AND timestamp <= ?"
            params.append(query.end_time.isoformat())
        
        if query.metric_types:
            placeholders = ','.join(['?' for _ in query.metric_types])
            sql += f" AND metric_type IN ({placeholders})"
            params.extend([mt.value for mt in query.metric_types])
        
        if query.metric_names:
            placeholders = ','.join(['?' for _ in query.metric_names])
            sql += f" AND metric_name IN ({placeholders})"
            params.extend(query.metric_names)
        
        sql += " ORDER BY timestamp DESC"
        sql += f" LIMIT {query.limit} OFFSET {query.offset}"
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql, params)
            
            results = []
            for row in cursor.fetchall():
                metric = SystemMetric(
                    id=row['id'],
                    timestamp=datetime.fromisoformat(row['timestamp']),
                    metric_type=MetricType(row['metric_type']),
                    metric_name=row['metric_name'],
                    value=row['value'],
                    unit=row['unit'],
                    tags=json.loads(row['tags']) if row['tags'] else None,
                    created_at=datetime.fromisoformat(row['created_at'])
                )
                results.append(metric)
            
            return results
    
    def query_logs(self, query: LogQuery) -> List[SystemLog]:
        """로그 조회"""
        self.force_flush()
        
        sql = "SELECT * FROM system_logs WHERE 1=1"
        params = []
        
        if query.start_time:
            sql += " AND timestamp >= ?"
            params.append(query.start_time.isoformat())
        
        if query.end_time:
            sql += " AND timestamp <= ?"
            params.append(query.end_time.isoformat())
        
        if query.levels:
            placeholders = ','.join(['?' for _ in query.levels])
            sql += f" AND level IN ({placeholders})"
            params.extend([level.value for level in query.levels])
        
        if query.logger_names:
            placeholders = ','.join(['?' for _ in query.logger_names])
            sql += f" AND logger_name IN ({placeholders})"
            params.extend(query.logger_names)
        
        if query.search_text:
            sql += " AND message LIKE ?"
            params.append(f"%{query.search_text}%")
        
        if query.modules:
            placeholders = ','.join(['?' for _ in query.modules])
            sql += f" AND module IN ({placeholders})"
            params.extend(query.modules)
        
        sql += " ORDER BY timestamp DESC"
        sql += f" LIMIT {query.limit} OFFSET {query.offset}"
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql, params)
            
            results = []
            for row in cursor.fetchall():
                log = SystemLog(
                    id=row['id'],
                    timestamp=datetime.fromisoformat(row['timestamp']),
                    level=LogLevel(row['level']),
                    logger_name=row['logger_name'],
                    message=row['message'],
                    module=row['module'],
                    function_name=row['function_name'],
                    line_number=row['line_number'],
                    thread_id=row['thread_id'],
                    process_id=row['process_id'],
                    extra_data=json.loads(row['extra_data']) if row['extra_data'] else None,
                    created_at=datetime.fromisoformat(row['created_at'])
                )
                results.append(log)
            
            return results
    
    def get_history_stats(self) -> HistoryStats:
        """히스토리 통계 조회"""
        self.force_flush()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 전체 레코드 수
            cursor.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM system_metrics) as metrics_count,
                    (SELECT COUNT(*) FROM performance_data) as performance_count,
                    (SELECT COUNT(*) FROM system_logs) as logs_count,
                    (SELECT COUNT(*) FROM alert_history) as alerts_count,
                    (SELECT COUNT(*) FROM data_summaries) as summaries_count
            """)
            counts = cursor.fetchone()
            total_records = sum(counts)
            
            # 날짜 범위
            cursor.execute("""
                SELECT 
                    MIN(timestamp) as min_date,
                    MAX(timestamp) as max_date
                FROM (
                    SELECT timestamp FROM system_metrics
                    UNION ALL
                    SELECT timestamp FROM performance_data
                    UNION ALL
                    SELECT timestamp FROM system_logs
                    UNION ALL
                    SELECT timestamp FROM alert_history
                )
            """)
            date_range_row = cursor.fetchone()
            
            # 로그 레벨별 통계
            cursor.execute("""
                SELECT level, COUNT(*) as count 
                FROM system_logs 
                GROUP BY level
            """)
            level_counts = {LogLevel(row[0]): row[1] for row in cursor.fetchall()}
            
            # 파일 크기 계산
            db_size = os.path.getsize(self.db_path) / (1024 * 1024)  # MB
            
            return HistoryStats(
                total_records=total_records,
                date_range={
                    'start': datetime.fromisoformat(date_range_row[0]) if date_range_row[0] else datetime.now(),
                    'end': datetime.fromisoformat(date_range_row[1]) if date_range_row[1] else datetime.now()
                },
                data_type_counts={
                    'metrics': counts[0],
                    'performance': counts[1],
                    'logs': counts[2],
                    'alerts': counts[3],
                    'summaries': counts[4]
                },
                level_counts=level_counts,
                component_counts={},  # TODO: 구현
                storage_size_mb=db_size
            )
    
    # ============================================================================
    # 데이터 관리 메서드
    # ============================================================================
    
    def cleanup_old_data(self, retention_days: int = 30, dry_run: bool = True) -> Dict[str, int]:
        """오래된 데이터 정리"""
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        deleted_counts = {}
        
        tables = [
            'system_metrics',
            'performance_data', 
            'system_logs',
            'alert_history',
            'data_summaries'
        ]
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            for table in tables:
                # 삭제될 레코드 수 확인
                cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE timestamp < ?", 
                             (cutoff_date.isoformat(),))
                count = cursor.fetchone()[0]
                deleted_counts[table] = count
                
                # 실제 삭제 (dry_run이 False인 경우)
                if not dry_run and count > 0:
                    cursor.execute(f"DELETE FROM {table} WHERE timestamp < ?", 
                                 (cutoff_date.isoformat(),))
            
            if not dry_run:
                conn.commit()
                # VACUUM으로 공간 회수
                cursor.execute("VACUUM")
                logger.info(f"Cleaned up old data: {deleted_counts}")
        
        return deleted_counts
    
    def optimize_database(self) -> Dict[str, Any]:
        """데이터베이스 최적화"""
        start_time = datetime.now()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 통계 업데이트
            cursor.execute("ANALYZE")
            
            # 인덱스 재구성
            cursor.execute("REINDEX")
            
            # 공간 회수
            cursor.execute("VACUUM")
            
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        result = {
            'duration_seconds': duration,
            'completed_at': end_time.isoformat(),
            'operations': ['ANALYZE', 'REINDEX', 'VACUUM']
        }
        
        logger.info(f"Database optimization completed in {duration:.2f} seconds")
        return result
    
    def get_storage_info(self) -> StorageInfo:
        """스토리지 정보 조회"""
        self.force_flush()
        
        if not os.path.exists(self.db_path):
            return StorageInfo(
                total_size_mb=0.0,
                data_type_sizes={},
                oldest_record=None,
                newest_record=None,
                record_counts={},
                compression_ratio=0.0
            )
        
        db_size = os.path.getsize(self.db_path) / (1024 * 1024)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            tables = ['system_metrics', 'performance_data', 'system_logs', 'alert_history', 'data_summaries']
            record_counts = {}
            
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    record_counts[table] = cursor.fetchone()[0]
                except:
                    record_counts[table] = 0
        
        return StorageInfo(
            total_size_mb=db_size,
            data_type_sizes={'database': db_size},
            oldest_record=None,
            newest_record=None,
            record_counts=record_counts,
            compression_ratio=0.0
        )
    
    def close(self):
        """데이터베이스 연결 종료"""
        self.force_flush()
        logger.info("History database manager closed") 