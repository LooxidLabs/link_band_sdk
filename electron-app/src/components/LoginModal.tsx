import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userApi } from '../api/user';
import { useDeviceManager } from '../stores/deviceManager';
import { connectLinkCloudWS } from '../utils/linkCloudSocket';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const [waitingForToken, setWaitingForToken] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = async (_event: any, token: string) => {
      setWaitingForToken(false);
      localStorage.setItem('token', token);

      // 로그인 성공 시 WebSocket 연결 재시도
      try {
        // deviceManager의 wsManager에 접근하여 connect() 호출
        const deviceManager = useDeviceManager.getState();
        if (deviceManager && (deviceManager as any).wsManager) {
          (deviceManager as any).wsManager.disconnect();
          setTimeout(() => {
            (deviceManager as any).wsManager.connect();
          }, 500);
        }
      } catch (e) {
        // 무시
      }

      try {
        const user = await userApi.getCurrentUser();
        setUser(user);
        if (user?.id) {
          connectLinkCloudWS(user.id);
        }
        navigate('/');
      onClose();
      } catch (e) {
        // 에러 처리
    }
  };
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.on('custom-token-received', handler);
    }
    return () => {
      if ((window as any).electron?.ipcRenderer) {
        (window as any).electron.ipcRenderer.removeListener('custom-token-received', handler);
      }
    };
  }, [onClose, navigate, setUser]);

  const handleLogin = () => {
    setWaitingForToken(true);
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send('open-web-login');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          {waitingForToken ? (
            <>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Waiting for authentication...</Typography>
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleLogin}
            fullWidth
              size="large"
            >
              Login with Browser
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}; 