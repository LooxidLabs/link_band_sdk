import React, { useState } from 'react';
import { useDeviceManager, LeadOffStatus } from '../stores/device_manager';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';

export const DeviceManagerPanel: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const {
    connect,
    disconnect,
    scanDevices,
    connectDevice,
    disconnectDevice,
    checkDeviceConnection,
    startStreaming,
    stopStreaming,
    isConnected,
    isStreaming,
    scannedDevices,
    connectedDevice,
    battery,
    eegRate,
    ppgRate,
    accRate,
    leadOffCh1Status,
    leadOffCh2Status,
    error,
  } = useDeviceManager();

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Device Manager
      </Typography>
      <Stack direction="row" spacing={2} mb={2}>
        <Button variant="contained" onClick={connect} disabled={!!isConnected} color="primary">
          WebSocket 연결
        </Button>
        <Button variant="outlined" onClick={disconnect} disabled={!isConnected} color="secondary">
          WebSocket 해제
        </Button>
        <Button variant="contained" onClick={scanDevices} disabled={!isConnected}>
          디바이스 스캔
        </Button>
        <Button variant="contained" onClick={checkDeviceConnection} disabled={!isConnected}>
          연결 상태 확인
        </Button>
        <Button variant="contained" onClick={startStreaming} disabled={!isConnected || !connectedDevice || isStreaming}>
          스트리밍 시작
        </Button>
        <Button variant="outlined" onClick={stopStreaming} disabled={!isConnected || !isStreaming}>
          스트리밍 정지
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1">디바이스 스캔 정보</Typography>
      <List dense>
        {scannedDevices.length === 0 && <ListItem><ListItemText primary="(검색된 디바이스 없음)" /></ListItem>}
        {scannedDevices.map((dev) => (
          <ListItem
            key={dev.address}
            selected={selectedDevice === dev.address}
            secondaryAction={
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  setSelectedDevice(dev.address);
                  connectDevice(dev.address);
                }}
                disabled={!isConnected || !!(connectedDevice && connectedDevice.address === dev.address)}
              >
                연결
              </Button>
            }
            onClick={() => setSelectedDevice(dev.address)}
          >
            <ListItemText
              primary={dev.name || '(이름 없음)'}
              secondary={dev.address}
            />
            {connectedDevice && connectedDevice.address === dev.address && (
              <Chip label="연결됨" color="success" size="small" sx={{ ml: 1 }} />
            )}
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1">디바이스 연결 상태</Typography>
      <Box mb={2}>
        {connectedDevice ? (
          <>
            <Typography>연결됨: {connectedDevice.name} ({connectedDevice.address})</Typography>
            <Button size="small" variant="outlined" color="secondary" onClick={disconnectDevice} sx={{ mt: 1 }}>
              연결 해제
            </Button>
          </>
        ) : (
          <Typography color="text.secondary">연결된 디바이스 없음</Typography>
        )}
      </Box>
      <Typography variant="subtitle1">배터리 잔량</Typography>
      <Typography mb={2}>{battery !== null ? `${battery}%` : '정보 없음'}</Typography>
      <Typography variant="subtitle1">데이터 전송 상태</Typography>
      <Box mb={2}>
        <Typography>EEG: {eegRate.toFixed(2)} samples/sec</Typography>
        <Typography>PPG: {ppgRate.toFixed(2)} samples/sec</Typography>
        <Typography>ACC: {accRate.toFixed(2)} samples/sec</Typography>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1">전극 접촉 상태 (Lead-off)</Typography>
      <Stack direction="row" spacing={1} mt={1}>
        <Typography>CH1:</Typography>
        <Chip
          label={leadOffCh1Status === 'good' ? 'Good' : leadOffCh1Status === 'bad' ? 'Bad' : 'N/A'}
          color={leadOffCh1Status === 'good' ? 'success' : leadOffCh1Status === 'bad' ? 'error' : 'default'}
          size="small"
        />
        <Typography>CH2:</Typography>
        <Chip
          label={leadOffCh2Status === 'good' ? 'Good' : leadOffCh2Status === 'bad' ? 'Bad' : 'N/A'}
          color={leadOffCh2Status === 'good' ? 'success' : leadOffCh2Status === 'bad' ? 'error' : 'default'}
          size="small"
        />
      </Stack>
    </Paper>
  );
}; 