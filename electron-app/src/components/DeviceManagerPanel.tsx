import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  ListItemSecondaryAction,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useDeviceManager } from '../stores/device_manager';
import { useWebSocket } from '../hooks/useWebSocket';
import { DeviceRegistrationModal } from './DeviceRegistrationModal';
import { Device } from '../types/device';

export const DeviceManagerPanel: React.FC = () => {
  const {
    connect,
    disconnect,
    scanDevices,
    checkDeviceConnection,
    startStreaming,
    stopStreaming,
    isConnected,
    connectedDevice,
    isStreaming,
    battery,
    eegRate,
    ppgRate,
    accRate,
    leadOffCh1Status,
    leadOffCh2Status,
    error,
    registeredDevices,
  } = useDeviceManager();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { lastMessage, sendMessage } = useWebSocket();
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [lastDataUpdate, setLastDataUpdate] = useState({
    eeg: 0,
    ppg: 0,
    acc: 0
  });

  // 디바이스 연결 상태 확인 및 자동 스트리밍 시작
  useEffect(() => {
    if (!isConnected) return;

    const checkInterval = setInterval(() => {
      checkDeviceConnection();
      setLastUpdateTime(new Date());

      // 디바이스가 연결되어 있지만 스트리밍이 안 되고 있다면 자동 시작
      if (connectedDevice && !isStreaming) {
        console.log('Device connected but not streaming, starting stream...');
        startStreaming();
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [isConnected, connectedDevice, isStreaming, checkDeviceConnection, startStreaming]);

  // Update device status when receiving device info
  React.useEffect(() => {
    if (lastMessage?.type === 'event') {
      switch (lastMessage.event_type) {
        case 'device_info':
          const deviceInfo = lastMessage.data.device_info;
          const isConnected = lastMessage.data.connected;
          if (deviceInfo && isConnected) {
            setCurrentDevice({
              name: deviceInfo.name,
              address: deviceInfo.address,
            });
          } else {
            setCurrentDevice(null);
            if (isStreaming) {
              stopStreaming();
            }
          }
          break;
        case 'device_disconnected':
          setCurrentDevice(null);
          if (isStreaming) {
            stopStreaming();
          }
          break;
      }
    }
  }, [lastMessage, isStreaming, stopStreaming]);

  // Update last data update times when receiving sensor data
  useEffect(() => {
    if (lastMessage?.type === 'sensor_data') {
      const now = Date.now();
      setLastDataUpdate(prev => ({
        eeg: lastMessage.eeg?.length ? now : prev.eeg,
        ppg: lastMessage.ppg?.length ? now : prev.ppg,
        acc: lastMessage.acc?.length ? now : prev.acc
      }));
    }
  }, [lastMessage]);

  // Reset data update times when device disconnects
  useEffect(() => {
    if (!connectedDevice) {
      setLastDataUpdate({
        eeg: 0,
        ppg: 0,
        acc: 0
      });
    }
  }, [connectedDevice]);

  // Update current device when device info changes
  React.useEffect(() => {
    if (lastMessage?.type === 'event' && lastMessage.event_type === 'device_info') {
      const deviceInfo = lastMessage.data.device_info;
      if (deviceInfo) {
        setCurrentDevice({
          name: deviceInfo.name,
          address: deviceInfo.address,
        });
      } else {
        setCurrentDevice(null);
      }
    }
  }, [lastMessage]);

  const getConnectionStatusText = () => {
    if (!isConnected) return '서버 연결 안됨';
    if (!connectedDevice) return '디바이스 연결 안됨';
    return '연결됨';
  };

  const getConnectionStatusColor = () => {
    if (!isConnected) return 'error';
    if (!connectedDevice) return 'warning';
    return 'success';
  };

  const getSamplingRate = (rate: number) => {
    return connectedDevice ? rate.toFixed(2) : '0.00';
  };

  const getLeadOffStatus = (status: 'good' | 'bad' | 'unknown') => {
    if (!connectedDevice) {
      return {
        label: '연결 안됨',
        color: 'default' as const
      };
    }
    return {
      label: status === 'good' ? 'Good' : status === 'bad' ? 'Bad' : 'N/A',
      color: status === 'good' ? 'success' : status === 'bad' ? 'error' : 'default'
    } as const;
  };

  const getDataUpdateStatus = (lastUpdate: number) => {
    if (!connectedDevice) return 'disconnected';
    return Date.now() - lastUpdate < 2000 ? 'active' : 'inactive';
  };

  const StatusDot: React.FC<{ status: 'active' | 'inactive' | 'disconnected' }> = ({ status }) => (
    <FiberManualRecordIcon 
      sx={{ 
        fontSize: 12,
        color: status === 'active' ? 'success.main' 
             : status === 'inactive' ? 'error.main'
             : 'grey.500',
        mr: 1,
        verticalAlign: 'middle'
      }} 
    />
  );

  return (
    <Paper elevation={3} sx={{ p: 3, my: 2 }}>
      <Typography variant="h6" gutterBottom>
        Device Manager
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          onClick={connect}
          disabled={!!isConnected}
          color="primary"
        >
          WebSocket 연결
        </Button>
        <Button
          variant="outlined"
          onClick={disconnect}
          disabled={!isConnected}
          color="secondary"
        >
          WebSocket 해제
        </Button>
        <Button
          variant="contained"
          onClick={scanDevices}
          disabled={!isConnected}
        >
          {isConnected ? '디바이스 스캔' : '스캔 중지'}
        </Button>
        <Button
          variant="contained"
          onClick={checkDeviceConnection}
          disabled={!isConnected}
        >
          연결 상태 확인
        </Button>
        <Button
          variant="contained"
          onClick={startStreaming}
          disabled={!isConnected || !connectedDevice || isStreaming}
        >
          스트리밍 시작
        </Button>
        <Button
          variant="outlined"
          onClick={stopStreaming}
          disabled={!isConnected || !isStreaming}
        >
          스트리밍 정지
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          onClick={() => setIsModalOpen(true)}
          color={registeredDevices.length > 0 ? "primary" : "error"}
          sx={{
            '&.MuiButton-containedPrimary': {
              backgroundColor: '#1976d2'
            },
            '&.MuiButton-containedError': {
              backgroundColor: '#d32f2f'
            }
          }}
        >
          디바이스 관리 {registeredDevices.length > 0 ? `(${registeredDevices.length})` : ''}
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" align="center">디바이스 연결 상태</Typography>
      <Box mb={2}>
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="center"
          gap={1} 
          mb={1}
        >
          <Chip
            label={getConnectionStatusText()}
            color={getConnectionStatusColor()}
            size="small"
          />
          {lastUpdateTime && (
            <Typography variant="body2" color="textSecondary">
              마지막 업데이트: {lastUpdateTime.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
        {connectedDevice && (
          <Box textAlign="center">
            <Typography>연결된 디바이스: {connectedDevice.name}</Typography>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={disconnect}
              sx={{ mt: 1 }}
            >
              연결 해제
            </Button>
          </Box>
        )}
      </Box>
      <Typography variant="subtitle1" align="center">배터리 잔량</Typography>
      <Typography mb={2} align="center">{battery !== null ? `${battery}%` : '정보 없음'}</Typography>
      <Typography variant="subtitle1" align="center">데이터 전송 상태</Typography>
      <Box mb={2} display="flex" flexDirection="column" alignItems="center">
        <Box display="flex" alignItems="center" justifyContent="center" width="100%" mb={1}>
          <StatusDot status={getDataUpdateStatus(lastDataUpdate.eeg)} />
          <Typography>EEG: {getSamplingRate(eegRate)} samples/sec</Typography>
        </Box>
        <Box display="flex" alignItems="center" justifyContent="center" width="100%" mb={1}>
          <StatusDot status={getDataUpdateStatus(lastDataUpdate.ppg)} />
          <Typography>PPG: {getSamplingRate(ppgRate)} samples/sec</Typography>
        </Box>
        <Box display="flex" alignItems="center" justifyContent="center" width="100%">
          <StatusDot status={getDataUpdateStatus(lastDataUpdate.acc)} />
          <Typography>ACC: {getSamplingRate(accRate)} samples/sec</Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" align="center">전극 접촉 상태 (Lead-off)</Typography>
      <Stack direction="row" spacing={1} mt={1} justifyContent="center" alignItems="center">
        <Typography>CH1:</Typography>
        <Chip
          label={getLeadOffStatus(leadOffCh1Status).label}
          color={getLeadOffStatus(leadOffCh1Status).color}
          size="small"
        />
        <Typography>CH2:</Typography>
        <Chip
          label={getLeadOffStatus(leadOffCh2Status).label}
          color={getLeadOffStatus(leadOffCh2Status).color}
          size="small"
        />
      </Stack>
      <DeviceRegistrationModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentDevice={currentDevice}
      />
    </Paper>
  );
}; 