#!/usr/bin/env python3
"""
데이터 레코딩 시뮬레이션 테스트
PPG, ACC, 배터리 데이터 저장 문제를 목업 데이터로 테스트
"""

import pytest
import asyncio
import json
import time
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
import sys
import os

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.server import WebSocketServer
from app.data.data_recorder import DataRecorder
from app.core.device import DeviceManager
from app.core.device_registry import DeviceRegistry

class MockDeviceManager:
    """DeviceManager 목업 클래스"""
    
    def __init__(self):
        self.is_connected_flag = True
        self.device_info = {
            'address': '00:11:22:33:44:55',
            'name': 'Test LinkBand Device'
        }
        
        # 각 센서별 목업 데이터 버퍼
        self.eeg_buffer = []
        self.ppg_buffer = []
        self.acc_buffer = []
        self.battery_buffer = []
        
        # 처리된 데이터 버퍼
        self.processed_eeg_buffer = []
        self.processed_ppg_buffer = []
        self.processed_acc_buffer = []
        
        # 콜백 리스트
        self.processed_data_callbacks = []
        
        # 배터리 레벨
        self._battery_level = 75
        
        self.setup_mock_data()
    
    def setup_mock_data(self):
        """목업 데이터 생성"""
        current_time = time.time()
        
        # EEG 목업 데이터 (5개 샘플)
        for i in range(5):
            self.eeg_buffer.append({
                "timestamp": current_time + i * 0.004,  # 250Hz
                "ch1": 10.5 + i * 0.1,
                "ch2": -8.3 + i * 0.1,
                "leadoff_ch1": False,
                "leadoff_ch2": False
            })
        
        # PPG 목업 데이터 (3개 샘플)
        for i in range(3):
            self.ppg_buffer.append({
                "timestamp": current_time + i * 0.02,  # 50Hz
                "red": 65000 + i * 100,
                "ir": 63000 + i * 150
            })
        
        # ACC 목업 데이터 (2개 샘플)
        for i in range(2):
            self.acc_buffer.append({
                "timestamp": current_time + i * 0.033,  # 30Hz
                "x": 1000 + i * 10,
                "y": -500 + i * 5,
                "z": 800 + i * 8
            })
        
        # 배터리 목업 데이터 (1개 샘플)
        self.battery_buffer.append({
            "timestamp": current_time,
            "level": 75
        })
        
        # 처리된 데이터 목업
        self.processed_eeg_buffer.append({
            "timestamp": current_time,
            "ch1_mean": 10.7,
            "ch2_mean": -8.1,
            "alpha_power": 0.25,
            "beta_power": 0.15
        })
        
        self.processed_ppg_buffer.append({
            "timestamp": current_time,
            "heart_rate": 72,
            "hrv": 0.045,
            "signal_quality": 0.85
        })
        
        self.processed_acc_buffer.append({
            "timestamp": current_time,
            "magnitude": 1.2,
            "activity_level": "low",
            "step_count": 0
        })
    
    def is_connected(self) -> bool:
        return self.is_connected_flag
    
    def get_device_info(self):
        return self.device_info if self.is_connected_flag else None
    
    # Raw 버퍼 메서드들 (sync) - 계속 데이터 공급
    def get_and_clear_eeg_buffer(self):
        buffer_copy = self.eeg_buffer.copy()
        print(f"[MOCK] EEG buffer returned {len(buffer_copy)} samples")
        # 목업에서는 데이터를 계속 공급하기 위해 일부만 제거
        if len(self.eeg_buffer) > 2:
            self.eeg_buffer = self.eeg_buffer[-2:]  # 마지막 2개만 유지
        return buffer_copy
    
    def get_and_clear_ppg_buffer(self):
        buffer_copy = self.ppg_buffer.copy()
        print(f"[MOCK] PPG buffer returned {len(buffer_copy)} samples")
        # 목업에서는 데이터를 계속 공급하기 위해 일부만 제거
        if len(self.ppg_buffer) > 1:
            self.ppg_buffer = self.ppg_buffer[-1:]  # 마지막 1개만 유지
        return buffer_copy
    
    def get_and_clear_acc_buffer(self):
        buffer_copy = self.acc_buffer.copy()
        print(f"[MOCK] ACC buffer returned {len(buffer_copy)} samples")
        # 목업에서는 데이터를 계속 공급하기 위해 일부만 제거
        if len(self.acc_buffer) > 1:
            self.acc_buffer = self.acc_buffer[-1:]  # 마지막 1개만 유지
        return buffer_copy
    
    def get_and_clear_battery_buffer(self):
        buffer_copy = self.battery_buffer.copy()
        print(f"[MOCK] Battery buffer returned {len(buffer_copy)} samples")
        # 배터리는 항상 같은 값을 반환하므로 버퍼를 유지
        return buffer_copy
    
    # 처리된 버퍼 메서드들 (async)
    async def get_and_clear_processed_eeg_buffer(self):
        buffer_copy = self.processed_eeg_buffer.copy()
        self.processed_eeg_buffer.clear()
        print(f"[MOCK] Processed EEG buffer returned {len(buffer_copy)} samples")
        return buffer_copy
    
    async def get_and_clear_processed_ppg_buffer(self):
        buffer_copy = self.processed_ppg_buffer.copy()
        self.processed_ppg_buffer.clear()
        print(f"[MOCK] Processed PPG buffer returned {len(buffer_copy)} samples")
        return buffer_copy
    
    async def get_and_clear_processed_acc_buffer(self):
        buffer_copy = self.processed_acc_buffer.copy()
        self.processed_acc_buffer.clear()
        print(f"[MOCK] Processed ACC buffer returned {len(buffer_copy)} samples")
        return buffer_copy
    
    # 콜백 관리 메서드들
    def add_processed_data_callback(self, callback):
        """처리된 데이터 콜백 추가"""
        if callback not in self.processed_data_callbacks:
            self.processed_data_callbacks.append(callback)
            print(f"[MOCK] Added processed data callback")
    
    def remove_processed_data_callback(self, callback):
        """처리된 데이터 콜백 제거"""
        if callback in self.processed_data_callbacks:
            self.processed_data_callbacks.remove(callback)
            print(f"[MOCK] Removed processed data callback")
    
    @property
    def battery_level(self):
        """배터리 레벨 속성"""
        return self._battery_level
    
    @property
    def device_address(self):
        """디바이스 주소 속성"""
        return self.device_info['address'] if self.device_info else None


