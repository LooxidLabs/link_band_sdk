import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Play, Square, FolderOpen, Copy, Database, AlertCircle, RefreshCw } from 'lucide-react';
import { RecordingStatus } from './RecordingStatus.tsx';
import { SessionList } from './SessionList.tsx';
import { SearchFilters } from './SearchFilters.tsx';
import { RecordingOptions, type RecordingOptionsData } from './RecordingOptions.tsx';
import { useDataCenterStore } from '../../stores/dataCenter';
import { useDeviceStore } from '../../stores/device';
import { useSystemStatus } from '../../hooks/useSystemManager';
import { engineApi } from '../../api/engine';
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
  
  // Get Engine status from SystemStore (same as TopNavigation)
  const { isInitialized: isEngineStarted } = useSystemStatus();

  // Auto-detected streaming status (Phase 2)
  const [autoStreamingStatus, setAutoStreamingStatus] = useState<any>(null);
  const [isStreamingActive, setIsStreamingActive] = useState(false);

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
        // Electron API가 없는 경우 기본 검증 - 경로가 있으면 유효한 것으로 간주
        setPathValidation({
          isValid: true,
          error: ''
        });
      }
    } catch (error) {
      console.error('Error validating path:', error);
      // 오류가 발생해도 경로가 설정되어 있으면 유효한 것으로 간주
      setPathValidation({
        isValid: true,
        error: ''
      });
    }
  };

  // Auto-detected streaming status 확인 함수 (Phase 2)
  const fetchAutoStreamingStatus = async () => {
    try {
      const status = await engineApi.getAutoStreamingStatus();
      console.log('🔄 [DataCenter] Auto streaming status:', status);
      setAutoStreamingStatus(status);
      
      // 스트리밍 활성화 조건: is_active가 true이고 active_sensors가 있을 때
      const isActive = status?.is_active === true && 
                      status?.active_sensors && 
                      status.active_sensors.length > 0;
      setIsStreamingActive(isActive);
      
      console.log('🔄 [DataCenter] Streaming active:', isActive, 'Active sensors:', status?.active_sensors);
      console.log('🔄 [DataCenter] is_active field:', status?.is_active);
    } catch (error) {
      console.error('🔄 [DataCenter] Error fetching auto streaming status:', error);
      // API 오류 시 기본값으로 설정
      setAutoStreamingStatus(null);
      setIsStreamingActive(false);
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
            // 기본 경로가 설정되면 즉시 유효한 것으로 간주
            setPathValidation({
              isValid: true,
              error: ''
            });
            validatePath(defaultPath.path);
          } else {
            console.warn('Failed to get default export path, using fallback');
            const fallbackPath = '~/Documents/LinkBand Exports';
            setRecordingOptions(prev => ({
              ...prev,
              exportPath: fallbackPath
            }));
            // 폴백 경로도 즉시 유효한 것으로 간주
            setPathValidation({
              isValid: true,
              error: ''
            });
          }
        } catch (error) {
          console.error('Error initializing export path:', error);
          const fallbackPath = '~/Documents/LinkBand Exports';
          setRecordingOptions(prev => ({
            ...prev,
            exportPath: fallbackPath
          }));
          // 오류 발생 시에도 폴백 경로를 유효한 것으로 간주
          setPathValidation({
            isValid: true,
            error: ''
          });
        }
      }
    };

    initializeExportPath();
    
    // 레코딩 상태 동기화 - 컴포넌트 마운트 시 즉시 새로고침
    fetchRecordingStatus();
    
    // 자동 스트리밍 상태 확인 (Phase 2)
    fetchAutoStreamingStatus();
    
    // 주기적으로 레코딩 상태 및 스트리밍 상태 새로고침 (5초마다)
    const interval = setInterval(() => {
      fetchRecordingStatus();
      fetchAutoStreamingStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []); // 빈 dependency array로 마운트 시에만 실행

  useEffect(() => {
    fetchRecordingStatus();
    const interval = setInterval(fetchRecordingStatus, 1000);
    return () => clearInterval(interval);
  }, [fetchRecordingStatus]);

  const handleTabChange = (newValue: string) => {
    setActiveTab(newValue);
  };

  // Recording can only be started when Engine is started, Link Band is connected, 
  // streaming is active (auto-detected), and path is valid (Phase 2)
  const isStartRecordingDisabled = recordingStatus.is_recording || 
                                   !isEngineStarted || 
                                   !isDeviceConnected || 
                                   !isStreamingActive ||
                                   (!pathValidation.isValid && !recordingOptions.exportPath.trim());

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
    console.log('🎬 [DataCenter] Start Recording Button Clicked!');
    console.log('🎬 [DataCenter] Current States:', {
      isEngineStarted,
      isDeviceConnected,
      recordingStatus,
      pathValidation,
      recordingOptions
    });
    
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

      console.log('🎬 [DataCenter] Starting recording with options:', sessionData);
      const result = await startRecording(sessionData);
      console.log('🎬 [DataCenter] Recording start result:', result);
    } catch (error) {
      console.error('🎬 [DataCenter] Error starting recording:', error);
    }
  };

  // 디버깅을 위한 상태 출력
  useEffect(() => {
    console.log('🔍 [DataCenter Debug] === Recording Button State Analysis ===');
    console.log('🔍 [DataCenter Debug] Engine Status:', { isEngineStarted });
    console.log('🔍 [DataCenter Debug] Device Status:', { deviceStatus, isDeviceConnected });
    console.log('🔍 [DataCenter Debug] Streaming Status:', { autoStreamingStatus, isStreamingActive });
    console.log('�� [DataCenter Debug] Auto Streaming Details:', {
      activeSensors: autoStreamingStatus?.active_sensors || [],
      dataFlowHealth: autoStreamingStatus?.data_flow_health || 'unknown',
      totalActiveSensors: autoStreamingStatus?.total_active_sensors || 0,
      sensorDetails: autoStreamingStatus?.sensor_details || {}
    });
    console.log('🔍 [DataCenter Debug] Recording Status:', recordingStatus);
    console.log('🔍 [DataCenter Debug] Path Validation:', pathValidation);
    console.log('🔍 [DataCenter Debug] Export Path:', recordingOptions.exportPath);
    
    // 각 조건을 개별적으로 체크
    const conditions = {
      isRecording: recordingStatus.is_recording,
      engineNotStarted: !isEngineStarted,
      deviceNotConnected: !isDeviceConnected,
      streamingNotActive: !isStreamingActive,
      pathInvalid: !pathValidation.isValid && !recordingOptions.exportPath.trim()
    };
    
    console.log('🔍 [DataCenter Debug] Button Disable Conditions:', conditions);
    console.log('🔍 [DataCenter Debug] Button Disabled:', isStartRecordingDisabled);
    console.log('🔍 [DataCenter Debug] ==============================================');
  }, [isEngineStarted, isDeviceConnected, isStreamingActive, recordingStatus, pathValidation, recordingOptions.exportPath, autoStreamingStatus]);

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
            <Button
              variant="outline"
              onClick={fetchRecordingStatus}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              title="Refresh recording status"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Recording Options - 버튼 아래로 이동 */}
          <RecordingOptions
            options={recordingOptions}
            onOptionsChange={handleOptionsChange}
            pathValidation={pathValidation}
            onPathValidation={handlePathValidation}
          />
          
          {(!isEngineStarted || !isDeviceConnected || !isStreamingActive) && !recordingStatus.is_recording && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-400">
                <p className="font-medium mb-2">Recording requires all conditions to be met:</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    {isEngineStarted ? (
                      <span className="text-green-400">✓ Engine: Started</span>
                    ) : (
                      <span className="text-red-400">✗ Engine: Not started</span>
                    )}
                  </li>
                  <li className="flex items-center gap-2">
                    {isDeviceConnected ? (
                      <span className="text-green-400">✓ Link Band: Connected</span>
                    ) : (
                      <span className="text-red-400">✗ Link Band: Not connected</span>
                    )}
                  </li>
                  <li className="flex items-center gap-2">
                    {isStreamingActive ? (
                      <span className="text-green-400">✓ Data Streaming: Active</span>
                    ) : (
                      <span className="text-red-400">✗ Data Streaming: Inactive</span>
                    )}
                  </li>
                </ul>
              </div>
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