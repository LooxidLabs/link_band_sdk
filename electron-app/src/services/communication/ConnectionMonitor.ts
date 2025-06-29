import type { ConnectionStatus } from './CommunicationManager';

interface ConnectionMetrics {
  uptime: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageLatency: number;
  errorRate: number;
  lastSuccessfulCheck: number;
}

export interface ConnectionMonitorDebugInfo {
  isRunning: boolean;
  checkInterval: number;
  metrics: ConnectionMetrics;
  currentStatus: ConnectionStatus;
  alertCount: number;
}

export class ConnectionMonitor {
  private metrics: ConnectionMetrics;
  private statusHistory: Array<{ status: ConnectionStatus; timestamp: number }> = [];
  private maxHistorySize = 100;
  private isRunning = false;
  private checkTimer: NodeJS.Timeout | null = null;
  private alertCount = 0;

  public onStatusChange: ((status: ConnectionStatus) => void) | null = null;

  constructor() {
    this.metrics = {
      uptime: 0,
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageLatency: 0,
      errorRate: 0,
      lastSuccessfulCheck: 0
    };
  }

  /**
   * 모니터링 시작
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('[ConnectionMonitor] Already running');
      return;
    }

    console.log('[ConnectionMonitor] Starting connection monitoring...');
    this.isRunning = true;
    this.scheduleNextCheck();
  }

  /**
   * 모니터링 중지
   */
  public stop(): void {
    console.log('[ConnectionMonitor] Stopping connection monitoring...');
    this.isRunning = false;
    
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * 현재 전체 상태 조회
   */
  public getOverallStatus(): 'healthy' | 'degraded' | 'offline' {
    if (this.statusHistory.length === 0) {
      return 'offline';
    }

    const recent = this.statusHistory.slice(-5); // 최근 5개 상태
    const healthyCount = recent.filter(s => s.status.websocket && s.status.api).length;
    const partialCount = recent.filter(s => s.status.websocket || s.status.api).length;

    if (healthyCount >= 3) {
      return 'healthy';
    } else if (partialCount >= 2) {
      return 'degraded';
    } else {
      return 'offline';
    }
  }

  /**
   * 연결 메트릭 조회
   */
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * 상태 기록 업데이트
   */
  public recordStatus(websocketConnected: boolean, apiHealthy: boolean): void {
    const now = Date.now();
    const status: ConnectionStatus = {
      websocket: websocketConnected,
      api: apiHealthy,
      overall: this.calculateOverallStatus(websocketConnected, apiHealthy),
      lastCheck: now
    };

    // 상태 변화 감지
    const previous = this.statusHistory[this.statusHistory.length - 1];
    if (previous) {
      this.updateMetrics(previous.status, status);
    }

    // 상태 히스토리 업데이트
    this.statusHistory.push({ status, timestamp: now });
    if (this.statusHistory.length > this.maxHistorySize) {
      this.statusHistory.shift();
    }

    // 상태 변화 알림
    if (!previous || this.hasStatusChanged(previous.status, status)) {
      console.log(`[ConnectionMonitor] Status changed: ${JSON.stringify(status)}`);
      this.onStatusChange?.(status);
      
      // 경고 상황 체크
      this.checkForAlerts(status);
    }
  }

  /**
   * 응답 시간 기록
   */
  public recordResponseTime(responseTime: number): void {
    // 이동 평균 계산
    if (this.metrics.averageLatency === 0) {
      this.metrics.averageLatency = responseTime;
    } else {
      this.metrics.averageLatency = 
        (this.metrics.averageLatency * 0.9) + (responseTime * 0.1);
    }
  }

  /**
   * 에러 발생 기록
   */
  public recordError(): void {
    // 간단한 에러율 계산 (최근 100회 요청 기준)
    const recentChecks = Math.min(this.statusHistory.length, 100);
    if (recentChecks > 0) {
      const errorCount = this.statusHistory
        .slice(-recentChecks)
        .filter(s => s.status.overall === 'offline').length;
      this.metrics.errorRate = errorCount / recentChecks;
    }
  }

  /**
   * 디버그 정보 조회
   */
  public getDebugInfo(): ConnectionMonitorDebugInfo {
    return {
      isRunning: this.isRunning,
      checkInterval: 30000, // 30초
      metrics: this.getMetrics(),
      currentStatus: this.statusHistory[this.statusHistory.length - 1]?.status || {
        websocket: false,
        api: false,
        overall: 'offline',
        lastCheck: 0
      },
      alertCount: this.alertCount
    };
  }

  /**
   * 상태 히스토리 조회
   */
  public getStatusHistory(limit?: number): ConnectionStatus[] {
    if (limit) {
      return this.statusHistory.slice(-limit).map(item => item.status);
    }
    return this.statusHistory.map(item => item.status);
  }

  private scheduleNextCheck(): void {
    if (!this.isRunning) return;

    this.checkTimer = setTimeout(() => {
      this.performHealthCheck();
      this.scheduleNextCheck();
    }, 30000); // 30초마다 체크
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // 여기서는 실제 연결 상태를 체크하지 않고
      // CommunicationManager에서 전달받은 상태를 기록
      // 실제 구현에서는 ping 테스트 등을 수행할 수 있음
      
      // 만료된 메시지 정리 등의 유지보수 작업
      this.performMaintenance();
      
    } catch (error) {
      console.error('[ConnectionMonitor] Health check failed:', error);
      this.recordError();
    }
  }

