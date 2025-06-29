const WebSocket = require('ws');

console.log('WebSocket 연결 테스트 시작...');

const ws = new WebSocket('ws://localhost:18765');

let messageCount = 0;

ws.on('open', function open() {
  console.log('✅ WebSocket 연결 성공!');
  
  // ping 전송
  ws.send(JSON.stringify({
    type: 'ping',
    timestamp: Date.now()
  }));
  
  // 5초 후 종료
  setTimeout(() => {
    console.log(`📊 총 ${messageCount}개 메시지 수신`);
    console.log('🔚 테스트 완료');
    ws.close();
    process.exit(0);
  }, 5000);
});

ws.on('message', function message(data) {
  messageCount++;
  try {
    const parsed = JSON.parse(data);
    console.log(`📨 [${messageCount}] ${parsed.type}:`, parsed.sensor_type || parsed.event_type || 'system');
  } catch (error) {
    console.log(`📨 [${messageCount}] Raw:`, data.toString().substring(0, 50));
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket 오류:', err.message);
  process.exit(1);
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 연결 종료: ${code} ${reason}`);
  process.exit(0);
}); 