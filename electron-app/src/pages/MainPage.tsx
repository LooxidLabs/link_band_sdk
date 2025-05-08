import React, { useEffect } from 'react';
import { Box, Container, CssBaseline, ThemeProvider, Typography } from '@mui/material';
import { useAuthStore } from '../stores/authStore';
import { LoginModal } from '../components/LoginModal';
import DeviceManagerModule from '../components/DeviceManagerModule';
import LinkCloudManagerModule from '../components/LinkCloudManagerModule';
import { theme } from '../theme';
import Button from '@mui/material/Button';
// import { userApi } from '../api/user';

const MainPage: React.FC = () => {
  const {
    user,
    loading,
    signOutUser,
    subscribeToAuthState
  } = useAuthStore();

  useEffect(() => {
    const unsubscribe = subscribeToAuthState();
    return () => {
      unsubscribe();
    };
  }, [subscribeToAuthState]);

  if (loading && !user) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '50vh', background: 'linear-gradient(135deg, #181a20 0%, #23263a 100%)' }}>
        <Container maxWidth="md" sx={{ pt: 2 }}>
          <Typography variant="h2" align="center" gutterBottom>
            LINK BAND SDK
          </Typography>

          <Box sx={{ mt: 2, mb: 2 }}>
            {user ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <Button
                    variant="contained"
                    color="error"
                    sx={{
                      fontSize: 12,
                      padding: '6px 20px',
                      minWidth: 70,
                      height: 30,
                      boxShadow: 2,
                      borderRadius: 5,
                      fontWeight: 500,
                      textTransform: 'none',
                    }}
                    onClick={signOutUser}
                  >
                    Sign Out
                  </Button>
                </Box>
                <LinkCloudManagerModule />
                <Box sx={{ mb: 2 }} />
                <DeviceManagerModule />
              </>
            ) : (
              <LoginModal 
                open={true} 
                onClose={() => {}} 
              />
            )}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default MainPage;
