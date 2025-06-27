#!/usr/bin/env python3
"""
WebSocket 클라이언트 테스트 - Raw data와 Processed data 수신 확인
"""

import asyncio
import websockets
import json
import time
from typing import Dict, Any

class WebSocketTestClient:
    def __init__(self, uri: str = "ws://localhost:18765"):
        self.uri = uri
        self.ws = None
        self.received_messages = []
        self.raw_data_count = {"eeg": 0, "ppg": 0, "acc": 0, "battery": 0}
        self.processed_data_count = {"eeg": 0, "ppg": 0, "acc": 0, "battery": 0}
        
    async def connect(self):
        """WebSocket 서버에 연결"""
        try:
            print(f"Connecting to {self.uri}...")
            self.ws = await websockets.connect(self.uri)
            print("✅ WebSocket connected successfully!")
            return True
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    async def listen_for_messages(self, duration: int = 30):
        """메시지 수신 대기"""
        print(f"\n📡 Listening for messages for {duration} seconds...")
        print("Expected message formats:")
        print("Raw data: {'type': 'raw_data', 'sensor_type': 'eeg', 'data': [...], 'timestamp': ..., 'count': ...}")
        print("Processed data: {'type': 'processed_data', 'sensor_type': 'eeg', 'data': {...}, 'timestamp': ...}")
        print("-" * 80)
        
        start_time = time.time()
        
        try:
            while time.time() - start_time < duration:
                try:
                    # 1초 타임아웃으로 메시지 수신 대기
                    message = await asyncio.wait_for(self.ws.recv(), timeout=1.0)
                    await self.handle_message(message)
                except asyncio.TimeoutError:
                    # 타임아웃은 정상 - 계속 대기
                    continue
                except websockets.exceptions.ConnectionClosed:
                    print("❌ WebSocket connection closed")
                    break
                    
        except KeyboardInterrupt:
            print("\n⏹️ Stopped by user")
        
        await self.print_summary()
    
    async def handle_message(self, message: str):
        """수신된 메시지 처리"""
        try:
            data = json.loads(message)
            self.received_messages.append(data)
            
            message_type = data.get('type')
            
            if message_type == 'raw_data':
                await self.handle_raw_data(data)
            elif message_type == 'processed_data':
                await self.handle_processed_data(data)
            elif message_type == 'event' and data.get('event_type') == 'data_received':
                await self.handle_legacy_processed_data(data)  # 기존 형식 지원
            else:
                print(f"📋 Other message: {message_type}")
                
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {e}")
        except Exception as e:
            print(f"❌ Error handling message: {e}")
    
    async def handle_raw_data(self, data: Dict[str, Any]):
        """Raw data 메시지 처리"""
        sensor_type = data.get('sensor_type', 'unknown')
        samples = data.get('data', [])
        timestamp = data.get('timestamp', 0)
        count = data.get('count', 0)
        
        self.raw_data_count[sensor_type] = self.raw_data_count.get(sensor_type, 0) + 1
        
        print(f"🔴 RAW {sensor_type.upper()}: {count} samples, timestamp: {timestamp:.3f}")
        if samples and len(samples) > 0:
            if sensor_type == 'eeg':
                sample = samples[0]
                print(f"   Sample: CH1={sample.get('ch1', 0):.2f}μV, CH2={sample.get('ch2', 0):.2f}μV")
            elif sensor_type == 'ppg':
                sample = samples[0]
                print(f"   Sample: Red={sample.get('red', 0)}, IR={sample.get('ir', 0)}")
            elif sensor_type == 'acc':
                sample = samples[0]
                print(f"   Sample: X={sample.get('x', 0)}, Y={sample.get('y', 0)}, Z={sample.get('z', 0)}")
            elif sensor_type == 'battery':
                sample = samples[0]
                print(f"   Sample: Level={sample.get('level', 0)}%")
    
    async def handle_processed_data(self, data: Dict[str, Any]):
        """Processed data 메시지 처리 (새로운 형식)"""
        sensor_type = data.get('sensor_type', 'unknown')
        processed_data_array = data.get('data', [])
        timestamp = data.get('timestamp', 0)
        
        self.processed_data_count[sensor_type] = self.processed_data_count.get(sensor_type, 0) + 1
        
        print(f"🟢 PROCESSED {sensor_type.upper()}: timestamp: {timestamp:.3f}")
        
        if processed_data_array and len(processed_data_array) > 0:
            processed_info = processed_data_array[0]  # 첫 번째 요소 사용
            if sensor_type == 'eeg':
                print(f"   Filtered: CH1 samples={len(processed_info.get('ch1_filtered', []))}, CH2 samples={len(processed_info.get('ch2_filtered', []))}")
            elif sensor_type == 'ppg':
                print(f"   Filtered: PPG samples={len(processed_info.get('filtered_ppg', []))}")
            elif sensor_type == 'acc':
                print(f"   Filtered: ACC samples={len(processed_info.get('filtered_acc', []))}")
            elif sensor_type == 'battery':
                print(f"   Level: {processed_info.get('level', 0)}%")
        else:
            print(f"   No processed data in array")

    async def handle_legacy_processed_data(self, data: Dict[str, Any]):
        """Legacy processed data 메시지 처리 (기존 형식)"""
        event_data = data.get('data', {})
        sensor_type = event_data.get('type', 'unknown')
        processed_info = event_data.get('data', {})
        
        self.processed_data_count[sensor_type] = self.processed_data_count.get(sensor_type, 0) + 1
        
        print(f"🟡 LEGACY PROCESSED {sensor_type.upper()}: timestamp: {processed_info.get('timestamp', 0):.3f}")
        if sensor_type == 'eeg':
            print(f"   Filtered: CH1 samples={len(processed_info.get('ch1_filtered', []))}, CH2 samples={len(processed_info.get('ch2_filtered', []))}")
        elif sensor_type == 'ppg':
            print(f"   Filtered: PPG samples={len(processed_info.get('filtered_ppg', []))}")
        elif sensor_type == 'acc':
            print(f"   Filtered: ACC samples={len(processed_info.get('filtered_acc', []))}")
        elif sensor_type == 'battery':
            print(f"   Level: {processed_info.get('level', 0)}%")
    
    async def print_summary(self):
        """수신 결과 요약 출력"""
        print("\n" + "="*80)
        print("📊 MESSAGE SUMMARY")
        print("="*80)
        print(f"Total messages received: {len(self.received_messages)}")
        print("\n🔴 RAW DATA COUNT:")
        for sensor, count in self.raw_data_count.items():
            print(f"   {sensor.upper()}: {count} messages")
        
        print("\n🟢 PROCESSED DATA COUNT:")
        for sensor, count in self.processed_data_count.items():
            print(f"   {sensor.upper()}: {count} messages")
        
        total_raw = sum(self.raw_data_count.values())
        total_processed = sum(self.processed_data_count.values())
        
        print(f"\n📈 TOTALS:")
        print(f"   Raw data messages: {total_raw}")
        print(f"   Processed data messages: {total_processed}")
        print(f"   Total data messages: {total_raw + total_processed}")
        
        if total_raw > 0 and total_processed > 0:
            print("\n✅ SUCCESS: Both raw and processed data are being received!")
        elif total_raw > 0:
            print("\n⚠️  WARNING: Only raw data received, no processed data")
        elif total_processed > 0:
            print("\n⚠️  WARNING: Only processed data received, no raw data")
        else:
            print("\n❌ ERROR: No sensor data received")
    
    async def disconnect(self):
        """WebSocket 연결 종료"""
        if self.ws:
            await self.ws.close()
            print("🔌 WebSocket disconnected")

async def main():
    """메인 테스트 함수"""
    client = WebSocketTestClient()
    
    if not await client.connect():
        return
    
    try:
        await client.listen_for_messages(duration=30)  # 30초 동안 수신
    finally:
        await client.disconnect()

if __name__ == "__main__":
    print("🧪 WebSocket Client Test - Raw & Processed Data Verification")
    print("=" * 80)
    print("This client will connect to the WebSocket server and verify that:")
    print("1. Raw data is sent in the format: {'type': 'raw_data', 'sensor_type': '...', 'data': [...]}")
    print("2. Processed data is sent in the format: {'type': 'event', 'event_type': 'data_received', 'data': {...}}")
    print("=" * 80)
    
    asyncio.run(main()) 