import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import Battery20Icon from '@mui/icons-material/Battery20';

interface BatteryIndicatorProps {
  value: number; // 0~100
  charging?: boolean;
}

const getBatteryIcon = (value: number, charging?: boolean) => {
  if (charging) return <BatteryChargingFullIcon sx={{ color: '#4ade80' }} />;
  if (value <= 20) return <Battery20Icon sx={{ color: '#f87171' }} />;
  return <BatteryFullIcon sx={{ color: value < 40 ? '#facc15' : '#4ade80' }} />;
};

export const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({ value, charging }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 80 }}>
    {getBatteryIcon(value, charging)}
    <Box sx={{ width: 40, mx: 1 }}>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 8,
          borderRadius: 5,
          backgroundColor: '#222',
          '& .MuiLinearProgress-bar': {
            backgroundColor: value < 20 ? '#f87171' : value < 40 ? '#facc15' : '#4ade80',
          },
        }}
      />
    </Box>
    <Typography variant="body2" sx={{ minWidth: 28, textAlign: 'right' }}>
      {value}%
    </Typography>
  </Box>
); 