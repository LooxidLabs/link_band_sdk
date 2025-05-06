import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import useAuthStore from '../stores/authStore';

export function AppBarWithAuth() {
  const { user, signOutUser } = useAuthStore();

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Link Band SDK
        </Typography>
        <Box>
          {user ? (
            <>
              <Typography variant="body1" component="span" sx={{ mr: 2 }}>
                {user.email}
              </Typography>
              <Button color="inherit" onClick={signOutUser}>
                로그아웃
              </Button>
            </>
          ) : null}
        </Box>
      </Toolbar>
    </AppBar>
  );
} 