import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { userApi } from '../api/user';
import { deviceApi } from '../api/device';
import { useDeviceManager } from '../stores/deviceManager';
import type { UserResponse } from '../types/user';
import type { DeviceResponse } from '../types/device';

// 공통 스타일 정의 (DeviceManagerModule과 동일)
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

const LinkCloudManagerModule: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserResponse | null>(null);
  const [devices, setDevices] = useState<DeviceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { registeredDevices, cloudEegRate, cloudPpgRate, cloudAccRate } = useDeviceManager();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const data = await userApi.getCurrentUser();
        setUserInfo(data);
        // Store user_id in localStorage for sensor data
        if (data.id) {
          localStorage.setItem('user_id', data.id);
        }
      } catch (err) {
        setError('사용자 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const list = await deviceApi.getDevices();
        setDevices(list);
      } catch (err) {
        setDeviceError('디바이스 목록을 불러오는데 실패했습니다.');
      } finally {
        setDeviceLoading(false);
      }
    };
    fetchDevices();
  }, []);

  const handleSyncDevices = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await deviceApi.resetDevices();
      for (const device of registeredDevices) {
        await deviceApi.createDevice({
          name: device.name,
          address: device.address,
        });
      }
      const list = await deviceApi.getDevices();
      setDevices(list);
    } catch (err) {
      setSyncError('동기화에 실패했습니다.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Stack justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack p={2}>
        <Typography color="error">{error}</Typography>
      </Stack>
    );
  }

  return (
    <Card sx={{ background: 'rgba(40,44,52,0.95)', borderRadius: 4, boxShadow: 6, position: 'relative' }}>
      <CardContent sx={{'&:last-child': { paddingBottom: 2 } }}>
        <Typography sx={commonStyles.sectionTitle}>Link Cloud Manager</Typography>
        <Divider sx={commonStyles.divider} />
        <Stack spacing={1} mt={2}>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" sx={{ color: '#8b8fa3', minWidth: '120px' }}>
              Server Address :
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              {import.meta.env.VITE_LINK_CLOUD_SERVER_URL}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" sx={{ color: '#8b8fa3', minWidth: '120px' }}>
              Email:
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              {userInfo?.email}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" sx={{ color: '#8b8fa3', minWidth: '120px' }}>
              Last Login:
            </Typography>
            <Typography variant="body2" sx={{ color: '#888' }}>
              {userInfo?.updated_at ? new Date(userInfo.updated_at).toLocaleString() : 'N/A'}
            </Typography>
          </Stack>
          <Divider sx={commonStyles.divider} />
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography sx={commonStyles.sectionTitle}>등록한 디바이스</Typography>
            <Button
              variant="outlined"
              size="small"
              color="primary"
              sx={{ ml: 2, fontSize: 12, borderRadius: 2, height: 28 }}
              onClick={handleSyncDevices}
              disabled={syncing}
            >
              {syncing ? '동기화 중...' : 'DeviceManager와 동기화'}
            </Button>
          </Stack>
          {syncError && (
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              {syncError}
            </Typography>
          )}
          {deviceLoading ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={18} />
              <Typography variant="body2" sx={{ color: '#888' }}>불러오는 중...</Typography>
            </Stack>
          ) : deviceError ? (
            <Typography variant="body2" color="error">{deviceError}</Typography>
          ) : devices.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#888' }}>등록된 디바이스가 없습니다.</Typography>
          ) : (
            <Stack spacing={0.5}>
              {devices.map((device) => (
                <Stack key={device.id} direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" sx={{ color: '#fff', flex: 1 }}>
                    {device.name}
                    {device.address && (
                      <span style={{ color: '#888', marginLeft: 8 }}>({device.address})</span>
                    )}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#888' }}>
                    {device.status || ''}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
          <Divider sx={commonStyles.divider} />
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" sx={{ color: '#8b8fa3', minWidth: '120px' }}>
              UUID:
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              {userInfo?.id}
            </Typography>
          </Stack>
          {/* Cloud 전송률 표시 */}
          <Stack direction="row" spacing={1} mt={1} mb={2} flexWrap="wrap" useFlexGap>
            <Chip 
              label={`EEG: ${cloudEegRate.toFixed(1)} Hz`}
              color="primary"
              size="small"
              sx={commonStyles.chip}
            />
            <Chip 
              label={`PPG: ${cloudPpgRate.toFixed(1)} Hz`}
              color="primary"
              size="small"
              sx={commonStyles.chip}
            />
            <Chip 
              label={`ACC: ${cloudAccRate.toFixed(1)} Hz`}
              color="primary"
              size="small"
              sx={commonStyles.chip}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default LinkCloudManagerModule; 