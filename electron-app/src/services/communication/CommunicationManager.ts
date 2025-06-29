import { WebSocketService } from './WebSocketService';
import { ApiService } from './ApiService';
import { MessageQueue } from './MessageQueue';
import { ConnectionMonitor } from './ConnectionMonitor';

export interface MessageHandler {
  (message: any): void;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ConnectionStatus {
  websocket: boolean;
  api: boolean;
  overall: 'healthy' | 'degraded' | 'offline';
  lastCheck: number;
}

export interface CommunicationConfig {
  websocketUrl?: string;
  apiBaseUrl?: string;
  retryAttempts?: number;
  heartbeatInterval?: number;
  reconnectDelay?: number;
}

export class CommunicationManager {
  private static instance: CommunicationManager | null = null;
  private static initializationPromise: Promise<void> | null = null;
  
  private websocketService: WebSocketService;
  private apiService: ApiService;
  private messageQueue: MessageQueue;
  private connectionMonitor: ConnectionMonitor;
  private config: Required<CommunicationConfig>;
  private isInitialized = false;
  private isShuttingDown = false;
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private referenceCount = 0;

  private constructor(config: CommunicationConfig = {}) {
    this.config = {
      websocketUrl: config.websocketUrl || 'ws://127.0.0.1:18765',
      apiBaseUrl: config.apiBaseUrl || 'http://127.0.0.1:8121',
      retryAttempts: config.retryAttempts || 3,
      heartbeatInterval: config.heartbeatInterval || 60000, // 60초로 증가
      reconnectDelay: config.reconnectDelay || 2000
    };

    this.websocketService = new WebSocketService(this.config);
    this.apiService = new ApiService(this.config);
    this.messageQueue = new MessageQueue();
    this.connectionMonitor = new ConnectionMonitor();

    this.setupEventHandlers();
  }

  public static getInstance(config?: CommunicationConfig): CommunicationManager {
    if (!CommunicationManager.instance) {
      CommunicationManager.instance = new CommunicationManager(config);
    }
    CommunicationManager.instance.referenceCount++;
    return CommunicationManager.instance;
  }

  public static releaseInstance(): void {
    if (CommunicationManager.instance) {
      CommunicationManager.instance.referenceCount--;
      
      // 모든 참조가 해제되었을 때만 정리 (실제로는 앱 종료 시에만)
      if (CommunicationManager.instance.referenceCount <= 0) {
        console.log('[CommunicationManager] All references released, but keeping instance for app lifetime');
        // 실제로는 인스턴스를 유지하여 탭 변경 시에도 연결 유지
        // CommunicationManager.instance.shutdown();
        // CommunicationManager.instance = null;
      }
    }
  }

  private setupEventHandlers(): void {
    // WebSocket 연결 상태 변경 핸들러
    this.websocketService.onConnectionChange = (connected: boolean) => {
      console.log(`[CommunicationManager] WebSocket connection changed: ${connected}`);
      this.notifyStatusChange();
      
      if (connected) {
        // 연결 성공 시 대기 중인 메시지 전송
        this.messageQueue.flush((message) => {
          this.websocketService.send(message);
        });
      }
    };

    // API 서비스 상태 변경 핸들러
    this.apiService.onStatusChange = (healthy: boolean) => {
      console.log(`[CommunicationManager] API service status changed: ${healthy}`);
      this.notifyStatusChange();
    };

    // 연결 모니터 상태 변경 핸들러
    this.connectionMonitor.onStatusChange = (status: ConnectionStatus) => {
      console.log(`[CommunicationManager] Overall status changed: ${status.overall}`);
      this.statusCallbacks.forEach(callback => callback(status));
    };
  }

  /**
   * 통신 매니저 초기화
   */
  public async initialize(): Promise<void> {
    // 이미 초기화 중인 경우 기존 Promise 반환
    if (CommunicationManager.initializationPromise) {
      console.log('[CommunicationManager] Initialization already in progress, waiting...');
      return CommunicationManager.initializationPromise;
    }

    if (this.isInitialized) {
      console.log('[CommunicationManager] Already initialized');
      return;
    }

    if (this.isShuttingDown) {
      throw new Error('Cannot initialize while shutting down');
    }

    console.log('[CommunicationManager] Initializing...');

    // 초기화 Promise 생성
    CommunicationManager.initializationPromise = this.performInitialization();
    
    try {
      await CommunicationManager.initializationPromise;
    } finally {
      CommunicationManager.initializationPromise = null;
    }
  }

