const WebSocket = require('ws');

console.log('🔍 Detailed Monitoring Data Test');

const ws = new WebSocket('ws://localhost:18765');

ws.on('open', function() {
  console.log('✅ Connected to WebSocket server');
  
  // monitoring_metrics 채널 구독
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'monitoring_metrics'
  }));
  
  console.log('📤 Subscribed to monitoring_metrics');
});

ws.on('message', function(data) {
  try {
    const message = JSON.parse(data);
    
    if (message.type === 'subscription_confirmed') {
      console.log('✅ Subscription confirmed for channel:', message.channel);
    } else if (message.type === 'monitoring_metrics') {
      console.log('\n📨 Monitoring data received:');
      console.log('Message structure:', JSON.stringify(message, null, 2));
      
      // 시스템 데이터 상세 분석
      if (message.data && message.data.system) {
        console.log('\n🖥️ System data details:');
        console.log('- CPU:', message.data.system.cpu_percent, '%');
        console.log('- Memory Percent:', message.data.system.memory_percent, '%');
        console.log('- Memory Used MB:', message.data.system.memory_used_mb, 'MB');
        console.log('- Process Memory MB:', message.data.system.process_memory_mb, 'MB');
      }
      
      // 헬스 스코어 분석
      if (message.data && message.data.health_score) {
        console.log('\n💚 Health score details:');
        console.log('Health score:', JSON.stringify(message.data.health_score, null, 2));
      }
    } else {
      console.log('📨 Other message type:', message.type);
    }
  } catch (e) {
    console.log('📨 Raw message:', data.toString());
  }
});

ws.on('error', function(error) {
  console.log('❌ WebSocket error:', error.message);
});

ws.on('close', function() {
  console.log('🔌 Connection closed');
});

// 10초 후 종료
setTimeout(() => {
  ws.close();
}, 10000); 