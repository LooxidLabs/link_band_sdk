import { api } from './interceptor';
import type { DeviceCreate, DeviceResponse, DeviceStatus } from '../types/device';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Custom type guard for Axios errors
const isAxiosError = (error: unknown): error is { message: string; response?: { data: unknown; status: number } } => {
  return typeof error === 'object' && error !== null && 'message' in error;
};

export const deviceApi = {
  // Get all devices for the current user
  getDevices: async (): Promise<DeviceResponse[]> => {
    return api.get(`${API_BASE_URL}/devices`);
  },

  // Scan for available devices
  scanDevices: async (): Promise<DeviceResponse[]> => {
    const response = await api.get(`${API_BASE_URL}/device/scan`);
    return response.data;
  },

  // Connect to a device
  connectDevice: async (address: string): Promise<void> => {
    await api.post(`${API_BASE_URL}/device/connect`, { address });
  },

  // Disconnect from the current device
  disconnectDevice: async (address: string): Promise<void> => {
    await api.post(`${API_BASE_URL}/device/disconnect`, { address });
  },

  // Get current device status
  getDeviceStatus: async (): Promise<DeviceStatus> => {
    try {
      const response = await axios.get<DeviceStatus>(`${API_BASE_URL}/device/status`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error fetching device status:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      } else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  },

  // Register a new device
  registerDevice: async (device: DeviceCreate): Promise<void> => {
    await api.post(`${API_BASE_URL}/device/register`, device);
  },

  // Unregister a device
  unregisterDevice: async (address: string): Promise<void> => {
    await api.post(`${API_BASE_URL}/device/unregister`, { address });
  },

  // Get list of registered devices
  getRegisteredDevices: async (): Promise<DeviceResponse[]> => {
    const response = await api.get(`${API_BASE_URL}/device/registered`);
    return response.data;
  }
};
