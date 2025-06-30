const WebSocket = require('ws');

console.log('🔍 Testing Electron App SystemStatus...');

// WebSocket 연결 테스트
const ws = new WebSocket('ws://localhost:18765');

ws.on('open', function open() {
  console.log('✅ WebSocket connected to Electron app server');
  
  // monitoring_metrics 채널 구독
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'monitoring_metrics'
  }));
  
  console.log('📡 Subscribed to monitoring_metrics channel');
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    
    if (parsed.type === 'monitoring_metrics') {
      console.log('\n🎯 Monitoring Metrics Received:');
      console.log('- Overall Status:', parsed.data.system_status?.overall_status);
      console.log('- Server Status:', parsed.data.system_status?.server_status);
      console.log('- API Status:', parsed.data.system_status?.api_status);
      console.log('- WebSocket Status:', parsed.data.system_status?.websocket_status);
      console.log('- Initialization:', parsed.data.system_status?.initialization_status);
      console.log('- Device Ready:', parsed.data.system_status?.device_ready_status);
      console.log('- Uptime:', parsed.data.system_status?.uptime);
      console.log('- Components:', parsed.data.system_status?.components);
      console.log('- Errors:', parsed.data.system_status?.errors);
      console.log('- Timestamp:', new Date().toLocaleTimeString());
      
      // SystemStatus가 제대로 업데이트되고 있는지 확인
      if (parsed.data.system_status?.overall_status === 'ready' || 
          parsed.data.system_status?.overall_status === 'partially_ready') {
        console.log('🟢 System Status is active - should be visible in UI');
      } else {
        console.log('🔴 System Status is not ready - UI may show "unknown"');
      }
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

// 30초 후 종료
setTimeout(() => {
  console.log('\n⏰ Test completed');
  ws.close();
  process.exit(0);
}, 30000); 