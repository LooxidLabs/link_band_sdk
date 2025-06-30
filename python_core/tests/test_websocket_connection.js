const WebSocket = require('ws');

console.log('🔌 WebSocket 연결 테스트 시작...');

const ws = new WebSocket('ws://127.0.0.1:18765');

ws.on('open', function open() {
  console.log('✅ WebSocket 연결 성공!');
  
  // 테스트 메시지 전송
  const testMessage = {
    type: 'command',
    command: 'health_check',
    timestamp: new Date().toISOString()
  };
  
  console.log('📤 테스트 메시지 전송:', JSON.stringify(testMessage, null, 2));
  ws.send(JSON.stringify(testMessage));
  
  // 5초 후 연결 종료
  setTimeout(() => {
    console.log('🔚 연결 종료');
    ws.close();
  }, 5000);
});

ws.on('message', function message(data) {
  console.log('📥 수신된 메시지:', data.toString());
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📋 파싱된 데이터:', JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('⚠️  JSON 파싱 실패:', e.message);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket 에러:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket 연결 종료');
  process.exit(0);
});

// 타임아웃 설정
setTimeout(() => {
  console.log('⏰ 연결 타임아웃');
  process.exit(1);
}, 10000); 