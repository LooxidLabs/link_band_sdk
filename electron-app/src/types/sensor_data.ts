export interface EEGSample {
  timestamp: number;
  eeg_ch1: number;
  eeg_ch2: number;
  leadoff_ch1: number;
  leadoff_ch2: number;
}

export interface PPGSample {
  timestamp: number;
  ppg: number;
}

export interface ACCSample {
  timestamp: number;
  x: number;
  y: number;
  z: number;
}

export interface SensorData {
  battery: number;
  eeg: EEGSample[];
  ppg: PPGSample[];
  acc: ACCSample[];
} 