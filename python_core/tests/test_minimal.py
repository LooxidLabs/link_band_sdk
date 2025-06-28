#!/usr/bin/env python3
"""
Windows Python 환경 테스트
MNE, NumPy, SciPy 등의 라이브러리가 제대로 작동하는지 확인
"""

import sys
import platform

print("=" * 60)
print("Python 환경 테스트")
print("=" * 60)
print(f"Platform: {platform.system()} {platform.version()}")
print(f"Python: {sys.version}")
print(f"Python Path: {sys.executable}")
print("=" * 60)

# 1. NumPy 테스트
print("\n1. NumPy 테스트...")
try:
    import numpy as np
    print(f"✅ NumPy {np.__version__} 로드 성공")
    
    # 간단한 연산 테스트
    arr = np.array([1, 2, 3, 4, 5])
    result = np.mean(arr)
    print(f"✅ NumPy 연산 테스트 성공: mean([1,2,3,4,5]) = {result}")
except Exception as e:
    print(f"❌ NumPy 오류: {e}")
    import traceback
    traceback.print_exc()

# 2. SciPy 테스트
print("\n2. SciPy 테스트...")
try:
    import scipy
    from scipy import signal
    print(f"✅ SciPy {scipy.__version__} 로드 성공")
    
    # 간단한 신호 처리 테스트
    b, a = signal.butter(4, 0.2)
    print(f"✅ SciPy signal 처리 테스트 성공")
except Exception as e:
    print(f"❌ SciPy 오류: {e}")
    import traceback
    traceback.print_exc()

# 3. MNE 테스트
print("\n3. MNE 테스트...")
try:
    import mne
    print(f"✅ MNE {mne.__version__} 로드 성공")
    
    # MNE 정보 생성 테스트
    info = mne.create_info(ch_names=['ch1'], sfreq=250, ch_types=['eeg'])
    print(f"✅ MNE create_info 테스트 성공")
    
    # RawArray 생성 테스트
    data = np.random.randn(1, 1000)
    raw = mne.io.RawArray(data, info)
    print(f"✅ MNE RawArray 생성 테스트 성공")
except Exception as e:
    print(f"❌ MNE 오류: {e}")
    import traceback
    traceback.print_exc()

# 4. HeartPy 테스트
print("\n4. HeartPy 테스트...")
try:
    import heartpy as hp
    print(f"✅ HeartPy {hp.__version__} 로드 성공")
    
    # 간단한 필터 테스트
    data = np.random.randn(100)
    filtered = hp.filter_signal(data, cutoff=5, sample_rate=50, order=2, filtertype='lowpass')
    print(f"✅ HeartPy 필터 테스트 성공")
except Exception as e:
    print(f"❌ HeartPy 오류: {e}")
    import traceback
    traceback.print_exc()

# 5. 신호 처리 통합 테스트
print("\n5. 신호 처리 통합 테스트...")
try:
    from app.core.signal_processing import SignalProcessor
    
    processor = SignalProcessor()
    print(f"✅ SignalProcessor 생성 성공")
    
    # EEG 데이터 테스트
    test_eeg_data = [
        {
            "timestamp": 1000.0 + i/250,
            "ch1": np.random.randn() * 50,
            "ch2": np.random.randn() * 50,
            "leadoff_ch1": False,
            "leadoff_ch2": False
        }
        for i in range(2500)  # 10초 데이터
    ]
    
    processor.add_to_buffer("eeg", test_eeg_data)
    print(f"✅ EEG 데이터 버퍼 추가 성공")
    
    # 비동기 처리를 동기로 실행
    import asyncio
    result = asyncio.run(processor.process_eeg_data())
    
    if result:
        print(f"✅ EEG 처리 성공!")
        print(f"   - ch1_power 길이: {len(result.get('ch1_power', []))}")
        print(f"   - ch2_power 길이: {len(result.get('ch2_power', []))}")
        print(f"   - frequencies 길이: {len(result.get('frequencies', []))}")
    else:
        print(f"❌ EEG 처리 결과가 None")
        
except Exception as e:
    print(f"❌ 신호 처리 통합 테스트 오류: {e}")
    import traceback
    traceback.print_exc()

# 6. WebSocket/Asyncio 테스트
print("\n6. WebSocket/Asyncio 테스트...")
try:
    import websockets
    import asyncio
    print(f"✅ websockets {websockets.__version__} 로드 성공")
    
    async def test_async():
        return "Async 작동 확인"
    
    result = asyncio.run(test_async())
    print(f"✅ Asyncio 테스트 성공: {result}")
except Exception as e:
    print(f"❌ WebSocket/Asyncio 오류: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("테스트 완료")
print("=" * 60) 