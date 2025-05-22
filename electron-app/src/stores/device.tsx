import { create } from 'zustand';
import { deviceApi } from '../api/device';
import type { DeviceResponse, DeviceStatus, DeviceCreate, DeviceUpdate } from '../types/device';

interface DeviceState {
  // Device list
  registeredDevices: DeviceResponse[];
  scannedDevices: DeviceResponse[];
  // Current device status
  deviceStatus: DeviceStatus | null;
  // Loading states
  isLoading: {
    scan: boolean;
    connect: boolean;
    disconnect: boolean;
    status: boolean;
    register: boolean;
    unregister: boolean;
  };
  // Error states
  errors: {
    scan: string | null;
    connect: string | null;
    disconnect: string | null;
    status: string | null;
    register: string | null;
    unregister: string | null;
  };
  // Polling state
  isPolling: boolean;
  // Methods
  scanDevices: () => Promise<void>;
  connectDevice: (address: string) => Promise<void>;
  disconnectDevice: (address: string) => Promise<void>;
  getDeviceStatus: () => Promise<void>;
  registerDevice: (device: DeviceCreate) => Promise<void>;
  unregisterDevice: (address: string) => Promise<void>;
  getRegisteredDevices: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  registeredDevices: [],
  scannedDevices: [],
  deviceStatus: null,
  isLoading: {
    scan: false,
    connect: false,
    disconnect: false,
    status: false,
    register: false,
    unregister: false,
  },
  errors: {
    scan: null,
    connect: null,
    disconnect: null,
    status: null,
    register: null,
    unregister: null,
  },
  isPolling: false,

  scanDevices: async () => {
    set(state => ({ isLoading: { ...state.isLoading, scan: true }, errors: { ...state.errors, scan: null } }));
    try {
      const devices = await deviceApi.scanDevices();
      set({ scannedDevices: devices });
    } catch (error) {
      set(state => ({ errors: { ...state.errors, scan: error instanceof Error ? error.message : 'Failed to scan devices' } }));
    } finally {
      set(state => ({ isLoading: { ...state.isLoading, scan: false } }));
    }
  },

  connectDevice: async (address: string) => {
    set(state => ({ isLoading: { ...state.isLoading, connect: true }, errors: { ...state.errors, connect: null } }));
    try {
      await deviceApi.connectDevice(address);
      await get().getDeviceStatus();
    } catch (error) {
      set(state => ({ errors: { ...state.errors, connect: error instanceof Error ? error.message : 'Failed to connect device' } }));
    } finally {
      set(state => ({ isLoading: { ...state.isLoading, connect: false } }));
    }
  },

  disconnectDevice: async (address: string) => {
    set(state => ({ isLoading: { ...state.isLoading, disconnect: true }, errors: { ...state.errors, disconnect: null } }));
    try {
      await deviceApi.disconnectDevice(address);
      await get().getDeviceStatus();
    } catch (error) {
      set(state => ({ errors: { ...state.errors, disconnect: error instanceof Error ? error.message : 'Failed to disconnect device' } }));
    } finally {
      set(state => ({ isLoading: { ...state.isLoading, disconnect: false } }));
    }
  },

  getDeviceStatus: async () => {
    set(state => ({ isLoading: { ...state.isLoading, status: true }, errors: { ...state.errors, status: null } }));
    try {
      const status = await deviceApi.getDeviceStatus();
      set({ deviceStatus: status });
    } catch (error) {
      set(state => ({ errors: { ...state.errors, status: error instanceof Error ? error.message : 'Failed to get device status' } }));
    } finally {
      set(state => ({ isLoading: { ...state.isLoading, status: false } }));
    }
  },

  registerDevice: async (device: DeviceCreate) => {
    set(state => ({ isLoading: { ...state.isLoading, register: true }, errors: { ...state.errors, register: null } }));
    try {
      await deviceApi.registerDevice(device);
      await get().getRegisteredDevices();
    } catch (error) {
      set(state => ({ errors: { ...state.errors, register: error instanceof Error ? error.message : 'Failed to register device' } }));
    } finally {
      set(state => ({ isLoading: { ...state.isLoading, register: false } }));
    }
  },

  unregisterDevice: async (address: string) => {
    set(state => ({ isLoading: { ...state.isLoading, unregister: true }, errors: { ...state.errors, unregister: null } }));
    try {
      await deviceApi.unregisterDevice(address);
      await get().getRegisteredDevices();
    } catch (error) {
      set(state => ({ errors: { ...state.errors, unregister: error instanceof Error ? error.message : 'Failed to unregister device' } }));
    } finally {
      set(state => ({ isLoading: { ...state.isLoading, unregister: false } }));
    }
  },

  getRegisteredDevices: async () => {
    try {
      const devices = await deviceApi.getRegisteredDevices();
      set({ registeredDevices: devices });
    } catch (error) {
      console.error('Failed to get registered devices:', error);
    }
  },

  startPolling: () => {
    if (get().isPolling) return;
    set({ isPolling: true });

    const poll = async () => {
      if (!get().isPolling) return;
      await get().getDeviceStatus();
      setTimeout(poll, 1000);
    };

    poll();
  },

  stopPolling: () => {
    set({ isPolling: false });
  },
})); 