import type { 
  FileInfo, 
  SearchParams, 
  ExportParams, 
  ExportHistory 
} from '../types/data-center';
import type {
  SearchFilesResponse,
  ExportDataResponse,
  ExportHistoryResponse,
  OpenFileResponse,
  OpenFolderResponse
} from '../types/api';
import { api } from '../services/api';

/**
 * 파일 검색 API
 */
export const searchFiles = async (params: SearchParams): Promise<FileInfo[]> => {
  const response = await api.post<SearchFilesResponse>('/search-files', params);
  return response.data.data;
};

/**
 * 데이터 내보내기 API
 */
export const exportData = async (params: ExportParams): Promise<ExportHistory> => {
  const response = await api.post<ExportDataResponse>('/export-data', params);
  return response.data.data;
};

/**
 * 내보내기 히스토리 조회 API
 */
export const getExportHistory = async (): Promise<ExportHistory[]> => {
  const response = await api.get<ExportHistoryResponse>('/export-history');
  return response.data.data;
};

/**
 * 파일 열기 API
 */
export const openFile = async (fileId: number): Promise<void> => {
  await api.post<OpenFileResponse>(`/open-file/${fileId}`);
};

/**
 * 폴더 열기 API
 */
export const openFolder = async (path: string): Promise<void> => {
  await api.post<OpenFolderResponse>('/open-folder', { path });
}; 