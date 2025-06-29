const WebSocket = require('ws');

console.log('Device Info 이벤트 분석 테스트...');

const ws = new WebSocket('ws://localhost:18765');

ws.on('open', function open() {
  console.log('✅ WebSocket 연결 성공!');
  
  // 10초 후 종료
  setTimeout(() => {
    console.log('🔚 테스트 완료');
    ws.close();
    process.exit(0);
  }, 10000);
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    
    if (parsed.type === 'event' && parsed.event_type === 'device_info') {
      console.log('🔍 DEVICE_INFO 이벤트 상세:');
      console.log('   event_type:', parsed.event_type);
      console.log('   data:', JSON.stringify(parsed.data, null, 2));
      
      if (parsed.data) {
        console.log('📊 분석:');
        console.log('   - connected:', parsed.data.connected);
        console.log('   - device_info:', parsed.data.device_info);
        
        if (parsed.data.device_info) {
          console.log('   - device name:', parsed.data.device_info.name);
          console.log('   - device address:', parsed.data.device_info.address);
          console.log('   - battery level:', parsed.data.device_info.battery_level);
        }
      }
    } else if (parsed.type === 'event') {
      console.log(`📨 기타 이벤트: ${parsed.event_type}`);
    } else if (parsed.type === 'raw_data') {
      console.log(`📊 Raw 데이터: ${parsed.sensor_type} (${parsed.data?.length || 0} 샘플)`);
    } else if (parsed.type === 'processed_data') {
      console.log(`🔬 Processed 데이터: ${parsed.sensor_type} (${parsed.data?.length || 0} 샘플)`);
    } else {
      console.log(`📨 기타: ${parsed.type}`);
    }
    
  } catch (error) {
    console.log('📨 Raw 메시지:', data.toString().substring(0, 100));
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket 오류:', err.message);
  process.exit(1);
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 연결 종료: ${code} ${reason}`);
  process.exit(0);
}); 