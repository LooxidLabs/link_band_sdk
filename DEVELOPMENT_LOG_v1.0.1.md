# Link Band SDK v1.0.1 개발일지
*2025년 1월 26일*

## 🎯 **버전 개요**
Link Band SDK v1.0.1은 안정성과 사용자 경험을 크게 개선한 메이저 업데이트입니다. 핵심 버그 수정, 시스템 안정성 향상, 그리고 전문적인 애플리케이션 데이터 관리 시스템을 도입했습니다.

---

## 🔧 **주요 버그 수정**

### 1. **Session Folder 열기 문제 해결**
**문제**: Data Center의 Session List에서 "Open" 버튼이 Finder 창을 열지 못함
**원인**: IPC 핸들러가 절대 경로를 상대 경로로 잘못 처리
**해결**: `path.isAbsolute()` 체크 로직 추가하여 경로 유형별 적절한 처리

```typescript
// Before: 모든 경로를 상대 경로로 처리
const fullPath = path.join(process.cwd(), folderPath);

// After: 절대/상대 경로 구분 처리
const fullPath = path.isAbsolute(folderPath) 
  ? folderPath 
  : path.join(process.cwd(), folderPath);
```

### 2. **Documents 모듈 로딩 오류 수정**
**문제**: "File not found: ko/quick-start/overview.md" 오류 발생
**원인**: electron-builder.json의 상충되는 설정
- `files` 섹션에서 docs 제외: `"!public/docs/**/*"`
- `extraResources`에서 docs 복사 시도

**해결**: 
- 제외 규칙 제거
- 프로덕션 모드에서 올바른 경로 사용 (`process.resourcesPath/docs`)

### 3. **Content Security Policy 및 폰트 문제**
**문제**: 외부 Pretendard 폰트 로딩이 CSP에 의해 차단됨
**해결**: 외부 폰트 의존성 제거, 시스템 폰트로 전환

```css
/* Before: 외부 폰트 */
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

/* After: 시스템 폰트 */
fontFamily: {
  sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
}
```

---

## 🚀 **Export Path 시스템 완전 개편**

### **기존 문제점**
- 하드코딩된 경로: `~/link-band-sdk/data`
- 수동 폴더 생성 필요
- 플랫폼별 표준 미준수

### **새로운 시스템**
OS별 표준 애플리케이션 데이터 디렉토리 사용:
- **Windows**: `%APPDATA%/LinkBand/Exports`
- **macOS**: `~/Library/Application Support/LinkBand/Exports`
- **Linux**: `~/.config/LinkBand/Exports`

### **구현 세부사항**

#### **1. 백엔드 기능 (main.ts)**
```typescript
// 기본 export 경로 생성
function getDefaultExportPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'Exports');
}

// 폴더 자동 생성 및 권한 확인
async function ensureDefaultExportDirectory(): Promise<boolean> {
  try {
    const exportPath = getDefaultExportPath();
    await fsExtra.ensureDir(exportPath);
    await fsExtra.access(exportPath, fsExtra.constants.W_OK);
    return true;
  } catch (error) {
    console.error('Failed to create/access export directory:', error);
    return false;
  }
}
```

#### **2. IPC 통합**
```typescript
// preload.ts
getDefaultExportPath: () => ipcRenderer.invoke('get-default-export-path')

// 타입 정의
interface ElectronAPI {
  getDefaultExportPath: () => Promise<string>;
}
```

#### **3. 스토어 통합**
```typescript
// dataCenter.ts
getDefaultExportPath: async (): Promise<string> => {
  try {
    return await (window as any).electron?.getDefaultExportPath?.() || '~/link-band-sdk/data';
  } catch (error) {
    console.error('Failed to get default export path:', error);
    return '~/link-band-sdk/data';
  }
}
```

#### **4. UI 컴포넌트 업데이트**
```typescript
// RecordingOptions.tsx - 동적 기본 경로 로딩
useEffect(() => {
  const initializeDefaultPath = async () => {
    if (options.exportPath === '~/link-band-sdk/data' || !options.exportPath) {
      try {
        const defaultPath = await getDefaultExportPath();
        onOptionsChange({ ...options, exportPath: defaultPath });
        onPathValidation(defaultPath);
      } catch (error) {
        console.error('Failed to get default export path:', error);
      }
    }
  };
  initializeDefaultPath();
}, []);
```

