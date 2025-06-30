import React from 'react';
import { AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';

export interface StreamingStatusIndicatorProps {
  autoStreamingStatus: any;
  isStreamingActive: boolean;
  isEngineStarted: boolean;
  isDeviceConnected: boolean;
}

export const StreamingStatusIndicator: React.FC<StreamingStatusIndicatorProps> = ({
  autoStreamingStatus,
  isStreamingActive,
  isEngineStarted,
  isDeviceConnected
}) => {
  
  // 상태 결정 로직
  const getStatusInfo = () => {
    // 초기화 정보가 있는 경우
    if (autoStreamingStatus?.initialization_info) {
      const initInfo = autoStreamingStatus.initialization_info;
      
      if (initInfo.is_in_init_phase) {
        const timeRemaining = Math.max(0, initInfo.time_remaining || 0);
        const timeRemainingDisplay = timeRemaining.toFixed(1);
        
        if (isStreamingActive) {
          return {
            status: 'ready',
            icon: <CheckCircle className="w-5 h-5 text-green-400" />,
            title: 'Data Flow Active',
            message: 'Streaming is active with data flow detected',
            color: 'text-green-400',
            bgColor: 'bg-green-900/20 border-green-800'
          };
        } else if (autoStreamingStatus?.logical_streaming_active) {
          return {
            status: 'waiting',
            icon: <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />,
            title: 'Waiting for Data Flow',
            message: `Streaming started, waiting for data... (${timeRemainingDisplay}s remaining)`,
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-900/20 border-yellow-800'
          };
        } else {
          return {
            status: 'initializing',
            icon: <Clock className="w-5 h-5 text-blue-400 animate-pulse" />,
            title: 'System Initializing',
            message: `System is starting up... (${timeRemainingDisplay}s remaining)`,
            color: 'text-blue-400',
            bgColor: 'bg-blue-900/20 border-blue-800'
          };
        }
      }
    }

    // 정상 단계에서의 상태 판정
    if (!isEngineStarted) {
      return {
        status: 'engine-not-started',
        icon: <WifiOff className="w-5 h-5 text-red-400" />,
        title: 'Engine Not Started',
        message: 'Please start the engine first',
        color: 'text-red-400',
        bgColor: 'bg-red-900/20 border-red-800'
      };
    }

    if (!isDeviceConnected) {
      return {
        status: 'device-not-connected',
        icon: <WifiOff className="w-5 h-5 text-red-400" />,
        title: 'Device Not Connected',
        message: 'Please connect a Link Band device',
        color: 'text-red-400',
        bgColor: 'bg-red-900/20 border-red-800'
      };
    }

    if (isStreamingActive) {
      return {
        status: 'active',
        icon: <Wifi className="w-5 h-5 text-green-400" />,
        title: 'Streaming Active',
        message: 'Data is flowing normally',
        color: 'text-green-400',
        bgColor: 'bg-green-900/20 border-green-800'
      };
    } else {
      return {
        status: 'inactive',
        icon: <AlertCircle className="w-5 h-5 text-red-400" />,
        title: 'No Data Flow',
        message: 'No active data flow detected - use EngineModule to control streaming',
        color: 'text-red-400',
        bgColor: 'bg-red-900/20 border-red-800'
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`p-4 rounded-md border flex items-start gap-3 ${statusInfo.bgColor}`}>
      <div className="flex-shrink-0 mt-0.5">
        {statusInfo.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${statusInfo.color}`}>
          {statusInfo.title}
        </div>
        <div className="text-sm text-gray-400 mt-1">
          {statusInfo.message}
        </div>
        
        {/* 초기화 단계에서 추가 정보 표시 */}
        {autoStreamingStatus?.initialization_info?.is_in_init_phase && (
          <div className="mt-2 text-xs text-gray-500">
            <div className="flex justify-between items-center">
              <span>Initialization Progress</span>
              <span>
                {Math.max(0, 15 - (autoStreamingStatus.initialization_info.time_remaining || 0)).toFixed(1)}s / 15s
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
              <div 
                className="bg-blue-400 h-1.5 rounded-full transition-all duration-1000" 
                style={{ 
                  width: `${Math.min(100, ((15 - (autoStreamingStatus.initialization_info.time_remaining || 0)) / 15) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}
        
        {/* 센서 상태 표시 (활성 상태일 때) */}
        {isStreamingActive && autoStreamingStatus?.active_sensors && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Active Sensors:</div>
            <div className="flex gap-1">
              {autoStreamingStatus.active_sensors.map((sensor: string) => (
                <span 
                  key={sensor}
                  className="px-2 py-0.5 bg-green-800/30 text-green-300 text-xs rounded-full border border-green-700"
                >
                  {sensor.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 