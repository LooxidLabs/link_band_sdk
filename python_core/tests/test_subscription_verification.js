const WebSocket = require('ws');

console.log('🔍 Subscription Verification Test');
console.log('=================================');
console.log('🎯 Testing if server detects subscribed clients');

const ws = new WebSocket('ws://127.0.0.1:18765');

let messageCount = 0;
let monitoringMetricsCount = 0;

ws.on('open', function() {
    console.log('✅ WebSocket connection established');
    console.log('📤 Sending subscription message...');
    
    ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'monitoring_metrics'
    }));
    
    console.log('⏰ Subscription sent. Waiting for server to detect...');
    console.log('📋 Check server logs for:');
    console.log('   - [WEBSOCKET_SUBSCRIBE] Client subscribed to channel: monitoring_metrics');
    console.log('   - [MONITORING_BROADCAST] Standalone clients: 1 (should be 1, not 0)');
    console.log('   - monitoring_metrics messages should appear');
});

ws.on('message', function(data) {
    messageCount++;
    const message = JSON.parse(data.toString());
    
    if (message.type === 'subscription_confirmed') {
        console.log(`✅ Subscription confirmed for channel: ${message.channel}`);
        console.log('🔄 Now monitoring service should detect this client...');
    } else if (message.type === 'monitoring_metrics') {
        monitoringMetricsCount++;
        console.log(`🎯 SUCCESS! Monitoring metrics #${monitoringMetricsCount} received!`);
        console.log(`   CPU: ${message.data?.cpu_usage}%`);
        console.log(`   Memory: ${message.data?.memory_usage}%`);
    } else {
        console.log(`📦 Other message: ${message.type}`);
    }
});

ws.on('error', function(error) {
    console.log('❌ WebSocket error:', error.message);
});

ws.on('close', function() {
    console.log('\n🔌 Connection closed');
    console.log(`📊 Results:`);
    console.log(`   Total messages: ${messageCount}`);
    console.log(`   Monitoring metrics: ${monitoringMetricsCount}`);
    
    if (monitoringMetricsCount > 0) {
        console.log('✅ SUCCESS: Server properly detected subscribed client!');
    } else {
        console.log('❌ FAILED: Server did not detect subscribed client');
        console.log('🔍 Check server logs for client detection issues');
    }
});

// 더 긴 시간 대기 (20초)
setTimeout(() => {
    console.log('\n⏰ Test timeout after 20 seconds...');
    ws.close();
}, 20000);

process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
    ws.close();
    process.exit(0);
}); 