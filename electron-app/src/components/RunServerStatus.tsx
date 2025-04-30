import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Alert } from '@mui/material';

export function RunServerStatus() {
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const result = await window.electron?.invoke('check-runserver-status');
      setStatus(result?.running ? 'running' : 'stopped');
      setError(null);
    } catch {
      setStatus('unknown');
      setError('상태 확인 중 오류 발생');
    }
    setLoading(false);
  };

  const startService = async () => {
    setLoading(true);
    try {
      const result = await window.electron?.invoke('start-runserver-service');
      setStatus(result?.running ? 'running' : 'stopped');
      if (result?.error) setError(result.error);
      else setError(null);
    } catch {
      setStatus('unknown');
      setError('서버 실행 중 오류 발생');
    }
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Python Server Status
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography>
          상태: {loading ? <CircularProgress size={16} /> : status === 'running' ? '실행 중' : status === 'stopped' ? '중지됨' : '알 수 없음'}
        </Typography>
        {status !== 'running' && (
          <Button onClick={startService} disabled={loading} variant="contained" size="small">
            서버 실행
          </Button>
        )}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      )}
    </Paper>
  );
} 