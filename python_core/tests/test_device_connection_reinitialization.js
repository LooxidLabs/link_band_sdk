const WebSocket = require('ws');

// 테스트 설정
const WS_URL = 'ws://localhost:18765';
const API_BASE = 'http://localhost:8121';

async function testDeviceConnectionReinitialization() {
    console.log('🔧 디바이스 연결 재초기화 테스트 시작...\n');
    
    // WebSocket 연결
    const ws = new WebSocket(WS_URL);
    let deviceConnected = false;
    let streamingStatus = null;
    
    ws.on('open', async () => {
        console.log('✅ WebSocket 연결됨');
        
        // 1단계: 디바이스 없이 스트리밍 초기화 시도
        console.log('\n📋 1단계: 디바이스 미연결 상태에서 스트리밍 초기화...');
        
        try {
            const response = await fetch(`${API_BASE}/stream/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            console.log('초기화 응답:', result);
            
            if (!result.success) {
                console.log('✅ 예상대로 디바이스 미연결 시 초기화 실패');
            }
        } catch (error) {
            console.log('초기화 오류:', error.message);
        }
        
        // 2단계: 스트리밍 상태 확인
        console.log('\n📋 2단계: 현재 스트리밍 상태 확인...');
        await checkStreamingStatus();
        
        // 3단계: 디바이스 스캔 및 연결 시뮬레이션
        console.log('\n📋 3단계: 디바이스 스캔 시작...');
        ws.send(JSON.stringify({
            type: 'command',
            command: 'scan_devices',
            parameters: { duration: 5 }
        }));
        
        // 5초 후 강제로 디바이스 연결 이벤트 발생 (테스트용)
        setTimeout(() => {
            console.log('\n📋 4단계: 디바이스 연결 이벤트 시뮬레이션...');
            simulateDeviceConnection();
        }, 6000);
        
        // 10초 후 스트리밍 상태 재확인
        setTimeout(async () => {
            console.log('\n📋 5단계: 디바이스 연결 후 스트리밍 상태 재확인...');
            await checkStreamingStatus();
            
            // 15초 후 테스트 종료
            setTimeout(() => {
                console.log('\n🏁 테스트 완료');
                ws.close();
                process.exit(0);
            }, 5000);
        }, 10000);
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'event') {
                switch (message.event_type) {
                    case 'scan_result':
                        console.log('🔍 스캔 결과:', message.data);
                        break;
                    case 'device_connected':
                        console.log('🔗 디바이스 연결됨:', message.data);
                        deviceConnected = true;
                        // 연결 후 스트리밍 상태 확인
                        setTimeout(() => checkStreamingStatus(), 2000);
                        break;
                    case 'device_disconnected':
                        console.log('❌ 디바이스 연결 해제됨');
                        deviceConnected = false;
                        break;
                    case 'stream_started':
                        console.log('▶️ 스트리밍 시작됨');
                        break;
                    case 'stream_stopped':
                        console.log('⏹️ 스트리밍 중지됨');
                        break;
                }
            }
        } catch (error) {
            console.log('메시지 파싱 오류:', error.message);
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket 오류:', error.message);
    });
    
    ws.on('close', () => {
        console.log('WebSocket 연결 종료됨');
    });
    
    // 스트리밍 상태 확인 함수
    async function checkStreamingStatus() {
        try {
            const response = await fetch(`${API_BASE}/stream/auto-status`);
            const status = await response.json();
            
            console.log('📊 현재 스트리밍 상태:');
            console.log(`  - 활성화: ${status.is_active}`);
            console.log(`  - 활성 센서: [${status.active_sensors?.join(', ') || 'none'}]`);
            console.log(`  - 데이터 흐름 품질: ${status.data_flow_health}`);
            
            if (status.initialization_info) {
                console.log(`  - 초기화 단계: ${status.initialization_info.phase}`);
                console.log(`  - 남은 시간: ${status.initialization_info.time_remaining?.toFixed(1)}초`);
                console.log(`  - 논리적 상태: ${status.initialization_info.logical_streaming_active}`);
                console.log(`  - 물리적 상태: ${status.initialization_info.physical_data_flow_active}`);
            }
            
            if (status.message) {
                console.log(`  - 메시지: ${status.message}`);
            }
            
            streamingStatus = status;
            return status;
        } catch (error) {
            console.error('스트리밍 상태 확인 오류:', error.message);
            return null;
        }
    }
    
    // 디바이스 연결 시뮬레이션 함수
    function simulateDeviceConnection() {
        // 실제 환경에서는 이 부분이 자동으로 처리됨
        console.log('📱 실제 디바이스가 있다면 여기서 자동 연결됩니다...');
        console.log('💡 테스트를 위해 수동으로 디바이스를 연결해보세요.');
    }
}

// 테스트 실행
testDeviceConnectionReinitialization().catch(console.error); 