import { create } from 'zustand';
import { engineApi } from '../api/engine';
import type { ConnectionInfo, EngineStatus } from '../types/engine';
import type { EEGData, PPGData, AccData, BatteryData } from '../types/sensor';
// import { useDeviceStore } from './device'; // Temporarily disabled
import { useSensorStore } from './sensor';
import { usePythonServerStore } from './pythonServerStore';

interface SensorData {
  timestamp: number;
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
  private autoConnectTimer: any = null;
  private isConnecting = false;
  private messageHandler: (message: any) => void;
  public onConnectionChange: ((connected: boolean) => void) | null = null;
  // private reconnectAttempts = 0; // Temporarily disabled
  // private maxReconnectAttempts = 5; // Temporarily disabled
  // private reconnectDelay = 2000; // Temporarily disabled

  constructor(url: string, messageHandler: (message: any) => void) {
    this.url = url;
    this.messageHandler = messageHandler;
  }

  start() {
    // DO NOT START AUTOMATICALLY
    // this.startAutoConnect();
    console.log('WebSocketManager is initialized but not started automatically.');
  }

  startAutoConnect() {
    // DISABLED FOR MANUAL TESTING
    return;
    /*
    if (this.autoConnectTimer) {
      clearInterval(this.autoConnectTimer);
    }

    // Add initial delay to ensure Python server is fully initialized
    // This prevents connecting to WebSocket before FastAPI is ready
    // Windows needs more time for server initialization
    const isWindows = navigator.userAgent.toLowerCase().includes('windows');
    const startupDelay = isWindows ? 5000 : 3000; // 5 seconds for Windows, 3 seconds for others
    
    console.log(`Platform: ${isWindows ? 'Windows' : 'Other'}, waiting ${startupDelay}ms for Python server to fully initialize...`);
    
    setTimeout(() => {
      console.log('Starting WebSocket auto-connect after server initialization delay');
      
      // Start the auto-connect interval
      this.autoConnectTimer = setInterval(() => {
        const deviceStore = useDeviceStore.getState();
        const engineStore = useEngineStore.getState();

        // 이미 연결되어 있으면 연결 시도하지 않음
        if (this.isConnected()) {
          // console.log('WebSocket is already connected');
          return;
        }

        // 디바이스가 연결되어 있으면 WebSocket 연결 시도 (스트리밍 상태 무관)
        // 스트리밍이 시작되면 자동으로 데이터를 받을 수 있도록 미리 연결
        if (deviceStore.deviceStatus?.is_connected) {
          console.log('Auto-connecting to WebSocket (device connected)...', {
            deviceStatus: deviceStore.deviceStatus?.is_connected,
            isStreaming: engineStore.connectionInfo?.is_streaming
          });
          this.connect();
        } else {
          // console.log('Auto-connect conditions not met:', {
          //   deviceStatus: deviceStore.deviceStatus?.is_connected,
          //   isStreaming: engineStore.connectionInfo?.is_streaming
          // });
        }
      }, 1000);
    }, startupDelay);
    */
  }

  private startConnectionCheck() {
    // 재연결 로직은 onclose 핸들러에서 처리하므로 이 메서드는 비활성화
    // 중복 재연결 시도를 방지하기 위해 주석 처리
    /*
    if (this.checkConnectionTimer) {
      clearInterval(this.checkConnectionTimer);
    }

    this.checkConnectionTimer = setInterval(() => {
      if (!this.isConnected()) {
        console.log('Connection check: WebSocket is not connected, attempting to reconnect...');
        this.connect();
      }
    }, 1000);
    */
  }

  private startHealthCheck() {
    // DISABLED FOR MANUAL TESTING
    return;
    /*
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Windows needs more frequent health checks to keep connection alive
    const isWindows = navigator.userAgent.toLowerCase().includes('windows');
    const healthCheckInterval = isWindows ? 10000 : 30000; // 10s for Windows, 30s for others

    this.healthCheckTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          command: 'health_check'
        });
      } else {
        this.onConnectionChange?.(false);
      }
    }, healthCheckInterval);
    */
  }

