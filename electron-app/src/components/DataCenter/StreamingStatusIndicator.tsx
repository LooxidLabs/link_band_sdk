import React from 'react';
import { AlertCircle, CheckCircle, Clock, Wifi, WifiOff, RotateCcw } from 'lucide-react';

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
  
  // Retry 버튼 핸들러
  const handleRetry = async () => {
    try {
      console.log('[StreamingStatusIndicator] Retry button clicked - attempting to restart streaming...');
      
      // 1. 현재 상태 확인
      const statusResponse = await fetch('http://localhost:8121/stream/auto-status');
      const currentStatus = await statusResponse.json();
      console.log('[StreamingStatusIndicator] Current status before retry:', currentStatus);
      
      // 2. 스트리밍 중지 (안전하게)
      console.log('[StreamingStatusIndicator] Stopping streaming...');
      const stopResponse = await fetch('http://localhost:8121/stream/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const stopResult = await stopResponse.json();
      console.log('[StreamingStatusIndicator] Stop result:', stopResult);
      
      // 2초 대기 (서버가 안정화될 시간)
      console.log('[StreamingStatusIndicator] Waiting for server stabilization...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 3. 스트리밍 재시작
      console.log('[StreamingStatusIndicator] Starting streaming...');
      const startResponse = await fetch('http://localhost:8121/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const startResult = await startResponse.json();
      console.log('[StreamingStatusIndicator] Start result:', startResult);
      
      if (startResult.status === 'success') {
        console.log('[StreamingStatusIndicator] ✅ Streaming restarted successfully');
        
        // 4. 수동 재초기화 API 호출
        console.log('[StreamingStatusIndicator] Calling manual reinitialization...');
        const reinitResponse = await fetch('http://localhost:8121/stream/reinitialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const reinitResult = await reinitResponse.json();
        console.log('[StreamingStatusIndicator] Reinitialization result:', reinitResult);
        
        if (reinitResult.status === 'success') {
          console.log('[StreamingStatusIndicator] ✅ Manual reinitialization completed');
          
          // 5. AdaptivePollingManager 재시작
          const { globalPollingManager } = await import('../../services/AdaptivePollingManager');
          globalPollingManager.markInitializationStart();
          console.log('[StreamingStatusIndicator] ✅ AdaptivePollingManager restarted');
          
          // 6. 즉시 상태 확인 (폴링 대기 없이)
          console.log('[StreamingStatusIndicator] Force immediate status check...');
          await globalPollingManager.forceImmediateCheckAll();
          console.log('[StreamingStatusIndicator] ✅ Immediate status check completed');
        } else {
          console.error('[StreamingStatusIndicator] ❌ Failed to reinitialize:', reinitResult.message);
        }
      } else {
        console.error('[StreamingStatusIndicator] ❌ Failed to restart streaming:', startResult.message);
      }
    } catch (error) {
      console.error('[StreamingStatusIndicator] ❌ Error during retry:', error);
    }
  };
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
            bgColor: 'bg-yellow-900/20 border-yellow-800',
            showRetryButton: timeRemaining < 10 // 10초 미만 남았을 때 Retry 버튼 표시
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
        message: 'No active data flow detected',
        color: 'text-red-400',
        bgColor: 'bg-red-900/20 border-red-800',
        showRetryButton: true
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
        
        {/* Retry 버튼 (No Data Flow 상태일 때) */}
        {statusInfo.showRetryButton && isDeviceConnected && (
          <div className="mt-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              <RotateCcw className="w-4 h-4" />
              Retry Streaming
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Click to restart streaming and data flow detection
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 