  private async performInitialization(): Promise<void> {
    try {
      // API 서비스 건강 상태 확인
      await this.apiService.healthCheck();
      console.log('[CommunicationManager] API service is healthy');

      // WebSocket 연결
      await this.websocketService.connect();
      console.log('[CommunicationManager] WebSocket connected');

      // 연결 모니터 시작
      this.connectionMonitor.start();
      console.log('[CommunicationManager] Connection monitor started');

      this.isInitialized = true;
      console.log('[CommunicationManager] Initialization completed');

    } catch (error) {
      console.error('[CommunicationManager] Initialization failed:', error);
      throw new Error(`Communication manager initialization failed: ${error}`);
    }
  }

  /**
   * 통신 매니저 종료
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.log('[CommunicationManager] Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    console.log('[CommunicationManager] Shutting down...');

    try {
      this.connectionMonitor.stop();
      await this.websocketService.disconnect();
      this.messageQueue.clear();
      
      this.isInitialized = false;
      console.log('[CommunicationManager] Shutdown completed');
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * WebSocket 채널 구독
   */
  public subscribeToChannel(channel: string, handler: MessageHandler): () => void {
    if (!this.isInitialized) {
      console.warn(`[CommunicationManager] Not initialized, queueing subscription for channel: ${channel}`);
    }

    return this.websocketService.subscribe(channel, handler);
  }

