import { create } from 'zustand';

interface ServerStatus {
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  pid?: number;
  port: number;
  uptime?: number;
  lastError?: string;
  logs: string[];
}

interface ServerControlResponse {
  success: boolean;
  message: string;
  status?: ServerStatus;
}

interface PythonServerState {
  status: ServerStatus;
  logs: string[];
  isLoading: boolean;
  lastMessage: string | null;
}

interface PythonServerActions {
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;
  restartServer: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  clearLogs: () => void;
  setStatus: (status: ServerStatus) => void;
  addLog: (log: string) => void;
  setLoading: (loading: boolean) => void;
  setMessage: (message: string) => void;
}

interface PythonServerStore extends PythonServerState, PythonServerActions {}

const initialState: PythonServerState = {
  status: {
    status: 'stopped',
    port: 8121,
    logs: []
  },
  logs: [],
  isLoading: false,
  lastMessage: null
};

export const usePythonServerStore = create<PythonServerStore>((set, get) => ({
  ...initialState,

  // Actions
  setStatus: (status: ServerStatus) => {
    set({ status });
  },

  addLog: (log: string) => {
    set(state => ({
      logs: [...state.logs.slice(-99), log] // Keep last 100 logs
    }));
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setMessage: (lastMessage: string) => {
    set({ lastMessage });
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  // Async Actions
  startServer: async () => {
    const { setLoading, setMessage, setStatus } = get();
    setLoading(true);
    setMessage('Starting Python server...');

    try {
      const result: ServerControlResponse = await (window as any).electron.pythonServer.start();
      setMessage(result.message);
      if (result.status) {
        setStatus(result.status);
      }
    } catch (error: any) {
      setMessage(`Failed to start server: ${error.message}`);
      setStatus({
        ...get().status,
        status: 'error',
        lastError: error.message
      });
    } finally {
      setLoading(false);
    }
  },

  stopServer: async () => {
    const { setLoading, setMessage, setStatus } = get();
    setLoading(true);
    setMessage('Stopping Python server...');

    try {
      const result: ServerControlResponse = await (window as any).electron.pythonServer.stop();
      setMessage(result.message);
      if (result.status) {
        setStatus(result.status);
      }
    } catch (error: any) {
      setMessage(`Failed to stop server: ${error.message}`);
      setStatus({
        ...get().status,
        status: 'error',
        lastError: error.message
      });
    } finally {
      setLoading(false);
    }
  },

  restartServer: async () => {
    const { setLoading, setMessage, setStatus } = get();
    setLoading(true);
    setMessage('Restarting Python server...');

    try {
      const result: ServerControlResponse = await (window as any).electron.pythonServer.restart();
      setMessage(result.message);
      if (result.status) {
        setStatus(result.status);
      }
    } catch (error: any) {
      setMessage(`Failed to restart server: ${error.message}`);
      setStatus({
        ...get().status,
        status: 'error',
        lastError: error.message
      });
    } finally {
      setLoading(false);
    }
  },

  refreshStatus: async () => {
    try {
      const status: ServerStatus = await (window as any).electron.pythonServer.getStatus();
      set({ status });
    } catch (error: any) {
      console.error('Failed to refresh server status:', error);
    }
  }
}));

// Setup event listeners when the store is first used
let eventListenersSetup = false;

export const setupPythonServerEventListeners = () => {
  if (eventListenersSetup) return;
  
  // Check if window.electron.pythonServer is available
  if (typeof window === 'undefined' || 
      !(window as any).electron || 
      !(window as any).electron.pythonServer) {
    console.warn('Python server API not available yet, retrying in 1 second...');
    setTimeout(setupPythonServerEventListeners, 1000);
    return;
  }

  eventListenersSetup = true;
  console.log('Setting up Python server event listeners...');

  const store = usePythonServerStore.getState();

  // Listen for status changes
  (window as any).electron.pythonServer.onStatusChange((status: ServerStatus) => {
    usePythonServerStore.getState().setStatus(status);
  });

  // Listen for logs
  (window as any).electron.pythonServer.onLog((log: string) => {
    usePythonServerStore.getState().addLog(log);
  });

  // Listen for server ready
  (window as any).electron.pythonServer.onReady(() => {
    usePythonServerStore.getState().setMessage('Python server is ready');
  });

  // Listen for server stopped
  (window as any).electron.pythonServer.onStopped((info: { code: number; signal?: string }) => {
    usePythonServerStore.getState().setMessage(`Python server stopped with code: ${info.code}`);
  });

  // Initial status fetch
  store.refreshStatus();
}; 