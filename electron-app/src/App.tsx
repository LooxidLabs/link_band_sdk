import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  AppBar,
  Toolbar,
  Button,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { DeviceManagerPanel } from './components/DeviceManagerPanel';
import { useDeviceManager } from './stores/device_manager';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import { getAuth } from 'firebase/auth';
import { AppBarWithAuth } from './components/AppBarWithAuth';
import SignupPage from './pages/SignupPage';

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
  typography: {
    fontSize: 12,
    h1: { fontSize: '2rem' },
    h2: { fontSize: '1.75rem' },
    h3: { fontSize: '1.5rem' },
    h4: { fontSize: '1.25rem' },
    h5: { fontSize: '1.1rem' },
    h6: { fontSize: '1rem' },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.75rem' },
    button: { fontSize: '0.875rem' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '999px',
          padding: '8px 16px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '999px',
          },
        },
      },
    },
  },
});

function App() {
  const deviceManager = useDeviceManager();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

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

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ flexGrow: 1 }}>
          <AppBarWithAuth user={user} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/" element={
              <Container maxWidth="lg" sx={{ mt: 4 }}>
                <DeviceManagerPanel />
              </Container>
            } />
          </Routes>
        </Box>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App; 