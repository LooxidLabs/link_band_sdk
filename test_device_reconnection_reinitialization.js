const WebSocket = require('ws');

console.log('=== 디바이스 재연결 재초기화 테스트 (개선된 타이밍) ===');
console.log('이 테스트는 다음을 확인합니다:');
console.log('1. 디바이스 연결 해제 감지');
console.log('2. 디바이스 재연결 감지 (Disconnected → Connected)');
console.log('3. 재연결 시 자동 재초기화 트리거');
console.log('4. AdaptivePollingManager 재시작 (3초 지연 + 15초 초기화)');
console.log('5. 데이터 흐름 안정화 후 정확한 상태 감지');
console.log('');

// WebSocket 연결
const ws = new WebSocket('ws://localhost:18765');

// 테스트 상태 추적
let testState = {
  deviceConnected: false,
  reconnectionDetected: false,
  reinitializationTriggered: false,
  pollingRestarted: false
};

// API 호출 함수
async function callAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`http://localhost:8121${endpoint}`, options);
    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error(`❌ API 호출 실패 (${endpoint}):`, error.message);
    return { success: false, error: error.message };
  }
}

// 디바이스 상태 확인
async function checkDeviceStatus() {
  const result = await callAPI('/device/status');
  if (result.success) {
    console.log(`📱 디바이스 상태: ${result.data.is_connected ? '연결됨' : '연결 해제됨'}`);
    if (result.data.is_connected) {
      console.log(`   - 디바이스명: ${result.data.device_name}`);
      console.log(`   - 주소: ${result.data.device_address}`);
      console.log(`   - 배터리: ${result.data.battery_level}%`);
    }
    return result.data.is_connected;
  }
  return false;
}

// 스트리밍 상태 확인
async function checkStreamingStatus() {
  const result = await callAPI('/stream/status');
  if (result.success) {
    console.log(`🔄 스트리밍 상태: ${result.data.status}`);
    if (result.data.status === 'running') {
      console.log(`   - 활성 센서: ${result.data.active_sensors?.join(', ') || 'none'}`);
      console.log(`   - 데이터 흐름: ${result.data.data_flow_health || 'unknown'}`);
    }
    return result.data.status === 'running';
  }
  return false;
}

// 재초기화 상태 확인
async function checkInitializationStatus() {
  const result = await callAPI('/stream/info');
  if (result.success && result.data.initialization_info) {
    const init = result.data.initialization_info;
    console.log(`🚀 초기화 상태:`);
    console.log(`   - 단계: ${init.phase}`);
    console.log(`   - 논리적 스트리밍: ${init.logical_streaming}`);
    console.log(`   - 물리적 스트리밍: ${init.physical_streaming}`);
    if (init.phase === 'initialization') {
      console.log(`   - 남은 시간: ${init.time_remaining?.toFixed(1)}초 (최대 15초)`);
    }
    return init;
  }
  return null;
}

// 전체 상태 리포트
async function statusReport() {
  console.log('\n📊 === 현재 상태 리포트 ===');
  const deviceConnected = await checkDeviceStatus();
  const streamingActive = await checkStreamingStatus();
  const initInfo = await checkInitializationStatus();
  console.log('================================\n');
  
  return { deviceConnected, streamingActive, initInfo };
}

// WebSocket 메시지 처리
ws.on('open', function open() {
  console.log('✅ WebSocket 연결됨');
  
  // 이벤트 채널 구독
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'event'
  }));
  
  console.log('📡 이벤트 채널 구독 완료');
  
  // 초기 상태 확인
  setTimeout(async () => {
    console.log('\n🔍 초기 상태 확인...');
    await statusReport();
    
    // 테스트 시작 안내
    console.log('🎯 테스트 준비 완료!');
    console.log('');
    console.log('테스트 시나리오:');
    console.log('1. 현재 디바이스가 연결되어 있다면 연결을 해제하세요');
    console.log('2. 잠시 후 디바이스를 다시 연결하세요');
    console.log('3. 재연결 시 자동 재초기화가 트리거되는지 확인합니다');
    console.log('');
    
    // 주기적 상태 모니터링 시작
    startPeriodicMonitoring();
  }, 1000);
});

