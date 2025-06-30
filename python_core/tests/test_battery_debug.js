const WebSocket = require('ws');

console.log('=== Battery Data Debug Test ===');

// WebSocket 연결
const ws = new WebSocket('ws://localhost:18765');

ws.on('open', () => {
  console.log('[DEBUG] WebSocket connected to ws://localhost:18765');
  
  // raw_data 채널 구독
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'raw_data'
  }));
  
  console.log('[DEBUG] Subscribed to raw_data channel');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    // battery 타입 메시지만 출력
    if (message.type === 'raw_data' && message.sensor_type === 'battery') {
      console.log('[BATTERY DATA] Received battery data:');
      console.log('  - Level:', message.data?.level);
      console.log('  - Voltage:', message.data?.voltage);
      console.log('  - Charging:', message.data?.isCharging);
      console.log('  - Timestamp:', message.timestamp);
      console.log('  - Raw message:', JSON.stringify(message, null, 2));
    }
    
    // device_status 이벤트도 확인
    if (message.type === 'event' && message.event_type === 'device_status') {
      console.log('[DEVICE STATUS] Received device status:');
      console.log('  - Battery level:', message.data?.battery_level);
      console.log('  - Raw message:', JSON.stringify(message, null, 2));
    }
  } catch (error) {
    console.error('[DEBUG] Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  console.error('[DEBUG] WebSocket error:', error);
});

ws.on('close', () => {
  console.log('[DEBUG] WebSocket connection closed');
});

// 10초 후 종료
setTimeout(() => {
  console.log('[DEBUG] Test completed, closing connection');
  ws.close();
  process.exit(0);
}, 10000); 