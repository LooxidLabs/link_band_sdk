export interface DeviceBase {
  name: string;
  address: string;
  // rssi?: number;
}

export interface DeviceCreate extends DeviceBase {
  // Additional fields for device creation if needed
}

export interface DeviceUpdate {
  name?: string;
  address?: string;
}

export interface DeviceResponse extends DeviceBase {
  // Additional fields from API response if needed
}

export interface ConnectionQuality {
  signal: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Unknown';
  dataRate: number;
  eegRate: number;
  ppgRate: number;
  accRate: number;
  batRate: number;
}

export interface DeviceStatus {
  status: 'connected' | 'disconnected';
  name: string;
  address: string;
  eeg_sampling_rate: number;
  ppg_sampling_rate: number;
  acc_sampling_rate: number;
  bat_sampling_rate: number;
  bat_level: number;
}

export interface DeviceStatusResponse {
  status: string;
  data: DeviceStatus;
  timestamp: string;
}
