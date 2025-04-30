import React, { useState, useEffect } from 'react';
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
import { useDeviceManager } from './stores/device_manager';

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

function App() {
  const [message, setMessage] = useState('');
  const { sendMessage, response, isElectronAvailable } = useElectron();
  const deviceManager = useDeviceManager();

  // 앱 시작시 WebSocket 연결 시도 및 재연결 로직
  useEffect(() => {
    const attemptConnection = () => {
      if (!deviceManager.isConnected) {
        console.log('Attempting WebSocket connection...');
        deviceManager.connect();
      }
    };

    // 초기 연결 시도
    attemptConnection();

    // 1초마다 연결 상태 확인 및 재연결 시도
    const intervalId = setInterval(() => {
      attemptConnection();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [deviceManager]);

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
          <DeviceManagerPanel />
          
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App; 