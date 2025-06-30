const WebSocket = require('ws');

// 테스트 설정
const WS_URL = 'ws://localhost:18765';
const API_BASE = 'http://localhost:8121';

async function testDataFlowBasedReinitialization() {
    console.log('🔍 데이터 흐름 기반 재초기화 테스트 시작...\n');
    
    // WebSocket 연결
    const ws = new WebSocket(WS_URL);
    let dataFlowDetected = false;
    let reinitializationTriggered = false;
    let testPhase = 'waiting';
    
    ws.on('open', async () => {
        console.log('✅ WebSocket 연결됨');
        console.log('📋 테스트 시나리오:');
        console.log('  1. 디바이스 미연결 상태에서 Initialize');
        console.log('  2. "No Data Flow" 상태 확인');
        console.log('  3. 디바이스 연결 (실제 데이터 흐름 시작)');
        console.log('  4. 데이터 흐름 감지 시 자동 재초기화 확인\n');
        
        // 주기적으로 스트리밍 상태 확인
        const statusInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/stream/auto-status`);
                const status = await response.json();
                
                const timestamp = new Date().toLocaleTimeString();
                console.log(`📊 [${timestamp}] 스트리밍 상태:`);
                console.log(`  - 활성화: ${status.is_active}`);
                console.log(`  - 활성 센서: [${status.active_sensors?.join(', ') || 'none'}]`);
                console.log(`  - 데이터 흐름 품질: ${status.data_flow_health}`);
                
                if (status.initialization_info) {
                    console.log(`  - 초기화 단계: ${status.initialization_info.phase}`);
                    console.log(`  - 논리적 상태: ${status.initialization_info.logical_streaming_active}`);
                    console.log(`  - 물리적 상태: ${status.initialization_info.physical_data_flow_active}`);
                    
                    if (status.initialization_info.time_remaining > 0) {
                        console.log(`  - 남은 시간: ${status.initialization_info.time_remaining?.toFixed(1)}초`);
                    }
                }
                
                if (status.message) {
                    console.log(`  - 메시지: ${status.message}`);
                }
                
                // 테스트 단계 판정
                if (!dataFlowDetected && status.active_sensors?.length > 0) {
                    dataFlowDetected = true;
                    testPhase = 'data_detected';
                    console.log('🎉 데이터 흐름 감지됨!');
                }
                
                if (dataFlowDetected && status.initialization_info?.phase === 'initializing') {
                    if (!reinitializationTriggered) {
                        reinitializationTriggered = true;
                        testPhase = 'reinitialization_triggered';
                        console.log('🚀 재초기화 트리거됨!');
                    }
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
        
        // 30초 후 테스트 종료
        setTimeout(() => {
            clearInterval(statusInterval);
            console.log('\n🏁 테스트 완료');
            console.log(`📊 최종 결과:`);
            console.log(`  - 데이터 흐름 감지: ${dataFlowDetected ? '✅' : '❌'}`);
            console.log(`  - 재초기화 트리거: ${reinitializationTriggered ? '✅' : '❌'}`);
            console.log(`  - 최종 단계: ${testPhase}`);
            
            if (testPhase === 'fully_active') {
                console.log('🎉 데이터 흐름 기반 재초기화 성공!');
            } else {
                console.log('⚠️ 재초기화가 완전히 완료되지 않았습니다.');
            }
            
            ws.close();
            process.exit(0);
        }, 30000);
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            const timestamp = new Date().toLocaleTimeString();
            
            // 센서 데이터 수신 로깅
            if (message.type === 'raw_data') {
                if (!dataFlowDetected) {
                    console.log(`🔔 [${timestamp}] 첫 번째 ${message.sensor_type} 데이터 수신!`);
                    console.log(`  - 샘플 수: ${message.data?.length || 0}`);
                    console.log(`  - 이 시점에서 재초기화가 트리거되어야 합니다.`);
                }
            }
            
            // 이벤트 로깅
            else if (message.type === 'event') {
                switch (message.event_type) {
                    case 'device_connected':
                        console.log(`🔗 [${timestamp}] 디바이스 연결됨!`);
                        break;
                    case 'stream_started':
                        console.log(`▶️ [${timestamp}] 스트리밍 시작됨`);
                        break;
                    case 'device_info':
                        if (message.data.connected) {
                            console.log(`📱 [${timestamp}] 디바이스 정보 업데이트 - 연결됨`);
                        }
                        break;
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

console.log('🚀 데이터 흐름 기반 재초기화 테스트');
console.log('📝 이 테스트는 다음을 확인합니다:');
console.log('  - 실제 센서 데이터 수신 감지');
console.log('  - 데이터 흐름 감지 시 자동 재초기화');
console.log('  - 이벤트가 아닌 데이터 기반 상태 관리');
console.log('  - AdaptivePollingManager 재시작\n');

console.log('📋 테스트 진행 방법:');
console.log('  1. 이 스크립트 실행');
console.log('  2. 앱에서 Initialize 버튼 클릭 (디바이스 미연결 상태)');
console.log('  3. 디바이스 연결');
console.log('  4. 로그 확인\n');

// 테스트 시작
testDataFlowBasedReinitialization().catch(console.error); 