const http = require('http');

console.log('=== 서버 상태 확인 ===');

// 디바이스 상태 확인
const deviceReq = http.get('http://localhost:8121/device/status', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const deviceStatus = JSON.parse(data);
            console.log('\n📱 디바이스 상태:');
            console.log('  ├─ 연결됨:', deviceStatus.is_connected);
            console.log('  ├─ 디바이스명:', deviceStatus.device_name);
            console.log('  ├─ 배터리:', deviceStatus.battery_level + '%');
            console.log('  ├─ EEG 샘플링:', deviceStatus.eeg_sampling_rate + ' Hz');
            console.log('  ├─ PPG 샘플링:', deviceStatus.ppg_sampling_rate + ' Hz');
            console.log('  └─ ACC 샘플링:', deviceStatus.acc_sampling_rate + ' Hz');
        } catch (e) {
            console.error('❌ 디바이스 상태 파싱 오류:', e.message);
        }
    });
});

deviceReq.on('error', (err) => {
    console.error('❌ 디바이스 상태 요청 실패:', err.message);
});

// 스트리밍 상태 확인
const streamReq = http.get('http://localhost:8121/stream/status', (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const streamStatus = JSON.parse(data);
            console.log('\n📡 스트리밍 상태:');
            console.log('  ├─ 상태:', streamStatus.status);
            console.log('  ├─ 클라이언트 수:', streamStatus.clients_connected);
            console.log('  ├─ 실시간 EEG:', streamStatus.eeg_sampling_rate?.toFixed(2) + ' Hz');
            console.log('  ├─ 실시간 PPG:', streamStatus.ppg_sampling_rate?.toFixed(2) + ' Hz');
            console.log('  ├─ 실시간 ACC:', streamStatus.acc_sampling_rate?.toFixed(2) + ' Hz');
            console.log('  ├─ 배터리 레벨:', streamStatus.bat_level + '%');
            console.log('  ├─ 활성 센서:', streamStatus.active_sensors?.join(', '));
            console.log('  └─ 데이터 흐름:', streamStatus.data_flow_health);
        } catch (e) {
            console.error('❌ 스트리밍 상태 파싱 오류:', e.message);
        }
    });
});

streamReq.on('error', (err) => {
    console.error('❌ 스트리밍 상태 요청 실패:', err.message);
});

setTimeout(() => {
    process.exit(0);
}, 3000); 