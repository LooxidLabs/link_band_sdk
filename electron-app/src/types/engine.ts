export interface EngineStatus {
  status: 'running' | 'stopped';
  clients_connected: number;
  is_streaming: boolean;
  device_connected: boolean;
}

export interface EngineStatusResponse {
  status: string;
  data: EngineStatus;
  timestamp: string;
}

export interface ConnectionInfo {
  status: 'success' | 'error';
  host?: string;
  port?: number;
  ws_url?: string;
  server_status?: 'running' | 'stopped';
  is_streaming: boolean;
  clients_connected: number;
}

export interface ConnectionInfoResponse {
  status: 'success' | 'error';
  host?: string;
  port?: number;
  ws_url?: string;
  server_status?: 'running' | 'stopped';
  is_streaming: boolean;
  clients_connected: number;
} 