class TestDataRecordingSimulation:
    """데이터 레코딩 시뮬레이션 테스트 클래스"""
    
    @pytest.fixture
    def temp_data_dir(self):
        """임시 데이터 디렉토리 생성"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def mock_device_manager(self):
        """목업 DeviceManager 생성"""
        return MockDeviceManager()
    
    @pytest.fixture
    def data_recorder(self, temp_data_dir):
        """DataRecorder 인스턴스 생성"""
        return DataRecorder(data_dir=temp_data_dir)
    
    @pytest.fixture
    def websocket_server(self, mock_device_manager, data_recorder):
        """WebSocketServer 인스턴스 생성"""
        device_registry = Mock()
        server = WebSocketServer(
            host="127.0.0.1",
            port=18765,
            data_recorder=data_recorder,
            device_manager=mock_device_manager,
            device_registry=device_registry
        )
        return server
    
    @pytest.mark.asyncio
    async def test_eeg_data_recording(self, websocket_server, data_recorder, temp_data_dir):
        """EEG 데이터 레코딩 테스트 (기준선)"""
        print("\n=== EEG 데이터 레코딩 테스트 ===")
        
        # 레코딩 시작
        session_name = "test_eeg_session"
        data_recorder.start_recording(session_name)
        
        # 스트리밍 시작
        websocket_server.is_streaming = True
        
        # EEG 스트리밍 태스크를 짧은 시간 실행
        eeg_task = asyncio.create_task(websocket_server.stream_eeg_data())
        
        # 1초 대기 (몇 번의 스트리밍 사이클)
        await asyncio.sleep(1.0)
        
        # 스트리밍 중지
        websocket_server.is_streaming = False
        
        try:
            await asyncio.wait_for(eeg_task, timeout=2.0)
        except asyncio.TimeoutError:
            eeg_task.cancel()
        
        # 레코딩 중지
        data_recorder.stop_recording()
        
        # 결과 검증 - 실제 생성된 세션 디렉토리 찾기
        session_dirs = [d for d in Path(temp_data_dir).iterdir() if d.is_dir() and session_name in d.name]
        assert len(session_dirs) > 0, f"세션 디렉토리가 생성되지 않았습니다. 디렉토리: {list(Path(temp_data_dir).iterdir())}"
        session_dir = session_dirs[0]  # 첫 번째 매칭 디렉토리 사용
        
        # EEG 파일 확인
        eeg_raw_file = session_dir / "00-11-22-33-44-55_eeg_raw.json"
        if eeg_raw_file.exists():
            print(f"✅ EEG raw 파일 생성됨: {eeg_raw_file}")
            with open(eeg_raw_file, 'r') as f:
                eeg_data = json.load(f)
                print(f"✅ EEG raw 데이터 개수: {len(eeg_data)}")
        else:
            print(f"❌ EEG raw 파일 없음: {eeg_raw_file}")
        
        # 메타 파일 확인
        meta_file = session_dir / "meta.json"
        if meta_file.exists():
            with open(meta_file, 'r') as f:
                meta_data = json.load(f)
                print(f"✅ 메타 데이터: {meta_data}")
        
        print("EEG 테스트 완료\n")
    
    @pytest.mark.asyncio
    async def test_ppg_data_recording(self, websocket_server, data_recorder, temp_data_dir):
        """PPG 데이터 레코딩 테스트 (문제 확인)"""
        print("\n=== PPG 데이터 레코딩 테스트 ===")
        
        # 레코딩 시작
        session_name = "test_ppg_session"
        data_recorder.start_recording(session_name)
        
        # 스트리밍 시작
        websocket_server.is_streaming = True
        
        # PPG 스트리밍 태스크를 짧은 시간 실행
        ppg_task = asyncio.create_task(websocket_server.stream_ppg_data())
        
        # 1초 대기
        await asyncio.sleep(1.0)
        
        # 스트리밍 중지
        websocket_server.is_streaming = False
        
        try:
            await asyncio.wait_for(ppg_task, timeout=2.0)
        except asyncio.TimeoutError:
            ppg_task.cancel()
        
        # 레코딩 중지
        data_recorder.stop_recording()
        
        # 결과 검증 - 실제 생성된 세션 디렉토리 찾기
        session_dirs = [d for d in Path(temp_data_dir).iterdir() if d.is_dir() and session_name in d.name]
        assert len(session_dirs) > 0, f"세션 디렉토리가 생성되지 않았습니다. 디렉토리: {list(Path(temp_data_dir).iterdir())}"
        session_dir = session_dirs[0]  # 첫 번째 매칭 디렉토리 사용
        
        # PPG 파일 확인
        ppg_raw_file = session_dir / "00-11-22-33-44-55_ppg_raw.json"
        ppg_processed_file = session_dir / "00-11-22-33-44-55_ppg_processed.json"
        
        if ppg_raw_file.exists():
            print(f"✅ PPG raw 파일 생성됨: {ppg_raw_file}")
            with open(ppg_raw_file, 'r') as f:
                ppg_data = json.load(f)
                print(f"✅ PPG raw 데이터 개수: {len(ppg_data)}")
        else:
            print(f"❌ PPG raw 파일 없음: {ppg_raw_file}")
        
        if ppg_processed_file.exists():
            print(f"✅ PPG processed 파일 생성됨: {ppg_processed_file}")
            with open(ppg_processed_file, 'r') as f:
                ppg_processed_data = json.load(f)
                print(f"✅ PPG processed 데이터 개수: {len(ppg_processed_data)}")
        else:
            print(f"❌ PPG processed 파일 없음: {ppg_processed_file}")
        
        print("PPG 테스트 완료\n")
    
    @pytest.mark.asyncio
    async def test_acc_data_recording(self, websocket_server, data_recorder, temp_data_dir):
        """ACC 데이터 레코딩 테스트 (문제 확인)"""
        print("\n=== ACC 데이터 레코딩 테스트 ===")
        
        # 레코딩 시작
        session_name = "test_acc_session"
        data_recorder.start_recording(session_name)
        
        # 스트리밍 시작
        websocket_server.is_streaming = True
        
        # ACC 스트리밍 태스크를 짧은 시간 실행
        acc_task = asyncio.create_task(websocket_server.stream_acc_data())
        
        # 1초 대기
        await asyncio.sleep(1.0)
        
        # 스트리밍 중지
        websocket_server.is_streaming = False
        
        try:
            await asyncio.wait_for(acc_task, timeout=2.0)
        except asyncio.TimeoutError:
            acc_task.cancel()
        
        # 레코딩 중지
        data_recorder.stop_recording()
        
        # 결과 검증 - 실제 생성된 세션 디렉토리 찾기
        session_dirs = [d for d in Path(temp_data_dir).iterdir() if d.is_dir() and session_name in d.name]
        assert len(session_dirs) > 0, f"세션 디렉토리가 생성되지 않았습니다. 디렉토리: {list(Path(temp_data_dir).iterdir())}"
        session_dir = session_dirs[0]  # 첫 번째 매칭 디렉토리 사용
        
        # ACC 파일 확인
        acc_raw_file = session_dir / "00-11-22-33-44-55_acc_raw.json"
        acc_processed_file = session_dir / "00-11-22-33-44-55_acc_processed.json"
        
        if acc_raw_file.exists():
            print(f"✅ ACC raw 파일 생성됨: {acc_raw_file}")
            with open(acc_raw_file, 'r') as f:
                acc_data = json.load(f)
                print(f"✅ ACC raw 데이터 개수: {len(acc_data)}")
        else:
            print(f"❌ ACC raw 파일 없음: {acc_raw_file}")
        
        if acc_processed_file.exists():
            print(f"✅ ACC processed 파일 생성됨: {acc_processed_file}")
            with open(acc_processed_file, 'r') as f:
                acc_processed_data = json.load(f)
                print(f"✅ ACC processed 데이터 개수: {len(acc_processed_data)}")
        else:
            print(f"❌ ACC processed 파일 없음: {acc_processed_file}")
        
        print("ACC 테스트 완료\n")
    
    @pytest.mark.asyncio
    async def test_battery_data_recording(self, websocket_server, data_recorder, temp_data_dir):
        """배터리 데이터 레코딩 테스트 (문제 확인)"""
        print("\n=== 배터리 데이터 레코딩 테스트 ===")
        
        # 레코딩 시작
        session_name = "test_battery_session"
        data_recorder.start_recording(session_name)
        
        # 스트리밍 시작
        websocket_server.is_streaming = True
        
        # 배터리 스트리밍 태스크를 짧은 시간 실행
        battery_task = asyncio.create_task(websocket_server.stream_battery_data())
        
        # 1초 대기
        await asyncio.sleep(1.0)
        
        # 스트리밍 중지
        websocket_server.is_streaming = False
        
        try:
            await asyncio.wait_for(battery_task, timeout=2.0)
        except asyncio.TimeoutError:
            battery_task.cancel()
        
        # 레코딩 중지
        data_recorder.stop_recording()
        
        # 결과 검증 - 실제 생성된 세션 디렉토리 찾기
        session_dirs = [d for d in Path(temp_data_dir).iterdir() if d.is_dir() and session_name in d.name]
        assert len(session_dirs) > 0, f"세션 디렉토리가 생성되지 않았습니다. 디렉토리: {list(Path(temp_data_dir).iterdir())}"
        session_dir = session_dirs[0]  # 첫 번째 매칭 디렉토리 사용
        
        # 배터리 파일 확인
        battery_file = session_dir / "00-11-22-33-44-55_bat.json"
        
        if battery_file.exists():
            print(f"✅ 배터리 파일 생성됨: {battery_file}")
            with open(battery_file, 'r') as f:
                battery_data = json.load(f)
                print(f"✅ 배터리 데이터 개수: {len(battery_data)}")
        else:
            print(f"❌ 배터리 파일 없음: {battery_file}")
        
        print("배터리 테스트 완료\n")
    
    @pytest.mark.asyncio
    async def test_all_sensors_recording(self, websocket_server, data_recorder, temp_data_dir):
        """모든 센서 동시 레코딩 테스트"""
        print("\n=== 모든 센서 동시 레코딩 테스트 ===")
        
        # 레코딩 시작
        session_name = "test_all_sensors"
        data_recorder.start_recording(session_name)
        
        # 스트리밍 시작
        websocket_server.is_streaming = True
        
        # 모든 스트리밍 태스크 동시 실행
        tasks = [
            asyncio.create_task(websocket_server.stream_eeg_data()),
            asyncio.create_task(websocket_server.stream_ppg_data()),
            asyncio.create_task(websocket_server.stream_acc_data()),
            asyncio.create_task(websocket_server.stream_battery_data())
        ]
        
        # 2초 대기
        await asyncio.sleep(2.0)
        
        # 스트리밍 중지
        websocket_server.is_streaming = False
        
        # 모든 태스크 정리
        for task in tasks:
            try:
                await asyncio.wait_for(task, timeout=2.0)
            except asyncio.TimeoutError:
                task.cancel()
        
        # 레코딩 중지
        data_recorder.stop_recording()
        
        # 결과 검증 - 실제 생성된 세션 디렉토리 찾기
        session_dirs = [d for d in Path(temp_data_dir).iterdir() if d.is_dir() and session_name in d.name]
        assert len(session_dirs) > 0, f"세션 디렉토리가 생성되지 않았습니다. 디렉토리: {list(Path(temp_data_dir).iterdir())}"
        session_dir = session_dirs[0]  # 첫 번째 매칭 디렉토리 사용
        
        # 모든 파일 확인
        expected_files = [
            "00-11-22-33-44-55_eeg_raw.json",
            "00-11-22-33-44-55_eeg_processed.json",
            "00-11-22-33-44-55_ppg_raw.json",
            "00-11-22-33-44-55_ppg_processed.json",
            "00-11-22-33-44-55_acc_raw.json",
            "00-11-22-33-44-55_acc_processed.json",
            "00-11-22-33-44-55_bat.json",
            "meta.json"
        ]
        
        print("파일 생성 결과:")
        for filename in expected_files:
            file_path = session_dir / filename
            if file_path.exists():
                print(f"✅ {filename}")
                if filename.endswith('.json') and filename != 'meta.json':
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                        print(f"    데이터 개수: {len(data)}")
            else:
                print(f"❌ {filename}")
        
        # 메타 파일 확인
        meta_file = session_dir / "meta.json"
        if meta_file.exists():
            with open(meta_file, 'r') as f:
                meta_data = json.load(f)
                print(f"\n메타 데이터:")
                for key, value in meta_data.items():
                    print(f"  {key}: {value}")
        
        print("전체 센서 테스트 완료\n")


def run_simulation_test():
    """시뮬레이션 테스트 실행"""
    print("🧪 데이터 레코딩 시뮬레이션 테스트 시작")
    print("=" * 60)
    
    # pytest 실행
    pytest_args = [
        __file__,
        "-v",
        "-s",
        "--tb=short"
    ]
    
    exit_code = pytest.main(pytest_args)
    
    print("=" * 60)
    if exit_code == 0:
        print("✅ 모든 테스트 통과!")
    else:
        print("❌ 일부 테스트 실패")
    
    return exit_code


if __name__ == "__main__":
    run_simulation_test() 