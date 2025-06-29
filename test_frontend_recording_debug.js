const axios = require('axios');

const API_BASE_URL = 'http://localhost:8121';

async function testFrontendRecording() {
    console.log('🧪 === Frontend Recording Debug Test ===');
    
    try {
        // 1. 녹화 시작 (프론트엔드와 동일한 형식)
        const startData = {
            session_name: `debug_test_${Date.now()}`,
            settings: {
                data_format: "json",
                export_path: "/Users/brian_chae/Library/Application Support/Link Band SDK/Exports"
            }
        };
        
        console.log('📤 Starting recording with data:', JSON.stringify(startData, null, 2));
        
        const startResponse = await axios.post(`${API_BASE_URL}/data/start-recording`, startData, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Recording started:', startResponse.data);
        
        // 2. 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 3. 상태 확인
        const statusResponse = await axios.get(`${API_BASE_URL}/data/recording-status`);
        console.log('📊 Recording status:', statusResponse.data);
        
        // 4. 녹화 중지
        console.log('🛑 Stopping recording...');
        const stopResponse = await axios.post(`${API_BASE_URL}/data/stop-recording`, {});
        console.log('✅ Recording stopped:', stopResponse.data);
        
        // 5. 최종 상태 확인
        const finalStatusResponse = await axios.get(`${API_BASE_URL}/data/recording-status`);
        console.log('📊 Final status:', finalStatusResponse.data);
        
    } catch (error) {
        console.error('❌ Test failed:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
    }
}

testFrontendRecording(); 