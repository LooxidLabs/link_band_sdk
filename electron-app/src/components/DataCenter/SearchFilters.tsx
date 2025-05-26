import React from 'react';
import { TextField, Button, Stack, Select, MenuItem, FormControl, InputLabel, CircularProgress, Typography, Paper } from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import SearchIcon from '@mui/icons-material/Search';
import { useDataCenterStore } from '../../stores/dataCenter';
// import type { SearchParams } from '../../types/data-center';
import dayjs, { Dayjs } from 'dayjs';

export const SearchFilters: React.FC = () => {
  const { searchParams, setSearchParams, searchFiles, loading } = useDataCenterStore();

  const handleDateChange = (date: Dayjs | null, part: 'start' | 'end') => {
    const currentRange = searchParams.dateRange ? [...searchParams.dateRange] : [null, null];
    if (part === 'start') {
      currentRange[0] = date ? date.toDate() : null;
    } else {
      currentRange[1] = date ? date.toDate() : null;
    }
    // Ensure start date is not after end date, basic validation
    if (currentRange[0] && currentRange[1] && dayjs(currentRange[0]).isAfter(dayjs(currentRange[1]))) {
      // Optionally, show an error or reset one of the dates
      // For simplicity, we allow it for now, API or further validation should handle it
      // Or, reset the conflicting date, e.g.:
      // if (part === 'start') currentRange[1] = null; else currentRange[0] = null;
    }
    setSearchParams({
      ...searchParams,
      dateRange: (currentRange[0] || currentRange[1]) ? [currentRange[0], currentRange[1]] : null,
    });
  };

  const handleFileTypeChange = (event: any) => {
    setSearchParams({ ...searchParams, fileTypes: event.target.value as string[] });
  };

  const handleSearchTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({ ...searchParams, searchText: event.target.value });
  };

  const handleSearch = () => {
    searchFiles(searchParams); // searchParams.dateRange is now [Date|null, Date|null]|null
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'grey.800', borderRadius: 1, color: 'common.white'}}>
        <Typography variant="h6" gutterBottom sx={{ mb: 0, fontSize: 16, color: 'common.white' }}>Search Files & Filters</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <DatePicker
            label="Start Date"
            value={searchParams.dateRange?.[0] ? dayjs(searchParams.dateRange[0]) : null}
            onChange={(date) => handleDateChange(date, 'start')}
            slotProps={{
              textField: {
                sx: {
                  '& .MuiInputBase-input': { color: 'common.white' },
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.600' },
                  flexGrow: 1
                }
              }
            }}
          />
          <DatePicker
            label="End Date"
            value={searchParams.dateRange?.[1] ? dayjs(searchParams.dateRange[1]) : null}
            onChange={(date) => handleDateChange(date, 'end')}
            minDate={searchParams.dateRange?.[0] ? dayjs(searchParams.dateRange[0]) : undefined} // Prevent end date before start date
            slotProps={{
              textField: {
                sx: {
                  '& .MuiInputBase-input': { color: 'common.white' },
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.600' },
                  flexGrow: 1
                }
              }
            }}
          />
          <FormControl sx={{ m: 1, minWidth: 120, flexGrow: 1 }}>
            <InputLabel id="file-type-select-label" sx={{color: 'text.secondary'}}>File Types</InputLabel>
            <Select
              labelId="file-type-select-label"
              multiple
              value={searchParams.fileTypes || []}
              onChange={handleFileTypeChange}
              label="File Types"
              sx={{
                color: 'common.white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.600' },
                '& .MuiSvgIcon-root': { color: 'common.white' }
              }}
            >
              <MenuItem value="eeg">EEG</MenuItem>
              <MenuItem value="ppg">PPG</MenuItem>
              <MenuItem value="acc">ACC</MenuItem>
              <MenuItem value="meta">Meta</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Search Text"
            variant="outlined"
            value={searchParams.searchText}
            onChange={handleSearchTextChange}
            sx={{
              flexGrow: 2,
              input: { color: 'common.white' },
              label: { color: 'text.secondary' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.600' }
            }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
            sx={{height: '56px'}}
          >
            Search
          </Button>
        </Stack>
      </Paper>
    </LocalizationProvider>
  );
}; 