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
    isLoading,
    error,
    isWebSocketConnected,
    isStreamingIdle,
    initEngine,
    startEngine,
    stopEngine,
    startPolling, 
    stopPolling,
    connectWebSocket,
    disconnectWebSocket,
    samplingRates
  } = useEngineStore();

  const {
    deviceStatus,
    engineStatus,
    // systemMetrics,
    isEngineStopped,
    connectionInfo,
    isLoading: metricsLoading,
    errors: metricsErrors,
    startPolling: startMetricsPolling,
    stopPolling: stopMetricsPolling
  } = useMetricsStore();

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });

  // Add state for smooth transitions
  const [isEngineLoading, setIsEngineLoading] = useState(false);
  const [isDeviceLoading, setIsDeviceLoading] = useState(false);
  const [isConnectionLoading, setIsConnectionLoading] = useState(false);

  useEffect(() => {
    startPolling();
    startMetricsPolling();
    return () => {
      stopPolling();
      stopMetricsPolling();
    };
  }, []);

  // Handle loading state transitions
  useEffect(() => {
    if (metricsLoading.engine) {
      setIsEngineLoading(true);
      const timer = setTimeout(() => setIsEngineLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [metricsLoading.engine]);

  useEffect(() => {
    if (metricsLoading.device) {
      setIsDeviceLoading(true);
      const timer = setTimeout(() => setIsDeviceLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [metricsLoading.device]);

  useEffect(() => {
    if (metricsLoading.engine) {
      setIsConnectionLoading(true);
      const timer = setTimeout(() => setIsConnectionLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [metricsLoading.engine]);

  useEffect(() => {
    if (error?.connection) {
      setSnackbar({ open: true, message: error.connection, severity: 'error' });
    }
  }, [error?.connection]);

  // // Add logging to check samplingRates
  // useEffect(() => {
  //   console.log('EngineModule samplingRates:', samplingRates);
  // }, [samplingRates]);

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
      <Card sx={{ width: '100%', mx: 'auto', bgcolor: 'grey.900', color: 'common.white' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              <MemoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Engine Status
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                color="info"
                size="small"
                onClick={handleInit}
                disabled={isLoading.init}
                startIcon={isLoading.init ? <CircularProgress size={16} /> : null}
              >
                Init
              </Button>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleStart}
                disabled={isEngineStopped || deviceStatus?.status !== 'connected' || engineStatus?.status === 'running'}
                startIcon={isLoading.start ? <CircularProgress size={16} /> : <PlayArrowIcon />}
              >
                Streaming Start
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={handleStop}
                disabled={isEngineStopped || deviceStatus?.status !== 'connected' || engineStatus?.status !== 'running'}
                startIcon={isLoading.stop ? <CircularProgress size={16} /> : <StopIcon />}
              >
                Streaming Stop
              </Button>
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="white" sx={{ mb: 1 , fontSize: 12, fontWeight: 800 }}>
                Engine Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 24 }}>
                {isEngineLoading && !engineStatus ? (
                  <CircularProgress size={16} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: !isEngineStopped ? 'success.main' : 'error.main' }}>
                    {!isEngineStopped ? (
                      <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
                    ) : (
                      <StopIcon fontSize="small" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14 }}>
                      {!isEngineStopped ? 'Running' : 'Stopped'}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            {/* Device Connection Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="white" sx={{ mb: 1 , fontSize: 12, fontWeight: 800 }}>
                Device Connection Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 24 }}>
                {isDeviceLoading && !deviceStatus ? (
                  <CircularProgress size={16} />
                ) : (
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
                )}
              </Box>
            </Box>
            {/* Streaming */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="white" sx={{ mb: 1 , fontSize: 12, fontWeight: 800 }}>
                Streaming Service Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 24 }}>
                {isEngineLoading && !engineStatus ? (
                  <CircularProgress size={16} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {engineStatus?.status === 'running' ? (
                      <>
                        <PlayArrowIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                        <Typography variant="body2" sx={{ color: 'success.main', fontSize: 14 }}>Running</Typography>
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
            {/* Data Processing Status Section */}
            <Box>
              <Typography variant="subtitle2" color="white" sx={{ mb: 1 , fontSize: 12, fontWeight: 800 }}>
                Data Processing Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    EEG
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {deviceStatus?.eeg_sampling_rate ? deviceStatus.eeg_sampling_rate.toFixed(1) : '-'} Hz
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    PPG
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {deviceStatus?.ppg_sampling_rate ? deviceStatus.ppg_sampling_rate.toFixed(1) : '-'} Hz
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    Accelerometer
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
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
      <Card sx={{ width: "100%", mx: 'auto', bgcolor: 'grey.900', color: 'common.white' }}>
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
                disabled={isWebSocketConnected}
                startIcon={<LinkIcon />}
              >
                Connect
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={handleDisconnect}
                disabled={!isWebSocketConnected}
                startIcon={<LinkOffIcon />}
              >
                Disconnect
              </Button>
            </Stack>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Websocket Status Section */}
            <Box>
              <Typography variant="subtitle2" color="white" sx={{ mb: 1 , fontSize: 14, fontWeight: 800 }}>
                Websocket Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                    Websocket address
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 14, fontFamily: 'monospace' }}>
                    {isConnectionLoading && !connectionInfo ? (
                      <CircularProgress size={14} />
                    ) : metricsErrors.connection ? (
                      <Typography color="error" sx={{ fontSize: 12 }}>Connection Error</Typography>
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
                    {isEngineLoading && !engineStatus ? (
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
                        <Typography variant="body2" sx={{ color: 'success.main', fontSize: 12 }}>Connected</Typography>
                      </>
                    ) : (
                      <>
                        <LinkOffIcon fontSize="small" color="error" sx={{ mr: 1 }} />
                        <Typography variant="body2" sx={{ color: 'error.main', fontSize: 12 }}>Disconnected</Typography>
                      </>
                    )}
                  </Box>
                </Box>
                {/* Data Streaming Status Section */}
                <Box>
                  <Typography variant="subtitle2" color="grey.400" sx={{ mb: 2 }}>
                    Data Streaming Status
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                        EEG
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {isStreamingIdle ? '-' : (samplingRates.eeg ? samplingRates.eeg.toFixed(1) : '-')} Hz
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                        PPG
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {isStreamingIdle ? '-' : (samplingRates.ppg ? samplingRates.ppg.toFixed(1) : '-')} Hz
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                        Accelerometer
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {isStreamingIdle ? '-' : (samplingRates.acc ? samplingRates.acc.toFixed(1) : '-')} Hz
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>
                        Battery
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {isStreamingIdle ? '-' : (samplingRates.bat ? samplingRates.bat.toFixed(1) : '-')} Hz
                      </Typography>
                    </Box>
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