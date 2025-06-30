#!/usr/bin/env python3

import sys
import os
import time

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python_core'))

from app.core.streaming_monitor import StreamingMonitor

def test_streaming_monitor():
    print("🔍 StreamingMonitor 계산 로직 테스트 시작...")
    
    monitor = StreamingMonitor()
    
    # EEG 데이터 시뮬레이션 (250Hz, 25개 샘플씩)
    print("\n📊 EEG 데이터 시뮬레이션 (250Hz, 25개 샘플씩):")
    
    start_time = time.time()
    total_samples = 0
    
    for i in range(20):  # 20번 반복 (약 0.8초간)
        # 25개 샘플 추가
        monitor.track_data_flow('eeg', 25)
        total_samples += 25
        
        # 현재 상태 출력
        eeg_data = monitor.data_flow_tracker['eeg']
        elapsed_time = time.time() - start_time
        expected_rate = total_samples / elapsed_time if elapsed_time > 0 else 0
        
        print(f"  [{i+1:2d}] 샘플: {eeg_data.total_samples:4d}, "
              f"경과시간: {elapsed_time:.3f}s, "
              f"계산된 레이트: {eeg_data.samples_per_second:.1f} Hz, "
              f"예상 레이트: {expected_rate:.1f} Hz")
        
        # 40ms 대기 (25Hz 브로드캐스트 간격)
        time.sleep(0.04)
    
    print(f"\n✅ 최종 결과:")
    final_eeg_data = monitor.data_flow_tracker['eeg']
    final_elapsed = time.time() - start_time
    final_expected = total_samples / final_elapsed
    
    print(f"   - 총 샘플: {final_eeg_data.total_samples}")
    print(f"   - 총 시간: {final_elapsed:.3f}초")
    print(f"   - StreamingMonitor 계산: {final_eeg_data.samples_per_second:.1f} Hz")
    print(f"   - 실제 예상값: {final_expected:.1f} Hz")
    
    # 250Hz와 비교
    if abs(final_eeg_data.samples_per_second - 250) <= 10:
        print(f"   ✅ 정상: 250Hz 근처 ({final_eeg_data.samples_per_second:.1f} Hz)")
    else:
        print(f"   ❌ 비정상: 250Hz에서 벗어남 ({final_eeg_data.samples_per_second:.1f} Hz)")

if __name__ == "__main__":
    test_streaming_monitor() 