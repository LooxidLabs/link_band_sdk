import asyncio
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
from collections import defaultdict

from .memory_optimizer import SafeMemoryOptimizer
from .cpu_optimizer import SafeCPUOptimizer
from .network_optimizer import SafeNetworkOptimizer

logger = logging.getLogger(__name__)

@dataclass
class SystemHealth:
    """시스템 건강 상태"""
    overall_score: float = 0.0
    memory_score: float = 0.0
    cpu_score: float = 0.0
    network_score: float = 0.0
    data_integrity_score: float = 0.0
    timestamp: datetime = None

class DataSafetyCoordinator:
    """데이터 안전성 통합 관리"""
    
    def __init__(self):
        self.critical_sensors = ['EEG', 'PPG', 'ACC', 'BAT']
        self.data_flow_status = defaultdict(bool)  # 센서별 데이터 흐름 상태
        self.safety_violations = []
        self.emergency_mode = False
        
        logger.info("DataSafetyCoordinator initialized - DATA PROTECTION PRIORITY")
    
    def register_data_flow(self, sensor_type: str, is_active: bool):
        """데이터 흐름 등록"""
        self.data_flow_status[sensor_type] = is_active
        logger.debug(f"Data flow registered: {sensor_type} = {is_active}")
    
    def check_data_safety(self) -> bool:
        """전체 데이터 안전성 확인"""
        try:
            # 모든 중요 센서의 데이터 흐름 확인
            for sensor in self.critical_sensors:
                if not self.data_flow_status.get(sensor, False):
                    logger.warning(f"Data flow interrupted for critical sensor: {sensor}")
                    self.safety_violations.append({
                        'sensor': sensor,
                        'issue': 'data_flow_interrupted',
                        'timestamp': datetime.now()
                    })
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Data safety check failed: {e}")
            return False
    
    def enter_emergency_mode(self):
        """긴급 모드 진입"""
        if not self.emergency_mode:
            self.emergency_mode = True
            logger.critical("ENTERING EMERGENCY MODE - ALL OPTIMIZATIONS SUSPENDED FOR DATA SAFETY")
    
    def exit_emergency_mode(self):
        """긴급 모드 해제"""
        if self.emergency_mode:
            self.emergency_mode = False
            logger.info("Exiting emergency mode - resuming normal optimizations")
    
    def get_safety_status(self) -> Dict[str, Any]:
        """안전성 상태 반환"""
        return {
            "emergency_mode": self.emergency_mode,
            "data_flow_status": dict(self.data_flow_status),
            "safety_violations": len(self.safety_violations),
            "critical_sensors_active": sum(1 for sensor in self.critical_sensors 
                                         if self.data_flow_status.get(sensor, False))
        }

