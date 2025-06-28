#!/usr/bin/env python3

import asyncio
import time
import logging
from app.core.device import DeviceManager
from app.core.device_registry import DeviceRegistry

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_battery_collection():
    """배터리 데이터 수집을 테스트합니다."""
    print("=== 배터리 데이터 수집 테스트 ===")
    
    # DeviceManager 초기화
    registry = DeviceRegistry()
    device_manager = DeviceManager(registry)
    
    try:
        # 현재 연결 상태 확인
        if not device_manager.is_connected():
            print("❌ 디바이스가 연결되어 있지 않습니다.")
            return
        
        print("✅ 디바이스가 연결되어 있습니다.")
        
        # 배터리 모니터링 상태 확인
        print(f"배터리 모니터링 상태: {device_manager.battery_running}")
        print(f"현재 배터리 레벨: {device_manager.battery_level}")
        
        # 배터리 모니터링이 실행 중이 아니면 시작
        if not device_manager.battery_running:
            print("배터리 모니터링을 시작합니다...")
            success = await device_manager.start_battery_monitoring()
            if success:
                print("✅ 배터리 모니터링이 시작되었습니다.")
            else:
                print("❌ 배터리 모니터링 시작에 실패했습니다.")
                return
        
        # 5초간 배터리 데이터 수집
        print("5초간 배터리 데이터를 수집합니다...")
        for i in range(5):
            await asyncio.sleep(1)
            battery_buffer = device_manager.get_and_clear_battery_buffer()
            print(f"[{i+1}초] 배터리 버퍼 크기: {len(battery_buffer)}")
            print(f"[{i+1}초] 현재 배터리 레벨: {device_manager.battery_level}")
            
            if battery_buffer:
                print(f"[{i+1}초] 첫 번째 배터리 데이터: {battery_buffer[0]}")
        
        # 최종 배터리 버퍼 확인
        final_buffer = device_manager.get_and_clear_battery_buffer()
        print(f"\n최종 배터리 버퍼 크기: {len(final_buffer)}")
        if final_buffer:
            print(f"최종 배터리 데이터 샘플: {final_buffer[:3]}")  # 첫 3개만 표시
        
    except Exception as e:
        logger.error(f"배터리 데이터 수집 테스트 중 오류: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(test_battery_collection()) 