// CSV 형식 저장 기능 테스트 스크립트
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8121';

async function testCsvFormat() {
    console.log('🧪 CSV 형식 저장 기능 테스트 시작');
    
    try {
        // 1. JSON 형식으로 세션 시작 테스트
        console.log('\n1️⃣ JSON 형식 세션 테스트');
        const jsonSessionData = {
            session_name: "test_json_session",
            settings: {
                data_format: "json",
                export_path: "./test_data"
            }
        };
        
        const jsonStartResponse = await axios.post(`${API_BASE_URL}/data/start-recording`, jsonSessionData);
        console.log('✅ JSON 세션 시작:', jsonStartResponse.data);
        
        // 잠시 대기 후 중지
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const jsonStopResponse = await axios.post(`${API_BASE_URL}/data/stop-recording`);
        console.log('✅ JSON 세션 중지:', jsonStopResponse.data);
        
        // 2. CSV 형식으로 세션 시작 테스트
        console.log('\n2️⃣ CSV 형식 세션 테스트');
        const csvSessionData = {
            session_name: "test_csv_session",
            settings: {
                data_format: "csv",
                export_path: "./test_data"
            }
        };
        
        const csvStartResponse = await axios.post(`${API_BASE_URL}/data/start-recording`, csvSessionData);
        console.log('✅ CSV 세션 시작:', csvStartResponse.data);
        
        // 잠시 대기 후 중지
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const csvStopResponse = await axios.post(`${API_BASE_URL}/data/stop-recording`);
        console.log('✅ CSV 세션 중지:', csvStopResponse.data);
        
        // 3. 세션 목록 확인
        console.log('\n3️⃣ 세션 목록 확인');
        const sessionsResponse = await axios.get(`${API_BASE_URL}/data/sessions`);
        console.log('📋 세션 목록:', JSON.stringify(sessionsResponse.data, null, 2));
        
        console.log('\n🎉 CSV 형식 저장 기능 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('상태 코드:', error.response.status);
            console.error('응답 데이터:', error.response.data);
        }
    }
}

async function testFormatValidation() {
    console.log('\n🔍 형식 검증 테스트');
    
    try {
        // 다양한 형식 값 테스트
        const formats = ['JSON', 'json', 'CSV', 'csv', 'invalid'];
        
        for (const format of formats) {
            console.log(`\n📝 테스트 형식: ${format}`);
            
            const sessionData = {
                session_name: `test_format_${format.toLowerCase()}`,
                settings: {
                    data_format: format,
                    export_path: "./test_data"
                }
            };
            
            try {
                const startResponse = await axios.post(`${API_BASE_URL}/data/start-recording`, sessionData);
                console.log(`✅ ${format} 형식 시작 성공:`, startResponse.data.data_format);
                
                // 바로 중지
                const stopResponse = await axios.post(`${API_BASE_URL}/data/stop-recording`);
                console.log(`✅ ${format} 형식 중지 성공`);
                
            } catch (error) {
                console.error(`❌ ${format} 형식 테스트 실패:`, error.response?.data || error.message);
            }
            
            // 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.error('❌ 형식 검증 테스트 실패:', error.message);
    }
}

// 메인 실행
async function main() {
    console.log('🚀 DataCenter 파일 형식 선택 기능 테스트');
    console.log('='.repeat(50));
    
    // 서버 연결 확인
    try {
        const healthResponse = await axios.get(`${API_BASE_URL}/`);
        console.log('✅ 서버 연결 확인:', healthResponse.data);
    } catch (error) {
        console.error('❌ 서버 연결 실패. 서버가 실행 중인지 확인하세요.');
        console.error('서버 실행 명령: cd python_core && python run_server.py');
        return;
    }
    
    await testCsvFormat();
    await testFormatValidation();
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 모든 테스트 완료');
}

// 스크립트 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testCsvFormat, testFormatValidation }; 