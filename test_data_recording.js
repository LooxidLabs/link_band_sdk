#!/usr/bin/env node

const axios = require('axios');
const WebSocket = require('ws');

// API 기본 URL
const API_BASE = 'http://localhost:8121';
const WS_URL = 'ws://localhost:18765';

// 테스트 데이터
const TEST_SESSION_NAME = `test_recording_${Date.now()}`;

class DataRecordingTester {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.recordingStarted = false;
        this.dataReceived = {
            eeg: 0,
            ppg: 0,
            acc: 0,
            battery: 0
        };
    }

    // API 헬스체크
    async checkServerHealth() {
        try {
            console.log('🔍 Checking server health...');
            const response = await axios.get(`${API_BASE}/metrics/`);
            console.log('✅ Server is healthy:', response.data.timestamp);
            return true;
        } catch (error) {
            console.error('❌ Server health check failed:', error.message);
            return false;
        }
    }

    // 디바이스 상태 확인
    async checkDeviceStatus() {
        try {
            console.log('🔍 Checking device status...');
            const response = await axios.get(`${API_BASE}/device/status`);
            console.log('📱 Device status:', response.data);
            return response.data.is_connected;
        } catch (error) {
            console.error('❌ Device status check failed:', error.message);
            return false;
        }
    }

    // 스트림 상태 확인
    async checkStreamStatus() {
        try {
            console.log('🔍 Checking stream status...');
            const response = await axios.get(`${API_BASE}/stream/status`);
            console.log('🌊 Stream status:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Stream status check failed:', error.message);
            return null;
        }
    }

    // 스트리밍 시작
    async startStreaming() {
        try {
            console.log('🚀 Starting streaming...');
            const response = await axios.post(`${API_BASE}/stream/start`);
            console.log('✅ Streaming started:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Failed to start streaming:', error.message);
            return false;
        }
    }

    // WebSocket 연결
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Connecting to WebSocket...');
            this.ws = new WebSocket(WS_URL);

            this.ws.on('open', () => {
                console.log('✅ WebSocket connected');
                this.isConnected = true;
                resolve(true);
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('❌ Failed to parse WebSocket message:', error.message);
                }
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error.message);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('🔌 WebSocket disconnected');
                this.isConnected = false;
            });

            // 타임아웃 설정
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 5000);
        });
    }

    // WebSocket 메시지 처리
    handleWebSocketMessage(message) {
        if (message.type === 'sensor_data') {
            // 데이터 수신 카운트
            if (message.sensor_type === 'eeg') this.dataReceived.eeg++;
            else if (message.sensor_type === 'ppg') this.dataReceived.ppg++;
            else if (message.sensor_type === 'acc') this.dataReceived.acc++;
            else if (message.sensor_type === 'battery') this.dataReceived.battery++;

            // 주기적으로 데이터 수신 상태 출력
            const total = this.dataReceived.eeg + this.dataReceived.ppg + this.dataReceived.acc + this.dataReceived.battery;
            if (total % 100 === 0) {
                console.log(`📊 Data received - EEG: ${this.dataReceived.eeg}, PPG: ${this.dataReceived.ppg}, ACC: ${this.dataReceived.acc}, Battery: ${this.dataReceived.battery}`);
            }
        }
    }

    // 레코딩 시작
    async startRecording() {
        try {
            console.log('🎬 Starting recording...');
            const response = await axios.post(`${API_BASE}/data/start-recording`, {
                session_name: TEST_SESSION_NAME,
                export_path: './temp_exports'
            });
            console.log('✅ Recording started:', response.data);
            this.recordingStarted = true;
            return true;
        } catch (error) {
            console.error('❌ Failed to start recording:', error.message);
            return false;
        }
    }

    // 레코딩 중지
    async stopRecording() {
        try {
            console.log('⏹️ Stopping recording...');
            const response = await axios.post(`${API_BASE}/data/stop-recording`);
            console.log('✅ Recording stopped:', response.data);
            this.recordingStarted = false;
            return response.data;
        } catch (error) {
            console.error('❌ Failed to stop recording:', error.message);
            return null;
        }
    }

    // 레코딩 상태 확인
    async checkRecordingStatus() {
        try {
            const response = await axios.get(`${API_BASE}/data/recording-status`);
            return response.data;
        } catch (error) {
            console.error('❌ Failed to check recording status:', error.message);
            return null;
        }
    }

    // 저장된 세션 목록 확인
    async checkSavedSessions() {
        try {
            console.log('📁 Checking saved sessions...');
            const response = await axios.get(`${API_BASE}/data/sessions`);
            console.log('📋 Sessions:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Failed to check sessions:', error.message);
            return null;
        }
    }

    // 메인 테스트 실행
    async runTest() {
        console.log('🧪 Starting Data Recording Test...\n');

        // 1. 서버 헬스체크
        if (!(await this.checkServerHealth())) {
            console.log('❌ Test failed: Server not healthy');
            return;
        }

        // 2. 디바이스 상태 확인
        if (!(await this.checkDeviceStatus())) {
            console.log('❌ Test failed: Device not connected');
            return;
        }

        // 3. 스트림 상태 확인
        const streamStatus = await this.checkStreamStatus();
        if (!streamStatus) {
            console.log('❌ Test failed: Cannot get stream status');
            return;
        }

        // 4. 스트리밍이 중지되어 있으면 시작
        if (streamStatus.status === 'stopped') {
            if (!(await this.startStreaming())) {
                console.log('❌ Test failed: Cannot start streaming');
                return;
            }
            // 스트리밍 시작 후 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 5. WebSocket 연결
        try {
            await this.connectWebSocket();
        } catch (error) {
            console.log('❌ Test failed: WebSocket connection failed');
            return;
        }

        // 6. 데이터 수신 확인 (5초간)
        console.log('📊 Monitoring data for 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const totalData = this.dataReceived.eeg + this.dataReceived.ppg + this.dataReceived.acc + this.dataReceived.battery;
        if (totalData === 0) {
            console.log('❌ Test failed: No data received');
            return;
        }
        console.log(`✅ Data reception confirmed: ${totalData} packets received`);

        // 7. 레코딩 시작
        if (!(await this.startRecording())) {
            console.log('❌ Test failed: Cannot start recording');
            return;
        }

        // 8. 레코딩 중 데이터 수집 (10초간)
        console.log('⏱️ Recording data for 10 seconds...');
        const initialData = { ...this.dataReceived };
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 9. 레코딩 중지
        const recordingResult = await this.stopRecording();
        if (!recordingResult) {
            console.log('❌ Test failed: Cannot stop recording');
            return;
        }

        // 10. 저장된 데이터 확인
        const sessions = await this.checkSavedSessions();
        if (!sessions || sessions.length === 0) {
            console.log('❌ Test failed: No sessions saved');
            return;
        }

        // 11. 테스트 세션 찾기
        const testSession = sessions.find(session => session.session_name === TEST_SESSION_NAME);
        if (!testSession) {
            console.log('❌ Test failed: Test session not found in saved sessions');
            return;
        }

        // 12. 결과 출력
        console.log('\n🎉 Test completed successfully!');
        console.log('📊 Final data count:', this.dataReceived);
        console.log('💾 Recording result:', recordingResult);
        console.log('📁 Test session:', testSession);

        // WebSocket 연결 종료
        if (this.ws) {
            this.ws.close();
        }
    }
}

// 테스트 실행
const tester = new DataRecordingTester();
tester.runTest().catch(error => {
    console.error('💥 Test failed with error:', error.message);
    process.exit(1);
}); 