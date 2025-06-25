import { create } from 'zustand';
// import { message } from 'antd'; // Ant Design message is no longer used directly here
import type { 
  DataCenterState,
  DataCenterStore,
  FileInfo,
  SearchParams, 
  ExportParams, 
  ExportHistory,
  RecordingStatusResponse,
  Session
} from '../types/data-center';
import * as dataCenterApi from '../api/dataCenter'; // Corrected import path
import { useUiStore } from './uiStore'; // Import the UI store
// No longer need ApiResponse from '../types/api' for store logic with new API structure

const initialState: DataCenterState = {
  files: [],
  loading: false,
  exportHistory: [],
  searchParams: {
    dateRange: null,
    fileTypes: [],
    searchText: ''
  },
  activeTab: 'sessions',
  sessions: [],
  sessionsLoading: false,
  recordingStatus: { // Initial recording status
    is_recording: false,
    current_session: null,
    start_time: null,
  },
};

export const useDataCenterStore = create<DataCenterStore>((set) => ({
  ...initialState,

  // Actions
  setFiles: (files: FileInfo[]) => set({ files }),
  setLoading: (loading: boolean) => set({ loading }),
  setExportHistory: (history: ExportHistory[]) => set({ exportHistory: history }),
  setSearchParams: (params: SearchParams) => set({ searchParams: params }),
  setActiveTab: (tab: string) => set({ activeTab: tab }),
  setSessions: (sessions: Session[]) => set({ sessions }),
  setSessionsLoading: (loading: boolean) => set({ sessionsLoading: loading }),
  setRecordingStatus: (status: RecordingStatusResponse) => set({ recordingStatus: status }),

  // Async Actions with updated error handling
  searchFiles: async (params: SearchParams) => {
    set({ loading: true });
    try {
      const filesData = await dataCenterApi.searchFiles(params);
      set({ files: filesData, loading: false });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg = error?.response?.data?.message;
      const errorMessage = detail || msg || error?.message || '파일 검색에 실패했습니다.';
      useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'error' });
      set({ loading: false, files: [] });
    }
  },

  exportData: async (params: ExportParams) => {
    set({ loading: true });
    try {
      const exportResult = await dataCenterApi.exportData(params);
      set((state) => ({
        exportHistory: [exportResult, ...state.exportHistory],
        loading: false,
      }));
      useUiStore.getState().showSnackbar({ message: '데이터 내보내기가 성공적으로 완료되었습니다.', severity: 'success' });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg = error?.response?.data?.message;
      const errorMessage = detail || msg || error?.message || '데이터 내보내기에 실패했습니다.';
      useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'error' });
      set({ loading: false });
      throw error; // Re-throw for component to catch if needed
    }
  },

  openFile: async (filePath: string) => {
    try {
      const result = await dataCenterApi.openFile(filePath);
      if (result.success) {
        // Optional: show success snackbar if needed, though opening a file might not require it.
        // useUiStore.getState().showSnackbar({ message: result.message || 'File opened successfully.', severity: 'success' });
      } else {
        // If openFile itself throws an error for !result.success, this part might not be reached.
        // Otherwise, handle non-successful result here.
        useUiStore.getState().showSnackbar({ message: result.message || 'Could not open file.', severity: 'error' });
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg = error?.response?.data?.message;
      const ipcErrorMessage = error?.message;
      const errorMessage = detail || msg || ipcErrorMessage || '파일을 열 수 없습니다.';
      useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'error' });
    }
  },

  copyFilePath: async (file: FileInfo) => {
    try {
      await navigator.clipboard.writeText(file.file_path);
      useUiStore.getState().showSnackbar({ message: '파일 경로가 복사되었습니다.', severity: 'success' });
    } catch (error: any) {
      useUiStore.getState().showSnackbar({ message: '경로 복사에 실패했습니다.', severity: 'error' });
    }
  },

  // Recording Actions with updated error handling
  fetchRecordingStatus: async () => {
    try {
      const statusData = await dataCenterApi.getRecordingStatus();
      set({ 
        recordingStatus: {
          is_recording: statusData.is_recording,
          current_session: statusData.current_session,
          start_time: statusData.start_time,
        }
      });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg = error?.response?.data?.message;
      const consoleErrorMessage = detail || msg || error?.message || 'Unknown error';
      console.error("Failed to fetch recording status:", consoleErrorMessage);
      // Optionally, show a non-intrusive snackbar for fetch errors, or handle silently
      // useUiStore.getState().showSnackbar({ message: `Recording status fetch failed: ${consoleErrorMessage}`, severity: 'warning' });
    }
  },

  startRecording: async (sessionData?: any) => {
    set({ loading: true });
    try {
      const responseData = await dataCenterApi.startRecording(sessionData);
      if (responseData.status === 'started') {
        useUiStore.getState().showSnackbar({ message: 'Recording started successfully', severity: 'success' });
        set({ 
          recordingStatus: {
            is_recording: true,
            current_session: responseData.session_name || null,
            start_time: responseData.start_time || null,
          },
          loading: false
        });
      } else {
        const errorMessage = responseData.message || 'Failed to start recording (server reported not started)';
        useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'warning' });
        set({ loading: false });
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg = error?.response?.data?.message;
      const errorMessage = detail || msg || error?.message || 'Failed to start recording';
      useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'error' });
      set({ loading: false });
    }
  },

  stopRecording: async () => {
    set({ loading: true });
    try {
      const responseData = await dataCenterApi.stopRecording();
      if (responseData.status === 'stopped') {
        useUiStore.getState().showSnackbar({ message: 'Recording stopped successfully', severity: 'success' });
        set({ 
          recordingStatus: {
            is_recording: false,
            current_session: null,
            start_time: null,
          },
          loading: false
        });
        
        // 레코딩 중지 후 세션 리스트 새로고침
        try {
          const sessionsData = await dataCenterApi.getSessions();
          set({ sessions: sessionsData });
        } catch (sessionError) {
          console.error('Failed to refresh sessions after recording stop:', sessionError);
        }
      } else {
        const errorMessage = responseData.message || 'Failed to stop recording (server reported not stopped)';
        useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'warning' });
        set({ loading: false });
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg = error?.response?.data?.message;
      const errorMessage = detail || msg || error?.message || 'Failed to stop recording';
      useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'error' });
      set({ loading: false });
    }
  },

  fetchSessions: async () => {
    set({ sessionsLoading: true });
    try {
      console.log('[Store] Fetching sessions...');
      const sessionsData = await dataCenterApi.getSessions();
      console.log('[Store] Sessions fetched successfully:', sessionsData);
      
      // 데이터가 배열인지 확인
      if (Array.isArray(sessionsData)) {
        set({ sessions: sessionsData, sessionsLoading: false });
      } else {
        console.warn('[Store] Sessions data is not an array:', sessionsData);
        set({ sessions: [], sessionsLoading: false });
      }
    } catch (error: any) {
      console.error('[Store] Error fetching sessions:', error);
      const detail = error?.response?.data?.detail;
      const msg = error?.response?.data?.message;
      const errorMessage = detail || msg || error?.message || 'Failed to fetch sessions';
      
      // 네트워크 오류나 서버 연결 문제인 경우 재시도
      if (error?.code === 'ECONNREFUSED' || error?.response?.status >= 500) {
        console.log('[Store] Server connection issue, retrying in 2 seconds...');
        setTimeout(async () => {
          try {
            const retryData = await dataCenterApi.getSessions();
            console.log('[Store] Retry successful:', retryData);
            if (Array.isArray(retryData)) {
              set({ sessions: retryData, sessionsLoading: false });
            } else {
              set({ sessions: [], sessionsLoading: false });
            }
          } catch (retryError) {
            console.error('[Store] Retry failed:', retryError);
            set({ sessionsLoading: false, sessions: [] });
          }
        }, 2000);
      } else {
        useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'error' });
        set({ sessionsLoading: false, sessions: [] });
      }
    }
  },

  exportSession: async (sessionId: string) => {
    try {
      const response = await dataCenterApi.exportSession(sessionId); 
      
      useUiStore.getState().showSnackbar({ 
        message: response.message || `Session ${sessionId} exported successfully.` + (response.exportPath ? ` Path: ${response.exportPath}` : ''), 
        severity: 'success' 
      });
    } catch (error: any) {
      const errorMessage = error?.message || `Failed to export session ${sessionId}`;
      
      if (errorMessage === 'Export cancelled by user.') {
        useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'info' });
        console.log(`[Store] Session export cancelled by user: ${sessionId}`); 
      } else {
        useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'error' });
        console.error(`[Store] Error exporting session ${sessionId}:`, errorMessage); 
      }
    }
  },

  openSessionFolder: async (sessionId: string) => {
    console.log('[Store] openSessionFolder called with sessionId:', sessionId);
    try {
      const response = await dataCenterApi.openSessionFolder(sessionId);
      console.log('[Store] openSessionFolder response:', response);
      useUiStore.getState().showSnackbar({ 
        message: response.message || `Folder for session ${sessionId} opened successfully.`, 
        severity: 'success' 
      });
    } catch (error: any) {
      console.error('[Store] openSessionFolder error:', error);
      const detail = error?.response?.data?.detail;
      const msg = error?.response?.data?.message;
      const errorMessage = detail || msg || error?.message || `Failed to open folder for session ${sessionId}`;
      useUiStore.getState().showSnackbar({ message: errorMessage, severity: 'error' });
    }
  },
})); 