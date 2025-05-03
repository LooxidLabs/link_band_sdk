import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';

export function AppBarWithAuth({ user }: { user: any }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {user.photoURL && (
                <img src={user.photoURL} alt="profile" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                )}
                <Typography variant="body1" sx={{ color: 'white', fontSize: 12 }}>{user.email}</Typography>
            </Box>
            ) : (
            <Typography fontSize={12} variant="h6" component="div" sx={{ flexGrow: 1 }}>
                
            </Typography>
            )}

        <Typography fontSize={16} variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Link Band SDK
        </Typography>
        {user ? (
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        ) : (
          <Button color="inherit" onClick={handleLogin}>Login</Button>
        )}
      </Toolbar>
    </AppBar>
  );
} 