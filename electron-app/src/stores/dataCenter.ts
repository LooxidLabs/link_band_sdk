import { create } from 'zustand';
import { message } from 'antd';
import type { 
  DataCenterState,
  DataCenterStore,
  FileInfo, 
  SearchParams, 
  ExportParams, 
  ExportHistory 
} from '../types/data-center';
import * as dataCenterApi from '../api/dataCenter';

const initialState: DataCenterState = {
  files: [],
  loading: false,
  exportHistory: [],
  searchParams: {
    dateRange: null,
    fileTypes: [],
    searchText: ''
  },
  activeTab: 'files'
};

export const useDataCenterStore = create<DataCenterStore>((set, get) => ({
  ...initialState,

  // Actions
  setFiles: (files) => set({ files }),
  setLoading: (loading) => set({ loading }),
  setExportHistory: (history) => set({ exportHistory: history }),
  setSearchParams: (params) => set({ searchParams: params }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Async Actions
  searchFiles: async (params) => {
    set({ loading: true });
    try {
      const files = await dataCenterApi.searchFiles(params);
      set({ files });
    } catch (error) {
      message.error('파일 검색에 실패했습니다.');
    } finally {
      set({ loading: false });
    }
  },

  exportData: async (params) => {
    set({ loading: true });
    try {
      const result = await dataCenterApi.exportData(params);
      set((state) => ({
        exportHistory: [result, ...state.exportHistory]
      }));
    } catch (error) {
      message.error('데이터 내보내기에 실패했습니다.');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  openFile: async (file) => {
    try {
      await dataCenterApi.openFile(file.file_id);
    } catch (error) {
      message.error('파일을 열 수 없습니다.');
    }
  },

  copyFilePath: async (file) => {
    try {
      await navigator.clipboard.writeText(file.file_path);
      message.success('파일 경로가 복사되었습니다.');
    } catch (error) {
      message.error('경로 복사에 실패했습니다.');
    }
  }
})); 