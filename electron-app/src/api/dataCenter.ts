import axios from 'axios';
import type {
  RecordingStatusResponse,
  StartRecordingResponse,
  StopRecordingResponse,
  FileInfo,
  ExportHistory,
  SearchParams,
  ExportParams,
  Session
} from '../types/data-center';
// import type { AxiosResponse } from 'axios'; // Cannot resolve, will type as any for now

// TODO: Define these types in data-center.ts or a more appropriate place if they don't exist.
// For now, using placeholder types.
// export interface RecordingStatusResponse {
//   is_recording: boolean;
//   current_session: string | null;
//   start_time: string | null;
// }

// export interface StartRecordingResponse {
//   status: string;
//   message?: string;
//   session_id?: string;
//   start_time?: string;
// }

// export interface StopRecordingResponse {
//   status: string;
//   message?: string;
//   session_id?: string;
//   end_time?: string;
// }

const API_BASE_URL = import.meta.env.VITE_LINK_ENGINE_SERVER_URL; // Base URL for the Python server
const headers = {
  'Content-Type': 'application/json'
};

// Updated type guard for Axios-like errors
const isAxiosLikeError = (error: any): error is { message: string; response?: { data: any; status: number }; isAxiosError?: boolean } => {
  return error && typeof error.message === 'string'; // Basic check for an error structure
};

// Helper to access exposed Electron APIs from preload.ts
const electronApi = (window as any).electron;

