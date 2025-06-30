const WebSocket = require('ws');

console.log('🔍 Simple Monitoring Test');

const ws = new WebSocket('ws://127.0.0.1:18765');

ws.on('open', function open() {
    console.log('✅ Connected to WebSocket server');
    
    // Subscribe to monitoring_metrics
    console.log('📤 Subscribing to monitoring_metrics...');
    ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'monitoring_metrics'
    }));
    
    // Close after 10 seconds
    setTimeout(() => {
        console.log('⏰ 10 seconds completed');
        ws.close();
    }, 10000);
});

ws.on('message', function message(data) {
    try {
        const message = JSON.parse(data.toString());
        console.log(`📨 Message received: ${message.type}`);
        
        if (message.type === 'subscription_confirmed') {
            console.log(`✅ Subscription confirmed for channel: ${message.channel}`);
        } else if (message.type === 'monitoring_metrics') {
            console.log('🎉 Monitoring metrics received!');
            console.log(`   - CPU: ${message.data.system?.cpu_percent}%`);
            console.log(`   - Memory: ${message.data.system?.memory_percent}%`);
        }
    } catch (e) {
        console.log('📥 Raw message:', data.toString().substring(0, 100) + '...');
    }
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
    console.log('🔌 Connection closed');
    process.exit(0);
}); 