  private performMaintenance(): void {
    // 오래된 상태 히스토리 정리
    const maxAge = 24 * 60 * 60 * 1000; // 24시간
    const cutoff = Date.now() - maxAge;
    
    this.statusHistory = this.statusHistory.filter(
      item => item.timestamp > cutoff
    );
  }

  private calculateOverallStatus(websocket: boolean, api: boolean): 'healthy' | 'degraded' | 'offline' {
    if (websocket && api) {
      return 'healthy';
    } else if (websocket || api) {
      return 'degraded';
    } else {
      return 'offline';
    }
  }

  private updateMetrics(previous: ConnectionStatus, current: ConnectionStatus): void {
    const timeDiff = current.lastCheck - previous.lastCheck;
    
    // 연결 시간 업데이트
    if (current.overall === 'healthy' || current.overall === 'degraded') {
      this.metrics.uptime += timeDiff;
      
      // 연결 상태로 변경된 경우
      if (previous.overall === 'offline') {
        this.metrics.lastSuccessfulCheck = current.lastCheck;
        this.metrics.successfulChecks++;
      }
    } else {
      this.metrics.totalChecks++;
      this.metrics.failedChecks++;
      
      // 연결 해제된 경우
      if (previous.overall !== 'offline') {
        this.metrics.lastSuccessfulCheck = 0;
      }
    }
  }

  private hasStatusChanged(previous: ConnectionStatus, current: ConnectionStatus): boolean {
    return previous.websocket !== current.websocket ||
           previous.api !== current.api ||
           previous.overall !== current.overall;
  }

  private checkForAlerts(status: ConnectionStatus): void {
    // 오프라인 상태 알림
    if (status.overall === 'offline') {
      this.alertCount++;
      console.warn(`[ConnectionMonitor] ALERT: System is offline (Alert #${this.alertCount})`);
    }
    
    // 연결 불안정 알림
    if (status.overall === 'degraded') {
      const recentDegraded = this.statusHistory
        .slice(-5)
        .filter(item => item.status.overall === 'degraded').length;
      
      if (recentDegraded >= 3) {
        this.alertCount++;
        console.warn(`[ConnectionMonitor] ALERT: Connection unstable (Alert #${this.alertCount})`);
      }
    }
    
    // 높은 에러율 알림
    if (this.metrics.errorRate > 0.3) { // 30% 이상
      this.alertCount++;
      console.warn(`[ConnectionMonitor] ALERT: High error rate: ${(this.metrics.errorRate * 100).toFixed(1)}% (Alert #${this.alertCount})`);
    }
  }
} 