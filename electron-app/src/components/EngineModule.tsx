import React, { useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { 
  Power as PowerIcon,
  Refresh as RefreshIcon,
  PowerOff as PowerOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Computer as ServerIcon,
  Wifi as WifiIcon,
  Storage as DatabaseIcon,
  Monitor as MonitorIcon,
  Computer as CpuIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';
import { useSystemStatus, useSystemActions } from '../hooks/useSystemManager';
import { useSystemStore } from '../stores/core/SystemStore';

// DeviceManagerModule과 동일한 공통 스타일 정의
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
  button: {
    fontSize: 12,
    padding: '6px 12px',
    minWidth: 'unset',
    height: 32,
    textTransform: 'none' as const,
  },
  statusContainer: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
};

const EngineModule: React.FC = () => {
  const {
    isInitialized,
    isInitializing,
    initializationError
  } = useSystemStatus();

  const { initialize, shutdown, restart, clearError } = useSystemActions();
  
  const deviceState = useSystemStore(state => state.device);
  const streamingStatus = useSystemStore(state => state.streaming);
  const recordingStatus = useSystemStore(state => state.recording);
  const monitoringData = useSystemStore(state => state.monitoring);
  const connectionState = useSystemStore(state => state.connection);

  // 모니터링 데이터 변경 감지
  useEffect(() => {
    console.log('[EngineModule] Monitoring data updated:', monitoringData);
  }, [monitoringData]);

  // SystemStore의 모니터링 데이터만 사용
  const effectiveMonitoringData = monitoringData;

  const getSystemStatusInfo = () => {
    if (isInitializing) {
      return {
        title: 'System Initializing...',
        color: 'warning' as const,
        icon: <CircularProgress size={20} />,
        description: 'Connecting to Python server and setting up communication channels'
      };
    }
    
    if (isInitialized && connectionState.api && connectionState.websocket) {
      return {
        title: 'System Running',
        color: 'success' as const,
        icon: <CheckCircleIcon />,
        description: 'All systems operational - monitoring active'
      };
    }
    
    if (initializationError) {
      return {
        title: 'System Error',
        color: 'error' as const,
        icon: <ErrorIcon />,
        description: `Error: ${initializationError}`
      };
    }
    
    return {
      title: 'System Offline',
      color: 'default' as const,
      icon: <PowerOffIcon />,
      description: 'Python server not detected - click Initialize to start'
    };
  };

  const systemStatus = getSystemStatusInfo();

  return (
    <Card sx={{ background: 'rgba(40,44,52,0.95)', borderRadius: 4, boxShadow: 6 }}>
      <CardContent sx={{ '&:last-child': { paddingBottom: 2 } }}>
        {/* 시스템 상태 헤더 */}
        <Typography sx={commonStyles.sectionTitle}>System Status</Typography>
        <Box sx={commonStyles.statusContainer} mb={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ 
                color: systemStatus.color === 'success' ? '#10b981' : 
                       systemStatus.color === 'warning' ? '#f59e0b' : 
                       systemStatus.color === 'error' ? '#ef4444' : '#6b7280' 
              }}>
                {systemStatus.icon}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ 
                  fontSize: 16, 
                  fontWeight: 'bold', 
                  mb: 0.5,
                  color: systemStatus.color === 'success' ? '#10b981' : 
                         systemStatus.color === 'warning' ? '#f59e0b' : 
                         systemStatus.color === 'error' ? '#ef4444' : '#6b7280'
                }}>
                  {systemStatus.title}
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontSize: 12, 
                  color: '#888',
                  maxWidth: '400px'
                }}>
                  {systemStatus.description}
                </Typography>
              </Box>
            </Stack>
            
            {/* 시스템 제어 버튼들 */}
            <Stack direction="row" spacing={1}>
              {!isInitialized && !isInitializing && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={initialize}
                  startIcon={<PowerIcon />}
                  sx={commonStyles.button}
                >
                  Initialize
                </Button>
              )}
              
              {isInitialized && (
                <>
                  <Button
                    variant="contained"
                    color="warning"
                    size="small"
                    onClick={restart}
                    startIcon={<RefreshIcon />}
                    sx={commonStyles.button}
                  >
                    Restart
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={shutdown}
                    startIcon={<PowerOffIcon />}
                    sx={commonStyles.button}
                  >
                    Shutdown
                  </Button>
                </>
              )}
              
              {initializationError && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={clearError}
                  sx={commonStyles.button}
                >
                  Clear Error
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        {/* 시스템이 초기화된 경우에만 모니터링 정보 표시 */}
        {isInitialized && (
          <>
            <Divider sx={commonStyles.divider} />
            
            {/* 연결 상태 */}
            <Typography sx={commonStyles.sectionTitle}>Connection Status</Typography>
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<WifiIcon />}
                label={`WebSocket: ${connectionState.websocket ? 'Connected' : 'Disconnected'}`}
                color={connectionState.websocket ? 'success' : 'error'}
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                icon={<ServerIcon />}
                label={`API: ${connectionState.api ? 'Connected' : 'Disconnected'}`}
                color={connectionState.api ? 'success' : 'error'}
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                label={`Status: ${connectionState.overall}`}
                color={connectionState.overall === 'healthy' ? 'success' : 
                       connectionState.overall === 'degraded' ? 'warning' : 'error'}
                size="small"
                sx={commonStyles.chip}
              />
            </Stack>

            <Divider sx={commonStyles.divider} />

            {/* 디바이스 상태 */}
            <Typography sx={commonStyles.sectionTitle}>Device Status</Typography>
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Connected: ${deviceState.current?.isConnected ? 'Yes' : 'No'}`}
                color={deviceState.current?.isConnected ? 'success' : 'error'}
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                label={`Device: ${deviceState.current?.name || 'None'}`}
                color="info"
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                label={`Scanning: ${deviceState.isScanning ? 'Active' : 'Inactive'}`}
                color={deviceState.isScanning ? 'warning' : 'default'}
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                label={`Discovered: ${deviceState.discovered.length} devices`}
                color="info"
                size="small"
                sx={commonStyles.chip}
              />
            </Stack>

            <Divider sx={commonStyles.divider} />

            {/* 스트리밍 상태 */}
            <Typography sx={commonStyles.sectionTitle}>Streaming Status</Typography>
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Streaming: ${streamingStatus.isStreaming ? 'Active' : 'Inactive'}`}
                color={streamingStatus.isStreaming ? 'success' : 'default'}
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                label={`EEG Data: ${streamingStatus.dataCount.eeg} packets`}
                color="info"
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                label={`PPG Data: ${streamingStatus.dataCount.ppg} packets`}
                color="info"
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                label={`ACC Data: ${streamingStatus.dataCount.acc} packets`}
                color="info"
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                label={`Battery Data: ${streamingStatus.dataCount.battery} packets`}
                color="info"
                size="small"
                sx={commonStyles.chip}
              />
            </Stack>

            <Divider sx={commonStyles.divider} />

            {/* 레코딩 상태 */}
            <Typography sx={commonStyles.sectionTitle}>Recording Status</Typography>
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<DatabaseIcon />}
                label={`Recording: ${recordingStatus.isRecording ? 'Active' : 'Inactive'}`}
                color={recordingStatus.isRecording ? 'success' : 'default'}
                size="small"
                sx={commonStyles.chip}
              />
              {recordingStatus.sessionId && (
                <Chip
                  label={`Session: ${recordingStatus.sessionId}`}
                  color="info"
                  size="small"
                  sx={commonStyles.chip}
                />
              )}
              {recordingStatus.duration > 0 && (
                <Chip
                  label={`Duration: ${Math.floor(recordingStatus.duration / 1000)}s`}
                  color="info"
                  size="small"
                  sx={commonStyles.chip}
                />
              )}
            </Stack>

            <Divider sx={commonStyles.divider} />

            {/* 모니터링 데이터 */}
            <Typography sx={commonStyles.sectionTitle}>System Monitoring</Typography>
            <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<MonitorIcon />}
                label={`Health Score: ${effectiveMonitoringData.systemHealth}/100`}
                color={effectiveMonitoringData.systemHealth >= 90 ? 'success' :   // excellent (90+)
                       effectiveMonitoringData.systemHealth >= 75 ? 'success' :   // good (75-89)
                       effectiveMonitoringData.systemHealth >= 60 ? 'warning' :   // fair (60-74)
                       effectiveMonitoringData.systemHealth >= 40 ? 'error' :     // poor (40-59)
                       'error'}                                                   // critical (<40)
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                icon={<CpuIcon />}
                label={`CPU: ${effectiveMonitoringData.performance.cpuUsage.toFixed(1)}%`}
                color={effectiveMonitoringData.performance.cpuUsage < 70 ? 'success' : 
                       effectiveMonitoringData.performance.cpuUsage < 85 ? 'warning' : 'error'}
                size="small"
                sx={commonStyles.chip}
              />
              <Chip
                icon={<MemoryIcon />}
                label={`Memory: ${effectiveMonitoringData.performance.memoryUsage.toFixed(1)}%`}
                color={effectiveMonitoringData.performance.memoryUsage < 70 ? 'success' : 
                       effectiveMonitoringData.performance.memoryUsage < 85 ? 'warning' : 'error'}
                size="small"
                sx={commonStyles.chip}
              />
            </Stack>

            {/* 알림 표시 */}
            {monitoringData.alerts.length > 0 && (
              <Box mt={1}>
                <Typography sx={{ ...commonStyles.sectionTitle, color: '#f59e0b' }}>
                  Active Alerts ({monitoringData.alerts.length})
                </Typography>
                <Stack spacing={0.5}>
                  {monitoringData.alerts.slice(0, 3).map((alert) => (
                    <Chip
                      key={alert.id}
                      label={`${alert.level.toUpperCase()}: ${alert.message}`}
                      color={alert.level === 'critical' ? 'error' : 
                             alert.level === 'error' ? 'error' :
                             alert.level === 'warning' ? 'warning' : 'info'}
                      size="small"
                      sx={{ ...commonStyles.chip, width: 'fit-content' }}
                    />
                  ))}
                  {monitoringData.alerts.length > 3 && (
                    <Typography sx={{ fontSize: 11, color: '#888', mt: 0.5 }}>
                      +{monitoringData.alerts.length - 3} more alerts
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </>
        )}

        {/* 시스템이 오프라인일 때 도움말 */}
        {!isInitialized && !isInitializing && (
          <Box mt={2}>
            <Typography sx={{ ...commonStyles.sectionTitle, color: '#888' }}>
              Getting Started
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#666', lineHeight: 1.4 }}>
              1. Make sure Python server is running: <code>cd python_core && python run_server.py</code><br/>
              2. Click "Initialize" to connect to the server<br/>
              3. Use Link Band module to connect your device<br/>
              4. Start streaming data and monitoring
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EngineModule; 