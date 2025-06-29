import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, FolderOpen, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { useDataCenterStore } from '../../stores/dataCenter';
import type { Session } from '../../types/data-center';

export const SessionList: React.FC = () => {
  // 마지막 업데이트 시간 추적
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // 삭제 기능 관련 상태
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'selected' | 'all' | null>(null);
  
  // Zustand selector를 명시적으로 사용하여 리렌더링 보장
  const sessions = useDataCenterStore(state => state.sessions);
  const sessionsLoading = useDataCenterStore(state => state.sessionsLoading);
  const recordingStatus = useDataCenterStore(state => state.recordingStatus);
  const fetchSessions = useDataCenterStore(state => state.fetchSessions);
  const exportSession = useDataCenterStore(state => state.exportSession);
  const openSessionFolder = useDataCenterStore(state => state.openSessionFolder);

  // 수동 refresh 함수
  const handleRefresh = async () => {
    console.log('[SessionList] Manual refresh triggered');
    await fetchSessions();
    setLastUpdated(new Date());
  };

  // 세션 선택/해제 함수
  const toggleSessionSelection = (sessionName: string) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionName)) {
      newSelected.delete(sessionName);
    } else {
      newSelected.add(sessionName);
    }
    setSelectedSessions(newSelected);
  };



  // 삭제 확인 모달 열기
  const openDeleteConfirm = (mode: 'selected' | 'all') => {
    setDeleteMode(mode);
    setShowDeleteConfirm(true);
  };

  // 삭제 실행 함수
  const handleDelete = async () => {
    if (!deleteMode) return;
    
    setIsDeleting(true);
    try {
      let response;
      
      if (deleteMode === 'all') {
        // 전체 삭제
        response = await fetch('http://localhost:8121/data/sessions/all', {
          method: 'DELETE',
        });
      } else {
        // 선택된 세션들 삭제
        const sessionIds = Array.from(selectedSessions);
        response = await fetch('http://localhost:8121/data/sessions/bulk', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_ids: sessionIds }),
        });
      }

      if (response.ok) {
        const result = await response.json();
        console.log('[SessionList] Delete result:', result);
        
        // 성공 메시지 표시
        if (deleteMode === 'all') {
          alert(`Successfully deleted ${result.successful}/${result.total} sessions`);
        } else {
          alert(`Successfully deleted ${result.successful}/${result.total} selected sessions`);
        }
        
        // 선택 해제 및 목록 새로고침
        setSelectedSessions(new Set());
        await handleRefresh();
      } else {
        const error = await response.json();
        console.error('[SessionList] Delete failed:', error);
        alert(`Delete failed: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[SessionList] Delete error:', error);
      alert(`Delete failed: ${error}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteMode(null);
    }
  };

  useEffect(() => {
    console.log('[SessionList] Initial mount, fetching sessions...');
    handleRefresh();
  }, [fetchSessions]);

  // sessions 데이터가 변경될 때마다 로그 출력 및 업데이트 시간 기록
  useEffect(() => {
    console.log('[SessionList] Sessions updated:', sessions);
    console.log('[SessionList] Sessions count:', sessions?.length || 0);
    if (sessions && sessions.length > 0) {
      setLastUpdated(new Date());
    }
  }, [sessions]);

  // 레코딩 상태가 변경될 때 알림만 표시 (자동 새로고침 제거)
  useEffect(() => {
    if (!recordingStatus.is_recording && recordingStatus.current_session === null) {
      console.log('[SessionList] Recording stopped. Use refresh button to update the list.');
    }
  }, [recordingStatus.is_recording, recordingStatus.current_session]);

  const getBadgeVariant = (status: string) => {
    if (status === 'recording') return 'destructive';
    if (status === 'completed') return 'default';
    if (status === 'processing') return 'secondary';
    return 'outline';
  };

  const getBadgeColor = (status: string) => {
    if (status === 'recording') return 'bg-red-600 hover:bg-red-700';
    if (status === 'completed') return 'bg-green-600 hover:bg-green-700';
    if (status === 'processing') return 'bg-yellow-600 hover:bg-yellow-700';
    return 'bg-gray-600 hover:bg-gray-700';
  };

  // Duration 계산 함수
  const calculateDuration = (startTime: string, endTime: string | null): string => {
    if (!endTime) return 'N/A';
    
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMs = end.getTime() - start.getTime();
      const durationSeconds = Math.floor(durationMs / 1000);
      
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      const seconds = durationSeconds % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    } catch (error) {
      return 'N/A';
    }
  };

  // 경로 단축 함수 (최대 15글자)
  const shortenPath = (path: string): string => {
    if (!path || path.length <= 15) return path;
    return `...${path.slice(-12)}`;
  };

  // 파일 포맷 추출 함수
  const getFileFormat = (session: Session): string => {
    return session.data_format?.toUpperCase() || 'JSON';
  };

  if (sessionsLoading && (!sessions || sessions.length === 0)) {
    return (
      <div className="p-4 flex justify-center items-center min-h-[200px]" style={{ backgroundColor: '#161822' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  
  // 전체 선택/해제 함수 (safeSessions 정의 후)
  const isAllSelected = safeSessions.length > 0 && selectedSessions.size === safeSessions.length;
  
  const toggleSelectAll = () => {
    if (selectedSessions.size === safeSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(safeSessions.map(s => s.session_name)));
    }
  };

  // 시간 포맷팅 함수
  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="p-4 overflow-hidden" style={{ backgroundColor: '#161822' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Session List</h3>
          {selectedSessions.size > 0 && (
            <span className="text-xs text-blue-400">
              {selectedSessions.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            Last updated: {formatLastUpdated(lastUpdated)}
          </span>
          {selectedSessions.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDeleteConfirm('selected')}
              disabled={isDeleting}
              className="h-7 px-3 text-xs text-red-400 border-red-600 hover:bg-red-700 hover:text-white"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete Selected ({selectedSessions.size})
            </Button>
          )}
          {safeSessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDeleteConfirm('all')}
              disabled={isDeleting}
              className="h-7 px-3 text-xs text-red-400 border-red-600 hover:bg-red-700 hover:text-white"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete All
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={sessionsLoading}
            className="h-7 px-3 text-xs text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${sessionsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      <div className="rounded-md border border-gray-600 overflow-hidden" style={{ backgroundColor: '#1a1d29' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead style={{ backgroundColor: '#222530' }}>
              <tr className="border-b border-gray-600">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Session Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Start Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">End Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Duration</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Path</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Format</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Status</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeSessions.map((session: Session) => (
                <tr
                  key={session.session_id}
                  className="border-b border-gray-700 hover:bg-gray-800/30 cursor-pointer"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedSessions.has(session.session_name)}
                      onChange={() => toggleSessionSelection(session.session_name)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-white font-medium">
                    {session.session_name}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">
                    {new Date(session.start_time).toLocaleString('en-US', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit',
                      hour12: true 
                    })}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">
                    {session.end_time ? new Date(session.end_time).toLocaleString('en-US', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit',
                      hour12: true 
                    }) : 'N/A'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">
                    {calculateDuration(session.start_time, session.end_time)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300" title={session.data_path}>
                    {shortenPath(session.data_path)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">
                    {getFileFormat(session)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge 
                      variant={getBadgeVariant(session.status)}
                      className={`text-xs ${getBadgeColor(session.status)}`}
                    >
                      {session.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          console.log('[SessionList] Export clicked for session:', session);
                          console.log('[SessionList] Session ID:', session.session_id);
                          console.log('[SessionList] Session Name:', session.session_name);
                          exportSession(session.session_name); // session_name을 사용
                        }}
                        className="h-6 px-2 text-xs text-blue-400 border-gray-600 hover:bg-gray-700 hover:text-white"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          console.log('[SessionList] Open clicked for session:', session);
                          console.log('[SessionList] Session ID:', session.session_id);
                          console.log('[SessionList] Session Name:', session.session_name);
                          openSessionFolder(session.session_name); // session_name을 사용
                        }}
                        className="h-6 px-2 text-xs text-green-400 border-gray-600 hover:bg-gray-700 hover:text-white"
                      >
                        <FolderOpen className="w-3 h-3 mr-1" />
                        Open
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          if (confirm(`Are you sure you want to delete session "${session.session_name}"? This action cannot be undone.`)) {
                            setIsDeleting(true);
                            try {
                              const response = await fetch(`http://localhost:8121/data/sessions/${session.session_name}`, {
                                method: 'DELETE',
                              });
                              if (response.ok) {
                                const result = await response.json();
                                console.log('[SessionList] Individual delete result:', result);
                                alert('Session deleted successfully');
                                await handleRefresh();
                              } else {
                                const error = await response.json();
                                console.error('[SessionList] Individual delete failed:', error);
                                alert(`Delete failed: ${error.detail || 'Unknown error'}`);
                              }
                            } catch (error) {
                              console.error('[SessionList] Individual delete error:', error);
                              alert(`Delete failed: ${error}`);
                            } finally {
                              setIsDeleting(false);
                            }
                          }
                        }}
                        disabled={isDeleting}
                        className="h-6 px-2 text-xs text-red-400 border-gray-600 hover:bg-red-700 hover:text-white"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {safeSessions.length === 0 && !sessionsLoading && (
          <div className="text-center text-gray-400 py-8 text-xs">
            No sessions found.
          </div>
        )}
      </div>
      
      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Confirm Deletion</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 text-sm mb-2">
                {deleteMode === 'all' 
                  ? `Are you sure you want to delete ALL ${safeSessions.length} sessions?`
                  : `Are you sure you want to delete ${selectedSessions.size} selected session(s)?`
                }
              </p>
              <p className="text-red-400 text-xs">
                ⚠️ This action will permanently delete all files and cannot be undone!
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteMode(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-300 border-gray-600 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-red-400 border-red-600 hover:bg-red-700 hover:text-white"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 mr-2" />
                    Delete {deleteMode === 'all' ? 'All' : 'Selected'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 