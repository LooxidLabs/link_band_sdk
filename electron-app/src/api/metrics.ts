import axios from 'axios';
import type { MetricsResponse, SystemMetrics } from '../types/metrics';

const API_BASE_URL = 'http://localhost:8000';

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
      const response = await axios.get<SystemMetrics>(`${API_BASE_URL}/metrics`);
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
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