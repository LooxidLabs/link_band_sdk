const WebSocket = require('ws');

console.log('=== 간단한 WebSocket 연결 테스트 ===');

const ws = new WebSocket('ws://localhost:8121/ws');

ws.on('open', function() {
    console.log('✅ WebSocket 연결 성공');
    console.log('⏳ 5초 대기 후 종료...');
    
    setTimeout(() => {
        console.log('🔌 연결 종료');
        ws.close();
    }, 5000);
});

ws.on('message', function(data) {
    console.log(`📨 메시지 수신: ${data.toString().substring(0, 100)}...`);
});

ws.on('error', function(error) {
    console.log(`❌ WebSocket 오류: ${error.message}`);
});

ws.on('close', function(code, reason) {
    console.log(`🔌 WebSocket 연결 종료 (코드: ${code})`);
    process.exit(0);
}); 