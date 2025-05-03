import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Device } from '../types/device';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDeviceManager } from '../stores/device_manager';

interface DeviceRegistrationModalProps {
  open: boolean;
  onClose: () => void;
  currentDevice?: Device | null;
}

export const DeviceRegistrationModal: React.FC<DeviceRegistrationModalProps> = ({
  open,
  onClose,
  currentDevice,
}) => {
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const { sendMessage, lastMessage } = useWebSocket();
  const { registeredDevices, updateRegisteredDevices } = useDeviceManager();

  useEffect(() => {
    if (open) {
      // Request registered devices when modal opens
      sendMessage({ command: 'get_registered_devices' });
    }
  }, [open, sendMessage]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'event') {
      switch (lastMessage.event_type) {
        case 'registered_devices':
          updateRegisteredDevices(lastMessage.data.devices);
          break;
        case 'scan_result':
          if (lastMessage.data.status === 'scanning') {
            setIsScanning(true);
          } else if (lastMessage.data.status === 'completed') {
            setIsScanning(false);
            setScannedDevices(lastMessage.data.devices || []);
          }
          break;
      }
    }
  }, [lastMessage, updateRegisteredDevices]);

  const handleScanDevices = () => {
    setScannedDevices([]);
    sendMessage({ command: 'scan_devices' });
  };

  const handleRegisterDevice = (device: Device) => {
    sendMessage({
      command: 'register_device',
      payload: device,
    });
  };

  const handleUnregisterDevice = (address: string) => {
    sendMessage({
      command: 'unregister_device',
      payload: { address },
    });
  };

  const isDeviceRegistered = (address: string) => {
    return registeredDevices.some(device => device.address === address);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>디바이스 관리</DialogTitle>
      <DialogContent>
        <Box mb={3}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle1">
              등록된 디바이스
            </Typography>
          </Box>
          {registeredDevices.length === 0 ? (
            <Typography color="textSecondary">
              등록된 디바이스가 없습니다.
            </Typography>
          ) : (
            <List>
              {registeredDevices.map((device) => (
                <ListItem key={device.address}>
                  <ListItemText
                    primary={device.name || '알 수 없는 디바이스'}
                    secondary={device.address}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleUnregisterDevice(device.address)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle1">
              검색된 디바이스
            </Typography>
            <Button
              variant="outlined"
              onClick={handleScanDevices}
              disabled={isScanning}
              startIcon={isScanning ? null : <AddIcon />}
            >
              {isScanning ? '검색 중...' : '디바이스 검색'}
            </Button>
          </Box>
          {scannedDevices.length === 0 ? (
            <Typography color="textSecondary">
              {isScanning ? '디바이스 검색 중...' : '검색된 디바이스가 없습니다.'}
            </Typography>
          ) : (
            <List>
              {scannedDevices.map((device) => (
                <ListItem key={device.address}>
                  <ListItemText
                    primary={device.name || '알 수 없는 디바이스'}
                    secondary={device.address}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRegisterDevice(device)}
                      disabled={isDeviceRegistered(device.address)}
                    >
                      {isDeviceRegistered(device.address) ? '등록됨' : '등록'}
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 