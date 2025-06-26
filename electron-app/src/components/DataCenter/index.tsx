import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Play, Square, FolderOpen, Copy, Database, AlertCircle } from 'lucide-react';
import { RecordingStatus } from './RecordingStatus.tsx';
import { SessionList } from './SessionList.tsx';
import { SearchFilters } from './SearchFilters.tsx';
import { RecordingOptions, type RecordingOptionsData } from './RecordingOptions.tsx';
import { useDataCenterStore } from '../../stores/dataCenter';
import { useDeviceStore } from '../../stores/device';
import { usePythonServerStore } from '../../stores/pythonServerStore';
import type { FileInfo } from '../../types/data-center';

// electronApi 타입 정의
declare global {
  const electronApi: any;
}

const DataCenter: React.FC = () => {
  const {
    activeTab,
    recordingStatus,
    // sessions,
    setActiveTab,
    fetchRecordingStatus,
    startRecording,
    stopRecording,
    files,
    loading,
    openFile,
    copyFilePath
  } = useDataCenterStore();

  const deviceStatus = useDeviceStore((state) => state.deviceStatus);
  const isDeviceConnected = deviceStatus?.is_connected || false;
  
  // Get Engine status from Python server store
  const { isRunning: isEngineStarted } = usePythonServerStore();

  // Recording Options 상태 관리
  const getDefaultSessionName = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `session_${year}_${month}_${day}`;
  };

  const [recordingOptions, setRecordingOptions] = useState<RecordingOptionsData>({
    sessionName: getDefaultSessionName(),
    dataFormat: 'JSON',
    exportPath: ''  // 초기값을 빈 문자열로 설정하여 useEffect에서 설정하도록 함
  });

  // 폴더 경로 검증 상태
  const [pathValidation, setPathValidation] = useState({
    isValid: false,
    error: ''
  });

  // 폴더 경로 검증 함수
  const validatePath = async (path: string) => {
    console.log('validatePath called with:', path);
    
    if (!path.trim()) {
      console.log('Path is empty');
      setPathValidation({
        isValid: false,
        error: 'Please enter a path.'
      });
      return;
    }

    try {
      console.log('Checking if electron.fs.checkDirectory is available...');
      console.log('window.electron:', (window as any).electron);
      console.log('window.electron.fs:', (window as any).electron?.fs);
      console.log('window.electron.fs.checkDirectory:', (window as any).electron?.fs?.checkDirectory);
      
      // Electron IPC를 통해 폴더 존재 여부 확인
      if ((window as any).electron?.fs?.checkDirectory) {
        console.log('Calling checkDirectory with path:', path);
        const result = await (window as any).electron.fs.checkDirectory(path);
        console.log('checkDirectory result:', result);
        
        if (result.exists && result.isDirectory) {
          if (result.writable) {
            console.log('Path is valid and writable');
            setPathValidation({
              isValid: true,
              error: ''
            });
          } else {
            console.log('Path exists but not writable');
            setPathValidation({
              isValid: false,
              error: 'No write permission for this folder.'
            });
          }
        } else if (result.exists && !result.isDirectory) {
          console.log('Path exists but is not a directory');
          setPathValidation({
            isValid: false,
            error: 'This is a file path. Please enter a folder path.'
          });
        } else if (!result.exists && result.canCreate) {
          console.log('Path does not exist but can be created');
          setPathValidation({
            isValid: true,
            error: ''
          });
        } else {
          console.log('Path does not exist and cannot be created');
          setPathValidation({
            isValid: false,
            error: 'Path does not exist and cannot be created. Please check the parent folder.'
          });
        }
      } else {
        console.log('Electron API not available, using fallback validation');
        // Electron API가 없는 경우 기본 검증
        setPathValidation({
          isValid: true,
          error: ''
        });
      }
    } catch (error) {
      console.error('Error validating path:', error);
      setPathValidation({
        isValid: false,
        error: 'Error occurred while validating path.'
      });
    }
  };

  // 초기 기본 export 경로 설정 및 검증
  useEffect(() => {
    const initializeExportPath = async () => {
      if (!recordingOptions.exportPath) {
        try {
          const defaultPath = await (window as any).electron?.fs?.getDefaultExportPath?.();
          if (defaultPath?.success) {
            console.log('Setting default export path:', defaultPath.path);
            setRecordingOptions(prev => ({
              ...prev,
              exportPath: defaultPath.path
            }));
            validatePath(defaultPath.path);
          } else {
            console.warn('Failed to get default export path, using fallback');
            const fallbackPath = '~/Documents/LinkBand Exports';
            setRecordingOptions(prev => ({
              ...prev,
              exportPath: fallbackPath
            }));
            validatePath(fallbackPath);
          }
        } catch (error) {
          console.error('Error getting default export path:', error);
          const fallbackPath = '~/Documents/LinkBand Exports';
          setRecordingOptions(prev => ({
            ...prev,
            exportPath: fallbackPath
          }));
          validatePath(fallbackPath);
        }
      } else {
        console.log('Initial path validation for:', recordingOptions.exportPath);
        validatePath(recordingOptions.exportPath);
      }
    };

    initializeExportPath();
  }, []); // 빈 의존성 배열로 마운트 시에만 실행

  useEffect(() => {
    fetchRecordingStatus();
    const interval = setInterval(fetchRecordingStatus, 1000);
    return () => clearInterval(interval);
  }, [fetchRecordingStatus]);

  const handleTabChange = (newValue: string) => {
    setActiveTab(newValue);
  };

  // Recording can only be started when both Engine is started and Link Band is connected and path is valid
  const isStartRecordingDisabled = recordingStatus.is_recording || !isEngineStarted || !isDeviceConnected || !pathValidation.isValid;

  const handleOpenFileClick = (file: FileInfo) => {
    if (file.is_accessible && file.file_path) {
      openFile(file.file_path);
    } else {
      console.warn('File path is not available or file is not accessible.');
    }
  };

  // Recording Options 핸들러
  const handleOptionsChange = (options: RecordingOptionsData) => {
    setRecordingOptions(options);
  };

  const handlePathValidation = (path: string) => {
    validatePath(path);
  };

  // 옵션을 포함한 Recording 시작
  const handleStartRecording = async () => {
    try {
      // 세션 이름이 비어있으면 기본값 사용
      const sessionName = recordingOptions.sessionName.trim() || getDefaultSessionName();
      
      const sessionData = {
        session_name: sessionName,
        settings: {
          data_format: recordingOptions.dataFormat.toLowerCase(),
          export_path: recordingOptions.exportPath || undefined  // 빈 문자열인 경우 undefined로 설정
        }
      };

      console.log('Starting recording with options:', sessionData);
      await startRecording(sessionData);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Recording Controls */}
      <div className="flex items-center gap-2 mb-6">
        <Database className="w-8 h-8 text-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">
          Data Center
        </h1>
      </div>

      
      <Card className="bg-card" style={{ backgroundColor: '#161822' }}>
        <CardContent className="p-6">
          <h2 className="flex items-center text-lg font-semibold text-foreground mb-4 mt-4 ">
            <Database className="w-6 h-6 text-foreground mr-2" />
            Recording Controls
          </h2>
          
          <div className="flex gap-2 mb-4">
            <Button
              variant="default"
              onClick={handleStartRecording}
              disabled={isStartRecordingDisabled}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
            <Button
              variant="destructive"
              onClick={stopRecording}
              disabled={!recordingStatus.is_recording}
              className="!bg-red-600 hover:!bg-red-700 !text-white !border-red-500 disabled:!bg-red-600 disabled:opacity-50"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Recording
            </Button>
          </div>
          
          {/* Recording Options - 버튼 아래로 이동 */}
          <RecordingOptions
            options={recordingOptions}
            onOptionsChange={handleOptionsChange}
            pathValidation={pathValidation}
            onPathValidation={handlePathValidation}
          />
          
          {(!isEngineStarted || !isDeviceConnected) && !recordingStatus.is_recording && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">
                Recording can only be started when both Engine is started and Link Band is connected.
              </p>
            </div>
          )}
          
          <Separator className="my-4" />
          
          <RecordingStatus status={{ 
            is_recording: recordingStatus.is_recording,
            current_session: recordingStatus.current_session,
            start_time: recordingStatus.start_time
          }} />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="bg-card p-4" style={{ backgroundColor: '#161822' }}>
        <CardHeader className="pb-3">
          <div className="flex space-x-4 border-b border-gray-600">
            {[
              // { id: 'recording', label: 'Recording Status' },
              { id: 'sessions', label: 'Sessions' },
              // { id: 'search', label: 'Search Files' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-2 text-base font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'recording' && (
            <RecordingStatus status={recordingStatus} />
          )}
          
          {activeTab === 'sessions' && (
            <SessionList />
          )}
          
          {activeTab === 'search' && (
            <div className="space-y-4">
              <SearchFilters />
              
              {loading && files.length === 0 && (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              
              {!loading && files.length === 0 && (
                <div className="text-center text-gray-400 py-8 text-xs">
                  No files found for the current search criteria. Or perform a new search.
                </div>
              )}
              
              {files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Search Results</h3>
                  <div className="rounded-md border border-gray-600 overflow-hidden" style={{ backgroundColor: '#1a1d29' }}>
                    <table className="w-full">
                      <thead style={{ backgroundColor: '#222530' }}>
                        <tr className="border-b border-gray-600">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Filename</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Size (KB)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Created At</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {files.map((file: FileInfo) => (
                          <tr key={file.file_id} className="border-b border-gray-700 hover:bg-gray-800/30">
                            <td className="px-3 py-2 text-xs">
                              {file.is_accessible ? (
                                <button
                                  onClick={() => handleOpenFileClick(file)}
                                  className="text-blue-400 hover:text-blue-300 hover:underline"
                                >
                                  {file.filename}
                                </button>
                              ) : (
                                <span className="text-gray-300">{file.filename}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-300">{file.file_type}</td>
                            <td className="px-3 py-2 text-xs text-gray-300">{(file.file_size / 1024).toFixed(2)}</td>
                            <td className="px-3 py-2 text-xs text-gray-300">{new Date(file.created_at).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenFileClick(file)}
                                  disabled={!file.is_accessible}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                                >
                                  <FolderOpen className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyFilePath(file)}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataCenter; 