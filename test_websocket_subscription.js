const WebSocket = require('ws');

console.log('Starting WebSocket subscription test...');

const ws = new WebSocket('ws://127.0.0.1:18765');
let subscriptionConfirmed = 0;
const expectedSubscriptions = 3;

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully');
  
  // 모니터링 메트릭 채널 구독
  console.log('📡 Subscribing to monitoring_metrics channel...');
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'monitoring_metrics'
  }));
  
  // 헬스 업데이트 채널 구독
  console.log('📡 Subscribing to health_updates channel...');
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'health_updates'
  }));
  
  // 버퍼 상태 채널 구독
  console.log('📡 Subscribing to buffer_status channel...');
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'buffer_status'
  }));
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    
    if (parsed.type === 'subscription_confirmed') {
      subscriptionConfirmed++;
      console.log(`✅ Subscription confirmed for channel: ${parsed.channel} (${subscriptionConfirmed}/${expectedSubscriptions})`);
      
      if (subscriptionConfirmed === expectedSubscriptions) {
        console.log('🎉 All subscriptions confirmed! Backend should now send monitoring data to these channels.');
      }
    } else {
      console.log('📨 Received message:', JSON.stringify(parsed, null, 2));
    }
  } catch (e) {
    console.log('📨 Received raw message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
  console.log(`📊 Final subscription count: ${subscriptionConfirmed}/${expectedSubscriptions}`);
});

// 15초 후 종료 (더 긴 시간)
setTimeout(() => {
  console.log('⏰ Test timeout, closing connection...');
  ws.close();
  process.exit(0);
}, 15000); 