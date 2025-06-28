import asyncio
import time
import json
import logging
from datetime import datetime
from typing import Dict, Any

# 테스트용 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 성능 최적화 컴포넌트 import
from app.core.buffer_manager import BufferManager, CircularBuffer
from app.core.batch_processor import BatchProcessor, DataBatch
from app.core.performance_monitor import PerformanceMonitor
from app.core.streaming_optimizer import StreamingOptimizer, StreamConfig, StreamPriority, StreamMode

class PerformanceOptimizationTester:
    """성능 최적화 시스템 종합 테스트"""
    
    def __init__(self):
        self.test_results = {}
        self.start_time = time.time()
        
        # 테스트 컴포넌트 초기화
        self.buffer_manager = BufferManager()
        self.batch_processor = BatchProcessor()
        self.performance_monitor = PerformanceMonitor()
        self.streaming_optimizer = StreamingOptimizer()
        
        logger.info("Performance optimization tester initialized")
    
    async def run_all_tests(self):
        """모든 테스트 실행"""
        logger.info("=" * 60)
        logger.info("LINK BAND SDK - PERFORMANCE OPTIMIZATION TESTS")
        logger.info("=" * 60)
        
        # 개별 컴포넌트 테스트
        await self.test_buffer_manager()
        await self.test_batch_processor()
        await self.test_performance_monitor()
        await self.test_streaming_optimizer()
        
        # 통합 테스트
        await self.test_integrated_performance()
        
        # 결과 출력
        self.print_test_summary()
    
    async def test_buffer_manager(self):
        """버퍼 매니저 테스트"""
        logger.info("\n📊 Testing Buffer Manager...")
        
        try:
            # 센서별 버퍼 생성
            sensor_types = ["eeg", "ppg", "acc", "battery"]
            for sensor_type in sensor_types:
                success = self.buffer_manager.create_buffer(sensor_type)
                assert success, f"Failed to create buffer for {sensor_type}"
            
            # 데이터 쓰기 테스트
            test_data_counts = {"eeg": 100, "ppg": 50, "acc": 50, "battery": 10}
            
            for sensor_type, count in test_data_counts.items():
                for i in range(count):
                    test_data = {
                        "timestamp": time.time(),
                        "value": i * 0.1,
                        "sensor": sensor_type
                    }
                    success = self.buffer_manager.write_data(sensor_type, test_data)
                    assert success, f"Failed to write data to {sensor_type} buffer"
            
            # 데이터 읽기 테스트
            total_read = 0
            for sensor_type in sensor_types:
                data = self.buffer_manager.read_data(sensor_type, 10)
                total_read += len(data)
                logger.info(f"  ✅ {sensor_type}: read {len(data)} items")
            
            # 버퍼 상태 확인
            status = self.buffer_manager.get_buffer_status()
            logger.info(f"  📈 Total buffers: {status['total_buffers']}")
            logger.info(f"  💾 Total memory: {status['total_memory_bytes']} bytes")
            
            # 성능 요약
            performance = self.buffer_manager.get_performance_summary()
            logger.info(f"  📊 Total writes: {performance['total_writes']}")
            logger.info(f"  📊 Total reads: {performance['total_reads']}")
            logger.info(f"  📊 Buffer efficiency: {performance['buffer_efficiency']:.2%}")
            
            self.test_results["buffer_manager"] = {
                "status": "PASSED",
                "total_writes": performance['total_writes'],
                "total_reads": performance['total_reads'],
                "efficiency": performance['buffer_efficiency']
            }
            
            logger.info("  ✅ Buffer Manager tests PASSED")
            
        except Exception as e:
            logger.error(f"  ❌ Buffer Manager test failed: {e}")
            self.test_results["buffer_manager"] = {"status": "FAILED", "error": str(e)}
    
    async def test_batch_processor(self):
        """배치 프로세서 테스트"""
        logger.info("\n📦 Testing Batch Processor...")
        
        try:
            # 배치 처리 시작
            await self.batch_processor.start_processing()
            
            # 테스트 데이터 추가
            sensor_data_counts = {"eeg": 75, "ppg": 45, "acc": 45, "battery": 15}
            
            for sensor_type, count in sensor_data_counts.items():
                for i in range(count):
                    test_data = {
                        "timestamp": time.time(),
                        "value": i * 0.5,
                        "sensor": sensor_type,
                        "sequence": i
                    }
                    success = self.batch_processor.add_data(sensor_type, test_data)
                    assert success, f"Failed to add data to batch for {sensor_type}"
                
                # 짧은 대기로 배치 처리 유도
                await asyncio.sleep(0.1)
            
            # 강제 배치 처리
            processed = self.batch_processor.force_process_all()
            logger.info(f"  🔄 Force processed batches: {processed}")
            
            # 배치 상태 확인
            status = self.batch_processor.get_status()
            logger.info(f"  📊 Processing enabled: {status['processing_enabled']}")
            logger.info(f"  📊 Completed batches: {status['completed_batches_count']}")
            
            # 성능 요약
            performance = self.batch_processor.get_performance_summary()
            logger.info(f"  📈 Total batches: {performance['total_batches']}")
            logger.info(f"  📈 Total items: {performance['total_items']}")
            logger.info(f"  📈 Avg batch size: {performance['avg_batch_size']:.1f}")
            logger.info(f"  📈 Compression ratio: {performance['compression_ratio']:.2%}")
            
            await self.batch_processor.stop_processing()
            
            self.test_results["batch_processor"] = {
                "status": "PASSED",
                "total_batches": performance['total_batches'],
                "total_items": performance['total_items'],
                "compression_ratio": performance['compression_ratio']
            }
            
            logger.info("  ✅ Batch Processor tests PASSED")
            
        except Exception as e:
            logger.error(f"  ❌ Batch Processor test failed: {e}")
            self.test_results["batch_processor"] = {"status": "FAILED", "error": str(e)}
    
    async def test_performance_monitor(self):
        """성능 모니터 테스트"""
        logger.info("\n📈 Testing Performance Monitor...")
        
        try:
            # 모니터링 시작
            await self.performance_monitor.start_monitoring()
            
            # 시뮬레이션된 스트리밍 이벤트 기록
            sensor_types = ["eeg", "ppg", "acc", "battery"]
            
            for i in range(20):
                for sensor_type in sensor_types:
                    # 스트리밍 이벤트 시뮬레이션
                    latency = 10 + (i % 5) * 5  # 10-30ms 지연시간
                    bytes_transferred = 100 + (i % 10) * 50  # 100-550 bytes
                    
                    self.performance_monitor.record_streaming_event(
                        sensor_type=sensor_type,
                        data_count=1,
                        latency_ms=latency,
                        bytes_transferred=bytes_transferred
                    )
                
                # 처리 이벤트 시뮬레이션
                self.performance_monitor.record_processing_event(
                    processed_count=len(sensor_types),
                    processing_time_ms=5 + (i % 3) * 2,
                    queue_size=i % 10
                )
                
                await asyncio.sleep(0.05)  # 50ms 간격
            
            # 짧은 대기 후 상태 확인
            await asyncio.sleep(2.0)
            
            # 현재 상태 확인
            status = self.performance_monitor.get_current_status()
            logger.info(f"  📊 Monitoring active: {status['is_monitoring']}")
            logger.info(f"  📊 Snapshots collected: {status['snapshot_count']}")
            
            # 건강 점수 확인
            health = self.performance_monitor.get_health_score()
            logger.info(f"  💚 Health score: {health['overall_score']:.1f}/100")
            logger.info(f"  💚 Health grade: {health['health_grade']}")
            
            # 성능 이력 확인
            history = self.performance_monitor.get_performance_history(5)
            logger.info(f"  📜 Performance history: {len(history)} snapshots")
            
            await self.performance_monitor.stop_monitoring()
            
            self.test_results["performance_monitor"] = {
                "status": "PASSED",
                "health_score": health['overall_score'],
                "health_grade": health['health_grade'],
                "snapshots_collected": status['snapshot_count']
            }
            
            logger.info("  ✅ Performance Monitor tests PASSED")
            
        except Exception as e:
            logger.error(f"  ❌ Performance Monitor test failed: {e}")
            self.test_results["performance_monitor"] = {"status": "FAILED", "error": str(e)}
    
    async def test_streaming_optimizer(self):
        """스트리밍 최적화기 테스트"""
        logger.info("\n🎯 Testing Streaming Optimizer...")
        
        try:
            # 최적화 시작
            await self.streaming_optimizer.start_optimization()
            
            # 센서별 메트릭 시뮬레이션
            sensor_configs = {
                "eeg": {"priority": StreamPriority.HIGH, "base_latency": 15},
                "ppg": {"priority": StreamPriority.NORMAL, "base_latency": 25},
                "acc": {"priority": StreamPriority.NORMAL, "base_latency": 20},
                "battery": {"priority": StreamPriority.LOW, "base_latency": 50}
            }
            
            # 메트릭 업데이트 시뮬레이션
            for iteration in range(30):
                for sensor_type, config in sensor_configs.items():
                    # 지연시간 변동 시뮬레이션
                    base_latency = config["base_latency"]
                    latency_variation = (iteration % 10) * 2
                    current_latency = base_latency + latency_variation
                    
                    # 실제 레이트 시뮬레이션
                    optimal_interval = self.streaming_optimizer.get_optimal_interval(sensor_type)
                    actual_rate = 1.0 / optimal_interval + (iteration % 5) * 0.1
                    
                    # CPU 사용률 시뮬레이션
                    cpu_usage = 30 + (iteration % 20) * 2
                    
                    # 메트릭 업데이트
                    self.streaming_optimizer.update_stream_metrics(
                        sensor_type=sensor_type,
                        latency_ms=current_latency,
                        actual_rate=actual_rate,
                        cpu_usage=cpu_usage
                    )
                
                await asyncio.sleep(0.1)
            
            # 강제 최적화 실행
            optimization_results = self.streaming_optimizer.force_optimize_all()
            logger.info(f"  🔧 Optimization results: {len(optimization_results)} streams adjusted")
            
            for sensor_type, (interval, action) in optimization_results.items():
                logger.info(f"    {sensor_type}: interval={interval:.3f}s, action={action}")
            
            # 최적화 상태 확인
            status = self.streaming_optimizer.get_optimization_status()
            logger.info(f"  📊 Optimization enabled: {status['optimization_enabled']}")
            logger.info(f"  📊 Active streams: {status['global_metrics']['active_streams']}")
            logger.info(f"  📊 Total adjustments: {status['global_metrics']['total_adjustments']}")
            
            # 성능 요약
            performance = self.streaming_optimizer.get_performance_summary()
            logger.info(f"  📈 Average efficiency: {performance['average_efficiency']:.1f}%")
            logger.info(f"  📈 Optimization runs: {performance['optimization_runs']}")
            
            await self.streaming_optimizer.stop_optimization()
            
            self.test_results["streaming_optimizer"] = {
                "status": "PASSED",
                "active_streams": status['global_metrics']['active_streams'],
                "total_adjustments": status['global_metrics']['total_adjustments'],
                "average_efficiency": performance['average_efficiency']
            }
            
            logger.info("  ✅ Streaming Optimizer tests PASSED")
            
        except Exception as e:
            logger.error(f"  ❌ Streaming Optimizer test failed: {e}")
            self.test_results["streaming_optimizer"] = {"status": "FAILED", "error": str(e)}
    
    async def test_integrated_performance(self):
        """통합 성능 테스트"""
        logger.info("\n🔗 Testing Integrated Performance...")
        
        try:
            # 모든 컴포넌트 동시 시작
            await asyncio.gather(
                self.buffer_manager.start_monitoring(),
                self.batch_processor.start_processing(),
                self.performance_monitor.start_monitoring(),
                self.streaming_optimizer.start_optimization()
            )
            
            # 통합 데이터 처리 시뮬레이션
            sensor_types = ["eeg", "ppg", "acc", "battery"]
            total_processed = 0
            
            logger.info("  🚀 Starting integrated simulation...")
            
            for iteration in range(50):
                for sensor_type in sensor_types:
                    # 데이터 생성
                    test_data = {
                        "timestamp": time.time(),
                        "value": iteration * 0.1,
                        "sensor": sensor_type,
                        "iteration": iteration
                    }
                    
                    # 버퍼에 쓰기
                    self.buffer_manager.write_data(sensor_type, test_data)
                    
                    # 배치에 추가
                    self.batch_processor.add_data(sensor_type, test_data)
                    
                    # 성능 메트릭 기록
                    latency = 15 + (iteration % 8) * 3
                    self.performance_monitor.record_streaming_event(
                        sensor_type=sensor_type,
                        data_count=1,
                        latency_ms=latency,
                        bytes_transferred=len(str(test_data))
                    )
                    
                    # 스트리밍 최적화기 업데이트
                    optimal_interval = self.streaming_optimizer.get_optimal_interval(sensor_type)
                    self.streaming_optimizer.update_stream_metrics(
                        sensor_type=sensor_type,
                        latency_ms=latency,
                        actual_rate=1.0 / optimal_interval
                    )
                    
                    total_processed += 1
                
                # 진행 상황 출력
                if iteration % 10 == 0:
                    logger.info(f"    Progress: {iteration}/50 iterations ({total_processed} items processed)")
                
                await asyncio.sleep(0.05)
            
            # 최종 처리
            self.batch_processor.force_process_all()
            await asyncio.sleep(1.0)
            
            # 통합 성능 메트릭 수집
            buffer_perf = self.buffer_manager.get_performance_summary()
            batch_perf = self.batch_processor.get_performance_summary()
            health_score = self.performance_monitor.get_health_score()
            optimizer_perf = self.streaming_optimizer.get_performance_summary()
            
            logger.info(f"  📊 Total data processed: {total_processed} items")
            logger.info(f"  📊 Buffer efficiency: {buffer_perf['buffer_efficiency']:.2%}")
            logger.info(f"  📊 Batch compression: {batch_perf['compression_ratio']:.2%}")
            logger.info(f"  📊 System health: {health_score['overall_score']:.1f}/100")
            logger.info(f"  📊 Stream efficiency: {optimizer_perf['average_efficiency']:.1f}%")
            
            # 모든 컴포넌트 정리
            await asyncio.gather(
                self.buffer_manager.stop_monitoring(),
                self.batch_processor.stop_processing(),
                self.performance_monitor.stop_monitoring(),
                self.streaming_optimizer.stop_optimization()
            )
            
            self.test_results["integrated_performance"] = {
                "status": "PASSED",
                "total_processed": total_processed,
                "buffer_efficiency": buffer_perf['buffer_efficiency'],
                "compression_ratio": batch_perf['compression_ratio'],
                "health_score": health_score['overall_score'],
                "stream_efficiency": optimizer_perf['average_efficiency']
            }
            
            logger.info("  ✅ Integrated Performance tests PASSED")
            
        except Exception as e:
            logger.error(f"  ❌ Integrated Performance test failed: {e}")
            self.test_results["integrated_performance"] = {"status": "FAILED", "error": str(e)}
    
    def print_test_summary(self):
        """테스트 결과 요약 출력"""
        total_time = time.time() - self.start_time
        
        logger.info("\n" + "=" * 60)
        logger.info("PERFORMANCE OPTIMIZATION TEST SUMMARY")
        logger.info("=" * 60)
        
        passed_tests = 0
        total_tests = len(self.test_results)
        
        for test_name, result in self.test_results.items():
            status = result["status"]
            status_icon = "✅" if status == "PASSED" else "❌"
            
            logger.info(f"{status_icon} {test_name.replace('_', ' ').title()}: {status}")
            
            if status == "PASSED":
                passed_tests += 1
                
                # 주요 메트릭 출력
                if test_name == "buffer_manager":
                    logger.info(f"    Writes: {result['total_writes']}, Reads: {result['total_reads']}")
                    logger.info(f"    Efficiency: {result['efficiency']:.2%}")
                
                elif test_name == "batch_processor":
                    logger.info(f"    Batches: {result['total_batches']}, Items: {result['total_items']}")
                    logger.info(f"    Compression: {result['compression_ratio']:.2%}")
                
                elif test_name == "performance_monitor":
                    logger.info(f"    Health Score: {result['health_score']:.1f}/100")
                    logger.info(f"    Health Grade: {result['health_grade']}")
                
                elif test_name == "streaming_optimizer":
                    logger.info(f"    Active Streams: {result['active_streams']}")
                    logger.info(f"    Efficiency: {result['average_efficiency']:.1f}%")
                
                elif test_name == "integrated_performance":
                    logger.info(f"    Total Processed: {result['total_processed']} items")
                    logger.info(f"    Overall Health: {result['health_score']:.1f}/100")
            else:
                logger.info(f"    Error: {result.get('error', 'Unknown error')}")
        
        logger.info("\n" + "-" * 60)
        logger.info(f"RESULTS: {passed_tests}/{total_tests} tests passed")
        logger.info(f"EXECUTION TIME: {total_time:.2f} seconds")
        
        if passed_tests == total_tests:
            logger.info("🎉 ALL PERFORMANCE OPTIMIZATION TESTS PASSED!")
            logger.info("✨ Priority 3: Performance Optimization - COMPLETED")
        else:
            logger.info("⚠️  Some tests failed. Please review the errors above.")
        
        logger.info("=" * 60)

async def main():
    """메인 테스트 함수"""
    tester = PerformanceOptimizationTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 