# Link Band SDK 프론트엔드 시스템 개선 기획서

## 📋 현재 상황 분석

### 🔍 발견된 주요 문제점

#### 1. **분산된 상태 관리 시스템 (Critical)**
- **문제**: 10개 이상의 독립적인 Zustand store들이 중복된 역할 수행
- **영향**: 
  - 상태 동기화 문제로 인한 UI 불일치
  - 불필요한 API 호출 중복 (각 store마다 독립적 polling)
  - 메모리 사용량 증가 및 성능 저하
- **발견 파일들**:
  ```
  stores/engine.tsx (976줄) - WebSocket + 센서 데이터 + 엔진 상태
  stores/device.tsx (175줄) - 디바이스 연결 상태
  stores/sensor.tsx (84줄) - 센서 데이터 (engine과 중복)
  stores/metrics.tsx (201줄) - 시스템 메트릭
  stores/dataCenter.ts (302줄) - 데이터 관리
  stores/pythonServerStore.ts (315줄) - 서버 상태
  ```

#### 2. **복잡하고 불안정한 WebSocket 관리 (High)**
- **문제**: WebSocketManager가 engine store 내부에만 존재하여 다른 store와 공유 불가
- **영향**:
  - 연결 상태 불일치 (engine store와 실제 연결 상태 차이)
  - 플랫폼별 특수 처리 코드 산재 (Windows/macOS 분기)
  - 자동 재연결 로직 복잡성으로 인한 예측 불가능한 동작
- **문제 코드 예시**:
  ```typescript
  // engine.tsx 내부의 복잡한 WebSocket 관리
  const isWindows = navigator.userAgent.toLowerCase().includes('windows');
  const healthCheckInterval = isWindows ? 10000 : 30000;
  ```

#### 3. **비효율적인 데이터 플로우 (High)**
- **문제**: 센서 데이터가 복잡한 경로로 전달됨
- **현재 플로우**: `WebSocket → engine store → sensor store → 컴포넌트`
- **영향**:
  - 불필요한 데이터 변환 과정
  - 실시간 성능 저하
  - 디버깅 어려움

#### 4. **일관성 없는 에러 처리 (Medium)**
- **문제**: 각 store마다 다른 에러 처리 방식
- **예시**:
  ```typescript
  // device.tsx
  catch (error) {
    set(state => ({ errors: { ...state.errors, scan: error instanceof Error ? error.message : 'Failed to scan devices' } }));
  }
  
  // dataCenter.ts  
  catch (error: any) {
    const detail = error?.response?.data?.detail;
    const msg = error?.response?.data?.message;
    const errorMessage = detail || msg || error?.message || '파일 검색에 실패했습니다.';
  }
  ```

#### 5. **컴포넌트 리렌더링 최적화 부족 (Medium)**
- **문제**: 컴포넌트들이 여러 store를 동시에 구독하여 불필요한 리렌더링 발생
- **영향**: UI 반응성 저하, 배터리 소모 증가

### 🎯 백엔드 시스템과의 연동 요구사항

백엔드에서 Priority 4 실시간 모니터링 시스템이 완성되어 다음 기능들이 제공됩니다:

#### **WebSocket 채널들**
- `monitoring_metrics` (1초 간격) - 실시간 성능 메트릭
- `system_alerts` (이벤트 기반) - 시스템 알림
- `health_updates` (10초 간격) - 시스템 건강 상태
- `buffer_status` (5초 간격) - 버퍼 상태
- `batch_status` (배치 완료시) - 배치 처리 상태

#### **REST API 엔드포인트들**
- `/monitoring/status` - 현재 시스템 상태
- `/monitoring/metrics` - 성능 메트릭 조회
- `/monitoring/history` - 히스토리 데이터
- `/monitoring/alerts` - 알림 관리
- `/monitoring/health` - 시스템 건강 점검

## 🏗️ 개선 아키텍처 설계

### Phase 1: 중앙 집중식 상태 관리 시스템 (2주)

