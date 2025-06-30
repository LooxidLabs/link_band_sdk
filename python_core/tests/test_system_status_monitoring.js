const WebSocket = require('ws');

class SystemStatusTester {
    constructor() {
        this.ws = null;
        this.testResults = {
            connection: false,
            systemStatusReceived: false,
            systemStatusData: null
        };
    }

    async testSystemStatusMonitoring() {
        console.log('🔍 Testing System Status Monitoring...\n');

        try {
            // WebSocket 연결 테스트
            await this.testWebSocketConnection();
            
            // 시스템 상태 데이터 수신 테스트
            await this.testSystemStatusData();
            
            // 결과 출력
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }

    async testWebSocketConnection() {
        return new Promise((resolve, reject) => {
            console.log('📡 Testing WebSocket connection...');
            
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 5000);

            this.ws = new WebSocket('ws://localhost:18765');
            
            this.ws.on('open', () => {
                clearTimeout(timeout);
                console.log('✅ WebSocket connected successfully');
                this.testResults.connection = true;
                
                // monitoring_metrics 채널 구독
                this.ws.send(JSON.stringify({
                    type: 'subscribe',
                    channel: 'monitoring_metrics'
                }));
                
                resolve();
            });

            this.ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`WebSocket connection failed: ${error.message}`));
            });
        });
    }

    async testSystemStatusData() {
        return new Promise((resolve, reject) => {
            console.log('📊 Testing system status data reception...');
            
            let dataReceived = false;
            const timeout = setTimeout(() => {
                if (!dataReceived) {
                    reject(new Error('System status data not received within 10 seconds'));
                }
            }, 10000);

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    
                    if (message.type === 'monitoring_metrics' && message.data) {
                        console.log('📨 Received monitoring_metrics message');
                        
                        // system_status 데이터 확인
                        if (message.data.system_status) {
                            clearTimeout(timeout);
                            dataReceived = true;
                            this.testResults.systemStatusReceived = true;
                            this.testResults.systemStatusData = message.data.system_status;
                            
                            console.log('✅ System status data received successfully');
                            this.analyzeSystemStatus(message.data.system_status);
                            resolve();
                        }
                    }
                } catch (error) {
                    console.error('❌ Error parsing message:', error.message);
                }
            });
        });
    }

    analyzeSystemStatus(systemStatus) {
        console.log('\n🔍 System Status Analysis:');
        console.log('='.repeat(50));
        
        // 전체 상태
        console.log(`📊 Overall Status: ${systemStatus.overall_status}`);
        console.log(`🖥️  Server Status: ${systemStatus.server_status}`);
        console.log(`🔗 API Status: ${systemStatus.api_status}`);
        console.log(`🌐 WebSocket Status: ${systemStatus.websocket_status}`);
        console.log(`🔄 Initialization Status: ${systemStatus.initialization_status}`);
        console.log(`📱 Device Ready: ${systemStatus.device_ready}`);
        
        // 활성 컴포넌트
        if (systemStatus.components && systemStatus.components.length > 0) {
            console.log(`⚙️  Active Components: ${systemStatus.components.join(', ')}`);
        }
        
        // 에러 정보
        if (systemStatus.last_error) {
            console.log(`❌ Last Error: ${systemStatus.last_error}`);
        }
        
        // 가동 시간
        if (systemStatus.uptime) {
            console.log(`⏱️  Uptime: ${systemStatus.uptime} seconds`);
        }
        
        // 컴포넌트 상세 정보
        if (systemStatus.component_details) {
            console.log('\n📋 Component Details:');
            Object.entries(systemStatus.component_details).forEach(([component, status]) => {
                console.log(`  ${component}: ${status}`);
            });
        }
        
        console.log('='.repeat(50));
    }

    printResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('='.repeat(50));
        
        console.log(`📡 WebSocket Connection: ${this.testResults.connection ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`📊 System Status Data: ${this.testResults.systemStatusReceived ? '✅ PASS' : '❌ FAIL'}`);
        
        if (this.testResults.systemStatusData) {
            const status = this.testResults.systemStatusData.overall_status;
            const statusIcon = this.getStatusIcon(status);
            console.log(`🎯 System Overall Status: ${statusIcon} ${status.toUpperCase()}`);
            
            // 상태별 권장사항
            this.printRecommendations(status);
        }
        
        console.log('='.repeat(50));
    }

    getStatusIcon(status) {
        switch(status) {
            case 'ready': return '🟢';
            case 'partially_ready': return '🟡';
            case 'initializing': return '🔄';
            case 'error': return '🔴';
            default: return '⚪';
        }
    }

    printRecommendations(status) {
        console.log('\n💡 Recommendations:');
        
        switch(status) {
            case 'ready':
                console.log('  ✅ System is fully operational');
                console.log('  ✅ All components are working normally');
                console.log('  ✅ Ready for device connection and data streaming');
                break;
                
            case 'partially_ready':
                console.log('  🟡 System is mostly operational');
                console.log('  🟡 Some components may not be fully ready');
                console.log('  💡 Check device connection status');
                break;
                
            case 'initializing':
                console.log('  🔄 System is still starting up');
                console.log('  ⏳ Wait for initialization to complete');
                console.log('  💡 This usually takes a few seconds');
                break;
                
            case 'error':
                console.log('  🔴 System has encountered errors');
                console.log('  🔧 Check server logs for detailed error information');
                console.log('  💡 Consider restarting the server');
                break;
                
            default:
                console.log('  ⚪ System status is unknown');
                console.log('  🔍 Check system connectivity');
                break;
        }
    }
}

// 테스트 실행
async function main() {
    const tester = new SystemStatusTester();
    await tester.testSystemStatusMonitoring();
}

main().catch(console.error); 