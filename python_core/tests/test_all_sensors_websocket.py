#!/usr/bin/env python3

import asyncio
import websockets
import json
import time

async def test_all_sensors_websocket():
    """WebSocket을 통해 모든 센서 데이터 수신을 테스트합니다."""
    print("=== 모든 센서 WebSocket 데이터 테스트 ===")
    
    uri = "ws://localhost:18765"
    sensor_counts = {
        "eeg": 0,
        "ppg": 0, 
        "acc": 0,
        "bat": 0
    }
    
    message_types = {
        "raw_data": 0,
        "processed_data": 0,
        "sensor_data": 0
    }
    
    start_time = time.time()
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"✅ WebSocket 연결 성공: {uri}")
            
            print("15초간 모든 센서 데이터를 수신합니다...")
            
            while time.time() - start_time < 15:  # 15초간 테스트
                try:
                    # 1초 타임아웃으로 메시지 수신
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    
                    message_type = data.get("type")
                    if message_type in message_types:
                        message_types[message_type] += 1
                    
                    if message_type in ["raw_data", "processed_data", "sensor_data"]:
                        sensor_type = data.get("sensor_type")
                        
                        if sensor_type in sensor_counts:
                            sensor_counts[sensor_type] += 1
                            sensor_data = data.get("data", [])
                            
                            # 각 센서별로 첫 번째 샘플의 정보 출력 (가끔씩)
                            if sensor_counts[sensor_type] % 50 == 1:  # 첫 번째와 50번째마다
                                if sensor_data and len(sensor_data) > 0:
                                    first_sample = sensor_data[0]
                                    if sensor_type == "eeg":
                                        print(f"[EEG {sensor_counts[sensor_type]:3d}] {message_type} | 샘플 수: {len(sensor_data)}")
                                    elif sensor_type == "ppg":
                                        print(f"[PPG {sensor_counts[sensor_type]:3d}] {message_type} | 샘플 수: {len(sensor_data)}")
                                    elif sensor_type == "acc":
                                        print(f"[ACC {sensor_counts[sensor_type]:3d}] {message_type} | 샘플 수: {len(sensor_data)}")
                                    elif sensor_type == "bat":
                                        battery_level = first_sample.get("level", "N/A") if isinstance(first_sample, dict) else "N/A"
                                        print(f"[BAT {sensor_counts[sensor_type]:3d}] {message_type} | 배터리: {battery_level}% | 샘플 수: {len(sensor_data)}")
                
                except asyncio.TimeoutError:
                    # 타임아웃은 정상 - 데이터가 없을 수 있음
                    continue
                except json.JSONDecodeError as e:
                    print(f"❌ JSON 파싱 오류: {e}")
                except Exception as e:
                    print(f"❌ 메시지 처리 오류: {e}")
            
            print(f"\n=== 테스트 결과 (15초) ===")
            print(f"메시지 타입별 수신:")
            for msg_type, count in message_types.items():
                print(f"  {msg_type}: {count}회")
            
            print(f"\n센서별 데이터 수신:")
            for sensor, count in sensor_counts.items():
                status = "✅" if count > 0 else "❌"
                print(f"  {status} {sensor.upper()}: {count}회")
            
            # 문제 진단
            print(f"\n=== 문제 진단 ===")
            if sensor_counts["eeg"] == 0:
                print("⚠️  EEG 데이터가 수신되지 않음 - 스트리밍이 시작되지 않았을 수 있음")
            else:
                print("✅ EEG 데이터 정상 수신")
                
            if sensor_counts["ppg"] == 0:
                print("⚠️  PPG 데이터가 수신되지 않음 - PPG 스트리밍 태스크 문제")
            else:
                print("✅ PPG 데이터 정상 수신")
                
            if sensor_counts["acc"] == 0:
                print("⚠️  ACC 데이터가 수신되지 않음 - ACC 스트리밍 태스크 문제")
            else:
                print("✅ ACC 데이터 정상 수신")
                
            if sensor_counts["bat"] == 0:
                print("⚠️  배터리 데이터가 수신되지 않음 - 배터리 모니터링 문제")
            else:
                print("✅ 배터리 데이터 정상 수신")
                
    except websockets.exceptions.ConnectionRefused:
        print("❌ WebSocket 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.")
    except Exception as e:
        print(f"❌ WebSocket 테스트 중 오류: {e}")

if __name__ == "__main__":
    asyncio.run(test_all_sensors_websocket()) 