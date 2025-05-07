import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useDeviceManager } from '../stores/deviceManager';

const SERVER_ADDR = 'localhost';
const SERVER_PORT = 18765;

function statusColor(connected: boolean) {
  return connected ? 'success' : 'error';
}

function streamingColor(isStreaming: boolean) {
  return isStreaming ? 'primary' : 'default';
}

// 공통 스타일 정의
const commonStyles = {
  typography: {
    fontSize: 12,
    fontWeight: 'normal',
  },
  chip: {
    height: 24,
    fontSize: 12,
  },
  divider: {
    margin: '8px 0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  formControl: {
    margin: 0,
    '& .MuiFormControlLabel-label': {
      fontSize: 12,
    },
    '& .MuiSwitch-root': {
      marginRight: 4,
    },
  },
  updateButton: {
    fontSize: 12,
    padding: '4px 8px',
    minWidth: 'unset',
    height: 24,
  },
  updateTime: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
    display: 'inline-flex',
    alignItems: 'center',
  },
};

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
    autoShowWindow,
    setAutoShowWindow,
  } = useDeviceManager();

  // 시간 포맷팅 함수
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}시 ${minutes}분 ${seconds}초`;
  };

  // 최신 EEG 데이터에서 leadoff 상태 확인
  const latestEEG = eegData[eegData.length - 1];
  const leadoffCh1 = latestEEG ? (latestEEG.leadoff_ch1 ? '떨어짐' : '접촉') : '--';
  const leadoffCh2 = latestEEG ? (latestEEG.leadoff_ch2 ? '떨어짐' : '접촉') : '--';

  return (
    <Card sx={{ background: 'rgba(40,44,52,0.95)', borderRadius: 4, boxShadow: 6 }}>
      <CardContent sx={{ '&:last-child': { paddingBottom: 2 } }}>
        <Typography sx={commonStyles.sectionTitle}>Network Info</Typography>
        <Stack direction="row" spacing={1} mb={1}>
          <Chip 
            label={`Server: ${SERVER_ADDR}`} 
            color="info" 
            size="small"
            sx={commonStyles.chip}
          />
          <Chip 
            label={`Port: ${SERVER_PORT}`} 
            color="info" 
            size="small"
            sx={commonStyles.chip}
          />
        </Stack>

        <Divider sx={commonStyles.divider} />
        
        <Typography sx={commonStyles.sectionTitle}>Status</Typography>
        <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" useFlexGap>
          <Chip
            label={isServerConnected ? 'DSM 연결됨' : 'DSM 연결끊김'}
            color={statusColor(isServerConnected)}
            size="small"
            sx={commonStyles.chip}
          />
          <Chip
            label={isConnected ? '디바이스 연결됨' : '디바이스 연결끊김'}
            color={statusColor(isConnected)}
            size="small"
            sx={commonStyles.chip}
          />
          <Chip
            label={`연결된 클라이언트 수: ${connectedClients}개`}
            color="info"
            size="small"
            sx={commonStyles.chip}
          />
          <Chip
            label={isStreaming ? '스트리밍 진행중' : '스트리밍 중단됨'}
            color={isStreaming ? 'success' : 'error'}
            size="small"
            sx={commonStyles.chip}
          />
        </Stack>

        <Divider sx={commonStyles.divider} />
        
        <Typography sx={commonStyles.sectionTitle}>Streaming</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip 
            label={`EEG: ${connectionQuality.eegRate.toFixed(1)} Hz`} 
            color={streamingColor(isStreaming)}
            size="small"
            sx={commonStyles.chip}
          />
          <Chip 
            label={`PPG: ${connectionQuality.ppgRate.toFixed(1)} Hz`} 
            color={streamingColor(isStreaming)}
            size="small"
            sx={commonStyles.chip}
          />
          <Chip 
            label={`ACC: ${connectionQuality.accRate.toFixed(1)} Hz`} 
            color={streamingColor(isStreaming)}
            size="small"
            sx={commonStyles.chip}
          />
        </Stack>

        <Divider sx={commonStyles.divider} />
        
        <Typography sx={commonStyles.sectionTitle}>Device Status</Typography>
        <Stack direction="row" spacing={1}>
          <Chip 
            label={`배터리: ${batteryLevel} %`} 
            color="secondary"
            size="small"
            sx={commonStyles.chip}
          />
          <Chip 
            label={`센서 접촉 ch1: ${leadoffCh1}`} 
            color={leadoffCh1 === '접촉' ? 'success' : 'error'}
            size="small"
            sx={commonStyles.chip}
          />
          <Chip 
            label={`센서 접촉 ch2: ${leadoffCh2}`} 
            color={leadoffCh2 === '접촉' ? 'success' : 'error'}
            size="small"
            sx={commonStyles.chip}
          />
        </Stack>

        <Divider sx={commonStyles.divider} />
        
        <Typography sx={commonStyles.sectionTitle}>Settings</Typography>
        <Stack spacing={1}>
          <FormControlLabel
            sx={commonStyles.formControl}
            control={
              <Switch
                checked={autoShowWindow}
                onChange={(e) => setAutoShowWindow(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label="디바이스 연결 시 화면 자동 켜짐"
          />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              sx={commonStyles.updateButton}
              onClick={() => window.electron?.ipcRenderer?.send('show-window')}
            >
              수동 업데이트
            </Button>
            <Typography component="span" sx={commonStyles.updateTime}>
              마지막 업데이트: {formatTime(lastDataUpdate)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DeviceManagerModule;
