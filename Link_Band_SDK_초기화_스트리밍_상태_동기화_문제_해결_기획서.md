# Link Band SDK 초기화 스트리밍 상태 동기화 문제 해결 기획서

## 📋 문제 정의

### 기존 문제
1. **앱 초기화 후 Initialize 버튼 클릭 시 WebSocket 연결은 되지만 Data Center에서 "streaming inactive" 표시**
2. **새로고침(Cmd+R) 후에야 정상 작동하는 타이밍 동기화 문제**
3. **디바이스 미연결 상태에서 스트리밍 초기화 후 디바이스 연결 시 상태 불일치**

### 근본 원인 분석
1. **타이밍 미스매치**: 논리적 스트리밍 상태(백엔드 "started")와 물리적 데이터 흐름 감지(StreamingMonitor) 간의 시간차
2. **초기 비활성 상태 캐싱**: 실제 데이터 흐름 시작 전에 비활성 상태가 캐시되어 지속
3. **폴링 주기 부적절**: 초기화 단계에서 5초 폴링으로는 빠른 상태 변화 감지 불가
4. **디바이스 연결 상태 변화 미감지**: 디바이스 연결 후 스트리밍 상태 재초기화 누락

## 🎯 해결 방안

### 3단계 접근법

#### **Phase 1: 백엔드 초기화 인식 시스템**
- **StreamingMonitor 클래스 개선**:
  - `mark_system_initialized()`: 시스템 초기화 시점 기록
  - `set_logical_streaming_status()`: 논리적 스트리밍 상태 설정
  - 초기화 단계 감지 및 단계별 상태 계산 로직
  - 초기화 단계에서 캐시 지속시간 단축 (0.5s → 0.2s)
  - 완화된 조건으로 스트리밍 상태 판정

- **Stream API 엔드포인트 개선**:
  - `/stream/init`, `/stream/start`, `/stream/stop`에서 StreamingMonitor 메서드 호출
  - `/stream/auto-status`에 초기화 메타데이터 포함

#### **Phase 2: 프론트엔드 적응형 폴링 시스템**
- **AdaptivePollingManager 클래스 생성**:
  - 초기화 단계(1초) vs 정상 단계(5초) 폴링 간격 자동 조정
  - 초기화 단계 지속시간 추적 (30초 기본)
  - 다중 폴링 작업 관리 및 고유 키 기반 제어
  - 전역 싱글톤 인스턴스 `globalPollingManager` 제공

- **SystemStore 통합**:
  - `initialize()` 메서드에서 `globalPollingManager.markInitializationStart()` 호출
  - DataCenter 컴포넌트에서 적응형 폴링 사용

#### **Phase 3: UI/UX 개선**
- **StreamingStatusIndicator 컴포넌트 생성**:
  - "System Initializing", "Waiting for Data Flow", "Data Flow Active" 등 상태별 표시
  - 초기화 진행률 바 및 남은 시간 표시
  - 활성 센서 정보 및 적절한 색상/아이콘 사용

- **DataCenter 컴포넌트 개선**:
  - 기존 경고 메시지를 새로운 StreamingStatusIndicator로 교체
  - 실시간 상태 피드백 제공

#### **Phase 4: 디바이스 연결 상태 변화 대응** ⭐ **NEW**
- **백엔드 디바이스 연결 이벤트 처리**:
  - `server.py`의 `_run_connect_and_notify()` 메서드에서 디바이스 연결 성공 시 StreamingMonitor 재초기화
  - `streaming_monitor.mark_system_initialized()` 호출로 초기화 시점 재설정

- **프론트엔드 디바이스 연결 감지**:
  - SystemStore의 `device_connected` 이벤트 처리에서 AdaptivePollingManager 재시작
  - `globalPollingManager.markInitializationStart()` 호출로 적응형 폴링 재시작

## 🔧 구현 내용

### 백엔드 구현

#### 1. StreamingMonitor 클래스 (python_core/app/core/streaming_monitor.py)
```python
class StreamingMonitor:
    def __init__(self):
        # 기존 코드...
        self.initialization_timestamp: Optional[float] = None
        self.initialization_phase_duration = 30.0  # 30초
        self.is_post_initialization = False
        self.logical_streaming_active = False
    
    def mark_system_initialized(self):
        """시스템 초기화 시점 기록 (디바이스 연결 시에도 호출)"""
        with self.lock:
            self.initialization_timestamp = time.time()
            self.is_post_initialization = True
    
    def calculate_streaming_status(self) -> Dict[str, Any]:
        """초기화 단계를 고려한 스트리밍 상태 계산"""
        # 초기화 단계에서 캐시 지속시간 단축 및 완화된 조건 적용
```

#### 2. 서버 디바이스 연결 이벤트 처리 (python_core/app/core/server.py)
```python
async def _run_connect_and_notify(self, device_address: str):
    # 기존 연결 로직...
    
    if device_info:
        # 디바이스 연결 시 StreamingMonitor 재초기화
        from app.core.streaming_monitor import streaming_monitor
        streaming_monitor.mark_system_initialized()
        logger.info("StreamingMonitor reinitialized due to device connection")
        
        await self.broadcast_event(EventType.DEVICE_CONNECTED, safe_device_info)
```

