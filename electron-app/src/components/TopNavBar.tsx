import { AppBar, Toolbar, Typography, Box, IconButton, Avatar, Tooltip } from '@mui/material';
import DashboardIcon from '@mui/icons-material/BarChart';
import DevicesIcon from '@mui/icons-material/Devices';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';

export const TopNavBar = ({
  onVisualizerClick,
  onDeviceClick,
  onRecordClick,
  onSettingsClick,
  onCloudClick,
  visualizerStatus = 'inactive',
  deviceStatus = 'connected',
  recording = false,
  userEmail = '',
}: {
  onVisualizerClick?: () => void;
  onDeviceClick?: () => void;
  onRecordClick?: () => void;
  onSettingsClick?: () => void;
  onCloudClick?: () => void;
  visualizerStatus?: 'active' | 'inactive';
  deviceStatus?: 'connected' | 'disconnected';
  recording?: boolean;
  userEmail?: string;
}) => (
  <Box>
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #23263a', bgcolor: 'background.paper', px: 2 }}>
      <Toolbar disableGutters sx={{ minHeight: 44, height: 44, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1, color: '#fff', fontSize: 16 }}>
            LINK BAND SDK
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={visualizerStatus === 'active' ? 'Visualizer Active' : 'Visualizer Inactive'}>
            <IconButton color={visualizerStatus === 'active' ? 'primary' : 'default'} onClick={onVisualizerClick} sx={{ fontSize: 12 }}>
              <DashboardIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={deviceStatus === 'connected' ? 'Device Connected' : 'Device Disconnected'}>
            <IconButton color={deviceStatus === 'connected' ? 'primary' : 'default'} onClick={onDeviceClick} sx={{ fontSize: 12 }}>
              <DevicesIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={recording ? 'Recording...' : 'Not Recording'}>
            <IconButton color={recording ? 'secondary' : 'default'} onClick={onRecordClick} sx={{ fontSize: 12 }}>
              <FiberManualRecordIcon sx={{ fontSize: 18 }} />
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
export default TopNavBar; 