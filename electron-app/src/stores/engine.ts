import { create } from 'zustand';
import { engineApi } from '../api/engine';
import type { ConnectionInfo } from '../types/engine';

interface SensorData {
  timestamp: number;
}

interface EEGData extends SensorData {
  ch1: number;
  ch2: number;
  leadoff_ch1: boolean;
  leadoff_ch2: boolean;
}

interface PPGData extends SensorData {
  red: number;
  ir: number;
}

interface AccData extends SensorData {
  x: number;
  y: number;
  z: number;
}

interface BatData extends SensorData {
  level: number;
}

interface ConnectionQuality {
  signal: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Unknown';
  dataRate: number;
  eegRate: number;
  ppgRate: number;
  accRate: number;
  batRate: number;
}

const MAX_DATA_POINTS = 1000;

const initialConnectionQuality: ConnectionQuality = {
  signal: 'Unknown',
  dataRate: 0,
  eegRate: 0,
  ppgRate: 0,
  accRate: 0,
  batRate: 0,
};

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
    }, 1000);
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
  connectionInfo: ConnectionInfo | null;
  isLoading: boolean;
  error: string | null;
  isWebSocketConnected: boolean;
  wsManager: WebSocketManager | null;
  consecutiveFailures: number;
  isEngineStopped: boolean;
  // Sensor data states
  eegData: EEGData[];
  ppgData: PPGData[];
  accData: AccData[];
  batData: BatData[];
  connectionQuality: ConnectionQuality;
  lastRateUpdate: number;
  lastDataUpdate: number;
  // Methods
  startPolling: () => void;
  stopPolling: () => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  sendWebSocketMessage: (message: any) => void;
  addEEGData: (data: EEGData[]) => void;
  addPPGData: (data: PPGData[]) => void;
  addAccData: (data: AccData[]) => void;
  addBatData: (data: BatData[]) => void;
  clearData: () => void;
}

const WS_URL = 'ws://localhost:18765';
const MAX_CONSECUTIVE_FAILURES = 5;

// 샘플링 레이트 계산 및 업데이트 함수
const updateSamplingRates = (state: EngineState): EngineState => {
  const now = Date.now();
  if (now - state.lastRateUpdate >= 1000) { // 1초마다 업데이트
    const calculateRate = (data: SensorData[]) => {
      if (data.length < 2) return 0;
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
      const intervals: number[] = [];
      for (let i = 1; i < sortedData.length; i++) {
        intervals.push(sortedData[i].timestamp - sortedData[i-1].timestamp);
      }
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      return avgInterval > 0 ? Number((1.0 / avgInterval).toFixed(1)) : 0;
    };

    const eegRate = calculateRate(state.eegData);
    const ppgRate = calculateRate(state.ppgData);
    const accRate = calculateRate(state.accData);
    const batRate = calculateRate(state.batData);

    return {
      ...state,
      lastRateUpdate: now,
      connectionQuality: {
        ...state.connectionQuality,
        eegRate,
        ppgRate,
        accRate,
        batRate,
        dataRate: eegRate + ppgRate + accRate + batRate
      }
    };
  }
  return state;
};

