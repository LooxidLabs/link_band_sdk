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
  dateRange: [Date, Date] | null;
  fileTypes: string[];
  searchText: string;
}

export interface ExportParams {
  dateRange: [Date, Date];
  fileTypes?: string[];
  exportFormat: 'zip' | 'tar';
}

// State 타입 정의
export interface DataCenterState {
  files: FileInfo[];
  loading: boolean;
  exportHistory: ExportHistory[];
  searchParams: SearchParams;
  activeTab: string;
}

// Store 타입 정의
export interface DataCenterStore extends DataCenterState {
  // Actions
  setFiles: (files: FileInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setExportHistory: (history: ExportHistory[]) => void;
  setSearchParams: (params: SearchParams) => void;
  setActiveTab: (tab: string) => void;
  
  // Async Actions
  searchFiles: (params: SearchParams) => Promise<void>;
  exportData: (params: ExportParams) => Promise<void>;
  openFile: (file: FileInfo) => Promise<void>;
  copyFilePath: (file: FileInfo) => Promise<void>;
} 