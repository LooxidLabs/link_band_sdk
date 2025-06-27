import { create } from 'zustand';
import { sendSensorDataToCloud } from '../utils/linkCloudSocket';
// import { userApi } from '../api/user';

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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // 2초

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
        console.log('Connection check: WebSocket is not connected, attempting to reconnect...');
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
    console.log('WebSocket support available:', typeof WebSocket !== 'undefined');
    console.log('Current location:', window.location.href);

    // Windows 특별 처리: 여러 URL 시도 (IPv6 포함)
    const urlsToTry = [
      this.url,  // 기본값: ws://127.0.0.1:18765
      'ws://localhost:18765',
      'ws://[::1]:18765',  // IPv6 localhost
      'ws://0.0.0.0:18765'
    ];
    
    console.log('URLs to try:', urlsToTry);

    this.tryConnection(urlsToTry, 0);
  }

  private tryConnection(urls: string[], index: number) {
    if (index >= urls.length) {
      console.error('All WebSocket URLs failed');
      this.isConnecting = false;
      this.onConnectionChange?.(false);
      return;
    }

    const currentUrl = urls[index];
    console.log(`Trying WebSocket URL ${index + 1}/${urls.length}:`, currentUrl);

    try {
      this.ws = new WebSocket(currentUrl);
      console.log('WebSocket object created successfully for:', currentUrl);

      const timeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timeout, trying next URL...');
          this.ws.close();
          this.tryConnection(urls, index + 1);
        }
      }, 3000); // 3초 타임아웃

      this.ws.onopen = () => {
        clearTimeout(timeout);
        console.log('WebSocket connected successfully to:', currentUrl);
        this.url = currentUrl; // 성공한 URL로 업데이트
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.onConnectionChange?.(true);
        this.startHealthCheck();
        this.startConnectionCheck();
      };

      this.ws.onclose = (event) => {
        clearTimeout(timeout);
        console.log('WebSocket connection closed', event.code, event.reason, 'URL:', currentUrl);
        
        if (this.isConnecting) {
          // 연결 시도 중이었다면 다음 URL 시도
          this.tryConnection(urls, index + 1);
          return;
        }

        this.isConnecting = false;
        this.ws = null;
        this.onConnectionChange?.(false);
        
        if (this.healthCheckTimer) {
          clearInterval(this.healthCheckTimer);
          this.healthCheckTimer = null;
        }

        // 재연결 시도
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
          console.log('Max reconnection attempts reached');
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('WebSocket error for URL:', currentUrl, error);
        console.error('WebSocket error details:', {
          url: currentUrl,
          readyState: this.ws?.readyState,
          error: error
        });
        
        if (this.isConnecting) {
          // 연결 시도 중이었다면 다음 URL 시도
          this.tryConnection(urls, index + 1);
          return;
        }

        this.isConnecting = false;
        this.ws = null;
        this.onConnectionChange?.(false);
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
      console.error('Failed to create WebSocket connection for URL:', currentUrl, error);
      this.tryConnection(urls, index + 1);
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

  // 외부에서 연결 상태를 확인할 수 있도록 public 메서드 추가
  public isConnectedPublic(): boolean {
    return this.isConnected();
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

interface BatData extends SensorData {
  level: number;
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
  batRate: number;
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
  batData: BatData[];
  lastRateUpdate: number;
  lastDataUpdate: number;
  connectedClients: number;
  autoShowWindow: boolean;
  registeredDevices: DeviceInfo[];
  scannedDevices: DeviceInfo[];
  scanLoading: boolean;
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
  addBatData: (data: BatData[]) => void;
  updateConnectionQuality: (quality: Partial<ConnectionQuality>) => void;
  setAutoShowWindow: (enabled: boolean) => void;
  fetchRegisteredDevices: () => void;
  handleRegister: (device: DeviceInfo) => void;
  handleUnregister: (address: string) => void;
  handleScan: () => void;
};

type DeviceState = DeviceStateData & DeviceStateMethods;

const MAX_DATA_POINTS = 1000;
// Windows 호환성을 위해 127.0.0.1 우선 사용
const WS_URL = 'ws://127.0.0.1:18765';

// Windows 디버깅을 위한 추가 로깅
console.log('=== WebSocket Debug Info ===');
console.log('Platform:', navigator.platform);
console.log('User Agent:', navigator.userAgent);
console.log('WebSocket URL:', WS_URL);
console.log('Location:', window.location.href);
console.log('============================');

const initialConnectionQuality: ConnectionQuality = {
  signal: 'Unknown',
  dataRate: 0,
  eegRate: 0,
  ppgRate: 0,
  accRate: 0,
  batRate: 0,
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
  batData: [],
  lastRateUpdate: Date.now(),
  lastDataUpdate: Date.now(),
  connectedClients: 0,
  autoShowWindow: true,
  registeredDevices: [],
  scannedDevices: [],
  scanLoading: false,
};

const initialCloudRates = {
  cloudEegRate: 0,
  cloudPpgRate: 0,
  cloudAccRate: 0,
  cloudBatRate: 0,
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

// 클라우드 전송 샘플 카운터
let cloudEegSent = 0;
let cloudPpgSent = 0;
let cloudAccSent = 0;
let cloudBatSent = 0;

declare global {
  interface Window {
    electron: {
      store: {
        getSavedCredentials: () => Promise<any>;
        setSavedCredentials: (credentials: any) => Promise<boolean>;
        clearSavedCredentials: () => Promise<boolean>;
      };
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
        once: (channel: string, func: (...args: any[]) => void) => void;
        removeListener: (channel: string, func: (...args: any[]) => void) => void;
      };
    };
  }
}

export const useDeviceManager = create<DeviceState & {
  cloudEegRate: number;
  cloudPpgRate: number;
  cloudAccRate: number;
  cloudBatRate: number;
}>((set, get) => {
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

  // EventEmitter 초기화
  const eventEmitter = new EventEmitter();

  // 초기 상태 설정
  const currentState = {
    ...initialState,
    autoShowWindow: initialAutoShow,
    eventEmitter: eventEmitter,
  };

  // Store methods 정의
  const methods = {
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
          isServerConnected: get().isServerConnected,
          eventEmitter: eventEmitter,
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
        accData: [],
        batData: []
      });
    },

    addEEGData: (newData: EEGData[]) => {
      if (newData.length > 0) {
        const now = Date.now();
        set((state) => {
          const currentData = state.eegData || [];
          const newState = {
            ...state,
            eegData: [...currentData.slice(-MAX_DATA_POINTS + newData.length), ...newData],
            lastDataUpdate: now,
            isConnected: true
          };
          return updateSamplingRates(newState);
        });
        eventEmitter.emit('eegDataUpdated');
        newData.forEach(d => {
          sendSensorDataToCloud({
            type: 'eeg',
            timestamp: d.timestamp,
            ch1: d.ch1,
            ch2: d.ch2,
            leadoff_ch1: d.leadoff_ch1,
            leadoff_ch2: d.leadoff_ch2,
            user_id: localStorage.getItem('user_id') || '',
          });
        });
        cloudEegSent += newData.length;
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
            lastDataUpdate: now,
            isConnected: true
          };
          return updateSamplingRates(newState);
        });
        eventEmitter.emit('ppgDataUpdated');
        newData.forEach(d => {
          sendSensorDataToCloud({
            type: 'ppg',
            timestamp: d.timestamp,
            red: d.red,
            ir: d.ir,
            user_id: localStorage.getItem('user_id') || '',
          });
        });
        cloudPpgSent += newData.length;
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
            lastDataUpdate: now,
            isConnected: true
          };
          return updateSamplingRates(newState);
        });
        eventEmitter.emit('accDataUpdated');
        newData.forEach(d => {
          sendSensorDataToCloud({
            type: 'acc',
            timestamp: d.timestamp,
            x: d.x,
            y: d.y,
            z: d.z,
            user_id: localStorage.getItem('user_id') || '',
          });
        });
        cloudAccSent += newData.length;
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
            lastDataUpdate: now,
            isConnected: true
          };
          return updateSamplingRates(newState);
        });
        eventEmitter.emit('batDataUpdated');
        newData.forEach(d => {
          sendSensorDataToCloud({
            type: 'bat',
            timestamp: d.timestamp,
            level: d.level,
            user_id: localStorage.getItem('user_id') || '',
          });
        });
        cloudBatSent += newData.length;
      }
    },
    

    updateConnectionQuality: (quality: Partial<ConnectionQuality>) => {
      set((state) => ({
        connectionQuality: {
          ...state.connectionQuality,
          ...quality
        }
      }));
      eventEmitter.emit('connectionQualityUpdated');
    },

    setAutoShowWindow: (enabled: boolean) => {
      set({ autoShowWindow: enabled });
      try {
        localStorage.setItem('autoShowWindow', JSON.stringify(enabled));
      } catch (error) {
        console.error('Failed to save autoShowWindow setting:', error);
      }
    },

    fetchRegisteredDevices: () => {
      wsManager.send({ command: 'get_registered_devices' });
    },

    handleRegister: (device: DeviceInfo) => {
      wsManager.send({ command: 'register_device', payload: device });
    },

    handleUnregister: (address: string) => {
      wsManager.send({ command: 'unregister_device', payload: { address } });
    },

    handleScan: () => {
      set({ scanLoading: true });
      wsManager.send({ command: 'scan_devices' });
    }
  };

  // WebSocket 메시지 핸들러
  const handleWebSocketMessage = (message: any) => {
    if (message.type === 'sensor_data') {
      switch (message.sensor_type) {
        case 'eeg':
          methods.addEEGData(message.data);
          break;
        case 'ppg':
          methods.addPPGData(message.data);
          break;
        case 'acc':
          methods.addAccData(message.data);
          break;
        case 'bat':
          methods.addBatData(message.data);
          break;
      }
    } else if (message.type === 'health_check_response') {
      const wasConnected = get().isConnected;
      const isNowConnected = message.device_connected;
      if (!wasConnected && isNowConnected && get().autoShowWindow) {
        window.electron?.ipcRenderer?.send('show-window');
      }
      set({
        isConnected: isNowConnected,
        isStreaming: message.is_streaming,
        lastDataUpdate: Date.now(),
        connectedClients: message.clients_connected
      });
    } else if (message.type === 'event') {
      switch (message.event_type) {
        case 'device_connected':
          if (message.data) {
            methods.connect(message.data.address);
            set({
              deviceInfo: {
                name: message.data.name,
                address: message.data.address
              },
              isConnected: true
            });
            if (get().autoShowWindow) {
              window.electron?.ipcRenderer?.send('show-window');
            }
            
            // 디바이스 연결 즉시 engine WebSocket 연결 시도
            // 이를 통해 스트리밍 시작과 동시에 데이터를 받을 수 있음
            setTimeout(() => {
              const engineStore = (window as any).engineStore;
              if (engineStore && engineStore.getState) {
                const { wsManager } = engineStore.getState();
                if (wsManager && !wsManager.isConnected()) {
                  console.log('Device connected - attempting engine WebSocket connection');
                  wsManager.connect();
                }
              }
            }, 1000); // 1초 후 연결 시도
          }
          break;
        case 'device_disconnected':
          methods.disconnect();
          break;
        case 'stream_started':
          methods.startStreaming();
          break;
        case 'stream_stopped':
          methods.stopStreaming();
          break;
        case 'device_info':
          if (message.data) {
            const { connected, device_info, is_streaming, registered_devices } = message.data;
            set({
              isConnected: connected,
              deviceInfo: device_info ? {
                name: device_info.name,
                address: device_info.address
              } : null,
              isStreaming: is_streaming,
              ...(registered_devices ? { registeredDevices: registered_devices } : {})
            });
            if (connected && get().autoShowWindow) {
              window.electron?.ipcRenderer?.send('show-window');
            }
          }
          break;
        case 'registered_devices':
          set({ registeredDevices: message.data.devices || [] });
          break;
        case 'scanned_devices':
          set({ scannedDevices: message.data.devices || [], scanLoading: false });
          break;
        case 'scan_result':
          if (message.data && message.data.devices) {
            set({ scannedDevices: message.data.devices, scanLoading: false });
          }
          break;
      }
    }
  };

  // WebSocket 매니저 초기화
  const wsManager = new WebSocketManager(WS_URL, handleWebSocketMessage);

  // 컴포넌트 언마운트 시 정리
  window.addEventListener('beforeunload', () => {
    wsManager.disconnect();
  });

  // WebSocket 이벤트 핸들러 추가
  wsManager.onConnectionChange = (connected: boolean) => {
    if (!connected) {
      set({
        ...initialState,
        autoShowWindow: get().autoShowWindow,
        eventEmitter: eventEmitter,
      });
    } else {
      set({ isServerConnected: true });
      // 연결된 후에만 디바이스 목록 요청
      wsManager.send({ command: 'get_registered_devices' });
    }
  };

  // Python 서버가 준비되면 WebSocket 연결 시도
  if ((window as any).electron?.ipcRenderer) {
    (window as any).electron.ipcRenderer.on('python-server-ready', () => {
      console.log('Python server is ready, connecting to WebSocket...');
      wsManager.disconnect();
      setTimeout(() => {
        if (!wsManager.isConnectedPublic()) {
          wsManager.connect();
        }
      }, 2000);
    });

    (window as any).electron.ipcRenderer.on('python-server-stopped', () => {
      console.log('Python server stopped, disconnecting WebSocket...');
      wsManager.disconnect();
    });

    // Python 서버 로그 수신
    // (window as any).electron.ipcRenderer.on('python-log', (_event: any, msg: string) => {
    //   console.log('[PYTHON]', msg);
    // });
  }

  // 디바이스 등록 리스너 설정
  wsManager.send({ command: 'get_registered_devices' });

  // 클라우드 전송 샘플 수를 1초마다 상태로 반영
  setInterval(() => {
    set({
      cloudEegRate: cloudEegSent,
      cloudPpgRate: cloudPpgSent,
      cloudAccRate: cloudAccSent,
      cloudBatRate: cloudBatSent,
    });
    cloudEegSent = 0;
    cloudPpgSent = 0;
    cloudAccSent = 0;
    cloudBatSent = 0;
  }, 1000);

  return {
    ...currentState,
    ...methods,
    ...initialCloudRates,
    wsManager,
  };
}); 