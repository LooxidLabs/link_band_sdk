import React from 'react';
import { Badge } from '../ui/badge';
import type { RecordingStatusResponse } from '../../types/data-center';
import { useMetricsStore } from '../../stores/metrics';

interface RecordingStatusProps {
  status: Omit<RecordingStatusResponse, 'device_connected'>;
}

// Helper for each info row
const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center gap-3 w-full">
    <span className="text-sm font-medium text-gray-300 min-w-[80px]">
      {label}:
    </span>
    <div className="text-white">{children}</div>
  </div>
);

export const RecordingStatus: React.FC<RecordingStatusProps> = ({ status }) => {
  const isDeviceConnected = useMetricsStore((state) => state.deviceStatus?.status === 'connected');

  return (
    <div className="w-full text-white mt-1">
      <div className="space-y-2">
        <InfoRow label="Device">
          <Badge 
            variant={isDeviceConnected ? "default" : "destructive"}
            className={`text-xs ${isDeviceConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isDeviceConnected ? 'LINK BAND Connected' : 'LINK BAND Disconnected'}
          </Badge>
        </InfoRow>
        <InfoRow label="Recording">
          <Badge 
            variant={status.is_recording ? "destructive" : "default"}
            className={`text-xs ${status.is_recording ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {status.is_recording ? 'Active' : 'Inactive'}
          </Badge>
        </InfoRow>

        {status.is_recording && (
          <>
            <InfoRow label="Session ID">
              <span className="text-xs text-gray-300">{status.current_session || 'N/A'}</span>
            </InfoRow>
            <InfoRow label="Started At">
              <span className="text-xs text-gray-300">
                {status.start_time ? new Date(status.start_time).toLocaleString() : 'N/A'}
              </span>
            </InfoRow>
          </>
        )}
      </div>
    </div>
  );
}; 