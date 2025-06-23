import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, FolderOpen } from 'lucide-react';
import { useDataCenterStore } from '../../stores/dataCenter';
import type { Session } from '../../types/data-center';

export const SessionList: React.FC = () => {
  const { sessions, sessionsLoading, fetchSessions, exportSession, openSessionFolder } = useDataCenterStore();

  useEffect(() => {
    fetchSessions();
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
        <table className="w-full">
          <thead style={{ backgroundColor: '#222530' }}>
            <tr className="border-b border-gray-600">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Session Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">Start Time</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-300">End Time</th>
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
        {safeSessions.length === 0 && !sessionsLoading && (
          <div className="text-center text-gray-400 py-8 text-xs">
            No sessions found.
          </div>
        )}
      </div>
    </div>
  );
}; 