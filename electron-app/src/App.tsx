import React, { useState } from 'react';
import { create } from 'zustand';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  AppBar,
  Toolbar,
  Button,
  CssBaseline,
  ThemeProvider,
  createTheme,
  TextField,
  Alert,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import { useElectron } from './hooks/useElectron';
import { RunServerStatus } from './components/RunServerStatus';
import { DeviceManagerPanel } from './components/DeviceManagerPanel';

// Create a theme instance
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export type LeadOffStatus = 'good' | 'bad' | 'unknown';

export type DeviceManagerState = {
  leadOffCh1Status: LeadOffStatus;
  leadOffCh2Status: LeadOffStatus;
};

export const useDeviceManager = create<DeviceManagerState>((set, get) => ({
  leadOffCh1Status: 'unknown',
  leadOffCh2Status: 'unknown',

  connect: () => {
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'sensor_data') {
          set((state) => {
            const newEEGSamples = pushWithLimit(state.eegSamples, data.eeg || [], EEG_QUEUE_LEN);
            const eegRate = calcSamplingRateFromQueue(newEEGSamples);

            let leadOffCh1: LeadOffStatus = state.leadOffCh1Status;
            let leadOffCh2: LeadOffStatus = state.leadOffCh2Status;
            if (data.eeg && data.eeg.length > 0) {
              const lastEEGSample = data.eeg[data.eeg.length - 1];
              leadOffCh1 = lastEEGSample.leadoff_ch1 === 0 ? 'good' : 'bad';
              leadOffCh2 = lastEEGSample.leadoff_ch2 === 0 ? 'good' : 'bad';
            }

            return {
              eegRate,
              ppgRate,
              accRate,
              leadOffCh1Status: leadOffCh1,
              leadOffCh2Status: leadOffCh2,
            };
          });
        }
      } catch (e) {
        // ...
      }
    };
    set({ ws });
  },

  clearData: () => set({
    eegSamples: [], ppgSamples: [], accSamples: [],
    eegRate: 0, ppgRate: 0, accRate: 0,
    leadOffCh1Status: 'unknown', leadOffCh2Status: 'unknown'
  }),
}));

function App() {
  const [message, setMessage] = useState('');
  const { sendMessage, response, isElectronAvailable } = useElectron();

  const handleSendMessage = () => {
    sendMessage({ message });
    setMessage('');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Link Band SDK
            </Typography>
            <Button color="inherit">Login</Button>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome to Link Band SDK
            </Typography>
            <Typography variant="body1" paragraph>
              This is a desktop application for managing and interacting with Link Band devices.
            </Typography>
            

          </Paper>
          {/* Device Manager Panel: placed below main Paper for clear separation */}
          <DeviceManagerPanel />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App; 