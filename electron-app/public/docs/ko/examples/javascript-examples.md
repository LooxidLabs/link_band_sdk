# JavaScript 예제

## 개요

이 문서에서는 Link Band SDK를 JavaScript/TypeScript에서 활용하는 다양한 예제를 제공합니다. 웹 브라우저 환경과 Node.js 환경 모두에서 사용할 수 있는 실용적인 예제들을 다룹니다.

## 기본 설정

### HTML 환경

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Band SDK 예제</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div id="app">
        <h1>Link Band 실시간 모니터링</h1>
        <div id="status"></div>
        <div id="charts"></div>
    </div>
    
    <script src="linkband-client.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

### 기본 클라이언트 클래스

```javascript
class LinkBandClient {
    constructor(baseUrl = 'http://localhost:8121') {
        this.baseUrl = baseUrl;
        this.websocket = null;
        this.isConnected = false;
    }
    
    async get(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    
    async post(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    
    connectWebSocket() {
        return new Promise((resolve, reject) => {
            this.websocket = new WebSocket('ws://localhost:8121/ws');
            
            this.websocket.onopen = () => {
                this.isConnected = true;
                console.log('WebSocket 연결됨');
                resolve(this.websocket);
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                reject(error);
            };
            
            this.websocket.onclose = () => {
                this.isConnected = false;
                console.log('WebSocket 연결 종료됨');
            };
        });
    }
    
    sendMessage(data) {
        if (this.isConnected && this.websocket) {
            this.websocket.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket이 연결되지 않음');
        }
    }
}
```

## 예제 1: 디바이스 관리

### 디바이스 스캔 및 연결

```javascript
class DeviceManager {
    constructor() {
        this.client = new LinkBandClient();
        this.connectedDevice = null;
    }
    
    async scanDevices() {
        try {
            console.log('디바이스 스캔 시작...');
            
            // 스캔 시작
            const scanResult = await this.client.post('/device/scan', {
                duration: 10
            });
            
            console.log('스캔 결과:', scanResult);
            
            // 스캔 완료까지 대기
            await this.waitForScanComplete();
            
            // 스캔된 디바이스 목록 조회
            const devices = await this.client.get('/device/list');
            console.log(`발견된 디바이스: ${devices.data.length}개`);
            
            return devices.data;
            
        } catch (error) {
            console.error('디바이스 스캔 오류:', error);
            throw error;
        }
    }
    
    async waitForScanComplete() {
        return new Promise(resolve => {
            setTimeout(resolve, 12000); // 12초 대기
        });
    }
    
    async connectDevice(deviceAddress) {
        try {
            console.log(`디바이스 연결 중: ${deviceAddress}`);
            
            const result = await this.client.post('/device/connect', {
                address: deviceAddress
            });
            
            if (result.success) {
                this.connectedDevice = deviceAddress;
                console.log('디바이스 연결 성공');
                
                // 연결 상태 확인
                await this.checkConnectionStatus();
                
                return true;
            } else {
                throw new Error(result.message || '연결 실패');
            }
            
        } catch (error) {
            console.error('디바이스 연결 오류:', error);
            throw error;
        }
    }
    
    async checkConnectionStatus() {
        try {
            const status = await this.client.get('/device/status');
            console.log('연결 상태:', status);
            
            // 배터리 정보 확인
            const battery = await this.client.get('/device/battery');
            console.log(`배터리 레벨: ${battery.data.level}%`);
            
        } catch (error) {
            console.error('상태 확인 오류:', error);
        }
    }
    
    async disconnectDevice() {
        try {
            if (this.connectedDevice) {
                const result = await this.client.post('/device/disconnect', {});
                console.log('디바이스 연결 해제:', result);
                this.connectedDevice = null;
            }
        } catch (error) {
            console.error('연결 해제 오류:', error);
        }
    }
}

// 사용 예제
async function deviceManagementExample() {
    const deviceManager = new DeviceManager();
    
    try {
        // 디바이스 스캔
        const devices = await deviceManager.scanDevices();
        
        if (devices.length > 0) {
            // 첫 번째 디바이스에 연결
            const device = devices[0];
            await deviceManager.connectDevice(device.address);
            
            // 5초 후 연결 해제
            setTimeout(async () => {
                await deviceManager.disconnectDevice();
            }, 5000);
        } else {
            console.log('스캔된 디바이스가 없습니다.');
        }
        
    } catch (error) {
        console.error('예제 실행 오류:', error);
    }
}
```

