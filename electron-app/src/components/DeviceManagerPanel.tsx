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
import { BatteryIndicator } from './BatteryIndicator';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled';

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
    lastBattery,
    eegRate,
    ppgRate,
    accRate,
    leadOffCh1Status,
    leadOffCh2Status,
    error,
    registeredDevices,
    clients_connected,
    isBluetoothAvailable,
    bluetoothError,
    checkBluetoothStatus,
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
    <>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6">디바이스 관리</Typography>
        <Chip
          icon={isBluetoothAvailable ? <BluetoothIcon /> : <BluetoothDisabledIcon />}
          label={isBluetoothAvailable ? "블루투스 사용 가능" : "블루투스 꺼짐"}
          color={isBluetoothAvailable ? "success" : "error"}
          onClick={checkBluetoothStatus}
        />
      </Box>

      {bluetoothError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {bluetoothError}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom sx={{ textAlign: 'left', mb: 1 }}>
        Device Manager
      </Typography>
      <Paper elevation={3} sx={{ p: 3, my: 2 }}>
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', mb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={() => setIsModalOpen(true)}
              sx={{
                minWidth: 350,
                mb: 0.3,
                py: 0.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                '&.MuiButton-contained': {
                  backgroundColor: !connectedDevice ? 'grey.500' :
                    leadOffCh1Status === 'good' && leadOffCh2Status === 'good' ? '#1976d2' :
                    '#d32f2f',
                  '&:hover': {
                    backgroundColor: !connectedDevice ? 'grey.600' :
                      leadOffCh1Status === 'good' && leadOffCh2Status === 'good' ? '#1565c0' :
                      '#b71c1c',
                  }
                }
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 12 }}>
                {registeredDevices.length === 0 ? '디바이스 등록' :
                  connectedDevice ? connectedDevice.name :
                  registeredDevices[0].name}
              </span>
              <span style={{ fontSize: 12, fontWeight: 400, marginTop: 2 }}>
                {registeredDevices.length === 0
                  ? '연결안됨'
                  : !connectedDevice
                    ? '연결안됨'
                    : leadOffCh1Status !== 'good' || leadOffCh2Status !== 'good'
                      ? '전극접촉불량'
                      : '정상'}
              </span>
            </Button>
            {lastUpdateTime && (
              <Typography variant="body2" color="textSecondary" sx={{ fontSize: 12 }}>
                마지막 업데이트: {lastUpdateTime.toLocaleTimeString()}
              </Typography>
            )}
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" align="center">배터리 잔량</Typography>
        <Box mb={2} display="flex" justifyContent="center">
          {battery !== null ? (
            <BatteryIndicator value={battery} />
          ) : lastBattery !== null ? (
            <BatteryIndicator value={lastBattery} />
          ) : (
            <Typography>정보 없음</Typography>
          )}
        </Box>
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
        <Divider sx={{ my: 2 }} />
        <Box>
          <Typography variant="subtitle1" align="center">디바이스 관리용 로컬 서버 정보</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>서버 상태:</Typography>
              <Chip 
                label={isConnected ? "연결됨" : "연결 안됨"} 
                color={isConnected ? "success" : "error"} 
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>스트리밍 상태:</Typography>
              <Chip 
                label={isStreaming ? "스트리밍 중" : "정지"} 
                color={isStreaming ? "success" : "default"} 
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>연결된 클라이언트:</Typography>
              <Typography>{clients_connected}개</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>등록된 디바이스:</Typography>
              <Typography>{registeredDevices.length}개</Typography>
            </Box>
            {connectedDevice && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>현재 연결된 디바이스:</Typography>
                <Typography>{connectedDevice.name} ({connectedDevice.address})</Typography>
              </Box>
            )}
          </Box>
        </Box>
        <DeviceRegistrationModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentDevice={currentDevice}
        />
        <Divider sx={{ my: 2 }} />
        
      </Paper>
    </>
  );
}; 