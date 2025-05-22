import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Stack, CircularProgress, Snackbar, Alert } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PeopleIcon from '@mui/icons-material/People';
import MemoryIcon from '@mui/icons-material/Memory';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useEngineStore } from '../stores/engine';
import { useMetricsStore } from '../stores/metrics';

const EngineModule: React.FC = () => {
  const { 
    connectionInfo, 
    isLoading,
    error,
    isWebSocketConnected,
    initEngine,
    startEngine,
    stopEngine,
    startPolling, 
    stopPolling,
    connectWebSocket,
    disconnectWebSocket
  } = useEngineStore();

  const {
    deviceStatus,
    engineStatus,
    systemMetrics,
    isLoading: metricsLoading,
    errors: metricsErrors,
    startPolling: startMetricsPolling,
    stopPolling: stopMetricsPolling
  } = useMetricsStore();

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    startPolling();
    startMetricsPolling();
    return () => {
      stopPolling();
      stopMetricsPolling();
    };
  }, []);

  useEffect(() => {
    if (error?.connection) {
      setSnackbar({ open: true, message: error.connection, severity: 'error' });
    }
  }, [error?.connection]);

  const handleInit = async () => {
    try {
      await initEngine();
      setSnackbar({ open: true, message: 'Engine initialized', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Init failed', severity: 'error' });
    }
  };

  const handleStart = async () => {
    try {
      await startEngine();
      setSnackbar({ open: true, message: 'Engine started', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Start failed', severity: 'error' });
    }
  };

  const handleStop = async () => {
    try {
      await stopEngine();
      setSnackbar({ open: true, message: 'Engine stopped', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Stop failed', severity: 'error' });
    }
  };

  const handleConnect = () => {
    connectWebSocket();
    setSnackbar({ open: true, message: 'Connecting to WebSocket...', severity: 'info' });
  };

  const handleDisconnect = () => {
    disconnectWebSocket();
    setSnackbar({ open: true, message: 'Disconnected from WebSocket', severity: 'info' });
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Engine Status Card */}
      <Card sx={{ width: 800, mx: 'auto', bgcolor: 'grey.900', color: 'common.white' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              <MemoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Engine Status
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color="info"
                size="small"
                onClick={handleInit}
                disabled={isLoading.init || (metricsLoading.engine && !engineStatus)}
                startIcon={isLoading.init ? <CircularProgress size={16} /> : null}
              >
                Init
              </Button>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleStart}
                disabled={isLoading.start || (metricsLoading.engine && !engineStatus) || engineStatus?.status === 'running'}
                startIcon={isLoading.start ? <CircularProgress size={16} /> : <PlayArrowIcon />}
              >
                Streaming Start
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={handleStop}
                disabled={isLoading.stop || (metricsLoading.engine && !engineStatus) || engineStatus?.status === 'stopped'}
                startIcon={isLoading.stop ? <CircularProgress size={16} /> : <StopIcon />}
              >
                Streaming Stop
              </Button>
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                Engine Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 24 }}>
                {metricsLoading.engine && !engineStatus ? (
                  <CircularProgress size={16} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: engineStatus?.status === 'running' ? 'success.main' : 'error.main' }}>
                    {engineStatus?.status === 'running' ? (
                      <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
                    ) : (
                      <StopIcon fontSize="small" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14 }}>
                      {engineStatus?.status === 'running' ? 'Running' : 'Stopped'}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            {/* Device Connection Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                Device Connection Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 24 }}>
                {metricsLoading.device && !deviceStatus ? (
                  <CircularProgress size={16} />
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {deviceStatus?.status === 'connected' ? (
                        <LinkIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                      ) : (
                        <LinkOffIcon fontSize="small" color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography variant="body2" sx={{ color: deviceStatus?.status === 'connected' ? 'success.main' : 'error.main', fontSize: 14 }}>
                        {deviceStatus?.status === 'connected' ? 'Connected' : 'Disconnected'}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
            {/* Streaming */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                Streaming Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 24 }}>
                {metricsLoading.engine && !engineStatus ? (
                  <CircularProgress size={16} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {engineStatus?.status === 'running' ? (
                      <>
                        <PlayArrowIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                        <Typography variant="body2" sx={{ color: 'success.main', fontSize: 14 }}>Streaming</Typography>
                      </>
                    ) : (
                      <>
                        <StopIcon fontSize="small" color="disabled" sx={{ mr: 1 }} />
                        <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: 14 }}>Stopped</Typography>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
                        {/* Data Streaming Status Section */}
            <Box>
              <Typography variant="subtitle2" color="grey.400" sx={{ mb: 2 }}>
                Data Processing Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    EEG
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 14 }}>
                    {deviceStatus?.eeg_sampling_rate ? deviceStatus.eeg_sampling_rate.toFixed(1) : '-'} Hz
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    PPG
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 14 }}>
                    {deviceStatus?.ppg_sampling_rate ? deviceStatus.ppg_sampling_rate.toFixed(1) : '-'} Hz
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    Accelerometer
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 14 }}>
                    {deviceStatus?.acc_sampling_rate ? deviceStatus.acc_sampling_rate.toFixed(1) : '-'} Hz
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    Battery
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 14 }}>
                    {deviceStatus?.bat_sampling_rate ? deviceStatus.bat_sampling_rate.toFixed(1) : '-'} Hz
                  </Typography>
                </Box>
              </Box>
            </Box>

          </Box>
        </CardContent>
      </Card>

      {/* Connection Status Card */}
      <Card sx={{ width: 800, mx: 'auto', bgcolor: 'grey.900', color: 'common.white' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              <MemoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Connection Status
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleConnect}
                disabled={isWebSocketConnected || (metricsLoading.engine && !engineStatus)}
                startIcon={<LinkIcon />}
              >
                Connect
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={handleDisconnect}
                disabled={!isWebSocketConnected || (metricsLoading.engine && !engineStatus)}
                startIcon={<LinkOffIcon />}
              >
                Disconnect
              </Button>
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Websocket Status Section */}
            <Box>
              <Typography variant="subtitle2" color="grey.400" sx={{ mb: 2 }}>
                Websocket Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    Websocket address
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 14, fontFamily: 'monospace' }}>
                    {isLoading.connection ? (
                      <CircularProgress size={14} />
                    ) : error?.connection ? (
                      <Typography color="error" sx={{ fontSize: 12 }}>{error.connection}</Typography>
                    ) : (
                      connectionInfo?.ws_url ?? 'Not available'
                    )}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    Connected Clients
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 40, justifyContent: 'flex-end' }}>
                    {metricsLoading.engine && !engineStatus ? (
                      <CircularProgress size={14} />
                    ) : (
                      <>
                        <PeopleIcon fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="body2" sx={{ fontSize: 14 }}>
                          {engineStatus?.clients_connected ?? 0}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    Websocket connection status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {isWebSocketConnected ? (
                      <>
                        <LinkIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                        <Typography variant="body2" sx={{ color: 'success.main', fontSize: 14 }}>Connected</Typography>
                      </>
                    ) : (
                      <>
                        <LinkOffIcon fontSize="small" color="error" sx={{ mr: 1 }} />
                        <Typography variant="body2" sx={{ color: 'error.main', fontSize: 14 }}>Disconnected</Typography>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>

          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EngineModule; 