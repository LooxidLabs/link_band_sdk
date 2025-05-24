import { useState, useCallback } from 'react';
import { message } from 'antd';

export const useDataCenter = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);

  const handleSearch = useCallback(async (params) => {
    setLoading(true);
    try {
      const response = await window.electron.ipcRenderer.invoke('search-files', params);
      setFiles(response);
    } catch (error) {
      message.error('파일 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExport = useCallback(async (params) => {
    setLoading(true);
    try {
      const result = await window.electron.ipcRenderer.invoke('export-data', params);
      setExportHistory(prev => [result, ...prev]);
      return result;
    } catch (error) {
      message.error('데이터 내보내기에 실패했습니다.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileOpen = useCallback(async (file) => {
    try {
      await window.electron.ipcRenderer.invoke('open-file', file.file_id);
    } catch (error) {
      message.error('파일을 열 수 없습니다.');
    }
  }, []);

  const handleCopyPath = useCallback(async (file) => {
    try {
      await navigator.clipboard.writeText(file.file_path);
      message.success('파일 경로가 복사되었습니다.');
    } catch (error) {
      message.error('경로 복사에 실패했습니다.');
    }
  }, []);

  return {
    files,
    loading,
    exportHistory,
    handleSearch,
    handleExport,
    handleFileOpen,
    handleCopyPath
  };
}; 