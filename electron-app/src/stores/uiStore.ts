import { create } from 'zustand';
import type { AlertColor } from '@mui/material/Alert';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
  showSnackbar: (params: { message: string; severity?: AlertColor }) => void;
  hideSnackbar: () => void;
}

export const useUiStore = create<SnackbarState>((set) => ({
  open: false,
  message: '',
  severity: 'info', // Default severity
  showSnackbar: ({ message, severity = 'info' }) =>
    set({ open: true, message, severity }),
  hideSnackbar: () => set({ open: false, message: '' }), // Clear message on hide
}));

export type MenuId = 'engine' | 'linkband' | 'visualizer' | 'datacenter' | 'cloudmanager' | 'settings';

interface UIState {
  activeMenu: MenuId;
  setActiveMenu: (menu: MenuId) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeMenu: 'engine',
  setActiveMenu: (menu) => set({ activeMenu: menu }),
})); 