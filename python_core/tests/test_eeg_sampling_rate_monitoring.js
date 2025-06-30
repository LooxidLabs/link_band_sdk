const WebSocket = require('ws');

console.log('🔍 EEG 샘플링 레이트 모니터링 테스트 시작...');

const ws = new WebSocket('ws://localhost:18765');
let messageCount = 0;
let eegDataCount = 0;
let lastStatusCheck = Date.now();
const STATUS_CHECK_INTERVAL = 3000; // 3초마다 상태 확인

ws.on('open', function open() {
    console.log('✅ WebSocket 연결 성공!');
    
    // 디바이스 연결 시도
    ws.send(JSON.stringify({
        type: "command",
        action: "connect_device",
        device_address: "auto"
    }));
    
    console.log('📡 디바이스 자동 연결 시도...');
});

ws.on('message', function message(data) {
    messageCount++;
    
    try {
        const msg = JSON.parse(data);
        
        if (msg.type === 'raw_data' && msg.sensor_type === 'eeg') {
            eegDataCount++;
            if (eegDataCount <= 5) {
                console.log(`📊 [${eegDataCount}] EEG 데이터 수신: ${msg.data ? msg.data.length : 0}개 샘플`);
            }
        }
        
        if (msg.type === 'event') {
            if (msg.event_type === 'device_connected') {
                console.log('🔗 디바이스 연결됨!');
            } else if (msg.event_type === 'stream_started') {
                console.log('🚀 스트리밍 시작됨!');
            }
        }
        
        // 주기적으로 상태 확인
        const now = Date.now();
        if (now - lastStatusCheck > STATUS_CHECK_INTERVAL) {
            checkStreamingStatus();
            lastStatusCheck = now;
        }
        
    } catch (e) {
        console.error('❌ 메시지 파싱 오류:', e.message);
    }
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket 에러:', err.message);
});

ws.on('close', function close() {
    console.log('🔌 WebSocket 연결 종료');
    console.log(`📊 총 ${messageCount}개 메시지 수신, EEG 데이터: ${eegDataCount}개`);
});

// 상태 확인 함수
async function checkStreamingStatus() {
    try {
        const response = await fetch('http://localhost:8121/stream/status');
        const status = await response.json();
        
        console.log('\n📈 현재 스트리밍 상태:');
        console.log(`   - 상태: ${status.status}`);
        console.log(`   - EEG 샘플링 레이트: ${status.eeg_sampling_rate} Hz`);
        console.log(`   - PPG 샘플링 레이트: ${status.ppg_sampling_rate} Hz`);
        console.log(`   - ACC 샘플링 레이트: ${status.acc_sampling_rate} Hz`);
        console.log(`   - 자동 감지: ${status.auto_detected}`);
        console.log(`   - 데이터 흐름 상태: ${status.data_flow_health}\n`);
        
        // EEG 샘플링 레이트가 250Hz 근처인지 확인
        if (status.eeg_sampling_rate > 0) {
            const expectedRate = 250;
            const tolerance = 10; // ±10Hz 허용
            const isNormal = Math.abs(status.eeg_sampling_rate - expectedRate) <= tolerance;
            
            if (isNormal) {
                console.log(`✅ EEG 샘플링 레이트 정상: ${status.eeg_sampling_rate} Hz (예상: ${expectedRate}Hz)`);
            } else {
                console.log(`⚠️  EEG 샘플링 레이트 비정상: ${status.eeg_sampling_rate} Hz (예상: ${expectedRate}Hz)`);
            }
        }
        
    } catch (error) {
        console.error('❌ 상태 확인 오류:', error.message);
    }
}

// 15초 후 종료
setTimeout(() => {
    console.log('\n⏰ 테스트 시간 종료');
    ws.close();
    process.exit(0);
}, 15000);

// fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
} 