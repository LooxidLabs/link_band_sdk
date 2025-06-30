const WebSocket = require('ws');

// 테스트 설정
const WS_URL = 'ws://localhost:18765';
const API_BASE = 'http://localhost:8121';

async function testAutoStreamingOnDeviceConnection() {
    console.log('🔍 디바이스 연결 시 자동 스트리밍 시작 테스트...\n');
    
    // WebSocket 연결
    const ws = new WebSocket(WS_URL);
    let deviceConnected = false;
    let autoStreamingStarted = false;
    let dataFlowDetected = false;
    let testPhase = 'waiting_for_device';
    
    ws.on('open', async () => {
        console.log('✅ WebSocket 연결됨');
        console.log('📋 테스트 시나리오:');
        console.log('  1. 디바이스 연결 감지');
        console.log('  2. 자동 스트리밍 시작');
        console.log('  3. 데이터 흐름 시작');
        console.log('  4. 데이터 흐름 기반 재초기화');
        console.log('  5. 완전 활성화 상태 도달\n');
        
        // 주기적으로 스트리밍 상태 확인
        const statusInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/stream/auto-status`);
                const status = await response.json();
                
                const timestamp = new Date().toLocaleTimeString();
                console.log(`📊 [${timestamp}] 시스템 상태:`);
                console.log(`  - 스트리밍 활성화: ${status.is_active}`);
                console.log(`  - 활성 센서: [${status.active_sensors?.join(', ') || 'none'}]`);
                console.log(`  - 데이터 흐름 품질: ${status.data_flow_health}`);
                console.log(`  - 논리적 스트리밍: ${status.logical_streaming_active}`);
                
                if (status.initialization_info) {
                    console.log(`  - 초기화 단계: ${status.initialization_info.phase}`);
                    if (status.initialization_info.time_remaining > 0) {
                        console.log(`  - 남은 시간: ${status.initialization_info.time_remaining?.toFixed(1)}초`);
                    }
                }
                
                if (status.message) {
                    console.log(`  - 메시지: ${status.message}`);
                }
                
                // 테스트 단계 업데이트
                if (deviceConnected && status.logical_streaming_active && !autoStreamingStarted) {
                    autoStreamingStarted = true;
                    testPhase = 'auto_streaming_started';
                    console.log('🚀 자동 스트리밍 시작됨!');
                }
                
                if (autoStreamingStarted && status.active_sensors?.length > 0 && !dataFlowDetected) {
                    dataFlowDetected = true;
                    testPhase = 'data_flow_detected';
                    console.log('📊 데이터 흐름 감지됨!');
                }
                
                if (status.is_active && status.active_sensors?.includes('eeg')) {
                    testPhase = 'fully_active';
                    console.log('✅ 시스템 완전 활성화됨!');
                }
                
                console.log(`  - 테스트 단계: ${testPhase}\n`);
                
            } catch (error) {
                console.error('❌ 상태 확인 오류:', error.message);
            }
        }, 2000); // 2초마다 상태 확인
        
        // 40초 후 테스트 종료
        setTimeout(() => {
            clearInterval(statusInterval);
            console.log('\n🏁 테스트 완료');
            console.log(`📊 최종 결과:`);
            console.log(`  - 디바이스 연결: ${deviceConnected ? '✅' : '❌'}`);
            console.log(`  - 자동 스트리밍 시작: ${autoStreamingStarted ? '✅' : '❌'}`);
            console.log(`  - 데이터 흐름 감지: ${dataFlowDetected ? '✅' : '❌'}`);
            console.log(`  - 최종 단계: ${testPhase}`);
            
            if (testPhase === 'fully_active') {
                console.log('🎉 디바이스 연결 → 자동 스트리밍 → 데이터 흐름 → 완전 활성화 성공!');
            } else {
                console.log('⚠️ 전체 프로세스가 완료되지 않았습니다.');
                console.log('💡 디바이스가 연결되었는지 확인해주세요.');
            }
            
            ws.close();
            process.exit(0);
        }, 40000);
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            const timestamp = new Date().toLocaleTimeString();
            
            // 디바이스 연결 이벤트 감지
            if (message.type === 'event') {
                switch (message.event_type) {
                    case 'device_connected':
                        deviceConnected = true;
                        testPhase = 'device_connected';
                        console.log(`🔗 [${timestamp}] 디바이스 연결됨!`);
                        console.log(`  - 디바이스 주소: ${message.data.device_address}`);
                        console.log(`  - 자동 스트리밍 시작 대기 중...`);
                        break;
                        
                    case 'device_info':
                        if (message.data.connected && !deviceConnected) {
                            deviceConnected = true;
                            testPhase = 'device_connected';
                            console.log(`📱 [${timestamp}] 디바이스 연결 감지됨 (device_info)!`);
                            console.log(`  - 디바이스 이름: ${message.data.device_info?.name}`);
                            console.log(`  - 자동 스트리밍 시작 대기 중...`);
                        }
                        break;
                        
                    case 'stream_started':
                        console.log(`▶️ [${timestamp}] 스트리밍 시작 이벤트 수신`);
                        break;
                }
            }
            
            // 센서 데이터 수신 감지
            else if (message.type === 'raw_data') {
                if (!dataFlowDetected) {
                    console.log(`🔔 [${timestamp}] 첫 번째 ${message.sensor_type} 데이터 수신!`);
                    console.log(`  - 샘플 수: ${message.data?.length || 0}`);
                    console.log(`  - 데이터 흐름 기반 재초기화 트리거 예상`);
                }
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
    });
    
    // Ctrl+C로 수동 종료 가능
    process.on('SIGINT', () => {
        console.log('\n👋 테스트를 종료합니다.');
        ws.close();
        process.exit(0);
    });
}

console.log('🚀 디바이스 연결 시 자동 스트리밍 시작 테스트');
console.log('📝 이 테스트는 다음을 확인합니다:');
console.log('  - 디바이스 연결 감지');
console.log('  - 연결 시 자동 스트리밍 시작');
console.log('  - 스트리밍 → 데이터 흐름 → 재초기화 전체 프로세스');
console.log('  - 최종 완전 활성화 상태 도달\n');

console.log('📋 테스트 진행 방법:');
console.log('  1. 이 스크립트 실행');
console.log('  2. 디바이스 연결 (앱에서 또는 별도로)');
console.log('  3. 자동 프로세스 진행 확인');
console.log('  4. 로그 확인\n');

console.log('⚠️ 주의사항:');
console.log('  - 디바이스가 연결되어 있지 않은 상태에서 시작하세요');
console.log('  - 테스트 중 디바이스를 연결해주세요');
console.log('  - 전체 프로세스가 자동으로 진행되는지 확인하세요\n');

// 테스트 시작
testAutoStreamingOnDeviceConnection().catch(console.error); 