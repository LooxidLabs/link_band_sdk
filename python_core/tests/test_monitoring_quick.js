const WebSocket = require('ws');

console.log('🔌 WebSocket 모니터링 테스트 시작...');

const ws = new WebSocket('ws://127.0.0.1:18765');

let messageCount = 0;
const maxMessages = 10;

ws.on('open', function open() {
    console.log('✅ WebSocket 연결 성공');
    
    // 모니터링 채널 구독
    const channels = ['monitoring_metrics', 'health_updates', 'buffer_status'];
    
    channels.forEach(channel => {
        const subscribeMsg = JSON.stringify({
            type: 'subscribe',
            channel: channel
        });
        ws.send(subscribeMsg);
        console.log(`📡 구독: ${channel}`);
    });
});

ws.on('message', function message(data) {
    messageCount++;
    
    try {
        const parsed = JSON.parse(data);
        console.log(`\n📨 메시지 ${messageCount}/${maxMessages}:`);
        console.log(`   타입: ${parsed.type}`);
        
        if (parsed.type === 'monitoring_metrics' && parsed.data) {
            const { system, health_score } = parsed.data;
            console.log(`   CPU: ${system?.cpu_percent}%`);
            console.log(`   메모리: ${system?.memory_percent}%`);
            console.log(`   건강점수: ${health_score?.overall_score || health_score}`);
        }
        
        if (messageCount >= maxMessages) {
            console.log('\n✅ 테스트 완료 - 데이터 수신 정상');
            ws.close();
            process.exit(0);
        }
    } catch (e) {
        console.log(`   원시 데이터: ${data}`);
    }
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket 에러:', err.message);
    process.exit(1);
});

ws.on('close', function close() {
    console.log('🔌 WebSocket 연결 종료');
});

// 30초 타임아웃
setTimeout(() => {
    console.log('⏰ 타임아웃 - 테스트 종료');
    ws.close();
    process.exit(1);
}, 30000); 