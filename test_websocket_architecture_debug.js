const WebSocket = require('ws');

console.log('=== Link Band SDK WebSocket Architecture Analysis ===\n');

// 1. 독립 WebSocket 서버 (포트 18765) 테스트
console.log('🔍 [TEST 1] 독립 WebSocket 서버 (ws://127.0.0.1:18765) 테스트');

const standaloneWs = new WebSocket('ws://127.0.0.1:18765');
let standaloneConnected = false;
let standaloneMessages = [];

standaloneWs.on('open', function open() {
    console.log('✅ [STANDALONE] 독립 WebSocket 서버 연결 성공');
    standaloneConnected = true;
    
    // 모니터링 메트릭 구독
    console.log('📤 [STANDALONE] monitoring_metrics 구독 시도');
    standaloneWs.send(JSON.stringify({
        type: 'subscribe',
        channel: 'monitoring_metrics'
    }));
});

standaloneWs.on('message', function message(data) {
    try {
        const parsed = JSON.parse(data);
        standaloneMessages.push(parsed);
        console.log(`📥 [STANDALONE] 메시지 수신: type="${parsed.type}", timestamp="${parsed.timestamp}"`);
        
        if (parsed.type === 'monitoring_metrics') {
            console.log(`🎯 [STANDALONE] monitoring_metrics 수신 성공! (메시지 ID: ${parsed.monitoring_service_id || 'N/A'})`);
        }
    } catch (e) {
        console.log(`📥 [STANDALONE] Raw 메시지: ${data.toString().substring(0, 100)}...`);
    }
});

standaloneWs.on('error', function error(err) {
    console.log(`❌ [STANDALONE] 연결 오류: ${err.message}`);
});

standaloneWs.on('close', function close() {
    console.log(`🔌 [STANDALONE] 연결 종료 (메시지 ${standaloneMessages.length}개 수신)`);
});

// 2. FastAPI WebSocket 엔드포인트 (포트 8121/ws) 테스트
setTimeout(() => {
    console.log('\n🔍 [TEST 2] FastAPI WebSocket 엔드포인트 (ws://127.0.0.1:8121/ws) 테스트');
    
    const fastapiWs = new WebSocket('ws://127.0.0.1:8121/ws');
    let fastapiConnected = false;
    let fastapiMessages = [];
    
    fastapiWs.on('open', function open() {
        console.log('✅ [FASTAPI] FastAPI WebSocket 엔드포인트 연결 성공');
        fastapiConnected = true;
        
        // 모니터링 메트릭 구독
        console.log('📤 [FASTAPI] monitoring_metrics 구독 시도');
        fastapiWs.send(JSON.stringify({
            type: 'subscribe',
            channel: 'monitoring_metrics'
        }));
    });
    
    fastapiWs.on('message', function message(data) {
        try {
            const parsed = JSON.parse(data);
            fastapiMessages.push(parsed);
            console.log(`📥 [FASTAPI] 메시지 수신: type="${parsed.type}", timestamp="${parsed.timestamp}"`);
            
            if (parsed.type === 'monitoring_metrics') {
                console.log(`🎯 [FASTAPI] monitoring_metrics 수신 성공! (메시지 ID: ${parsed.monitoring_service_id || 'N/A'})`);
            }
        } catch (e) {
            console.log(`📥 [FASTAPI] Raw 메시지: ${data.toString().substring(0, 100)}...`);
        }
    });
    
    fastapiWs.on('error', function error(err) {
        console.log(`❌ [FASTAPI] 연결 오류: ${err.message}`);
    });
    
    fastapiWs.on('close', function close() {
        console.log(`🔌 [FASTAPI] 연결 종료 (메시지 ${fastapiMessages.length}개 수신)`);
    });
    
    // 3. 분석 결과 출력
    setTimeout(() => {
        console.log('\n📊 === WebSocket Architecture Analysis Results ===');
        console.log(`독립 WebSocket 서버 (18765): 연결=${standaloneConnected ? '✅' : '❌'}, 메시지=${standaloneMessages.length}개`);
        console.log(`FastAPI WebSocket (8121/ws): 연결=${fastapiConnected ? '✅' : '❌'}, 메시지=${fastapiMessages.length}개`);
        
        console.log('\n🔍 === Message Type Analysis ===');
        const standaloneTypes = [...new Set(standaloneMessages.map(m => m.type))];
        const fastapiTypes = [...new Set(fastapiMessages.map(m => m.type))];
        
        console.log(`독립 WebSocket 메시지 타입: [${standaloneTypes.join(', ')}]`);
        console.log(`FastAPI WebSocket 메시지 타입: [${fastapiTypes.join(', ')}]`);
        
        console.log('\n🎯 === monitoring_metrics Analysis ===');
        const standaloneMonitoring = standaloneMessages.filter(m => m.type === 'monitoring_metrics');
        const fastapiMonitoring = fastapiMessages.filter(m => m.type === 'monitoring_metrics');
        
        console.log(`독립 WebSocket monitoring_metrics: ${standaloneMonitoring.length}개`);
        console.log(`FastAPI WebSocket monitoring_metrics: ${fastapiMonitoring.length}개`);
        
        if (standaloneMonitoring.length > 0) {
            console.log(`독립 WebSocket 첫 번째 monitoring_metrics ID: ${standaloneMonitoring[0].monitoring_service_id || 'N/A'}`);
        }
        if (fastapiMonitoring.length > 0) {
            console.log(`FastAPI WebSocket 첫 번째 monitoring_metrics ID: ${fastapiMonitoring[0].monitoring_service_id || 'N/A'}`);
        }
        
        console.log('\n🏁 === Conclusion ===');
        if (standaloneMonitoring.length > 0 && fastapiMonitoring.length > 0) {
            console.log('✅ 두 WebSocket 모두에서 monitoring_metrics 수신됨 - 정상적인 이중 브로드캐스트');
        } else if (standaloneMonitoring.length > 0) {
            console.log('⚠️  독립 WebSocket에서만 monitoring_metrics 수신됨');
        } else if (fastapiMonitoring.length > 0) {
            console.log('⚠️  FastAPI WebSocket에서만 monitoring_metrics 수신됨');
        } else {
            console.log('❌ 두 WebSocket 모두에서 monitoring_metrics 수신되지 않음');
        }
        
        // 연결 종료
        if (standaloneWs.readyState === WebSocket.OPEN) standaloneWs.close();
        if (fastapiWs.readyState === WebSocket.OPEN) fastapiWs.close();
        
        setTimeout(() => process.exit(0), 1000);
    }, 10000); // 10초 후 분석
}, 2000); // 2초 후 FastAPI 테스트 시작 