const WebSocket = require('ws');

console.log('=== 상세 WebSocket 연결 디버깅 ===');

const ws = new WebSocket('ws://localhost:8121/ws');

let connectionStartTime = Date.now();
let messageCount = 0;

ws.on('open', function() {
    const connectionTime = Date.now() - connectionStartTime;
    console.log(`✅ WebSocket 연결 성공 (${connectionTime}ms)`);
    console.log(`🔗 연결 상태: ${ws.readyState}`);
    console.log(`📡 URL: ws://localhost:8121/ws`);
    console.log('⏳ 메시지 대기 중...');
    
    // 연결 후 5초마다 상태 확인
    setInterval(() => {
        console.log(`🔍 연결 상태 체크: ${ws.readyState} (받은 메시지: ${messageCount}개)`);
    }, 5000);
});

ws.on('message', function(data) {
    messageCount++;
    const timestamp = new Date().toISOString();
    
    try {
        const message = JSON.parse(data.toString());
        console.log(`\n📨 [${timestamp}] 메시지 #${messageCount}: ${message.type}`);
        
        if (message.type === 'monitoring_metrics') {
            console.log('🎉 === MONITORING_METRICS 수신! ===');
            console.log(`📊 스트리밍 상태: ${message.data?.streaming?.streaming_status}`);
            console.log(`🔋 배터리: ${message.data?.streaming?.battery_level}%`);
            console.log(`🖥️  CPU: ${message.data?.system?.cpu_percent}%`);
            console.log(`💾 메모리: ${message.data?.system?.memory_percent}%`);
            console.log(`🆔 서비스 ID: ${message.monitoring_service_id}`);
        } else if (message.type === 'status') {
            console.log(`📊 상태 메시지: 연결된 클라이언트 ${message.data?.connected_clients}개`);
        } else {
            console.log(`📄 기타 메시지 타입: ${message.type}`);
        }
    } catch (e) {
        console.log(`📨 [${timestamp}] Raw 메시지 #${messageCount}: ${data.toString().substring(0, 200)}...`);
    }
});

ws.on('error', function(error) {
    console.log(`❌ WebSocket 오류: ${error.message}`);
    console.log(`🔗 연결 상태: ${ws.readyState}`);
});

ws.on('close', function(code, reason) {
    const connectionDuration = Date.now() - connectionStartTime;
    console.log(`\n🔌 WebSocket 연결 종료`);
    console.log(`⏱️  연결 지속 시간: ${connectionDuration}ms`);
    console.log(`📋 종료 코드: ${code}`);
    console.log(`📝 종료 이유: ${reason || '없음'}`);
    console.log(`📊 총 받은 메시지: ${messageCount}개`);
    process.exit(0);
});

// 30초 후 타임아웃
setTimeout(() => {
    console.log(`\n⏰ 30초 타임아웃 - 연결 종료`);
    console.log(`📊 총 받은 메시지: ${messageCount}개`);
    ws.close();
}, 30000); 