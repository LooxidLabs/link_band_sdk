# Python Server Control 개발 기획서

## 1. 개요

### 1.1 목적
Link Band SDK의 Electron 애플리케이션에서 Python FastAPI 서버(uvicorn)를 동적으로 제어할 수 있는 기능을 구현합니다.

### 1.2 배경
- 현재 Python 서버는 Electron 앱 시작 시 자동으로 실행됨
- 서버 문제 발생 시 전체 앱을 재시작해야 하는 불편함
- 개발 및 디버깅 시 서버만 독립적으로 제어할 필요성

### 1.3 범위
- Python 서버 시작/종료/재시작 기능
- 서버 상태 모니터링
- UI를 통한 서버 제어 인터페이스
- 에러 처리 및 로깅

## 2. 기술 스펙

### 2.1 아키텍처
```
┌─────────────────┐    IPC Events    ┌─────────────────┐
│   Renderer      │ ←──────────────→ │   Main Process  │
│   (React UI)    │                  │   (Electron)    │
└─────────────────┘                  └─────────────────┘
                                              │
                                              │ Child Process
                                              ▼
                                     ┌─────────────────┐
                                     │  Python Server  │
                                     │   (uvicorn)     │
                                     └─────────────────┘
```

### 2.2 현재 구현 상태
#### 기존 구현된 기능:
- ✅ `startPythonServer()` - 서버 시작
- ✅ `stopPythonServer()` - 서버 강제 종료
- ✅ `stopPythonServerGracefully()` - 서버 정상 종료
- ✅ IPC 이벤트: `stop-python-server`
- ✅ 서버 로그 전송: `python-log`, `python-server-ready`, `python-server-stopped`

#### 추가 구현 필요:
- ❌ IPC 이벤트: `start-python-server`, `restart-python-server`
- ❌ 서버 상태 확인: `get-python-server-status`
- ❌ Preload API 확장
- ❌ TypeScript 타입 정의
- ❌ UI 컴포넌트

### 2.3 IPC 이벤트 정의

#### 2.3.1 Main Process → Renderer
```typescript
// 서버 상태 변경 알림
'python-server-status': {
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  pid?: number;
  port?: number;
  uptime?: number;
}

// 서버 로그
'python-log': string

// 서버 준비 완료
'python-server-ready': void

// 서버 중지됨
'python-server-stopped': { code: number; signal?: string }
```

#### 2.3.2 Renderer → Main Process
```typescript
// 서버 시작
'start-python-server': void → Promise<{ success: boolean; message: string }>

// 서버 중지
'stop-python-server': void → Promise<{ success: boolean; message: string }>

// 서버 재시작
'restart-python-server': void → Promise<{ success: boolean; message: string }>

// 서버 상태 조회
'get-python-server-status': void → Promise<ServerStatus>
```

### 2.4 데이터 타입

```typescript
interface ServerStatus {
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  pid?: number;
  port: number;
  uptime?: number;
  lastError?: string;
  logs: string[];
}

interface ServerControlResponse {
  success: boolean;
  message: string;
  status?: ServerStatus;
}
```

## 3. 구현 계획

### 3.1 Phase 1: 백엔드 IPC 핸들러 구현
- [x] 기존 코드 분석 및 정리
- [x] `start-python-server` IPC 핸들러 구현
- [x] `restart-python-server` IPC 핸들러 구현
- [x] `get-python-server-status` IPC 핸들러 구현
- [x] 서버 상태 추적 시스템 구현

### 3.2 Phase 2: 프론트엔드 API 구현
- [x] preload.ts에 서버 제어 API 추가
- [x] TypeScript 타입 정의 추가
- [x] 서버 상태 관리 Zustand 스토어 구현

### 3.3 Phase 3: UI 컴포넌트 구현
- [x] 서버 상태 표시 컴포넌트
- [x] 서버 제어 버튼 (시작/중지/재시작)
- [x] 서버 로그 뷰어 구현
- [x] Engine Module에 서버 제어 패널 추가

### 3.4 Phase 4: 테스트 및 최적화
- [ ] 에러 시나리오 테스트
- [ ] 성능 최적화
- [ ] 로깅 개선
- [ ] 문서화

## 4. 상세 구현

### 4.1 Main Process 확장 (main.ts)

```typescript
// 서버 상태 추적
let serverStatus: ServerStatus = {
  status: 'stopped',
  port: 8121,
  logs: []
};

// IPC 핸들러들
ipcMain.handle('start-python-server', async (): Promise<ServerControlResponse> => {
  // 구현 내용
});

ipcMain.handle('restart-python-server', async (): Promise<ServerControlResponse> => {
  // 구현 내용  
});

ipcMain.handle('get-python-server-status', async (): Promise<ServerStatus> => {
  // 구현 내용
});
```

### 4.2 Preload API 확장 (preload.ts)

```typescript
pythonServer: {
  start: () => ipcRenderer.invoke('start-python-server'),
  stop: () => ipcRenderer.invoke('stop-python-server'), 
  restart: () => ipcRenderer.invoke('restart-python-server'),
  getStatus: () => ipcRenderer.invoke('get-python-server-status'),
  onStatusChange: (callback: (status: ServerStatus) => void) => 
    ipcRenderer.on('python-server-status', (_, status) => callback(status)),
  onLog: (callback: (log: string) => void) =>
    ipcRenderer.on('python-log', (_, log) => callback(log))
}
```

