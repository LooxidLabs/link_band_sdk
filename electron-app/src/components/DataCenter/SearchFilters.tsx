import React from 'react';
import { Button } from '../ui/button';
import { Search } from 'lucide-react';
import { useDataCenterStore } from '../../stores/dataCenter';
// import type { SearchParams } from '../../types/data-center';
// import dayjs, { Dayjs } from 'dayjs'; // Temporarily commented out

export const SearchFilters: React.FC = () => {
  const { searchParams, setSearchParams, searchFiles, loading } = useDataCenterStore();

  const handleDateChange = (value: string, part: 'start' | 'end') => {
    const currentRange = searchParams.dateRange ? [...searchParams.dateRange] : [null, null];
    const date = value ? new Date(value) : null;
    
    if (part === 'start') {
      currentRange[0] = date;
    } else {
      currentRange[1] = date;
    }
    
    setSearchParams({
      ...searchParams,
      dateRange: (currentRange[0] || currentRange[1]) ? [currentRange[0], currentRange[1]] : null,
    });
  };

  const handleFileTypeChange = (value: string) => {
    const currentTypes = searchParams.fileTypes || [];
    const newTypes = currentTypes.includes(value)
      ? currentTypes.filter(type => type !== value)
      : [...currentTypes, value];
    
    setSearchParams({ ...searchParams, fileTypes: newTypes });
  };

  const handleSearchTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({ ...searchParams, searchText: event.target.value });
  };

  const handleSearch = () => {
    searchFiles(searchParams);
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="flex flex-col gap-4 p-4" style={{ backgroundColor: '#161822' }}>
      <h3 className="text-sm font-semibold text-white mb-0">Search Files & Filters</h3>
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex-1">
          <label className="block text-xs text-gray-300 mb-1">Start Date</label>
          <input
            type="date"
            value={formatDateForInput(searchParams.dateRange?.[0] || null)}
            onChange={(e) => handleDateChange(e.target.value, 'start')}
            className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-300 mb-1">End Date</label>
          <input
            type="date"
            value={formatDateForInput(searchParams.dateRange?.[1] || null)}
            onChange={(e) => handleDateChange(e.target.value, 'end')}
            min={formatDateForInput(searchParams.dateRange?.[0] || null)}
            className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-300 mb-1">File Types</label>
          <div className="flex gap-2 flex-wrap">
            {['eeg', 'ppg', 'acc', 'meta'].map((type) => (
              <button
                key={type}
                onClick={() => handleFileTypeChange(type)}
                className={`px-2 py-1 text-xs rounded border ${
                  (searchParams.fileTypes || []).includes(type)
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-2">
          <label className="block text-xs text-gray-300 mb-1">Search Text</label>
          <input
            type="text"
            placeholder="Search in filenames..."
            value={searchParams.searchText || ''}
            onChange={handleSearchTextChange}
            className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex-shrink-0">
          <label className="block text-xs text-transparent mb-1">Search</label>
          <Button
            variant="default"
            onClick={handleSearch}
            disabled={loading}
            className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
            ) : (
              <Search className="w-3 h-3 mr-2" />
            )}
            Search
          </Button>
        </div>
      </div>
    </div>
  );
}; 