const WebSocket = require('ws');

console.log('=== WebSocket 구독 메시지 테스트 ===');

const ws = new WebSocket('ws://localhost:8121/ws');

let messageCount = 0;
let monitoringMetricsCount = 0;

ws.on('open', function() {
    console.log('✅ WebSocket 연결 성공');
    
    // 연결 후 구독 메시지 전송
    setTimeout(() => {
        console.log('📤 구독 메시지 전송...');
        const subscribeMessage = {
            type: 'subscribe',
            topics: ['monitoring_metrics', 'health_updates', 'buffer_status']
        };
        ws.send(JSON.stringify(subscribeMessage));
    }, 1000);
    
    // 15초 후 종료
    setTimeout(() => {
        console.log('\n📊 === 최종 결과 ===');
        console.log(`📨 총 메시지: ${messageCount}개`);
        console.log(`🎯 monitoring_metrics: ${monitoringMetricsCount}개`);
        console.log(`📈 수신율: ${monitoringMetricsCount > 0 ? '성공' : '실패'}`);
        ws.close();
    }, 15000);
});

ws.on('message', function(data) {
    messageCount++;
    
    try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'monitoring_metrics') {
            monitoringMetricsCount++;
            console.log(`🎯 [${new Date().toISOString()}] monitoring_metrics #${monitoringMetricsCount}`);
            
            // 상세 정보 출력
            if (message.data) {
                const { system, streaming, health_score } = message.data;
                console.log(`   📊 CPU: ${system?.cpu_percent}%, 메모리: ${system?.memory_percent}%`);
                console.log(`   🔋 배터리: ${streaming?.battery_level}%, 스트리밍: ${streaming?.streaming_status}`);
                console.log(`   💯 건강 점수: ${health_score?.overall_score} (${health_score?.health_grade})`);
                console.log(`   🆔 서비스 ID: ${message.monitoring_service_id}`);
            }
        } else if (message.type === 'status') {
            console.log(`📊 [${new Date().toISOString()}] status - 클라이언트: ${message.data?.connected_clients}개`);
        } else if (message.type === 'health_updates') {
            console.log(`🏥 [${new Date().toISOString()}] health_updates - 점수: ${message.data?.overall_score}`);
        } else if (message.type === 'buffer_status') {
            console.log(`📦 [${new Date().toISOString()}] buffer_status`);
        } else {
            console.log(`📨 [${new Date().toISOString()}] 기타: ${message.type}`);
        }
    } catch (e) {
        console.log(`📨 [${new Date().toISOString()}] Raw 메시지: ${data.toString().substring(0, 100)}...`);
    }
});

ws.on('error', function(error) {
    console.log(`❌ WebSocket 오류: ${error.message}`);
});

ws.on('close', function(code, reason) {
    console.log(`🔌 WebSocket 연결 종료 (코드: ${code})`);
    process.exit(0);
}); 