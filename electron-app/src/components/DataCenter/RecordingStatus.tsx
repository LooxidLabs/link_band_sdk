import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import type { RecordingStatusResponse } from '../../types/data-center';
import { useDeviceStore } from '../../stores/device';

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
  const deviceStatus = useDeviceStore((state) => state.deviceStatus);
  const isDeviceConnected = deviceStatus?.is_connected || false;
  const [duration, setDuration] = useState<string>('00 min 00 sec 00 ms');

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (status.is_recording && status.start_time) {
      const updateDuration = () => {
        const startTime = new Date(status.start_time!).getTime();
        const now = Date.now();
        const diff = now - startTime;

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const milliseconds = Math.floor((diff % 1000) / 10); // 10ms 단위로 표시

        const formattedDuration = `${minutes.toString().padStart(2, '0')} min ${seconds.toString().padStart(2, '0')} sec ${milliseconds.toString().padStart(2, '0')} ms`;
        setDuration(formattedDuration);
      };

      // 초기 업데이트
      updateDuration();

      // 10ms마다 업데이트
      intervalId = setInterval(updateDuration, 10);
    } else {
      setDuration('00 min 00 sec 00 ms');
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [status.is_recording, status.start_time]);

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
            <InfoRow label="Duration">
              <span className="text-xs text-cyan-400 font-mono">{duration}</span>
            </InfoRow>
          </>
        )}
      </div>
    </div>
  );
}; 