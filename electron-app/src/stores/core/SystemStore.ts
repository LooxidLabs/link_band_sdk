import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { communicationManager } from '../../services/communication/CommunicationManager';
import { useSensorStore } from '../sensor';
import type { ConnectionStatus } from '../../services/communication/CommunicationManager';

// 디바이스 상태 타입들
export interface DeviceInfo {
  id: string;
  name: string;
  address: string;
  rssi?: number;
  batteryLevel?: number;
  firmwareVersion?: string;
  hardwareVersion?: string;
  isConnected: boolean;
  lastSeen: number;
}

export interface SensorData {
  eeg: {
    raw: number[];
    processed: number[];
    bandPower: { [key: string]: number };
    sqi: number;
    timestamp: number;
  };
  ppg: {
    raw: number[];
    heartRate: number;
    sqi: number;
    timestamp: number;
  };
  acc: {
    x: number[];
    y: number[];
    z: number[];
    timestamp: number;
  };
  battery: {
    level: number;
    voltage: number;
    isCharging: boolean;
    timestamp: number;
  };
}

export interface StreamingStatus {
  isStreaming: boolean;
  startTime: number | null;
  dataCount: {
    eeg: number;
    ppg: number;
    acc: number;
    battery: number;
  };
  errors: string[];
  lastDataReceived: number;
}

export interface RecordingStatus {
  isRecording: boolean;
  sessionId: string | null;
  startTime: number | null;
  duration: number;
  fileSize: number;
  filePath: string | null;
}

export interface MonitoringData {
  systemHealth: number;
  performance: {
    cpuUsage: number;
    memoryUsage: number; // MB 단위
    networkLatency: number;
  };
  alerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: number;
    acknowledged: boolean;
  }>;
}

export interface UIState {
  activeModule: 'device' | 'engine' | 'datacenter' | 'monitoring';
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
    autoClose: boolean;
  }>;
}

// 메인 시스템 상태 인터페이스
export interface SystemState {
  // 연결 상태
  connection: ConnectionStatus;
  
  // 디바이스 상태
  device: {
    current: DeviceInfo | null;
    discovered: DeviceInfo[];
    isScanning: boolean;
    autoConnect: boolean;
    targetAddress: string | null;
  };
  
  // 센서 데이터
  sensors: SensorData;
  
  // 스트리밍 상태
  streaming: StreamingStatus;
  
  // 레코딩 상태
  recording: RecordingStatus;
  
  // 모니터링 데이터
  monitoring: MonitoringData;
  
  // UI 상태
  ui: UIState;
  
  // 시스템 초기화 상태
  initialized: boolean;
  initializationError: string | null;
}

// 액션 인터페이스
export interface SystemActions {
  // 시스템 초기화
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
  
  // 연결 관리
  updateConnectionStatus: (status: ConnectionStatus) => void;
  
  // 디바이스 관리
  startDeviceScan: () => Promise<void>;
  stopDeviceScan: () => Promise<void>;
  connectToDevice: (address: string) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  updateDeviceInfo: (device: Partial<DeviceInfo>) => void;
  addDiscoveredDevice: (device: DeviceInfo) => void;
  setAutoConnect: (enabled: boolean, targetAddress?: string) => void;
  
  // 센서 데이터 관리
  updateSensorData: (sensorType: keyof SensorData, data: any) => void;
  clearSensorData: () => void;
  
  // 스트리밍 상태 동기화 (백엔드에서 자동 제어)
  syncStreamingStatus: (isStreaming: boolean) => void;
  updateStreamingStats: (stats: Partial<StreamingStatus>) => void;
  addStreamingError: (error: string) => void;
  
