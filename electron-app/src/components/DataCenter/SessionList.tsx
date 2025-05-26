import React, { useEffect } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, CircularProgress, Stack, Typography, Paper } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useDataCenterStore } from '../../stores/dataCenter';
import type { Session } from '../../types/data-center';

export const SessionList: React.FC = () => {
  const { sessions, sessionsLoading, fetchSessions, exportSession, openSessionFolder } = useDataCenterStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const getChipColor = (status: string) => {
    if (status === 'recording') return 'error';
    if (status === 'completed') return 'success';
    if (status === 'processing') return 'warning';
    return 'default';
  };

  if (sessionsLoading && (!sessions || sessions.length === 0)) {
    return (
      <Paper sx={{ p: 2, bgcolor: 'grey.800', borderRadius: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', elevation: 1 }}>
        <CircularProgress />
      </Paper>
    );
  }

  const safeSessions = Array.isArray(sessions) ? sessions : [];

  return (
    <Paper sx={{ p: 2, bgcolor: 'grey.800', borderRadius: 2, color: 'common.white', overflow: 'hidden', elevation: 1 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 'medium', fontSize: 16, color: 'common.white' }}>
        Session List
      </Typography>
      <TableContainer component={Box}>
        <Table sx={{ minWidth: 650 }} aria-label="session list table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'medium', borderBottomColor: 'grey.700', py: 1 }}>Session Name</TableCell>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'medium', borderBottomColor: 'grey.700', py: 1 }}>Start Time</TableCell>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'medium', borderBottomColor: 'grey.700', py: 1 }}>End Time</TableCell>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'medium', borderBottomColor: 'grey.700', py: 1 }}>Status</TableCell>
              <TableCell sx={{ color: 'grey.400', fontWeight: 'medium', borderBottomColor: 'grey.700', py: 1 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {safeSessions.map((session: Session) => (
              <TableRow
                key={session.session_id}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  '&:hover': { bgcolor: 'grey.700' },
                  cursor: 'pointer'
                }}
              >
                <TableCell component="th" scope="row" sx={{ color: 'common.white', py: 1.5, borderBottomColor: 'grey.700' }}>
                  {session.session_name}
                </TableCell>
                <TableCell sx={{ color: 'common.white', py: 1.5, borderBottomColor: 'grey.700' }}>{new Date(session.start_time).toLocaleString()}</TableCell>
                <TableCell sx={{ color: 'common.white', py: 1.5, borderBottomColor: 'grey.700' }}>{session.end_time ? new Date(session.end_time).toLocaleString() : 'N/A'}</TableCell>
                <TableCell sx={{ color: 'common.white', py: 1.5, borderBottomColor: 'grey.700' }}>
                  <Chip label={session.status} color={getChipColor(session.status)} size="small" />
                </TableCell>
                <TableCell align="right" sx={{ py: 1.5, borderBottomColor: 'grey.700' }}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon fontSize="small" />}
                      onClick={(e) => { e.stopPropagation(); exportSession(session.session_id); }}
                      sx={{ color: 'primary.light', borderColor: 'grey.600', '&:hover': { borderColor: 'primary.main' } }}
                    >
                      Export
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FolderOpenIcon fontSize="small" />}
                      onClick={(e) => { e.stopPropagation(); openSessionFolder(session.session_id); }}
                      sx={{ color: 'secondary.light', borderColor: 'grey.600', '&:hover': { borderColor: 'secondary.main' } }}
                    >
                      Open Folder
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {safeSessions.length === 0 && !sessionsLoading && (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', p: 3 }}>
            No sessions found.
          </Typography>
        )}
      </TableContainer>
    </Paper>
  );
}; 