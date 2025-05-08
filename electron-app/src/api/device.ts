import { api } from './interceptor';
import type { DeviceCreate, DeviceUpdate, DeviceResponse } from '../types/device';

const API_BASE_URL = '/api/v1';

export const deviceApi = {
  // Get all devices for the current user
  getDevices: async (): Promise<DeviceResponse[]> => {
    return api.get(`${API_BASE_URL}/devices`);
  },

  // Create a new device
  createDevice: async (device: DeviceCreate): Promise<DeviceResponse> => {
    return api.post(`${API_BASE_URL}/devices`, device);
  },

  // Update a device
  updateDevice: async (device_id: string, update: DeviceUpdate): Promise<DeviceResponse> => {
    return api.put(`${API_BASE_URL}/devices/${device_id}`, update);
  },

  // Delete a device
  deleteDevice: async (device_id: string): Promise<{ message: string }> => {
    return api.delete(`${API_BASE_URL}/devices/${device_id}`);
  },

  // Reset all devices (delete all devices for the user)
  resetDevices: async (): Promise<void> => {
    const devices = await deviceApi.getDevices();
    await Promise.all(devices.map((d) => deviceApi.deleteDevice(d.id)));
  },
};
