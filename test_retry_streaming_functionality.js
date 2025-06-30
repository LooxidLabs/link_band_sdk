const WebSocket = require('ws');

// 테스트 설정
const WS_URL = 'ws://localhost:18765';
const API_BASE = 'http://localhost:8121';

async function testRetryStreamingFunctionality() {
    console.log('🔄 Retry Streaming 기능 테스트...\n');
    
    // WebSocket 연결
    const ws = new WebSocket(WS_URL);
    let retryTestCompleted = false;
    
    ws.on('open', async () => {
        console.log('✅ WebSocket 연결됨');
        console.log('📋 테스트 시나리오:');
        console.log('  1. 현재 스트리밍 상태 확인');
        console.log('  2. Retry API 호출 시뮬레이션');
        console.log('  3. 스트리밍 재시작 과정 모니터링');
        console.log('  4. 데이터 흐름 재개 확인\n');
        
        // 초기 상태 확인
        console.log('🔍 초기 스트리밍 상태 확인...');
        await checkStreamingStatus();
        
        // 5초 후 Retry 시뮬레이션
        setTimeout(async () => {
            console.log('\n🔄 Retry 기능 시뮬레이션 시작...');
            await simulateRetryAction();
        }, 5000);
        
        // 상태 모니터링
        const statusInterval = setInterval(async () => {
            if (!retryTestCompleted) {
                await checkStreamingStatus();
            }
        }, 3000);
        
        // 30초 후 테스트 종료
        setTimeout(() => {
            clearInterval(statusInterval);
            console.log('\n🏁 Retry 기능 테스트 완료');
            ws.close();
            process.exit(0);
        }, 30000);
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            const timestamp = new Date().toLocaleTimeString();
            
            // 스트리밍 관련 이벤트 감지
            if (message.type === 'event') {
                switch (message.event_type) {
                    case 'stream_started':
                        console.log(`▶️ [${timestamp}] 스트리밍 시작 이벤트 감지`);
                        break;
                    case 'stream_stopped':
                        console.log(`⏹️ [${timestamp}] 스트리밍 중지 이벤트 감지`);
                        break;
                }
            }
            
            // 데이터 흐름 감지
            else if (message.type === 'raw_data') {
                console.log(`📊 [${timestamp}] ${message.sensor_type} 데이터 수신 - Retry 성공!`);
                if (!retryTestCompleted) {
                    retryTestCompleted = true;
                    console.log('✅ Retry 기능이 성공적으로 작동했습니다!');
                }
            }
            
        } catch (error) {
            // 메시지 파싱 오류는 무시
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

async function checkStreamingStatus() {
    try {
        const response = await fetch(`${API_BASE}/stream/auto-status`);
        const status = await response.json();
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`📊 [${timestamp}] 스트리밍 상태:`);
        console.log(`  - 활성화: ${status.is_active}`);
        console.log(`  - 논리적 스트리밍: ${status.logical_streaming_active}`);
        console.log(`  - 활성 센서: [${status.active_sensors?.join(', ') || 'none'}]`);
        console.log(`  - 데이터 흐름 품질: ${status.data_flow_health}`);
        
        if (status.message) {
            console.log(`  - 메시지: ${status.message}`);
        }
        
        // Retry 버튼이 표시되어야 하는 상황인지 확인
        const shouldShowRetry = !status.is_active && status.logical_streaming_active === false;
        if (shouldShowRetry) {
            console.log(`  ⚠️ 이 상황에서 Retry 버튼이 표시되어야 합니다.`);
        }
        
        console.log('');
        
    } catch (error) {
        console.error('❌ 상태 확인 오류:', error.message);
    }
}

async function simulateRetryAction() {
    try {
        console.log('🔄 Retry 액션 시뮬레이션...');
        
        // 1. 스트리밍 중지
        console.log('  1️⃣ 스트리밍 중지...');
        const stopResponse = await fetch(`${API_BASE}/stream/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const stopResult = await stopResponse.json();
        console.log(`     결과: ${stopResult.success ? '✅ 성공' : '❌ 실패'}`);
        
        // 1초 대기
        console.log('  ⏳ 1초 대기...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 2. 스트리밍 재시작
        console.log('  2️⃣ 스트리밍 재시작...');
        const startResponse = await fetch(`${API_BASE}/stream/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const startResult = await startResponse.json();
        console.log(`     결과: ${startResult.success ? '✅ 성공' : '❌ 실패'}`);
        
        if (startResult.success) {
            console.log('  3️⃣ AdaptivePollingManager 재시작 시뮬레이션 완료');
            console.log('  📊 데이터 흐름 재개 대기 중...\n');
        } else {
            console.error('  ❌ 스트리밍 재시작 실패:', startResult.error);
        }
        
    } catch (error) {
        console.error('❌ Retry 시뮬레이션 오류:', error);
    }
}

console.log('🚀 Retry Streaming 기능 테스트');
console.log('📝 이 테스트는 다음을 확인합니다:');
console.log('  - Retry 버튼 기능 시뮬레이션');
console.log('  - 스트리밍 중지 → 재시작 프로세스');
console.log('  - 데이터 흐름 재개 확인');
console.log('  - UI에서 Retry 버튼이 표시되는 조건\n');

console.log('📋 테스트 진행 방법:');
console.log('  1. 이 스크립트 실행');
console.log('  2. 앱에서 "No Data Flow" 상태 확인');
console.log('  3. Retry 버튼 클릭 또는 자동 시뮬레이션 확인');
console.log('  4. 데이터 흐름 재개 확인\n');

// 테스트 시작
testRetryStreamingFunctionality().catch(console.error); 