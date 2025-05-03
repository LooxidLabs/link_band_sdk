import React, { useState, FormEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Link,
  FormControlLabel,
  Switch
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase/config';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Container component="main" maxWidth="xs">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(30, 32, 48, 0.85)', borderRadius: '32px', boxShadow: '0 8px 40px 0 rgba(80,80,160,0.25), 0 1.5px 8px 0 rgba(80,80,160,0.10)', padding: { xs: 4, sm: 6 }, minWidth: { xs: '90vw', sm: 400 }, maxWidth: 420, width: '100%', backdropFilter: 'blur(2px)' }}>
          <Typography component="h1" variant="h4" sx={{ mb: 2, fontWeight: 800, color: 'white', textAlign: 'center' }}>
            로그인
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
          <Box component="form" onSubmit={handleEmailLogin} noValidate sx={{ mt: 1 }}>
            <TextField margin="normal" required fullWidth id="email" label="이메일 주소" name="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            <TextField margin="normal" required fullWidth name="password" label="비밀번호" type="password" id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            <FormControlLabel control={<Switch checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} disabled={loading} color="primary" />} label="자동 로그인" sx={{ mt: 1, mb: 0, alignSelf: 'flex-start', color: '#e5e7eb' }} />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(90deg, #7c3aed 0%, #67e8f9 100%)', color: '#fff', boxShadow: '0 2px 16px 0 #7c3aed44', borderRadius: '999px', textTransform: 'none', '&:hover': { background: 'linear-gradient(90deg, #67e8f9 0%, #7c3aed 100%)' }, }} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : '이메일로 로그인'}
            </Button>
            <Button fullWidth variant="outlined" startIcon={<GoogleIcon />} onClick={handleGoogleLogin} disabled={loading} sx={{ mb: 2, py: 1.5, fontWeight: 700, fontSize: '1.1rem', color: '#fff', borderColor: '#fff', borderRadius: '999px', textTransform: 'none', '&:hover': { background: 'rgba(255,255,255,0.08)', borderColor: '#67e8f9' }, }}>
              Google 계정으로 로그인
            </Button>
          </Box>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <RouterLink to="/signup" style={{ color: '#a5b4fc', fontWeight: 500, textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>
              처음 방문하시나요? 회원가입
            </RouterLink>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage; 