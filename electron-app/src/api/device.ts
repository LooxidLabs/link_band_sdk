import axios from 'axios';
import type { DeviceResponse, DeviceStatus, RegisteredDevicesResponse } from '../types/device';

const API_BASE_URL = import.meta.env.VITE_LINK_ENGINE_SERVER_URL || 'http://127.0.0.1:8121';

const headers = {
  'Content-Type': 'application/json'
};

interface ScanResponse {
  devices: DeviceResponse[];
}

// Custom type guard for Axios errors
const isAxiosError = (error: unknown): error is { message: string; response?: { data: unknown; status: number } } => {
  return typeof error === 'object' && error !== null && 'message' in error;
};

export const deviceApi = {
  scanDevices: async (): Promise<ScanResponse> => {
    try {
      const response = await axios.get<ScanResponse>(`${API_BASE_URL}/device/scan`, { headers });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error scanning devices:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      } else {
        console.error('Unexpected error during device scan:', error);
      }
      throw error;
    }
  },

  connectDevice: async (address: string): Promise<void> => {
    try {
      const body = { address };
      await axios.post(`${API_BASE_URL}/device/connect`, body, { headers });
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error connecting device:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      } else {
        console.error('Unexpected error during device connection:', error);
      }
      throw error;
    }
  },

  disconnectDevice: async (address: string): Promise<void> => {
    try {
      const body = { address };
      await axios.post(`${API_BASE_URL}/device/disconnect`, body, { headers });
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error disconnecting device:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      } else {
        console.error('Unexpected error during device disconnection:', error);
      }
      throw error;
    }
  },

  getDeviceStatus: async (): Promise<DeviceStatus> => {
    try {
      // console.log("Device API Base URL:", API_BASE_URL);
      const response = await axios.get<DeviceStatus>(`${API_BASE_URL}/device/status`, { headers });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error getting device status:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      } else {
        console.error('Unexpected error getting device status:', error);
      }
      throw error;
    }
  },

  getRegisteredDevices: async (): Promise<RegisteredDevicesResponse> => {
    try {
      const response = await axios.get<RegisteredDevicesResponse>(`${API_BASE_URL}/device/registered_devices`, { headers });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error getting registered devices:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      } else {
        console.error('Unexpected error getting registered devices:', error);
      }
      throw error;
    }
  },

  registerDevice: async (name: string, address: string): Promise<void> => {
    try {
      const body = { name, address };
      await axios.post(`${API_BASE_URL}/device/register_device`, body, { headers });
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error registering device:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      } else {
        console.error('Unexpected error during device registration:', error);
      }
      throw error;
    }
  },

  unregisterDevice: async (address: string): Promise<void> => {
    try {
      const body = { address };
      await axios.post(`${API_BASE_URL}/device/unregister_device`, body, { headers });
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error unregistering device:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      } else {
        console.error('Unexpected error during device unregistration:', error);
      }
      throw error;
    }
  }
};
