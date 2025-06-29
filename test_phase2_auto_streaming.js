const axios = require('axios');

const API_BASE_URL = 'http://localhost:8121';

async function testPhase2AutoStreaming() {
    console.log('🚀 Testing Phase 2 - Auto Streaming Detection');
    console.log('='.repeat(60));

    try {
        // 1. 자동 스트리밍 상태 확인
        console.log('\n1. 📡 Testing /stream/auto-status API...');
        const autoStatusResponse = await axios.get(`${API_BASE_URL}/stream/auto-status`);
        console.log('✅ Auto Streaming Status:', JSON.stringify(autoStatusResponse.data, null, 2));

        // 2. 기존 스트리밍 상태와 비교
        console.log('\n2. 📊 Comparing with regular /stream/status...');
        const regularStatusResponse = await axios.get(`${API_BASE_URL}/stream/status`);
        console.log('📋 Regular Status:', JSON.stringify(regularStatusResponse.data, null, 2));

        // 3. 스트리밍 활성화 조건 분석
        const autoStatus = autoStatusResponse.data;
        const isStreamingActive = autoStatus?.status === 'active' && 
                                 autoStatus?.active_sensors && 
                                 autoStatus.active_sensors.length > 0;

        console.log('\n3. 🔍 Streaming Activation Analysis:');
        console.log(`   Status: ${autoStatus?.status}`);
        console.log(`   Active Sensors: ${autoStatus?.active_sensors || 'none'}`);
        console.log(`   Data Flow Health: ${autoStatus?.data_flow_health}`);
        console.log(`   Auto Detected: ${autoStatus?.auto_detected}`);
        console.log(`   📝 Is Streaming Active: ${isStreamingActive ? '✅ YES' : '❌ NO'}`);

        // 4. 녹화 가능 조건 체크
        console.log('\n4. 🎬 Recording Availability Check:');
        const deviceStatusResponse = await axios.get(`${API_BASE_URL}/device/status`);
        const deviceStatus = deviceStatusResponse.data;
        
        const isEngineStarted = regularStatusResponse.data?.status !== 'stopped';
        const isDeviceConnected = deviceStatus?.is_connected || false;
        
        console.log(`   Engine Started: ${isEngineStarted ? '✅' : '❌'}`);
        console.log(`   Device Connected: ${isDeviceConnected ? '✅' : '❌'}`);
        console.log(`   Streaming Active: ${isStreamingActive ? '✅' : '❌'}`);
        
        const canRecord = isEngineStarted && isDeviceConnected && isStreamingActive;
        console.log(`   📹 Can Start Recording: ${canRecord ? '✅ YES' : '❌ NO'}`);

        if (!canRecord) {
            console.log('\n❗ Recording Requirements:');
            if (!isEngineStarted) console.log('   - Start Engine first');
            if (!isDeviceConnected) console.log('   - Connect Link Band device');
            if (!isStreamingActive) console.log('   - Ensure data is actively streaming');
        }

        console.log('\n🎉 Phase 2 Auto Streaming Detection Test Complete!');
        
    } catch (error) {
        console.error('❌ Error testing Phase 2:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// 실행
testPhase2AutoStreaming(); 