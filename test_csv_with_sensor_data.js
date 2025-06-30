// 센서 데이터를 포함한 CSV 형식 저장 테스트 스크립트
const axios = require('axios');
const WebSocket = require('ws');

const API_BASE_URL = 'http://localhost:8121';
const WS_URL = 'ws://localhost:18765';

async function testWithSensorData() {
    console.log('🧪 센서 데이터를 포함한 CSV 저장 테스트 시작');
    
    try {
        // 1. CSV 형식으로 세션 시작
        console.log('\n1️⃣ CSV 형식 세션 시작');
        const csvSessionData = {
            session_name: "sensor_data_csv_test",
            settings: {
                data_format: "csv",
                export_path: "./test_data"
            }
        };
        
        const startResponse = await axios.post(`${API_BASE_URL}/data/start-recording`, csvSessionData);
        console.log('✅ CSV 세션 시작:', startResponse.data);
        
        // 2. WebSocket 연결하여 센서 데이터 시뮬레이션
        console.log('\n2️⃣ 센서 데이터 시뮬레이션');
        
        // 가상 센서 데이터 생성 및 전송
        await simulateSensorData();
        
        // 3. 세션 중지
        console.log('\n3️⃣ 세션 중지');
        const stopResponse = await axios.post(`${API_BASE_URL}/data/stop-recording`);
        console.log('✅ CSV 세션 중지:', stopResponse.data);
        
        // 4. 생성된 파일 확인
        console.log('\n4️⃣ 생성된 파일 확인');
        const sessionName = startResponse.data.session_name;
        console.log('세션 이름:', sessionName);
        
        console.log('\n🎉 센서 데이터 CSV 저장 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 테스트 실패:', error.response?.data || error.message);
    }
}

async function simulateSensorData() {
    return new Promise((resolve, reject) => {
        console.log('📡 WebSocket 연결 시도...');
        
        const ws = new WebSocket(WS_URL);
        let dataCount = 0;
        const maxData = 10; // 10개의 샘플 데이터 전송
        
        ws.on('open', () => {
            console.log('✅ WebSocket 연결 성공');
            
            // 가상 센서 데이터 전송
            const sendData = () => {
                if (dataCount >= maxData) {
                    console.log(`📊 ${dataCount}개의 센서 데이터 전송 완료`);
                    ws.close();
                    resolve();
                    return;
                }
                
                const timestamp = Date.now() / 1000;
                
                // EEG 데이터 시뮬레이션
                const eegData = {
                    type: 'data',
                    data_type: 'device_eeg_raw',
                    data: {
                        timestamp: timestamp,
                        device_id: 'TEST-DEVICE-001',
                        ch1: Math.random() * 100 + 50,
                        ch2: Math.random() * 100 + 50,
                        ch3: Math.random() * 100 + 50,
                        ch4: Math.random() * 100 + 50,
                        sample_rate: 250
                    }
                };
                
                // PPG 데이터 시뮬레이션
                const ppgData = {
                    type: 'data',
                    data_type: 'device_ppg_raw',
                    data: {
                        timestamp: timestamp,
                        device_id: 'TEST-DEVICE-001',
                        ppg_value: Math.random() * 500 + 300,
                        sample_rate: 125
                    }
                };
                
                // ACC 데이터 시뮬레이션
                const accData = {
                    type: 'data',
                    data_type: 'device_acc_raw',
                    data: {
                        timestamp: timestamp,
                        device_id: 'TEST-DEVICE-001',
                        acc_x: (Math.random() - 0.5) * 2,
                        acc_y: (Math.random() - 0.5) * 2,
                        acc_z: (Math.random() - 0.5) * 2,
                        sample_rate: 50
                    }
                };
                
                ws.send(JSON.stringify(eegData));
                ws.send(JSON.stringify(ppgData));
                ws.send(JSON.stringify(accData));
                
                dataCount++;
                console.log(`📈 센서 데이터 ${dataCount}/${maxData} 전송`);
                
                setTimeout(sendData, 200); // 200ms 간격으로 데이터 전송
            };
            
            setTimeout(sendData, 100); // 연결 후 100ms 대기 후 시작
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket 에러:', error.message);
            reject(error);
        });
        
        ws.on('close', () => {
            console.log('🔌 WebSocket 연결 종료');
        });
        
        // 타임아웃 설정 (10초)
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            resolve();
        }, 10000);
    });
}

async function compareJsonVsCsv() {
    console.log('\n📊 JSON vs CSV 형식 비교 테스트');
    
    try {
        // JSON 형식 테스트
        console.log('\n🔸 JSON 형식 테스트');
        const jsonSessionData = {
            session_name: "compare_json_test",
            settings: {
                data_format: "json",
                export_path: "./test_data"
            }
        };
        
        const jsonStart = await axios.post(`${API_BASE_URL}/data/start-recording`, jsonSessionData);
        console.log('JSON 세션 시작:', jsonStart.data.session_name);
        
        await simulateSensorData();
        
        const jsonStop = await axios.post(`${API_BASE_URL}/data/stop-recording`);
        console.log('JSON 세션 중지:', jsonStop.data.session_name);
        
        // 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // CSV 형식 테스트
        console.log('\n🔸 CSV 형식 테스트');
        const csvSessionData = {
            session_name: "compare_csv_test",
            settings: {
                data_format: "csv",
                export_path: "./test_data"
            }
        };
        
        const csvStart = await axios.post(`${API_BASE_URL}/data/start-recording`, csvSessionData);
        console.log('CSV 세션 시작:', csvStart.data.session_name);
        
        await simulateSensorData();
        
        const csvStop = await axios.post(`${API_BASE_URL}/data/stop-recording`);
        console.log('CSV 세션 중지:', csvStop.data.session_name);
        
        console.log('\n✅ JSON vs CSV 비교 테스트 완료');
        console.log('📁 생성된 파일들을 확인해보세요:');
        console.log(`   JSON: ./python_core/test_data/${jsonStart.data.session_name}/`);
        console.log(`   CSV:  ./python_core/test_data/${csvStart.data.session_name}/`);
        
    } catch (error) {
        console.error('❌ 비교 테스트 실패:', error.response?.data || error.message);
    }
}

// 메인 실행
async function main() {
    console.log('🚀 센서 데이터를 포함한 CSV 저장 기능 테스트');
    console.log('='.repeat(60));
    
    // 서버 연결 확인
    try {
        const healthResponse = await axios.get(`${API_BASE_URL}/`);
        console.log('✅ 서버 연결 확인:', healthResponse.data);
    } catch (error) {
        console.error('❌ 서버 연결 실패. 서버가 실행 중인지 확인하세요.');
        return;
    }
    
    await testWithSensorData();
    await compareJsonVsCsv();
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 모든 센서 데이터 테스트 완료');
}

// 스크립트 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testWithSensorData, compareJsonVsCsv }; 