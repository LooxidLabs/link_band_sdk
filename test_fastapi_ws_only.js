const WebSocket = require('ws');

console.log('=== FastAPI WebSocket Only Test ===\n');

console.log('🔍 FastAPI WebSocket (ws://127.0.0.1:8121/ws) 연결 테스트');

const fastapiWs = new WebSocket('ws://127.0.0.1:8121/ws');
let messageCount = 0;
let monitoringMetricsReceived = false;

fastapiWs.on('open', function open() {
    console.log('✅ FastAPI WebSocket 연결 성공');
    
    // 연결 후 잠시 대기
    setTimeout(() => {
        console.log('📤 monitoring_metrics 구독 요청');
        fastapiWs.send(JSON.stringify({
            type: 'subscribe',
            channel: 'monitoring_metrics'
        }));
    }, 1000);
});

fastapiWs.on('message', function message(data) {
    try {
        const parsed = JSON.parse(data);
        messageCount++;
        
        console.log(`📥 [${messageCount}] 메시지 타입: ${parsed.type}`);
        
        if (parsed.type === 'status') {
            console.log(`📊 상태: 클라이언트 ${parsed.data.connected_clients}개 연결됨`);
        } else if (parsed.type === 'subscription_confirmed') {
            console.log(`✅ 구독 확인: ${parsed.channel}`);
        } else if (parsed.type === 'monitoring_metrics') {
            console.log(`🎯 monitoring_metrics 수신! (${parsed.monitoring_service_id})`);
            console.log(`📊 시스템 CPU: ${parsed.data.system.cpu_percent}%, 메모리: ${parsed.data.system.memory_percent}%`);
            console.log(`🔋 배터리: ${parsed.data.streaming.battery_level}%, 스트리밍: ${parsed.data.streaming.streaming_status}`);
            monitoringMetricsReceived = true;
        } else {
            console.log(`📋 기타 메시지: ${JSON.stringify(parsed).substring(0, 100)}...`);
        }
    } catch (e) {
        console.log(`📥 Raw 메시지: ${data.toString().substring(0, 50)}...`);
    }
});

fastapiWs.on('error', function error(err) {
    console.error('❌ WebSocket 에러:', err.message);
});

fastapiWs.on('close', function close() {
    console.log('🔌 WebSocket 연결 종료');
});

// 20초 후 테스트 종료
setTimeout(() => {
    console.log('\n📋 === 테스트 결과 ===');
    console.log(`총 수신 메시지: ${messageCount}개`);
    console.log(`monitoring_metrics 수신: ${monitoringMetricsReceived ? '✅ 성공' : '❌ 실패'}`);
    
    if (!monitoringMetricsReceived) {
        console.log('\n🔍 문제 분석:');
        console.log('- 모니터링 서비스가 실행 중이지만 클라이언트를 인식하지 못함');
        console.log('- WebSocket 서버 인스턴스 참조 문제');
        console.log('- 클라이언트 등록 타이밍 이슈');
    }
    
    if (fastapiWs.readyState === WebSocket.OPEN) {
        fastapiWs.close();
    }
    
    setTimeout(() => process.exit(0), 1000);
}, 20000); 