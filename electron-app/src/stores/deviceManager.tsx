import { create } from 'zustand';

// 브라우저 호환 EventEmitter 구현
class EventEmitter {
  private events: { [key: string]: Function[] };

  constructor() {
    this.events = {};
  }

  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event: string, listener: Function): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// WebSocket 연결 관리 클래스
class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private checkConnectionTimer: any = null;
  private healthCheckTimer: any = null;
  private isConnecting = false;
  private messageHandler: (message: any) => void;
  public onConnectionChange: ((connected: boolean) => void) | null = null;

  constructor(url: string, messageHandler: (message: any) => void) {
    this.url = url;
    this.messageHandler = messageHandler;
  }

  private startConnectionCheck() {
    // 기존 타이머 정리
    if (this.checkConnectionTimer) {
      clearInterval(this.checkConnectionTimer);
    }

    // 1초마다 연결 상태 확인 및 재연결 시도
    this.checkConnectionTimer = setInterval(() => {
      if (!this.isConnected()) {
        this.connect();
      }
    }, 1000);
  }

  private startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // 1초마다 health check 수행
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
    if (this.isConnected()) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    console.log('Attempting to connect to WebSocket server...');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnecting = false;
        this.onConnectionChange?.(true);
        this.startHealthCheck(); // 연결 성공 시 health check 시작
        this.startConnectionCheck(); // 연결 성공 후 연결 상태 모니터링 시작
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnecting = false;
        this.ws = null;
        this.onConnectionChange?.(false);
        if (this.healthCheckTimer) {
          clearInterval(this.healthCheckTimer);
          this.healthCheckTimer = null;
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
  }

  send(message: any) {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket is not connected');
    }
  }
}

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

interface DeviceInfo {
  name: string;
  address: string;
  rssi?: number;
}

type ConnectionQuality = {
  signal: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Unknown';
  dataRate: number;
  eegRate: number;
  ppgRate: number;
  accRate: number;
};

type DeviceStateData = {
  isConnected: boolean;
  isServerConnected: boolean;
  isStreaming: boolean;
  deviceInfo: DeviceInfo | null;
  batteryLevel: number;
  connectionQuality: ConnectionQuality;
  eegData: EEGData[];
  ppgData: PPGData[];
  accData: AccData[];
  lastRateUpdate: number;
  lastDataUpdate: number;
  connectedClients: number;
  autoShowWindow: boolean;
};

type DeviceStateMethods = {
  eventEmitter: EventEmitter;
  connect: (address: string) => Promise<void>;
  disconnect: () => Promise<void>;
  startStreaming: () => Promise<void>;
  stopStreaming: () => Promise<void>;
  clearData: () => void;
  addEEGData: (data: EEGData[]) => void;
  addPPGData: (data: PPGData[]) => void;
  addAccData: (data: AccData[]) => void;
  updateBatteryLevel: (level: number) => void;
  updateConnectionQuality: (quality: Partial<ConnectionQuality>) => void;
  setAutoShowWindow: (enabled: boolean) => void;
};

type DeviceState = DeviceStateData & DeviceStateMethods;

const MAX_DATA_POINTS = 1000;
const WS_URL = 'ws://localhost:18765';

const initialConnectionQuality: ConnectionQuality = {
  signal: 'Unknown',
  dataRate: 0,
  eegRate: 0,
  ppgRate: 0,
  accRate: 0,
};

const initialState: DeviceStateData = {
  isConnected: false,
  isServerConnected: false,
  isStreaming: false,
  deviceInfo: null,
  batteryLevel: 0,
  connectionQuality: initialConnectionQuality,
  eegData: [],
  ppgData: [],
  accData: [],
  lastRateUpdate: Date.now(),
  lastDataUpdate: Date.now(),
  connectedClients: 0,
  autoShowWindow: true,
};

// 샘플링 레이트 계산 및 업데이트 함수
const updateSamplingRates = (state: DeviceStateData): DeviceStateData => {
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

    return {
      ...state,
      lastRateUpdate: now,
      connectionQuality: {
        ...state.connectionQuality,
        eegRate,
        ppgRate,
        accRate,
        dataRate: eegRate + ppgRate + accRate
      }
    };
  }
  return state;
};

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send(channel: string, ...args: any[]): void;
        on(channel: string, func: (...args: any[]) => void): void;
        once(channel: string, func: (...args: any[]) => void): void;
        removeListener(channel: string, func: (...args: any[]) => void): void;
      };
    };
  }
}

