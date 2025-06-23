import React, { useEffect, useState } from 'react';
import { List, ListItem, ListItemText, Paper, Typography, Button, CircularProgress, Box } from '@mui/material';
import { useDataCenterStore } from '../../stores/dataCenter';
import type { ExportHistoryItem } from '../../types/data-center';
import { openFolderInExplorer } from '../../api/dataCenter';

export const ExportHistoryList: React.FC = () => {
  // ... existing code ...
} 