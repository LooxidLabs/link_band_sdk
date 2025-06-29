#!/usr/bin/env node

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:18765';

console.log('🔌 Connecting to WebSocket for detailed debugging...');
const ws = new WebSocket(WS_URL);

let messageCount = 0;
let messageTypes = new Set();

ws.on('open', () => {
    console.log('✅ WebSocket connected');
    console.log('📊 Listening for messages...\n');
});

ws.on('message', (data) => {
    messageCount++;
    
    try {
        const message = JSON.parse(data);
        messageTypes.add(message.type || 'unknown');
        
        console.log(`📨 Message #${messageCount}:`);
        console.log('   Type:', message.type || 'NO_TYPE');
        console.log('   Keys:', Object.keys(message));
        console.log('   Full message:', JSON.stringify(message, null, 2));
        console.log('   ---');
        
        // 주기적으로 통계 출력
        if (messageCount % 10 === 0) {
            console.log(`\n📊 Statistics after ${messageCount} messages:`);
            console.log('   Message types seen:', Array.from(messageTypes));
            console.log('   ---\n');
        }
        
    } catch (error) {
        console.log(`📨 Message #${messageCount} (RAW - not JSON):`);
        console.log('   Data:', data.toString());
        console.log('   Parse error:', error.message);
        console.log('   ---');
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
    console.log('🔌 WebSocket disconnected');
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Total messages: ${messageCount}`);
    console.log(`   Message types: ${Array.from(messageTypes)}`);
});

// 30초 후 자동 종료
setTimeout(() => {
    console.log('\n⏰ 30 seconds elapsed, closing connection...');
    ws.close();
    process.exit(0);
}, 30000);

console.log('⏰ Will run for 30 seconds...');
console.log('Press Ctrl+C to stop earlier\n'); 