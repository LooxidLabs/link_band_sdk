import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SensorState, SensorData, EEGData, PPGData, AccData, BatteryData } from '../types/sensor';

interface SensorStore extends SensorState {
  // Actions
  updateSensorData: (data: SensorData) => void;
  resetSensorData: () => void;
  setError: (error: string | null) => void;
  setConnected: (isConnected: boolean) => void;
}

const initialState: SensorState = {
  eeg: null,
  ppg: null,
  acc: null,
  bat: null,
  lastUpdate: {
    eeg: null,
    ppg: null,
    acc: null,
    bat: null,
  },
  isConnected: false,
  error: null,
};

const useSensorStore = create<SensorStore>()(
  devtools(
    (set) => ({
      ...initialState,

      updateSensorData: (data: SensorData) => {
        set((state) => {
          const newState = { ...state };
          
          switch (data.type) {
            case 'eeg':
              newState.eeg = data.data as EEGData;
              newState.lastUpdate.eeg = data.timestamp;
              // console.log(newState.eeg.ch1_leadoff);
              break;
            case 'ppg':
              const ppgData = data.data as PPGData;
              // Replace NaN values with 0
              if (isNaN(ppgData.rmssd)) {
                ppgData.rmssd = 0;
              }
              newState.ppg = ppgData;
              newState.lastUpdate.ppg = data.timestamp;
              break;
            case 'acc':
              newState.acc = data.data as AccData;
              newState.lastUpdate.acc = data.timestamp;
              break;
            case 'bat':
              newState.bat = data.data as BatteryData;
              newState.lastUpdate.bat = data.timestamp;
              break;
          }
          
          return newState;
        });
      },

      resetSensorData: () => {
        set(initialState);
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setConnected: (isConnected: boolean) => {
        set({ isConnected });
      },
    }),
    {
      name: 'sensor-store',
    }
  )
);

export { useSensorStore }; 