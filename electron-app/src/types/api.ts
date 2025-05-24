import type { FileInfo, ExportHistory } from './data-center';

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface SearchFilesResponse extends ApiResponse<FileInfo[]> {}
export interface ExportDataResponse extends ApiResponse<ExportHistory> {}
export interface ExportHistoryResponse extends ApiResponse<ExportHistory[]> {}
export interface OpenFileResponse extends ApiResponse<{ status: string }> {}
export interface OpenFolderResponse extends ApiResponse<{ status: string }> {} 