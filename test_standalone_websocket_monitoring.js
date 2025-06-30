const WebSocket = require('ws');

console.log('🔍 Standalone WebSocket (18765) Monitoring Test');
console.log('===============================================');
console.log('🎯 Target: ws://127.0.0.1:18765 (Original Architecture)');

const ws = new WebSocket('ws://127.0.0.1:18765');

let messageCount = 0;
let monitoringMetricsCount = 0;
let rawDataCount = 0;
let processedDataCount = 0;
let statusCount = 0;

ws.on('open', function() {
    console.log('✅ WebSocket connection established to 18765');
    console.log('📤 Sending subscription message for monitoring_metrics...');
    
    // monitoring_metrics 구독
    ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'monitoring_metrics'
    }));
    
    console.log('⏰ Waiting for monitoring_metrics messages...');
});

ws.on('message', function(data) {
    messageCount++;
    const message = JSON.parse(data.toString());
    
    console.log(`\n📨 Message ${messageCount} received:`);
    console.log(`   Type: ${message.type}`);
    console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);
    
    if (message.type === 'monitoring_metrics') {
        monitoringMetricsCount++;
        console.log(`   🎯 MONITORING METRICS #${monitoringMetricsCount}`);
        console.log(`   Data keys: ${Object.keys(message.data || {}).join(', ')}`);
        
        // 주요 메트릭 표시
        if (message.data) {
            console.log(`   - CPU: ${message.data.cpu_usage}%`);
            console.log(`   - Memory: ${message.data.memory_usage}%`);
            console.log(`   - Clients: ${message.data.clients_connected}`);
        }
    } else if (message.type === 'raw_data') {
        rawDataCount++;
        console.log(`   📊 RAW DATA #${rawDataCount}`);
    } else if (message.type === 'processed_data') {
        processedDataCount++;
        console.log(`   🔬 PROCESSED DATA #${processedDataCount}`);
    } else if (message.type === 'status') {
        statusCount++;
        console.log(`   📈 STATUS #${statusCount}`);
        console.log(`   Status: ${message.status || 'undefined'}`);
    } else {
        console.log(`   📦 Other message type: ${message.type}`);
    }
});

ws.on('error', function(error) {
    console.log('❌ WebSocket error:', error.message);
});

ws.on('close', function() {
    console.log('\n🔌 WebSocket connection closed');
    console.log(`📊 Final Statistics:`);
    console.log(`   Total messages: ${messageCount}`);
    console.log(`   Raw data: ${rawDataCount}`);
    console.log(`   Processed data: ${processedDataCount}`);
    console.log(`   Status messages: ${statusCount}`);
    console.log(`   Monitoring metrics: ${monitoringMetricsCount}`);
    
    if (monitoringMetricsCount > 0) {
        console.log('✅ SUCCESS: Monitoring metrics received on 18765!');
    } else {
        console.log('❌ FAILED: No monitoring metrics received on 18765');
    }
});

// 15초 후 연결 종료
setTimeout(() => {
    console.log('\n⏰ Test timeout - closing connection...');
    ws.close();
}, 15000);

// 예상치 못한 종료 처리
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
    ws.close();
    process.exit(0);
}); 