---

## ⚡ **디바이스 연결 및 데이터 스트리밍 개선**

### **문제 분석**
첫 번째 디바이스 연결시 데이터 수신 실패, 재연결시 정상 동작

### **원인 파악**
1. **타이밍 이슈**: 디바이스 연결 → 자동 스트리밍 시작 → WebSocket 연결 (지연)
2. **조건부 자동 연결**: `deviceStatus?.is_connected && connectionInfo?.is_streaming === true`
3. **상태 동기화 지연**: 각각 다른 API 폴링으로 상태 정보 수집

### **해결방안 구현**

#### **1. 프론트엔드 WebSocket 연결 로직 개선**
```typescript
// 기존: 엄격한 조건 확인
if (deviceStore.deviceStatus?.is_connected && 
    engineStore.connectionInfo?.is_streaming === true) {
  this.connect();
}

// 개선: 디바이스 연결시 즉시 WebSocket 연결
if (deviceStore.deviceStatus?.is_connected) {
  console.log('Auto-connecting to WebSocket (device connected)...');
  this.connect();
}
```

#### **2. 이벤트 기반 WebSocket 연결**
```typescript
// deviceManager.tsx - 디바이스 연결 이벤트 수신시 즉시 WebSocket 연결
case 'device_connected':
  if (message.data) {
    methods.connect(message.data.address);
    
    // 즉시 WebSocket 연결 시도
    try {
      const engineStore = (window as any).engineStore?.getState?.();
      if (engineStore) {
        engineStore.autoConnectWebSocket();
      }
    } catch (error) {
      console.error('Failed to trigger WebSocket auto-connect:', error);
    }
  }
  break;
```

#### **3. 백엔드 스트리밍 시작 타이밍 조정**
```python
# server.py - 디바이스 연결 후 WebSocket 클라이언트 연결 대기
await self.broadcast_event(EventType.DEVICE_CONNECTED, safe_device_info)
logger.info(f"Device connected: {safe_device_info}")

# WebSocket 클라이언트 연결 시간 확보를 위한 지연
logger.info("Waiting 2 seconds for WebSocket clients to connect...")
await asyncio.sleep(2)

# 자동 스트리밍 시작
await self.start_streaming()
```

#### **4. 데이터 수집 안정화**
```python
# 데이터 수집 시작 후 안정화 대기
if not await self.device_manager.start_data_acquisition():
    # 실패시 재시도 로직
    logger.warning("First attempt failed, retrying data acquisition...")
    await asyncio.sleep(1)
    if not await self.device_manager.start_data_acquisition():
        msg = "Cannot start streaming: Failed to start data acquisition after retry."
        logger.warning(msg)
        return

# 데이터 수집 안정화 대기
logger.info("Waiting for data acquisition to stabilize...")
await asyncio.sleep(1)
```

---

## 🎨 **UI/UX 개선사항**

### **1. Recording Options 기본 상태 변경**
```typescript
// 기존: 접힌 상태로 시작
const [isExpanded, setIsExpanded] = useState(false);

// 개선: 펼쳐진 상태로 시작
const [isExpanded, setIsExpanded] = useState(true);
```

### **2. 서버 상태 폴링 최적화**
```typescript
// StatusBar.tsx - 폴링 주기 조정
const interval = setInterval(() => {
  refreshStatus();
}, 5000); // 2초 → 5초로 변경
```

### **3. 중복 상태 확인 제거**
```typescript
// EngineModule.tsx - 마운트시 중복 상태 확인 제거
useEffect(() => {
  setupPythonServerEventListeners();
  startPolling();
  startMetricsPolling();
  
  // 기존: 여러 번의 강제 상태 새로고침 제거
  // refreshServerStatus();
  // setTimeout(refreshServerStatus, 500);
  // setTimeout(refreshServerStatus, 1500);
  
  return () => {
    stopPolling();
    stopMetricsPolling();
  };
}, []);
```

