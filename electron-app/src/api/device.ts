import axios from 'axios';
import type { DeviceResponse, DeviceStatus, RegisteredDevicesResponse } from '../types/device';

const BASE_URL = 'http://localhost:8000';

const headers = {
  'Content-Type': 'application/json'
};

interface ScanResponse {
  devices: DeviceResponse[];
}

export const deviceApi = {
  scanDevices: async (): Promise<ScanResponse> => {
    const response = await axios.get<ScanResponse>(`${BASE_URL}/device/scan`, { headers });
    return response.data;
  },

  connectDevice: async (address: string): Promise<void> => {
    const body = { address };
    await axios.post(`${BASE_URL}/device/connect`, body, { headers });
  },

  disconnectDevice: async (address: string): Promise<void> => {
    const body = { address };
    await axios.post(`${BASE_URL}/device/disconnect`, body, { headers });
  },

  getDeviceStatus: async (): Promise<DeviceStatus> => {
    const response = await axios.get<DeviceStatus>(`${BASE_URL}/device/status`, { headers });
    return response.data;
  },

  getRegisteredDevices: async (): Promise<RegisteredDevicesResponse> => {
    const response = await axios.get<RegisteredDevicesResponse>(`${BASE_URL}/device/registered_devices`, { headers });
    return response.data;
  },

  registerDevice: async (name: string, address: string): Promise<void> => {
    const body = { name, address };
    await axios.post(`${BASE_URL}/device/register_device`, body, { headers });
  },

  unregisterDevice: async (address: string): Promise<void> => {
    const body = { address };
    await axios.post(`${BASE_URL}/device/unregister_device`, body, { headers });
  }
};
