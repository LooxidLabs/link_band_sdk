exportSession: async (sessionId: string) => {
  try {
    const response = await dataCenterApi.exportSession(sessionId);
    useUiStore.getState().showSnackbar({ 
      message: response.message || `Session ${sessionId} exported successfully.` + (response.exportPath ? ` Path: ${response.exportPath}` : ''),
      severity: 'success' 
    });
  } catch (error: any) {
    // ... existing code ...
  }
} 