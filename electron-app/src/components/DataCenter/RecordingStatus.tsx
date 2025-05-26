import React from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import type { RecordingStatusResponse } from '../../types/data-center';
import { useMetricsStore } from '../../stores/metrics';

interface RecordingStatusProps {
  status: Omit<RecordingStatusResponse, 'device_connected'>;
}

// Helper for each info row
const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold', minWidth: { xs: '80px', sm: '100px' } }}>
      {label}:
    </Typography>
    <Box sx={{ color: 'common.white' }}>{children}</Box>
  </Stack>
);

export const RecordingStatus: React.FC<RecordingStatusProps> = ({ status }) => {
  const isDeviceConnected = useMetricsStore((state) => state.deviceStatus?.status === 'connected');

  return (
    <Box sx={{ width: '100%', color: 'common.white', mt: 1 }}>
      <Stack spacing={1}>
        <InfoRow label="Device">
          <Chip
            label={isDeviceConnected ? 'LINK BAND Connected' : 'LINK BAND Disconnected'}
            color={isDeviceConnected ? 'success' : 'error'}
            size="small"
          />
        </InfoRow>
        <InfoRow label="Recording">
          <Chip
            label={status.is_recording ? 'Active' : 'Inactive'}
            color={status.is_recording ? 'error' : 'success'}
            size="small"
          />
        </InfoRow>

        {status.is_recording && (
          <>
            <InfoRow label="Session ID">
              {status.current_session || 'N/A'}
            </InfoRow>
            <InfoRow label="Started At">
              {status.start_time ? new Date(status.start_time).toLocaleString() : 'N/A'}
            </InfoRow>
          </>
        )}
      </Stack>
    </Box>
  );
}; 