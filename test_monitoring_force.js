const WebSocket = require('ws');

console.log('=== Link Band SDK 모니터링 강제 트리거 테스트 ===');

const ws = new WebSocket('ws://127.0.0.1:18765');

ws.on('open', function open() {
    console.log('✅ WebSocket 연결 성공');
    
    // 모든 모니터링 채널 구독
    const subscriptions = [
        'monitoring_metrics',
        'health_updates', 
        'buffer_status',
        'system_alerts',
        'device_events',
        'stream_events',
        'batch_status'
    ];
    
    subscriptions.forEach(channel => {
        const subscribeMessage = {
            type: 'subscribe',
            channel: channel
        };
        ws.send(JSON.stringify(subscribeMessage));
        console.log(`📡 구독 요청: ${channel}`);
    });
    
    console.log('\n⏱️  30초 동안 모니터링 메시지 대기 중...');
    console.log('📊 수신된 메시지:');
});

let messageCount = 0;
const receivedTypes = new Set();

ws.on('message', function message(data) {
    try {
        const parsed = JSON.parse(data.toString());
        messageCount++;
        receivedTypes.add(parsed.type);
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${parsed.type} (총 ${messageCount}개)`);
        
        // 모니터링 관련 메시지만 상세 출력
        if (parsed.type.includes('monitoring') || 
            parsed.type.includes('health') || 
            parsed.type.includes('buffer') || 
            parsed.type.includes('alert') ||
            parsed.type.includes('batch')) {
            console.log(`   📋 데이터:`, JSON.stringify(parsed.data || {}, null, 2).substring(0, 200) + '...');
        }
        
    } catch (e) {
        console.log(`❌ JSON 파싱 오류: ${e.message}`);
    }
});

ws.on('error', function error(err) {
    console.log('❌ WebSocket 오류:', err.message);
});

ws.on('close', function close() {
    console.log('🔌 WebSocket 연결 종료');
    console.log(`\n📊 최종 통계:`);
    console.log(`   총 메시지: ${messageCount}개`);
    console.log(`   수신된 타입: ${Array.from(receivedTypes).join(', ')}`);
});

// 30초 후 종료
setTimeout(() => {
    console.log('\n⏰ 30초 완료, 연결 종료');
    ws.close();
}, 30000);

// 5초마다 통계 출력
setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
        console.log(`📈 현재까지 ${messageCount}개 메시지 수신, 타입: ${Array.from(receivedTypes).join(', ')}`);
    }
}, 5000); 