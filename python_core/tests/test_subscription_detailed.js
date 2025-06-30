const WebSocket = require('ws');

console.log('🔍 Detailed Subscription Test');

const ws = new WebSocket('ws://127.0.0.1:18765');

let messageCount = 0;
let subscriptionConfirmed = false;

ws.on('open', function open() {
    console.log('✅ Connected to WebSocket server');
    
    // Send a ping first
    console.log('📤 Sending ping...');
    ws.send(JSON.stringify({
        type: 'ping'
    }));
    
    // Wait a bit then subscribe
    setTimeout(() => {
        console.log('📤 Subscribing to monitoring_metrics...');
        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'monitoring_metrics'
        }));
    }, 1000);
    
    // Close after 15 seconds
    setTimeout(() => {
        console.log('⏰ 15 seconds completed');
        console.log(`📊 Total messages received: ${messageCount}`);
        console.log(`📋 Subscription confirmed: ${subscriptionConfirmed ? '✅' : '❌'}`);
        ws.close();
    }, 15000);
});

ws.on('message', function message(data) {
    messageCount++;
    try {
        const message = JSON.parse(data.toString());
        console.log(`📨 Message ${messageCount}: ${message.type}`);
        
        if (message.type === 'subscription_confirmed') {
            subscriptionConfirmed = true;
            console.log(`✅ Subscription confirmed for channel: ${message.channel}`);
        } else if (message.type === 'monitoring_metrics') {
            console.log('🎉 Monitoring metrics received!');
            console.log(`   - Data keys: ${Object.keys(message.data || {}).join(', ')}`);
        } else if (message.type === 'ping_response') {
            console.log('🏓 Ping response received');
        } else {
            console.log(`   - Raw data preview: ${JSON.stringify(message).substring(0, 100)}...`);
        }
    } catch (e) {
        console.log(`📥 Raw message ${messageCount}: ${data.toString().substring(0, 100)}...`);
    }
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
    console.log('🔌 Connection closed');
    console.log('\n📊 Test Summary:');
    console.log(`   Messages received: ${messageCount}`);
    console.log(`   Subscription confirmed: ${subscriptionConfirmed ? '✅ YES' : '❌ NO'}`);
    
    if (!subscriptionConfirmed) {
        console.log('\n⚠️  Subscription failed. Possible issues:');
        console.log('   - Server not processing subscription messages');
        console.log('   - WebSocket message handling error');
        console.log('   - Server logs should show subscription processing');
    }
    
    process.exit(0);
}); 