import React, { useState } from 'react';
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
// import BluetoothIcon from '@mui/icons-material/Bluetooth';
import { useDeviceManager } from '../stores/deviceManager';
import DeviceRegisterModal from './DeviceRegisterModal';

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
    // deviceInfo,
    registeredDevices,
    handleUnregister,
    handleScan,
    scannedDevices,
    handleRegister,
    scanLoading,
  } = useDeviceManager();

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const autoScanRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (autoScan) {
      handleScan(); // 즉시 한 번 실행
      autoScanRef.current = setInterval(() => {
        handleScan();
      }, 5000);
    } else {
      if (autoScanRef.current) {
        clearInterval(autoScanRef.current);
        autoScanRef.current = null;
      }
    }
    return () => {
      if (autoScanRef.current) {
        clearInterval(autoScanRef.current);
        autoScanRef.current = null;
      }
    };
  }, [autoScan, handleScan]);

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

  // 디바이스 버튼 라벨 결정
  // const deviceButtonLabel = deviceInfo && deviceInfo.name ? deviceInfo.name : '디바이스 등록';

  return (
    <Card sx={{ background: 'rgba(40,44,52,0.95)', borderRadius: 4, boxShadow: 6, position: 'relative' }}>
      {/* 오른쪽 상단 디바이스 버튼 */}
      {/* <Button
        variant="contained"
        color="secondary"
        startIcon={<BluetoothIcon />}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          minWidth: 120,
          height: 36,
          fontSize: 13,
          fontWeight: 500,
          borderRadius: 2,
          boxShadow: 2,
          zIndex: 10,
          textTransform: 'none',
        }}
        onClick={() => setRegisterModalOpen(true)}
      >
        {deviceButtonLabel}
      </Button> */}
      <DeviceRegisterModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onRegister={handleRegister}
        onUnregister={handleUnregister}
      />
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
          <FormControlLabel
            sx={commonStyles.formControl}
            control={
              <Switch
                checked={autoScan}
                onChange={(e) => setAutoScan(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label="5초에 한번 자동 디바이스 검색"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              sx={commonStyles.updateButton}
              onClick={handleScan}
            >
              수동 디바이스 검색
            </Button>
            <Typography component="span" sx={commonStyles.updateTime}>
              마지막 업데이트: {formatTime(lastDataUpdate)}
            </Typography>
          </Box>
        </Stack>
        {/* 등록된 디바이스 리스트 출력 */}
        <Divider sx={commonStyles.divider} />
        <Typography sx={commonStyles.sectionTitle}>등록된 디바이스</Typography>
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {registeredDevices.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              등록된 디바이스가 없습니다.
            </Typography>
          ) : (
            registeredDevices.map((device) => (
              <Box key={device.address} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: 12, flex: 1 }}>
                  {device.name} <span style={{ color: '#888' }}>({device.address})</span>
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  sx={{ ml: 1, minWidth: 48, fontSize: 12, height: 24 }}
                  onClick={() => handleUnregister(device.address)}
                >
                  등록 해제
                </Button>
              </Box>
            ))
          )}
        </Stack>
        {/* 등록/등록 해제 버튼 */}
        {/* <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {registeredDevices.length === 0 && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleScan}
            >
              디바이스 스캔
            </Button>
          )}
        </Box> */}
        {/* 스캔된 디바이스 리스트 출력 */}
        <Divider sx={commonStyles.divider} />
        <Typography sx={commonStyles.sectionTitle}>스캔된 디바이스</Typography>
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {scanLoading ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              현재 디바이스를 검색중입니다...
            </Typography>
          ) : scannedDevices.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              스캔된 디바이스가 없습니다.
            </Typography>
          ) : (
            scannedDevices.map((device) => (
              <Box key={device.address} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: 12, flex: 1 }}>
                  {device.name} <span style={{ color: '#888' }}>({device.address})</span>
                </Typography>
                {registeredDevices.length === 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ ml: 1, minWidth: 48, fontSize: 12, height: 24 }}
                    onClick={() => handleRegister(device)}
                  >
                    등록
                  </Button>
                )}
              </Box>
            ))
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DeviceManagerModule;