## 예제 2: 실시간 데이터 시각화

### Chart.js를 이용한 실시간 그래프

```javascript
class RealTimeVisualizer {
    constructor() {
        this.client = new LinkBandClient();
        this.charts = {};
        this.dataBuffers = {
            eeg: { ch1: [], ch2: [] },
            ppg: { red: [], ir: [] },
            acc: { x: [], y: [], z: [] }
        };
        this.maxDataPoints = 250; // 10초간 데이터 (25Hz * 10초)
    }
    
    async initialize() {
        // WebSocket 연결
        await this.client.connectWebSocket();
        
        // 차트 초기화
        this.initializeCharts();
        
        // 메시지 핸들러 설정
        this.client.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        // 스트리밍 시작
        await this.client.post('/stream/start', {});
        
        console.log('실시간 시각화 시작됨');
    }
    
    initializeCharts() {
        // EEG 차트
        this.charts.eeg = new Chart(document.getElementById('eegChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'CH1',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.1
                    },
                    {
                        label: 'CH2',
                        data: [],
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    x: { display: false },
                    y: { 
                        title: { display: true, text: 'Amplitude (μV)' }
                    }
                },
                plugins: {
                    title: { display: true, text: 'EEG 신호' }
                }
            }
        });
        
        // PPG 차트
        this.charts.ppg = new Chart(document.getElementById('ppgChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Red',
                        data: [],
                        borderColor: 'rgb(255, 0, 0)',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        tension: 0.1
                    },
                    {
                        label: 'IR',
                        data: [],
                        borderColor: 'rgb(128, 0, 128)',
                        backgroundColor: 'rgba(128, 0, 128, 0.1)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    x: { display: false },
                    y: { 
                        title: { display: true, text: 'Intensity' }
                    }
                },
                plugins: {
                    title: { display: true, text: 'PPG 신호' }
                }
            }
        });
        
        // ACC 차트
        this.charts.acc = new Chart(document.getElementById('accChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'X',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    },
                    {
                        label: 'Y',
                        data: [],
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1
                    },
                    {
                        label: 'Z',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    x: { display: false },
                    y: { 
                        title: { display: true, text: 'Acceleration' }
                    }
                },
                plugins: {
                    title: { display: true, text: '가속도계' }
                }
            }
        });
    }
    
    handleMessage(data) {
        if (data.type === 'raw_data') {
            const sensorType = data.sensor_type;
            const samples = data.data;
            
            switch (sensorType) {
                case 'eeg':
                    this.updateEEGChart(samples);
                    break;
                case 'ppg':
                    this.updatePPGChart(samples);
                    break;
                case 'acc':
                    this.updateACCChart(samples);
                    break;
            }
        }
    }
    
    updateEEGChart(samples) {
        samples.forEach(sample => {
            this.dataBuffers.eeg.ch1.push(sample.ch1);
            this.dataBuffers.eeg.ch2.push(sample.ch2);
        });
        
        // 버퍼 크기 제한
        if (this.dataBuffers.eeg.ch1.length > this.maxDataPoints) {
            this.dataBuffers.eeg.ch1 = this.dataBuffers.eeg.ch1.slice(-this.maxDataPoints);
            this.dataBuffers.eeg.ch2 = this.dataBuffers.eeg.ch2.slice(-this.maxDataPoints);
        }
        
        // 차트 업데이트
        const chart = this.charts.eeg;
        chart.data.labels = Array.from({ length: this.dataBuffers.eeg.ch1.length }, (_, i) => i);
        chart.data.datasets[0].data = [...this.dataBuffers.eeg.ch1];
        chart.data.datasets[1].data = [...this.dataBuffers.eeg.ch2];
        chart.update('none');
    }
    
    updatePPGChart(samples) {
        samples.forEach(sample => {
            this.dataBuffers.ppg.red.push(sample.red);
            this.dataBuffers.ppg.ir.push(sample.ir);
        });
        
        // 버퍼 크기 제한
        if (this.dataBuffers.ppg.red.length > this.maxDataPoints) {
            this.dataBuffers.ppg.red = this.dataBuffers.ppg.red.slice(-this.maxDataPoints);
            this.dataBuffers.ppg.ir = this.dataBuffers.ppg.ir.slice(-this.maxDataPoints);
        }
        
        // 차트 업데이트
        const chart = this.charts.ppg;
        chart.data.labels = Array.from({ length: this.dataBuffers.ppg.red.length }, (_, i) => i);
        chart.data.datasets[0].data = [...this.dataBuffers.ppg.red];
        chart.data.datasets[1].data = [...this.dataBuffers.ppg.ir];
        chart.update('none');
    }
    
    updateACCChart(samples) {
        samples.forEach(sample => {
            this.dataBuffers.acc.x.push(sample.x);
            this.dataBuffers.acc.y.push(sample.y);
            this.dataBuffers.acc.z.push(sample.z);
        });
        
        // 버퍼 크기 제한
        if (this.dataBuffers.acc.x.length > this.maxDataPoints) {
            this.dataBuffers.acc.x = this.dataBuffers.acc.x.slice(-this.maxDataPoints);
            this.dataBuffers.acc.y = this.dataBuffers.acc.y.slice(-this.maxDataPoints);
            this.dataBuffers.acc.z = this.dataBuffers.acc.z.slice(-this.maxDataPoints);
        }
        
        // 차트 업데이트
        const chart = this.charts.acc;
        chart.data.labels = Array.from({ length: this.dataBuffers.acc.x.length }, (_, i) => i);
        chart.data.datasets[0].data = [...this.dataBuffers.acc.x];
        chart.data.datasets[1].data = [...this.dataBuffers.acc.y];
        chart.data.datasets[2].data = [...this.dataBuffers.acc.z];
        chart.update('none');
    }
    
    async stop() {
        try {
            await this.client.post('/stream/stop', {});
            if (this.client.websocket) {
                this.client.websocket.close();
            }
            console.log('실시간 시각화 중지됨');
        } catch (error) {
            console.error('시각화 중지 오류:', error);
        }
    }
}

// HTML에 필요한 캔버스 요소들
const chartHTML = `
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px;">
    <div>
        <canvas id="eegChart"></canvas>
    </div>
    <div>
        <canvas id="ppgChart"></canvas>
    </div>
    <div style="grid-column: span 2;">
        <canvas id="accChart"></canvas>
    </div>