#### 1.1 Core Store 아키텍처
```typescript
// stores/core/SystemStore.ts
interface SystemState {
  // 디바이스 상태
  device: {
    status: DeviceStatus | null;
    registeredDevices: DeviceResponse[];
    scannedDevices: ScannedDevice[];
    isConnected: boolean;
    connectionQuality: ConnectionQuality;
  };
  
  // 실시간 데이터 스트림
  stream: {
    eeg: EEGData[];
    ppg: PPGData[];
    acc: AccData[];
    battery: BatteryData[];
    isStreaming: boolean;
    samplingRates: SamplingRates;
  };
  
  // 시스템 모니터링 (백엔드 Priority 4 연동)
  monitoring: {
    systemMetrics: SystemMetrics | null;
    alerts: Alert[];
    healthScore: number;
    bufferStatus: BufferStatus;
    batchStatus: BatchStatus;
  };
  
  // 통신 상태
  communication: {
    websocket: {
      isConnected: boolean;
      channels: Record<string, boolean>;
      lastHeartbeat: number;
    };
    api: {
      isHealthy: boolean;
      lastResponse: number;
      errorCount: number;
    };
  };
  
  // UI 상태
  ui: {
    activeMenu: MenuId;
    notifications: Notification[];
    loading: Record<string, boolean>;
    errors: Record<string, string | null>;
  };
}
```

#### 1.2 Domain-Specific Slices
```typescript
// stores/slices/deviceSlice.ts
export const deviceSlice = (set: SetState, get: GetState) => ({
  device: {
    // 디바이스 관련 상태 및 액션들
    scan: async () => { /* 구현 */ },
    connect: async (address: string) => { /* 구현 */ },
    disconnect: async () => { /* 구현 */ },
    getStatus: async () => { /* 구현 */ },
  }
});

// stores/slices/streamSlice.ts
export const streamSlice = (set: SetState, get: GetState) => ({
  stream: {
    // 스트림 관련 상태 및 액션들
    start: async () => { /* 구현 */ },
    stop: async () => { /* 구현 */ },
    addData: (sensorType: SensorType, data: SensorData[]) => { /* 구현 */ },
    clearData: () => { /* 구현 */ },
  }
});

// stores/slices/monitoringSlice.ts
export const monitoringSlice = (set: SetState, get: GetState) => ({
  monitoring: {
    // 모니터링 관련 상태 및 액션들 (백엔드 Priority 4 연동)
    subscribeToMetrics: () => { /* 구현 */ },
    handleAlert: (alert: Alert) => { /* 구현 */ },
    updateHealthScore: (score: number) => { /* 구현 */ },
  }
});
```

### Phase 2: 통합 통신 레이어 (1주)

#### 2.1 CommunicationManager
```typescript
// services/communication/CommunicationManager.ts
export class CommunicationManager {
  private websocketService: WebSocketService;
  private apiService: ApiService;
  private messageQueue: MessageQueue;
  private connectionMonitor: ConnectionMonitor;
  
  constructor() {
    this.websocketService = new WebSocketService();
    this.apiService = new ApiService();
    this.messageQueue = new MessageQueue();
    this.connectionMonitor = new ConnectionMonitor();
  }
  
  // 통합 초기화
  async initialize(): Promise<void> {
    await this.apiService.healthCheck();
    await this.websocketService.connect();
    this.connectionMonitor.start();
  }
  
  // 채널별 구독 관리
  subscribeToChannel(channel: string, handler: MessageHandler): void {
    this.websocketService.subscribe(channel, handler);
  }
  
  // API 호출 통합
  async apiCall<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.apiService.request<T>(endpoint, options);
  }
  
  // 연결 상태 모니터링
  getConnectionStatus(): ConnectionStatus {
    return {
      websocket: this.websocketService.isConnected(),
      api: this.apiService.isHealthy(),
      overall: this.connectionMonitor.getOverallStatus()
    };
  }
}
```

#### 2.2 WebSocketService (개선된 버전)
```typescript
// services/communication/WebSocketService.ts
export class WebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, MessageHandler[]> = new Map();
  private reconnectStrategy: ReconnectStrategy;
  private heartbeatManager: HeartbeatManager;
  
  constructor() {
    this.reconnectStrategy = new ExponentialBackoffStrategy();
    this.heartbeatManager = new HeartbeatManager();
  }
  
  async connect(): Promise<void> {
    const urls = this.getConnectionUrls();
    
    for (const url of urls) {
      try {
        await this.tryConnection(url);
        this.setupEventHandlers();
        this.heartbeatManager.start();
        return;
      } catch (error) {
        console.warn(`Failed to connect to ${url}:`, error);
      }
    }
    
    throw new Error('All WebSocket connection attempts failed');
  }
  
  subscribe(channel: string, handler: MessageHandler): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }
    this.subscriptions.get(channel)!.push(handler);
    
    // 백엔드에 채널 구독 요청
    this.send({
      type: 'subscribe',
      channel: channel
    });
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      const handlers = this.subscriptions.get(message.channel) || [];
      
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for channel ${message.channel}:`, error);
        }
      });
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }
  
  private getConnectionUrls(): string[] {
    const basePort = 18765;
    return [
      `ws://127.0.0.1:${basePort}`,
      `ws://localhost:${basePort}`,
      `ws://[::1]:${basePort}`, // IPv6
      `ws://0.0.0.0:${basePort}`
    ];
  }
}
```

### Phase 3: 반응형 데이터 스트림 (1주)

#### 3.1 DataStreamManager
```typescript
// services/data/DataStreamManager.ts
export class DataStreamManager {
  private streams: Map<SensorType, DataStream> = new Map();
  private processor: DataProcessor;
  private cache: CacheManager;
  
