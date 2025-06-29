import type { MessageHandler, CommunicationConfig } from './CommunicationManager';

export interface ReconnectStrategy {
  getNextDelay(attemptCount: number): number;
  shouldRetry(attemptCount: number): boolean;
  reset(): void;
}

export class ExponentialBackoffStrategy implements ReconnectStrategy {
  private maxDelay = 30000; // 30초
  private baseDelay = 1000; // 1초
  private maxAttempts = 10;

  getNextDelay(attemptCount: number): number {
    const delay = Math.min(this.baseDelay * Math.pow(2, attemptCount), this.maxDelay);
    // 지터 추가 (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.max(delay + jitter, this.baseDelay);
  }

  shouldRetry(attemptCount: number): boolean {
    return attemptCount < this.maxAttempts;
  }

  reset(): void {
    // 전략 리셋 (필요시 구현)
  }
}

export class HeartbeatManager {
  private timer: NodeJS.Timeout | null = null;
  private interval: number;
  private sendHeartbeat: () => void;
  private onTimeout: () => void;
  private lastHeartbeat = 0;

  constructor(
    interval: number,
    sendHeartbeat: () => void,
    onTimeout: () => void
  ) {
    this.interval = interval;
    this.sendHeartbeat = sendHeartbeat;
    this.onTimeout = onTimeout;
  }

  start(): void {
    this.stop();
    // 시작 시 현재 시간으로 초기화
    this.lastHeartbeat = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      if (this.lastHeartbeat > 0 && now - this.lastHeartbeat > this.interval * 3) {
        // 하트비트 응답이 너무 늦음 (3배 시간까지 허용)
        this.onTimeout();
        return;
      }
      this.sendHeartbeat();
    }, this.interval);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  recordHeartbeat(): void {
    this.lastHeartbeat = Date.now();
  }
}

export interface WebSocketDebugInfo {
  url: string | null;
  readyState: number | null;
  subscriptionCount: number;
  reconnectAttempts: number;
  lastError: string | null;
  isHeartbeatActive: boolean;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<CommunicationConfig>;
  private subscriptions: Map<string, MessageHandler[]> = new Map();
  private reconnectStrategy: ReconnectStrategy;
  private heartbeatManager: HeartbeatManager;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private lastError: string | null = null;

  public onConnectionChange: ((connected: boolean) => void) | null = null;

  constructor(config: Required<CommunicationConfig>) {
    this.config = config;
    this.reconnectStrategy = new ExponentialBackoffStrategy();
    
    this.heartbeatManager = new HeartbeatManager(
      config.heartbeatInterval,
      () => this.sendHeartbeat(),
      () => this.handleHeartbeatTimeout()
    );

    // 페이지 가시성 변경 이벤트 리스너 등록
    this.setupVisibilityChangeHandler();
  }

