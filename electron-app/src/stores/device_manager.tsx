import create from 'zustand';
import { EEGSample, PPGSample, ACCSample, SensorData } from '../types/sensor_data';
import { linkCloudAPI } from '../api/linkCloud';
import { Device as CloudDevice } from '../api/linkCloud';
import useAuthStore from './authStore';

// 고정 길이 큐 유틸
function pushWithLimit<T>(arr: T[], items: T[], limit: number): T[] {
  const newArr = [...arr, ...items];
  return newArr.length > limit ? newArr.slice(newArr.length - limit) : newArr;
}

// 샘플링 속도 계산 함수 (큐 내 상대 시간차 이용, timestamp가 ms 단위라고 가정)
function calcSamplingRateFromQueue(samples: { timestamp: number }[]): number {
  if (samples.length < 2) return 0; // 최소 2개 샘플 필요

  const newestTimestamp = samples[samples.length - 1].timestamp;
  // 가장 최신 샘플 기준 1000ms(1초) 전까지의 샘플 필터링
  const recentSamples = samples.filter(s => newestTimestamp - s.timestamp <= 1000);

  // 필터링된 샘플 개수를 Hz로 반환 (1초 동안의 개수)
  return recentSamples.length;
}

export interface DeviceInfo {
  name: string;
  address: string;
}

const EEG_QUEUE_LEN = 2500; // 250Hz * 10s
const PPG_QUEUE_LEN = 600;  // 60Hz * 10s
const ACC_QUEUE_LEN = 300;  // 30Hz * 10s

export type LeadOffStatus = 'good' | 'bad' | 'unknown';

export type DeviceManagerState = {
  ws: WebSocket | null;
  isConnected: boolean;
  isStreaming: boolean;
  battery: number | null;
  lastBattery: number | null;  // 이전 배터리 값 저장
  scannedDevices: DeviceInfo[];
  registeredDevices: DeviceInfo[];
  connectedDevice: DeviceInfo | null;
  eegSamples: EEGSample[];
  ppgSamples: PPGSample[];
  accSamples: ACCSample[];
  eegRate: number;
  ppgRate: number;
  accRate: number;
  leadOffCh1Status: LeadOffStatus;
  leadOffCh2Status: LeadOffStatus;
  error: string | null;
  clients_connected: number;
  cloudDevices: CloudDevice[];
  syncWithServer: () => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  sendCommand: (command: string, payload?: any) => void;
  scanDevices: () => void;
  connectDevice: (address: string) => void;
  disconnectDevice: () => void;
  checkDeviceConnection: () => void;
  startStreaming: () => void;
  stopStreaming: () => void;
  clearData: () => void;
  updateRegisteredDevices: (devices: DeviceInfo[]) => void;
  updateDeviceInCloud: (device: DeviceInfo) => Promise<void>;
  deleteDeviceInCloud: (address: string) => Promise<void>;
  isBluetoothAvailable: boolean;
  bluetoothError: string | null;
  checkBluetoothStatus: () => void;
};