### 프론트엔드 구현

#### 1. AdaptivePollingManager (electron-app/src/services/AdaptivePollingManager.ts)
```typescript
class AdaptivePollingManager {
  private initializationStartTime: number | null = null;
  private initializationDuration = 30000; // 30초
  private normalInterval = 5000; // 5초
  private initializationInterval = 1000; // 1초
  
  markInitializationStart(): void {
    this.initializationStartTime = Date.now();
    console.log('[AdaptivePollingManager] Initialization phase started');
  }
  
  getCurrentInterval(): number {
    return this.isInInitializationPhase() ? 
      this.initializationInterval : this.normalInterval;
  }
}

export const globalPollingManager = new AdaptivePollingManager();
```

#### 2. SystemStore 디바이스 연결 이벤트 처리
```typescript
case 'device_connected':
  // 기존 디바이스 정보 업데이트...
  
  // 디바이스 연결 시 AdaptivePollingManager 재시작
  console.log('[SystemStore] Device connected - restarting AdaptivePollingManager...');
  import('../../services/AdaptivePollingManager').then(({ globalPollingManager }) => {
    globalPollingManager.markInitializationStart();
  });
  break;
```

#### 3. StreamingStatusIndicator 컴포넌트
```typescript
const StreamingStatusIndicator: React.FC<Props> = ({ status }) => {
  const getStatusInfo = () => {
    if (status.initialization_info?.phase === 'initializing') {
      return {
        icon: <Clock className="h-4 w-4" />,
        text: 'System Initializing',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      };
    }
    // 기타 상태별 정보...
  };
```

## 🔄 동작 플로우

### 정상 초기화 플로우
1. **사용자가 Initialize 버튼 클릭**
2. **SystemStore.initialize() 호출** → `globalPollingManager.markInitializationStart()`
3. **백엔드 `/stream/init` 호출** → `streaming_monitor.mark_system_initialized()`
4. **AdaptivePollingManager가 1초 간격으로 폴링 시작**
5. **StreamingMonitor가 초기화 단계 인식하여 완화된 조건 적용**
6. **실제 데이터 흐름 시작되면 즉시 활성 상태로 전환**
7. **30초 후 정상 5초 폴링으로 복귀**

### 디바이스 연결 후 재초기화 플로우 ⭐ **NEW**
1. **디바이스 미연결 상태에서 스트리밍 초기화 시도** → "device not detected" 오류
2. **사용자가 디바이스 연결**
3. **백엔드에서 `device_connected` 이벤트 발생**
4. **서버에서 `streaming_monitor.mark_system_initialized()` 호출**
5. **프론트엔드에서 `globalPollingManager.markInitializationStart()` 호출**
6. **적응형 폴링 재시작으로 빠른 상태 동기화**
7. **디바이스 연결 + 데이터 흐름 감지 시 즉시 활성 상태 전환**

## 📊 예상 효과

### 사용자 경험 개선
- ✅ **새로고침 불필요**: 초기화 후 즉시 정상 작동
- ✅ **명확한 상태 표시**: 실시간 초기화 진행 상황 확인
- ✅ **디바이스 연결 순서 무관**: 언제 연결해도 자동 재초기화
- ✅ **직관적인 피드백**: 각 단계별 적절한 메시지 표시

### 기술적 안정성
- ✅ **타이밍 동기화 해결**: 논리적/물리적 상태 일치
- ✅ **적응형 폴링**: 상황별 최적화된 업데이트 주기
- ✅ **상태 일관성**: 디바이스 연결 상태 변화에 능동적 대응
- ✅ **캐시 최적화**: 초기화 단계별 차별화된 캐시 전략

## 🧪 테스트 계획

### 시나리오 테스트
1. **정상 초기화 플로우**: 디바이스 연결 → 초기화 → 즉시 활성화 확인
2. **디바이스 후연결 플로우**: 초기화 → 디바이스 연결 → 자동 재초기화 확인
3. **다중 연결/해제**: 반복적인 연결 상태 변화에 대한 안정성 확인
4. **타이밍 테스트**: 각 단계별 적절한 폴링 간격 적용 확인

### 성능 테스트
- 초기화 단계에서 1초 폴링의 시스템 부하 측정
- 30초 초기화 창 후 정상 폴링 복귀 확인
- 메모리 사용량 및 CPU 사용률 모니터링

## 🚀 배포 전략

### 단계별 배포
1. **Phase 1**: 백엔드 StreamingMonitor 개선 배포
2. **Phase 2**: 프론트엔드 AdaptivePollingManager 배포
3. **Phase 3**: UI 컴포넌트 개선 배포
4. **Phase 4**: 디바이스 연결 재초기화 기능 배포

### 롤백 계획
- 각 Phase별 독립적 롤백 가능
- 기존 5초 고정 폴링으로 긴급 복귀 옵션 보유
- StreamingMonitor 기존 로직 보존으로 안전성 확보

---

**📅 업데이트 로그**
- 2024-12-19: 초기 기획서 작성 (Phase 1-3)
- 2024-12-19: Phase 4 디바이스 연결 재초기화 기능 추가 