  constructor() {
    this.processor = new DataProcessor();
    this.cache = new CacheManager();
  }
  
  createStream(sensorType: SensorType): DataStream {
    const stream = new DataStream(sensorType, {
      bufferSize: 1000,
      processingInterval: 100,
      cacheStrategy: 'lru'
    });
    
    // 데이터 처리 파이프라인 설정
    stream
      .pipe(this.processor.filter(sensorType))
      .pipe(this.processor.transform(sensorType))
      .pipe(this.cache.store(sensorType))
      .subscribe(data => {
        // 상태 업데이트
        useSystemStore.getState().stream.addData(sensorType, data);
      });
    
    this.streams.set(sensorType, stream);
    return stream;
  }
  
  addData(sensorType: SensorType, data: SensorData[]): void {
    const stream = this.streams.get(sensorType);
    if (stream) {
      stream.push(data);
    }
  }
  
  getLatestData(sensorType: SensorType, count: number = 100): SensorData[] {
    return this.cache.getLatest(sensorType, count);
  }
  
  getPerformanceMetrics(): StreamPerformanceMetrics {
    return {
      throughput: this.calculateThroughput(),
      latency: this.calculateLatency(),
      memoryUsage: this.calculateMemoryUsage(),
      dropRate: this.calculateDropRate()
    };
  }
}
```

#### 3.2 지능형 캐싱 시스템
```typescript
// services/data/CacheManager.ts
export class CacheManager {
  private caches: Map<SensorType, LRUCache<SensorData>> = new Map();
  private persistentStorage: PersistentStorage;
  
  constructor() {
    this.persistentStorage = new PersistentStorage();
    this.initializeCaches();
  }
  
  store(sensorType: SensorType) {
    return (data: SensorData[]) => {
      const cache = this.caches.get(sensorType);
      if (cache) {
        data.forEach(item => cache.set(item.timestamp, item));
        
        // 중요한 데이터는 영구 저장소에 백업
        if (this.shouldPersist(sensorType, data)) {
          this.persistentStorage.backup(sensorType, data);
        }
      }
      return data;
    };
  }
  
