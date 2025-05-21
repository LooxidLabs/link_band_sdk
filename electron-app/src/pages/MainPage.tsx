import React, { useEffect, useState } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { useAuthStore } from '../stores/authStore';
import { LoginModal } from '../components/LoginModal';
import DeviceManagerModule from '../components/DeviceManagerModule';
import LinkCloudManagerModule from '../components/LinkCloudManagerModule';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import BottomStatusBar from '../components/BottomStatusBar';
import { theme } from '../theme';

const menuToComponent: Record<string, React.ReactNode> = {
  'Visualizer': <div style={{ color: '#fff' }}>Visualizer (준비중)</div>,
  'Device Manager': <DeviceManagerModule />,
  'Data Manager': <div style={{ color: '#fff' }}>Data Manager (준비중)</div>,
  'Link Cloud Manager': <LinkCloudManagerModule />,
  'Settings': <div style={{ color: '#fff' }}>Settings (준비중)</div>,
};

const MainPage: React.FC = () => {
  const {
    user,
    loading,
    subscribeToAuthState
  } = useAuthStore();
  const [selectedMenu, setSelectedMenu] = useState('Link Cloud Manager');
  const [visualizerStatus, setVisualizerStatus] = useState<'active' | 'inactive'>('inactive');

  useEffect(() => {
    const unsubscribe = subscribeToAuthState();
    return () => {
      unsubscribe();
    };
  }, [subscribeToAuthState]);

  const handleVisualizerClick = () => {
    setVisualizerStatus((prev) => (prev === 'active' ? 'inactive' : 'active'));
    setSelectedMenu('Visualizer');
  };

  const handleDeviceClick = () => {
    setSelectedMenu('Device Manager');
  };

  const handleRecordClick = () => {
    setSelectedMenu('Data Manager');
  };

  const handleSettingsClick = () => {
    setSelectedMenu('Settings');
  };

  const handleCloudClick = () => {
    setSelectedMenu('Link Cloud Manager');
  };

  if (loading && !user) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(135deg, #181a20 0%, #23263a 100%)' }}>
        <TopNavBar
          userEmail={user?.email || ''}
          onSettingsClick={handleSettingsClick}
          onCloudClick={handleCloudClick}
          onVisualizerClick={handleVisualizerClick}
          visualizerStatus={visualizerStatus}
          onDeviceClick={handleDeviceClick}
          onRecordClick={handleRecordClick}
        />
        <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <Sidebar selected={selectedMenu} onSelect={setSelectedMenu} />
          <Box sx={{ flex: 1, p: 3, minWidth: 0, fontSize: 12 }}>
            {user ? (
              menuToComponent[selectedMenu] || <div />
            ) : (
              <LoginModal open={true} onClose={() => {}} />
            )}
          </Box>
        </Box>
        <BottomStatusBar />
      </Box>
    </ThemeProvider>
  );
};

export default MainPage;