  private isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect() {
    if (this.isConnected()) {
      console.log('WebSocket is already connected');
      return;
    }
    if (this.isConnecting) {
      console.log('WebSocket connection attempt already in progress');
      return;
    }

    // Check if Python server is ready
    const pythonServerStore = usePythonServerStore.getState();
    if (!pythonServerStore.isRunning) {
      console.log('Python server is not running yet, skipping WebSocket connection');
      return;
    }

    this.isConnecting = true;
    console.log('Attempting to connect to WebSocket server...', this.url);

    // Platform detection
    const isWindows = navigator.userAgent.toLowerCase().includes('windows');
    console.log('Platform detected:', isWindows ? 'Windows' : 'Other');
    console.log('Current location:', window.location.href);

    // Windows 특별 처리: 여러 URL 시도 (IPv6 포함)
    const urlsToTry = [
      this.url,  // 기본값: ws://127.0.0.1:18765
      'ws://localhost:18765',
      'ws://[::1]:18765',  // IPv6 localhost
      'ws://0.0.0.0:18765'
    ];

    for (const url of urlsToTry) {
      console.log(`Trying WebSocket connection to: ${url}`);
      
      try {
        const connected = await this.tryConnection(url);
        if (connected) {
          console.log(`Successfully connected to: ${url}`);
          this.isConnecting = false;
          return;
        }
      } catch (error) {
        console.error(`Failed to connect to ${url}:`, error);
        continue;
      }
    }

    console.error('All WebSocket connection attempts failed');
    this.isConnecting = false;
    this.onConnectionChange?.(false);
  }

  private tryConnection(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`Connection timeout for ${url}`);
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        resolve(false);
      }, 3000);

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log(`WebSocket connected successfully to ${url}`);
          clearTimeout(timeout);
          // this.reconnectAttempts = 0; // Temporarily disabled
          this.onConnectionChange?.(true);
          this.startHealthCheck();
          this.startConnectionCheck();
          
          // Send initial handshake message to keep connection alive
          console.log('Sending initial handshake message');
          this.send({
            type: 'command',
            command: 'check_device_connection'
          });
          
          resolve(true);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed', event.code, event.reason);
          clearTimeout(timeout);
          this.ws = null;
          this.onConnectionChange?.(false);
          
          if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
          }

          // DISABLED FOR MANUAL TESTING
          /*
          // Don't attempt reconnection if server is not ready (code 1011)
          if (event.code === 1011) {
            console.log('Server not ready, will retry through auto-connect');
            resolve(false);
            return;
          }

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) after ${delay}ms...`);
            setTimeout(() => this.connect(), delay);
          } else {
            console.log('Max reconnection attempts reached');
            this.onConnectionChange?.(false);
          }
          */
          resolve(false);
        };

        this.ws.onerror = (error) => {
          console.error(`WebSocket error for ${url}:`, error);
          clearTimeout(timeout);
          this.ws = null;
          this.onConnectionChange?.(false);
          resolve(false);
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
        console.error(`Failed to create WebSocket for ${url}:`, error);
        clearTimeout(timeout);
        resolve(false);
      }
    });
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
    if (this.autoConnectTimer) {
      clearInterval(this.autoConnectTimer);
      this.autoConnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // this.reconnectAttempts = 0; // Temporarily disabled
    this.onConnectionChange?.(false);
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
  wsManager: WebSocketManager | null;
  consecutiveFailures: number;
  isEngineStopped: boolean;
  isStreamingIdle: boolean;
  // Sensor data states
  eegData: EEGData[];
  ppgData: PPGData[];
  accData: AccData[];
  batData: BatteryData[];
  connectionQuality: ConnectionQuality;
  lastRateUpdate: number;
  lastDataUpdate: number;
  samplingRates: {
    eeg: number;
    ppg: number;
    acc: number;
    bat: number;
  };
  lastSampleTimestamps: {
    eeg: number;
    ppg: number;
    acc: number;
    bat: number;
  };
  sampleCounts: {
    eeg: number;
    ppg: number;
    acc: number;
    bat: number;
  };
  // Methods
  initEngine: () => Promise<void>;
  startEngine: () => Promise<void>;
  stopEngine: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  sendWebSocketMessage: (message: any) => void;
  addEEGData: (data: EEGData[]) => void;
  addPPGData: (data: PPGData[]) => void;
  addAccData: (data: AccData[]) => void;
  addBatData: (data: BatteryData[]) => void;
  clearData: () => void;
  autoConnectWebSocket: () => void;
  startWebSocketManager: () => void;
}

