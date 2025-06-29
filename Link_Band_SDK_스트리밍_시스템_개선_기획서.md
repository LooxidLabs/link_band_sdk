# Link Band SDK 스트리밍 시스템 개선 기획서

## 📋 개요

### 현재 문제점
- **논리적 비일관성**: Engine 시작 + Device 연결 + 패킷 전송 중임에도 별도로 스트리밍을 수동 시작해야 함
- **사용자 경험 저하**: 디바이스 연결 → 스트리밍 시작 → 녹화 시작의 복잡한 단계
- **녹화 실패**: 스트리밍 상태가 수동 제어되어 실제 데이터 흐름과 불일치
- **시스템 복잡도**: 불필요한 상태 관리 및 동기화 문제

### 개선 목표
- **자동 스트리밍 감지**: 실제 데이터 흐름 기반 상태 관리
- **사용자 경험 단순화**: 디바이스 연결 → 즉시 녹화 가능
- **논리적 일관성**: 스트리밍 상태 = 실제 데이터 전송 상태
- **시스템 안정성**: 상태 불일치 문제 근본 해결

---

## 🎯 핵심 개념 변경

### Before (현재)
```
스트리밍 상태 = 사용자 제어 변수 (수동 start/stop)
데이터 흐름 ≠ 스트리밍 상태 (불일치 가능)
```

### After (개선 후)
```
스트리밍 상태 = 실제 데이터 흐름 자동 감지 (읽기 전용)
데이터 흐름 = 스트리밍 상태 (항상 일치)
```

---

## 🏗️ 기술 아키텍처

### 1. 백엔드 구조 개선

#### A. StreamingMonitor 클래스 신규 생성
```python
class StreamingMonitor:
    def __init__(self):
        self.data_flow_tracker = {}
        self.sampling_rate_calculator = {}
        self.streaming_threshold = {
            'eeg': 200,  # samples/sec
            'ppg': 40,   # samples/sec  
            'acc': 25,   # samples/sec
        }
        
    def track_data_flow(self, sensor_type: str, data_count: int):
        """실시간 데이터 흐름 추적"""
        
    def calculate_streaming_status(self) -> bool:
        """실제 데이터 흐름 기반 스트리밍 상태 계산"""
        
    def get_detailed_status(self) -> dict:
        """상세 스트리밍 정보 반환"""
```

#### B. WebSocketServer 수정
```python
class WebSocketServer:
    def __init__(self):
        self.streaming_monitor = StreamingMonitor()
        
    async def send_sensor_data(self, sensor_type, data):
        # 기존 전송 로직
        await self.broadcast(data)
        
        # 신규: 데이터 흐름 추적
        self.streaming_monitor.track_data_flow(sensor_type, len(data))
        
    def get_streaming_status(self) -> dict:
        """실제 스트리밍 상태 반환 (자동 계산)"""
        return self.streaming_monitor.calculate_streaming_status()
```

#### C. API Router 재설계
```python
# 기존 API (Deprecated)
POST /stream/start    # → 제거 예정
POST /stream/stop     # → 제거 예정

# 신규/수정 API
GET /stream/status    # → 자동 계산된 실제 상태 반환
GET /stream/info      # → 상세 스트리밍 정보
GET /stream/health    # → 스트리밍 건강 상태
```

### 2. 프론트엔드 구조 개선

#### A. TopNavigation 컴포넌트 단순화
```typescript
// Before: 수동 제어 버튼
<Button onClick={startStreaming}>Start Streaming</Button>
<Button onClick={stopStreaming}>Stop Streaming</Button>

// After: 상태 표시만
<StreamingStatusIndicator 
  status={streamingStatus}
  isActive={isStreamingActive}
/>
```

#### B. DataCenter 녹화 로직 단순화
```typescript
// Before: 복잡한 조건
const canRecord = isEngineStarted && isDeviceConnected && isStreamingStarted;

// After: 단순한 조건
const canRecord = isEngineStarted && isDeviceConnected && isStreamingActive;
```

#### C. SystemStore 상태 관리 개선
```typescript
interface StreamingState {
  isActive: boolean;           // 자동 계산됨 (읽기 전용)
  samplingRates: {
    eeg: number;
    ppg: number; 
    acc: number;
  };
  dataFlowHealth: 'good' | 'poor' | 'none';
  lastDataReceived: Date;
}
```

---

## 📅 구현 로드맵

### Phase 1: 백엔드 자동 감지 시스템 (우선순위: 높음)
**기간**: 2-3일
**목표**: 실제 데이터 흐름 기반 스트리밍 상태 자동 계산

#### 구현 내용
1. **StreamingMonitor 클래스 생성**
   - 실시간 데이터 흐름 추적
   - Sampling rate 계산
   - Threshold 기반 상태 판정

2. **WebSocketServer 통합**
   - 데이터 전송 시마다 모니터링
   - 실시간 상태 업데이트
   - 성능 최적화

3. **API 응답 수정**
   - `/stream/status` → 자동 계산 결과 반환
   - 실시간 상태 정보 제공