</div>
`;

// 사용 예제
async function visualizationExample() {
    // HTML에 차트 컨테이너 추가
    document.getElementById('charts').innerHTML = chartHTML;
    
    const visualizer = new RealTimeVisualizer();
    
    try {
        await visualizer.initialize();
        
        // 30초 후 자동 중지
        setTimeout(async () => {
            await visualizer.stop();
        }, 30000);
        
    } catch (error) {
        console.error('시각화 예제 오류:', error);
    }
}
```

## 예제 3: 데이터 레코딩 및 내보내기

### 세션 관리 및 데이터 내보내기

```javascript
class DataRecorder {
    constructor() {
        this.client = new LinkBandClient();
        this.currentSession = null;
        this.isRecording = false;
    }
    
    async startRecording(durationMinutes = 5) {
        try {
            const result = await this.client.post('/data/start-recording', {
                duration: durationMinutes * 60,
                sensors: ['eeg', 'ppg', 'acc'],
                metadata: {
                    subject: 'test_subject',
                    experiment: 'javascript_example',
                    notes: 'JavaScript SDK 예제 레코딩'
                }
            });
            
            this.currentSession = result.data.session_id;
            this.isRecording = true;
            
            console.log(`레코딩 시작: ${this.currentSession}`);
            console.log(`예상 종료 시간: ${new Date(Date.now() + durationMinutes * 60 * 1000)}`);
            
            return this.currentSession;
            
        } catch (error) {
            console.error('레코딩 시작 오류:', error);
            throw error;
        }
    }
    
    async stopRecording() {
        try {
            if (this.isRecording) {
                const result = await this.client.post('/data/stop-recording', {});
                this.isRecording = false;
                console.log('레코딩 중지:', result);
                return result;
            }
        } catch (error) {
            console.error('레코딩 중지 오류:', error);
            throw error;
        }
    }
    
    async getRecordingStatus() {
        try {
            const status = await this.client.get('/data/recording-status');
            return status.data;
        } catch (error) {
            console.error('레코딩 상태 조회 오류:', error);
            throw error;
        }
    }
    
    async listSessions() {
        try {
            const sessions = await this.client.get('/data/sessions');
            return sessions.data;
        } catch (error) {
            console.error('세션 목록 조회 오류:', error);
            throw error;
        }
    }
    
    async getSessionInfo(sessionId) {
        try {
            const session = await this.client.get(`/data/sessions/${sessionId}`);
            return session.data;
        } catch (error) {
            console.error('세션 정보 조회 오류:', error);
            throw error;
        }
    }
    
    async exportSession(sessionId, format = 'json') {
        try {
            const result = await this.client.post('/data/export', {
                session_id: sessionId,
                format: format,
                sensors: ['eeg', 'ppg', 'acc'],
                data_types: ['raw', 'processed']
            });
            
            console.log('내보내기 시작:', result);
            
            // 내보내기 완료까지 대기
            await this.waitForExportComplete(result.data.export_id);
            
            return result.data.export_id;
            
        } catch (error) {
            console.error('세션 내보내기 오류:', error);
            throw error;
        }
    }
    
    async waitForExportComplete(exportId) {
        return new Promise((resolve, reject) => {
            const checkStatus = async () => {
                try {
                    const status = await this.client.get(`/data/export-status/${exportId}`);
                    
                    if (status.data.status === 'completed') {
                        console.log('내보내기 완료:', status.data.download_url);
                        resolve(status.data);
                    } else if (status.data.status === 'failed') {
                        reject(new Error('내보내기 실패'));
                    } else {
                        // 2초 후 다시 확인
                        setTimeout(checkStatus, 2000);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            checkStatus();
        });
    }
    
    async downloadExport(exportId) {
        try {
            // 브라우저에서 파일 다운로드
            const downloadUrl = `/data/download/${exportId}`;
            const link = document.createElement('a');
            link.href = this.client.baseUrl + downloadUrl;
            link.download = `session_${exportId}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('다운로드 시작됨');
            
        } catch (error) {
            console.error('다운로드 오류:', error);
            throw error;
        }
    }
}

