import { useCallback, useEffect } from 'react';
import { useDataCenterStore } from '../stores/dataCenter'; // Check path if different
import type { FileInfo, SearchParams, ExportParams } from '../types/data-center'; // Import necessary types

// Custom hook for Data Center logic
export const useDataCenter = () => {
  const store = useDataCenterStore();

  // Search files logic
  const handleSearch = useCallback(async (params: SearchParams) => { // Typed params
    store.setLoading(true);
    try {
      // Assuming window.electron.ipcRenderer.invoke returns typed data or needs casting
      const response = await (window as any).electron.ipcRenderer.invoke('search-files', params);
      store.setFiles(response.files || []); // Adjust based on actual response structure
    } catch (error) {
      console.error('Search failed:', error);
      store.setFiles([]); // Clear files on error
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // Export data logic
  const handleExport = useCallback(async (params: ExportParams) => { // Typed params
    store.setLoading(true);
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('export-data', params);
      store.setExportHistory([result]); // Add new export result
      // Show success message (e.g., via a snackbar store or context)
    } catch (error) {
      console.error('Export failed:', error);
      // Show error message
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // Open file logic
  const handleFileOpen = useCallback(async (file: FileInfo) => { // Typed file
    try {
      await (window as any).electron.ipcRenderer.invoke('open-file', file.file_id);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, []);

  // Copy file path logic
  const handleCopyPath = useCallback(async (file: FileInfo) => { // Typed file
    try {
      await navigator.clipboard.writeText(file.file_path);
      // Show success message
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  }, []);

  // Fetch initial data or perform other setup if needed
  useEffect(() => {
    // Example: Fetch initial sessions list if not handled elsewhere
    // if (store.sessions.length === 0) store.fetchSessions();
  }, [store]);

  return {
    ...store, // Expose all store state and actions
    handleSearch,
    handleExport,
    handleFileOpen,
    handleCopyPath,
  };
}; 