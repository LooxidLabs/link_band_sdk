import { create } from 'zustand';
import { deviceApi } from '../api/device';
import type { DeviceResponse, DeviceStatus } from '../types/device';

interface ScannedDevice {
  name: string;
  address: string;
//   rssi: number;
}

// interface ScanResponse {
//   devices: ScannedDevice[];
// }

interface DeviceState {
  // Device list
  registeredDevices: DeviceResponse[];
  scannedDevices: ScannedDevice[];
  // Current device status
  deviceStatus: DeviceStatus | null;
  // Loading states
  isLoading: {
    scan: boolean;
    connect: boolean;
    disconnect: boolean;
    unregister: boolean;
  };
  // Error states
  errors: {
    scan: string | null;
    connect: string | null;
    disconnect: string | null;
    unregister: string | null;
  };
  // Actions
  scanDevices: () => Promise<void>;
  connectDevice: (address: string) => Promise<void>;
  disconnectDevice: (address: string) => Promise<void>;
  getDeviceStatus: () => Promise<void>;
  registerDevice: (name: string, address: string) => Promise<void>;
  getRegisteredDevices: () => Promise<void>;
  unregisterDevice: (address: string) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  clearScannedDevices: () => void;
}

export const useDeviceStore = create<DeviceState>((set, get) => {
  let pollingInterval: NodeJS.Timeout | null = null;

  return {
    // Initial state
    registeredDevices: [],
    scannedDevices: [],
    deviceStatus: null,
    isLoading: {
      scan: false,
      connect: false,
      disconnect: false,
      unregister: false
    },
    errors: {
      scan: null,
      connect: null,
      disconnect: null,
      unregister: null
    },

    // Actions
    scanDevices: async () => {
      set(state => ({ isLoading: { ...state.isLoading, scan: true }, errors: { ...state.errors, scan: null } }));
      try {
        const response = await deviceApi.scanDevices();
        console.log('Scan response:', response);
        set({ scannedDevices: response.devices });
      } catch (error) {
        console.error('Scan error:', error);
        set(state => ({ errors: { ...state.errors, scan: error instanceof Error ? error.message : 'Failed to scan devices' } }));
        throw error;
      } finally {
        set(state => ({ isLoading: { ...state.isLoading, scan: false } }));
      }
    },

    connectDevice: async (address: string) => {
      set(state => ({ isLoading: { ...state.isLoading, connect: true }, errors: { ...state.errors, connect: null } }));
      try {
        await deviceApi.connectDevice(address);
        const status = await deviceApi.getDeviceStatus();
        set({ deviceStatus: status });
      } catch (error) {
        set(state => ({ errors: { ...state.errors, connect: error instanceof Error ? error.message : 'Failed to connect device' } }));
        throw error;
      } finally {
        set(state => ({ isLoading: { ...state.isLoading, connect: false } }));
      }
    },

    disconnectDevice: async (address: string) => {
      set(state => ({ isLoading: { ...state.isLoading, disconnect: true }, errors: { ...state.errors, disconnect: null } }));
      try {
        await deviceApi.disconnectDevice(address);
        set({ deviceStatus: null });
      } catch (error) {
        set(state => ({ errors: { ...state.errors, disconnect: error instanceof Error ? error.message : 'Failed to disconnect device' } }));
        throw error;
      } finally {
        set(state => ({ isLoading: { ...state.isLoading, disconnect: false } }));
      }
    },

    getDeviceStatus: async () => {
      try {
        const status = await deviceApi.getDeviceStatus();
        set({ deviceStatus: status });
      } catch (error) {
        console.error('Failed to get device status:', error);
      }
    },

    getRegisteredDevices: async () => {
      try {
        const response = await deviceApi.getRegisteredDevices();
        set({ registeredDevices: response.devices });
      } catch (error) {
        console.error('Failed to get registered devices:', error);
      }
    },

    registerDevice: async (name: string, address: string) => {
      try {
        await deviceApi.registerDevice(name, address);
        const response = await deviceApi.getRegisteredDevices();
        set({ registeredDevices: response.devices });
      } catch (error) {
        console.error('Failed to register device:', error);
      }
    },

    unregisterDevice: async (address: string) => {
      try {
        await deviceApi.unregisterDevice(address);
        set({ deviceStatus: null, registeredDevices: [] });
      } catch (error) {
        throw error;
      }
    },

    startPolling: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      // Initial fetch
      get().getDeviceStatus();
      get().getRegisteredDevices();

      // Start polling
      pollingInterval = setInterval(() => {
        get().getDeviceStatus();
      }, 1000);
    },

    stopPolling: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    },

    clearScannedDevices: () => {
      set({ scannedDevices: [] });
    }
  };
}); 