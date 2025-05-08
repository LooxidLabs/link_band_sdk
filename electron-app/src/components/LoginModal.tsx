import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { useAuthStore } from '../stores/authStore';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const { signInWithEmail, signInWithGoogle, signUpWithEmail, savedCredentials, setSavedCredentials } = useAuthStore();

  useEffect(() => {
    const loadSavedCredentials = async () => {
      if (savedCredentials) {
        setEmail(savedCredentials.email);
        setPassword(savedCredentials.password);
        setRememberMe(savedCredentials.rememberMe);
      }
    };

    loadSavedCredentials();
  }, [savedCredentials]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await signInWithEmail(email, password, rememberMe ? 'local' : 'session');
      if (rememberMe) {
        await setSavedCredentials({ email, password, rememberMe });
      } else {
        await setSavedCredentials(null);
      }
      onClose();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await signUpWithEmail(email, password);
      if (rememberMe) {
        await setSavedCredentials({ email, password, rememberMe });
      }
      onClose();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);

    try {
      await signInWithGoogle('session');
      onClose();
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isSignUp ? 'Sign Up' : 'Login'}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={isSignUp ? handleEmailSignUp : handleEmailLogin} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
            }
            label="Remember me"
          />
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
          <DialogActions sx={{ mt: 2, px: 0 }}>
            <Button onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {isSignUp ? 'Sign Up' : 'Login'}
            </Button>
          </DialogActions>
        </Box>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Or
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleLogin}
            startIcon={
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                style={{ width: 20, height: 20 }}
              />
            }
          >
            Continue with Google
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}; 