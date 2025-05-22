import { create } from 'zustand';
import { metricsApi } from '../api/metrics';
import { deviceApi } from '../api/device';
import { engineApi } from '../api/engine';
import type { SystemMetrics } from '../types/metrics';
import type { DeviceStatus } from '../types/device';
import type { EngineStatus } from '../types/engine';

interface MetricsState {
  // System metrics
  systemMetrics: SystemMetrics | null;
  // Device status
  deviceStatus: DeviceStatus | null;
  // Engine status
  engineStatus: EngineStatus | null;
  // Engine stopped state
  isEngineStopped: boolean;
  // Loading states
  isLoading: {
    system: boolean;
    device: boolean;
    engine: boolean;
  };
  // Error states
  errors: {
    system: string | null;
    device: string | null;
    engine: string | null;
  };
  // Actions
  startPolling: () => void;
  stopPolling: () => void;
}

export const useMetricsStore = create<MetricsState>((set, get) => {
  let pollingInterval: NodeJS.Timeout | null = null;

  const updateSystemMetrics = async () => {
    try {
      set(state => ({ isLoading: { ...state.isLoading, system: true } }));
      const response = await metricsApi.getMetrics();
      set(state => ({
        systemMetrics: response.data,
        isLoading: { ...state.isLoading, system: false },
        errors: { ...state.errors, system: null }
      }));
    } catch (error) {
      set(state => ({
        systemMetrics: null,
        isLoading: { ...state.isLoading, system: false },
        errors: { ...state.errors, system: error instanceof Error ? error.message : 'Unknown error' }
      }));
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
    } catch (error) {
      set(state => ({
        isLoading: { ...state.isLoading, device: false },
        errors: { ...state.errors, device: error instanceof Error ? error.message : 'Unknown error' }
      }));
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
    } catch (error) {
      set(state => ({
        isEngineStopped: true,
        isLoading: { ...state.isLoading, engine: false },
        errors: { ...state.errors, engine: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }
  };

  return {
    // Initial state
    systemMetrics: null,
    deviceStatus: null,
    engineStatus: null,
    isEngineStopped: true,
    isLoading: {
      system: false,
      device: false,
      engine: false
    },
    errors: {
      system: null,
      device: null,
      engine: null
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

      // Start polling every second
      pollingInterval = setInterval(() => {
        updateSystemMetrics();
        updateDeviceStatus();
        updateEngineStatus();
      }, 1000);
    },

    stopPolling: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    }
  };
}); 