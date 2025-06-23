import axios from 'axios';
import type { EngineStatus, ConnectionInfoResponse } from '../types/engine';

const API_BASE_URL = import.meta.env.VITE_LINK_ENGINE_SERVER_URL;

// Custom type guard for Axios errors
const isAxiosError = (error: unknown): error is { message: string; response?: { data: unknown; status: number } } => {
  return typeof error === 'object' && error !== null && 'message' in error;
};

export const engineApi = {
  /**
   * Get current engine status
   * @returns Promise<EngineStatus>
   */
  getEngineStatus: async (): Promise<EngineStatus> => {
    try {
      const response = await axios.get<EngineStatus>(`${API_BASE_URL}/stream/status`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error fetching engine status:', error.message);
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

  /**
   * Initialize the engine
   * POST /stream/init
   */
  initEngine: async (): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/stream/init`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error initializing engine:', error.message);
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

  /**
   * Start the engine
   * POST /stream/start
   */
  startEngine: async (): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/stream/start`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error starting engine:', error.message);
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

  /**
   * Stop the engine
   * POST /stream/stop
   */
  stopEngine: async (): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/stream/stop`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error stopping engine:', error.message);
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

  /**
   * Get engine connection info (websocket address and status)
   * GET /stream/info
   */
  getConnectionInfo: async (): Promise<ConnectionInfoResponse> => {
    try {
      const response = await axios.get<ConnectionInfoResponse>(`${API_BASE_URL}/stream/info`);
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        console.error('Error fetching engine connection info:', error.message);
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