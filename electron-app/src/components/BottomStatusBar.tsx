import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

import { useMetricsStore } from '../stores/metrics';

export const BottomStatusBar: React.FC = () => {
  const {
    systemMetrics,
    deviceStatus,
    engineStatus,
    errors,
    startPolling,
    stopPolling
  } = useMetricsStore();

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  const formatValue = (value: number | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(1)}`;
  };

  const formatSamplingRate = (rate: number | undefined | null) => {
    if (rate === undefined || rate === null || engineStatus?.status !== 'running') return '- Hz';
    return `${rate.toFixed(1)} Hz`;
  };

  // Icon rendering helpers
  const renderEngineIcon = () =>
    engineStatus?.status === 'running' ? (
      <PlayArrowIcon fontSize="small" color="success" sx={{ verticalAlign: 'middle' }} />
    ) : (
      <StopIcon fontSize="small" color="disabled" sx={{ verticalAlign: 'middle' }} />
    );

  const renderLinkBandIcon = () =>
    deviceStatus?.status === 'connected' ? (
      <LinkIcon fontSize="small" color="success" sx={{ verticalAlign: 'middle' }} />
    ) : (
      <LinkOffIcon fontSize="small" color="error" sx={{ verticalAlign: 'middle' }} />
    );

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'grey.900',
        color: 'common.white',
        px: 2,
        py: 1,
        fontSize: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1300
      }}
    >
      {/* Main status row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Engine */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>Engine</Typography>
          {renderEngineIcon()}
        </Box>
        {/* Link Band */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>Link Band</Typography>
          {renderLinkBandIcon()}
        </Box>
        {/* Clients */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>Clients:</Typography>
          <Typography variant="body2" sx={{ fontSize: 12 }}>{engineStatus?.clients_connected ?? 0}</Typography>
        </Box>
        {/* Streaming
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>Streaming</Typography>
          {renderStreamingIcon()}
        </Box> */}
      </Box>
      {/* EEG/PPG/ACC row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>EEG:</Typography>
        <Typography variant="body2" sx={{ fontSize: 12 }}>{formatSamplingRate(deviceStatus?.eeg_sampling_rate)}</Typography>
        <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>PPG:</Typography>
        <Typography variant="body2" sx={{ fontSize: 12 }}>{formatSamplingRate(deviceStatus?.ppg_sampling_rate)}</Typography>
        <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>ACC:</Typography>
        <Typography variant="body2" sx={{ fontSize: 12 }}>{formatSamplingRate(deviceStatus?.acc_sampling_rate)}</Typography>
        <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>Battery:</Typography>
        <Typography variant="body2" sx={{ fontSize: 12 }}>{deviceStatus?.bat_level} %</Typography>
      </Box>
      {/* System metrics row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>CPU:</Typography>
        <Typography variant="body2" sx={{ fontSize: 12 }}>{formatValue(systemMetrics?.cpu)} %</Typography>
        <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>RAM:</Typography>
        <Typography variant="body2" sx={{ fontSize: 12 }}>{formatValue(systemMetrics?.ram)} MB</Typography>
        <Typography variant="body2" color="grey.400" sx={{ fontSize: 12 }}>Disk:</Typography>
        <Typography variant="body2" sx={{ fontSize: 12 }}>{formatValue(systemMetrics?.disk)} MB</Typography>
      </Box>
      {/* Error Display */}
      {(errors.system || errors.device || errors.engine) && (
        <Typography variant="body2" color="error.main" sx={{ fontSize: 12, ml: 2 }}>
          {errors.system && <span>System Error: {errors.system} </span>}
          {errors.device && <span>Device Error: {errors.device} </span>}
          {errors.engine && <span>Engine Error: {errors.engine}</span>}
        </Typography>
      )}
    </Box>
  );
};