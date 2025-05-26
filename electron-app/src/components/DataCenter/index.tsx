import React, { useEffect } from 'react';
import { Box, Card, Typography, Button, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Link, IconButton, Paper, Divider } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab'; // For Tab management
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { RecordingStatus } from './RecordingStatus.tsx';
import { SessionList } from './SessionList.tsx';
import { SearchFilters } from './SearchFilters.tsx';
import { useDataCenterStore } from '../../stores/dataCenter';
import { useMetricsStore } from '../../stores/metrics'; // Import metrics store
import type { FileInfo } from '../../types/data-center';

const DataCenter: React.FC = () => {
  const {
    activeTab,
    recordingStatus, // This no longer contains device_connected
    setActiveTab,
    fetchRecordingStatus,
    startRecording,
    stopRecording,
    files,
    loading,
    openFile,
    copyFilePath
  } = useDataCenterStore();

  const isDeviceConnected = useMetricsStore((state) => state.deviceStatus?.status === 'connected'); // Get from metricsStore
  // fetchRecordingStatus from dataCenterStore will still be called periodically.
  // The metricsStore's deviceStatus is assumed to be updated elsewhere (e.g., by a WebSocket connection manager or similar)

  useEffect(() => {
    fetchRecordingStatus();
    const interval = setInterval(fetchRecordingStatus, 1000);
    return () => clearInterval(interval);
  }, [fetchRecordingStatus]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const isStartRecordingDisabled = recordingStatus.is_recording || !isDeviceConnected; // Use isDeviceConnected from metricsStore

  // Handler for opening a file, now passes filePath to the store action
  const handleOpenFileClick = (file: FileInfo) => {
    if (file.is_accessible && file.file_path) {
      openFile(file.file_path); // Pass file_path to the store action
    } else {
      // Optionally, show a message if path is not available or not accessible
      console.warn('File path is not available or file is not accessible.');
    }
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, color: 'common.white' }}>
      <Card sx={{ bgcolor: 'grey.900', p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'common.white' }}>Recording Controls</Typography>
          <Button
            variant="contained"
            color="success"
            sx={{ borderRadius: 5, fontSize: 14 }}
            startIcon={<PlayArrowIcon />}
            onClick={startRecording}
            disabled={isStartRecordingDisabled}
          >
            Start Recording
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={stopRecording}
            disabled={!recordingStatus.is_recording}
          >
            Stop Recording
          </Button>
        </Stack>
        {!isDeviceConnected && !recordingStatus.is_recording && ( // Use isDeviceConnected from metricsStore
          <Typography sx={{ color: 'warning.light', fontSize: '0.875rem', mt: 1, mb: 1 }}>
            Please connect LINK BAND first to start recording.
          </Typography>
        )}
        <Divider sx={{ my: 1, borderColor: 'grey.700' }} />
        <RecordingStatus status={{ 
            is_recording: recordingStatus.is_recording,
            current_session: recordingStatus.current_session,
            start_time: recordingStatus.start_time
         }} />
      </Card>

      <Card sx={{ bgcolor: 'grey.900', p: 2 }}>
        <TabContext value={activeTab}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList
              onChange={handleTabChange}
              aria-label="Data Center Tabs"
              textColor="inherit" // Corrected from textColor="white" to a valid Theme V5 value
              indicatorColor="primary" // Or "secondary" or other theme color
            >
              <Tab label="Recording Status" value="recording" sx={{ color: 'common.white' }} />
              <Tab label="Sessions" value="sessions" sx={{ color: 'common.white' }} />
              <Tab label="Search Files" value="search" sx={{ color: 'common.white' }} />
            </TabList>
          </Box>
          <TabPanel value="recording" sx={{ p: 0, pt: 2 }}>
            <RecordingStatus status={recordingStatus} />
          </TabPanel>
          <TabPanel value="sessions" sx={{ p: 0, pt: 2 }}>
            <SessionList />
          </TabPanel>
          <TabPanel value="search" sx={{ p: 0, pt: 2 }}>
            <SearchFilters />
            {loading && files.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <CircularProgress />
              </Box>
            )}
            {!loading && files.length === 0 && activeTab === 'search' && (
              <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 3, p: 2 }}>
                No files found for the current search criteria. Or perform a new search.
              </Typography>
            )}
            {files.length > 0 && (
              <Paper sx={{ p: 2, bgcolor: 'grey.800', borderRadius: 2, color: 'common.white', overflow: 'hidden', elevation: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 'medium' }}>
                  Search Results
                </Typography>
                <TableContainer component={Box}>
                  <Table sx={{ minWidth: 650 }} aria-label="search results table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'grey.400', fontWeight: 'medium', borderBottomColor: 'grey.700', py: 1 }}>Filename</TableCell>
                        <TableCell sx={{ color: 'grey.400', fontWeight: 'medium', borderBottomColor: 'grey.700', py: 1 }}>Type</TableCell>
                        <TableCell sx={{ color: 'grey.400', fontWeight: 'medium', borderBottomColor: 'grey.700', py: 1 }}>Size (KB)</TableCell>
                        <TableCell sx={{ color: 'grey.400', fontWeight: 'medium', borderBottomColor: 'grey.700', py: 1 }}>Created At</TableCell>
                        <TableCell sx={{ color: 'grey.400', fontWeight: 'medium', borderBottomColor: 'grey.700', py: 1 }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {files.map((file: FileInfo) => (
                        <TableRow
                          key={file.file_id}
                          sx={{
                            '&:last-child td, &:last-child th': { border: 0 },
                            '&:hover': { bgcolor: 'grey.700' },
                          }}
                        >
                          <TableCell component="th" scope="row" sx={{ color: 'common.white', py: 1.5, borderBottomColor: 'grey.700' }}>
                            {file.is_accessible ? (
                              <Link component="button" variant="body2" onClick={() => handleOpenFileClick(file)} sx={{ color: 'primary.light', '&:hover': { color: 'primary.main' } }}>
                                {file.filename}
                              </Link>
                            ) : (
                              file.filename
                            )}
                          </TableCell>
                          <TableCell sx={{ color: 'common.white', py: 1.5, borderBottomColor: 'grey.700' }}>{file.file_type}</TableCell>
                          <TableCell sx={{ color: 'common.white', py: 1.5, borderBottomColor: 'grey.700' }}>{(file.file_size / 1024).toFixed(2)}</TableCell>
                          <TableCell sx={{ color: 'common.white', py: 1.5, borderBottomColor: 'grey.700' }}>{new Date(file.created_at).toLocaleString()}</TableCell>
                          <TableCell align="right" sx={{ py: 1.5, borderBottomColor: 'grey.700' }}>
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <IconButton size="small" onClick={() => handleOpenFileClick(file)} disabled={!file.is_accessible} title="Open File">
                                <FileOpenIcon sx={{ color: file.is_accessible ? 'secondary.light' : 'grey.600', '&:hover': { color: file.is_accessible ? 'secondary.main' : 'grey.500'} }} />
                              </IconButton>
                              <IconButton size="small" onClick={() => copyFilePath(file)} title="Copy Path">
                                <ContentCopyIcon sx={{ color: 'secondary.light', '&:hover': {color: 'secondary.main'} }} />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </TabPanel>
        </TabContext>
      </Card>
    </Box>
  );
};

export default DataCenter; 