  // 레코딩 관리
  startRecording: (sessionName?: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  updateRecordingStatus: (status: Partial<RecordingStatus>) => void;
  
  // 모니터링 관리
  updateMonitoringData: (data: Partial<MonitoringData>) => void;
  addAlert: (alert: Omit<MonitoringData['alerts'][0], 'id' | 'timestamp'>) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearAlerts: () => void;
  
  // UI 상태 관리
  setActiveModule: (module: UIState['activeModule']) => void;
  toggleSidebar: () => void;
  setTheme: (theme: UIState['theme']) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;
}

// 초기 상태
const initialState: SystemState = {
  connection: {
    websocket: false,
    api: false,
    overall: 'offline',
    lastCheck: 0
  },
  device: {
    current: null,
    discovered: [],
    isScanning: false,
    autoConnect: false,
    targetAddress: null
  },
  sensors: {
    eeg: {
      raw: [],
      processed: [],
      bandPower: {},
      sqi: 0,
      timestamp: 0
    },
    ppg: {
      raw: [],
      heartRate: 0,
      sqi: 0,
      timestamp: 0
    },
    acc: {
      x: [],
      y: [],
      z: [],
      timestamp: 0
    },
    battery: {
      level: 0,
      voltage: 0,
      isCharging: false,
      timestamp: 0
    }
  },
  streaming: {
    isStreaming: false,
    startTime: null,
    dataCount: {
      eeg: 0,
      ppg: 0,
      acc: 0,
      battery: 0
    },
    errors: [],
    lastDataReceived: 0
  },
  recording: {
    isRecording: false,
    sessionId: null,
    startTime: null,
    duration: 0,
    fileSize: 0,
    filePath: null
  },
  monitoring: {
    systemHealth: 75, // 기본값 설정
    performance: {
      cpuUsage: 15.2, // 기본값 설정
      memoryUsage: 245.7, // MB 단위 기본값
      networkLatency: 12.5 // 기본값 설정
    },
    alerts: []
  },
  ui: {
    activeModule: 'device',
    sidebarCollapsed: false,
    theme: 'light',
    notifications: []
  },
  initialized: false,
  initializationError: null
};

// 전역 초기화 상태 관리 (싱글톤 패턴)
let isInitializing = false;
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// API 폴링 관리
let apiPollingInterval: NodeJS.Timeout | null = null;

// API 폴링 함수
function startApiPolling() {
  if (apiPollingInterval) {
    clearInterval(apiPollingInterval);
  }
  
  // 10초마다 모니터링 데이터 업데이트
  apiPollingInterval = setInterval(async () => {
    try {
      // 실제 시스템 데이터 시뮬레이션 (실제로는 백엔드에서 가져와야 함)
      const cpuUsage = 10 + Math.random() * 20; // 10-30% 사이
      const memoryUsage = 200 + Math.random() * 100; // 200-300MB 사이
      const networkLatency = 5 + Math.random() * 20; // 5-25ms 사이
      const systemHealth = Math.max(50, 100 - (cpuUsage * 0.5) - (memoryUsage > 300 ? 20 : 0));
      
      useSystemStore.getState().updateMonitoringData({
        systemHealth,
        performance: {
          cpuUsage,
          memoryUsage,
          networkLatency
        }
      });
    } catch (error) {
      console.error('[SystemStore] Error in API polling:', error);
    }
  }, 10000); // 10초마다
}

// Zustand 스토어 생성
export const useSystemStore = create<SystemState & SystemActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // 시스템 초기화 (중복 방지)
      initialize: async () => {
        // 이미 초기화되었거나 초기화 중인 경우
        if (isInitialized) {
          console.log('[SystemStore] System already initialized, skipping...');
          return;
        }
        
        if (isInitializing && initializationPromise) {
          console.log('[SystemStore] System initialization in progress, waiting...');
          return initializationPromise;
        }
        
        // 초기화 시작
        isInitializing = true;
        
        initializationPromise = (async () => {
          try {
            console.log('[SystemStore] Initializing system...');
            
            // 통신 매니저 초기화 (기본 연결)
            await communicationManager.initialize();
            
            // 백엔드 시스템 초기화 (스트림 초기화 포함)
            const initResult = await communicationManager.initializeSystem();
            if (!initResult.success) {
              throw new Error(initResult.message);
            }
            
            // 연결 상태 구독
            communicationManager.onStatusChange((status) => {
              set((state) => {
                state.connection = status;
              });
            });
            
            // WebSocket 채널 구독 설정
            setupWebSocketSubscriptions();
            
            // REST API 폴링 시작 (WebSocket 모니터링이 작동하지 않는 경우 대비)
            startApiPolling();
            
            // 현재 디바이스 상태 가져오기
            try {
              const deviceStatus = await communicationManager.getDeviceStatus() as any;
              console.log('[SystemStore] Current device status:', deviceStatus);
              
              if (deviceStatus?.is_connected && deviceStatus?.device_address) {
                useSystemStore.getState().updateDeviceInfo({
                  id: deviceStatus.device_address,
                  name: deviceStatus.device_name || 'Unknown Device',
                  address: deviceStatus.device_address,
                  isConnected: true,
                  batteryLevel: deviceStatus.battery_level,
                  lastSeen: Date.now()
                });
              }
            } catch (error) {
              console.warn('[SystemStore] Failed to get initial device status:', error);
            }
            
            set((state) => {
              state.initialized = true;
              state.initializationError = null;
            });
            
            isInitialized = true;
            console.log('[SystemStore] System initialization completed');
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[SystemStore] System initialization failed:', errorMessage);
            
            set((state) => {
              state.initialized = false;
              state.initializationError = errorMessage;
            });
            
            throw error;
          } finally {
            isInitializing = false;
            initializationPromise = null;
          }
        })();
        
        return initializationPromise;
      },

