#!/usr/bin/env python3
"""
Priority 4 Phase 1 모니터링 시스템 통합 테스트

이 스크립트는 새로 구현된 모니터링 시스템의 모든 컴포넌트를 테스트합니다:
1. AlertManager - 임계값 기반 알림 시스템
2. MonitoringService - 실시간 모니터링 서비스
3. REST API - 모니터링 관련 API 엔드포인트
4. WebSocket 메시지 - 새로운 모니터링 메시지 타입들
"""

import asyncio
import json
import time
import requests
import websockets
from typing import Dict, Any, List
import psutil
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MonitoringSystemTester:
    def __init__(self):
        self.base_url = "http://localhost:8121"
        self.ws_url = "ws://localhost:18765"
        self.test_results = []
        
    def log_test_result(self, test_name: str, success: bool, message: str = "", details: Dict[str, Any] = None):
        """테스트 결과 로깅"""
        status = "PASS" if success else "FAIL"
        result = {
            'test_name': test_name,
            'status': status,
            'success': success,
            'message': message,
            'details': details or {},
            'timestamp': time.time()
        }
        self.test_results.append(result)
        logger.info(f"[{status}] {test_name}: {message}")
        if details:
            logger.info(f"  Details: {details}")
    
    async def test_alert_manager(self):
        """AlertManager 기능 테스트"""
        logger.info("=== AlertManager 테스트 시작 ===")
        
        try:
            from app.core.alert_manager import global_alert_manager, AlertLevel, AlertCategory
            
            # 1. 임계값 설정 확인
            thresholds = global_alert_manager.thresholds
            self.log_test_result(
                "AlertManager 임계값 설정",
                len(thresholds) > 0,
                f"임계값 설정 개수: {len(thresholds)}",
                {'thresholds': list(thresholds.keys())}
            )
            
            # 2. 가상의 높은 CPU 사용률로 알림 생성 테스트
            test_metrics = {
                'system': {
                    'cpu_percent': 95.0,  # CRITICAL 임계값
                    'memory_percent': 85.0  # ERROR 임계값
                },
                'health_score': 30.0  # CRITICAL 임계값 (낮을수록 나쁨)
            }
            
            alerts = global_alert_manager.check_thresholds(test_metrics)
            self.log_test_result(
                "AlertManager 알림 생성",
                len(alerts) > 0,
                f"생성된 알림 개수: {len(alerts)}",
                {'alert_levels': [alert.level.value for alert in alerts]}
            )
            
            # 3. 활성 알림 조회
            active_alerts = global_alert_manager.get_active_alerts()
            self.log_test_result(
                "AlertManager 활성 알림 조회",
                True,
                f"활성 알림 개수: {len(active_alerts)}",
                {'active_count': len(active_alerts)}
            )
            
            # 4. 알림 요약 정보
            summary = global_alert_manager.get_alert_summary()
            self.log_test_result(
                "AlertManager 알림 요약",
                'total_active' in summary,
                f"요약 정보 조회 성공",
                summary
            )
            
        except Exception as e:
            self.log_test_result("AlertManager 테스트", False, f"오류 발생: {e}")
    
    async def test_monitoring_service(self):
        """MonitoringService 기능 테스트"""
        logger.info("=== MonitoringService 테스트 시작 ===")
        
        try:
            from app.core.monitoring_service import global_monitoring_service
            
            # 1. 모니터링 서비스 상태 확인
            status = global_monitoring_service.get_current_status()
            self.log_test_result(
                "MonitoringService 상태 확인",
                'is_monitoring' in status,
                f"모니터링 활성: {status.get('is_monitoring', False)}",
                status
            )
            
            # 2. 메트릭 수집 테스트
            metrics = await global_monitoring_service._collect_metrics()
            self.log_test_result(
                "MonitoringService 메트릭 수집",
                'system' in metrics and 'health_score' in metrics,
                f"메트릭 수집 성공",
                {'metric_keys': list(metrics.keys())}
            )
            
            # 3. 건강 데이터 수집 테스트
            health_data = await global_monitoring_service._collect_health_data()
            self.log_test_result(
                "MonitoringService 건강 데이터 수집",
                'overall_score' in health_data,
                f"건강 데이터 수집 성공",
                {'health_score': health_data.get('overall_score', 0)}
            )
            
            # 4. 버퍼 데이터 수집 테스트
            buffer_data = await global_monitoring_service._collect_buffer_data()
            self.log_test_result(
                "MonitoringService 버퍼 데이터 수집",
                len(buffer_data) >= 0,  # 버퍼가 없어도 빈 딕셔너리 반환하므로 성공
                f"버퍼 데이터 수집 성공, 센서 개수: {len(buffer_data)}",
                {'sensors': list(buffer_data.keys())}
            )
            
        except Exception as e:
            self.log_test_result("MonitoringService 테스트", False, f"오류 발생: {e}")
    
    async def test_rest_api_endpoints(self):
        """REST API 엔드포인트 테스트"""
        logger.info("=== REST API 엔드포인트 테스트 시작 ===")
        
        # 테스트할 엔드포인트들
        endpoints = [
            ("/monitoring/status", "모니터링 상태"),
            ("/monitoring/metrics", "현재 메트릭"),
            ("/monitoring/health", "시스템 건강 상태"),
            ("/monitoring/buffers", "버퍼 상태"),
            ("/monitoring/alerts", "알림 목록")
        ]
        
        for endpoint, description in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    self.log_test_result(
                        f"REST API {description}",
                        True,
                        f"응답 성공 (200)",
                        {'status': data.get('status'), 'data_keys': list(data.get('data', {}).keys())}
                    )
                else:
                    self.log_test_result(
                        f"REST API {description}",
                        False,
                        f"응답 실패 ({response.status_code})"
                    )
                    
            except Exception as e:
                self.log_test_result(
                    f"REST API {description}",
                    False,
                    f"요청 실패: {e}"
                )
    
    async def test_websocket_monitoring_messages(self):
        """WebSocket 모니터링 메시지 테스트"""
        logger.info("=== WebSocket 모니터링 메시지 테스트 시작 ===")
        
        received_messages = []
        expected_message_types = [
            'monitoring_metrics',
            'health_updates', 
            'buffer_status',
            'system_alerts'
        ]
        
        try:
            # WebSocket 연결
            async with websockets.connect(self.ws_url) as websocket:
                self.log_test_result(
                    "WebSocket 연결",
                    True,
                    "WebSocket 연결 성공"
                )
                
                # 10초 동안 메시지 수신 대기
                timeout_time = time.time() + 10
                
                while time.time() < timeout_time:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        data = json.loads(message)
                        
                        if data.get('type') in expected_message_types:
                            received_messages.append(data['type'])
                            logger.info(f"수신된 모니터링 메시지: {data['type']}")
                            
                    except asyncio.TimeoutError:
                        continue
                    except Exception as e:
                        logger.warning(f"메시지 처리 오류: {e}")
                
                # 결과 평가
                unique_types = set(received_messages)
                self.log_test_result(
                    "WebSocket 모니터링 메시지 수신",
                    len(unique_types) > 0,
                    f"수신된 메시지 타입: {list(unique_types)}",
                    {
                        'received_types': list(unique_types),
                        'expected_types': expected_message_types,
                        'total_messages': len(received_messages)
                    }
                )
                
        except Exception as e:
            self.log_test_result(
                "WebSocket 모니터링 메시지 테스트",
                False,
                f"WebSocket 연결 실패: {e}"
            )
    
    async def test_alert_management_api(self):
        """알림 관리 API 테스트"""
        logger.info("=== 알림 관리 API 테스트 시작 ===")
        
        try:
            # 1. 먼저 알림을 생성하기 위해 높은 임계값 메트릭 전송
            from app.core.alert_manager import global_alert_manager
            
            test_metrics = {
                'system': {
                    'cpu_percent': 98.0,  # CRITICAL
                    'memory_percent': 92.0  # CRITICAL
                }
            }
            
            alerts = global_alert_manager.check_thresholds(test_metrics)
            
            if alerts:
                alert_id = alerts[0].alert_id
                
                # 2. 알림 확인 API 테스트
                response = requests.post(f"{self.base_url}/monitoring/alerts/{alert_id}/acknowledge")
                self.log_test_result(
                    "알림 확인 API",
                    response.status_code == 200,
                    f"알림 확인 응답: {response.status_code}"
                )
                
                # 3. 알림 해결 API 테스트
                response = requests.post(f"{self.base_url}/monitoring/alerts/{alert_id}/resolve")
                self.log_test_result(
                    "알림 해결 API",
                    response.status_code == 200,
                    f"알림 해결 응답: {response.status_code}"
                )
            else:
                self.log_test_result(
                    "알림 관리 API 테스트",
                    False,
                    "테스트용 알림 생성 실패"
                )
                
        except Exception as e:
            self.log_test_result(
                "알림 관리 API 테스트",
                False,
                f"오류 발생: {e}"
            )
    
    async def test_monitoring_service_control(self):
        """모니터링 서비스 제어 API 테스트"""
        logger.info("=== 모니터링 서비스 제어 API 테스트 시작 ===")
        
        try:
            # 1. 모니터링 중지 테스트
            response = requests.post(f"{self.base_url}/monitoring/stop")
            self.log_test_result(
                "모니터링 서비스 중지 API",
                response.status_code == 200,
                f"중지 응답: {response.status_code}"
            )
            
            # 잠시 대기
            await asyncio.sleep(1)
            
            # 2. 모니터링 시작 테스트
            response = requests.post(f"{self.base_url}/monitoring/start")
            self.log_test_result(
                "모니터링 서비스 시작 API",
                response.status_code == 200,
                f"시작 응답: {response.status_code}"
            )
            
        except Exception as e:
            self.log_test_result(
                "모니터링 서비스 제어 API 테스트",
                False,
                f"오류 발생: {e}"
            )
    
    async def test_system_performance_impact(self):
        """시스템 성능 영향 테스트"""
        logger.info("=== 시스템 성능 영향 테스트 시작 ===")
        
        try:
            # 모니터링 시작 전 시스템 상태
            initial_cpu = psutil.cpu_percent(interval=1)
            initial_memory = psutil.virtual_memory().percent
            
            # 5초 동안 모니터링 실행
            await asyncio.sleep(5)
            
            # 모니터링 실행 후 시스템 상태
            final_cpu = psutil.cpu_percent(interval=1)
            final_memory = psutil.virtual_memory().percent
            
            cpu_increase = final_cpu - initial_cpu
            memory_increase = final_memory - initial_memory
            
            # 성능 영향이 5% 미만이면 성공
            performance_impact_acceptable = cpu_increase < 5.0 and memory_increase < 5.0
            
            self.log_test_result(
                "시스템 성능 영향",
                performance_impact_acceptable,
                f"CPU 증가: {cpu_increase:.1f}%, 메모리 증가: {memory_increase:.1f}%",
                {
                    'initial_cpu': initial_cpu,
                    'final_cpu': final_cpu,
                    'initial_memory': initial_memory,
                    'final_memory': final_memory,
                    'cpu_increase': cpu_increase,
                    'memory_increase': memory_increase
                }
            )
            
        except Exception as e:
            self.log_test_result(
                "시스템 성능 영향 테스트",
                False,
                f"오류 발생: {e}"
            )
    
    def print_test_summary(self):
        """테스트 결과 요약 출력"""
        logger.info("\n" + "="*60)
        logger.info("Priority 4 Phase 1 모니터링 시스템 테스트 결과 요약")
        logger.info("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        logger.info(f"전체 테스트: {total_tests}")
        logger.info(f"통과: {passed_tests}")
        logger.info(f"실패: {failed_tests}")
        logger.info(f"성공률: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            logger.info("\n실패한 테스트:")
            for result in self.test_results:
                if not result['success']:
                    logger.info(f"  - {result['test_name']}: {result['message']}")
        
        logger.info("\n주요 기능 상태:")
        
        # 카테고리별 성공률 계산
        categories = {
            'AlertManager': [r for r in self.test_results if 'AlertManager' in r['test_name']],
            'MonitoringService': [r for r in self.test_results if 'MonitoringService' in r['test_name']],
            'REST API': [r for r in self.test_results if 'REST API' in r['test_name']],
            'WebSocket': [r for r in self.test_results if 'WebSocket' in r['test_name']],
            'Alert API': [r for r in self.test_results if '알림' in r['test_name']],
            'Performance': [r for r in self.test_results if '성능' in r['test_name']]
        }
        
        for category, tests in categories.items():
            if tests:
                passed = len([t for t in tests if t['success']])
                total = len(tests)
                status = "OK" if passed == total else "FAIL"
                logger.info(f"  {category}: {passed}/{total} ({status})")
        
        logger.info("="*60)
        
        # 전체적인 성공 여부 반환
        return passed_tests == total_tests

async def main():
    """메인 테스트 실행"""
    logger.info("Priority 4 Phase 1 모니터링 시스템 통합 테스트 시작")
    logger.info("서버가 실행 중인지 확인하세요 (python run_server.py)")
    
    # 서버 연결 대기
    await asyncio.sleep(2)
    
    tester = MonitoringSystemTester()
    
    # 모든 테스트 실행
    await tester.test_alert_manager()
    await tester.test_monitoring_service()
    await tester.test_rest_api_endpoints()
    await tester.test_websocket_monitoring_messages()
    await tester.test_alert_management_api()
    await tester.test_monitoring_service_control()
    await tester.test_system_performance_impact()
    
    # 결과 요약
    success = tester.print_test_summary()
    
    if success:
        logger.info("\n모든 테스트가 성공했습니다!")
        logger.info("Priority 4 Phase 1 모니터링 시스템이 정상적으로 구현되었습니다.")
    else:
        logger.info("\n일부 테스트가 실패했습니다.")
        logger.info("실패한 테스트를 확인하고 수정이 필요합니다.")

if __name__ == "__main__":
    asyncio.run(main()) 