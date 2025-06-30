#!/usr/bin/env node

const axios = require('axios');

// API 기본 URL
const API_BASE_URL = 'http://localhost:8121';

async function testCSVDatabaseFormat() {
    console.log('🧪 Testing CSV Format Database Storage...\n');
    
    try {
        // 1. CSV 형식으로 세션 시작
        console.log('📋 Starting CSV format session...');
        const sessionData = {
            session_name: `csv_db_test_${Date.now()}`,
            settings: {
                data_format: 'CSV',
                export_path: './test_data'
            }
        };
        
        console.log('Sending:', JSON.stringify(sessionData, null, 2));
        const startResponse = await axios.post(`${API_BASE_URL}/data/start-recording`, sessionData);
        console.log('✅ CSV session started:', {
            status: startResponse.data.status,
            session_name: startResponse.data.session_name,
            data_format: startResponse.data.data_format
        });
        
        // 2. 잠시 대기 후 중지
        console.log('\n⏳ Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const stopResponse = await axios.post(`${API_BASE_URL}/data/stop-recording`);
        console.log('✅ CSV session stopped:', {
            status: stopResponse.data.status,
            session_name: stopResponse.data.session_name
        });
        
        // 3. 세션 목록 조회하여 Format 컬럼 확인
        console.log('\n📋 Checking session list...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // DB 저장 대기
        
        const sessionsResponse = await axios.get(`${API_BASE_URL}/data/sessions`);
        console.log('✅ Sessions retrieved:', sessionsResponse.data.sessions.length, 'sessions');
        
        // 최신 세션 찾기 (방금 생성한 세션)
        const sessions = sessionsResponse.data.sessions;
        const latestSession = sessions.find(s => s.session_name === startResponse.data.session_name);
        
        if (latestSession) {
            console.log('\n🎯 Latest session details:');
            console.log('- Session Name:', latestSession.session_name);
            console.log('- Format:', latestSession.data_format || 'MISSING!');
            console.log('- Status:', latestSession.status);
            console.log('- Path:', latestSession.data_path);
            
            // 형식 검증
            if (latestSession.data_format === 'CSV') {
                console.log('✅ SUCCESS: CSV format correctly saved to database!');
            } else {
                console.log('❌ FAILED: Expected CSV but got:', latestSession.data_format);
            }
        } else {
            console.log('❌ FAILED: Could not find the created session in the list');
        }
        
        // 4. JSON 형식도 테스트
        console.log('\n' + '='.repeat(50));
        console.log('📋 Testing JSON format for comparison...');
        
        const jsonSessionData = {
            session_name: `json_db_test_${Date.now()}`,
            settings: {
                data_format: 'JSON',
                export_path: './test_data'
            }
        };
        
        const jsonStartResponse = await axios.post(`${API_BASE_URL}/data/start-recording`, jsonSessionData);
        console.log('✅ JSON session started:', {
            status: jsonStartResponse.data.status,
            session_name: jsonStartResponse.data.session_name,
            data_format: jsonStartResponse.data.data_format
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const jsonStopResponse = await axios.post(`${API_BASE_URL}/data/stop-recording`);
        console.log('✅ JSON session stopped');
        
        // JSON 세션 확인
        await new Promise(resolve => setTimeout(resolve, 1000));
        const finalSessionsResponse = await axios.get(`${API_BASE_URL}/data/sessions`);
        const jsonSession = finalSessionsResponse.data.sessions.find(s => s.session_name === jsonStartResponse.data.session_name);
        
        if (jsonSession) {
            console.log('\n🎯 JSON session details:');
            console.log('- Session Name:', jsonSession.session_name);
            console.log('- Format:', jsonSession.data_format || 'MISSING!');
            console.log('- Status:', jsonSession.status);
            
            if (jsonSession.data_format === 'JSON') {
                console.log('✅ SUCCESS: JSON format correctly saved to database!');
            } else {
                console.log('❌ FAILED: Expected JSON but got:', jsonSession.data_format);
            }
        }
        
        console.log('\n📊 Final Summary:');
        console.log('- CSV Format Test:', latestSession?.data_format === 'CSV' ? '✅ PASS' : '❌ FAIL');
        console.log('- JSON Format Test:', jsonSession?.data_format === 'JSON' ? '✅ PASS' : '❌ FAIL');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// 실행
testCSVDatabaseFormat(); 