export const useDeviceManager = create<DeviceManagerState>((set, get) => ({
  ws: null,
  isConnected: false,
  isStreaming: false,
  battery: null,
  lastBattery: null,
  scannedDevices: [],
  registeredDevices: [],
  connectedDevice: null,
  eegSamples: [],
  ppgSamples: [],
  accSamples: [],
  eegRate: 0,
  ppgRate: 0,
  accRate: 0,
  leadOffCh1Status: 'unknown',
  leadOffCh2Status: 'unknown',
  error: null,
  clients_connected: 0,
  cloudDevices: [],
  isBluetoothAvailable: false,
  bluetoothError: null,

  syncWithServer: async () => {
    try {
      // 서버 상태 요청
      const ws = get().ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command: 'get_server_status' }));
      }

      // Link Cloud 동기화는 인증된 상태에서만 시도
      const { user } = useAuthStore.getState();
      if (!user) {
        console.log('Skipping cloud sync: No authenticated user');
        return;
      }

      try {
        const cloudDevices = await linkCloudAPI.getDevices();
        set({ cloudDevices });

        // 로컬 디바이스와 클라우드 디바이스 비교 및 동기화
        const localDevices = get().registeredDevices;
        const localAddresses = new Set(localDevices.map(d => d.address));
        const cloudAddresses = new Set(cloudDevices.map(d => d.address));

        // 클라우드에만 있는 디바이스 추가
        const updatedDevices = [...localDevices];
        for (const cloudDevice of cloudDevices) {
          if (!localAddresses.has(cloudDevice.address)) {
            updatedDevices.push({
              name: cloudDevice.name,
              address: cloudDevice.address
            });
          }
        }

        // 로컬에만 있는 디바이스 클라우드에 등록
        for (const localDevice of localDevices) {
          if (!cloudAddresses.has(localDevice.address)) {
            await linkCloudAPI.registerDevice({
              name: localDevice.name,
              address: localDevice.address
            });
          }
        }

        set({ registeredDevices: updatedDevices });
      } catch (error) {
        console.error('Failed to sync with Link Cloud:', error);
      }
    } catch (error) {
      console.error('Failed to sync with server:', error);
    }
  },

  connect: () => {
    const state = get();
    if (state.ws) {
      console.log("WebSocket already exists.");
      return;
    }
    try {
      const ws = new WebSocket('ws://localhost:8765');
      console.log("WebSocket instance created.");

      ws.onopen = () => {
        console.log("WebSocket connection opened.");
        set({ isConnected: true, error: null });
        // 연결 즉시 블루투스 상태 확인
        state.checkBluetoothStatus();
        state.syncWithServer();
      }

      ws.onclose = () => {
        console.log("WebSocket connection closed.");
        set({ 
          isConnected: false, 
          isStreaming: false, 
          ws: null,
          isBluetoothAvailable: false 
        });
      }

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
        set({ error: 'WebSocket error' });
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'event') {
            if (data.event_type === 'bluetooth_status') {
              set({ 
                isBluetoothAvailable: data.data.available,
                bluetoothError: data.data.available ? null : data.data.message
              });
            } else if (data.event_type === 'scan_result') {
              set({ scannedDevices: data.data.devices || [] });
            } else if (data.event_type === 'device_connected') {
              set({ connectedDevice: data.data.device_info || null });
            } else if (data.event_type === 'device_disconnected') {
              set({ connectedDevice: null, isStreaming: false });
            } else if (data.event_type === 'error') {
              set({ error: data.data?.message || 'Unknown error' });
            } else if (data.event_type === 'data_acquisition_started') {
              set({ isStreaming: true });
            } else if (data.event_type === 'data_acquisition_stopped') {
              set({ isStreaming: false });
            } else if (data.event_type === 'device_info') {
              set({
                battery: data.data?.battery ?? get().battery,
                connectedDevice: data.data?.device_info || get().connectedDevice,
                clients_connected: data.data?.clients_connected || 0,
                registeredDevices: data.data?.registered_devices || get().registeredDevices,
              });
            }
          } else if (data.type === 'sensor_data') {
            console.log("Received sensor_data:", data);
            set((state) => {
              const newEEGSamples = pushWithLimit(state.eegSamples, data.eeg || [], EEG_QUEUE_LEN);
              const newPPGSamples = pushWithLimit(state.ppgSamples, data.ppg || [], PPG_QUEUE_LEN);
              const newACCSamples = pushWithLimit(state.accSamples, data.acc || [], ACC_QUEUE_LEN);

              // 가장 최근 샘플과 가장 오래된 샘플 사이의 시간 차이를 이용하여 샘플링 레이트 계산
              const getRate = (samples: { timestamp: number }[]) => {
                if (samples.length < 2) return 0;
                const newestTimestamp = samples[samples.length - 1].timestamp;
                const oldestTimestamp = samples[0].timestamp;
                const timeDiffInSeconds = (newestTimestamp - oldestTimestamp) / 1000; // ms to seconds
                if (timeDiffInSeconds <= 0) return 0;
                return samples.length / (timeDiffInSeconds*1000);
              };

              const eegRate = getRate(newEEGSamples);
              const ppgRate = getRate(newPPGSamples);
              const accRate = getRate(newACCSamples);

              console.log("Calculated rates:", { eegRate, ppgRate, accRate });

              // 리드오프 상태 업데이트
              let leadOffCh1: LeadOffStatus = state.leadOffCh1Status;
              let leadOffCh2: LeadOffStatus = state.leadOffCh2Status;
              if (data.eeg && data.eeg.length > 0) {
                const lastEEGSample = data.eeg[data.eeg.length - 1];
                leadOffCh1 = lastEEGSample.leadoff_ch1 === 0 ? 'good' : 'bad';
                leadOffCh2 = lastEEGSample.leadoff_ch2 === 0 ? 'good' : 'bad';
              }

              return {
                battery: data.battery ?? state.battery,
                eegSamples: newEEGSamples,
                ppgSamples: newPPGSamples,
                accSamples: newACCSamples,
                eegRate,
                ppgRate,
                accRate,
                leadOffCh1Status: leadOffCh1,
                leadOffCh2Status: leadOffCh2,
              };
            });
          }
        } catch (e) {
          console.error("Error processing WebSocket message:", e);
          set({ error: 'Invalid message from server' });
        }
      };
      set({ ws });
    } catch (error) {
      console.error("Failed to create WebSocket instance:", error);
      set({ error: 'Failed to create WebSocket' });
    }
  },

  disconnect: () => {
    get().ws?.close();
    set({ ws: null, isConnected: false, isStreaming: false });
  },

  sendCommand: (command, payload) => {
    const ws = get().ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload ? { command, payload } : { command }));
    } else {
      set({ error: 'WebSocket이 연결되어 있지 않습니다.' });
    }
  },

  scanDevices: () => {
    const ws = get().ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      set({ error: 'WebSocket이 연결되어 있지 않습니다.' });
      return;
    }
    get().sendCommand('scan_devices');
  },
  connectDevice: (address) => {
    const ws = get().ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      set({ error: 'WebSocket이 연결되어 있지 않습니다.' });
      return;
    }
    get().sendCommand('connect_device', { address });
  },
  disconnectDevice: () => {
    const ws = get().ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      set({ error: 'WebSocket이 연결되어 있지 않습니다.' });
      return;
    }
    get().sendCommand('disconnect_device');
  },
  checkDeviceConnection: () => {
    const ws = get().ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      set({ error: 'WebSocket이 연결되어 있지 않습니다.' });
      return;
    }
    get().sendCommand('check_device_connection');
  },
  startStreaming: () => {
    const ws = get().ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      set({ error: 'WebSocket이 연결되어 있지 않습니다.' });
      return;
    }
    get().sendCommand('start_streaming');
  },
  stopStreaming: () => {
    const ws = get().ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      set({ error: 'WebSocket이 연결되어 있지 않습니다.' });
      return;
    }
    get().sendCommand('stop_streaming');
  },
  clearData: () => set({
    eegSamples: [], ppgSamples: [], accSamples: [],
    eegRate: 0, ppgRate: 0, accRate: 0,
    leadOffCh1Status: 'unknown', leadOffCh2Status: 'unknown'
  }),
  updateRegisteredDevices: async (devices: DeviceInfo[]) => {
    set({ registeredDevices: devices });
    const { user } = useAuthStore.getState();
    if (user) {
      // 각 디바이스를 클라우드에 등록/업데이트
      for (const device of devices) {
        await get().updateDeviceInCloud(device);
      }
    }
  },
  updateDeviceInCloud: async (device: DeviceInfo) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const cloudDevice = get().cloudDevices.find(d => d.address === device.address);
      if (cloudDevice) {
        await linkCloudAPI.updateDevice(cloudDevice.id, {
          name: device.name,
          address: device.address
        });
      } else {
        await linkCloudAPI.registerDevice({
          name: device.name,
          address: device.address
        });
      }
      // 클라우드 디바이스 목록 갱신
      const cloudDevices = await linkCloudAPI.getDevices();
      set({ cloudDevices });
    } catch (error) {
      console.error('Failed to update device in cloud:', error);
    }
  },
  deleteDeviceInCloud: async (address: string) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const cloudDevice = get().cloudDevices.find(d => d.address === address);
      if (cloudDevice) {
        await linkCloudAPI.deleteDevice(cloudDevice.id);
        // 클라우드 디바이스 목록 갱신
        const cloudDevices = await linkCloudAPI.getDevices();
        set({ cloudDevices });
      }
    } catch (error) {
      console.error('Failed to delete device from cloud:', error);
    }
  },
  checkBluetoothStatus: () => {
    const ws = get().ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      set({ error: 'WebSocket이 연결되어 있지 않습니다.' });
      return;
    }
    get().sendCommand('check_bluetooth_status');
  },
})); 