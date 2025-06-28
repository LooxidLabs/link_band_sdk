#!/usr/bin/env python3

import asyncio
import websockets
import json
import time

async def test_battery_websocket():
    """WebSocket을 통해 배터리 데이터 수신을 테스트합니다."""
    print("=== WebSocket 배터리 데이터 테스트 ===")
    
    uri = "ws://localhost:18765"
    battery_count = 0
    eeg_count = 0
    start_time = time.time()
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"✅ WebSocket 연결 성공: {uri}")
            
            print("10초간 데이터를 수신합니다...")
            
            while time.time() - start_time < 10:  # 10초간 테스트
                try:
                    # 1초 타임아웃으로 메시지 수신
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    
                    if data.get("type") == "sensor_data":
                        sensor_type = data.get("sensor_type")
                        
                        if sensor_type == "bat":
                            battery_count += 1
                            sensor_data = data.get("data", [])
                            if sensor_data and len(sensor_data) > 0:
                                first_sample = sensor_data[0]
                                battery_level = first_sample.get("level", "N/A")
                                print(f"[BAT {battery_count:3d}] 배터리 레벨: {battery_level}% | 샘플 수: {len(sensor_data)}")
                        
                        elif sensor_type == "eeg":
                            eeg_count += 1
                            if eeg_count % 50 == 0:  # 50번마다 한 번씩 출력
                                print(f"[EEG {eeg_count:3d}] EEG 데이터 수신 중...")
                
                except asyncio.TimeoutError:
                    # 타임아웃은 정상 - 데이터가 없을 수 있음
                    continue
                except json.JSONDecodeError as e:
                    print(f"❌ JSON 파싱 오류: {e}")
                except Exception as e:
                    print(f"❌ 메시지 처리 오류: {e}")
            
            print(f"\n=== 테스트 결과 (10초) ===")
            print(f"배터리 데이터 수신: {battery_count}회")
            print(f"EEG 데이터 수신: {eeg_count}회")
            
            if battery_count == 0:
                print("⚠️  배터리 데이터가 수신되지 않았습니다!")
                print("   - 배터리 모니터링이 시작되지 않았거나")
                print("   - 디바이스에서 배터리 데이터를 전송하지 않고 있을 수 있습니다.")
            else:
                print("✅ 배터리 데이터가 정상적으로 수신되고 있습니다.")
                
    except websockets.exceptions.ConnectionRefused:
        print("❌ WebSocket 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.")
    except Exception as e:
        print(f"❌ WebSocket 테스트 중 오류: {e}")

if __name__ == "__main__":
    asyncio.run(test_battery_websocket()) 