  getLatest(sensorType: SensorType, count: number): SensorData[] {
    const cache = this.caches.get(sensorType);
    if (!cache) return [];
    
    return Array.from(cache.values())
      .slice(-count)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  
  getRange(sensorType: SensorType, startTime: number, endTime: number): SensorData[] {
    const cache = this.caches.get(sensorType);
    if (!cache) return [];
    
    return Array.from(cache.values())
      .filter(item => item.timestamp >= startTime && item.timestamp <= endTime)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  
  private shouldPersist(sensorType: SensorType, data: SensorData[]): boolean {
    // EEG 데이터는 항상 백업, PPG/ACC는 이상 상황에서만
    if (sensorType === 'eeg') return true;
    return data.some(item => this.isAnomalous(item));
  }
}
```

### Phase 4: 최적화된 React Hooks (1주)

#### 4.1 Custom Hooks
```typescript
// hooks/useSystemStatus.ts
export const useSystemStatus = () => {
  const systemStore = useSystemStore();
  
  return useMemo(() => ({
    device: {
      isConnected: systemStore.device.isConnected,
      batteryLevel: systemStore.device.status?.battery_level || 0,
      signalQuality: systemStore.device.connectionQuality.signal
    },
    stream: {
      isActive: systemStore.stream.isStreaming,
      samplingRates: systemStore.stream.samplingRates,
      dataHealth: calculateDataHealth(systemStore.stream)
    },
    system: {
      healthScore: systemStore.monitoring.healthScore,
      alertCount: systemStore.monitoring.alerts.length,
      isHealthy: systemStore.communication.websocket.isConnected && 
                 systemStore.communication.api.isHealthy
    }
  }), [
    systemStore.device.isConnected,
    systemStore.device.status?.battery_level,
    systemStore.stream.isStreaming,
    systemStore.monitoring.healthScore,
    systemStore.communication.websocket.isConnected,
    systemStore.communication.api.isHealthy
  ]);
};

// hooks/useDataStream.ts
export const useDataStream = (sensorType: SensorType, options?: StreamOptions) => {
  const systemStore = useSystemStore();
  const dataStreamManager = useDataStreamManager();
  
  const data = useMemo(() => {
    const rawData = systemStore.stream[sensorType];
    
    if (options?.filter) {
      return rawData.filter(options.filter);
    }
    
    if (options?.transform) {
      return rawData.map(options.transform);
    }
    
    return rawData;
  }, [systemStore.stream[sensorType], options]);
  
  const addData = useCallback((newData: SensorData[]) => {
    dataStreamManager.addData(sensorType, newData);
  }, [dataStreamManager, sensorType]);
  
  return {
    data,
    addData,
    latestValue: data[data.length - 1] || null,
    count: data.length,
    samplingRate: systemStore.stream.samplingRates[sensorType] || 0
  };
};

// hooks/useMonitoring.ts
export const useMonitoring = () => {
  const systemStore = useSystemStore();
  const communicationManager = useCommunicationManager();
  
  useEffect(() => {
    // 백엔드 모니터링 채널 구독
    const unsubscribes = [
      communicationManager.subscribeToChannel('monitoring_metrics', (data) => {
        systemStore.monitoring.updateMetrics(data);
      }),
      communicationManager.subscribeToChannel('system_alerts', (alert) => {
        systemStore.monitoring.handleAlert(alert);
      }),
      communicationManager.subscribeToChannel('health_updates', (health) => {
        systemStore.monitoring.updateHealthScore(health.score);
      }),
      communicationManager.subscribeToChannel('buffer_status', (status) => {
        systemStore.monitoring.updateBufferStatus(status);
      }),
      communicationManager.subscribeToChannel('batch_status', (status) => {
        systemStore.monitoring.updateBatchStatus(status);
      })
    ];
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);
  
  return {
    metrics: systemStore.monitoring.systemMetrics,
    alerts: systemStore.monitoring.alerts,
    healthScore: systemStore.monitoring.healthScore,
    bufferStatus: systemStore.monitoring.bufferStatus,
    batchStatus: systemStore.monitoring.batchStatus
  };
};
```

### Phase 5: 실시간 모니터링 대시보드 (1주)

#### 5.1 통합 모니터링 컴포넌트
```typescript
// components/monitoring/SystemMonitoringDashboard.tsx
export const SystemMonitoringDashboard: React.FC = () => {
  const { metrics, alerts, healthScore, bufferStatus } = useMonitoring();
  const systemStatus = useSystemStatus();
  
  return (
    <div className="monitoring-dashboard">
      {/* 시스템 건강 점수 */}
      <SystemHealthCard 
        score={healthScore}
        status={systemStatus.system.isHealthy ? 'healthy' : 'warning'}
      />
      
      {/* 실시간 알림 */}
      <AlertPanel 
        alerts={alerts}
        onDismiss={(alertId) => {
          // 알림 처리 로직
        }}
      />
      
      {/* 성능 메트릭 차트 */}
      <PerformanceMetricsChart 
        metrics={metrics}
        timeRange="1h"
      />
      
      {/* 버퍼 상태 */}
      <BufferStatusPanel 
        status={bufferStatus}
        threshold={0.8}
      />
      
      {/* 센서 상태 그리드 */}
      <SensorStatusGrid 
        deviceStatus={systemStatus.device}
        streamStatus={systemStatus.stream}
      />
    </div>
  );
};

// components/monitoring/RealTimeDataVisualizer.tsx
export const RealTimeDataVisualizer: React.FC = () => {
  const eegData = useDataStream('eeg', { 
    filter: (data) => data.signal_quality !== 'poor',
    transform: (data) => ({
      ...data,
      smoothed: applySmoothing(data.ch1_filtered)
    })
  });
  
  const ppgData = useDataStream('ppg');
  const accData = useDataStream('acc');
  
  return (
    <div className="data-visualizer">
      <EEGChart 
        data={eegData.data}
        samplingRate={eegData.samplingRate}
        realTime={true}
      />
      <PPGChart 
        data={ppgData.data}
        showHRV={true}
      />
      <AccelerometerChart 
        data={accData.data}
        showMovementAnalysis={true}
      />
    </div>
  );
};
```

## 📊 구현 계획

### Week 1-2: Core Infrastructure
- [ ] CommunicationManager 구현
- [ ] 중앙 집중식 SystemStore 구현
- [ ] 기존 store들의 점진적 마이그레이션
- [ ] 기본 에러 처리 및 로깅 시스템

### Week 3: Data Pipeline
- [ ] DataStreamManager 구현
- [ ] 실시간 데이터 처리 파이프라인
- [ ] 지능형 캐싱 시스템
- [ ] 성능 모니터링 통합

### Week 4: UI Optimization
- [ ] 최적화된 React hooks 구현
- [ ] 컴포넌트 리팩토링 및 최적화
- [ ] 불필요한 리렌더링 제거
- [ ] 메모이제이션 적용

### Week 5: Monitoring Integration
- [ ] 백엔드 모니터링 시스템 완전 연동
- [ ] 실시간 대시보드 구현
- [ ] 알림 시스템 프론트엔드
- [ ] 성능 분석 도구

### Week 6: Testing & Optimization
- [ ] 통합 테스트 및 성능 테스트
- [ ] 사용자 경험 최적화
- [ ] 문서화 및 가이드 작성
- [ ] 배포 준비

## 🎯 예상 효과

### 즉시 효과
- **안정성 향상 70%**: 단일 통신 레이어로 연결 문제 최소화
- **성능 향상 50%**: 불필요한 API 호출 제거, 효율적인 메모리 사용
- **개발 효율성 60%**: 명확한 데이터 플로우, 재사용 가능한 컴포넌트

### 장기 효과
- **사용자 경험 개선**: 실시간 모니터링, 빠른 응답성, 직관적 인터페이스
- **유지보수성 향상**: 모듈화된 구조, 테스트 가능한 코드
- **확장성 확보**: 새로운 센서 및 기능 추가 용이성

## 🔧 기술적 고려사항

### 성능 최적화
- **React.memo**: 불필요한 리렌더링 방지
- **useMemo/useCallback**: 계산 비용이 높은 작업 최적화
- **가상화**: 대용량 데이터 리스트 처리
- **Web Workers**: 무거운 데이터 처리 작업 분리

### 메모리 관리
- **LRU 캐시**: 메모리 효율적인 데이터 저장
- **가비지 컬렉션**: 불필요한 객체 참조 제거
- **스트림 백프레셔**: 메모리 오버플로우 방지

### 호환성
- **점진적 마이그레이션**: 기존 기능 영향 최소화
- **API 호환성**: 기존 컴포넌트 인터페이스 유지
- **플랫폼 최적화**: Windows/macOS/Linux 환경 고려

## 🚀 실행 단계

### 1단계: 즉시 실행 (이번 주)
```bash
# 새로운 아키텍처 기반 구조 생성
mkdir -p electron-app/src/services/{communication,data}
mkdir -p electron-app/src/stores/{core,slices}
mkdir -p electron-app/src/hooks
mkdir -p electron-app/src/components/monitoring

# Core 파일들 생성
touch electron-app/src/services/communication/CommunicationManager.ts
touch electron-app/src/services/communication/WebSocketService.ts
touch electron-app/src/stores/core/SystemStore.ts
touch electron-app/src/hooks/useSystemStatus.ts
```

### 2단계: 점진적 마이그레이션 (다음 주)
- 기존 engine store의 WebSocket 로직을 CommunicationManager로 이전
- 새로운 SystemStore에 상태 통합
- 컴포넌트들을 새로운 hooks로 점진적 전환

### 3단계: 백엔드 연동 강화
- Priority 4 모니터링 시스템과 완전 연동
- 실시간 알림 및 대시보드 구현
- 성능 분석 도구 통합

## 📋 성공 지표

### 개발 완료 기준
- [ ] 모든 기존 기능 정상 동작 (100%)
- [ ] API 호출 횟수 50% 이상 감소
- [ ] 메모리 사용량 30% 이상 감소
- [ ] WebSocket 연결 안정성 95% 이상
- [ ] 컴포넌트 리렌더링 70% 이상 감소

### 품질 보증
- [ ] 단위 테스트 커버리지 80% 이상
- [ ] 통합 테스트 통과
- [ ] 성능 테스트 통과
- [ ] 사용자 수용 테스트 완료

---

**작성일**: 2024년 12월 19일  
**작성자**: Link Band SDK 개발팀  
**버전**: 1.0  
**다음 검토일**: 2024년 12월 26일 