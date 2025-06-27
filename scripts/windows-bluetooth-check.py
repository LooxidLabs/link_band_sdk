#!/usr/bin/env python3
"""
Windows Bluetooth 진단 도구
Link Band SDK의 Bluetooth 연결 문제를 진단합니다.
"""

import sys
import platform
import asyncio
import logging
from bleak import BleakScanner, BleakClient
import time

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Link Band 특성 UUID
EEG_NOTIFY_CHAR_UUID = "00000002-0000-1000-8000-00805f9b34fb"
PPG_CHAR_UUID = "00000004-0000-1000-8000-00805f9b34fb"
ACCELEROMETER_CHAR_UUID = "00000005-0000-1000-8000-00805f9b34fb"
BATTERY_CHAR_UUID = "00002a19-0000-1000-8000-00805f9b34fb"

def check_platform():
    """플랫폼 확인"""
    if platform.system() != 'Windows':
        print("⚠️  이 스크립트는 Windows 전용입니다.")
        sys.exit(1)
    
    print(f"✅ 플랫폼: {platform.system()} {platform.version()}")
    print(f"✅ Python 버전: {sys.version}")

async def check_bluetooth_adapter():
    """Bluetooth 어댑터 확인"""
    print("\n🔍 Bluetooth 어댑터 확인 중...")
    try:
        # 짧은 스캔으로 어댑터 동작 확인
        devices = await BleakScanner.discover(timeout=1.0)
        print(f"✅ Bluetooth 어댑터가 정상 작동 중입니다.")
        return True
    except Exception as e:
        print(f"❌ Bluetooth 어댑터 오류: {e}")
        print("\n해결 방법:")
        print("1. Windows 설정 > Bluetooth 및 기타 디바이스에서 Bluetooth가 켜져 있는지 확인")
        print("2. 장치 관리자에서 Bluetooth 어댑터 드라이버 업데이트")
        print("3. PC를 재시작하고 다시 시도")
        return False

async def scan_for_linkband():
    """Link Band 디바이스 스캔"""
    print("\n🔍 Link Band 디바이스 검색 중... (10초)")
    linkband_devices = []
    
    def detection_callback(device, advertisement_data):
        if device.name and "LXB-" in device.name:
            linkband_devices.append(device)
            print(f"  📱 발견: {device.name} ({device.address})")
    
    scanner = BleakScanner(detection_callback=detection_callback)
    await scanner.start()
    await asyncio.sleep(10.0)
    await scanner.stop()
    
    if not linkband_devices:
        print("❌ Link Band 디바이스를 찾을 수 없습니다.")
        print("\n해결 방법:")
        print("1. Link Band가 켜져 있고 페어링 모드인지 확인")
        print("2. 다른 앱/디바이스에 연결되어 있지 않은지 확인")
        print("3. Link Band를 재시작하고 다시 시도")
    else:
        print(f"\n✅ {len(linkband_devices)}개의 Link Band 발견")
    
    return linkband_devices

