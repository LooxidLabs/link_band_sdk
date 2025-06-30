const WebSocket = require('ws');

console.log('Starting WebSocket ping test...');

const ws = new WebSocket('ws://127.0.0.1:18765');

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully');
  
  // Send a simple ping message
  console.log('📤 Sending ping message...');
  ws.send('ping');
  
  // Send a JSON message
  setTimeout(() => {
    console.log('📤 Sending JSON heartbeat...');
    ws.send(JSON.stringify({
      type: 'heartbeat'
    }));
  }, 1000);
  
  // Send subscription message
  setTimeout(() => {
    console.log('📤 Sending subscription message...');
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'monitoring_metrics'
    }));
  }, 2000);
});

ws.on('message', function message(data) {
  console.log('📨 Received message:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

// Close after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout, closing connection...');
  ws.close();
  process.exit(0);
}, 10000); 