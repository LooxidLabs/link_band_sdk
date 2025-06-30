const WebSocket = require('ws');

console.log('=== WebSocket 연결 테스트: ws://localhost:8121/ws (/ws 경로) ===');

const ws = new WebSocket('ws://localhost:8121/ws');

ws.on('open', function() {
    console.log('✅ WebSocket 연결 성공 (ws://localhost:8121/ws)');
    console.log('⏳ 메시지 대기 중...');
});

ws.on('message', function(data) {
    try {
        const message = JSON.parse(data.toString());
        console.log(`📨 메시지 수신: ${message.type}`);
        
        if (message.type === 'monitoring_metrics') {
            console.log('🎉 MONITORING_METRICS 수신 성공!');
            console.log(`📊 스트리밍 상태: ${message.data?.streaming?.streaming_status}`);
            console.log(`🔋 배터리: ${message.data?.streaming?.battery_level}%`);
            process.exit(0);
        }
    } catch (e) {
        console.log(`📨 Raw 메시지: ${data.toString().substring(0, 100)}...`);
    }
});

ws.on('error', function(error) {
    console.log('❌ WebSocket 연결 오류:', error.message);
    process.exit(1);
});

ws.on('close', function() {
    console.log('🔌 WebSocket 연결 종료');
    process.exit(0);
});

// 10초 후 타임아웃
setTimeout(() => {
    console.log('⏰ 10초 타임아웃 - 연결 종료');
    ws.close();
}, 10000); 