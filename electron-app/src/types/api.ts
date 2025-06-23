import type { FileInfo, ExportHistory } from './data-center';

export interface ApiResponse<T> {
  success: boolean;
  data?: T; // Data is optional if success is false
  error?: string; // Error message if success is false
  // Keeping status and message for potential use with direct HTTP status codes if needed
  status?: number;
  message?: string;
}

export interface SearchFilesResponse extends ApiResponse<FileInfo[]> {}
export interface ExportDataResponse extends ApiResponse<ExportHistory> {}
export interface ExportHistoryResponse extends ApiResponse<ExportHistory[]> {}
export interface OpenFileResponse extends ApiResponse<{ status: string }> {}
export interface OpenFolderResponse extends ApiResponse<{ status: string }> {} 