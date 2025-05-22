import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Button, CircularProgress, List, ListItem, ListItemText, Radio } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { useDeviceStore } from '../stores/device';

const LinkBandModule: React.FC = () => {
  const { 
    deviceStatus, 
    registeredDevices,
    scannedDevices,
    isLoading,
    errors,
    connectDevice,
    disconnectDevice,
    unregisterDevice,
    scanDevices,
    registerDevice,
    clearScannedDevices,
    startPolling,
    stopPolling
  } = useDeviceStore();

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  // const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // useEffect(() => {
  //   if (deviceStatus?.status === 'connected') {
  //     setIsConnecting(false);
  //   }
  // }, [deviceStatus?.status]);

  const handleConnect = async () => {
    if (deviceStatus?.status === 'connected') {
      // setIsConnecting(true);
      await disconnectDevice(deviceStatus.address);
    } else if (registeredDevices.length > 0) {
      try {
        await connectDevice(registeredDevices[0].address);
      } catch (error) {
        console.error('Failed to connect:', error);
        // setIsConnecting(false);
      }
    }
  };

  const handleUnregister = async () => {
    if (deviceStatus) {
      if (deviceStatus.status === 'connected') {
        await disconnectDevice(deviceStatus.address);
      }
      await unregisterDevice(deviceStatus.address);
    }
  };

  const handleScan = async () => {
    await scanDevices();
    setSelectedDevice(null);
  };

  const handleDeviceSelect = (address: string) => {
    setSelectedDevice(address);
  };

  const handleRegister = async () => {
    if (selectedDevice) {
      const device = scannedDevices.find(d => d.address === selectedDevice);
      if (device) {
        await registerDevice(device.name, device.address);
        setSelectedDevice(null);
        clearScannedDevices();
      }
    }
  };

  return (
    <Card sx={{p:5,  width: '100%', mx: 'auto', bgcolor: 'grey.900', color: 'common.white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <PsychologyIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Link Band Status</Typography>
      </Box>
      
      {isLoading.connect ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
          <CircularProgress size={16} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Registered Device Information */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="grey.400" sx={{ fontWeight: 'bold', color: 'white', fontSize: 14 }}>Registered Device</Typography>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={handleUnregister}
                disabled={registeredDevices.length === 0}
                sx={{ fontSize: 12, mb: 2 }}
              >
                Unregister
              </Button>
            </Box>
            {registeredDevices.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="grey.400" fontSize={12}>Name</Typography>
                  <Typography variant="body2" fontSize={12}>{registeredDevices[0].name || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="grey.400" fontSize={12}>Address</Typography>
                  <Typography variant="body2" fontSize={12}>{registeredDevices[0].address || '-'}</Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="grey.500" fontSize={12}>No registered device</Typography>
            )}
          </Box>

          {/* Current Device Status */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="grey.400" sx={{ fontWeight: 'bold', color: 'white', fontSize: 14 }}>Current Status</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  onClick={handleConnect}
                  disabled={registeredDevices.length === 0 || deviceStatus?.status === 'connected' || deviceStatus?.status === 'disconnected'}
                  sx={{ fontSize: 12, mb: 2}}
                >
                  {deviceStatus?.status === 'disconnected' ? <CircularProgress size={16} /> : 'Connect'}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="error"
                  onClick={handleConnect}
                  disabled={registeredDevices.length === 0 || deviceStatus?.status !== 'connected'}
                  sx={{ fontSize: 12, mb: 2}}
                >
                  Disconnect
                </Button>
              </Box>
            </Box>
            {deviceStatus ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="grey.400" fontSize={12}>Serial Number</Typography>
                  <Typography variant="body2" fontSize={12}>{deviceStatus.name || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="grey.400" fontSize={12}>BLE Address</Typography>
                  <Typography variant="body2" fontSize={12}>{deviceStatus.address || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="grey.400" fontSize={12}>Connection Status</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {deviceStatus.status === 'connected' ? (
                      <LinkIcon color="success" sx={{ mr: 1 }} />
                    ) : (
                      <LinkOffIcon color="error" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2" color={deviceStatus.status === 'connected' ? 'success.main' : 'error.main'} fontSize={12}>
                      {deviceStatus.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="grey.400" fontSize={12}>Battery Level</Typography>
                  <Typography variant="body2" fontSize={12}>{deviceStatus.bat_level || '-'}%</Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="grey.500" fontSize={12}>No device connected</Typography>
            )}
          </Box>

          {/* Scan Devices Section */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="grey.400" sx={{ fontWeight: 'bold', color: 'white', fontSize: 14 }}>Scan Devices</Typography>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleScan}
                disabled={isLoading.scan || registeredDevices.length > 0}
                sx={{ fontSize: 12, maxHeight: 28, minWidth: 50 }}

              >
                {isLoading.scan ? <CircularProgress size={16} /> : 'Scan'}
              </Button>
            </Box>
            {isLoading.scan ? (
              <Typography variant="body2" color="grey.500" sx={{ ml: 4, fontSize: 12 }}>
                Scanning...
              </Typography>
            ) : scannedDevices.length > 0 ? (
              <List sx={{ ml: 2 }}>
                {scannedDevices.map((device) => (
                  <ListItem key={device.address} sx={{ py: 0.5, fontSize: 12 }}>
                    <Radio
                      checked={selectedDevice === device.address}
                      onChange={() => handleDeviceSelect(device.address)}
                      disabled={registeredDevices.length > 0}
                    />
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                          {}
                          <Typography component="span" sx={{ fontWeight: 'bold' , fontSize: 12}}>
                            {device.name}
                          </Typography>
                          <Typography component="span" sx={{ color: 'grey.500' , fontSize: 12}}>
                            {`  (${device.address})`}
                          </Typography>
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="grey.500" sx={{ ml: 4 , fontSize: 12}}>
                No devices found
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 , fontSize: 12}}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleRegister}
                disabled={!selectedDevice || registeredDevices.length > 0}
              >
                Register Link Band
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {errors.connect && (
        <Typography color="error" sx={{ mt: 1 }}>{errors.connect}</Typography>
      )}
    </Card>
  );
};

export default LinkBandModule; 