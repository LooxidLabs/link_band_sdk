import { Box, Container, CssBaseline, ThemeProvider, Typography } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import DeviceManagerModule from '../components/DeviceManagerModule';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#646cff',
    },
    background: {
      default: '#181a20',
      paper: '#23263a',
    },
    secondary: {
      main: '#ff61e6',
    },
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    h2: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 400,
      color: '#bdbdbd',
    },
  },
});

export default function MainPage() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #181a20 0%, #23263a 100%)' }}>
        <Container maxWidth="md" sx={{ pt: 8 }}>
          <Typography variant="h2" align="center" gutterBottom>
            LINK BAND SDK
          </Typography>
          <Typography variant="h5" align="center" gutterBottom>
            Device Management System
          </Typography>
          <Box sx={{ mt: 6 }}>
            <DeviceManagerModule />
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
