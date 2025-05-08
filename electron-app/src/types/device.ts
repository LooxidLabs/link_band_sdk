export interface DeviceBase {
  name: string;
  address?: string;
  device_id?: string;
  status?: string;
}

export interface DeviceCreate extends DeviceBase {
  address: string; // required for creation
}

export interface DeviceUpdate {
  name?: string;
  address?: string;
  status?: string;
}

export interface DeviceResponse extends DeviceBase {
  id: string; // uuid
  user_id: string; // uuid
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}
