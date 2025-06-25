import axios from 'axios';
import type { MetricsResponse, SystemMetrics } from '../types/metrics';

const API_BASE_URL = import.meta.env.VITE_LINK_ENGINE_SERVER_URL;

// Backend response type
interface BackendMetricsResponse {
  timestamp: string;
  system: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    uptime: string;
  };
  data_quality: {
    signal_quality: number;
    data_loss_rate: number;
    error_rate: number;
    throughput: number;
  };
  device: {
    connection_stability: number;
    battery_level: number | null;
    signal_strength: number | null;
    device_temperature: number | null;
  };
}

// Custom type guard for Axios errors
const isAxiosError = (error: unknown): error is { message: string; response?: { data: unknown; status: number } } => {
  return typeof error === 'object' && error !== null && 'message' in error;
};

export const metricsApi = {
  /**
   * Get current metrics
   * @returns Promise<MetricsResponse>
   */
  getMetrics: async (): Promise<MetricsResponse> => {
    try {
      const response = await axios.get<BackendMetricsResponse>(`${API_BASE_URL}/metrics/`);
      
      // Transform the backend response to match frontend expectations
      const backendData = response.data;
      const transformedData: SystemMetrics = {
        cpu: backendData.system?.cpu_usage || 0,
        ram: backendData.system?.memory_usage || 0,
        disk: backendData.system?.disk_usage || 0
      };
      
      return {
        status: 'success',
        data: transformedData,
        timestamp: backendData.timestamp || new Date().toISOString()
      };
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error fetching metrics:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      } else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  }
}; 