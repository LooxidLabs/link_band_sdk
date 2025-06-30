const WebSocket = require('ws');

async function testPPGACCSamplingRates() {
    console.log('🔍 Testing PPG and ACC Sampling Rates...\n');
    
    try {
        // WebSocket 연결
        const ws = new WebSocket('ws://localhost:18765');
        
        await new Promise((resolve, reject) => {
            ws.on('open', () => {
                console.log('✅ WebSocket connected');
                resolve();
            });
            ws.on('error', (error) => {
                console.error('❌ WebSocket connection failed:', error.message);
                reject(error);
            });
        });

        // 데이터 수집을 위한 변수들
        const sensorData = {
            ppg: [],
            acc: []
        };
        
        let messageCount = 0;
        const maxMessages = 100; // 충분한 데이터 수집을 위해

        // 메시지 처리
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                messageCount++;
                
                if (message.type === 'raw_data') {
                    if (message.sensor_type === 'ppg' && message.data && message.data.length > 0) {
                        sensorData.ppg.push({
                            timestamp: message.timestamp,
                            samples: message.data,
                            count: message.data.length
                        });
                        
                        // PPG 패킷 구조 분석
                        if (sensorData.ppg.length === 1) {
                            console.log('📊 PPG Packet Structure Analysis:');
                            console.log(`   - Batch size: ${message.data.length} samples`);
                            console.log(`   - Sample structure:`, JSON.stringify(message.data[0], null, 2));
                            
                            // 타임스탬프 간격 계산
                            if (message.data.length > 1) {
                                const intervals = [];
                                for (let i = 1; i < message.data.length; i++) {
                                    intervals.push(message.data[i].timestamp - message.data[i-1].timestamp);
                                }
                                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                                const calculatedRate = 1.0 / avgInterval;
                                console.log(`   - Average timestamp interval: ${avgInterval.toFixed(6)} seconds`);
                                console.log(`   - Calculated sampling rate: ${calculatedRate.toFixed(2)} Hz`);
                            }
                        }
                    }
                    
                    if (message.sensor_type === 'acc' && message.data && message.data.length > 0) {
                        sensorData.acc.push({
                            timestamp: message.timestamp,
                            samples: message.data,
                            count: message.data.length
                        });
                        
                        // ACC 패킷 구조 분석
                        if (sensorData.acc.length === 1) {
                            console.log('\n📊 ACC Packet Structure Analysis:');
                            console.log(`   - Batch size: ${message.data.length} samples`);
                            console.log(`   - Sample structure:`, JSON.stringify(message.data[0], null, 2));
                            
                            // 타임스탬프 간격 계산
                            if (message.data.length > 1) {
                                const intervals = [];
                                for (let i = 1; i < message.data.length; i++) {
                                    intervals.push(message.data[i].timestamp - message.data[i-1].timestamp);
                                }
                                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                                const calculatedRate = 1.0 / avgInterval;
                                console.log(`   - Average timestamp interval: ${avgInterval.toFixed(6)} seconds`);
                                console.log(`   - Calculated sampling rate: ${calculatedRate.toFixed(2)} Hz`);
                            }
                        }
                    }
                }
                
                // 모니터링 메트릭스에서 샘플링 레이트 확인
                if (message.type === 'monitoring_metrics' && message.data) {
                    const metrics = message.data;
                    if (metrics.streaming_status && metrics.streaming_status.sampling_rates) {
                        const rates = metrics.streaming_status.sampling_rates;
                        console.log('\n📈 Current Sampling Rates from StreamingMonitor:');
                        console.log(`   - EEG: ${rates.eeg_sampling_rate?.toFixed(2) || 'N/A'} Hz`);
                        console.log(`   - PPG: ${rates.ppg_sampling_rate?.toFixed(2) || 'N/A'} Hz`);
                        console.log(`   - ACC: ${rates.acc_sampling_rate?.toFixed(2) || 'N/A'} Hz`);
                    }
                }
                
                // 충분한 데이터를 수집했으면 분석 시작
                if (messageCount >= maxMessages && sensorData.ppg.length > 5 && sensorData.acc.length > 5) {
                    analyzeSamplingRates();
                }
                
            } catch (error) {
                console.error('Error parsing message:', error.message);
            }
        });

        // 분석 함수
        function analyzeSamplingRates() {
            console.log('\n🔬 Detailed Sampling Rate Analysis:\n');
            
            // PPG 분석
            if (sensorData.ppg.length > 0) {
                console.log('📊 PPG Analysis:');
                let totalPPGSamples = 0;
                const ppgTimestamps = [];
                
                sensorData.ppg.forEach(batch => {
                    totalPPGSamples += batch.count;
                    batch.samples.forEach(sample => {
                        ppgTimestamps.push(sample.timestamp);
                    });
                });
                
                if (ppgTimestamps.length > 1) {
                    const timeSpan = ppgTimestamps[ppgTimestamps.length - 1] - ppgTimestamps[0];
                    const calculatedRate = (ppgTimestamps.length - 1) / timeSpan;
                    
                    console.log(`   - Total samples collected: ${totalPPGSamples}`);
                    console.log(`   - Time span: ${timeSpan.toFixed(3)} seconds`);
                    console.log(`   - Calculated rate: ${calculatedRate.toFixed(2)} Hz`);
                    console.log(`   - Expected rate: 50 Hz`);
                    console.log(`   - Difference: ${Math.abs(calculatedRate - 50).toFixed(2)} Hz`);
                }
            }
            
            // ACC 분석
            if (sensorData.acc.length > 0) {
                console.log('\n📊 ACC Analysis:');
                let totalACCSamples = 0;
                const accTimestamps = [];
                
                sensorData.acc.forEach(batch => {
                    totalACCSamples += batch.count;
                    batch.samples.forEach(sample => {
                        accTimestamps.push(sample.timestamp);
                    });
                });
                
                if (accTimestamps.length > 1) {
                    const timeSpan = accTimestamps[accTimestamps.length - 1] - accTimestamps[0];
                    const calculatedRate = (accTimestamps.length - 1) / timeSpan;
                    
                    console.log(`   - Total samples collected: ${totalACCSamples}`);
                    console.log(`   - Time span: ${timeSpan.toFixed(3)} seconds`);
                    console.log(`   - Calculated rate: ${calculatedRate.toFixed(2)} Hz`);
                    console.log(`   - Expected rate: 30 Hz`);
                    console.log(`   - Difference: ${Math.abs(calculatedRate - 30).toFixed(2)} Hz`);
                }
            }
            
            console.log('\n✅ Analysis complete');
            ws.close();
            process.exit(0);
        }

        // 타임아웃 설정
        setTimeout(() => {
            console.log('\n⏰ Test timeout - analyzing collected data...');
            if (sensorData.ppg.length > 0 || sensorData.acc.length > 0) {
                analyzeSamplingRates();
            } else {
                console.log('❌ No data collected');
                ws.close();
                process.exit(1);
            }
        }, 15000); // 15초 타임아웃

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testPPGACCSamplingRates(); 