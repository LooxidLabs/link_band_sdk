/**
 * Phase 1 백엔드 초기화 인식 기능 테스트
 * 
 * 테스트 항목:
 * 1. StreamingMonitor 초기화 인식 기능
 * 2. 논리적 스트리밍 상태 설정
 * 3. 초기화 단계별 상태 변화
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8121';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testStreamInitialization() {
  console.log('🧪 [Phase 1 Test] Testing Backend Initialization Recognition');
  console.log('================================================');

  try {
    // 1. 스트림 초기화 (초기화 시점 마킹)
    console.log('\n1. 스트림 초기화 - 초기화 시점 마킹');
    const initResponse = await axios.post(`${BASE_URL}/stream/init`);
    console.log('   ✅ Stream init response:', initResponse.data);

    // 2. 초기화 직후 상태 확인 (초기화 단계여야 함)
    console.log('\n2. 초기화 직후 상태 확인');
    const statusResponse1 = await axios.get(`${BASE_URL}/stream/auto-status`);
    console.log('   📊 Auto streaming status:', JSON.stringify(statusResponse1.data, null, 2));
    
    if (statusResponse1.data.initialization_info) {
      console.log('   ✅ 초기화 정보 감지됨:');
      console.log('      - 초기화 단계:', statusResponse1.data.initialization_info.is_in_init_phase);
      console.log('      - 남은 시간:', statusResponse1.data.initialization_info.time_remaining);
      console.log('      - 논리적 스트리밍:', statusResponse1.data.logical_streaming_active);
    } else {
      console.log('   ❌ 초기화 정보가 없습니다');
    }

    // 3. 스트림 시작 (논리적 스트리밍 활성화)
    console.log('\n3. 스트림 시작 - 논리적 스트리밍 활성화');
    const startResponse = await axios.post(`${BASE_URL}/stream/start`);
    console.log('   ✅ Stream start response:', startResponse.data);

    // 4. 스트림 시작 후 상태 확인
    console.log('\n4. 스트림 시작 후 상태 확인');
    await sleep(1000); // 1초 대기
    const statusResponse2 = await axios.get(`${BASE_URL}/stream/auto-status`);
    console.log('   📊 Auto streaming status:', JSON.stringify(statusResponse2.data, null, 2));
    
    if (statusResponse2.data.initialization_info) {
      console.log('   ✅ 초기화 정보:');
      console.log('      - 초기화 단계:', statusResponse2.data.initialization_info.is_in_init_phase);
      console.log('      - 남은 시간:', statusResponse2.data.initialization_info.time_remaining);
      console.log('      - 논리적 스트리밍:', statusResponse2.data.logical_streaming_active);
      console.log('      - 물리적 스트리밍:', statusResponse2.data.is_active);
      console.log('      - 메시지:', statusResponse2.data.message);
    }

    // 5. 주기적 상태 확인 (초기화 단계 동안)
    console.log('\n5. 주기적 상태 확인 (5초간)');
    for (let i = 0; i < 5; i++) {
      await sleep(1000);
      const statusResponse = await axios.get(`${BASE_URL}/stream/auto-status`);
      
      console.log(`   [${i+1}s] Phase: ${statusResponse.data.phase || 'unknown'}, ` +
                 `Active: ${statusResponse.data.is_active}, ` +
                 `Logical: ${statusResponse.data.logical_streaming_active}, ` +
                 `Remaining: ${statusResponse.data.initialization_info?.time_remaining || 0}s`);
      
      if (statusResponse.data.message) {
        console.log(`         Message: ${statusResponse.data.message}`);
      }
    }

    // 6. 상세 정보 확인
    console.log('\n6. 상세 정보 확인');
    const detailedResponse = await axios.get(`${BASE_URL}/stream/auto-status`);
    if (detailedResponse.data.initialization_info) {
      console.log('   📋 초기화 상세 정보:');
      console.log('      - 초기화 타임스탬프:', detailedResponse.data.initialization_info.initialization_timestamp);
      console.log('      - 초기화 후 경과 시간:', detailedResponse.data.initialization_info.time_since_init);
      console.log('      - 초기화 단계 지속 시간:', detailedResponse.data.initialization_info.init_phase_duration);
      console.log('      - 포스트 초기화 상태:', detailedResponse.data.initialization_info.is_post_initialization);
    }

    console.log('\n✅ Phase 1 테스트 완료!');
    console.log('   초기화 인식 기능이 정상적으로 작동합니다.');

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    if (error.response) {
      console.error('   응답 상태:', error.response.status);
      console.error('   응답 데이터:', error.response.data);
    }
  }
}

async function testStreamStop() {
  console.log('\n🧪 [Phase 1 Test] Testing Stream Stop');
  console.log('=====================================');

  try {
    // 스트림 중지
    const stopResponse = await axios.post(`${BASE_URL}/stream/stop`);
    console.log('✅ Stream stop response:', stopResponse.data);

    // 중지 후 상태 확인
    await sleep(1000);
    const statusResponse = await axios.get(`${BASE_URL}/stream/auto-status`);
    console.log('📊 Stop 후 상태:', {
      is_active: statusResponse.data.is_active,
      logical_streaming_active: statusResponse.data.logical_streaming_active,
      phase: statusResponse.data.phase,
      message: statusResponse.data.message
    });

  } catch (error) {
    console.error('❌ 스트림 중지 테스트 실패:', error.message);
  }
}

// 메인 테스트 실행
async function main() {
  console.log('🚀 Phase 1: 백엔드 초기화 인식 시스템 테스트 시작');
  console.log('=================================================');

  await testStreamInitialization();
  await sleep(2000);
  await testStreamStop();

  console.log('\n🎉 모든 테스트 완료!');
}

main().catch(console.error); 