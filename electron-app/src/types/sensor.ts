interface BandPowers {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface EEGData {
  timestamp: number;
  ch1_filtered: number[];
  ch2_filtered: number[];
  ch1_leadoff: boolean;
  ch2_leadoff: boolean;
  ch1_sqi: number[];
  ch2_sqi: number[];
  ch1_power: number[];
  ch2_power: number[];
  frequencies: number[];
  ch1_band_powers: BandPowers;
  ch2_band_powers: BandPowers;
  signal_quality: string;
  good_samples_ratio: number;
  total_power: number;
  focus_index: number;
  relaxation_index: number;
  stress_index: number;
  hemispheric_balance: number;
  cognitive_load: number;
  emotional_stability: number;
}

export interface PPGData {
  timestamp: number;
  filtered_ppg: number[];
  ppg_sqi: number[];
  bpm: number;
  sdnn: number;
  rmssd: number;
  pnn50: number;
  sdsd: number;
  hr_mad: number;
  sd1: number;
  sd2: number;
  lf: number;
  hf: number;
  lf_hf_ratio: number;
  signal_quality: string;
  red_mean: number;
  ir_mean: number;
  rr_intervals: number[];
}

export interface AccData {
  timestamp: number;
  x_change: number[];
  y_change: number[];
  z_change: number[];
  avg_movement: number;
  std_movement: number;
  max_movement: number;
  activity_state: string;
  x_change_mean: number;
  y_change_mean: number;
  z_change_mean: number;
}

export interface BatteryData {
  timestamp: number;
  battery_level: number;
  battery_status: string;
}

export interface AuthResponse {
  type: 'auth_response';
  success: boolean;
  message?: string;
}

export interface SensorDataMessage {
  type: 'eeg' | 'ppg' | 'acc' | 'bat';
  timestamp: number;
  data: EEGData | PPGData | AccData | BatteryData;
}

export type SensorData = SensorDataMessage | AuthResponse;

export interface SensorState {
  eeg: EEGData | null;
  ppg: PPGData | null;
  acc: AccData | null;
  bat: BatteryData | null;
  lastUpdate: {
    eeg: number | null;
    ppg: number | null;
    acc: number | null;
    bat: number | null;
  };
  isConnected: boolean;
  error: string | null;
} 