// 사용 예제
async function recordingExample() {
    const recorder = new DataRecorder();
    
    try {
        // 1분간 레코딩
        const sessionId = await recorder.startRecording(1);
        
        // 레코딩 중 상태 확인
        const statusInterval = setInterval(async () => {
            try {
                const status = await recorder.getRecordingStatus();
                console.log(`레코딩 상태: ${status.status} (${status.elapsed_time}초 경과)`);
                
                if (!status.is_recording) {
                    clearInterval(statusInterval);
                }
            } catch (error) {
                console.error('상태 확인 오류:', error);
                clearInterval(statusInterval);
            }
        }, 10000); // 10초마다 확인
        
        // 1분 후 레코딩 중지
        setTimeout(async () => {
            await recorder.stopRecording();
            clearInterval(statusInterval);
            
            // 세션 정보 확인
            setTimeout(async () => {
                const sessionInfo = await recorder.getSessionInfo(sessionId);
                console.log('세션 정보:', sessionInfo);
                
                // JSON 형식으로 내보내기
                const exportId = await recorder.exportSession(sessionId, 'json');
                
                // 다운로드
                await recorder.downloadExport(exportId);
                
            }, 2000);
            
        }, 60000);
        
    } catch (error) {
        console.error('레코딩 예제 오류:', error);
    }
}
```

## 예제 4: 심박수 모니터링

### PPG 신호를 이용한 실시간 심박수 계산

```javascript
class HeartRateMonitor {
    constructor() {
        this.client = new LinkBandClient();
        this.ppgBuffer = [];
        this.samplingRate = 50; // Hz
        this.heartRate = 0;
        this.isMonitoring = false;
    }
    
