import { create } from 'zustand';
import { metricsApi } from '../api/metrics';
import { deviceApi } from '../api/device';
import { engineApi } from '../api/engine';
import type { SystemMetrics } from '../types/metrics';
import type { DeviceStatus } from '../types/device';
import type { ConnectionInfo, EngineStatus } from '../types/engine';

interface MetricsState {
  // System metrics
  systemMetrics: SystemMetrics | null;
  // Device status
  deviceStatus: DeviceStatus | null;
  // Engine status
  engineStatus: EngineStatus | null;
  // Engine connection Info
  connectionInfo: ConnectionInfo | null;
  // Engine stopped state
  isEngineStopped: boolean;
  // Loading states
  isLoading: {
    system: boolean;
    device: boolean;  
    engine: boolean;
    connection: boolean;
  };
  // Error states
  errors: {
    system: string | null;
    device: string | null;
    engine: string | null;
    connection: string | null;
  };
  // Actions
  startPolling: () => void;
  stopPolling: () => void;
}

const POLLING_INTERVAL = 1000;
const ERROR_THRESHOLD = 3;
const ERROR_RESET_DELAY = 5000;

export const useMetricsStore = create<MetricsState>((set) => {
  let pollingInterval: NodeJS.Timeout | null = null;
  let errorCount = 0;
  let lastErrorTime = 0;

  const updateSystemMetrics = async () => {
    try {
      set(state => ({ isLoading: { ...state.isLoading, system: true } }));
      const response = await metricsApi.getMetrics();
      set(state => ({
        systemMetrics: response.data,
        isLoading: { ...state.isLoading, system: false },
        errors: { ...state.errors, system: null }
      }));
      errorCount = 0;
    } catch (error) {
      const now = Date.now();
      if (now - lastErrorTime > ERROR_RESET_DELAY) {
        errorCount = 0;
      }
      errorCount++;
      lastErrorTime = now;

      if (errorCount >= ERROR_THRESHOLD) {
        set(state => ({
          systemMetrics: state.systemMetrics, // Keep existing data
          isLoading: { ...state.isLoading, system: false },
          errors: { ...state.errors, system: error instanceof Error ? error.message : 'Unknown error' }
        }));
      }
    }
  };

  const updateDeviceStatus = async () => {
    try {
      set(state => ({ isLoading: { ...state.isLoading, device: true } }));
      const status = await deviceApi.getDeviceStatus();
      set(state => ({
        deviceStatus: status,
        isLoading: { ...state.isLoading, device: false },
        errors: { ...state.errors, device: null }
      }));
      errorCount = 0;
    } catch (error) {
      const now = Date.now();
      if (now - lastErrorTime > ERROR_RESET_DELAY) {
        errorCount = 0;
      }
      errorCount++;
      lastErrorTime = now;

      if (errorCount >= ERROR_THRESHOLD) {
        set(state => ({
          deviceStatus: state.deviceStatus, // Keep existing data
          isLoading: { ...state.isLoading, device: false },
          errors: { ...state.errors, device: error instanceof Error ? error.message : 'Unknown error' }
        }));
      }
    }
  };

  const updateEngineStatus = async () => {
    try {
      set(state => ({ isLoading: { ...state.isLoading, engine: true } }));
      const status = await engineApi.getEngineStatus();
      set(state => ({
        engineStatus: status,
        isEngineStopped: false,
        isLoading: { ...state.isLoading, engine: false },
        errors: { ...state.errors, engine: null }
      }));
      errorCount = 0;
    } catch (error) {
      const now = Date.now();
      if (now - lastErrorTime > ERROR_RESET_DELAY) {
        errorCount = 0;
      }
      errorCount++;
      lastErrorTime = now;

      if (errorCount >= ERROR_THRESHOLD) {
        set(state => ({
          engineStatus: state.engineStatus, // Keep existing data
          isEngineStopped: true,
          isLoading: { ...state.isLoading, engine: false },
          errors: { ...state.errors, engine: error instanceof Error ? error.message : 'Unknown error' }
        }));
      }
    }
  };

  const updateConnectionInfo = async () => {

    try {
      set(state => ({ isLoading: { ...state.isLoading, connection: true } }));
      const info = await engineApi.getConnectionInfo();
      set(state => ({ connectionInfo: info, isLoading: { ...state.isLoading, connection: false } }));
    }
    catch (error) {
      set(state => ({ connectionInfo: null, isLoading: { ...state.isLoading, connection: false } }));
    }
  };

  return {
    // Initial state
    systemMetrics: null,
    deviceStatus: null,
    engineStatus: null,
    connectionInfo: null,
    isEngineStopped: true,
    isLoading: {
      system: false,
      device: false,
      engine: false,
      connection: false
    },
    errors: {
      system: null,
      device: null,
      engine: null,
      connection: null
    },

    // Actions
    startPolling: () => {
      // Clear any existing polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      // Initial updates
      updateSystemMetrics();
      updateDeviceStatus();
      updateEngineStatus();
      updateConnectionInfo();

      // Start polling with debounce
      pollingInterval = setInterval(() => {
        const now = Date.now();
        if (now - lastErrorTime > ERROR_RESET_DELAY) {
          errorCount = 0;
        }
        updateSystemMetrics();
        updateDeviceStatus();
        updateEngineStatus();
        updateConnectionInfo();
      }, POLLING_INTERVAL);
    },

    stopPolling: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
      errorCount = 0;
      lastErrorTime = 0;
    }
  };
}); 