ws.on('message', function message(data) {
  try {
    const msg = JSON.parse(data);
    
    if (msg.type === 'event' && msg.event_type) {
      const timestamp = new Date().toLocaleTimeString();
      
      switch (msg.event_type) {
        case 'device_connected':
          console.log(`\n🔌 [${timestamp}] 디바이스 연결 이벤트 감지!`);
          if (msg.data?.device_info) {
            console.log(`   - 디바이스: ${msg.data.device_info.name}`);
            console.log(`   - 주소: ${msg.data.device_info.address}`);
          }
          
          // 재연결 감지 체크
          if (!testState.deviceConnected) {
            console.log('🔄 재연결 감지됨! (Disconnected → Connected)');
            testState.reconnectionDetected = true;
          }
          testState.deviceConnected = true;
          break;
          
        case 'device_disconnected':
          console.log(`\n🔌 [${timestamp}] 디바이스 연결 해제 이벤트 감지!`);
          testState.deviceConnected = false;
          testState.reconnectionDetected = false;
          break;
          
        case 'device_info':
          if (msg.data?.connected !== undefined) {
            const connected = msg.data.connected;
            console.log(`\n📱 [${timestamp}] 디바이스 정보 업데이트: ${connected ? '연결됨' : '연결 해제됨'}`);
            
            // 재연결 감지 체크 (device_info 이벤트)
            if (connected && !testState.deviceConnected) {
              console.log('🔄 재연결 감지됨! (device_info를 통한 Disconnected → Connected)');
              testState.reconnectionDetected = true;
            }
            
            testState.deviceConnected = connected;
          }
          break;
          
        default:
          console.log(`📡 [${timestamp}] 기타 이벤트: ${msg.event_type}`);
      }
    }
  } catch (error) {
    console.error('WebSocket 메시지 파싱 오류:', error);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket 오류:', err);
});

ws.on('close', function close() {
  console.log('❌ WebSocket 연결 종료됨');
});

// 주기적 모니터링
let monitoringInterval;

function startPeriodicMonitoring() {
  monitoringInterval = setInterval(async () => {
    // 재연결이 감지되었을 때만 상세 모니터링
    if (testState.reconnectionDetected && !testState.reinitializationTriggered) {
      console.log('\n🔍 재연결 후 시스템 상태 모니터링...');
      const status = await statusReport();
      
      // 재초기화가 트리거되었는지 확인
      if (status.initInfo && status.initInfo.phase === 'initialization') {
        console.log('✅ 재초기화가 성공적으로 트리거되었습니다!');
        testState.reinitializationTriggered = true;
        
        // 초기화 진행 상황 모니터링
        monitorInitializationProgress();
      }
    }
  }, 3000); // 3초마다 체크
}

// 초기화 진행 상황 모니터링
async function monitorInitializationProgress() {
  console.log('\n📈 초기화 진행 상황 모니터링 시작...');
  
  const progressInterval = setInterval(async () => {
    const result = await callAPI('/stream/info');
    if (result.success && result.data.initialization_info) {
      const init = result.data.initialization_info;
      
      if (init.phase === 'initialization') {
        console.log(`⏳ 초기화 진행 중... (${init.time_remaining?.toFixed(1)}초 남음, 최대 15초)`);
      } else if (init.phase === 'normal') {
        console.log('🎉 초기화 완료! 정상 운영 모드로 전환됨');
        clearInterval(progressInterval);
        
        // 최종 상태 확인
        setTimeout(async () => {
          console.log('\n🏁 === 최종 테스트 결과 ===');
          await statusReport();
          
          console.log('\n📋 테스트 요약:');
          console.log(`✅ 디바이스 재연결 감지: ${testState.reconnectionDetected ? '성공' : '실패'}`);
          console.log(`✅ 재초기화 트리거: ${testState.reinitializationTriggered ? '성공' : '실패'}`);
          console.log('\n테스트가 완료되었습니다!');
        }, 2000);
      }
    }
  }, 1000); // 1초마다 체크
}

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
  console.log('\n\n프로그램을 종료합니다...');
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  ws.close();
  process.exit(0);
});

console.log('WebSocket 연결 시도 중...'); 