      shutdown: async () => {
        console.log('[SystemStore] Shutting down system...');
        
        // 레코딩 중지
        if (get().recording.isRecording) {
          await get().stopRecording();
        }
        
        // 디바이스 연결 해제 (백엔드에서 자동으로 스트리밍도 중지됨)
        if (get().device.current?.isConnected) {
          await get().disconnectDevice();
        }
        
        // 통신 매니저 종료
        await communicationManager.shutdown();
        
        // 전역 초기화 상태 리셋
        isInitializing = false;
        isInitialized = false;
        initializationPromise = null;
        
        // 상태 초기화
        set(() => initialState);
        
        console.log('[SystemStore] System shutdown completed');
      },

      // 연결 상태 관리
      updateConnectionStatus: (status) => {
        set((state) => {
          state.connection = status;
        });
      },

      // 디바이스 관리
      startDeviceScan: async () => {
        try {
          set((state) => {
            state.device.isScanning = true;
            state.device.discovered = [];
          });
          
          await communicationManager.scanDevices(10); // 10초 스캔
          
        } catch (error) {
          console.error('[SystemStore] Device scan failed:', error);
          set((state) => {
            state.device.isScanning = false;
          });
          throw error;
        }
      },

      stopDeviceScan: async () => {
        try {
          // 백엔드에 스캔 중지 API가 있다면 사용, 없다면 상태만 업데이트
          set((state) => {
            state.device.isScanning = false;
          });
          
        } catch (error) {
          console.error('[SystemStore] Stop device scan failed:', error);
          throw error;
        }
      },

      connectToDevice: async (address: string) => {
        try {
          set((state) => {
            state.device.current = null; // 연결 시도 중에는 현재 디바이스 클리어
          });

          await communicationManager.connectDevice(address);

          // 연결 성공 후 디바이스 정보 업데이트는 WebSocket을 통해 받을 예정
          console.log(`[SystemStore] Device connection initiated: ${address}`);
        } catch (error) {
          console.error('[SystemStore] Failed to connect to device:', error);
          throw error;
        }
      },

      disconnectDevice: async () => {
        try {
          await communicationManager.disconnectDevice();
          
          set((state) => {
            if (state.device.current) {
              state.device.current.isConnected = false;
            }
            // 백엔드에서 자동으로 스트리밍을 중지하므로 프론트엔드는 상태만 업데이트
            state.streaming.isStreaming = false;
            state.streaming.startTime = null;
            state.streaming.lastDataReceived = 0;
            state.recording.isRecording = false;
          });
          
        } catch (error) {
          console.error('[SystemStore] Device disconnection failed:', error);
          throw error;
        }
      },

      updateDeviceInfo: (deviceUpdate) => {
        set((state) => {
          if (state.device.current) {
            Object.assign(state.device.current, deviceUpdate);
          } else if (deviceUpdate.address || deviceUpdate.id) {
            // 현재 디바이스가 없으면 새로 생성
            state.device.current = {
              id: deviceUpdate.id || deviceUpdate.address || 'unknown',
              name: deviceUpdate.name || 'Unknown Device',
              address: deviceUpdate.address || deviceUpdate.id || 'unknown',
              isConnected: deviceUpdate.isConnected || false,
              batteryLevel: deviceUpdate.batteryLevel,
              lastSeen: Date.now(),
              ...deviceUpdate
            };
          }
          
          console.log('[SystemStore] Device info updated:', state.device.current);
        });
      },