export const useEngineStore = create<EngineState>((set, get) => {
  let pollingInterval: NodeJS.Timeout | null = null;
  let isInitialFetch = true;

  // WebSocket 메시지 핸들러
  const handleWebSocketMessage = (message: any) => {
    if (message.type === 'sensor_data') {
      switch (message.sensor_type) {
        case 'eeg':
          get().addEEGData(message.data);
          break;
        case 'ppg':
          get().addPPGData(message.data);
          break;
        case 'acc':
          get().addAccData(message.data);
          break;
        case 'bat':
          get().addBatData(message.data);
          break;
      }
    } else if (message.type === 'health_check_response') {
      set({
        isWebSocketConnected: true,
        connectionInfo: {
          ...get().connectionInfo,
          status: message.status,
          is_streaming: message.is_streaming,
          clients_connected: message.clients_connected
        }
      });
    }
  };

  // WebSocket 매니저 초기화
  const wsManager = new WebSocketManager(WS_URL, handleWebSocketMessage);

  // WebSocket 연결 상태 변경 핸들러
  wsManager.onConnectionChange = (connected: boolean) => {
    set({ isWebSocketConnected: connected });
  };

  const fetchConnectionInfo = async () => {
    try {
      if (isInitialFetch) {
        set({ isLoading: true, error: null });
      }
      const response = await engineApi.getConnectionInfo();
      
      set((state) => {
        const newConsecutiveFailures = response.status === 'success' ? 0 : state.consecutiveFailures + 1;
        return {
          connectionInfo: {
            ...response,
            status: newConsecutiveFailures >= MAX_CONSECUTIVE_FAILURES ? 'error' : response.status,
            is_streaming: response.is_streaming ?? false,
            clients_connected: response.clients_connected ?? 0
          },
          isLoading: false,
          consecutiveFailures: newConsecutiveFailures,
          isEngineStopped: false
        };
      });
      
      isInitialFetch = false;
    } catch (error) {
      const isConnectionRefused = error instanceof Error && 
        (error.message.includes('net::ERR_CONNECTION_REFUSED') || 
         error.message.includes('Failed to fetch'));
      
      set((state) => {
        const newConsecutiveFailures = state.consecutiveFailures + 1;
        const currentConnectionInfo = state.connectionInfo ?? {
          status: 'error',
          is_streaming: false,
          clients_connected: 0
        };
        
        return {
          error: isConnectionRefused ? '[ERROR] Engine is stopped!!' : 
            (error instanceof Error ? error.message : 'Failed to fetch connection info'),
          isLoading: false,
          consecutiveFailures: newConsecutiveFailures,
          isEngineStopped: isConnectionRefused,
          connectionInfo: {
            ...currentConnectionInfo,
            status: 'error',
            is_streaming: false,
            clients_connected: 0
          }
        };
      });
      isInitialFetch = false;
    }
  };

  return {
    connectionInfo: null,
    isLoading: false,
    error: null,
    isWebSocketConnected: false,
    wsManager,
    consecutiveFailures: 0,
    isEngineStopped: false,
    // Sensor data initial states
    eegData: [],
    ppgData: [],
    accData: [],
    batData: [],
    connectionQuality: initialConnectionQuality,
    lastRateUpdate: Date.now(),
    lastDataUpdate: Date.now(),

    startPolling: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      isInitialFetch = true;
      fetchConnectionInfo();
      pollingInterval = setInterval(fetchConnectionInfo, 1000);
    },

    stopPolling: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    },

    connectWebSocket: () => {
      wsManager.connect();
    },

    disconnectWebSocket: () => {
      wsManager.disconnect();
    },

    sendWebSocketMessage: (message: any) => {
      wsManager.send(message);
    },

    // Sensor data methods
    addEEGData: (newData: EEGData[]) => {
      if (newData.length > 0) {
        const now = Date.now();
        set((state) => {
          const currentData = state.eegData || [];
          const newState = {
            ...state,
            eegData: [...currentData.slice(-MAX_DATA_POINTS + newData.length), ...newData],
            lastDataUpdate: now
          };
          return updateSamplingRates(newState);
        });
      }
    },

    addPPGData: (newData: PPGData[]) => {
      if (newData.length > 0) {
        const now = Date.now();
        set((state) => {
          const currentData = state.ppgData || [];
          const newState = {
            ...state,
            ppgData: [...currentData.slice(-MAX_DATA_POINTS + newData.length), ...newData],
            lastDataUpdate: now
          };
          return updateSamplingRates(newState);
        });
      }
    },

    addAccData: (newData: AccData[]) => {
      if (newData.length > 0) {
        const now = Date.now();
        set((state) => {
          const currentData = state.accData || [];
          const newState = {
            ...state,
            accData: [...currentData.slice(-MAX_DATA_POINTS + newData.length), ...newData],
            lastDataUpdate: now
          };
          return updateSamplingRates(newState);
        });
      }
    },

    addBatData: (newData: BatData[]) => {
      if (newData.length > 0) {
        const now = Date.now();
        set((state) => {
          const currentData = state.batData || [];
          const newState = {
            ...state,
            batData: [...currentData.slice(-MAX_DATA_POINTS + newData.length), ...newData],
            lastDataUpdate: now
          };
          return updateSamplingRates(newState);
        });
      }
    },

    clearData: () => {
      set({ 
        eegData: [],
        ppgData: [],
        accData: [],
        batData: []
      });
    }
  };
}); 