import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { getAuth, setPersistence, browserLocalPersistence, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const SignupPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleSignup = async () => {
    setError(null);
    setLoading(true);
    try {
      const auth = getAuth();
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google 회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Container component="main" maxWidth="xs">
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          background: 'rgba(30, 32, 48, 0.85)', 
          borderRadius: '32px', 
          boxShadow: '0 8px 40px 0 rgba(80,80,160,0.25), 0 1.5px 8px 0 rgba(80,80,160,0.10)', 
          padding: { xs: 4, sm: 6 }, 
          minWidth: { xs: '90vw', sm: 400 }, 
          maxWidth: 420, 
          width: '100%', 
          backdropFilter: 'blur(2px)' 
        }}>
          <Typography component="h1" variant="h4" sx={{ mb: 2, fontWeight: 800, color: 'white', textAlign: 'center' }}>
            회원가입
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
          <Button 
            fullWidth 
            variant="outlined" 
            startIcon={<GoogleIcon />} 
            onClick={handleGoogleSignup} 
            disabled={loading} 
            sx={{ 
              mb: 2, 
              py: 1.5, 
              fontWeight: 700, 
              fontSize: '1.1rem', 
              color: '#fff', 
              borderColor: '#fff', 
              borderRadius: '999px', 
              textTransform: 'none', 
              '&:hover': { 
                background: 'rgba(255,255,255,0.08)', 
                borderColor: '#67e8f9' 
              } 
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Google 계정으로 회원가입'}
          </Button>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <RouterLink to="/login" style={{ color: '#a5b4fc', fontWeight: 500, textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>
              이미 계정이 있으신가요? 로그인
            </RouterLink>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default SignupPage; 