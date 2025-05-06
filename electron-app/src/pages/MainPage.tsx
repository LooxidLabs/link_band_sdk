import { Box } from '@mui/material';
import { AppBarWithAuth } from '../components/AppBarWithAuth';
import { DeviceManagerPanel } from '../components/DeviceManagerPanel';

export default function MainPage() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBarWithAuth />
      <Box sx={{ p: 3 }}>
        <DeviceManagerPanel />
      </Box>
    </Box>
  );
} 