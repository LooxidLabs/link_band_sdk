import { Box, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';

const isEngineRunning = true; // set to false for stopped
const isDeviceConnected = true; // set to false for disconnected
const isCloudConnected = true; // set to false for disconnected
const isDataCenterRunning = true; // set to false for disconnected

const activeColor = '#646cff'; // blue (from screenshot)
const inactiveColor = '#aaa'; // gray

const BottomStatusBar = () => (
  <Box
    sx={{
      position: 'fixed',
      left: 0,
      bottom: 0,
      width: '100vw',
      height: 32,
      bgcolor: '#111',
      color: '#aaa',
      borderTop: '1px solid #23263a',
      display: 'flex',
      alignItems: 'center',
      px: 2,
      zIndex: 1201,
      fontSize: 12,
      justifyContent: 'space-between',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.12)',
    }}
  >
    {/* Left Section */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 260 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ color: '#aaa', fontSize: 12, fontWeight: 500 }}>Engine</Typography>
        {isEngineRunning ? (
          <PlayArrowIcon sx={{ color: activeColor, fontSize: 16, ml: 0.5 }} />
        ) : (
          <StopIcon sx={{ color: inactiveColor, fontSize: 16, ml: 0.5 }} />
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ color: '#aaa', fontSize: 12, fontWeight: 500 }}>Link Band</Typography>
        {isDeviceConnected ? (
          <LinkIcon sx={{ color: activeColor, fontSize: 16, ml: 0.5 }} />
        ) : (
          <LinkOffIcon sx={{ color: inactiveColor, fontSize: 16, ml: 0.5 }} />
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ color: '#aaa', fontSize: 12, fontWeight: 500 }}>Data Center</Typography>
        {isDataCenterRunning ? (
          <PlayArrowIcon sx={{ color: activeColor, fontSize: 16, ml: 0.1 }} />
        ) : (
          <StopIcon sx={{ color: inactiveColor, fontSize: 16, ml: 0.5 }} /> 
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ color: '#aaa', fontSize: 12, fontWeight: 500 }}>Link Cloud</Typography>
        <CloudQueueIcon sx={{ color: isCloudConnected ? activeColor : inactiveColor, fontSize: 16, ml: 0.5 }} />
      </Box>
    </Box>
    {/* Center Section */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <Typography sx={{ color: '#aaa', fontSize: 12 }}>EEG : 249.1 Hz</Typography>
      <Typography sx={{ color: '#aaa', fontSize: 12 }}>PPG : 50.1 Hz</Typography>
      <Typography sx={{ color: '#aaa', fontSize: 12 }}>ACC : 33.1 Hz</Typography>
      <Typography sx={{ color: '#aaa', fontSize: 12 }}>Battery : 42%</Typography>
    </Box>
    {/* Right Section */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 260, justifyContent: 'flex-end' }}>
      <Typography sx={{ color: '#aaa', fontSize: 12 }}>RAM 0.00 GB</Typography>
      <Typography sx={{ color: '#aaa', fontSize: 12 }}>CPU 0.00 %</Typography>
      <Typography sx={{ color: '#aaa', fontSize: 12 }}>Disk 0.00 MB used (limit 300MB)</Typography>
    </Box>
  </Box>
);

export default BottomStatusBar; 