export const useDeviceManager = create<DeviceState>((set, get) => {
  // 초기화 시 저장된 설정 불러오기
  let initialAutoShow = true;
  try {
    const savedAutoShow = localStorage.getItem('autoShowWindow');
    if (savedAutoShow !== null) {
      initialAutoShow = JSON.parse(savedAutoShow);
    }
  } catch (error) {
    console.error('Failed to load autoShowWindow setting:', error);
  }

  const wsManager = new WebSocketManager(WS_URL, (message) => {
    handleWebSocketMessage(message);
  });

  // 컴포넌트 언마운트 시 정리
  window.addEventListener('beforeunload', () => {
    wsManager.disconnect();
  });

  // WebSocket 이벤트 핸들러 추가
  wsManager.onConnectionChange = (connected: boolean) => {
    if (!connected) {
      // 연결이 끊어지면 모든 상태를 초기화
      set({
        ...initialState,
        autoShowWindow: get().autoShowWindow, // autoShowWindow 설정은 유지
        eventEmitter: get().eventEmitter, // eventEmitter는 유지
      });
    } else {
      set({ isServerConnected: true });
    }
  };

  // 초기 연결 시도
  wsManager.connect();

  return {
    ...initialState,
    autoShowWindow: initialAutoShow, // 저장된 설정으로 초기화
    eventEmitter: new EventEmitter(),

    connect: async (address: string) => {
      try {
        wsManager.send({
          command: 'connect_device',
          payload: { address }
        });
      } catch (error) {
        console.error('Failed to connect:', error);
        throw error;
      }
    },

    disconnect: async () => {
      try {
        wsManager.send({
          command: 'disconnect_device'
        });
        set({ 
          ...initialState,
          isServerConnected: get().isServerConnected, // 서버 연결 상태는 유지
          eventEmitter: get().eventEmitter, // eventEmitter는 유지
        });
      } catch (error) {
        console.error('Failed to disconnect:', error);
        throw error;
      }
    },

    startStreaming: async () => {
      wsManager.send({
        command: 'start_streaming'
      });
      set({ isStreaming: true });
    },

    stopStreaming: async () => {
      wsManager.send({
        command: 'stop_streaming'
      });
      set({ isStreaming: false });
    },

    clearData: () => {
      set({ 
        eegData: [],
        ppgData: [],
        accData: []
      });
    },

    addEEGData: (newData: EEGData[]) => {
      if (newData.length > 0) {
        const now = Date.now();
        set((state) => {
          const newState = {
            ...state,
            eegData: [...state.eegData.slice(-MAX_DATA_POINTS + newData.length), ...newData],
            lastDataUpdate: now,
            isConnected: true
          };
          return updateSamplingRates(newState);
        });
        get().eventEmitter.emit('eegDataUpdated');
      }
    },

    addPPGData: (newData: PPGData[]) => {
      if (newData.length > 0) {
        const now = Date.now();
        set((state) => {
          const newState = {
            ...state,
            ppgData: [...state.ppgData.slice(-MAX_DATA_POINTS + newData.length), ...newData],
            lastDataUpdate: now,
            isConnected: true
          };
          return updateSamplingRates(newState);
        });
        get().eventEmitter.emit('ppgDataUpdated');
      }
    },

    addAccData: (newData: AccData[]) => {
      if (newData.length > 0) {
        const now = Date.now();
        set((state) => {
          const newState = {
            ...state,
            accData: [...state.accData.slice(-MAX_DATA_POINTS + newData.length), ...newData],
            lastDataUpdate: now,
            isConnected: true
          };
          return updateSamplingRates(newState);
        });
        get().eventEmitter.emit('accDataUpdated');
      }
    },

    updateBatteryLevel: (level: number) => {
      set({
        batteryLevel: level,
        lastDataUpdate: Date.now(),
        isConnected: true
      });
      get().eventEmitter.emit('batteryUpdated');
    },

    updateConnectionQuality: (quality: Partial<ConnectionQuality>) => {
      set((state) => ({
        connectionQuality: {
          ...state.connectionQuality,
          ...quality
        }
      }));
      get().eventEmitter.emit('connectionQualityUpdated');
    },

    setAutoShowWindow: (enabled: boolean) => {
      set({ autoShowWindow: enabled });
      // localStorage에 설정 저장
      try {
        localStorage.setItem('autoShowWindow', JSON.stringify(enabled));
      } catch (error) {
        console.error('Failed to save autoShowWindow setting:', error);
      }
    }
  };
});

// WebSocket 메시지 핸들러
export const handleWebSocketMessage = (message: any) => {
  const store = useDeviceManager.getState();

  if (message.type === 'sensor_data') {
    switch (message.sensor_type) {
      case 'eeg':
        store.addEEGData(message.data);
        break;
      case 'ppg':
        store.addPPGData(message.data);
        break;
      case 'acc':
        store.addAccData(message.data);
        break;
      case 'battery':
        if (message.data && message.data.length > 0) {
          store.updateBatteryLevel(message.data[message.data.length - 1].level);
        }
        break;
    }
  } else if (message.type === 'health_check_response') {
    const wasConnected = store.isConnected;
    const isNowConnected = message.device_connected;

    // 디바이스가 새로 연결되었고, 자동 표시 설정이 활성화된 경우에만 창 표시
    if (!wasConnected && isNowConnected && store.autoShowWindow) {
      window.electron?.ipcRenderer?.send('show-window');
    }

    useDeviceManager.setState({
      isConnected: isNowConnected,
      isStreaming: message.is_streaming,
      lastDataUpdate: Date.now(),
      connectedClients: message.clients_connected
    });
  } else if (message.type === 'event') {
    switch (message.event_type) {
      case 'device_connected':
        if (message.data) {
          store.connect(message.data.address);
          // 디바이스 정보 업데이트
          useDeviceManager.setState({
            deviceInfo: {
              name: message.data.name,
              address: message.data.address
            },
            isConnected: true
          });
          // 자동 표시 설정이 활성화된 경우에만 창 표시
          if (store.autoShowWindow) {
            window.electron?.ipcRenderer?.send('show-window');
          }
        }
        break;
      case 'device_disconnected':
        store.disconnect();
        break;
      case 'stream_started':
        store.startStreaming();
        break;
      case 'stream_stopped':
        store.stopStreaming();
        break;
      case 'device_info':
        if (message.data) {
          const { connected, device_info, is_streaming } = message.data;
          // 연결 상태와 디바이스 정보 업데이트
          useDeviceManager.setState({
            isConnected: connected,
            deviceInfo: device_info ? {
              name: device_info.name,
              address: device_info.address
            } : null,
            isStreaming: is_streaming
          });
          // 자동 표시 설정이 활성화된 경우에만 창 표시
          if (connected && store.autoShowWindow) {
            window.electron?.ipcRenderer?.send('show-window');
          }
        }
        break;
    }
  }
}; 