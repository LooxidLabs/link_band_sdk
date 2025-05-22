import { create } from 'zustand';
import { engineApi } from '../api/engine';
import type { ConnectionInfo, EngineStatus } from '../types/engine';

// WebSocket 연결 관리 클래스
class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private checkConnectionTimer: any = null;
  private healthCheckTimer: any = null;
  private isConnecting = false;
  private messageHandler: (message: any) => void;
  public onConnectionChange: ((connected: boolean) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // 2초

  constructor(url: string, messageHandler: (message: any) => void) {
    this.url = url;
    this.messageHandler = messageHandler;
  }

  private startConnectionCheck() {
    if (this.checkConnectionTimer) {
      clearInterval(this.checkConnectionTimer);
    }

    this.checkConnectionTimer = setInterval(() => {
      if (!this.isConnected()) {
        console.log('Connection check: WebSocket is not connected, attempting to reconnect...');
        this.connect();
      }
    }, 5000);
  }

  private startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          command: 'health_check'
        });
      }
    }, 1000);
  }

  private isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect() {
    if (this.isConnected()) {
      console.log('WebSocket is already connected');
      return;
    }
    if (this.isConnecting) {
      console.log('WebSocket connection attempt already in progress');
      return;
    }

    this.isConnecting = true;
    console.log('Attempting to connect to WebSocket server...', this.url);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.onConnectionChange?.(true);
        this.startHealthCheck();
        this.startConnectionCheck();
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        this.onConnectionChange?.(false);
        
        if (this.healthCheckTimer) {
          clearInterval(this.healthCheckTimer);
          this.healthCheckTimer = null;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
          console.log('Max reconnection attempts reached');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.ws = null;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandler(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.ws = null;
    }
  }

  disconnect() {
    console.log('Disconnecting WebSocket...');
    if (this.checkConnectionTimer) {
      clearInterval(this.checkConnectionTimer);
      this.checkConnectionTimer = null;
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  send(message: any) {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket is not connected');
    }
  }

  public isConnectedPublic(): boolean {
    return this.isConnected();
  }
}

interface EngineState {
  engineStatus: EngineStatus | null;
  connectionInfo: ConnectionInfo | null;
  isLoading: {
    init: boolean;
    start: boolean;
    stop: boolean;
    connection: boolean;
  };
  error: {
    init: string | null;
    start: string | null;
    stop: string | null;
    connection: string | null;
  };
  isWebSocketConnected: boolean;
  initEngine: () => Promise<void>;
  startEngine: () => Promise<void>;
  stopEngine: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

const WS_URL = 'ws://localhost:18765';
const MAX_CONSECUTIVE_FAILURES = 5;

export const useEngineStore = create<EngineState>((set, get) => {
  let pollingInterval: NodeJS.Timeout | null = null;
  let ws: WebSocket | null = null;

  const updateEngineStatus = async () => {
    try {
      set(state => ({ isLoading: { ...state.isLoading, connection: true } }));
      const status = await engineApi.getEngineStatus();
      set(state => ({
        engineStatus: status,
        isLoading: { ...state.isLoading, connection: false },
        error: { ...state.error, connection: null }
      }));
    } catch (error) {
      set(state => ({
        isLoading: { ...state.isLoading, connection: false },
        error: { ...state.error, connection: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }
  };

  return {
    // Initial state
    engineStatus: null,
    connectionInfo: null,
    isLoading: {
      init: false,
      start: false,
      stop: false,
      connection: false
    },
    error: {
      init: null,
      start: null,
      stop: null,
      connection: null
    },
    isWebSocketConnected: false,

    // Actions
    initEngine: async () => {
      set(state => ({ isLoading: { ...state.isLoading, init: true }, error: { ...state.error, init: null } }));
      try {
        await engineApi.initEngine();
        const info = await engineApi.getConnectionInfo();
        set(state => ({
          connectionInfo: info,
          isLoading: { ...state.isLoading, init: false },
          error: { ...state.error, init: null }
        }));
      } catch (error) {
        set(state => ({
          isLoading: { ...state.isLoading, init: false },
          error: { ...state.error, init: error instanceof Error ? error.message : 'Failed to initialize engine' }
        }));
        throw error;
      }
    },

    startEngine: async () => {
      set(state => ({ isLoading: { ...state.isLoading, start: true }, error: { ...state.error, start: null } }));
      try {
        await engineApi.startEngine();
        const info = await engineApi.getConnectionInfo();
        set(state => ({
          connectionInfo: info,
          isLoading: { ...state.isLoading, start: false },
          error: { ...state.error, start: null }
        }));
      } catch (error) {
        set(state => ({
          isLoading: { ...state.isLoading, start: false },
          error: { ...state.error, start: error instanceof Error ? error.message : 'Failed to start engine' }
        }));
        throw error;
      }
    },

    stopEngine: async () => {
      set(state => ({ isLoading: { ...state.isLoading, stop: true }, error: { ...state.error, stop: null } }));
      try {
        await engineApi.stopEngine();
        const info = await engineApi.getConnectionInfo();
        set(state => ({
          connectionInfo: info,
          isLoading: { ...state.isLoading, stop: false },
          error: { ...state.error, stop: null }
        }));
      } catch (error) {
        set(state => ({
          isLoading: { ...state.isLoading, stop: false },
          error: { ...state.error, stop: error instanceof Error ? error.message : 'Failed to stop engine' }
        }));
        throw error;
      }
    },

    startPolling: () => {
      // Clear any existing polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      // Initial update
      updateEngineStatus();

      // Start polling every second
      pollingInterval = setInterval(updateEngineStatus, 1000);
    },

    stopPolling: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    },

    connectWebSocket: () => {
      if (ws) {
        ws.close();
      }

      const info = get().connectionInfo;
      if (!info?.ws_url) {
        set(state => ({
          error: { ...state.error, connection: 'WebSocket URL not available' }
        }));
        return;
      }

      ws = new WebSocket(info.ws_url);

      ws.onopen = () => {
        set({ isWebSocketConnected: true });
      };

      ws.onclose = () => {
        set({ isWebSocketConnected: false });
      };

      ws.onerror = (error) => {
        set(state => ({
          error: { ...state.error, connection: 'WebSocket connection error' }
        }));
      };
    },

    disconnectWebSocket: () => {
      if (ws) {
        ws.close();
        ws = null;
      }
      set({ isWebSocketConnected: false });
    }
  };
}); 