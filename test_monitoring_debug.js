const WebSocket = require('ws');

console.log('=== 모니터링 서비스 디버깅 테스트 ===\n');

// 1. 먼저 FastAPI WebSocket 연결 및 구독
console.log('🔍 [1단계] FastAPI WebSocket 연결 및 구독');

const fastapiWs = new WebSocket('ws://127.0.0.1:8121/ws');
let subscriptionConfirmed = false;
let monitoringReceived = false;

fastapiWs.on('open', function open() {
    console.log('✅ FastAPI WebSocket 연결 성공');
    
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
        
        if (parsed.type === 'subscription_confirmed') {
            console.log('✅ 구독 확인됨');
            subscriptionConfirmed = true;
        } else if (parsed.type === 'monitoring_metrics') {
            console.log('🎯 monitoring_metrics 수신!');
            monitoringReceived = true;
        }
    } catch (e) {
        // ignore
    }
});

// 2. 10초 후 서버 상태 점검
setTimeout(async () => {
    console.log('\n🔍 [2단계] 서버 상태 점검');
    
    try {
        // 서버 헬스 체크
        const healthResponse = await fetch('http://localhost:8121/');
        console.log(`📊 서버 응답: ${healthResponse.status}`);
        
        // 스트림 상태 확인
        const streamResponse = await fetch('http://localhost:8121/stream/status');
        const streamData = await streamResponse.json();
        console.log(`📊 스트림 상태: ${JSON.stringify(streamData, null, 2)}`);
        
    } catch (e) {
        console.log(`❌ API 호출 실패: ${e.message}`);
    }
    
    console.log(`\n📋 현재 상태:`);
    console.log(`- 구독 확인: ${subscriptionConfirmed ? '✅' : '❌'}`);
    console.log(`- monitoring_metrics 수신: ${monitoringReceived ? '✅' : '❌'}`);
    
    // 3. 추가로 20초 더 대기
    console.log('\n🔍 [3단계] 20초 추가 대기 중...');
    
    setTimeout(() => {
        console.log('\n📋 === 최종 결과 ===');
        console.log(`구독 확인: ${subscriptionConfirmed ? '✅' : '❌'}`);
        console.log(`monitoring_metrics 수신: ${monitoringReceived ? '✅' : '❌'}`);
        
        if (subscriptionConfirmed && !monitoringReceived) {
            console.log('\n🔍 문제 분석:');
            console.log('1. FastAPI WebSocket 구독은 성공');
            console.log('2. 하지만 모니터링 서비스가 브로드캐스트하지 않음');
            console.log('3. 가능한 원인:');
            console.log('   - 모니터링 서비스가 시작되지 않음');
            console.log('   - 브로드캐스트 로직에서 FastAPI 구독자 인식 실패');
            console.log('   - 모니터링 태스크가 실행되지 않음');
        }
        
        fastapiWs.close();
        process.exit(0);
    }, 20000);
    
}, 10000);