      addDiscoveredDevice: (device) => {
        set((state) => {
          const existingIndex = state.device.discovered.findIndex(d => d.address === device.address);
          if (existingIndex >= 0) {
            state.device.discovered[existingIndex] = device;
          } else {
            state.device.discovered.push(device);
          }
        });
      },

      setAutoConnect: (enabled, targetAddress) => {
        set((state) => {
          state.device.autoConnect = enabled;
          state.device.targetAddress = targetAddress || null;
        });
      },

      // 센서 데이터 관리
      updateSensorData: (sensorType, data) => {
        set((state) => {
          Object.assign(state.sensors[sensorType], data);
          state.streaming.lastDataReceived = Date.now();
          // 데이터 카운트는 raw_data 처리에서만 증가시킴
        });
      },

      clearSensorData: () => {
        set((state) => {
          state.sensors = initialState.sensors;
        });
      },

      // 스트리밍 상태 동기화 (백엔드에서 자동으로 처리되므로 수동 제어 제거)
      // 디바이스 연결 시 → 백엔드가 자동으로 스트리밍 시작
      // 디바이스 해제 시 → 백엔드가 자동으로 스트리밍 중지
      // 프론트엔드는 상태 표시만 담당
      syncStreamingStatus: (isStreaming: boolean) => {
        set((state) => {
          state.streaming.isStreaming = isStreaming;
          if (isStreaming && !state.streaming.startTime) {
            state.streaming.startTime = Date.now();
            state.streaming.dataCount = { eeg: 0, ppg: 0, acc: 0, battery: 0 };
            state.streaming.errors = [];
          } else if (!isStreaming) {
            state.streaming.startTime = null;
          }
        });
      },

      updateStreamingStats: (stats) => {
        set((state) => {
          Object.assign(state.streaming, stats);
        });
      },

      addStreamingError: (error) => {
        set((state) => {
          state.streaming.errors.push(error);
          // 최근 10개 에러만 유지
          if (state.streaming.errors.length > 10) {
            state.streaming.errors.shift();
          }
        });
      },

      // 레코딩 관리
      startRecording: async (sessionName) => {
        try {
          const response = await communicationManager.startRecording(sessionName) as any;
          
          set((state) => {
            state.recording.isRecording = true;
            state.recording.sessionId = response?.sessionId || response?.session_id || null;
            state.recording.startTime = Date.now();
            state.recording.filePath = response?.filePath || response?.file_path || null;
          });
          
        } catch (error) {
          console.error('[SystemStore] Start recording failed:', error);
          throw error;
        }
      },

      stopRecording: async () => {
        try {
          await communicationManager.stopRecording();
          
          set((state) => {
            state.recording.isRecording = false;
            state.recording.sessionId = null;
            state.recording.startTime = null;
          });
          
        } catch (error) {
          console.error('[SystemStore] Stop recording failed:', error);
          throw error;
        }
      },

      updateRecordingStatus: (status) => {
        set((state) => {
          Object.assign(state.recording, status);
        });
      },

      // 모니터링 관리
      updateMonitoringData: (data) => {
        set((state) => {
          Object.assign(state.monitoring, data);
        });
      },

      addAlert: (alert) => {
        set((state) => {
          const newAlert = {
            ...alert,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            acknowledged: false
          };
          state.monitoring.alerts.push(newAlert);
        });
      },

      acknowledgeAlert: (alertId) => {
        set((state) => {
          const alert = state.monitoring.alerts.find(a => a.id === alertId);
          if (alert) {
            alert.acknowledged = true;
          }
        });
      },

      clearAlerts: () => {
        set((state) => {
          state.monitoring.alerts = [];
        });
      },

      // UI 상태 관리
      setActiveModule: (module) => {
        set((state) => {
          state.ui.activeModule = module;
        });
      },

      toggleSidebar: () => {
        set((state) => {
          state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
        });
      },