  private setupVisibilityChangeHandler(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // 페이지가 다시 보일 때 연결 상태 확인
          this.handlePageVisible();
        } else {
          // 페이지가 숨겨질 때
          this.handlePageHidden();
        }
      });
    }
  }

  private handlePageVisible(): void {
    console.log('[WebSocketService] Page became visible, checking connection...');
    
    // 연결이 끊어져 있으면 재연결 시도
    if (!this.isConnected() && !this.isConnecting) {
      console.log('[WebSocketService] Connection lost while page was hidden, attempting to reconnect...');
      this.connect().catch(error => {
        console.error('[WebSocketService] Failed to reconnect after page became visible:', error);
      });
    } else if (this.isConnected()) {
      // 연결되어 있으면 ping으로 연결 상태 확인
      console.log('[WebSocketService] Connection appears active, sending ping to verify...');
      this.send({
        type: 'ping',
        timestamp: Date.now()
      });
    }
  }

  private handlePageHidden(): void {
    console.log('[WebSocketService] Page became hidden');
    // 페이지가 숨겨질 때는 특별한 처리 없음
    // WebSocket 연결은 유지
  }

  /**
   * WebSocket 연결
   */
  public async connect(): Promise<void> {
    if (this.isConnected()) {
      console.log('[WebSocketService] Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('[WebSocketService] Connection attempt already in progress');
      return;
    }

    const urls = this.getConnectionUrls();
    
    for (const url of urls) {
      try {
        await this.tryConnection(url);
        this.onConnectionSuccess();
        return;
      } catch (error) {
        console.warn(`[WebSocketService] Failed to connect to ${url}:`, error);
        this.lastError = error instanceof Error ? error.message : String(error);
      }
    }
    
    throw new Error('All WebSocket connection attempts failed');
  }

  /**
   * WebSocket 연결 해제
   */
  public async disconnect(): Promise<void> {
    console.log('[WebSocketService] Disconnecting...');
    
    this.stopReconnectTimer();
    this.heartbeatManager.stop();
    
    if (this.ws) {
      // 정상적인 종료 코드로 연결 해제
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    this.onConnectionChange?.(false);
  }

  /**
   * 채널 구독
   */
  public subscribe(channel: string, handler: MessageHandler): () => void {
    console.log(`[WebSocketService] Subscribing to channel: ${channel}`);
    
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }
    
    const handlers = this.subscriptions.get(channel)!;
    handlers.push(handler);
    
    // 백엔드에 채널 구독 요청
    if (this.isConnected()) {
      const subscribeMessage = {
        type: 'subscribe',
        channel: channel
      };
      console.log(`[WebSocketService] Sending subscribe message for ${channel}:`, subscribeMessage);
      this.send(subscribeMessage);
    } else {
      console.warn(`[WebSocketService] Not connected, cannot send subscribe message for ${channel}`);
    }
    
    console.log(`[WebSocketService] Subscribed to channel: ${channel}`);
    
    // 구독 해제 함수 반환
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        
        // 해당 채널에 더 이상 핸들러가 없으면 구독 해제
        if (handlers.length === 0) {
          this.subscriptions.delete(channel);
          if (this.isConnected()) {
            this.send({
              type: 'unsubscribe',
              channel: channel
            });
          }
        }
      }
      console.log(`[WebSocketService] Unsubscribed from channel: ${channel}`);
    };
  }

  /**
   * 메시지 전송
   */
  public send(message: any): void {
    if (!this.isConnected()) {
      console.warn('[WebSocketService] Cannot send message: WebSocket is not connected');
      return;
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws!.send(messageStr);
    } catch (error) {
      console.error('[WebSocketService] Failed to send message:', error);
      this.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  /**
   * 연결 상태 확인
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 디버그 정보 조회
   */
  public getDebugInfo(): WebSocketDebugInfo {
    return {
      url: this.ws?.url || null,
      readyState: this.ws?.readyState || null,
      subscriptionCount: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastError,
      isHeartbeatActive: this.heartbeatManager !== null
    };
  }

  private async tryConnection(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[WebSocketService] Attempting connection to: ${url}`);
      this.isConnecting = true;

      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000); // 10초 타임아웃

      ws.onopen = () => {
        clearTimeout(timeout);
        this.ws = ws;
        this.isConnecting = false;
        this.setupEventHandlers();
        console.log(`[WebSocketService] Connected to: ${url}`);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        this.isConnecting = false;
        console.error(`[WebSocketService] Connection error for ${url}:`, error);
        reject(error);
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        this.isConnecting = false;
        if (ws === this.ws) {
          // 현재 연결이 닫힌 경우만 처리
          reject(new Error(`Connection closed: ${event.code} ${event.reason}`));
        }
      };
    });
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.ws.onclose = (event) => {
      console.log(`[WebSocketService] Connection closed: ${event.code} ${event.reason}`);
      this.heartbeatManager.stop();
      this.onConnectionChange?.(false);
      
      // 정상 종료(1000, 1001) 또는 사용자 의도적 종료(1005)가 아닌 경우에만 재연결 시도
      // 1005는 브라우저 탭 변경 시 발생할 수 있는 코드
      if (event.code !== 1000 && event.code !== 1001 && event.code !== 1005) {
        console.log(`[WebSocketService] Abnormal closure detected (code: ${event.code}), scheduling reconnect`);
        this.scheduleReconnect();
      } else {
        console.log(`[WebSocketService] Normal closure (code: ${event.code}), no reconnect needed`);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocketService] WebSocket error:', error);
      this.lastError = 'WebSocket error occurred';
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      // 하트비트 및 ping 응답 처리
      if (message.type === 'heartbeat_response' || message.type === 'pong') {
        this.heartbeatManager.recordHeartbeat();
        console.log('[WebSocketService] Received heartbeat/pong response');
        return;
      }

      // ping 응답 처리
      if (message.type === 'ping_response') {
        console.log('[WebSocketService] Connection test ping successful');
        return;
      }

      // 채널별 메시지 라우팅
      // message.type을 우선적으로 사용하여 모니터링 메시지들을 올바르게 라우팅
      const channel = message.channel || message.type || message.sensor_type || 'default';
      const handlers = this.subscriptions.get(channel) || [];
      
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`[WebSocketService] Error in message handler for channel ${channel}:`, error);
        }
      });

      // 기본 채널 핸들러도 실행 (하위 호환성)
      if (channel !== 'default') {
        const defaultHandlers = this.subscriptions.get('default') || [];
        defaultHandlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error('[WebSocketService] Error in default message handler:', error);
          }
        });
      }

    } catch (error) {
      console.error('[WebSocketService] Failed to parse WebSocket message:', error);
      this.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  private sendHeartbeat(): void {
    this.send({
      type: 'heartbeat',
      timestamp: Date.now()
    });
  }

  private handleHeartbeatTimeout(): void {
    console.warn('[WebSocketService] Heartbeat timeout detected');
    // 1006은 직접 사용할 수 없는 코드이므로 1000(정상 종료) 사용
    this.ws?.close(1000, 'Heartbeat timeout');
  }

  private onConnectionSuccess(): void {
    this.reconnectAttempts = 0;
    this.reconnectStrategy.reset();
    this.lastError = null;
    
    // 연결 유효성 즉시 확인을 위한 ping 전송
    console.log('[WebSocketService] Sending connection test ping');
    this.send({
      type: 'ping',
      timestamp: Date.now()
    });
    
    this.heartbeatManager.start();
    this.onConnectionChange?.(true);
    
    // 기존 구독 재등록
    for (const channel of this.subscriptions.keys()) {
      this.send({
        type: 'subscribe',
        channel: channel
      });
    }
  }

  private scheduleReconnect(): void {
    if (!this.reconnectStrategy.shouldRetry(this.reconnectAttempts)) {
      console.error('[WebSocketService] Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectStrategy.getNextDelay(this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`[WebSocketService] Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('[WebSocketService] Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private getConnectionUrls(): string[] {
    const baseUrl = this.config.websocketUrl;
    
    // localhost로 통일하여 단일 URL만 사용
    return [baseUrl];
  }
} 