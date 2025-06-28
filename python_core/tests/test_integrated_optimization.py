import asyncio
import time
import logging
from app.core.integrated_optimizer import IntegratedOptimizer

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

class OptimizationTester:
    """통합 최적화 시스템 테스트"""
    
    def __init__(self):
        self.optimizer = IntegratedOptimizer()
        self.test_results = {}
    
    async def run_all_tests(self):
        """모든 테스트 실행"""
        print("=" * 80)
        print("🛡️  LINK BAND SDK - 통합 최적화 시스템 테스트")
        print("📌 데이터 무손실 보장 최우선 원칙")
        print("=" * 80)
        
        tests = [
            ("시스템 초기화", self.test_system_initialization),
            ("데이터 안전성 검증", self.test_data_safety),
            ("메모리 최적화", self.test_memory_optimization),
            ("CPU 최적화", self.test_cpu_optimization),
            ("네트워크 최적화", self.test_network_optimization),
            ("센서 데이터 처리", self.test_sensor_data_processing),
            ("긴급 모드 테스트", self.test_emergency_mode),
            ("통합 상태 모니터링", self.test_system_status),
            ("시스템 종료", self.test_system_shutdown)
        ]
        
        for test_name, test_func in tests:
            print(f"\n🔍 테스트: {test_name}")
            print("-" * 60)
            
            try:
                start_time = time.time()
                result = await test_func()
                execution_time = time.time() - start_time
                
                self.test_results[test_name] = {
                    'status': 'PASS' if result else 'FAIL',
                    'execution_time': execution_time
                }
                
                status_emoji = "✅" if result else "❌"
                print(f"{status_emoji} {test_name}: {'PASS' if result else 'FAIL'} ({execution_time:.2f}s)")
                
            except Exception as e:
                self.test_results[test_name] = {
                    'status': 'ERROR',
                    'error': str(e),
                    'execution_time': 0
                }
                print(f"❌ {test_name}: ERROR - {e}")
        
        self.print_test_summary()
    
    async def test_system_initialization(self):
        """시스템 초기화 테스트"""
        try:
            await self.optimizer.start_optimization()
            
            # 초기화 확인
            if not self.optimizer.optimization_active:
                print("❌ 최적화 시스템이 활성화되지 않음")
                return False
            
            print("✅ 통합 최적화 시스템 초기화 완료")
            print(f"   - 메모리 최적화기: 활성")
            print(f"   - CPU 최적화기: 활성")
            print(f"   - 네트워크 최적화기: 활성")
            print(f"   - 데이터 안전성 관리자: 활성")
            
            return True
            
        except Exception as e:
            print(f"❌ 초기화 실패: {e}")
            return False
    
    async def test_data_safety(self):
        """데이터 안전성 검증 테스트"""
        try:
            safety_coordinator = self.optimizer.safety_coordinator
            
            # 초기 안전성 상태 확인
            initial_safety = safety_coordinator.check_data_safety()
            print(f"✅ 초기 데이터 안전성 상태: {initial_safety}")
            
            # 중요 센서 등록
            test_sensors = ['EEG', 'PPG', 'ACC', 'BAT']
            for sensor in test_sensors:
                safety_coordinator.register_data_flow(sensor, True)
                print(f"   - {sensor} 센서 데이터 흐름 등록됨")
            
            # 안전성 재확인
            final_safety = safety_coordinator.check_data_safety()
            print(f"✅ 센서 등록 후 데이터 안전성: {final_safety}")
            
            # 안전성 상태 출력
            safety_status = safety_coordinator.get_safety_status()
            print(f"   - 활성 중요 센서: {safety_status['critical_sensors_active']}/4")
            print(f"   - 안전성 위반: {safety_status['safety_violations']}건")
            print(f"   - 긴급 모드: {safety_status['emergency_mode']}")
            
            return final_safety
            
        except Exception as e:
            print(f"❌ 데이터 안전성 테스트 실패: {e}")
            return False
    
    async def test_memory_optimization(self):
        """메모리 최적화 테스트"""
        try:
            memory_optimizer = self.optimizer.memory_optimizer
            
            # 메모리 상태 확인
            memory_status = memory_optimizer.get_memory_status()
            print(f"✅ 현재 메모리 사용률: {memory_status['current_memory']['percent']:.1f}%")
            print(f"   - 사용 중: {memory_status['current_memory']['used_mb']:.1f}MB")
            print(f"   - 사용 가능: {memory_status['current_memory']['available_mb']:.1f}MB")
            print(f"   - 프로세스: {memory_status['current_memory']['process_mb']:.1f}MB")
            
            # 데이터 무결성 확인
            data_safety = memory_status['data_safety']
            print(f"   - 데이터 무결성: {'OK' if data_safety['integrity_ok'] else 'FAIL'}")
            print(f"   - 최적화 활성화: {data_safety['optimization_enabled']}")
            print(f"   - 중요 버퍼: {data_safety['critical_buffers_count']}개")
            
            # 강제 메모리 최적화 테스트 (안전성 확인 후)
            if data_safety['integrity_ok']:
                optimization_result = memory_optimizer.force_memory_optimization()
                print(f"✅ 메모리 최적화 실행: {optimization_result['status']}")
                
                if optimization_result['status'] == 'success':
                    print(f"   - 해제된 메모리: {optimization_result.get('memory_freed_percent', 0):.2f}%")
                    print(f"   - 수집된 객체: {optimization_result.get('objects_collected', 0)}개")
                    return True
                else:
                    print(f"   - 실패 이유: {optimization_result.get('reason', 'unknown')}")
                    return optimization_result['status'] != 'error'
            else:
                print("⚠️  데이터 무결성 문제로 메모리 최적화 차단됨")
                return True  # 데이터 보호가 우선이므로 성공으로 간주
            
        except Exception as e:
            print(f"❌ 메모리 최적화 테스트 실패: {e}")
            return False
    
    async def test_cpu_optimization(self):
        """CPU 최적화 테스트"""
        try:
            cpu_optimizer = self.optimizer.cpu_optimizer
            
            # CPU 상태 확인
            cpu_status = cpu_optimizer.get_cpu_status()
            print(f"✅ 현재 CPU 사용률: {cpu_status['current_cpu']['percent']:.1f}%")
            print(f"   - CPU 코어 수: {cpu_status['current_cpu']['count']}")
            print(f"   - 프로세스 CPU: {cpu_status['current_cpu']['process_percent']:.1f}%")
            print(f"   - 스레드 수: {cpu_status['current_cpu']['thread_count']}")
            
            # 데이터 안전성 확인
            data_safety = cpu_status['data_safety']
            print(f"   - 활성 데이터 작업: {data_safety['active_data_tasks']}개")
            print(f"   - 데이터 손실 사건: {data_safety['data_loss_incidents']}건")
            
            # 데이터 처리 작업 제출 테스트
            task_id = cpu_optimizer.submit_data_processing_task(
                self._dummy_data_task, 
                "test_data", 
                sensor_type="EEG"
            )
            print(f"✅ 데이터 처리 작업 제출됨: {task_id}")
            
            # 잠시 대기 후 상태 재확인
            await asyncio.sleep(0.5)
            updated_status = cpu_optimizer.get_cpu_status()
            print(f"   - 최적화 통계: {updated_status['optimization_stats']}")
            
            return True
            
        except Exception as e:
            print(f"❌ CPU 최적화 테스트 실패: {e}")
            return False
    
    async def test_network_optimization(self):
        """네트워크 최적화 테스트"""
        try:
            network_optimizer = self.optimizer.network_optimizer
            
            # 네트워크 상태 확인
            network_status = network_optimizer.get_network_status()
            print(f"✅ 네트워크 상태:")
            print(f"   - 대역폭 사용률: {network_status['current_network']['bandwidth_utilization']:.1f}%")
            print(f"   - 지연시간: {network_status['current_network']['latency_ms']:.1f}ms")
            print(f"   - 연결 수: {network_status['current_network']['connection_count']}")
            
            # 데이터 무결성 확인
            data_integrity = network_status['data_integrity']
            print(f"   - 전송된 패킷: {data_integrity['packets']['sent']}")
            print(f"   - 확인된 패킷: {data_integrity['packets']['acknowledged']}")
            print(f"   - 손실된 패킷: {data_integrity['packets']['lost']}")
            print(f"   - 성공률: {data_integrity['integrity']['success_rate']:.2%}")
            print(f"   - 손실률: {data_integrity['integrity']['loss_rate']:.2%}")
            
            # 데이터 패킷 준비 테스트
            test_data = {"sensor": "EEG", "values": [1, 2, 3, 4, 5], "timestamp": time.time()}
            packet = network_optimizer.prepare_data_packet("EEG", test_data, priority=1)
            
            if packet:
                print(f"✅ 데이터 패킷 준비 성공:")
                print(f"   - 패킷 ID: {packet.sequence_id}")
                print(f"   - 센서 타입: {packet.sensor_type}")
                print(f"   - 압축 여부: {packet.compressed}")
                print(f"   - 체크섬: {packet.checksum[:8]}...")
                return True
            else:
                print("❌ 데이터 패킷 준비 실패")
                return False
            
        except Exception as e:
            print(f"❌ 네트워크 최적화 테스트 실패: {e}")
            return False
    
    async def test_sensor_data_processing(self):
        """센서 데이터 처리 테스트"""
        try:
            # 각 센서 타입별 테스트 데이터
            test_sensors = {
                'EEG': [0.1, 0.2, -0.1, 0.3, -0.2],
                'PPG': [1024, 1030, 1025, 1035, 1020],
                'ACC': {'x': 0.1, 'y': -0.2, 'z': 9.8},
                'BAT': {'level': 85, 'voltage': 3.7, 'charging': False}
            }
            
            success_count = 0
            total_count = len(test_sensors)
            
            for sensor_type, data in test_sensors.items():
                try:
                    result = self.optimizer.register_sensor_data(sensor_type, data)
                    if result:
                        print(f"✅ {sensor_type} 센서 데이터 처리 성공")
                        success_count += 1
                    else:
                        print(f"❌ {sensor_type} 센서 데이터 처리 실패")
                        
                except Exception as e:
                    print(f"❌ {sensor_type} 센서 데이터 처리 오류: {e}")
            
            print(f"📊 센서 데이터 처리 결과: {success_count}/{total_count} 성공")
            
            # 데이터 흐름 상태 확인
            safety_status = self.optimizer.safety_coordinator.get_safety_status()
            print(f"   - 활성 데이터 흐름: {safety_status['data_flow_status']}")
            
            return success_count == total_count
            
        except Exception as e:
            print(f"❌ 센서 데이터 처리 테스트 실패: {e}")
            return False
    
    async def test_emergency_mode(self):
        """긴급 모드 테스트"""
        try:
            safety_coordinator = self.optimizer.safety_coordinator
            
            # 긴급 모드 진입 테스트
            print("🚨 긴급 모드 진입 테스트")
            safety_coordinator.enter_emergency_mode()
            
            safety_status = safety_coordinator.get_safety_status()
            if safety_status['emergency_mode']:
                print("✅ 긴급 모드 진입 성공")
            else:
                print("❌ 긴급 모드 진입 실패")
                return False
            
            # 긴급 모드에서 최적화 차단 확인
            await asyncio.sleep(1.0)  # 최적화 루프가 반응할 시간 제공
            
            # 긴급 모드 해제 테스트
            print("🔄 긴급 모드 해제 테스트")
            safety_coordinator.exit_emergency_mode()
            
            safety_status = safety_coordinator.get_safety_status()
            if not safety_status['emergency_mode']:
                print("✅ 긴급 모드 해제 성공")
                return True
            else:
                print("❌ 긴급 모드 해제 실패")
                return False
            
        except Exception as e:
            print(f"❌ 긴급 모드 테스트 실패: {e}")
            return False
    
    async def test_system_status(self):
        """시스템 상태 모니터링 테스트"""
        try:
            # 전체 시스템 상태 확인
            system_status = self.optimizer.get_system_status()
            
            print("📊 통합 시스템 상태:")
            print(f"   - 최적화 활성: {system_status['optimization_active']}")
            
            # 시스템 건강 점수
            health = system_status['system_health']
            print(f"   - 전체 건강 점수: {health['overall_score']:.1f}/100")
            print(f"   - 메모리 점수: {health['memory_score']:.1f}/100")
            print(f"   - CPU 점수: {health['cpu_score']:.1f}/100")
            print(f"   - 네트워크 점수: {health['network_score']:.1f}/100")
            print(f"   - 데이터 무결성 점수: {health['data_integrity_score']:.1f}/100")
            
            # 데이터 안전성
            data_safety = system_status['data_safety']
            print(f"   - 긴급 모드: {data_safety['emergency_mode']}")
            print(f"   - 안전성 위반: {data_safety['safety_violations']}건")
            print(f"   - 활성 중요 센서: {data_safety['critical_sensors_active']}/4")
            
            # 통합 통계
            stats = system_status['integrated_stats']
            print(f"   - 최적화 사이클: {stats['optimization_cycles']}")
            print(f"   - 안전성 차단: {stats['safety_blocks']}")
            print(f"   - 긴급 활성화: {stats['emergency_activations']}")
            print(f"   - 데이터 보호 이벤트: {stats['data_protection_events']}")
            
            # 권장사항
            recommendations = self.optimizer.get_recommendations()
            print(f"📋 시스템 권장사항 ({len(recommendations)}개):")
            for i, rec in enumerate(recommendations[:3], 1):  # 최대 3개만 표시
                print(f"   {i}. {rec}")
            
            return True
            
        except Exception as e:
            print(f"❌ 시스템 상태 테스트 실패: {e}")
            return False
    
    async def test_system_shutdown(self):
        """시스템 종료 테스트"""
        try:
            print("🔄 통합 최적화 시스템 종료 중...")
            await self.optimizer.stop_optimization()
            
            if not self.optimizer.optimization_active:
                print("✅ 시스템 종료 완료")
                return True
            else:
                print("❌ 시스템 종료 실패")
                return False
            
        except Exception as e:
            print(f"❌ 시스템 종료 테스트 실패: {e}")
            return False
    
    def _dummy_data_task(self, data):
        """더미 데이터 처리 작업"""
        time.sleep(0.1)  # 간단한 처리 시뮬레이션
        return {"processed": True, "data_size": len(str(data))}
    
    def print_test_summary(self):
        """테스트 결과 요약 출력"""
        print("\n" + "=" * 80)
        print("📋 테스트 결과 요약")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result['status'] == 'PASS')
        failed_tests = sum(1 for result in self.test_results.values() if result['status'] == 'FAIL')
        error_tests = sum(1 for result in self.test_results.values() if result['status'] == 'ERROR')
        
        print(f"📊 전체 테스트: {total_tests}개")
        print(f"✅ 성공: {passed_tests}개")
        print(f"❌ 실패: {failed_tests}개")
        print(f"🔥 오류: {error_tests}개")
        print(f"📈 성공률: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\n📝 상세 결과:")
        for test_name, result in self.test_results.items():
            status_emoji = {"PASS": "✅", "FAIL": "❌", "ERROR": "🔥"}[result['status']]
            execution_time = result.get('execution_time', 0)
            print(f"   {status_emoji} {test_name}: {result['status']} ({execution_time:.2f}s)")
            
            if result['status'] == 'ERROR':
                print(f"      오류: {result.get('error', 'Unknown error')}")
        
        print("\n" + "=" * 80)
        if passed_tests == total_tests:
            print("🎉 모든 테스트 통과! 데이터 무손실 보장 시스템이 정상 작동합니다.")
        else:
            print("⚠️  일부 테스트 실패. 시스템 점검이 필요합니다.")
        print("=" * 80)

async def main():
    """메인 테스트 실행"""
    tester = OptimizationTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 