const WebSocket = require('ws');

console.log('=== 구독 및 모니터링 데이터 디버깅 테스트 ===');

const ws = new WebSocket('ws://127.0.0.1:18765');

let messageCount = 0;
let subscriptionsSent = 0;
let subscriptionsConfirmed = 0;

ws.on('open', function open() {
    console.log('✅ WebSocket 연결 성공');
    
    // 모니터링 채널들 구독
    const channels = [
        'monitoring_metrics',
        'health_updates',
        'buffer_status',
        'system_alerts'
    ];
    
    console.log('\n📡 구독 메시지 전송 중...');
    
    channels.forEach((channel, index) => {
        setTimeout(() => {
            const subscribeMessage = {
                type: 'subscribe',
                channel: channel
            };
            
            console.log(`📤 [${index + 1}/${channels.length}] 구독 요청: ${channel}`);
            console.log(`   메시지: ${JSON.stringify(subscribeMessage)}`);
            
            ws.send(JSON.stringify(subscribeMessage));
            subscriptionsSent++;
            
            console.log(`   ✅ 전송 완료 (총 ${subscriptionsSent}개 전송)`);
        }, index * 500); // 500ms 간격으로 전송
    });
    
    console.log('\n⏱️  구독 확인 및 데이터 수신 대기 중...');
});

ws.on('message', function message(data) {
    try {
        const parsed = JSON.parse(data.toString());
        messageCount++;
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`\n📨 [${timestamp}] 메시지 ${messageCount} 수신:`);
        console.log(`   타입: ${parsed.type}`);
        
        if (parsed.type === 'subscription_confirmed') {
            subscriptionsConfirmed++;
            console.log(`   ✅ 구독 확인: ${parsed.channel}`);
            console.log(`   📊 확인된 구독: ${subscriptionsConfirmed}/${subscriptionsSent}`);
            
            if (subscriptionsConfirmed === subscriptionsSent) {
                console.log('\n🎉 모든 구독이 확인되었습니다!');
                console.log('📊 이제 모니터링 데이터를 기다립니다...');
            }
        } else if (parsed.type === 'monitoring_metrics') {
            console.log('   📊 모니터링 메트릭 수신!');
            if (parsed.data) {
                console.log(`   CPU: ${parsed.data.system_metrics?.cpu_usage}%`);
                console.log(`   메모리: ${parsed.data.system_metrics?.memory_usage}%`);
                console.log(`   건강 점수: ${parsed.data.health_score}`);
            }
        } else if (parsed.type === 'health_updates') {
            console.log('   💚 건강 업데이트 수신!');
            if (parsed.data) {
                console.log(`   전체 건강도: ${parsed.data.overall_health}`);
            }
        } else if (parsed.type === 'buffer_status') {
            console.log('   📦 버퍼 상태 수신!');
            if (parsed.data) {
                console.log(`   EEG 버퍼: ${parsed.data.EEG?.usage_percentage}%`);
            }
        } else if (parsed.type === 'system_alerts') {
            console.log('   🚨 시스템 알림 수신!');
            if (parsed.data) {
                console.log(`   레벨: ${parsed.data.level}`);
                console.log(`   메시지: ${parsed.data.message}`);
            }
        } else {
            console.log(`   📄 기타 메시지: ${JSON.stringify(parsed).substring(0, 100)}...`);
        }
        
    } catch (e) {
        console.log(`❌ JSON 파싱 오류: ${e.message}`);
        console.log(`   Raw 데이터: ${data.toString().substring(0, 100)}...`);
    }
});

ws.on('error', function error(err) {
    console.log('❌ WebSocket 오류:', err.message);
});

ws.on('close', function close() {
    console.log('\n🔌 WebSocket 연결 종료');
    console.log(`\n📊 최종 통계:`);
    console.log(`   전송된 구독: ${subscriptionsSent}개`);
    console.log(`   확인된 구독: ${subscriptionsConfirmed}개`);
    console.log(`   총 수신 메시지: ${messageCount}개`);
    
    // 프로세스 종료
    process.exit(0);
});

// 30초 후 종료
setTimeout(() => {
    console.log('\n⏰ 30초 완료, 연결 종료');
    ws.close();
}, 30000);

// 5초마다 상태 출력
setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
        console.log(`\n📈 [상태] 구독: ${subscriptionsConfirmed}/${subscriptionsSent}, 메시지: ${messageCount}개`);
    }
}, 5000); 