#!/usr/bin/env node

const axios = require('axios');

// API 기본 URL
const API_BASE = 'http://localhost:8121';

// 프론트엔드와 동일한 형식으로 테스트
async function testFrontendFormat() {
    console.log('🧪 Testing Frontend API Format...\n');
    
    // 1. 프론트엔드 형식 (중첩 구조)
    console.log('📋 Testing Frontend Format (Nested Structure):');
    const frontendSessionData = {
        session_name: `frontend_test_${Date.now()}`,
        settings: {
            data_format: 'json',
            export_path: '/Users/brian_chae/Library/Application Support/Link Band SDK/Exports'
        }
    };
    
    try {
        console.log('Sending:', JSON.stringify(frontendSessionData, null, 2));
        const response = await axios.post(`${API_BASE}/data/start-recording`, frontendSessionData);
        console.log('✅ Frontend format SUCCESS:', response.data);
        
        // 레코딩 중지
        await new Promise(resolve => setTimeout(resolve, 2000));
        const stopResponse = await axios.post(`${API_BASE}/data/stop-recording`);
        console.log('✅ Stop recording:', stopResponse.data);
        
    } catch (error) {
        console.error('❌ Frontend format FAILED:', error.response?.data || error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. 테스트 코드 형식 (플랫 구조)
    console.log('📋 Testing Test Code Format (Flat Structure):');
    const testCodeSessionData = {
        session_name: `testcode_test_${Date.now()}`,
        export_path: './temp_exports'
    };
    
    try {
        console.log('Sending:', JSON.stringify(testCodeSessionData, null, 2));
        const response = await axios.post(`${API_BASE}/data/start-recording`, testCodeSessionData);
        console.log('✅ Test code format SUCCESS:', response.data);
        
        // 레코딩 중지
        await new Promise(resolve => setTimeout(resolve, 2000));
        const stopResponse = await axios.post(`${API_BASE}/data/stop-recording`);
        console.log('✅ Stop recording:', stopResponse.data);
        
    } catch (error) {
        console.error('❌ Test code format FAILED:', error.response?.data || error.message);
    }
    
    console.log('\n🏁 Test completed!');
}

testFrontendFormat().catch(console.error); 