---

## 🛠 **기술적 개선사항**

### **1. 서버 시작 안정성 강화**
```typescript
// main.ts - 앱 시작시 서버 자동 시작에 지연 추가
setTimeout(() => {
  startPythonServer().then(result => {
    console.log('Python server startup result:', result);
  }).catch(error => {
    console.error('Failed to start Python server on startup:', error);
  });
}, 2000); // 2초 지연으로 앱 완전 초기화 대기
```

### **2. 중복 서버 시작 방지**
```typescript
// 서버 시작 중복 시도 방지 로직
if (serverStatus.status === 'starting') {
  console.log('Python server is already starting, rejecting duplicate request');
  resolve({ 
    success: false, 
    message: 'Python server is already starting', 
    status: serverStatus 
  });
  return;
}
```

### **3. 상태 관리 개선**
```typescript
// pythonServerStore.ts - 시작 중 상태에서 중복 요청 방지
startServer: async () => {
  const currentState = get();
  if (currentState.status.status === 'starting') {
    console.log('Server is already starting, ignoring duplicate request');
    return;
  }
  
  // 시작 로직 실행
  // ...
}
```

---

## 📊 **성능 개선 결과**

### **시작 시간 개선**
- **기존**: 서버 시작/중단 반복으로 불안정
- **개선**: 안정적인 단일 시작 프로세스

### **메모리 사용량 최적화**
- 불필요한 상태 폴링 감소
- 중복 이벤트 리스너 제거
- 효율적인 WebSocket 연결 관리

### **사용자 경험 향상**
- 첫 번째 디바이스 연결시 즉시 데이터 수신
- 직관적인 Recording Options 표시
- 자동 export 폴더 생성으로 설정 간소화

---

## 🔮 **향후 계획**

### **단기 목표 (v1.0.2)**
- [ ] 다국어 지원 확장
- [ ] 데이터 내보내기 형식 추가 옵션
- [ ] 실시간 데이터 품질 모니터링 강화

### **중기 목표 (v1.1.x)**
- [ ] 클라우드 동기화 기능
- [ ] 고급 신호 처리 알고리즘
- [ ] 사용자 정의 대시보드

### **장기 목표 (v2.0.x)**
- [ ] 머신러닝 기반 자동 분석
- [ ] 실시간 협업 기능
- [ ] 모바일 앱 연동

---

## 🏆 **팀 기여도**

### **개발 담당**
- **Brian Chae**: 전체 아키텍처 설계 및 핵심 기능 구현
- **AI Assistant**: 코드 리뷰, 버그 분석, 최적화 제안

### **테스트 및 QA**
- 디바이스 연결 시나리오 테스트
- 크로스 플랫폼 호환성 검증
- 성능 벤치마킹

### **문서화**
- API 문서 업데이트
- 사용자 가이드 개선
- 개발자 문서 작성

---

## 📝 **릴리즈 노트**

**Link Band SDK v1.0.1**이 정식 출시되었습니다. 이번 버전은 안정성과 사용자 경험을 크게 개선한 메이저 업데이트입니다.

**주요 개선사항:**
✅ 디바이스 연결 및 데이터 수신 안정성 대폭 향상  
✅ OS 표준 애플리케이션 데이터 디렉토리 지원  
✅ 자동 export 폴더 생성으로 설정 간소화  
✅ 서버 시작/중단 사이클링 문제 완전 해결  
✅ Session 폴더 열기 및 Documents 모듈 오류 수정  

**호환성:**
- macOS 10.15+ (Intel/Apple Silicon)
- Windows 10+ (x64)
- Linux Ubuntu 18.04+ (x64)

**다운로드:**
- [GitHub Releases](https://github.com/looxidlabs/link-band-sdk/releases/tag/v1.0.1)
- [공식 웹사이트](https://linkband.looxidlabs.com)

---

*이 개발일지는 Link Band SDK v1.0.1의 모든 개발 과정과 기술적 세부사항을 담고 있습니다. 추가 문의사항이나 피드백은 개발팀으로 연락해 주세요.* 