export const getRecordingStatus = async (): Promise<RecordingStatusResponse> => {
  try {
    const response = await axios.get<RecordingStatusResponse>(`${API_BASE_URL}/data/recording-status`, { headers });
    return response.data;
  } catch (error: unknown) {
    if (isAxiosLikeError(error)) {
      console.error('Error fetching recording status:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } else {
      console.error('Unexpected error fetching recording status:', error);
    }
    throw error;
  }
};

export const startRecording = async (sessionData?: any): Promise<StartRecordingResponse> => {
  try {
    const response = await axios.post<StartRecordingResponse>(`${API_BASE_URL}/data/start-recording`, sessionData || {}, { headers });
    return response.data;
  } catch (error: unknown) {
    if (isAxiosLikeError(error)) {
      console.error('Error starting recording:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } else {
      console.error('Unexpected error starting recording:', error);
    }
    throw error;
  }
};

export const stopRecording = async (): Promise<StopRecordingResponse> => {
  try {
    const response = await axios.post<StopRecordingResponse>(`${API_BASE_URL}/data/stop-recording`, {}, { headers });
    return response.data;
  } catch (error: unknown) {
    if (isAxiosLikeError(error)) {
      console.error('Error stopping recording:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } else {
      console.error('Unexpected error stopping recording:', error);
    }
    throw error;
  }
};

export const searchFiles = async (params: SearchParams): Promise<FileInfo[]> => {
  try {
    const response = await axios.post<FileInfo[]>(`${API_BASE_URL}/data/search`, params, { headers });
    return response.data;
  } catch (error: unknown) {
    if (isAxiosLikeError(error)) {
      console.error('Error searching files:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } else {
      console.error('Unexpected error searching files:', error);
    }
    throw error;
  }
};

export const exportData = async (params: ExportParams): Promise<ExportHistory> => {
  try {
    const response = await axios.post<ExportHistory>(`${API_BASE_URL}/data/export`, params, { headers });
    return response.data;
  } catch (error: unknown) {
    if (isAxiosLikeError(error)) {
      console.error('Error exporting data:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } else {
      console.error('Unexpected error exporting data:', error);
    }
    throw error;
  }
};

export const getExportHistory = async (): Promise<ExportHistory[]> => {
  try {
    const response = await axios.get<ExportHistory[]>(`${API_BASE_URL}/data/export-history`, { headers });
    return response.data;
  } catch (error: unknown) {
    if (isAxiosLikeError(error)) {
      console.error('Error fetching export history:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } else {
      console.error('Unexpected error fetching export history:', error);
    }
    throw error;
  }
};

export const openFile = async (filePath: string): Promise<{success: boolean; message?: string}> => {
  console.log(`[api/dataCenter.ts] openFile (now openSpecificFile) called with filePath: ${filePath}`);
  if (electronApi && electronApi.dataCenter && electronApi.dataCenter.openSpecificFile) {
    try {
      const result = await electronApi.dataCenter.openSpecificFile(filePath);
      console.log('[api/dataCenter.ts] openSpecificFile IPC result:', result);
      if (result && !result.success) { // Check if result itself is defined before accessing success
        throw new Error(result.message || 'Failed to open file via Electron IPC.');
      }
      return result || { success: false, message: 'IPC call did not return a result.' }; // Handle undefined result
    } catch (error: any) {
      console.error('Error invoking open-specific-file IPC:', error);
      // Ensure a compatible object is thrown or returned on error
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(String(error));
      }
    }
  } else {
    console.error('Electron dataCenter API for openSpecificFile not found.');
    throw new Error('Open file functionality is not available.');
  }
};

export const openFolderInExplorer = async (folderPath: string): Promise<{ status: string }> => {
  try {
    const response = await axios.post<{ status: string }>(`${API_BASE_URL}/data/open-folder`, { path: folderPath }, { headers });
    return response.data;
  } catch (error: unknown) {
    if (isAxiosLikeError(error)) {
      console.error('Error opening folder:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } else {
      console.error('Unexpected error opening folder:', error);
    }
    throw error;
  }
};

export const getSessions = async (): Promise<Session[]> => {
  try {
    const response = await axios.get<{sessions: any[]}>(`${API_BASE_URL}/data/sessions`, { headers });
    console.log('[api/dataCenter.ts] Raw sessions response:', response.data);
    
    // Handle new API response format: {sessions: [...]}
    const sessionsData = response.data.sessions || response.data;
    console.log('[api/dataCenter.ts] Sessions data:', sessionsData);
    
    const mappedSessions = Array.isArray(sessionsData) ? sessionsData.map((item: any) => {
      console.log('[api/dataCenter.ts] Mapping session item:', item);
      
      return {
      id: item.id,
        session_id: item.session_id || item.session_name, // session_id가 있으면 사용, 없으면 session_name 사용
      session_name: item.session_name,
      start_time: item.start_time,
      end_time: item.end_time,
      status: item.status,
      data_path: item.data_path,
      created_at: item.created_at,
      };
    }) : [];
    
    console.log('[api/dataCenter.ts] Mapped sessions:', mappedSessions);
    return mappedSessions;
  } catch (error: unknown) {
    if (isAxiosLikeError(error)) {
      console.error('Error fetching sessions:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } else {
      console.error('Unexpected error fetching sessions:', error);
    }
    throw error;
  }
};

export const exportSession = async (sessionId: string): Promise<{ success: boolean; message?: string; exportPath?: string }> => {
  console.log(`[api/dataCenter.ts] exportSession called with sessionId: ${sessionId}`);
  console.log(`[api/dataCenter.ts] electronApi:`, electronApi);
  console.log(`[api/dataCenter.ts] electronApi?.dataCenter:`, electronApi?.dataCenter);
  console.log(`[api/dataCenter.ts] electronApi?.dataCenter?.exportSession:`, electronApi?.dataCenter?.exportSession);
  
  if (electronApi && electronApi.dataCenter && electronApi.dataCenter.exportSession) {
    try {
      console.log('[api/dataCenter.ts] Calling electronApi.dataCenter.exportSession...');
      const result = await electronApi.dataCenter.exportSession(sessionId);
      console.log('[api/dataCenter.ts] exportSession IPC result:', result);
      if (!result.success) {
        throw new Error(result.message || 'Failed to export session via Electron IPC.');
      }
      return result;
    } catch (error: any) {
      if (error && error.message === 'Export cancelled by user.') {
        console.log('[api/dataCenter.ts] Export cancelled by user (invoking IPC): ', error.message);
      } else {
        console.error('[api/dataCenter.ts] Error invoking export-session IPC:', error);
      }
      throw error; // Re-throw for the store to handle
    }
  } else {
    console.error('Electron dataCenter API for exportSession not found. Ensure preload.ts is correct.');
    console.error('[api/dataCenter.ts] window.electron:', (window as any).electron);
    throw new Error('Export functionality is not available.');
  }
};

export const openSessionFolder = async (sessionId: string): Promise<{ success: boolean; message?: string }> => {
  console.log(`[api/dataCenter.ts] openSessionFolder called with sessionId: ${sessionId}`);
  console.log('[api/dataCenter.ts] window.electron:', (window as any).electron);
  console.log('[api/dataCenter.ts] electronApi:', electronApi);
  console.log('[api/dataCenter.ts] electronApi?.dataCenter:', electronApi?.dataCenter);
  console.log('[api/dataCenter.ts] electronApi?.dataCenter?.openSessionFolder:', electronApi?.dataCenter?.openSessionFolder);
  
  if (electronApi && electronApi.dataCenter && electronApi.dataCenter.openSessionFolder) {
    try {
      console.log('[api/dataCenter.ts] Calling electronApi.dataCenter.openSessionFolder...');
      const result = await electronApi.dataCenter.openSessionFolder(sessionId);
      console.log('[api/dataCenter.ts] openSessionFolder IPC result:', result);
      if (!result.success) {
        throw new Error(result.message || 'Failed to open session folder via Electron IPC.');
      }
      return result; // { success: true, message: string }
    } catch (error: any) {
      console.error('[api/dataCenter.ts] Error invoking open-session-folder IPC:', error);
      throw error; // Re-throw for the store to handle
    }
  } else {
    console.error('[api/dataCenter.ts] Electron dataCenter API for openSessionFolder not found. electronApi:', electronApi);
    console.error('[api/dataCenter.ts] window.electron:', (window as any).electron);
    throw new Error('Open folder functionality is not available.');
  }
};

// Keep existing functions if any
// ... existing code ... 