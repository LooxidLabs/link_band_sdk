const WebSocket = require('ws');

console.log('🔍 EEG 샘플링 레이트 계산 수정 테스트 시작...');

const ws = new WebSocket('ws://localhost:18765');

let eegSampleCount = 0;
let startTime = Date.now();
let lastLogTime = Date.now();

ws.on('open', () => {
    console.log('✅ WebSocket 연결 성공');
    
    // 스트리밍 상태 구독
    ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'monitoring_metrics'
    }));
    
    console.log('📊 monitoring_metrics 채널 구독 완료');
    console.log('🎯 EEG 샘플링 레이트 모니터링 시작...');
    console.log('기대값: 250Hz 근처에서 안정적인 값');
    console.log('이전 문제: 240~300Hz로 불안정하게 변동');
    console.log('-------------------------------------------');
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'raw_data' && message.sensor_type === 'eeg') {
            eegSampleCount += message.data.length;
            
            const currentTime = Date.now();
            if (currentTime - lastLogTime >= 2000) { // 2초마다 로그
                const elapsedSeconds = (currentTime - startTime) / 1000;
                const avgSamplingRate = eegSampleCount / elapsedSeconds;
                
                console.log(`📈 EEG 데이터: ${message.data.length}개 샘플 수신`);
                console.log(`⏱️  누적 평균 샘플링 레이트: ${avgSamplingRate.toFixed(2)} Hz`);
                
                lastLogTime = currentTime;
            }
        }
        
        if (message.type === 'monitoring_metrics') {
            const metrics = JSON.parse(message.data);
            
            if (metrics.streaming_status && metrics.streaming_status.sensor_details) {
                const eegDetails = metrics.streaming_status.sensor_details.eeg;
                if (eegDetails) {
                    console.log(`🎯 StreamingMonitor EEG 샘플링 레이트: ${eegDetails.sampling_rate.toFixed(1)} Hz`);
                    console.log(`   활성 상태: ${eegDetails.is_active ? '✅' : '❌'}`);
                    console.log(`   총 샘플: ${eegDetails.total_samples}`);
                    
                    // 샘플링 레이트가 안정적인지 확인
                    if (eegDetails.sampling_rate > 0) {
                        if (eegDetails.sampling_rate >= 240 && eegDetails.sampling_rate <= 260) {
                            console.log(`✅ 정상 범위 (240-260Hz): ${eegDetails.sampling_rate.toFixed(1)} Hz`);
                        } else {
                            console.log(`⚠️  범위 벗어남: ${eegDetails.sampling_rate.toFixed(1)} Hz`);
                        }
                    }
                    console.log('-------------------------------------------');
                }
            }
        }
        
    } catch (error) {
        // JSON 파싱 에러는 무시 (ping/pong 등)
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket 에러:', error.message);
});

ws.on('close', () => {
    console.log('🔌 WebSocket 연결 종료');
    process.exit(0);
});

// 30초 후 자동 종료
setTimeout(() => {
    console.log('\n📊 테스트 완료 (30초)');
    
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const avgSamplingRate = eegSampleCount / elapsedSeconds;
    
    console.log(`📈 최종 결과:`);
    console.log(`   총 EEG 샘플: ${eegSampleCount}개`);
    console.log(`   테스트 시간: ${elapsedSeconds.toFixed(1)}초`);
    console.log(`   평균 샘플링 레이트: ${avgSamplingRate.toFixed(2)} Hz`);
    
    if (avgSamplingRate >= 240 && avgSamplingRate <= 260) {
        console.log('✅ 수정 성공: 샘플링 레이트가 안정적입니다!');
    } else {
        console.log('⚠️  추가 확인 필요: 샘플링 레이트가 예상 범위를 벗어났습니다.');
    }
    
    ws.close();
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 테스트 중단');
    ws.close();
    process.exit(0);
}); 