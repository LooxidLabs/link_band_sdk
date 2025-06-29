const WebSocket = require('ws');

console.log('=== Link Band SDK WebSocket 디버깅 테스트 ===');

const ws = new WebSocket('ws://localhost:18765');

ws.on('open', function open() {
  console.log('[WebSocket] 연결 성공!');
  console.log('[WebSocket] 서버에 ping 전송...');
  
  // 연결 테스트 ping
  ws.send(JSON.stringify({
    type: 'ping',
    timestamp: Date.now()
  }));
  
  // 5초 후 상태 요청
  setTimeout(() => {
    console.log('[WebSocket] 상태 요청 전송...');
    ws.send(JSON.stringify({
      type: 'command',
      command: 'health_check'
    }));
  }, 2000);
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    
    if (parsed.type === 'pong' || parsed.type === 'ping_response') {
      console.log('[WebSocket] Ping 응답 수신:', parsed);
      return;
    }
    
    if (parsed.type === 'event') {
      console.log(`[WebSocket] 이벤트 수신: ${parsed.event_type}`, parsed.data);
      return;
    }
    
    if (parsed.type === 'raw_data') {
      console.log(`[WebSocket] Raw 데이터 수신: ${parsed.sensor_type}, 샘플 수: ${parsed.data?.length || 0}`);
      return;
    }
    
    if (parsed.type === 'processed_data') {
      console.log(`[WebSocket] Processed 데이터 수신: ${parsed.sensor_type}, 샘플 수: ${parsed.data?.length || 0}`);
      return;
    }
    
    console.log('[WebSocket] 기타 메시지 수신:', parsed.type, Object.keys(parsed));
    
  } catch (error) {
    console.log('[WebSocket] Raw 메시지 수신:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('[WebSocket] 연결 오류:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log(`[WebSocket] 연결 종료: ${code} ${reason}`);
});

// 30초 후 자동 종료
setTimeout(() => {
  console.log('[WebSocket] 테스트 완료, 연결 종료');
  ws.close();
  process.exit(0);
}, 30000);

console.log('[WebSocket] ws://localhost:18765 연결 시도 중...'); 