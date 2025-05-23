import { AppBar, Toolbar, Typography, Box, IconButton, Avatar, Tooltip } from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import DashboardIcon from '@mui/icons-material/BarChart';
import PsychologyIcon from '@mui/icons-material/Psychology';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';

export const TopNavBar = ({
  onEngineClick,
  onVisualizerClick,
  onDeviceClick,
  onRecordClick,
  onSettingsClick,
  onCloudClick,
  engineStatus = 'active',
  visualizerStatus = 'inactive',
  deviceStatus = 'connected',
  recording = false,
  userEmail = '',
}: {
  onEngineClick?: () => void;
  onVisualizerClick?: () => void;
  onDeviceClick?: () => void;
  onRecordClick?: () => void;
  onSettingsClick?: () => void;
  onCloudClick?: () => void;
  engineStatus?: 'active' | 'inactive';
  visualizerStatus?: 'active' | 'inactive';
  deviceStatus?: 'connected' | 'disconnected';
  recording?: boolean;
  userEmail?: string;
}) => {
  const engineColor = engineStatus === 'active' ? 'primary' : 'default';
  return (
    <Box>
      <AppBar position="fixed" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #23263a', bgcolor: 'background.paper', px: 2, left: 0, top: 0, width: '100%', zIndex: 1100, height: 64 }}>
        <Toolbar disableGutters sx={{ minHeight: 64, height: 64, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1, color: '#fff', fontSize: 16 }}>
              LINK BAND SDK
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Engine">
              <IconButton color={engineColor} onClick={onEngineClick} sx={{ fontSize: 12 }}>
                <MemoryIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={deviceStatus === 'connected' ? 'Device Connected' : 'Device Disconnected'}>
              <IconButton color={deviceStatus === 'connected' ? 'primary' : 'default'} onClick={onDeviceClick} sx={{ fontSize: 12 }}>
                <PsychologyIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={visualizerStatus === 'active' ? 'Visualizer Active' : 'Visualizer Inactive'}>
              <IconButton color={visualizerStatus === 'active' ? 'primary' : 'default'} onClick={onVisualizerClick} sx={{ fontSize: 12 }}>
                <DashboardIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={recording ? 'Recording...' : 'Not Recording'}>
              <IconButton color={recording ? 'secondary' : 'default'} onClick={onRecordClick} sx={{ fontSize: 12 }}>
                <StorageIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={userEmail ? userEmail : 'Sign in to Link Cloud'}>
              <IconButton onClick={onCloudClick} sx={{ fontSize: 12 }}>
                <CloudQueueIcon color={userEmail ? 'primary' : 'inherit'} sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton onClick={onSettingsClick} sx={{ fontSize: 12 }}>
                <SettingsIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            {userEmail && (
              <Avatar sx={{ width: 32, height: 32, ml: 1, bgcolor: 'primary.main', fontSize: 12 }}>
                {userEmail[0].toUpperCase()}
              </Avatar>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ width: '100%', height: '1px', bgcolor: '#fff', opacity: 0.08 }} />
    </Box>
  );
};
export default TopNavBar; 