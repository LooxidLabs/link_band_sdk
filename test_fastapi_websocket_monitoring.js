const WebSocket = require('ws');

console.log('=== FastAPI WebSocket 엔드포인트 모니터링 테스트 ===');

// FastAPI WebSocket 엔드포인트로 연결
const ws = new WebSocket('ws://localhost:8121/ws');

ws.on('open', function() {
    console.log('✅ FastAPI WebSocket 연결 성공 (ws://localhost:8121/ws)');
    console.log('⏳ monitoring_metrics 메시지 대기 중...');
});

ws.on('message', function(data) {
    try {
        const message = JSON.parse(data.toString());
        
        console.log(`📨 메시지 수신: ${message.type}`);
        
        if (message.type === 'monitoring_metrics') {
            console.log('\n🎉 === FastAPI에서 MONITORING_METRICS 수신! ===');
            console.log(`📅 타임스탬프: ${message.timestamp}`);
            
            if (message.data && message.data.streaming) {
                const streaming = message.data.streaming;
                console.log('\n📊 === 스트리밍 상태 정보 ===');
                console.log(`  ✨ 스트리밍 상태: ${streaming.streaming_status}`);
                console.log(`  🔗 디바이스 연결: ${streaming.device_connected}`);
                console.log(`  🤖 자동 감지: ${streaming.auto_detected}`);
                console.log(`  🎯 활성 센서: [${streaming.active_sensors.join(', ')}]`);
            }
            
            if (message.data && message.data.system) {
                console.log('\n💻 === 시스템 정보 ===');
                console.log(`  🖥️ CPU: ${message.data.system.cpu_percent.toFixed(1)}%`);
                console.log(`  💾 메모리: ${message.data.system.memory_percent.toFixed(1)}%`);
            }
            
            console.log('\n✅ FastAPI WebSocket에서 모니터링 메트릭 정상 수신!');
        } else {
            console.log(`📄 다른 메시지 타입: ${message.type}`);
        }
    } catch (error) {
        console.error('❌ 메시지 파싱 오류:', error.message);
        console.log('📝 원본 데이터:', data.toString().substring(0, 200) + '...');
    }
});

ws.on('error', function(error) {
    console.error('❌ FastAPI WebSocket 오류:', error.message);
});

ws.on('close', function() {
    console.log('🔌 FastAPI WebSocket 연결 종료');
});

// 10초 후 연결 종료
setTimeout(() => {
    console.log('\n⏰ 10초 경과 - 연결 종료');
    ws.close();
    process.exit(0);
}, 10000); 