class IntegratedOptimizer:
    """데이터 무손실 보장 통합 최적화 시스템"""
    
    def __init__(self):
        # 최적화 모듈들
        self.memory_optimizer = SafeMemoryOptimizer()
        self.cpu_optimizer = SafeCPUOptimizer()
        self.network_optimizer = SafeNetworkOptimizer()
        
        # 데이터 안전성 관리
        self.safety_coordinator = DataSafetyCoordinator()
        
        # 시스템 상태
        self.optimization_active = False
        self.optimization_task = None
        self.health_history = []
        
        # 통합 통계
        self.integrated_stats = {
            'optimization_cycles': 0,
            'safety_blocks': 0,
            'emergency_activations': 0,
            'data_protection_events': 0
        }
        
        logger.info("IntegratedOptimizer initialized - DATA SAFETY FIRST")
    
    async def start_optimization(self):
        """통합 최적화 시작"""
        if self.optimization_active:
            return
        
        logger.info("Starting integrated optimization system")
        
        try:
            # 각 최적화 모듈 시작
            await self.memory_optimizer.start_monitoring()
            await self.cpu_optimizer.start_monitoring()
            await self.network_optimizer.start_monitoring()
            
            # 통합 모니터링 시작
            self.optimization_active = True
            self.optimization_task = asyncio.create_task(self._optimization_loop())
            
            logger.info("Integrated optimization system started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start optimization system: {e}")
            await self.stop_optimization()
    
    async def stop_optimization(self):
        """통합 최적화 중지"""
        logger.info("Stopping integrated optimization system")
        
        self.optimization_active = False
        if self.optimization_task:
            self.optimization_task.cancel()
            try:
                await self.optimization_task
            except asyncio.CancelledError:
                pass
        
        # 각 최적화 모듈 중지
        await self.memory_optimizer.stop_monitoring()
        await self.cpu_optimizer.stop_monitoring()
        await self.network_optimizer.stop_monitoring()
        
        logger.info("Integrated optimization system stopped")
    
    async def _optimization_loop(self):
        """통합 최적화 루프"""
        while self.optimization_active:
            try:
                # 1. 데이터 안전성 확인 (최우선)
                if not self.safety_coordinator.check_data_safety():
                    logger.critical("DATA SAFETY VIOLATION - SUSPENDING ALL OPTIMIZATIONS")
                    self.safety_coordinator.enter_emergency_mode()
                    self.integrated_stats['safety_blocks'] += 1
                    await asyncio.sleep(5.0)  # 5초 대기 후 재확인
                    continue
                
                # 2. 긴급 모드 해제 확인
                if self.safety_coordinator.emergency_mode:
                    if self.safety_coordinator.check_data_safety():
                        self.safety_coordinator.exit_emergency_mode()
                    else:
                        await asyncio.sleep(2.0)
                        continue
                
                # 3. 시스템 건강 상태 평가
                health = self._calculate_system_health()
                self.health_history.append(health)
                
                # 4. 통합 최적화 결정
                await self._coordinate_optimizations(health)
                
                # 5. 데이터 처리 작업 우선 처리
                await self._prioritize_data_tasks()
                
                self.integrated_stats['optimization_cycles'] += 1
                await asyncio.sleep(1.0)  # 1초 간격
                
            except Exception as e:
                logger.error(f"Optimization loop error: {e}")
                await asyncio.sleep(5.0)
    
    def _calculate_system_health(self) -> SystemHealth:
        """시스템 건강 상태 계산"""
        try:
            # 각 모듈별 상태 수집
            memory_status = self.memory_optimizer.get_memory_status()
            cpu_status = self.cpu_optimizer.get_cpu_status()
            network_status = self.network_optimizer.get_network_status()
            
            # 점수 계산 (0-100)
            memory_score = max(0, 100 - memory_status['current_memory']['percent'])
            cpu_score = max(0, 100 - cpu_status['current_cpu']['percent'])
            network_score = max(0, 100 - network_status['current_network']['bandwidth_utilization'])
            
            # 데이터 무결성 점수
            data_integrity_score = 100.0
            if network_status['data_integrity']['integrity']['loss_rate'] > 0:
                data_integrity_score -= network_status['data_integrity']['integrity']['loss_rate'] * 1000
            
            # 전체 점수 (데이터 무결성에 가중치 부여)
            overall_score = (
                memory_score * 0.2 +
                cpu_score * 0.2 +
                network_score * 0.2 +
                data_integrity_score * 0.4  # 데이터 무결성 40% 가중치
            )
            
            return SystemHealth(
                overall_score=overall_score,
                memory_score=memory_score,
                cpu_score=cpu_score,
                network_score=network_score,
                data_integrity_score=data_integrity_score,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Health calculation failed: {e}")
            return SystemHealth(timestamp=datetime.now())
    
    async def _coordinate_optimizations(self, health: SystemHealth):
        """최적화 조정"""
        try:
            # 데이터 무결성 점수가 낮으면 모든 최적화 중단
            if health.data_integrity_score < 90.0:
                logger.warning(f"Data integrity score low: {health.data_integrity_score:.1f} - limiting optimizations")
                self.integrated_stats['data_protection_events'] += 1
                return
            
            # 전체 점수가 낮으면 긴급 최적화
            if health.overall_score < 50.0:
                logger.warning(f"System health critical: {health.overall_score:.1f}")
                await self._emergency_optimization(health)
            elif health.overall_score < 70.0:
                logger.info(f"System health low: {health.overall_score:.1f}")
                await self._preventive_optimization(health)
            
        except Exception as e:
            logger.error(f"Optimization coordination failed: {e}")
    
    async def _emergency_optimization(self, health: SystemHealth):
        """긴급 최적화 (데이터 보호 우선)"""
        logger.warning("Emergency optimization - DATA PROTECTION PRIORITY")
        
        # 데이터 안전성 재확인
        if not self.safety_coordinator.check_data_safety():
            logger.critical("Data safety compromised - aborting emergency optimization")
            return
        
        # 메모리가 가장 문제라면 메모리 최적화 우선
        if health.memory_score < 30.0:
            result = self.memory_optimizer.force_memory_optimization()
            if result['status'] != 'success':
                logger.error(f"Emergency memory optimization failed: {result}")
        
        self.integrated_stats['emergency_activations'] += 1
    
    async def _preventive_optimization(self, health: SystemHealth):
        """예방적 최적화"""
        logger.info("Preventive optimization")
        
        # 데이터 안전성 확인
        if not self.safety_coordinator.check_data_safety():
            logger.warning("Data safety issue - skipping preventive optimization")
            return
        
        # 각 모듈별 부드러운 최적화
        # (실제 구현에서는 각 모듈의 예방적 최적화 메서드 호출)
    
    async def _prioritize_data_tasks(self):
        """데이터 작업 우선 처리"""
        try:
            # CPU 최적화기를 통해 데이터 작업 우선 처리
            # (실제 데이터가 있을 때 처리)
            pass
            
        except Exception as e:
            logger.error(f"Data task prioritization failed: {e}")
    
    def register_sensor_data(self, sensor_type: str, data: Any):
        """센서 데이터 등록 (데이터 흐름 추적)"""
        try:
            # 데이터 유효성 사전 검사 (특히 ACC 센서)
            if not self._validate_sensor_data(sensor_type, data):
                logger.warning(f"Invalid data format for {sensor_type}, but preserving for safety")
                # 데이터 무손실을 위해 계속 진행
            
            # 데이터 흐름 상태 업데이트
            self.safety_coordinator.register_data_flow(sensor_type, True)
            
            # 네트워크 최적화기를 통한 데이터 패킷 준비 (더 관대한 처리)
            try:
                packet = self.network_optimizer.prepare_data_packet(sensor_type, data)
            except Exception as packet_error:
                logger.warning(f"Packet preparation issue for {sensor_type}: {packet_error}")
                # 데이터 무손실을 위해 기본 패킷 생성 시도
                packet = self._create_fallback_packet(sensor_type, data)
            
            if packet is None:
                logger.error(f"Failed to prepare packet for {sensor_type}")
                # 데이터 흐름은 유지하되 패킷 실패만 기록
                return False
            
            # CPU 최적화기를 통한 데이터 처리 작업 제출
            task_id = self.cpu_optimizer.submit_data_processing_task(
                self._process_sensor_data, 
                sensor_type, 
                data,
                sensor_type=sensor_type
            )
            
            logger.debug(f"Sensor data registered: {sensor_type}, task: {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Sensor data registration failed for {sensor_type}: {e}")
            # 데이터 안전성을 위해 흐름은 유지
            return False
    
    def _validate_sensor_data(self, sensor_type: str, data: Any) -> bool:
        """센서 데이터 유효성 검사"""
        try:
            if data is None:
                return False
            
            if sensor_type == 'ACC':
                # ACC 센서는 다양한 형태의 데이터를 허용
                if isinstance(data, dict):
                    return any(key in data for key in ['x', 'y', 'z', 'value', 'data', 'acc'])
                elif isinstance(data, (list, tuple)):
                    return len(data) > 0
                elif isinstance(data, (int, float, str)):
                    return True
                return True  # ACC는 매우 관대하게 처리
                
            elif sensor_type in ['EEG', 'PPG']:
                if isinstance(data, (dict, list, tuple, int, float)):
                    return True
                    
            elif sensor_type == 'BAT':
                # 배터리는 숫자 또는 딕셔너리
                if isinstance(data, (int, float, dict)):
                    return True
            
            return True  # 기본적으로 모든 데이터 허용 (무손실 원칙)
            
        except Exception:
            return True  # 검증 실패 시에도 데이터 보존
    
    def _create_fallback_packet(self, sensor_type: str, data: Any):
        """fallback 패킷 생성"""
        try:
            from .network_optimizer import DataPacket
            import time
            
            # 간단한 패킷 생성
            packet = DataPacket(
                sensor_type=sensor_type,
                data=data,
                timestamp=time.time(),
                sequence_id=int(time.time() * 1000000) % 1000000,  # 간단한 시퀀스 ID
                priority=1,
                compressed=False,
                checksum="fallback"
            )
            
            return packet
            
        except Exception as e:
            logger.error(f"Fallback packet creation failed: {e}")
            return None
    
    def _process_sensor_data(self, sensor_type: str, data: Any):
        """센서 데이터 처리"""
        try:
            # 실제 데이터 처리 로직
            # (필터링, 변환, 저장 등)
            
            logger.debug(f"Processing {sensor_type} data")
            return {"status": "processed", "sensor": sensor_type, "data_size": len(str(data))}
            
        except Exception as e:
            logger.error(f"Data processing failed for {sensor_type}: {e}")
            return None
    
    def get_system_status(self) -> Dict[str, Any]:
        """통합 시스템 상태 반환"""
        try:
            current_health = self._calculate_system_health()
            safety_status = self.safety_coordinator.get_safety_status()
            
            return {
                "optimization_active": self.optimization_active,
                "system_health": {
                    "overall_score": current_health.overall_score,
                    "memory_score": current_health.memory_score,
                    "cpu_score": current_health.cpu_score,
                    "network_score": current_health.network_score,
                    "data_integrity_score": current_health.data_integrity_score
                },
                "data_safety": safety_status,
                "module_status": {
                    "memory": self.memory_optimizer.get_memory_status(),
                    "cpu": self.cpu_optimizer.get_cpu_status(),
                    "network": self.network_optimizer.get_network_status()
                },
                "integrated_stats": self.integrated_stats.copy(),
                "health_trend": [h.overall_score for h in self.health_history[-10:]]  # 최근 10개
            }
            
        except Exception as e:
            logger.error(f"System status collection failed: {e}")
            return {
                "optimization_active": self.optimization_active,
                "error": str(e)
            }
    
    def get_recommendations(self) -> List[str]:
        """통합 시스템 권장사항"""
        recommendations = []
        
        try:
            current_health = self._calculate_system_health()
            safety_status = self.safety_coordinator.get_safety_status()
            
            # 데이터 안전성 관련 권장사항 (최우선)
            if safety_status['emergency_mode']:
                recommendations.append("CRITICAL: System in emergency mode - data protection active")
                recommendations.append("All optimizations suspended until data safety is restored")
            
            if safety_status['safety_violations'] > 0:
                recommendations.append(f"WARNING: {safety_status['safety_violations']} data safety violations detected")
                recommendations.append("Review sensor connections and data flow")
            
            # 시스템 건강 관련 권장사항
            if current_health.overall_score < 50:
                recommendations.append("CRITICAL: System health severely degraded")
                recommendations.append("Immediate intervention required")
            elif current_health.overall_score < 70:
                recommendations.append("WARNING: System health below optimal")
                recommendations.append("Consider preventive maintenance")
            
            # 데이터 무결성 관련 권장사항
            if current_health.data_integrity_score < 95:
                recommendations.append("WARNING: Data integrity score below 95%")
                recommendations.append("Check network stability and data transmission")
            
            if not recommendations:
                recommendations.append("System operating optimally")
                recommendations.append("All data integrity checks passing")
                recommendations.append("Continue normal operations")
            
        except Exception as e:
            recommendations.append(f"Error generating recommendations: {e}")
        
        return recommendations 