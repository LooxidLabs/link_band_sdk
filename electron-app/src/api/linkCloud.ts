import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/v1';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface SensorData {
  eeg: any[];
  ppg: any[];
  acc: any[];
  battery: number | null;
  timestamp: number;
}

class LinkCloudAPI {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders() {
    if (!this.token) {
      throw new Error('No authentication token provided');
    }
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  // User APIs
  async getCurrentUser(): Promise<User> {
    const response = await axios.get<User>(`${BASE_URL}/users/me`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  // Device APIs
  async getDevices(): Promise<Device[]> {
    const response = await axios.get<Device[]>(`${BASE_URL}/devices`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async registerDevice(device: Omit<Device, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Device> {
    const response = await axios.post<Device>(`${BASE_URL}/devices`, device, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async updateDevice(deviceId: string, device: Partial<Device>): Promise<Device> {
    const response = await axios.put<Device>(`${BASE_URL}/devices/${deviceId}`, device, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await axios.delete(`${BASE_URL}/devices/${deviceId}`, {
      headers: this.getHeaders(),
    });
  }

  // Streaming APIs
  async startStreaming(deviceId: string): Promise<void> {
    await axios.post(`${BASE_URL}/devices/${deviceId}/stream/start`, {}, {
      headers: this.getHeaders(),
    });
  }

  async stopStreaming(deviceId: string): Promise<void> {
    await axios.post(`${BASE_URL}/devices/${deviceId}/stream/stop`, {}, {
      headers: this.getHeaders(),
    });
  }

  async sendSensorData(deviceId: string, data: SensorData): Promise<void> {
    await axios.post(`${BASE_URL}/devices/${deviceId}/data`, data, {
      headers: this.getHeaders(),
    });
  }
}

export const linkCloudAPI = new LinkCloudAPI(); 