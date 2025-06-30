const WebSocket = require('ws');

console.log('🔍 EEG 데이터 구조 확인 테스트 시작...');

const ws = new WebSocket('ws://localhost:18765');
let eegDataCount = 0;

ws.on('open', function open() {
    console.log('✅ WebSocket 연결 성공!');
    
    // 디바이스 연결 및 스트리밍 시작
    ws.send(JSON.stringify({
        type: "command",
        action: "connect_device",
        device_address: "auto"
    }));
});

ws.on('message', function message(data) {
    try {
        const msg = JSON.parse(data);
        
        if (msg.type === 'raw_data' && msg.sensor_type === 'eeg') {
            eegDataCount++;
            
            if (eegDataCount <= 3) {
                console.log(`\n📊 [${eegDataCount}] EEG 데이터 구조:`);
                console.log(`   - 배치 크기: ${msg.data ? msg.data.length : 0}개`);
                
                if (msg.data && msg.data.length > 0) {
                    const firstSample = msg.data[0];
                    console.log(`   - 첫 번째 샘플 구조:`, Object.keys(firstSample));
                    console.log(`   - 샘플 예시:`, firstSample);
                    
                    // 타임스탬프 간격 확인
                    if (msg.data.length > 1) {
                        const timestamps = msg.data.map(sample => sample.timestamp).filter(ts => ts);
                        if (timestamps.length > 1) {
                            const intervals = [];
                            for (let i = 1; i < timestamps.length; i++) {
                                intervals.push(timestamps[i] - timestamps[i-1]);
                            }
                            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                            const samplingRate = 1.0 / avgInterval;
                            console.log(`   - 평균 타임스탬프 간격: ${avgInterval.toFixed(6)}초`);
                            console.log(`   - 계산된 샘플링 레이트: ${samplingRate.toFixed(1)} Hz`);
                        }
                    }
                }
            }
        }
        
        if (msg.type === 'event' && msg.event_type === 'device_connected') {
            console.log('🔗 디바이스 연결됨!');
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
    console.log(`📊 총 ${eegDataCount}개 EEG 데이터 배치 수신`);
});

// 10초 후 종료
setTimeout(() => {
    console.log('\n⏰ 테스트 시간 종료');
    ws.close();
    process.exit(0);
}, 10000); 