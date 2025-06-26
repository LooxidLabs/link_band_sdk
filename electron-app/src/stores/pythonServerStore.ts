import { create } from 'zustand';
import { metricsApi } from '../api/metrics';

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
  // UI sync state - simple boolean for UI components
  isRunning: boolean;
  // Metrics verification state
  isVerifyingMetrics: boolean;
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
  setRunning: (running: boolean) => void;
  verifyMetricsApi: () => Promise<void>;
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
  lastMessage: null,
  isRunning: false,
  isVerifyingMetrics: false
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

  setRunning: (isRunning: boolean) => {
    set({ isRunning });
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  // Async Actions
  startServer: async () => {
    const { setLoading, setMessage, setStatus, setRunning, verifyMetricsApi } = get();
    
    // Prevent multiple simultaneous start attempts
    const currentStatus = get().status;
    if (currentStatus.status === 'starting' || currentStatus.status === 'running') {
      console.log('Server is already starting or running, ignoring start request');
      return;
    }
    
    setLoading(true);
    setMessage('Starting Python server...');

    try {
      const result: ServerControlResponse = await (window as any).electron.pythonServer.start();
      setMessage(result.message);
      if (result.status) {
        setStatus(result.status);
        setRunning(result.status.status === 'running' || result.status.status === 'starting');
        
        // If server is starting, begin metrics verification
        if (result.status.status === 'starting') {
          verifyMetricsApi();
        }
      }
    } catch (error: any) {
      setMessage(`Failed to start server: ${error.message}`);
      setStatus({
        ...get().status,
        status: 'error',
        lastError: error.message
      });
      setRunning(false);
    } finally {
      setLoading(false);
    }
  },

  stopServer: async () => {
    const { setLoading, setMessage, setStatus, setRunning } = get();
    setLoading(true);
    setMessage('Stopping Python server...');

    try {
      const result: ServerControlResponse = await (window as any).electron.pythonServer.stop();
      setMessage(result.message);
      if (result.status) {
        setStatus(result.status);
        setRunning(result.status.status === 'running' || result.status.status === 'starting');
      }
    } catch (error: any) {
      setMessage(`Failed to stop server: ${error.message}`);
      setStatus({
        ...get().status,
        status: 'error',
        lastError: error.message
      });
      setRunning(false);
    } finally {
      setLoading(false);
    }
  },

  restartServer: async () => {
    const { setLoading, setMessage, setStatus, setRunning } = get();
    setLoading(true);
    setMessage('Restarting Python server...');

    try {
      const result: ServerControlResponse = await (window as any).electron.pythonServer.restart();
      setMessage(result.message);
      if (result.status) {
        setStatus(result.status);
        setRunning(result.status.status === 'running' || result.status.status === 'starting');
      }
    } catch (error: any) {
      setMessage(`Failed to restart server: ${error.message}`);
      setStatus({
        ...get().status,
        status: 'error',
        lastError: error.message
      });
      setRunning(false);
    } finally {
      setLoading(false);
    }
  },

  refreshStatus: async () => {
    try {
      const status: ServerStatus = await (window as any).electron.pythonServer.getStatus();
      set({ 
        status,
        isRunning: status.status === 'running' || status.status === 'starting'
      });
    } catch (error: any) {
      console.error('Failed to refresh server status:', error);
    }
  },

  verifyMetricsApi: async () => {
    const { setMessage, setStatus, setRunning } = get();
    const currentStatus = get().status;
    
    // Only verify if server is in starting state
    if (currentStatus.status !== 'starting') {
      return;
    }

    set({ isVerifyingMetrics: true });
    setMessage('Verifying server readiness...');

    let attempts = 0;
    const maxAttempts = 30; // 30 attempts = 30 seconds max
    
    const checkMetrics = async (): Promise<boolean> => {
      try {
        await metricsApi.getMetrics();
        return true; // API is responding
      } catch (error) {
        return false; // API not ready yet
      }
    };

    const pollMetrics = async () => {
      while (attempts < maxAttempts && get().status.status === 'starting') {
        attempts++;
        console.log(`Checking metrics API readiness... attempt ${attempts}/${maxAttempts}`);
        
        const isReady = await checkMetrics();
        
        if (isReady) {
          console.log('Metrics API is ready! Server is fully operational.');
          setMessage('Server is ready!');
          setStatus({
            ...currentStatus,
            status: 'running'
          });
          setRunning(true);
          set({ isVerifyingMetrics: false });
          return;
        }
        
        // Wait 1 second before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // If we reach here, verification failed
      console.warn('Metrics API verification timed out');
      setMessage('Server started but API verification timed out');
      setStatus({
        ...currentStatus,
        status: 'running', // Still mark as running, but with warning
        lastError: 'API verification timed out'
      });
      setRunning(true);
      set({ isVerifyingMetrics: false });
    };

    // Start polling in background
    pollMetrics().catch(error => {
      console.error('Error during metrics verification:', error);
      setMessage('Server started but verification failed');
      setStatus({
        ...currentStatus,
        status: 'running',
        lastError: 'Verification failed'
      });
      setRunning(true);
      set({ isVerifyingMetrics: false });
    });
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
    const store = usePythonServerStore.getState();
    store.setStatus(status);
    store.setRunning(status.status === 'running' || status.status === 'starting');
    
    // If server just started, begin metrics verification
    if (status.status === 'starting') {
      store.verifyMetricsApi();
    }
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

  // Initial status fetch - only once when listeners are set up
  setTimeout(() => {
    store.refreshStatus();
  }, 1000); // Delay to ensure backend is ready
}; 