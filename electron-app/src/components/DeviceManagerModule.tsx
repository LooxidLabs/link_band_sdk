import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { useDeviceManager } from '../stores/deviceManager';

const SERVER_ADDR = 'localhost';
const SERVER_PORT = 18765;

function statusColor(connected: boolean) {
  return connected ? 'success' : 'error';
}

function streamingColor(isStreaming: boolean) {
  return isStreaming ? 'primary' : 'default';
}

const DeviceManagerModule: React.FC = () => {
  const {
    isConnected,
    isServerConnected,
    isStreaming,
    batteryLevel,
    connectionQuality,
    eegData,
    lastDataUpdate,
    connectedClients,
  } = useDeviceManager();

  // 시간 포맷팅 함수
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}시 ${minutes}분 ${seconds}초`;
  };

  // 5초 이상 경과 여부 확인
  const isStale = () => {
    return (Date.now() - lastDataUpdate) >= 5000;
  };

  // 최신 EEG 데이터에서 leadoff 상태 확인
  const latestEEG = eegData[eegData.length - 1];
  const leadoffCh1 = latestEEG ? (latestEEG.leadoff_ch1 ? '떨어짐' : '접촉') : '--';
  const leadoffCh2 = latestEEG ? (latestEEG.leadoff_ch2 ? '떨어짐' : '접촉') : '--';

  return (
    <Card sx={{ background: 'rgba(40,44,52,0.95)', borderRadius: 4, boxShadow: 6 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Network Info</Typography>
        <Stack direction="row" spacing={2} mb={2}>
          <Chip label={`Server: ${SERVER_ADDR}`} color="info" />
          <Chip label={`Port: ${SERVER_PORT}`} color="info" />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>Status</Typography>
        <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
          <Chip
            label={isServerConnected ? 'DSM 연결됨' : 'DSM 연결끊김'}
            color={statusColor(isServerConnected)}
          />
          <Chip
            label={isConnected ? '디바이스 연결됨' : '디바이스 연결끊김'}
            color={statusColor(isConnected)}
          />
          <Chip
            label={`마지막 업데이트: ${formatTime(lastDataUpdate)}`}
            color={isStale() ? 'warning' : 'success'}
          />
          <Chip
            label={`연결된 클라이언트 수: ${connectedClients}개`}
            color="info"
          />
          <Chip
            label={isStreaming ? '스트리밍 진행중' : '스트리밍 중단됨'}
            color={isStreaming ? 'success' : 'error'}
          />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>Streaming</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Chip label={`EEG: ${connectionQuality.eegRate.toFixed(1)} Hz`} color={streamingColor(isStreaming)} />
          <Chip label={`PPG: ${connectionQuality.ppgRate.toFixed(1)} Hz`} color={streamingColor(isStreaming)} />
          <Chip label={`ACC: ${connectionQuality.accRate.toFixed(1)} Hz`} color={streamingColor(isStreaming)} />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>Device Status</Typography>
        <Stack direction="row" spacing={2}>
          <Chip label={`배터리: ${batteryLevel} %`} color="secondary" />
          <Chip label={`센서 접촉 ch1: ${leadoffCh1}`} color={leadoffCh1 === '접촉' ? 'success' : 'error'} />
          <Chip label={`센서 접촉 ch2: ${leadoffCh2}`} color={leadoffCh2 === '접촉' ? 'success' : 'error'} />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DeviceManagerModule;
