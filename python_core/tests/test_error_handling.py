#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.error_handler import ErrorHandler, ErrorType, ErrorSeverity, global_error_handler
from app.core.data_stream_manager import DataStreamManager

async def test_error_handler():
    """ErrorHandler 기능 테스트"""
    print("=== ErrorHandler 테스트 ===")
    
    error_handler = ErrorHandler()
    
    # 1. 기본 에러 처리 테스트
    print("\n1. 기본 에러 처리 테스트")
    await error_handler.handle_error(
        error_type=ErrorType.STREAMING,
        severity=ErrorSeverity.MEDIUM,
        message="테스트 에러",
        sensor_type="eeg"
    )
    
    # 2. 에러 통계 확인
    print("\n2. 에러 통계 확인")
    stats = error_handler.get_error_stats()
    print(f"에러 통계: {stats}")
    
    # 3. 센서 건강 상태 확인
    print("\n3. 센서 건강 상태 확인")
    health = error_handler.get_sensor_health("eeg")
    print(f"EEG 센서 건강 상태: {health}")
    
    # 4. 로버스트 실행 테스트
    print("\n4. 로버스트 실행 테스트")
    
    async def test_function():
        print("테스트 함수 실행 성공")
        return "success"
    
    result = await error_handler.robust_execute(
        func=test_function,
        error_type=ErrorType.STREAMING,
        sensor_type="test"
    )
    print(f"로버스트 실행 결과: {result}")
    
    # 5. 실패하는 함수 테스트
    print("\n5. 실패하는 함수 테스트")
    
    async def failing_function():
        raise Exception("의도적인 테스트 에러")
    
    try:
        await error_handler.robust_execute(
            func=failing_function,
            error_type=ErrorType.STREAMING,
            sensor_type="test",
            max_retries=2
        )
    except Exception as e:
        print(f"예상된 에러 발생: {e}")
    
    # 최종 통계
    print("\n=== 최종 에러 통계 ===")
    final_stats = error_handler.get_error_stats()
    print(f"총 에러 수: {final_stats['total_errors']}")
    print(f"에러 타입별: {final_stats['error_by_type']}")
    print(f"센서별 에러: {final_stats['sensor_errors']}")

async def test_data_stream_manager():
    """DataStreamManager 기능 테스트"""
    print("\n=== DataStreamManager 테스트 ===")
    
    stream_manager = DataStreamManager()
    
    # 1. 스트림 상태 확인
    print("\n1. 초기 스트림 상태")
    status = stream_manager.get_stream_status()
    print(f"스트림 상태: {status}")
    
    # 2. 건강 상태 확인
    print("\n2. 초기 건강 상태")
    health = stream_manager.get_health_summary()
    print(f"건강 상태: {health}")
    
    # 3. 로버스트 스트림 태스크 테스트
    print("\n3. 로버스트 스트림 태스크 테스트")
    
    test_counter = 0
    
    async def test_stream_function():
        nonlocal test_counter
        test_counter += 1
        print(f"테스트 스트림 함수 실행 #{test_counter}")
        
        # 3번째 실행에서 에러 발생
        if test_counter == 3:
            raise Exception("테스트 에러 발생")
        
        await asyncio.sleep(0.1)  # 짧은 대기
    
    # 로버스트 스트림 태스크 실행
    task = asyncio.create_task(
        stream_manager.robust_stream_task("test_sensor", test_stream_function)
    )
    
    # 2초간 실행 후 중지
    await asyncio.sleep(2.0)
    stream_manager.is_streaming = False
    
    try:
        await task
    except Exception as e:
        print(f"스트림 태스크 종료: {e}")
    
    print(f"총 실행 횟수: {test_counter}")

async def test_integration():
    """통합 테스트"""
    print("\n=== 통합 테스트 ===")
    
    # 전역 에러 핸들러 사용
    stream_manager = DataStreamManager(global_error_handler)
    
    # 여러 센서 시뮬레이션
    sensors = ['eeg', 'ppg', 'acc', 'battery']
    execution_counts = {sensor: 0 for sensor in sensors}
    
    async def create_sensor_function(sensor_type):
        async def sensor_function():
            execution_counts[sensor_type] += 1
            print(f"[{sensor_type.upper()}] 실행 #{execution_counts[sensor_type]}")
            
            # PPG에서 가끔 에러 발생 시뮬레이션
            if sensor_type == 'ppg' and execution_counts[sensor_type] % 5 == 0:
                raise Exception(f"{sensor_type} 센서 에러 시뮬레이션")
            
            await asyncio.sleep(0.1)
        return sensor_function
    
    # 각 센서별 로버스트 태스크 시작
    tasks = []
    stream_manager.is_streaming = True
    
    for sensor in sensors:
        sensor_func = await create_sensor_function(sensor)
        task = asyncio.create_task(
            stream_manager.robust_stream_task(sensor, sensor_func)
        )
        tasks.append(task)
    
    # 3초간 실행
    await asyncio.sleep(3.0)
    stream_manager.is_streaming = False
    
    # 모든 태스크 종료
    for task in tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    
    print("\n=== 통합 테스트 결과 ===")
    print(f"실행 횟수: {execution_counts}")
    
    # 에러 통계
    error_stats = global_error_handler.get_error_stats()
    print(f"에러 통계: {error_stats}")
    
    # 센서별 건강 상태
    for sensor in sensors:
        health = global_error_handler.get_sensor_health(sensor)
        print(f"{sensor.upper()} 건강 상태: {health['health_status']}")

async def main():
    """메인 테스트 함수"""
    print("강화된 에러 핸들링 시스템 테스트 시작")
    print("=" * 50)
    
    try:
        await test_error_handler()
        await test_data_stream_manager()
        await test_integration()
        
        print("\n" + "=" * 50)
        print("모든 테스트 완료!")
        
    except Exception as e:
        print(f"테스트 중 에러 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 