// Windows 호환성을 위해 127.0.0.1 우선 사용
const WS_URL = 'ws://127.0.0.1:18765';

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
      samplingRates: {
        eeg: eegRate,
        ppg: ppgRate,
        acc: accRate,
        bat: batRate
      },
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
  let samplingRateUpdateInterval: NodeJS.Timeout | null = null;
  let idleCheckInterval: NodeJS.Timeout | null = null;
  
  // WebSocket 메시지 핸들러
  const handleWebSocketMessage = (message: any) => {
    // const now = Date.now();
    // const dataLength = message.data.length;

      // 데이터가 들어오면 isStreamingIdle을 false로 설정
    set(() => ({ isStreamingIdle: false }));

    if (message.type === 'processed_data') {
      const now = Date.now();
      const dataLength = message.data ? 1 : 0;
      
      switch (message.sensor_type) {
        case 'eeg':
          set(state => ({
            sampleCounts: { ...state.sampleCounts, eeg: state.sampleCounts.eeg + dataLength },
            lastSampleTimestamps: { ...state.lastSampleTimestamps, eeg: now }
          }));
          // Transform EEG data to match EEGData interface
          const eegData: EEGData = {
            timestamp: message.data[0].timestamp,
            ch1_filtered: message.data[0].ch1_filtered || [],
            ch2_filtered: message.data[0].ch2_filtered || [],
            ch1_leadoff: message.data[0].ch1_leadoff || false,
            ch2_leadoff: message.data[0].ch2_leadoff || false,
            ch1_sqi: message.data[0].ch1_sqi || [],
            ch2_sqi: message.data[0].ch2_sqi || [],
            ch1_power: message.data[0].ch1_power || [],
            ch2_power: message.data[0].ch2_power || [],
            frequencies: message.data[0].frequencies || [],
            ch1_band_powers: message.data[0].ch1_band_powers || { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
            ch2_band_powers: message.data[0].ch2_band_powers || { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
            signal_quality: message.data[0].signal_quality || 'poor',
            good_samples_ratio: message.data[0].good_samples_ratio || 0,
            total_power: message.data[0].total_power || 0,
            focus_index: message.data[0].focus_index || 0,
            relaxation_index: message.data[0].relaxation_index || 0,
            stress_index: message.data[0].stress_index || 0,
            hemispheric_balance: message.data[0].hemispheric_balance || 0,
            cognitive_load: message.data[0].cognitive_load || 0,
            emotional_stability: message.data[0].emotional_stability || 0
          };
          useSensorStore.getState().updateSensorData({
            type: 'eeg',
            timestamp: message.timestamp,
            data: eegData
          });
          break;

        case 'ppg':
          set(state => ({
            sampleCounts: { ...state.sampleCounts, ppg: state.sampleCounts.ppg + dataLength },
            lastSampleTimestamps: { ...state.lastSampleTimestamps, ppg: now }
          }));
          // Transform PPG data to match PPGData interface
          const ppgData: PPGData = {
            timestamp: message.data[0].timestamp,
            filtered_ppg: message.data[0].filtered_ppg || [],
            ppg_sqi: message.data[0].ppg_sqi || [],
            bpm: message.data[0].bpm || 0,
            sdnn: message.data[0].sdnn || 0,
            rmssd: message.data[0].rmssd || 0,
            pnn50: message.data[0].pnn50 || 0,
            sdsd: message.data[0].sdsd || 0,
            hr_mad: message.data[0].hr_mad || 0,
            sd1: message.data[0].sd1 || 0,
            sd2: message.data[0].sd2 || 0,
            lf: message.data[0].lf || 0,
            hf: message.data[0].hf || 0,
            lf_hf_ratio: message.data[0].lf_hf || 0,
            signal_quality: message.data[0].signal_quality || 'poor',
            red_mean: message.data[0].red_mean || 0,
            ir_mean: message.data[0].ir_mean || 0,
            rr_intervals: message.data[0].rr_intervals || []
          };
          useSensorStore.getState().updateSensorData({
            type: 'ppg',
            timestamp: message.timestamp,
            data: ppgData
          });
          break;

        case 'acc':
          set(state => ({
            sampleCounts: { ...state.sampleCounts, acc: state.sampleCounts.acc + dataLength },
            lastSampleTimestamps: { ...state.lastSampleTimestamps, acc: now }
          }));
          // Transform ACC data to match AccData interface
          const accData: AccData = {
            timestamp: message.data[0].timestamp,
            x_change: message.data[0].x_change || [],
            y_change: message.data[0].y_change || [],
            z_change: message.data[0].z_change || [],
            avg_movement: message.data[0].avg_movement || 0,
            std_movement: message.data[0].std_movement || 0,
            max_movement: message.data[0].max_movement || 0,
            activity_state: message.data[0].activity_state || 'stationary',
            x_change_mean: message.data[0].x_change_mean || 0,
            y_change_mean: message.data[0].y_change_mean || 0,
            z_change_mean: message.data[0].z_change_mean || 0
          };
          useSensorStore.getState().updateSensorData({
            type: 'acc',
            timestamp: message.timestamp,
            data: accData
          });
          break;
      }
      
      if (message.type === 'raw_data') {
        // console.log('Raw data received:', message.data);
        switch (message.sensor_type) {
          case 'eeg':
            set(state => ({
              sampleCounts: { ...state.sampleCounts, eeg: state.sampleCounts.eeg + dataLength },
              lastSampleTimestamps: { ...state.lastSampleTimestamps, eeg: now }
            }));
            get().addEEGData(message.data);
            break;
          case 'ppg':
            set(state => ({
              sampleCounts: { ...state.sampleCounts, ppg: state.sampleCounts.ppg + dataLength },
              lastSampleTimestamps: { ...state.lastSampleTimestamps, ppg: now }
            }));
            get().addPPGData(message.data);
            break;
          case 'acc':
            set(state => ({
              sampleCounts: { ...state.sampleCounts, acc: state.sampleCounts.acc + dataLength },
              lastSampleTimestamps: { ...state.lastSampleTimestamps, acc: now }
            }));
            get().addAccData(message.data);
            break;
          case 'bat':
            set(state => ({
              sampleCounts: { ...state.sampleCounts, bat: state.sampleCounts.bat + dataLength },
              lastSampleTimestamps: { ...state.lastSampleTimestamps, bat: now }
            }));
            get().addBatData(message.data);
            break;
        }
      }
    }
  };

  // WebSocket 매니저 초기화
  const wsManager = new WebSocketManager(WS_URL, handleWebSocketMessage);

  // WebSocket 연결 상태 변경 핸들러
  wsManager.onConnectionChange = (connected: boolean) => {
    console.log('WebSocket connection state changed:', connected);
    set(state => ({
      isWebSocketConnected: connected,
      connectionInfo: connected ? get().connectionInfo : null,
      error: {
        ...state.error,
        connection: connected ? null : 'WebSocket connection lost'
      },
      isStreamingIdle: false
    }));

    // WebSocket 연결 시 idle 체크 시작
    if (connected) {
      if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
      }
      idleCheckInterval = setInterval(() => {
        const state = get();
        const now = Date.now();
        const lastUpdate = state.lastDataUpdate;
        
        if (now - lastUpdate >= 2000) { // 3초 동안 데이터가 없으면
          set(() => ({ isStreamingIdle: true }));
        }
      }, 1000);
    } else {
      // WebSocket 연결 해제 시 idle 체크 중지
      if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
        idleCheckInterval = null;
      }
      set(() => ({ 
        isStreamingIdle: false,
        error: {
          ...get().error,
          connection: 'WebSocket connection lost'
        }
      }));
    }
  };

  const store = {
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
    wsManager,
    consecutiveFailures: 0,
    isEngineStopped: false,
    isStreamingIdle: false,
    // Sensor data initial states
    eegData: [],
    ppgData: [],
    accData: [],
    batData: [],
    connectionQuality: initialConnectionQuality,
    lastRateUpdate: Date.now(),
    lastDataUpdate: Date.now(),
    samplingRates: {
      eeg: 0,
      ppg: 0,
      acc: 0,
      bat: 0
    },
    lastSampleTimestamps: {
      eeg: Date.now(),
      ppg: Date.now(),
      acc: Date.now(),
      bat: Date.now()
    },
    sampleCounts: {
      eeg: 0,
      ppg: 0,
      acc: 0,
      bat: 0
    },

    // Actions
    initEngine: async () => {
      set(state => ({ isLoading: { ...state.isLoading, init: true }, error: { ...state.error, init: null } }));
      try {
        await engineApi.initEngine();
        const [status, info] = await Promise.all([
          engineApi.getEngineStatus(),
          engineApi.getConnectionInfo()
        ]);
        set(state => ({
          engineStatus: status,
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
        const [status, info] = await Promise.all([
          engineApi.getEngineStatus(),
          engineApi.getConnectionInfo()
        ]);
        set(state => ({
          engineStatus: status,
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
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (samplingRateUpdateInterval) {
        clearInterval(samplingRateUpdateInterval);
      }

      // 초기 상태 업데이트
      const updateStatus = async () => {
        try {
          const [status, info] = await Promise.all([
            engineApi.getEngineStatus(),
            engineApi.getConnectionInfo()
          ]);
          
          set(state => ({
            engineStatus: status,
            connectionInfo: info,
            isLoading: { ...state.isLoading, connection: false },
            error: { ...state.error, connection: null }
          }));

          if (!wsManager.isConnectedPublic()) {
            wsManager.connect();
          }
        } catch (error) {
          set(state => ({
            isLoading: { ...state.isLoading, connection: false },
            error: { ...state.error, connection: error instanceof Error ? error.message : 'Unknown error' }
          }));
        }
      };

      // 즉시 첫 번째 업데이트 실행
      updateStatus();
      
      // 이후 1초마다 업데이트
      pollingInterval = setInterval(updateStatus, 1000);
      
      // 샘플링 레이트 계산 시작 (0.5초마다)
      // samplingRateUpdateInterval = setInterval(calculateSamplingRates, 500);
    },

    stopPolling: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
      if (samplingRateUpdateInterval) {
        clearInterval(samplingRateUpdateInterval);
        samplingRateUpdateInterval = null;
      }
    },

    connectWebSocket: () => {
      const wsManager = get().wsManager;
      if (wsManager) wsManager.connect();
    },
    disconnectWebSocket: () => {
      const wsManager = get().wsManager;
      if (wsManager) wsManager.disconnect();
    },
    sendWebSocketMessage: (message: any) => {
      const wsManager = get().wsManager;
      if (wsManager) wsManager.send(message);
    },
    autoConnectWebSocket: () => {
      const wsManager = get().wsManager;
      if (wsManager) wsManager.startAutoConnect();
    },
    startWebSocketManager: () => {
      console.log('Starting WebSocket Manager now that server is ready.');
      const wsManager = get().wsManager;
      if (wsManager) {
        wsManager.start();
      }
    },
    // Data handling methods
    addEEGData: (data: EEGData[]) => {
      if (data.length > 0) {
        const now = Date.now();
        set((state) => {
          const currentData = state.eegData || [];
          const newState = {
            ...state,
            eegData: [...currentData.slice(-MAX_DATA_POINTS + data.length), ...data],
            lastDataUpdate: now
          };
          return updateSamplingRates(newState);
        });
      }
    },

    addPPGData: (data: PPGData[]) => {
      if (data.length > 0) {
        const now = Date.now();
        set((state) => {
          const currentData = state.ppgData || [];
          const newState = {
            ...state,
            ppgData: [...currentData.slice(-MAX_DATA_POINTS + data.length), ...data],
            lastDataUpdate: now
          };
          return updateSamplingRates(newState);
        });
      }
    },

    addAccData: (data: AccData[]) => {
      if (data.length > 0) {
        const now = Date.now();
        set((state) => {
          const currentData = state.accData || [];
          const newState = {
            ...state,
            accData: [...currentData.slice(-MAX_DATA_POINTS + data.length), ...data],
            lastDataUpdate: now
          };
          return updateSamplingRates(newState);
        });
      }
    },

    addBatData: (data: BatteryData[]) => {
      if (data.length > 0) {
        const now = Date.now();
        set((state) => {
          const currentData = state.batData || [];
          const newState = {
            ...state,
            batData: [...currentData.slice(-MAX_DATA_POINTS + data.length), ...data],
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
    },
  };

  // Make store accessible globally for device manager
  (window as any).engineStore = { getState: get };

  return store;
}); 