  /**
   * WebSocket 메시지 전송
   */
  public sendWebSocketMessage(message: any): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.send(message);
    } else {
      console.log('[CommunicationManager] WebSocket not connected, queuing message');
      this.messageQueue.enqueue(message);
    }
  }

  /**
   * REST API 호출
   */
  public async apiCall<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    try {
      return await this.apiService.request<T>(endpoint, options);
    } catch (error) {
      console.error(`[CommunicationManager] API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * 연결 상태 조회
   */
  public getConnectionStatus(): ConnectionStatus {
    return {
      websocket: this.websocketService.isConnected(),
      api: this.apiService.isHealthy(),
      overall: this.connectionMonitor.getOverallStatus(),
      lastCheck: Date.now()
    };
  }

  /**
   * 연결 상태 변경 콜백 등록
   */
  public onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // 즉시 현재 상태 전달
    callback(this.getConnectionStatus());
    
    // 구독 해제 함수 반환
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 수동 재연결 시도
   */
  public async reconnect(): Promise<void> {
    console.log('[CommunicationManager] Manual reconnection requested');
    
    try {
      if (!this.apiService.isHealthy()) {
        await this.apiService.healthCheck();
      }
      
      if (!this.websocketService.isConnected()) {
        await this.websocketService.connect();
      }
      
      console.log('[CommunicationManager] Manual reconnection successful');
    } catch (error) {
      console.error('[CommunicationManager] Manual reconnection failed:', error);
      throw error;
    }
  }

  /**
   * 디버그 정보 조회
   */
  public getDebugInfo(): any {
    return {
      isInitialized: this.isInitialized,
      config: this.config,
      connectionStatus: this.getConnectionStatus(),
      websocketInfo: this.websocketService.getDebugInfo(),
      apiInfo: this.apiService.getDebugInfo(),
      queueInfo: this.messageQueue.getDebugInfo(),
      monitorInfo: this.connectionMonitor.getDebugInfo()
    };
  }

  private notifyStatusChange(): void {
    const status = this.getConnectionStatus();
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[CommunicationManager] Error in status callback:', error);
      }
    });
  }

  // =============================================================================
  // 백엔드 API 편의 메서드들
  // =============================================================================

  /**
   * 시스템 초기화 - 스트림 초기화 및 연결 확인
   */
  public async initializeSystem(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[CommunicationManager] Starting system initialization...');

      // 1. API 헬스체크
      const isHealthy = await this.apiService.healthCheck();
      if (!isHealthy) {
        return { success: false, message: 'API 서버에 연결할 수 없습니다.' };
      }

      // 2. 스트림 초기화
      await this.apiService.initializeStream();
      console.log('[CommunicationManager] Stream initialized');

      // 3. 서버 WebSocket 준비 대기 (3초)
      console.log('[CommunicationManager] Waiting for server WebSocket to be ready...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 4. 서버 준비 상태 재확인
      const healthyAfterWait = await this.apiService.healthCheck();
      if (!healthyAfterWait) {
        return { success: false, message: '서버 WebSocket 준비 확인 실패' };
      }
      console.log('[CommunicationManager] Server confirmed ready for WebSocket');

      // 5. WebSocket 연결 (이미 연결되어 있지 않다면)
      if (!this.websocketService.isConnected()) {
        await this.websocketService.connect();
      }

      return { success: true, message: '시스템이 성공적으로 초기화되었습니다.' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('[CommunicationManager] System initialization failed:', error);
      return { success: false, message: `초기화 실패: ${errorMessage}` };
    }
  }

  /**
   * 디바이스 관리 편의 메서드들
   */
  public async scanDevices(duration: number = 10) {
    return this.apiService.scanDevices(duration);
  }

  public async connectDevice(address: string) {
    return this.apiService.connectDevice(address);
  }

  public async disconnectDevice() {
    return this.apiService.disconnectDevice();
  }

  public async getDeviceStatus() {
    return this.apiService.getDeviceStatus();
  }

  /**
   * 스트리밍 제어 편의 메서드들
   */
  public async startStreaming() {
    return this.apiService.startStreaming();
  }

  public async stopStreaming() {
    return this.apiService.stopStreaming();
  }

  public async getStreamStatus() {
    return this.apiService.getStreamStatus();
  }

  /**
   * 데이터 레코딩 편의 메서드들
   */
  public async startRecording(sessionName?: string) {
    return this.apiService.startRecording(sessionName);
  }

  public async stopRecording() {
    return this.apiService.stopRecording();
  }

  public async getRecordingSessions() {
    return this.apiService.getRecordingSessions();
  }

  /**
   * 시스템 상태 조회 편의 메서드들
   */
  public async getSystemMetrics() {
    return this.apiService.getSystemMetrics();
  }

  public async getSystemHealth() {
    return this.apiService.getSystemHealth();
  }

  public async getMonitoringStatus() {
    return this.apiService.getMonitoringStatus();
  }

  /**
   * WebSocket 채널 구독 편의 메서드들
   */
  public subscribeToSensorData(handler: MessageHandler) {
    return this.subscribeToChannel('sensor_data', handler);
  }

  public subscribeToDeviceEvents(handler: MessageHandler) {
    return this.subscribeToChannel('device_events', handler);
  }

  public subscribeToStreamEvents(handler: MessageHandler) {
    return this.subscribeToChannel('stream_events', handler);
  }

  public subscribeToMonitoringMetrics(handler: MessageHandler) {
    console.log('[CommunicationManager] Setting up monitoring_metrics subscription');
    const unsubscribe = this.subscribeToChannel('monitoring_metrics', handler);
    console.log('[CommunicationManager] monitoring_metrics subscription complete');
    return unsubscribe;
  }

  public subscribeToSystemAlerts(handler: MessageHandler) {
    return this.subscribeToChannel('system_alerts', handler);
  }

  public subscribeToHealthUpdates(handler: MessageHandler) {
    return this.subscribeToChannel('health_updates', handler);
  }

  public subscribeToBufferStatus(handler: MessageHandler) {
    return this.subscribeToChannel('buffer_status', handler);
  }

  public subscribeToBatchStatus(handler: MessageHandler) {
    return this.subscribeToChannel('batch_status', handler);
  }
}

// 전역 인스턴스 생성 함수
export const createCommunicationManager = (config?: CommunicationConfig): CommunicationManager => {
  return CommunicationManager.getInstance(config);
};

// 기본 인스턴스 내보내기
export const communicationManager = CommunicationManager.getInstance(); 