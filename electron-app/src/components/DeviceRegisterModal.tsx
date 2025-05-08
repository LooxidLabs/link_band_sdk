import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useDeviceManager } from '../stores/deviceManager';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

interface DeviceInfo {
  name: string;
  address: string;
}

interface DeviceRegisterModalProps {
  open: boolean;
  onClose: () => void;
  onRegister: (device: DeviceInfo) => void;
  onUnregister: (address: string) => void;
}

export const DeviceRegisterModal: React.FC<DeviceRegisterModalProps> = ({
  open,
  onClose,
  onRegister,
  onUnregister,
}) => {
  const { registeredDevices, scannedDevices, scanLoading, fetchRegisteredDevices } = useDeviceManager();

  React.useEffect(() => {
    if (open) {
      fetchRegisteredDevices();
    }
  }, [open, fetchRegisteredDevices]);

  const handleScan = () => {
    window.electron?.ipcRenderer?.send('ws-command', { command: 'scan_devices' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        디바이스 등록
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            등록된 디바이스
          </Typography>
          {registeredDevices.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              등록된 디바이스가 없습니다.
            </Typography>
          ) : (
            <List>
              {registeredDevices.map((device) => (
                <ListItem
                  key={device.address}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => onUnregister(device.address)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={device.name || 'Unknown Device'}
                    secondary={device.address}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            스캔된 디바이스
          </Typography>
          <Button
            variant="contained"
            onClick={handleScan}
            disabled={scanLoading}
            startIcon={scanLoading ? <CircularProgress size={20} /> : <SearchIcon />}
            sx={{ mb: 2 }}
          >
            {scanLoading ? '스캔 중...' : '디바이스 스캔'}
          </Button>
          {scannedDevices.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              스캔된 디바이스가 없습니다.
            </Typography>
          ) : (
            <List>
              {scannedDevices.map((device) => (
                <ListItem
                  key={device.address}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => onRegister(device)}>
                      <AddIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={device.name || 'Unknown Device'}
                    secondary={device.address}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceRegisterModal; 