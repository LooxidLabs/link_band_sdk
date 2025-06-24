import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, FolderOpen } from 'lucide-react';
import { useDataCenterStore } from '../../stores/dataCenter';
import type { Session } from '../../types/data-center';

export const SessionList: React.FC = () => {
  const { 
    sessions, 
    sessionsLoading, 
    recordingStatus,
    fetchSessions, 
    exportSession, 
    openSessionFolder 
  } = useDataCenterStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 레코딩 상태가 변경될 때마다 세션 리스트 새로고침
  useEffect(() => {
    // 레코딩이 중지되었을 때 (is_recording이 false가 되었을 때) 세션 리스트 새로고침
    if (!recordingStatus.is_recording && recordingStatus.current_session === null) {
      console.log('[SessionList] Recording stopped, refreshing sessions...');
      setTimeout(() => {
        fetchSessions();
      }, 1000); // 1초 후 새로고침 (파일 시스템 동기화 대기)
    }
  }, [recordingStatus.is_recording, recordingStatus.current_session, fetchSessions]);

  // 페이지 포커스 시에도 세션 리스트 새로고침
  useEffect(() => {
    const handleFocus = () => {
      console.log('[SessionList] Page focused, refreshing sessions...');
      fetchSessions();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchSessions]);

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

  // 파일 포맷 추출 함수 (현재는 기본값 JSON, 추후 API에서 제공될 예정)
  const getFileFormat = (): string => {
    // 추후 session 객체에 format 필드가 추가되면 사용
    // return session.format || 'JSON';
    return 'JSON'; // 현재는 기본값
  };

  if (sessionsLoading && (!sessions || sessions.length === 0)) {
    return (
      <div className="p-4 flex justify-center items-center min-h-[200px]" style={{ backgroundColor: '#161822' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const safeSessions = Array.isArray(sessions) ? sessions : [];

  return (
    <div className="p-4 overflow-hidden" style={{ backgroundColor: '#161822' }}>
      <h3 className="text-sm font-semibold text-white mb-4">Session List</h3>
      <div className="rounded-md border border-gray-600 overflow-hidden" style={{ backgroundColor: '#1a1d29' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead style={{ backgroundColor: '#222530' }}>
              <tr className="border-b border-gray-600">
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
                  <td className="px-3 py-2 text-xs text-white font-medium">
                    {session.session_name}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">
                    {new Date(session.start_time).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">
                    {session.end_time ? new Date(session.end_time).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">
                    {calculateDuration(session.start_time, session.end_time)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300" title={session.data_path}>
                    {shortenPath(session.data_path)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">
                    {getFileFormat()}
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
                        onClick={(e) => { e.stopPropagation(); exportSession(session.session_id); }}
                        className="h-6 px-2 text-xs text-blue-400 border-gray-600 hover:bg-gray-700 hover:text-white"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openSessionFolder(session.session_id); }}
                        className="h-6 px-2 text-xs text-green-400 border-gray-600 hover:bg-gray-700 hover:text-white"
                      >
                        <FolderOpen className="w-3 h-3 mr-1" />
                        Open
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
    </div>
  );
}; 