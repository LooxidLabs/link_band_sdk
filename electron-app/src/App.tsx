import React, { useEffect } from 'react';
import { 
  Box, 
  Container, 
  CssBaseline,
  ThemeProvider,
  createTheme,
  CircularProgress,
} from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDeviceManager } from './stores/device_manager';
import useAuthStore from './stores/authStore';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MainPage from './pages/MainPage';

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
  const { user, loading, subscribeToAuthState } = useAuthStore();

  // Firebase 인증 상태 구독 설정
  useEffect(() => {
    const unsubscribe = subscribeToAuthState();
    return () => unsubscribe();
  }, [subscribeToAuthState]);

  // WebSocket 연결 설정
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

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route
            path="/"
            element={user ? <MainPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/login"
            element={!user ? <LoginPage /> : <Navigate to="/" replace />}
          />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App; 