    async startMonitoring() {
        try {
            // WebSocket 연결
            await this.client.connectWebSocket();
            
            // 메시지 핸들러 설정
            this.client.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };
            
            // 스트리밍 시작
            await this.client.post('/stream/start', {});
            
            this.isMonitoring = true;
            console.log('심박수 모니터링 시작됨');
            
        } catch (error) {
            console.error('심박수 모니터링 시작 오류:', error);
            throw error;
        }
    }
    
    handleMessage(data) {
        if (data.type === 'raw_data' && data.sensor_type === 'ppg') {
            const samples = data.data;
            
            // IR 채널 데이터 추출
            const irValues = samples.map(sample => sample.ir);
            this.ppgBuffer.push(...irValues);
            
            // 10초간의 데이터가 모이면 심박수 계산
            if (this.ppgBuffer.length >= 500) { // 10초 * 50Hz
                this.calculateHeartRate();
                
                // 버퍼 크기 제한 (20초치 데이터 유지)
                if (this.ppgBuffer.length > 1000) {
                    this.ppgBuffer = this.ppgBuffer.slice(-500);
                }
            }
        }
    }
    
    calculateHeartRate() {
        try {
            const signal = this.ppgBuffer.slice(-500); // 최근 10초 데이터
            
            // 간단한 피크 검출 알고리즘
            const peaks = this.detectPeaks(signal);
            
            if (peaks.length >= 5) {
                // RR 간격 계산
                const rrIntervals = [];
                for (let i = 1; i < peaks.length; i++) {
                    const interval = (peaks[i] - peaks[i-1]) / this.samplingRate; // 초 단위
                    rrIntervals.push(interval);
                }
                
                // 평균 RR 간격으로 심박수 계산
                const avgRR = rrIntervals.reduce((sum, rr) => sum + rr, 0) / rrIntervals.length;
                const heartRate = 60 / avgRR; // BPM
                
                // 정상 범위 확인 (40-200 BPM)
                if (heartRate >= 40 && heartRate <= 200) {
                    this.heartRate = Math.round(heartRate);
                    this.displayHeartRate();
                }
            }
            
        } catch (error) {
            console.error('심박수 계산 오류:', error);
        }
    }
    
    detectPeaks(signal) {
        const peaks = [];
        const threshold = this.calculateThreshold(signal);
        const minDistance = 25; // 최소 피크 간격 (0.5초)
        
        for (let i = 1; i < signal.length - 1; i++) {
            if (signal[i] > signal[i-1] && 
                signal[i] > signal[i+1] && 
                signal[i] > threshold) {
                
                // 최소 거리 확인
                if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
                    peaks.push(i);
                }
            }
        }
        
        return peaks;
    }
    
    calculateThreshold(signal) {
        const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
        const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
        const stdDev = Math.sqrt(variance);
        
        return mean + stdDev;
    }
    
    displayHeartRate() {
        console.log(`💓 현재 심박수: ${this.heartRate} BPM`);
        
        // UI 업데이트
        const heartRateElement = document.getElementById('heartRate');
        if (heartRateElement) {
            heartRateElement.textContent = `${this.heartRate} BPM`;
            
            // 심박수에 따른 색상 변경
            if (this.heartRate < 60) {
                heartRateElement.style.color = 'blue'; // 서맥
            } else if (this.heartRate > 100) {
                heartRateElement.style.color = 'red'; // 빈맥
            } else {
                heartRateElement.style.color = 'green'; // 정상
            }
        }
    }
    
    async stopMonitoring() {
        try {
            this.isMonitoring = false;
            await this.client.post('/stream/stop', {});
            
            if (this.client.websocket) {
                this.client.websocket.close();
            }
            
            console.log('심박수 모니터링 중지됨');
            
        } catch (error) {
            console.error('심박수 모니터링 중지 오류:', error);
        }
    }
}

