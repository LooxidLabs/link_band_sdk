const WebSocket = require('ws');

console.log('=== 모니터링 메트릭 수신 빈도 테스트 ===');

const ws = new WebSocket('ws://localhost:8121/ws');

let messageCount = 0;
let monitoringMetricsCount = 0;
let statusCount = 0;

ws.on('open', function() {
    console.log('✅ WebSocket 연결 성공');
    console.log('⏳ 10초 동안 메시지 수신 상태 모니터링...');
    
    setTimeout(() => {
        console.log('\n📊 === 최종 결과 ===');
        console.log(`📨 총 메시지: ${messageCount}개`);
        console.log(`🎯 monitoring_metrics: ${monitoringMetricsCount}개`);
        console.log(`📊 status: ${statusCount}개`);
        console.log(`📈 수신율: ${monitoringMetricsCount > 0 ? '성공' : '실패'}`);
        ws.close();
    }, 10000);
});

ws.on('message', function(data) {
    messageCount++;
    
    try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'monitoring_metrics') {
            monitoringMetricsCount++;
            console.log(`🎯 [${new Date().toISOString()}] monitoring_metrics #${monitoringMetricsCount}`);
            console.log(`   📊 CPU: ${message.data?.system?.cpu_percent}%`);
            console.log(`   💾 메모리: ${message.data?.system?.memory_percent}%`);
            console.log(`   🔋 배터리: ${message.data?.streaming?.battery_level}%`);
        } else if (message.type === 'status') {
            statusCount++;
            console.log(`📊 [${new Date().toISOString()}] status #${statusCount} - 클라이언트: ${message.data?.connected_clients}개`);
        } else {
            console.log(`📨 [${new Date().toISOString()}] 기타: ${message.type}`);
        }
    } catch (e) {
        console.log(`📨 [${new Date().toISOString()}] Raw 메시지: ${data.toString().substring(0, 50)}...`);
    }
});

ws.on('error', function(error) {
    console.log(`❌ WebSocket 오류: ${error.message}`);
});

ws.on('close', function(code, reason) {
    console.log(`🔌 WebSocket 연결 종료 (코드: ${code})`);
    process.exit(0);
}); 