      setTheme: (theme) => {
        set((state) => {
          state.ui.theme = theme;
        });
      },

      addNotification: (notification) => {
        set((state) => {
          const newNotification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
          };
          state.ui.notifications.push(newNotification);
        });
      },

      removeNotification: (notificationId) => {
        set((state) => {
          state.ui.notifications = state.ui.notifications.filter(n => n.id !== notificationId);
        });
      },

      clearNotifications: () => {
        set((state) => {
          state.ui.notifications = [];
        });
      }
    }))
  )
);

// WebSocket 구독 설정
function setupWebSocketSubscriptions() {
  console.log('[SystemStore] Setting up WebSocket subscriptions...');
  
  // Raw 데이터 구독
  console.log('[SystemStore] Setting up raw data subscription...');
  communicationManager.subscribeToChannel('raw_data', (message) => {
    console.log('[SystemStore] Raw data message received:', message);
    
    if (message.type === 'raw_data') {
      const { sensor_type, data } = message;
      console.log(`[SystemStore] Processing raw_data for ${sensor_type}:`, data);
      
      // 데이터 수신 시 스트리밍 상태 자동 동기화
      useSystemStore.getState().syncStreamingStatus(true);
      useSystemStore.getState().updateStreamingStats({
        lastDataReceived: Date.now()
      });
      
      // 데이터 수신 시 디바이스 연결 상태 자동 업데이트
      const currentState = useSystemStore.getState();
      if (!currentState.device.current && currentState.device.discovered.length > 0) {
        // 데이터를 받고 있다는 것은 디바이스가 연결되어 있다는 의미
        // discovered 배열의 첫 번째 디바이스를 current로 설정
        const deviceToConnect = currentState.device.discovered[0];
        console.log('[SystemStore] Auto-connecting device due to data reception:', deviceToConnect.name);
        
        useSystemStore.getState().updateDeviceInfo({
          ...deviceToConnect,
          isConnected: true,
          lastSeen: Date.now()
        });
      }
      
      // 데이터 카운트 증가
      const newDataCount = { ...currentState.streaming.dataCount };
      
      switch (sensor_type) {
        case 'eeg':
          newDataCount.eeg++;
          useSystemStore.getState().updateSensorData('eeg', {
            raw: data,
            processed: currentState.sensors.eeg.processed,
            timestamp: Date.now()
          });
          break;
        case 'ppg':
          newDataCount.ppg++;
          useSystemStore.getState().updateSensorData('ppg', {
            raw: data,
            heartRate: currentState.sensors.ppg.heartRate,
            timestamp: Date.now()
          });
          break;
        case 'acc':
          newDataCount.acc++;
          useSystemStore.getState().updateSensorData('acc', {
            x: data.map((d: any) => d.x || 0),
            y: data.map((d: any) => d.y || 0),
            z: data.map((d: any) => d.z || 0),
            timestamp: Date.now()
          });
          break;
        case 'battery':
          newDataCount.battery++;
          useSystemStore.getState().updateSensorData('battery', {
            level: data.level || 0,
            voltage: data.voltage || 0,
            isCharging: data.isCharging || false,
            timestamp: Date.now()
          });
          break;
      }
      
      // 데이터 카운트 업데이트
      useSystemStore.getState().updateStreamingStats({ dataCount: newDataCount });
      
      console.log(`[SystemStore] Updated ${sensor_type} raw data, new count:`, newDataCount[sensor_type as keyof typeof newDataCount]);
    }
  });

  // Processed 데이터 구독
  console.log('[SystemStore] Setting up processed data subscription...');
  communicationManager.subscribeToChannel('processed_data', (message) => {
    console.log('[SystemStore] Processed data message received:', message);
    
    if (message.type === 'processed_data') {
      const { sensor_type, data } = message;
      console.log(`[SystemStore] Processing processed_data for ${sensor_type}:`, data);
      
      // 현재 상태 가져오기
      const currentState = useSystemStore.getState();
      
      switch (sensor_type) {
        case 'eeg':
          useSystemStore.getState().updateSensorData('eeg', {
            raw: currentState.sensors.eeg.raw,
            processed: data,
            timestamp: Date.now()
          });
          
          // useSensorStore로도 데이터 전달
          const eegData = {
            timestamp: data[0].timestamp,
            ch1_filtered: data[0].ch1_filtered || [],
            ch2_filtered: data[0].ch2_filtered || [],
            ch1_leadoff: data[0].ch1_leadoff || false,
            ch2_leadoff: data[0].ch2_leadoff || false,
            ch1_sqi: data[0].ch1_sqi || [],
            ch2_sqi: data[0].ch2_sqi || [],
            ch1_power: data[0].ch1_power || [],
            ch2_power: data[0].ch2_power || [],
            frequencies: data[0].frequencies || [],
            ch1_band_powers: data[0].ch1_band_powers || { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
            ch2_band_powers: data[0].ch2_band_powers || { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
            signal_quality: data[0].signal_quality || 'poor',
            good_samples_ratio: data[0].good_samples_ratio || 0,
            total_power: data[0].total_power || 0,
            focus_index: data[0].focus_index || 0,
            relaxation_index: data[0].relaxation_index || 0,
            stress_index: data[0].stress_index || 0,
            hemispheric_balance: data[0].hemispheric_balance || 0,
            cognitive_load: data[0].cognitive_load || 0,
            emotional_stability: data[0].emotional_stability || 0
          };
          useSensorStore.getState().updateSensorData({
            type: 'eeg',
            timestamp: message.timestamp,
            data: eegData
          });
          break;
        case 'ppg':
          useSystemStore.getState().updateSensorData('ppg', {
            raw: currentState.sensors.ppg.raw,
            heartRate: data.bpm || 0,
            timestamp: Date.now()
          });
          
          // useSensorStore로도 데이터 전달
          const ppgData = {
            timestamp: data[0].timestamp,
            filtered_ppg: data[0].filtered_ppg || [],
            ppg_sqi: data[0].ppg_sqi || [],
            bpm: data[0].bpm || 0,
            sdnn: data[0].sdnn || 0,
            rmssd: data[0].rmssd || 0,
            pnn50: data[0].pnn50 || 0,
            sdsd: data[0].sdsd || 0,
            hr_mad: data[0].hr_mad || 0,
            sd1: data[0].sd1 || 0,
            sd2: data[0].sd2 || 0,
            lf: data[0].lf || 0,
            hf: data[0].hf || 0,
            lf_hf_ratio: data[0].lf_hf || 0,
            signal_quality: data[0].signal_quality || 'poor',
            red_mean: data[0].red_mean || 0,
            ir_mean: data[0].ir_mean || 0,
            rr_intervals: data[0].rr_intervals || []
          };
          useSensorStore.getState().updateSensorData({
            type: 'ppg',
            timestamp: message.timestamp,
            data: ppgData
          });
          break;
        case 'acc':
          useSystemStore.getState().updateSensorData('acc', {
            x: currentState.sensors.acc.x,
            y: currentState.sensors.acc.y,
            z: currentState.sensors.acc.z,
            timestamp: Date.now()
          });
          
          // useSensorStore로도 데이터 전달
          const accData = {
            timestamp: data[0].timestamp,
            x_change: data[0].x_change || [],
            y_change: data[0].y_change || [],
            z_change: data[0].z_change || [],
            avg_movement: data[0].avg_movement || 0,
            std_movement: data[0].std_movement || 0,
            max_movement: data[0].max_movement || 0,
            activity_state: data[0].activity_state || 'stationary',
            x_change_mean: data[0].x_change_mean || 0,
            y_change_mean: data[0].y_change_mean || 0,
            z_change_mean: data[0].z_change_mean || 0
          };
          useSensorStore.getState().updateSensorData({
            type: 'acc',
            timestamp: message.timestamp,
            data: accData
          });
          break;
      }
      
      console.log(`[SystemStore] Updated ${sensor_type} processed data`);
    }
  });

  // 디바이스 이벤트 구독 - 실제로는 event 타입으로 전송됨
  console.log('[SystemStore] Setting up device events subscription...');
  communicationManager.subscribeToChannel('event', (message) => {
    console.log('[SystemStore] Device event message received:', message);
    
    if (message.type === 'event') {
      const { event_type, data } = message;
      console.log(`[SystemStore] Processing event: ${event_type}`, data);
      
      switch (event_type) {
        case 'device_connected':
          console.log('[SystemStore] Device connected event:', data);
          if (data.device_address || data.device_info?.address) {
            const deviceInfo = {
              id: data.device_address || data.device_info?.address || 'unknown',
              name: data.device_info?.name || 'Link Band 2.0',
              address: data.device_address || data.device_info?.address || 'unknown',
              isConnected: true,
              batteryLevel: data.device_info?.battery_level,
              lastSeen: Date.now()
            };
            useSystemStore.getState().updateDeviceInfo(deviceInfo);
          }
          break;
          
        case 'device_disconnected':
          console.log('[SystemStore] Device disconnected event:', data);
          const currentState = useSystemStore.getState();
          if (currentState.device.current) {
            useSystemStore.getState().updateDeviceInfo({
              isConnected: false,
              lastSeen: Date.now()
            });
          }
          break;
          
        case 'device_info':
          console.log('[SystemStore] Processing device_info event:', data);
          
          // 스트리밍 상태 동기화
          if (typeof data.is_streaming === 'boolean') {
            useSystemStore.getState().syncStreamingStatus(data.is_streaming);
          }
          
          // 디바이스 연결 상태 업데이트
          if (data.connected && data.device_info) {
            // 디바이스가 연결되어 있는 경우
            const deviceInfo = {
              id: data.device_info.address || data.device_info.name,
              name: data.device_info.name,
              address: data.device_info.address,
              isConnected: true,
              batteryLevel: data.device_info.battery_level,
              lastSeen: Date.now()
            };
            useSystemStore.getState().updateDeviceInfo(deviceInfo);
          } else if (data.connected === false) {
            // 디바이스가 연결되지 않은 경우
            const currentState = useSystemStore.getState();
            if (currentState.device.current) {
              useSystemStore.getState().updateDeviceInfo({
                isConnected: false,
                lastSeen: Date.now()
              });
            } else {
              // 현재 디바이스가 없으면 상태를 클리어
              useSystemStore.getState().updateStreamingStats({
                isStreaming: false,
                dataCount: { eeg: 0, ppg: 0, acc: 0, battery: 0 },
                lastDataReceived: 0
              });
            }
          }
          
          // 등록된 디바이스 정보 업데이트 (발견된 디바이스 목록)
          if (data.registered_devices && Array.isArray(data.registered_devices)) {
            data.registered_devices.forEach((device: any) => {
              if (device.name && device.address) {
                const discoveredDevice = {
                  id: device.address,
                  name: device.name,
                  address: device.address,
                  isConnected: false, // 등록된 디바이스는 발견된 것이지 연결된 것은 아님
                  lastSeen: Date.now()
                };
                useSystemStore.getState().addDiscoveredDevice(discoveredDevice);
              }
            });
          }
          break;
          
        case 'bluetooth_status':
          console.log('[SystemStore] Bluetooth status update:', data);
          break;
          
        case 'device_discovered':
          if (data.address && data.name) {
            const discoveredDevice = {
              id: data.address,
              name: data.name,
              address: data.address,
              rssi: data.rssi,
              isConnected: false,
              lastSeen: Date.now()
            };
            useSystemStore.getState().addDiscoveredDevice(discoveredDevice);
          }
          break;
      }
    }
  });

  // 스트리밍 이벤트 구독
  console.log('[SystemStore] Setting up stream events subscription...');
  communicationManager.subscribeToChannel('stream_event', (message) => {
    console.log('[SystemStore] Stream event message received:', message);
    
    if (message.type === 'stream_event') {
      const { event_type, data } = message.data;
      switch (event_type) {
        case 'stream_started':
          useSystemStore.getState().syncStreamingStatus(true);
          break;
        case 'stream_stopped':
          useSystemStore.getState().syncStreamingStatus(false);
          break;
        case 'stream_error':
          useSystemStore.getState().addStreamingError(data.error || 'Unknown streaming error');
          break;
      }
    }
  });

  // 모니터링 메트릭 구독 (Priority 4 시스템)
  console.log('[SystemStore] Setting up monitoring metrics subscription...');
  communicationManager.subscribeToMonitoringMetrics((message) => {
    console.log('[SystemStore] Raw monitoring message received:', message);
    
    if (message.type === 'monitoring_metrics') {
      console.log('[SystemStore] Processing monitoring_metrics message:', message.data);
      
      const { system, streaming, health_score } = message.data;
      
      // health_score가 객체인 경우 overall_score 값 사용
      let healthValue = 0;
      if (typeof health_score === 'object' && health_score?.overall_score !== undefined) {
        healthValue = health_score.overall_score;
      } else if (typeof health_score === 'number') {
        healthValue = health_score;
      }
      
      // 시스템 데이터 상세 로그
      console.log('[SystemStore] System data details:', {
        cpu_percent: system?.cpu_percent,
        memory_percent: system?.memory_percent,
        memory_used_mb: system?.memory_used_mb,
        process_memory_mb: system?.process_memory_mb
      });
      
      const monitoringUpdate = {
        systemHealth: healthValue,
        performance: {
          cpuUsage: system?.cpu_percent || 0,
          memoryUsage: system?.process_memory_mb || 0, // MB 단위로 변경
          networkLatency: streaming?.total_latency || 0
        }
      };
      
      console.log('[SystemStore] Updating monitoring data:', monitoringUpdate);
      
      useSystemStore.getState().updateMonitoringData(monitoringUpdate);
      
      console.log('[SystemStore] Monitoring data updated successfully. Current state:', 
        useSystemStore.getState().monitoring);
    } else {
      console.log('[SystemStore] Non-monitoring message received:', message.type);
    }
  });
  console.log('[SystemStore] Monitoring metrics subscription setup complete');

  // 시스템 알림 구독 (Priority 4 시스템)
  console.log('[SystemStore] Setting up system alerts subscription...');
  communicationManager.subscribeToSystemAlerts((message) => {
    if (message.type === 'system_alerts') {
      const alertData = message.data;
      useSystemStore.getState().addAlert({
        level: alertData.level?.toLowerCase() as 'info' | 'warning' | 'error' | 'critical',
        message: alertData.message || 'System alert',
        acknowledged: false
      });
    }
  });

  // 건강 상태 업데이트 구독 (Priority 4 시스템)
  console.log('[SystemStore] Setting up health updates subscription...');
  communicationManager.subscribeToHealthUpdates((message) => {
    if (message.type === 'health_updates') {
      const { health_score } = message.data;
      
      // health_score가 객체인 경우 overall_score 값 사용
      let healthValue = 0;
      if (typeof health_score === 'object' && health_score?.overall_score !== undefined) {
        healthValue = health_score.overall_score;
      } else if (typeof health_score === 'number') {
        healthValue = health_score;
      }
      
      useSystemStore.getState().updateMonitoringData({
        systemHealth: healthValue
      });
    }
  });

  // 버퍼 상태 구독 (Priority 4 시스템)
  console.log('[SystemStore] Setting up buffer status subscription...');
  communicationManager.subscribeToBufferStatus((message) => {
    if (message.type === 'buffer_status') {
      // 버퍼 상태 정보를 모니터링 데이터에 추가할 수 있음
      console.log('[SystemStore] Buffer status update:', message.data);
    }
  });

  // 배치 상태 구독 (Priority 4 시스템)
  console.log('[SystemStore] Setting up batch status subscription...');
  communicationManager.subscribeToBatchStatus((message) => {
    if (message.type === 'batch_status') {
      // 배치 처리 상태 정보를 모니터링 데이터에 추가할 수 있음
      console.log('[SystemStore] Batch status update:', message.data);
    }
  });
  
  console.log('[SystemStore] All WebSocket subscriptions setup complete');
}

// 편의 선택자들
export const useConnectionStatus = () => useSystemStore((state) => state.connection);
export const useDeviceState = () => useSystemStore((state) => state.device);
export const useSensorData = () => useSystemStore((state) => state.sensors);
export const useStreamingStatus = () => useSystemStore((state) => state.streaming);
export const useRecordingStatus = () => useSystemStore((state) => state.recording);
export const useMonitoringData = () => useSystemStore((state) => state.monitoring);
export const useUIState = () => useSystemStore((state) => state.ui); 