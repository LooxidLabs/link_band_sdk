import { useState } from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, IconButton } from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import DashboardIcon from '@mui/icons-material/BarChart';
import PsychologyIcon from '@mui/icons-material/Psychology';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/CloudQueue';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const menuItems = [
  { label: 'Engine', icon: <MemoryIcon /> },
  { label: 'Link Band', icon: <PsychologyIcon /> },
  { label: 'Visualizer', icon: <DashboardIcon /> },
  { label: 'Data Center', icon: <StorageIcon /> },
  { label: 'Link Cloud Manager', icon: <CloudIcon /> },
  { label: 'Settings', icon: <SettingsIcon /> },
];

export const Sidebar = ({ selected, onSelect }: { selected: string, onSelect: (label: string) => void }) => {
  const [minimized, setMinimized] = useState(false);
  const width = minimized ? 60 : 220;

  return (
    <Box
      sx={{
        width,
        minWidth: minimized ? 60 : 120,
        maxWidth: 320,
        height: '100vh',
        bgcolor: 'background.paper',
        borderRight: '1px solid #23263a',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 2,
        fontSize: 12,
        transition: 'width 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <IconButton
        onClick={() => setMinimized((v) => !v)}
        size="small"
        sx={{
          color: 'primary.main',
          position: 'absolute',
          top: 12,
          right: 8,
          zIndex: 10,
          bgcolor: 'background.paper',
          boxShadow: 1,
          '&:hover': { bgcolor: 'rgba(100,108,255,0.08)' },
        }}
      >
        {minimized ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
      </IconButton>
      <List sx={{ pt: 5 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.label}
            selected={selected === item.label}
            onClick={() => onSelect(item.label)}
            sx={{
              borderRadius: 2,
              mb: 1,
              mx: 1,
              color: selected === item.label ? 'primary.main' : 'inherit',
              background: selected === item.label ? 'rgba(100,108,255,0.08)' : 'none',
              fontSize: 12,
              justifyContent: minimized ? 'center' : 'flex-start',
              px: minimized ? 1 : 2,
            }}
          >
            <ListItemIcon sx={{ color: selected === item.label ? 'primary.main' : 'inherit', minWidth: 32, justifyContent: 'center', display: 'flex' }}>
              {item.icon}
            </ListItemIcon>
            {!minimized && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 12 }} />}
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ flex: 1 }} />
    </Box>
  );
};
export default Sidebar; 