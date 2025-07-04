export interface DeviceBase {
  name: string;
  address: string;
}

export interface DeviceCreate extends DeviceBase {
  // Additional fields for device creation if needed
}

export interface DeviceUpdate extends Partial<DeviceBase> {
  // Fields that can be updated
}

export interface DeviceResponse extends DeviceBase {
  // Additional fields from API response if needed
}

export interface RegisteredDevicesResponse {
  devices: DeviceResponse[];
  count: number;
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
  is_connected: boolean;
  device_address: string | null;
  device_name: string | null;
  connection_time: string | null;
  battery_level: number | null;
  eeg_sampling_rate?: number;
  ppg_sampling_rate?: number;
  acc_sampling_rate?: number;
  bat_sampling_rate?: number;
}

export interface DeviceStatusResponse {
  status: DeviceStatus;
  data: any; // Replace with specific data type if needed
}