#### 성공 기준
- [ ] 실제 데이터 흐름과 스트리밍 상태 100% 일치
- [ ] 1초 이내 상태 변경 감지
- [ ] API 응답 시간 < 50ms

### Phase 2: 프론트엔드 UX 개선 (우선순위: 중간)
**기간**: 2-3일  
**목표**: 사용자 인터페이스 단순화 및 자동화

#### 구현 내용
1. **TopNavigation 수정**
   - 스트리밍 제어 버튼 제거
   - 상태 표시 아이콘으로 변경
   - 실시간 상태 업데이트

2. **DataCenter 로직 단순화**
   - 녹화 버튼 활성화 조건 단순화
   - 자동 스트리밍 상태 체크
   - 에러 메시지 개선

3. **상태 관리 개선**
   - 읽기 전용 스트리밍 상태
   - 자동 폴링 최적화
   - 상태 동기화 보장

#### 성공 기준
- [ ] 사용자 클릭 단계 50% 감소
- [ ] 녹화 실패율 90% 감소
- [ ] 직관적인 상태 표시

### Phase 3: 시스템 통합 및 최적화 (우선순위: 낮음)
**기간**: 1-2일
**목표**: 전체 시스템 안정성 및 성능 최적화

#### 구현 내용
1. **레거시 API 정리**
   - 기존 `/stream/start`, `/stream/stop` deprecated
   - 하위 호환성 유지 (임시)
   - 문서 업데이트

2. **성능 최적화**
   - 불필요한 상태 폴링 제거
   - WebSocket 메시지 최적화
   - 메모리 사용량 최적화

3. **에러 처리 강화**
   - 네트워크 연결 실패 대응
   - 디바이스 연결 끊김 처리
   - 복구 메커니즘 구현

#### 성공 기준
- [ ] 시스템 안정성 99% 이상
- [ ] 메모리 사용량 20% 감소
- [ ] 에러 복구 시간 < 3초

---

## 🔄 마이그레이션 전략

### 단계별 마이그레이션
1. **백엔드 우선 구현** → 기존 프론트엔드와 호환
2. **프론트엔드 점진적 수정** → 기존 기능 유지하면서 개선
3. **레거시 코드 정리** → 안정화 후 불필요한 코드 제거

### 하위 호환성 보장
- 기존 API 일정 기간 유지
- 점진적 deprecation 경고
- 명확한 마이그레이션 가이드 제공

---

## 📊 예상 효과

### 사용자 경험 개선
- **단계 간소화**: 3단계 → 1단계 (디바이스 연결만)
- **직관성 향상**: 논리적으로 일관된 동작
- **실패율 감소**: 상태 불일치로 인한 녹화 실패 제거

### 시스템 안정성
- **상태 일관성**: 실제 상태와 표시 상태 100% 일치
- **자동 복구**: 연결 문제 시 자동 상태 갱신
- **성능 향상**: 불필요한 수동 제어 로직 제거

### 개발 효율성
- **코드 복잡도 감소**: 상태 동기화 로직 단순화
- **유지보수성 향상**: 명확한 책임 분리
- **버그 감소**: 수동 제어로 인한 edge case 제거

---

## 🚨 주의사항 및 리스크

### 기술적 리스크
- **성능 영향**: 실시간 모니터링으로 인한 CPU 사용량 증가 가능
- **타이밍 이슈**: 데이터 흐름 감지 지연 가능성
- **호환성**: 기존 사용자 워크플로우 변경

### 완화 방안
- **성능 모니터링**: 실시간 성능 측정 및 최적화
- **점진적 배포**: 단계별 릴리스로 리스크 최소화  
- **사용자 교육**: 변경사항에 대한 명확한 안내

---

## 📈 성공 지표

### 정량적 지표
- 녹화 성공률: 95% → 99%
- 사용자 클릭 수: 평균 5회 → 2회
- 시스템 응답 시간: < 100ms
- 상태 불일치 발생률: 0%

### 정성적 지표
- 사용자 만족도 향상
- 논리적 일관성 확보
- 시스템 신뢰성 증대
- 개발팀 생산성 향상

---

## 🎯 결론

이번 스트리밍 시스템 개선을 통해 Link Band SDK는 다음과 같은 혁신적 변화를 달성할 수 있습니다:

1. **Zero-Click Streaming**: 디바이스 연결 시 자동 스트리밍
2. **Intelligent State Management**: 실제 데이터 흐름 기반 상태 관리
3. **Bulletproof Recording**: 상태 불일치로 인한 녹화 실패 완전 제거
4. **Intuitive UX**: 논리적으로 일관된 사용자 경험

이 개선을 통해 Link Band SDK는 진정한 "Plug & Play" 뇌파 측정 솔루션으로 발전할 수 있을 것입니다.

---

**작성일**: 2025-06-30  
**작성자**: AI Assistant  
**문서 버전**: 1.0  
**상태**: 기획 완료, 구현 대기 