// HTML UI
const heartRateHTML = `
<div style="text-align: center; margin: 20px;">
    <h2>실시간 심박수 모니터링</h2>
    <div style="font-size: 48px; font-weight: bold; margin: 20px;">
        <span id="heartRate">-- BPM</span>
    </div>
    <div>
        <button id="startHR" onclick="startHeartRateMonitoring()">시작</button>
        <button id="stopHR" onclick="stopHeartRateMonitoring()">중지</button>
    </div>
</div>
`;

let heartRateMonitor = null;

async function startHeartRateMonitoring() {
    try {
        heartRateMonitor = new HeartRateMonitor();
        await heartRateMonitor.startMonitoring();
        
        document.getElementById('startHR').disabled = true;
        document.getElementById('stopHR').disabled = false;
        
    } catch (error) {
        console.error('심박수 모니터링 시작 실패:', error);
    }
}

async function stopHeartRateMonitoring() {
    try {
        if (heartRateMonitor) {
            await heartRateMonitor.stopMonitoring();
            heartRateMonitor = null;
        }
        
        document.getElementById('startHR').disabled = false;
        document.getElementById('stopHR').disabled = true;
        document.getElementById('heartRate').textContent = '-- BPM';
        
    } catch (error) {
        console.error('심박수 모니터링 중지 실패:', error);
    }
}
```

## 유틸리티 함수

### 공통 유틸리티

```javascript
class LinkBandUtils {
    static formatTimestamp(timestamp) {
        return new Date(timestamp * 1000).toLocaleString('ko-KR');
    }
    
    static calculateDataRate(sampleCount, duration) {
        return duration > 0 ? sampleCount / duration : 0;
    }
    
    static async checkServerHealth() {
        try {
            const client = new LinkBandClient();
            const response = await client.get('/health');
            return response.status === 'healthy';
        } catch {
            return false;
        }
    }
    
    static saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('로컬 저장소 저장 오류:', error);
        }
    }
    
    static loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('로컬 저장소 로드 오류:', error);
            return null;
        }
    }
    
    static downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// 사용 예제
async function utilityExample() {
    // 서버 상태 확인
    const isHealthy = await LinkBandUtils.checkServerHealth();
    console.log(`서버 상태: ${isHealthy ? '정상' : '오류'}`);
    
    // 데이터 로컬 저장
    const testData = { message: 'Hello Link Band!' };
    LinkBandUtils.saveToLocalStorage('test_data', testData);
    
    // 데이터 로드
    const loadedData = LinkBandUtils.loadFromLocalStorage('test_data');
    console.log('로드된 데이터:', loadedData);
    
    // JSON 파일 다운로드
    LinkBandUtils.downloadJSON(testData, 'test_data.json');
}
```

## 참고사항

1. 모든 예제는 Link Band SDK 서버가 `localhost:8121`에서 실행 중이어야 합니다.
2. 웹 브라우저의 CORS 정책에 따라 로컬 파일 접근이 제한될 수 있습니다.
3. WebSocket 연결은 네트워크 상태에 따라 불안정할 수 있으므로 재연결 로직 구현을 권장합니다.
4. 실시간 차트 업데이트 시 성능을 위해 애니메이션을 비활성화했습니다.
5. 브라우저의 메모리 제한을 고려하여 데이터 버퍼 크기를 적절히 관리하세요. 