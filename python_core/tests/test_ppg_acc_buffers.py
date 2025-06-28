#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.server import ws_server_instance

async def test_ppg_acc_buffers():
    """PPG와 ACC 버퍼에서 실제로 데이터를 가져올 수 있는지 테스트합니다."""
    print("=== PPG & ACC 버퍼 테스트 ===")
    
    if not ws_server_instance:
        print("❌ WebSocket 서버 인스턴스가 없습니다.")
        return
        
    device_manager = ws_server_instance.device_manager
    if not device_manager:
        print("❌ DeviceManager가 없습니다.")
        return
        
    if not device_manager.is_connected():
        print("❌ 디바이스가 연결되어 있지 않습니다.")
        return
        
    print(f"✅ 디바이스 연결됨: {device_manager.get_device_info()}")
    
    print("10초간 PPG와 ACC 버퍼를 모니터링합니다...")
    
    for i in range(10):  # 10초간 테스트
        print(f"\n--- {i+1}초 ---")
        
        # PPG 데이터 확인
        try:
            ppg_raw = await device_manager.get_and_clear_ppg_buffer()
            ppg_processed = await device_manager.get_and_clear_processed_ppg_buffer()
            print(f"PPG Raw: {len(ppg_raw) if ppg_raw else 0}개 샘플")
            print(f"PPG Processed: {len(ppg_processed) if ppg_processed else 0}개 샘플")
            
            if ppg_raw and len(ppg_raw) > 0:
                sample = ppg_raw[0]
                print(f"PPG Raw 첫 샘플 타입: {type(sample)}")
                if isinstance(sample, dict):
                    print(f"PPG Raw 첫 샘플 키: {list(sample.keys())}")
                    
        except Exception as e:
            print(f"❌ PPG 버퍼 오류: {e}")
            
        # ACC 데이터 확인
        try:
            acc_raw = await device_manager.get_and_clear_acc_buffer()
            acc_processed = await device_manager.get_and_clear_processed_acc_buffer()
            print(f"ACC Raw: {len(acc_raw) if acc_raw else 0}개 샘플")
            print(f"ACC Processed: {len(acc_processed) if acc_processed else 0}개 샘플")
            
            if acc_raw and len(acc_raw) > 0:
                sample = acc_raw[0]
                print(f"ACC Raw 첫 샘플 타입: {type(sample)}")
                if isinstance(sample, dict):
                    print(f"ACC Raw 첫 샘플 키: {list(sample.keys())}")
                    
        except Exception as e:
            print(f"❌ ACC 버퍼 오류: {e}")
            
        # EEG 비교용
        try:
            eeg_raw = device_manager.get_and_clear_eeg_buffer()
            print(f"EEG Raw (비교용): {len(eeg_raw) if eeg_raw else 0}개 샘플")
        except Exception as e:
            print(f"❌ EEG 버퍼 오류: {e}")
            
        await asyncio.sleep(1)
    
    print("\n=== 테스트 완료 ===")

if __name__ == "__main__":
    asyncio.run(test_ppg_acc_buffers()) 