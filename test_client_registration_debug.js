const WebSocket = require('ws');

console.log('=== Client Registration Debug Test ===\n');

// 1. 독립 WebSocket 서버 연결 및 클라이언트 등록 확인
console.log('🔍 [STANDALONE] 독립 WebSocket 서버 (ws://127.0.0.1:18765) 클라이언트 등록 확인');

const standaloneWs = new WebSocket('ws://127.0.0.1:18765');

standaloneWs.on('open', function open() {
    console.log('✅ [STANDALONE] 연결 성공');
    
    // 헬스 체크로 클라이언트 수 확인
    console.log('📤 [STANDALONE] 헬스 체크 요청');
    standaloneWs.send(JSON.stringify({
        type: 'command',
        command: 'health_check'
    }));
    
    // 모니터링 메트릭 구독
    setTimeout(() => {
        console.log('📤 [STANDALONE] monitoring_metrics 구독');
        standaloneWs.send(JSON.stringify({
            type: 'subscribe',
            channel: 'monitoring_metrics'
        }));
    }, 1000);
});

standaloneWs.on('message', function message(data) {
    try {
        const parsed = JSON.parse(data);
        
        if (parsed.type === 'health_check_response') {
            console.log(`🏥 [STANDALONE] 헬스 체크 응답: 클라이언트 ${parsed.clients_connected}개 연결됨`);
        } else if (parsed.type === 'subscription_confirmed') {
            console.log(`✅ [STANDALONE] 구독 확인: ${parsed.channel}`);
        } else if (parsed.type === 'monitoring_metrics') {
            console.log(`🎯 [STANDALONE] monitoring_metrics 수신!`);
        }
    } catch (e) {
        // Ignore parsing errors for raw data
    }
});

// 2. FastAPI WebSocket 연결 및 클라이언트 등록 확인
setTimeout(() => {
    console.log('\n🔍 [FASTAPI] FastAPI WebSocket (ws://127.0.0.1:8121/ws) 클라이언트 등록 확인');
    
    const fastapiWs = new WebSocket('ws://127.0.0.1:8121/ws');
    
    fastapiWs.on('open', function open() {
        console.log('✅ [FASTAPI] 연결 성공');
        
        // 상태 메시지 수신 대기
        setTimeout(() => {
            console.log('📤 [FASTAPI] monitoring_metrics 구독 시도');
            fastapiWs.send(JSON.stringify({
                type: 'subscribe',
                channel: 'monitoring_metrics'
            }));
        }, 1000);
    });
    
    fastapiWs.on('message', function message(data) {
        try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'status') {
                console.log(`📊 [FASTAPI] 상태 응답: 클라이언트 ${parsed.data.connected_clients}개 연결됨`);
            } else if (parsed.type === 'subscription_confirmed') {
                console.log(`✅ [FASTAPI] 구독 확인: ${parsed.channel}`);
            } else if (parsed.type === 'monitoring_metrics') {
                console.log(`🎯 [FASTAPI] monitoring_metrics 수신!`);
            }
        } catch (e) {
            console.log(`📥 [FASTAPI] Raw 메시지: ${data.toString().substring(0, 50)}...`);
        }
    });
    
    // 3. 주기적으로 서버 상태 확인
    let checkCount = 0;
    const statusCheck = setInterval(() => {
        checkCount++;
        console.log(`\n🔄 [CHECK ${checkCount}] 서버 상태 확인 중...`);
        
        // 독립 WebSocket에 헬스 체크 요청
        if (standaloneWs.readyState === WebSocket.OPEN) {
            standaloneWs.send(JSON.stringify({
                type: 'command',
                command: 'health_check'
            }));
        }
        
        if (checkCount >= 5) {
            clearInterval(statusCheck);
            console.log('\n📋 === 테스트 완료 ===');
            console.log('만약 monitoring_metrics가 수신되지 않았다면:');
            console.log('1. 모니터링 서비스가 클라이언트를 인식하지 못하고 있음');
            console.log('2. 브로드캐스트 로직에 문제가 있음');
            console.log('3. 클라이언트 등록 타이밍 이슈');
            
            if (standaloneWs.readyState === WebSocket.OPEN) standaloneWs.close();
            if (fastapiWs.readyState === WebSocket.OPEN) fastapiWs.close();
            
            setTimeout(() => process.exit(0), 1000);
        }
    }, 3000); // 3초마다 체크
}, 2000); // 2초 후 FastAPI 테스트 시작 