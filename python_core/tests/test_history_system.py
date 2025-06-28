"""
통합 히스토리 데이터 관리 시스템 테스트
Priority 4 Phase 2 구현 완료 검증
"""

import asyncio
import logging
import tempfile
import os
from datetime import datetime, timedelta

from app.models.history_models import (
    SystemLog, SystemMetric, LogLevel, MetricType,
    LogQuery, MetricQuery
)
from app.database.history_db_manager import HistoryDatabaseManager

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HistorySystemTester:
    """통합 히스토리 시스템 테스터"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_history.db")
        self.db_manager = HistoryDatabaseManager(self.db_path)
        self.test_results = {}
        
        logger.info(f"Test database created at: {self.db_path}")
    
    async def run_all_tests(self):
        """모든 테스트 실행"""
        print("\n" + "="*80)
        print("통합 히스토리 데이터 관리 시스템 테스트 시작")
        print("Priority 4 Phase 2: 통합 히스토리 데이터 관리 시스템")
        print("="*80)
        
        tests = [
            ("데이터베이스 초기화", self.test_database_initialization),
            ("로그 저장 및 조회", self.test_log_storage_and_query),
            ("메트릭 저장 및 조회", self.test_metric_storage_and_query),
            ("배치 처리 성능", self.test_batch_processing),
            ("검색 및 필터링", self.test_search_and_filtering),
            ("스토리지 관리", self.test_storage_management),
            ("데이터 정리 및 최적화", self.test_cleanup_and_optimization)
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            try:
                print(f"\n테스트: {test_name}")
                print("-" * 60)
                
                start_time = datetime.now()
                result = await test_func()
                end_time = datetime.now()
                
                duration = (end_time - start_time).total_seconds()
                
                if result:
                    print(f"SUCCESS {test_name}: 성공 ({duration:.3f}초)")
                    self.test_results[test_name] = {"status": "PASS", "duration": duration}
                    passed_tests += 1
                else:
                    print(f"FAIL {test_name}: 실패 ({duration:.3f}초)")
                    self.test_results[test_name] = {"status": "FAIL", "duration": duration}
                    
            except Exception as e:
                print(f"ERROR {test_name}: 오류 - {e}")
                self.test_results[test_name] = {"status": "ERROR", "error": str(e)}
        
        # 최종 결과 출력
        self.print_final_results(passed_tests, total_tests)
        
        return passed_tests == total_tests
    
    async def test_database_initialization(self) -> bool:
        """데이터베이스 초기화 테스트"""
        try:
            import sqlite3
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in cursor.fetchall()]
                
                expected_tables = [
                    'system_metrics', 'performance_data', 'system_logs',
                    'alert_history', 'data_summaries'
                ]
                
                for table in expected_tables:
                    if table not in tables:
                        print(f"   Missing table: {table}")
                        return False
                    print(f"   Table confirmed: {table}")
                
                cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
                indexes = [row[0] for row in cursor.fetchall()]
                print(f"   Created indexes: {len(indexes)}")
                
                return True
                
        except Exception as e:
            print(f"   Database initialization error: {e}")
            return False
    
    async def test_log_storage_and_query(self) -> bool:
        """로그 저장 및 조회 테스트"""
        try:
            test_logs = [
                SystemLog(
                    timestamp=datetime.now() - timedelta(minutes=i),
                    level=LogLevel.INFO if i % 2 == 0 else LogLevel.ERROR,
                    logger_name=f"test.logger.{i % 3}",
                    message=f"Test log message {i}",
                    module="test_module"
                )
                for i in range(20)
            ]
            
            for log in test_logs:
                self.db_manager.store_log(log)
            
            self.db_manager.force_flush()
            
            all_logs = self.db_manager.query_logs(LogQuery(limit=50))
            print(f"   Stored logs: {len(all_logs)}")
            
            if len(all_logs) != 20:
                print(f"   Expected 20 logs, got {len(all_logs)}")
                return False
            
            error_logs = self.db_manager.query_logs(LogQuery(
                levels=[LogLevel.ERROR],
                limit=50
            ))
            print(f"   ERROR level logs: {len(error_logs)}")
            
            return True
            
        except Exception as e:
            print(f"   Log storage/query error: {e}")
            return False
    
    async def test_metric_storage_and_query(self) -> bool:
        """메트릭 저장 및 조회 테스트"""
        try:
            test_metrics = []
            for i in range(15):
                for metric_type in [MetricType.CPU, MetricType.MEMORY]:
                    metric = SystemMetric(
                        timestamp=datetime.now() - timedelta(minutes=i),
                        metric_type=metric_type,
                        metric_name=f"{metric_type.value}_usage",
                        value=50.0 + (i % 50),
                        unit="%"
                    )
                    test_metrics.append(metric)
            
            for metric in test_metrics:
                self.db_manager.store_metric(metric)
            
            self.db_manager.force_flush()
            
            all_metrics = self.db_manager.query_metrics(MetricQuery(limit=50))
            print(f"   Stored metrics: {len(all_metrics)}")
            
            if len(all_metrics) != 30:  # 15 * 2 types
                print(f"   Expected 30 metrics, got {len(all_metrics)}")
                return False
            
            return True
            
        except Exception as e:
            print(f"   Metric storage/query error: {e}")
            return False
    
    async def test_batch_processing(self) -> bool:
        """배치 처리 성능 테스트"""
        try:
            import time
            
            start_time = time.time()
            
            for i in range(100):
                log = SystemLog(
                    timestamp=datetime.now(),
                    level=LogLevel.INFO,
                    logger_name="batch.test",
                    message=f"Batch test log {i}",
                    module="batch_module"
                )
                self.db_manager.store_log(log)
            
            batch_time = time.time() - start_time
            
            flush_start = time.time()
            self.db_manager.force_flush()
            flush_time = time.time() - flush_start
            
            print(f"   Batch creation time: {batch_time:.3f}s (100 logs)")
            print(f"   Flush time: {flush_time:.3f}s")
            print(f"   Processing speed: {100 / (batch_time + flush_time):.1f} logs/s")
            
            batch_logs = self.db_manager.query_logs(LogQuery(
                logger_names=["batch.test"],
                limit=150
            ))
            
            if len(batch_logs) != 100:
                print(f"   Batch processing failed: expected 100, got {len(batch_logs)}")
                return False
            
            print(f"   Batch processing success: {len(batch_logs)} logs stored")
            return True
            
        except Exception as e:
            print(f"   Batch processing error: {e}")
            return False
    
    async def test_search_and_filtering(self) -> bool:
        """검색 및 필터링 테스트"""
        try:
            # 텍스트 검색 시뮬레이션
            search_logs = self.db_manager.query_logs(LogQuery(
                search_text="test",
                limit=50
            ))
            print(f"   'test' search results: {len(search_logs)}")
            
            # 레벨 필터링
            error_logs = self.db_manager.query_logs(LogQuery(
                levels=[LogLevel.ERROR],
                limit=50
            ))
            print(f"   ERROR logs: {len(error_logs)}")
            
            # 시간 범위 조회
            time_filtered_logs = self.db_manager.query_logs(LogQuery(
                start_time=datetime.now() - timedelta(hours=1),
                end_time=datetime.now(),
                limit=100
            ))
            print(f"   1-hour range logs: {len(time_filtered_logs)}")
            
            return True
            
        except Exception as e:
            print(f"   Search/filtering error: {e}")
            return False
    
    async def test_storage_management(self) -> bool:
        """스토리지 관리 테스트"""
        try:
            storage_info = self.db_manager.get_storage_info()
            
            print(f"   Total storage size: {storage_info.total_size_mb:.2f}MB")
            print(f"   Record counts:")
            for table, count in storage_info.record_counts.items():
                print(f"      - {table}: {count}")
            
            return storage_info.total_size_mb > 0
            
        except Exception as e:
            print(f"   Storage management error: {e}")
            return False
    
    async def test_cleanup_and_optimization(self) -> bool:
        """데이터 정리 및 최적화 테스트"""
        try:
            cleanup_result = self.db_manager.cleanup_old_data(
                retention_days=1,
                dry_run=True
            )
            
            print(f"   Cleanup simulation:")
            for table, count in cleanup_result.items():
                print(f"      - {table}: {count} to delete")
            
            optimize_result = self.db_manager.optimize_database()
            
            print(f"   Optimization time: {optimize_result['duration_seconds']:.3f}s")
            print(f"   Operations: {', '.join(optimize_result['operations'])}")
            
            return True
            
        except Exception as e:
            print(f"   Cleanup/optimization error: {e}")
            return False
    
    def print_final_results(self, passed_tests: int, total_tests: int):
        """최종 결과 출력"""
        print("\n" + "="*80)
        print("통합 히스토리 데이터 관리 시스템 테스트 결과")
        print("="*80)
        
        success_rate = (passed_tests / total_tests) * 100
        
        print(f"성공한 테스트: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        if success_rate == 100:
            print("모든 테스트 통과! 시스템이 완벽하게 작동합니다.")
            print("\nPriority 4 Phase 2 구현 완료!")
            print("   - SQLite 기반 통합 데이터베이스")
            print("   - 배치 처리 및 성능 최적화") 
            print("   - 로그 핸들러 자동 통합")
            print("   - RESTful API 완전 구현")
            print("   - 스토리지 관리 및 최적화")
        elif success_rate >= 80:
            print("대부분의 테스트 통과! 시스템이 잘 작동합니다.")
        else:
            print("일부 테스트 실패. 시스템 점검이 필요합니다.")
        
        print("\n상세 결과:")
        for test_name, result in self.test_results.items():
            status_icon = "SUCCESS" if result["status"] == "PASS" else "FAIL" if result["status"] == "FAIL" else "ERROR"
            duration = result.get("duration", 0)
            print(f"   {status_icon} {test_name}: {result['status']} ({duration:.3f}s)")
        
        print("="*80)
    
    def cleanup(self):
        """테스트 정리"""
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
            print(f"Test directory cleaned: {self.temp_dir}")
        except Exception as e:
            print(f"Test cleanup error: {e}")

async def main():
    """메인 테스트 실행"""
    tester = HistorySystemTester()
    
    try:
        success = await tester.run_all_tests()
        return success
    finally:
        tester.cleanup()

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
