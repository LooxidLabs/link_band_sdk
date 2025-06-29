const WebSocket = require('ws');

console.log('🔍 모니터링 시스템 디버깅 테스트 시작...');

const ws = new WebSocket('ws://127.0.0.1:18765');

let messageCount = 0;
const messageTypes = new Set();

ws.on('open', function() {
    console.log('✅ WebSocket 연결 성공');
    
    // 모니터링 관련 채널들 구독
    const monitoringChannels = [
        'monitoring_metrics',
        'health_updates', 
        'buffer_status',
        'system_alerts',
        'batch_status',
        'device_events',
        'stream_events'
    ];
    
    console.log('📡 모니터링 채널 구독 시작...');
    monitoringChannels.forEach(channel => {
        const subscribeMessage = {
            type: 'subscribe',
            channel: channel
        };
        console.log(`   - 구독: ${channel}`);
        ws.send(JSON.stringify(subscribeMessage));
    });
    
    // 10초 후에 결과 출력
    setTimeout(() => {
        console.log('\\n📊 테스트 결과:');
        console.log(`- 총 수신 메시지: ${messageCount}개`);
        console.log(`- 수신된 메시지 타입:`, Array.from(messageTypes));
        
        if (messageTypes.has('monitoring_metrics')) {
            console.log('✅ monitoring_metrics 수신됨');
        } else {
            console.log('❌ monitoring_metrics 수신되지 않음');
        }
        
        if (messageTypes.has('device_events')) {
            console.log('✅ device_events 수신됨');
        } else {
            console.log('❌ device_events 수신되지 않음');
        }
        
        process.exit(0);
    }, 10000);
});

ws.on('message', function(data) {
    try {
        const message = JSON.parse(data.toString());
        messageCount++;
        messageTypes.add(message.type);
        
        // 모니터링 관련 메시지만 출력
        if (['monitoring_metrics', 'health_updates', 'buffer_status', 'system_alerts', 'batch_status', 'device_events', 'stream_events', 'subscription_confirmed'].includes(message.type)) {
            console.log(`📨 [${message.type}] 수신:`, JSON.stringify(message, null, 2).substring(0, 200) + '...');
        }
        
    } catch (error) {
        console.log('❌ JSON 파싱 에러:', error.message);
    }
});

ws.on('error', function(error) {
    console.log('❌ WebSocket 에러:', error.message);
});

ws.on('close', function() {
    console.log('🔌 WebSocket 연결 종료');
}); 