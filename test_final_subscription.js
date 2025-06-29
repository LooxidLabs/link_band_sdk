const WebSocket = require('ws');

console.log('🎯 Final WebSocket Subscription Test');

const ws = new WebSocket('ws://127.0.0.1:18765');
let subscriptionConfirmed = false;
let monitoringDataReceived = false;

ws.on('open', function open() {
    console.log('✅ Connected to WebSocket server');
    
    // Subscribe to monitoring_metrics
    console.log('📤 Subscribing to monitoring_metrics...');
    ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'monitoring_metrics'
    }));
    
    // Close after 15 seconds
    setTimeout(() => {
        console.log('\n📊 Test Results:');
        console.log(`   Subscription confirmed: ${subscriptionConfirmed ? '✅' : '❌'}`);
        console.log(`   Monitoring data received: ${monitoringDataReceived ? '✅' : '❌'}`);
        console.log('\n🔚 Closing connection...');
        ws.close();
    }, 15000);
});

ws.on('message', function message(data) {
    try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed') {
            console.log(`✅ Subscription confirmed for channel: ${message.channel}`);
            subscriptionConfirmed = true;
        } else if (message.type === 'monitoring_metrics') {
            console.log('📊 Monitoring metrics received!');
            console.log(`   - Timestamp: ${message.timestamp}`);
            console.log(`   - CPU: ${message.data.system.cpu_percent}%`);
            console.log(`   - Memory: ${message.data.system.memory_percent}%`);
            monitoringDataReceived = true;
        } else if (message.type === 'event') {
            console.log(`📥 Event: ${message.event_type}`);
        }
    } catch (e) {
        console.log('📥 Raw message:', data.toString());
    }
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
    console.log('🔌 Connection closed');
    
    if (subscriptionConfirmed && monitoringDataReceived) {
        console.log('🎉 All tests passed! WebSocket subscription is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Check the server logs.');
    }
    
    process.exit(0);
}); 