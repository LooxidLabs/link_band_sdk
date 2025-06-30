const WebSocket = require('ws');

// 테스트 설정
const WS_URL = 'ws://localhost:18765';
const API_BASE = 'http://localhost:8121';

async function debugRuntimeDeviceConnection() {
    console.log('🔍 런타임 디바이스 연결 이벤트 디버깅 시작...\n');
    
    // WebSocket 연결
    const ws = new WebSocket(WS_URL);
    let eventLog = [];
    
    ws.on('open', async () => {
        console.log('✅ WebSocket 연결됨');
        console.log('📋 이제 다음 단계를 수행하세요:');
        console.log('  1. 앱에서 Initialize 버튼 클릭');
        console.log('  2. 디바이스 연결');
        console.log('  3. 이벤트 로그를 확인하세요\n');
        
        // 주기적으로 스트리밍 상태 확인
        setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/stream/auto-status`);
                const status = await response.json();
                
                console.log(`📊 [${new Date().toLocaleTimeString()}] 스트리밍 상태:`);
                console.log(`  - 활성화: ${status.is_active}`);
                console.log(`  - 활성 센서: [${status.active_sensors?.join(', ') || 'none'}]`);
                
                if (status.initialization_info) {
                    console.log(`  - 초기화 단계: ${status.initialization_info.phase}`);
                    console.log(`  - 논리적 상태: ${status.initialization_info.logical_streaming_active}`);
                    console.log(`  - 물리적 상태: ${status.initialization_info.physical_data_flow_active}`);
                }
                console.log('');
            } catch (error) {
                console.error('❌ 상태 확인 오류:', error.message);
            }
        }, 3000); // 3초마다 상태 확인
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            const timestamp = new Date().toLocaleTimeString();
            
            // 모든 이벤트 로깅
            if (message.type === 'event') {
                eventLog.push({ timestamp, event: message });
                
                console.log(`🔔 [${timestamp}] 이벤트 수신: ${message.event_type}`);
                
                switch (message.event_type) {
                    case 'device_connected':
                        console.log('  🔗 디바이스 연결됨!');
                        console.log('  📄 데이터:', JSON.stringify(message.data, null, 2));
                        console.log('  💡 이 시점에서 AdaptivePollingManager가 재시작되어야 합니다.');
                        break;
                        
                    case 'device_disconnected':
                        console.log('  ❌ 디바이스 연결 해제됨');
                        break;
                        
                    case 'device_info':
                        console.log('  📱 디바이스 정보 업데이트');
                        console.log(`    - 연결됨: ${message.data.connected}`);
                        if (message.data.device_info) {
                            console.log(`    - 이름: ${message.data.device_info.name}`);
                            console.log(`    - 주소: ${message.data.device_info.address}`);
                        }
                        break;
                        
                    case 'stream_started':
                        console.log('  ▶️ 스트리밍 시작됨');
                        break;
                        
                    case 'stream_stopped':
                        console.log('  ⏹️ 스트리밍 중지됨');
                        break;
                        
                    case 'scan_result':
                        console.log('  🔍 스캔 결과');
                        if (message.data.devices) {
                            console.log(`    - 발견된 디바이스: ${message.data.devices.length}개`);
                        }
                        break;
                        
                    default:
                        console.log(`  📋 기타 이벤트: ${message.event_type}`);
                }
                console.log('');
            }
            
            // 센서 데이터 수신 시 간단한 로그
            else if (message.type === 'raw_data') {
                const timestamp = new Date().toLocaleTimeString();
                console.log(`📡 [${timestamp}] ${message.sensor_type} 데이터 수신 (${message.data?.length || 0}개 샘플)`);
            }
            
        } catch (error) {
            console.log('❌ 메시지 파싱 오류:', error.message);
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket 오류:', error.message);
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket 연결 종료됨');
        console.log('\n📋 이벤트 로그 요약:');
        eventLog.forEach((entry, index) => {
            console.log(`${index + 1}. [${entry.timestamp}] ${entry.event.event_type}`);
        });
    });
    
    // 30초 후 자동 종료
    setTimeout(() => {
        console.log('\n⏰ 30초 디버깅 완료. 연결을 종료합니다.');
        ws.close();
        process.exit(0);
    }, 30000);
    
    // Ctrl+C로 수동 종료 가능
    process.on('SIGINT', () => {
        console.log('\n👋 디버깅을 종료합니다.');
        ws.close();
        process.exit(0);
    });
}

console.log('🚀 런타임 디바이스 연결 이벤트 디버깅');
console.log('📝 이 스크립트는 다음을 확인합니다:');
console.log('  - device_connected 이벤트 발생 여부');
console.log('  - 스트리밍 상태 변화');
console.log('  - 초기화 정보');
console.log('  - 센서 데이터 수신\n');

// 디버깅 시작
debugRuntimeDeviceConnection().catch(console.error); 