### 4.3 React 스토어 (pythonServerStore.ts)

```typescript
interface PythonServerStore {
  status: ServerStatus;
  logs: string[];
  actions: {
    startServer: () => Promise<void>;
    stopServer: () => Promise<void>;
    restartServer: () => Promise<void>;
    refreshStatus: () => Promise<void>;
  };
}
```

## 5. 사용자 시나리오

### 5.1 정상 시나리오
1. 사용자가 Settings 메뉴 진입
2. Python Server Control 패널에서 현재 상태 확인
3. "Restart Server" 버튼 클릭
4. 서버가 정상적으로 재시작되고 상태 업데이트

### 5.2 에러 시나리오
1. 서버 시작 실패 시 에러 메시지 표시
2. 포트 충돌 시 자동 포트 변경 또는 에러 안내
3. 서버 응답 없음 시 강제 종료 옵션 제공

## 6. 보안 고려사항

### 6.1 프로세스 관리
- 좀비 프로세스 방지
- 메모리 누수 방지
- 적절한 타임아웃 설정

### 6.2 에러 처리
- 예외 상황에 대한 안전한 처리
- 사용자에게 적절한 피드백 제공
- 로그 기록 및 디버깅 정보 제공

## 7. 향후 확장 계획

### 7.1 고급 기능
- 서버 설정 변경 (포트, 호스트 등)
- 다중 서버 인스턴스 관리
- 서버 성능 모니터링
- 자동 재시작 기능

### 7.2 개발자 도구
- 서버 로그 실시간 스트리밍
- API 테스트 도구 통합
- 개발 모드 전용 기능

## 8. 일정

- **Week 1**: Phase 1 완료 (백엔드 IPC 핸들러)
- **Week 2**: Phase 2 완료 (프론트엔드 API)  
- **Week 3**: Phase 3 완료 (UI 컴포넌트)
- **Week 4**: Phase 4 완료 (테스트 및 최적화)

## 9. 리스크 및 대응방안

### 9.1 기술적 리스크
- **리스크**: 서버 프로세스 관리 복잡성
- **대응**: 기존 구현된 코드 활용 및 점진적 개선

- **리스크**: 플랫폼별 차이 (Windows, macOS, Linux)
- **대응**: 각 플랫폼별 테스트 및 조건부 처리

### 9.2 사용자 경험 리스크
- **리스크**: 서버 재시작 시 데이터 손실
- **대응**: 사용자 확인 다이얼로그 및 안전한 종료 절차

## 10. 성공 지표

- [ ] 서버 제어 기능 100% 동작
- [ ] 에러 시나리오 처리 완료
- [ ] UI/UX 사용성 테스트 통과
- [ ] 성능 영향 최소화 (< 100ms 응답시간)
- [ ] 크로스 플랫폼 호환성 확인

---

## 11. 구현 완료 사항

### 11.1 백엔드 구현 (main.ts)
- ✅ 서버 상태 추적 인터페이스 정의
- ✅ `startPythonServer()` 함수를 Promise 기반으로 개선
- ✅ `stopPythonServerGracefully()` 함수를 Promise 기반으로 개선
- ✅ `restartPythonServer()` 함수 신규 구현
- ✅ `getPythonServerStatus()` 함수 구현
- ✅ IPC 핸들러 4개 추가 (`start-python-server`, `stop-python-server`, `restart-python-server`, `get-python-server-status`)
- ✅ 서버 로그 및 상태 실시간 브로드캐스트

### 11.2 프론트엔드 API 구현 (preload.ts)
- ✅ `pythonServer` API 객체 추가
- ✅ 모든 서버 제어 메서드 구현
- ✅ 이벤트 리스너 설정 메서드 구현

### 11.3 타입 정의 (electron.d.ts)
- ✅ `ServerStatus` 인터페이스 정의
- ✅ `ServerControlResponse` 인터페이스 정의
- ✅ Window 전역 타입에 `pythonServer` API 추가

### 11.4 상태 관리 (pythonServerStore.ts)
- ✅ Zustand 기반 Python 서버 상태 스토어 구현
- ✅ 서버 제어 액션 구현 (시작/중지/재시작)
- ✅ 실시간 이벤트 리스너 설정
- ✅ 로그 관리 및 상태 동기화

### 11.5 UI 컴포넌트 (EngineModule.tsx)
- ✅ MUI에서 shadcn/ui로 완전 마이그레이션
- ✅ Python 서버 제어 카드 추가
- ✅ 서버 상태 표시 (상태, 포트, PID, 업타임)
- ✅ 서버 제어 버튼 (시작/중지/재시작)
- ✅ 실시간 서버 로그 뷰어 구현
- ✅ 로그 클리어 기능
- ✅ 에러 상태 표시
- ✅ 로딩 상태 표시

### 11.6 주요 기능
1. **서버 제어**: 시작, 중지, 재시작 기능
2. **상태 모니터링**: 실시간 서버 상태 추적
3. **로그 관리**: 서버 로그 실시간 표시 및 관리
4. **에러 처리**: 서버 에러 상태 표시 및 복구
5. **UI/UX**: 직관적인 서버 제어 인터페이스

---

**작성일**: 2024-01-27  
**작성자**: Development Team  
**버전**: 2.0  
**상태**: Implemented 