async def test_connection(device):
    """디바이스 연결 테스트"""
    print(f"\n🔌 {device.name} ({device.address})에 연결 시도 중...")
    
    client = BleakClient(device.address)
    try:
        # 연결 시도
        await client.connect(timeout=30.0)
        print("✅ 연결 성공!")
        
        # 서비스 확인
        print("\n📋 서비스 검색 중...")
        services = await client.get_services()
        print(f"✅ {len(services.services)}개의 서비스 발견")
        
        # 필수 특성 확인
        print("\n🔍 필수 특성 확인 중...")
        required_chars = {
            "EEG": EEG_NOTIFY_CHAR_UUID,
            "PPG": PPG_CHAR_UUID,
            "ACC": ACCELEROMETER_CHAR_UUID,
            "Battery": BATTERY_CHAR_UUID
        }
        
        found_chars = []
        for name, uuid in required_chars.items():
            try:
                char = services.get_characteristic(uuid)
                if char:
                    print(f"  ✅ {name} 특성 발견")
                    found_chars.append(name)
                else:
                    print(f"  ❌ {name} 특성 없음")
            except Exception:
                print(f"  ❌ {name} 특성 접근 실패")
        
        if len(found_chars) == len(required_chars):
            print("\n✅ 모든 필수 특성이 정상입니다.")
            
            # 데이터 수신 테스트
            print("\n📊 데이터 수신 테스트 (5초)...")
            
            data_received = {"EEG": False, "PPG": False, "ACC": False}
            
            def create_handler(sensor_type):
                def handler(sender, data):
                    data_received[sensor_type] = True
                    print(f"  📈 {sensor_type} 데이터 수신: {len(data)} bytes")
                return handler
            
            # Notification 시작
            try:
                await client.start_notify(EEG_NOTIFY_CHAR_UUID, create_handler("EEG"))
                await client.start_notify(PPG_CHAR_UUID, create_handler("PPG"))
                await client.start_notify(ACCELEROMETER_CHAR_UUID, create_handler("ACC"))
                
                # 5초 대기
                await asyncio.sleep(5.0)
                
                # Notification 중지
                await client.stop_notify(EEG_NOTIFY_CHAR_UUID)
                await client.stop_notify(PPG_CHAR_UUID)
                await client.stop_notify(ACCELEROMETER_CHAR_UUID)
                
                # 결과 확인
                print("\n📊 데이터 수신 결과:")
                for sensor, received in data_received.items():
                    if received:
                        print(f"  ✅ {sensor} 데이터 정상 수신")
                    else:
                        print(f"  ❌ {sensor} 데이터 수신 실패")
                
                if all(data_received.values()):
                    print("\n🎉 모든 센서 데이터가 정상적으로 수신됩니다!")
                else:
                    print("\n⚠️  일부 센서 데이터가 수신되지 않습니다.")
                    print("\n해결 방법:")
                    print("1. Link Band를 재시작하고 다시 시도")
                    print("2. Windows를 관리자 권한으로 실행")
                    print("3. Windows Defender 방화벽에서 Python 허용")
                    
            except Exception as e:
                print(f"\n❌ Notification 시작 실패: {e}")
                print("\n해결 방법:")
                print("1. Windows를 최신 버전으로 업데이트")
                print("2. Bluetooth 드라이버 재설치")
                print("3. 다른 Bluetooth 앱을 모두 종료하고 다시 시도")
        
        # 연결 해제
        await client.disconnect()
        print("\n✅ 연결 해제 완료")
        
    except asyncio.TimeoutError:
        print("❌ 연결 시간 초과")
        print("\n해결 방법:")
        print("1. Link Band가 다른 디바이스에 연결되어 있지 않은지 확인")
        print("2. Windows Bluetooth 설정에서 Link Band를 제거하고 다시 페어링")
        print("3. Link Band와 PC 사이의 거리를 가깝게 유지")
    except Exception as e:
        print(f"❌ 연결 실패: {e}")
        print("\n해결 방법:")
        print("1. Windows를 관리자 권한으로 실행")
        print("2. Windows Bluetooth 문제 해결사 실행")
        print("3. PC를 재시작하고 다시 시도")

async def main():
    """메인 진단 프로세스"""
    print("=" * 60)
    print("Link Band SDK - Windows Bluetooth 진단 도구")
    print("=" * 60)
    
    # 플랫폼 확인
    check_platform()
    
    # Bluetooth 어댑터 확인
    if not await check_bluetooth_adapter():
        return
    
    # Link Band 스캔
    devices = await scan_for_linkband()
    if not devices:
        return
    
    # 각 디바이스에 대해 연결 테스트
    for device in devices:
        await test_connection(device)
    
    print("\n" + "=" * 60)
    print("진단 완료")
    print("=" * 60)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n사용자에 의해 중단됨")
    except Exception as e:
        print(f"\n\n예상치 못한 오류: {e}")
        import traceback
        traceback.print_exc() 