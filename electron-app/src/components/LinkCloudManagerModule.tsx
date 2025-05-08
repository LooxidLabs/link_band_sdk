import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import { userApi } from '../api/user';
import type { UserResponse } from '../types/user';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const data = await userApi.getCurrentUser();
        setUserInfo(data);
      } catch (err) {
        setError('사용자 정보를 불러오는데 실패했습니다.');
        console.error('Failed to fetch user info:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserInfo();
  }, []);

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
        <Stack spacing={1} mt={1}>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" sx={{ color: '#8b8fa3', minWidth: '120px' }}>
              Server Address :
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              {import.meta.env.VITE_LINK_CLOUD_SERVER_URL}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" sx={{ color: '#8b8fa3', minWidth: '120px' }}>
              Email:
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              {userInfo?.email}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" sx={{ color: '#8b8fa3', minWidth: '120px' }}>
              Last Login:
            </Typography>
            <Typography variant="body2" sx={{ color: '#888' }}>
              {userInfo?.updated_at ? new Date(userInfo.updated_at).toLocaleString() : 'N/A'}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default LinkCloudManagerModule; 