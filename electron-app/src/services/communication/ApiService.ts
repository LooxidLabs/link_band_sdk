import type { RequestOptions, CommunicationConfig } from './CommunicationManager';

export interface ApiDebugInfo {
  baseUrl: string;
  isHealthy: boolean;
  lastHealthCheck: number;
  errorCount: number;
  lastError: string | null;
  requestCount: number;
}

export interface ApiError extends Error {
  status?: number;
  response?: any;
  isNetworkError?: boolean;
}

export class ApiService {
  private config: Required<CommunicationConfig>;
  private healthyStatus = false;
  private lastHealthCheck = 0;
  private errorCount = 0;
  private lastError: string | null = null;
  private requestCount = 0;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  public onStatusChange: ((healthy: boolean) => void) | null = null;

  constructor(config: Required<CommunicationConfig>) {
    this.config = config;
    this.startHealthCheckTimer();
  }

  /**
   * API 요청 실행
   */
  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined
    };

    if (options.body && (options.method === 'POST' || options.method === 'PUT')) {
      requestOptions.body = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }

    this.requestCount++;

    try {
      console.log(`[ApiService] ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        const error = new Error(errorData.message || `HTTP ${response.status}`) as ApiError;
        error.status = response.status;
        error.response = errorData;
        throw error;
      }

      const data = await response.json();
      
      // 성공한 요청은 건강 상태 개선에 기여
      if (this.errorCount > 0) {
        this.errorCount = Math.max(0, this.errorCount - 1);
      }
      
      this.updateHealthStatus();
      return data;

    } catch (error) {
      this.handleRequestError(error, endpoint);
      throw error;
    }
  }

  /**
   * 헬스 체크 실행
   * 백엔드 /metrics/ 엔드포인트를 사용하여 서버 상태 확인
   */
  public async healthCheck(): Promise<boolean> {
    try {
      console.log('[ApiService] Starting health check...');
      console.log('[ApiService] Checking URL:', `${this.config.apiBaseUrl}/metrics/`);
      
      const response = await fetch(`${this.config.apiBaseUrl}/metrics/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      });

      console.log('[ApiService] Health check response status:', response.status);
      console.log('[ApiService] Health check response ok:', response.ok);

      if (!response.ok) {
        console.error('[ApiService] Health check failed with status:', response.status);
        this.errorCount++;
        this.updateHealthStatus();
        return false;
      }

      const data = await response.json();
      console.log('[ApiService] Health check data received, keys:', Object.keys(data));

      // 메트릭 데이터가 올바르게 수신되었는지 확인
      if (data && typeof data === 'object') {
        this.errorCount = 0; // 성공 시 에러 카운트 리셋
        this.lastHealthCheck = Date.now();
        this.updateHealthStatus();
        console.log('[ApiService] Health check successful');
        return true;
      } else {
        console.warn('[ApiService] Health check returned invalid data format');
        this.errorCount++;
        this.updateHealthStatus();
        return false;
      }
    } catch (error) {
      console.error('[ApiService] Health check error:', error);
      this.errorCount++;
      this.lastError = `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.updateHealthStatus();
      return false;
    }
  }

  /**
   * 현재 건강 상태 반환
   */
  public isHealthy(): boolean {
    return this.healthyStatus;
  }

  /**
   * 디버그 정보 조회
   */
  public getDebugInfo(): ApiDebugInfo {
    return {
      baseUrl: this.config.apiBaseUrl,
      isHealthy: this.healthyStatus,
      lastHealthCheck: this.lastHealthCheck,
      errorCount: this.errorCount,
      lastError: this.lastError,
      requestCount: this.requestCount
    };
  }

  /**
   * 서비스 종료
   */
  public shutdown(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        return { message: text || `HTTP ${response.status}` };
      }
    } catch (error) {
      return { message: `HTTP ${response.status}` };
    }
  }

  private handleRequestError(error: unknown, endpoint: string): void {
    this.errorCount++;
    
    let errorMessage = 'Unknown error';
    let isNetworkError = false;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 네트워크 에러 감지
      if (error.name === 'TypeError' || 
          error.message.includes('fetch') || 
          error.message.includes('network') ||
          error.message.includes('ECONNREFUSED')) {
        isNetworkError = true;
      }
    }

    this.lastError = `${endpoint}: ${errorMessage}`;
    
    console.error(`[ApiService] Request failed for ${endpoint}:`, {
      error: errorMessage,
      isNetworkError,
      errorCount: this.errorCount
    });

    this.updateHealthStatus();
  }

  private updateHealthStatus(): void {
    // 에러 임계값 기반 건강 상태 판단
    const errorThreshold = 3;
    const newHealthStatus = this.errorCount < errorThreshold;
    
    if (newHealthStatus !== this.healthyStatus) {
      this.healthyStatus = newHealthStatus;
      this.onStatusChange?.(newHealthStatus);
      console.log(`[ApiService] Health status updated: ${newHealthStatus} (errors: ${this.errorCount})`);
    }
  }

  private startHealthCheckTimer(): void {
    // 주기적 헬스 체크 (1분마다)
    this.healthCheckTimer = setInterval(() => {
      this.healthCheck().catch(error => {
        console.error('[ApiService] Scheduled health check failed:', error);
      });
    }, 60000);

    // 초기 헬스 체크
    setTimeout(() => {
      this.healthCheck().catch(error => {
        console.error('[ApiService] Initial health check failed:', error);
      });
    }, 1000);
  }

  /**
   * 편의 메서드들
   */
  public async get<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  public async put<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  public async delete<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // =============================================================================
  // 백엔드 API 엔드포인트 전용 메서드들
  // =============================================================================

  /**
   * 디바이스 관리 API
   */
  public async scanDevices(duration: number = 10) {
    return this.get(`/device/scan?duration=${duration}`);
  }

  public async connectDevice(address: string) {
    return this.post('/device/connect', { address });
  }

  public async disconnectDevice() {
    return this.post('/device/disconnect');
  }

  public async getDeviceStatus() {
    return this.get('/device/status');
  }

  /**
   * 스트리밍 제어 API
   */
  public async initializeStream() {
    return this.post('/stream/init');
  }

  public async startStreaming() {
    return this.post('/stream/start');
  }

  public async stopStreaming() {
    return this.post('/stream/stop');
  }

  public async getStreamStatus() {
    return this.get('/stream/status');
  }

  public async getStreamHealth() {
    return this.get('/stream/health');
  }

  /**
   * 데이터 레코딩 API
   */
  public async startRecording(sessionName?: string) {
    const body = sessionName ? { session_name: sessionName } : {};
    return this.post('/data/start-recording', body);
  }

  public async stopRecording() {
    return this.post('/data/stop-recording');
  }

  public async getRecordingSessions() {
    return this.get('/data/sessions');
  }

  public async exportData(sessionId: string, format: 'json' | 'csv' = 'json') {
    return this.get(`/data/export/${sessionId}?format=${format}`);
  }

  /**
   * 시스템 메트릭 API
   */
  public async getSystemMetrics() {
    return this.get('/metrics/');
  }

  public async getPerformanceMetrics() {
    return this.get('/metrics/performance');
  }

  public async getSystemHealth() {
    return this.get('/metrics/health');
  }

  /**
   * 모니터링 시스템 API (Priority 4)
   */
  public async getMonitoringStatus() {
    return this.get('/monitoring/status');
  }

  public async getMonitoringMetrics() {
    return this.get('/monitoring/metrics');
  }

  public async getMonitoringHistory(hours: number = 24) {
    return this.get(`/monitoring/history?hours=${hours}`);
  }

  public async getSystemAlerts() {
    return this.get('/monitoring/alerts');
  }

  public async acknowledgeAlert(alertId: string) {
    return this.post(`/monitoring/alerts/${alertId}/acknowledge`);
  }

  public async getSystemHealthScore() {
    return this.get('/monitoring/health');
  }

  /**
   * 히스토리 데이터 API
   */
  public async getHistoryLogs(startTime?: string, endTime?: string, level?: string) {
    const params = new URLSearchParams();
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);
    if (level) params.append('level', level);
    
    const queryString = params.toString();
    return this.get(`/history/logs${queryString ? '?' + queryString : ''}`);
  }

  public async getHistoryMetrics(startTime?: string, endTime?: string) {
    const params = new URLSearchParams();
    if (startTime) params.append('start_time', startTime);
    if (endTime) params.append('end_time', endTime);
    
    const queryString = params.toString();
    return this.get(`/history/metrics${queryString ? '?' + queryString : ''}`);
  }
} 