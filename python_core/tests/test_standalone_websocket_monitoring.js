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
        console.log(`🎯 MONITORING METRICS #${monitoringMetricsCount}`);
        
        // 🔥 실제 데이터 구조 상세 출력
        console.log('📊 Full monitoring_metrics data:');
        console.log(JSON.stringify(message.data, null, 2));
        
        const { system, streaming, health_score } = message.data;
        console.log(`Data keys: ${Object.keys(message.data).join(', ')}`);
        
        // 🔥 각 섹션별 상세 데이터 출력
        if (system) {
            console.log('🖥️ System data:');
            console.log(`   - cpu_percent: ${system.cpu_percent}%`);
            console.log(`   - memory_percent: ${system.memory_percent}%`);
            console.log(`   - memory_used_mb: ${system.memory_used_mb}MB`);
            console.log(`   - process_memory_mb: ${system.process_memory_mb}MB`);
        } else {
            console.log('❌ No system data');
        }
        
        if (streaming) {
            console.log('📡 Streaming data:');
            console.log(`   - eeg_sampling_rate: ${streaming.eeg_sampling_rate}Hz`);
            console.log(`   - ppg_sampling_rate: ${streaming.ppg_sampling_rate}Hz`);
            console.log(`   - acc_sampling_rate: ${streaming.acc_sampling_rate}Hz`);
            console.log(`   - battery_level: ${streaming.battery_level}%`);
            console.log(`   - streaming_status: ${streaming.streaming_status}`);
            console.log(`   - device_connected: ${streaming.device_connected}`);
        } else {
            console.log('❌ No streaming data');
        }
        
        if (health_score) {
            console.log('💚 Health data:');
            console.log(`   - overall_score: ${health_score.overall_score}`);
            console.log(`   - health_grade: ${health_score.health_grade}`);
        } else {
            console.log('❌ No health data');
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