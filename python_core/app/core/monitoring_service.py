import asyncio
import json
import time
import psutil
from datetime import datetime
from typing import Dict, Any, Optional, List
import logging

from .performance_monitor import global_performance_monitor
from .buffer_manager import global_buffer_manager
from .batch_processor import global_batch_processor
from .streaming_optimizer import global_streaming_optimizer
from .alert_manager import global_alert_manager, Alert

logger = logging.getLogger(__name__)

class MonitoringService:
    def __init__(self, websocket_server=None):
        self.ws_server = websocket_server
        self.performance_monitor = global_performance_monitor
        self.buffer_manager = global_buffer_manager
        self.batch_processor = global_batch_processor
        self.streaming_optimizer = global_streaming_optimizer
        self.alert_manager = global_alert_manager
        
        # 모니터링 상태
        self.is_monitoring = False
        self.monitoring_tasks = []
        
        # 모니터링 간격 설정
        self.intervals = {
            'metrics': 1.0,      # 1초마다 메트릭 브로드캐스트
            'health': 10.0,      # 10초마다 건강 점수 업데이트
            'buffer': 5.0,       # 5초마다 버퍼 상태 업데이트
            'alerts': 2.0        # 2초마다 알림 체크
        }
        
        # 마지막 메트릭 캐시
        self.last_metrics = {}
        self.last_health_data = {}
        self.last_buffer_data = {}
        
        logger.info("MonitoringService initialized")
    
    async def start_monitoring(self):
        """모니터링 서비스 시작"""
        if self.is_monitoring:
            logger.warning("[MONITORING_SERVICE] Monitoring service is already running")
            return
        
        if not self.ws_server:
            logger.error("[MONITORING_SERVICE] WebSocket server not available for monitoring")
            return
        
        logger.info(f"[MONITORING_SERVICE] Starting monitoring service with ws_server: {self.ws_server}")
        logger.info(f"[MONITORING_SERVICE] performance_monitor: {self.performance_monitor}")
        logger.info(f"[MONITORING_SERVICE] buffer_manager: {self.buffer_manager}")
        logger.info(f"[MONITORING_SERVICE] streaming_optimizer: {self.streaming_optimizer}")
        
        self.is_monitoring = True
        logger.info("[MONITORING_SERVICE] Setting is_monitoring = True")
        
        try:
            # 각 모니터링 태스크를 개별적으로 시작
            logger.info("[MONITORING_SERVICE] Creating monitoring tasks...")
            self.monitoring_tasks = [
                asyncio.create_task(self._metrics_broadcaster()),
                asyncio.create_task(self._health_updater()),
                asyncio.create_task(self._buffer_monitor()),
                asyncio.create_task(self._alert_monitor())
            ]
            logger.info(f"[MONITORING_SERVICE] Created {len(self.monitoring_tasks)} monitoring tasks")
            logger.info(f"[MONITORING_SERVICE] Task details: {[str(task) for task in self.monitoring_tasks]}")
        except Exception as e:
            logger.error(f"[MONITORING_SERVICE] Error starting monitoring service: {e}")
            self.is_monitoring = False
    
    async def stop_monitoring(self):
        """모니터링 서비스 중지"""
        if not self.is_monitoring:
            return
        
        logger.info("Stopping monitoring service...")
        self.is_monitoring = False
        
        # 모든 모니터링 태스크 취소
        for task in self.monitoring_tasks:
            if isinstance(task, asyncio.Task) and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        self.monitoring_tasks.clear()
        logger.info("Monitoring service stopped")
    
    async def _metrics_broadcaster(self):
        """1초마다 성능 메트릭 브로드캐스트"""
        logger.info("[MONITORING_TASK] Starting metrics broadcaster...")
        
        while self.is_monitoring:
            try:
                logger.info("[MONITORING_TASK] Collecting metrics...")
                metrics = await self._collect_metrics()
                logger.info(f"[MONITORING_TASK] Collected metrics: {len(str(metrics))} chars")
                
                if metrics:
                    logger.info(f"[MONITORING_TASK] Broadcasting monitoring_metrics: {len(str(metrics))} chars")
                    await self._broadcast_monitoring_message("monitoring_metrics", metrics)
                    self.last_metrics = metrics
                else:
                    logger.warning("[MONITORING_TASK] No metrics collected - skipping broadcast")
                
                await asyncio.sleep(self.intervals['metrics'])
                
            except asyncio.CancelledError:
                logger.info("[MONITORING_TASK] Metrics broadcaster cancelled")
                break
            except Exception as e:
                logger.error(f"[MONITORING_TASK] Error in metrics broadcaster: {e}")
                await asyncio.sleep(1.0)  # 에러 시 잠시 대기
    
    async def _health_updater(self):
        """10초마다 시스템 건강 점수 업데이트"""
        logger.info("Starting health updater...")
        
        while self.is_monitoring:
            try:
                health_data = await self._collect_health_data()
                
                if health_data:
                    await self._broadcast_monitoring_message("health_updates", health_data)
                    self.last_health_data = health_data
                
                await asyncio.sleep(self.intervals['health'])
                
            except asyncio.CancelledError:
                logger.info("Health updater cancelled")
                break
            except Exception as e:
                logger.error(f"Error in health updater: {e}")
                await asyncio.sleep(2.0)
    
    async def _buffer_monitor(self):
        """5초마다 버퍼 상태 모니터링"""
        logger.info("Starting buffer monitor...")
        
        while self.is_monitoring:
            try:
                buffer_data = await self._collect_buffer_data()
                
                if buffer_data:
                    await self._broadcast_monitoring_message("buffer_status", buffer_data)
                    self.last_buffer_data = buffer_data
                
                await asyncio.sleep(self.intervals['buffer'])
                
            except asyncio.CancelledError:
                logger.info("Buffer monitor cancelled")
                break
            except Exception as e:
                logger.error(f"Error in buffer monitor: {e}")
                await asyncio.sleep(1.0)
    
    async def _alert_monitor(self):
        """2초마다 알림 체크"""
        logger.info("Starting alert monitor...")
        
        while self.is_monitoring:
            try:
                # 최신 메트릭으로 알림 체크
                if self.last_metrics:
                    alerts = self.alert_manager.check_thresholds(self.last_metrics)
                    
                    # 새로운 알림이 있으면 브로드캐스트
                    for alert in alerts:
                        await self._broadcast_alert(alert)
                
                await asyncio.sleep(self.intervals['alerts'])
                
            except asyncio.CancelledError:
                logger.info("Alert monitor cancelled")
                break
            except Exception as e:
                logger.error(f"Error in alert monitor: {e}")
                await asyncio.sleep(1.0)
    
    async def _collect_metrics(self) -> Dict[str, Any]:
        """성능 메트릭 수집"""
        try:
            logger.debug("Collecting system metrics...")
            # 시스템 메트릭
            system_metrics = {
                'cpu_percent': psutil.cpu_percent(interval=0.1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_io': {
                    'read': psutil.disk_io_counters().read_bytes if psutil.disk_io_counters() else 0,
                    'write': psutil.disk_io_counters().write_bytes if psutil.disk_io_counters() else 0
                }
            }
            logger.debug(f"System metrics: {system_metrics}")
            
            # 스트리밍 메트릭
            streaming_metrics = {}
            if self.streaming_optimizer:
                try:
                    # 각 센서별 처리량 계산
                    streaming_metrics = {
                        'eeg_throughput': self._calculate_throughput('eeg'),
                        'ppg_throughput': self._calculate_throughput('ppg'),
                        'acc_throughput': self._calculate_throughput('acc'),
                        'total_latency': self._calculate_average_latency()
                    }
                except Exception as e:
                    logger.debug(f"Error collecting streaming metrics: {e}")
                    streaming_metrics = {
                        'eeg_throughput': 0.0,
                        'ppg_throughput': 0.0,
                        'acc_throughput': 0.0,
                        'total_latency': 0.0
                    }
            
            # 시스템 건강 점수
            health_score = 75.0  # 기본값으로 설정
            if self.performance_monitor:
                try:
                    health_result = self.performance_monitor.get_health_score()
                    logger.debug(f"Got health result from performance_monitor: {health_result}, type: {type(health_result)}")
                    
                    # health_result가 딕셔너리인 경우 overall_score 추출
                    if isinstance(health_result, dict):
                        health_score = health_result.get('overall_score', 75.0)
                    elif isinstance(health_result, (int, float)):
                        health_score = float(health_result)
                    else:
                        logger.warning(f"Unexpected health_score type: {type(health_result)}, using default")
                        health_score = 75.0
                        
                    logger.debug(f"Final health_score: {health_score}")
                except Exception as e:
                    logger.debug(f"Error getting health score: {e}")
                    health_score = 75.0
            else:
                logger.debug("performance_monitor not available, using default health score")
            
            result = {
                'system': system_metrics,
                'streaming': streaming_metrics,
                'health_score': {
                    'overall_score': health_score,
                    'health_grade': self._get_status_from_score(health_score).lower()
                }
            }
            logger.debug(f"Final metrics result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
            return {}
    
    async def _collect_health_data(self) -> Dict[str, Any]:
        """시스템 건강 데이터 수집"""
        try:
            if not self.performance_monitor:
                return {}
            
            health_result = self.performance_monitor.get_health_score()
            
            # health_result가 딕셔너리인 경우 overall_score 추출
            if isinstance(health_result, dict):
                health_score = health_result.get('overall_score', 75.0)
            elif isinstance(health_result, (int, float)):
                health_score = float(health_result)
            else:
                health_score = 75.0
            
            # 컴포넌트별 상태 계산
            components = {
                'system_performance': {
                    'score': self._calculate_system_performance_score(),
                    'status': self._get_status_from_score(self._calculate_system_performance_score())
                },
                'data_quality': {
                    'score': self._calculate_data_quality_score(),
                    'status': self._get_status_from_score(self._calculate_data_quality_score())
                },
                'connectivity': {
                    'score': self._calculate_connectivity_score(),
                    'status': self._get_status_from_score(self._calculate_connectivity_score())
                },
                'resource_usage': {
                    'score': self._calculate_resource_usage_score(),
                    'status': self._get_status_from_score(self._calculate_resource_usage_score())
                }
            }
            
            # 트렌드 계산 (간단한 버전)
            trend = self._calculate_health_trend()
            
            return {
                'overall_score': health_score,
                'components': components,
                'trend': trend
            }
            
        except Exception as e:
            logger.error(f"Error collecting health data: {e}")
            return {}
    
    async def _collect_buffer_data(self) -> Dict[str, Any]:
        """버퍼 상태 데이터 수집"""
        try:
            if not self.buffer_manager:
                return {}
            
            buffer_data = {}
            
            for sensor_type in ['eeg', 'ppg', 'acc', 'battery']:
                try:
                    buffer = self.buffer_manager.get_buffer(sensor_type)
                    if buffer:
                        buffer_data[sensor_type] = {
                            'size': buffer.max_size,
                            'used': len(buffer.buffer),
                            'usage_percent': (len(buffer.buffer) / buffer.max_size) * 100,
                            'efficiency': buffer.get_efficiency(),
                            'overflow_count': buffer.overflow_count
                        }
                    else:
                        buffer_data[sensor_type] = {
                            'size': 0,
                            'used': 0,
                            'usage_percent': 0.0,
                            'efficiency': 0.0,
                            'overflow_count': 0
                        }
                except Exception as e:
                    logger.debug(f"Error getting buffer data for {sensor_type}: {e}")
                    buffer_data[sensor_type] = {
                        'size': 0,
                        'used': 0,
                        'usage_percent': 0.0,
                        'efficiency': 0.0,
                        'overflow_count': 0
                    }
            
            return buffer_data
            
        except Exception as e:
            logger.error(f"Error collecting buffer data: {e}")
            return {}
    
    def _calculate_throughput(self, sensor_type: str) -> float:
        """센서별 처리량 계산 (샘플/초)"""
        try:
            if self.streaming_optimizer:
                controller = self.streaming_optimizer.controllers.get(sensor_type)
                if controller:
                    # 최근 처리량 반환 (간단한 계산)
                    return len(controller.latency_history) * 10  # 대략적인 계산
            return 0.0
        except Exception:
            return 0.0
    
    def _calculate_average_latency(self) -> float:
        """평균 지연시간 계산 (ms)"""
        try:
            if self.streaming_optimizer:
                total_latency = 0.0
                count = 0
                
                for sensor_type in ['eeg', 'ppg', 'acc']:
                    controller = self.streaming_optimizer.controllers.get(sensor_type)
                    if controller and controller.latency_history:
                        total_latency += sum(controller.latency_history) / len(controller.latency_history)
                        count += 1
                
                return total_latency / count if count > 0 else 0.0
            return 0.0
        except Exception:
            return 0.0
    
    def _calculate_system_performance_score(self) -> float:
        """시스템 성능 점수 계산"""
        try:
            cpu_usage = psutil.cpu_percent()
            memory_usage = psutil.virtual_memory().percent
            
            # CPU와 메모리 사용률 기반 점수 (낮을수록 좋음)
            cpu_score = max(0, 100 - cpu_usage)
            memory_score = max(0, 100 - memory_usage)
            
            return (cpu_score + memory_score) / 2
        except Exception:
            return 50.0
    
    def _calculate_data_quality_score(self) -> float:
        """데이터 품질 점수 계산"""
        try:
            # 에러율 기반 계산 (간단한 버전)
            if self.performance_monitor:
                error_rate = getattr(self.performance_monitor, 'error_rate', 0.0)
                return max(0, 100 - (error_rate * 10))  # 에러율이 낮을수록 높은 점수
            return 85.0  # 기본값
        except Exception:
            return 85.0
    
    def _calculate_connectivity_score(self) -> float:
        """연결성 점수 계산"""
        try:
            # WebSocket 클라이언트 수 기반 (간단한 버전)
            if self.ws_server:
                client_count = len(getattr(self.ws_server, 'clients', []))
                return min(100, 50 + (client_count * 25))  # 클라이언트가 많을수록 높은 점수
            return 60.0
        except Exception:
            return 60.0
    
    def _calculate_resource_usage_score(self) -> float:
        """리소스 사용률 점수 계산"""
        try:
            # 버퍼 사용률 기반
            if self.buffer_manager:
                total_usage = 0.0
                count = 0
                
                for sensor_type in ['eeg', 'ppg', 'acc', 'battery']:
                    buffer = self.buffer_manager.get_buffer(sensor_type)
                    if buffer:
                        usage = (len(buffer.buffer) / buffer.max_size) * 100
                        total_usage += usage
                        count += 1
                
                avg_usage = total_usage / count if count > 0 else 0
                return max(0, 100 - avg_usage)  # 사용률이 낮을수록 좋음
            return 70.0
        except Exception:
            return 70.0
    
    def _get_status_from_score(self, score: float) -> str:
        """점수를 기반으로 상태 문자열 반환"""
        if score >= 90:
            return "EXCELLENT"
        elif score >= 75:
            return "GOOD"
        elif score >= 60:
            return "FAIR"
        elif score >= 40:
            return "POOR"
        else:
            return "CRITICAL"
    
    def _calculate_health_trend(self) -> str:
        """건강 점수 트렌드 계산 (간단한 버전)"""
        # 실제로는 이전 점수들과 비교해야 하지만, 여기서는 간단히 구현
        try:
            current_score = self.performance_monitor.get_health_score() if self.performance_monitor else 70.0
            
            if current_score >= 80:
                return "STABLE"
            elif current_score >= 60:
                return "STABLE"
            else:
                return "DECLINING"
        except Exception:
            return "STABLE"
    
    async def _broadcast_monitoring_message(self, message_type: str, data: Dict[str, Any]):
        """모니터링 메시지 브로드캐스트"""
        if not self.ws_server:
            return
        
        try:
            message = {
                "type": message_type,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": data
            }
            
            # 채널별 브로드캐스트 사용 (구독한 클라이언트에게만 전송)
            if hasattr(self.ws_server, 'broadcast_to_channel'):
                await self.ws_server.broadcast_to_channel(message_type, json.dumps(message))
            elif hasattr(self.ws_server, 'broadcast'):
                await self.ws_server.broadcast(json.dumps(message))
            
        except Exception as e:
            logger.error(f"Error broadcasting monitoring message: {e}")
    
    async def _broadcast_alert(self, alert: Alert):
        """알림 브로드캐스트"""
        try:
            await self._broadcast_monitoring_message("system_alerts", alert.to_dict())
            logger.info(f"Alert broadcasted: {alert.level.value} - {alert.title}")
        except Exception as e:
            logger.error(f"Error broadcasting alert: {e}")
    
    async def handle_batch_completion(self, sensor_type: str, batch_data: Dict[str, Any]):
        """배치 완료 시 호출되는 핸들러"""
        try:
            batch_status = {
                'sensor_type': sensor_type.upper(),
                'batch_id': f"BATCH_{sensor_type.upper()}_{int(time.time())}",
                'items_processed': batch_data.get('items_processed', 0),
                'compression_ratio': batch_data.get('compression_ratio', 0.0),
                'processing_time': batch_data.get('processing_time', 0.0),
                'status': 'COMPLETED',
                'next_batch_eta': batch_data.get('next_batch_eta', 0.0)
            }
            
            await self._broadcast_monitoring_message("batch_status", batch_status)
            
        except Exception as e:
            logger.error(f"Error handling batch completion: {e}")
    
    def get_current_status(self) -> Dict[str, Any]:
        """현재 모니터링 상태 반환"""
        return {
            'is_monitoring': self.is_monitoring,
            'active_tasks': len([t for t in self.monitoring_tasks if isinstance(t, asyncio.Task) and not t.done()]),
            'last_metrics_time': self.last_metrics.get('timestamp') if self.last_metrics else None,
            'alert_summary': self.alert_manager.get_alert_summary(),
            'intervals': self.intervals
        }
    
    def set_websocket_server(self, ws_server):
        """WebSocket 서버 설정"""
        self.ws_server = ws_server
        logger.info("WebSocket server set for MonitoringService")

# 전역 MonitoringService 인스턴스
global_monitoring_service = MonitoringService() 