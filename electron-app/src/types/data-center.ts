export interface FileInfo {
  file_id: number;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
  is_accessible: boolean;
}

export interface ExportHistory {
  id: number;
  exported_at: string;
  file_count: number;
  total_size: number;
  export_format: string;
  export_path: string;
}

export interface SearchParams {
  dateRange: [Date | null, Date | null] | null;
  fileTypes: string[];
  searchText: string;
}

export interface ExportParams {
  dateRange: [Date, Date];
  fileTypes?: string[];
  exportFormat: 'zip' | 'tar';
}

// Session type from SessionList.tsx
export interface Session {
  id: number; // From API
  session_id: string; // Will be mapped from session_name for key prop and existing usage
  session_name: string;
  start_time: string;
  end_time: string | null; // API can return null if not ended
  status: string;
  data_path: string; // From API
  data_format: string; // Data format (JSON/CSV)
  created_at: string; // From API
  // files, file_count, total_size_mb removed as they are not in the current API response for the list
}

// State 타입 정의
export interface DataCenterState {
  files: FileInfo[];
  loading: boolean;
  exportHistory: ExportHistory[];
  searchParams: SearchParams;
  activeTab: string;
  recordingStatus: RecordingStatusResponse;
  sessions: Session[]; // Added for session list
  sessionsLoading: boolean; // Added for session list loading state
}

// Store 타입 정의
export interface DataCenterStore extends DataCenterState {
  // Actions
  setFiles: (files: FileInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setExportHistory: (history: ExportHistory[]) => void;
  setSearchParams: (params: SearchParams) => void;
  setActiveTab: (tab: string) => void;
  setRecordingStatus: (status: RecordingStatusResponse) => void;
  setSessions: (sessions: Session[]) => void; // Added
  setSessionsLoading: (loading: boolean) => void; // Added
  
  // Async Actions
  searchFiles: (params: SearchParams) => Promise<void>;
  exportData: (params: ExportParams) => Promise<void>;
  openFile: (filePath: string) => Promise<void>;
  copyFilePath: (file: FileInfo) => Promise<void>;
  fetchRecordingStatus: () => Promise<void>;
  startRecording: (sessionData?: any) => Promise<StartRecordingResponse>;
  stopRecording: () => Promise<void>;
  fetchSessions: () => Promise<void>; // Added
  exportSession: (sessionId: string) => Promise<void>; // Added (replaces handleDownload)
  openSessionFolder: (sessionId: string) => Promise<void>; // Added (replaces handleOpenFolder)
  getDefaultExportPath: () => Promise<string>; // Added for default export path
}

export interface RecordingStatusResponse {
  is_recording: boolean;
  current_session: string | null;
  start_time: string | null;
}

export interface StartRecordingResponse {
  status: string;
  message?: string;
  session_id?: string;
  session_name?: string;
  start_time?: string;
}

export interface StopRecordingResponse {
  status: string;
  message?: string;
  session_id?: string;
  session_name?: string;
  end_time?: string;
}

// Specific response type for fetching sessions if needed by API layer
export interface SessionsResponse {
  sessions: Session[];
} 