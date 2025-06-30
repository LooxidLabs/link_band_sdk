import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Brain, Cpu, Battery, Wifi, Circle, HeartPulse, Move3d } from 'lucide-react';
import { useMonitoringData, useStreamingStatus, useDeviceState } from '../stores/core/SystemStore';
import { useEngineStore } from '../stores/engine';
import { useDataCenterStore } from '../stores/dataCenter';
import { useEffect, useState } from 'react';

interface StatusBarProps {
  isConnected: boolean;
  isWebSocketConnected: boolean;
  engineStatus: any;
}

export function StatusBar({ 
  isConnected 
  // isWebSocketConnected,
}: StatusBarProps) {
  // 🔥 SystemStore에서 모든 데이터 가져오기 (WebSocket 기반)
  const monitoringData = useMonitoringData();
  const streamingStatus = useStreamingStatus();
  const deviceState = useDeviceState();
  
  // Get engine status from store
  const { engineStatus } = useEngineStore();
  
  // Get recording status from DataCenter store
  const { recordingStatus, fetchRecordingStatus } = useDataCenterStore();
  
  // State for recording duration
  const [recordingDuration, setRecordingDuration] = useState<string>('00.00 s');

  // 🔥 모니터링 데이터 디버깅
  useEffect(() => {
    console.log('[StatusBar] Monitoring data updated:', {
      cpuUsage: monitoringData.performance.cpuUsage,
      memoryUsage: monitoringData.performance.memoryUsage,
      systemHealth: monitoringData.systemHealth,
      timestamp: new Date().toISOString(),
      fullData: monitoringData
    });
  }, [monitoringData]);

  // 🔥 스트리밍 상태 디버깅
  useEffect(() => {
    console.log('[StatusBar] Streaming status updated:', {
      samplingRates: streamingStatus.samplingRates,
      isStreaming: streamingStatus.isStreaming,
      timestamp: new Date().toISOString(),
      fullData: streamingStatus
    });
  }, [streamingStatus]);

  // 🔥 디바이스 상태 디버깅
  useEffect(() => {
    console.log('[StatusBar] Device state updated:', {
      batteryLevel: deviceState.current?.batteryLevel,
      deviceName: deviceState.current?.name,
      isConnected: deviceState.current?.isConnected,
      timestamp: new Date().toISOString(),
      fullData: deviceState
    });
  }, [deviceState]);

  // Fetch recording status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecordingStatus();
    }, 1000); // Refresh every 1 second for recording status
    
    return () => clearInterval(interval);
  }, [fetchRecordingStatus]);

  // Update recording duration
  useEffect(() => {
    if (recordingStatus.is_recording && recordingStatus.start_time) {
      const interval = setInterval(() => {
        const startTime = new Date(recordingStatus.start_time!);
        const now = new Date();
        const diffMs = now.getTime() - startTime.getTime();
        const seconds = (diffMs / 1000).toFixed(2);
        setRecordingDuration(`${seconds} s`);
      }, 10); // Update every 10ms for smooth display
      
      return () => clearInterval(interval);
    } else {
      setRecordingDuration('00.00 s');
    }
  }, [recordingStatus.is_recording, recordingStatus.start_time]);
  
  // 🔥 System status data - 모든 데이터 WebSocket 기반으로 변경
  const systemStats = {
    engine: engineStatus?.status === 'running',
    linkBand: isConnected,
    clients: engineStatus?.clients_connected ? engineStatus?.clients_connected : 0,
    eeg: { value: streamingStatus.samplingRates.eeg || 0, unit: 'Hz' },
    ppg: { value: streamingStatus.samplingRates.ppg || 0, unit: 'Hz' },
    accel: { value: streamingStatus.samplingRates.acc || 0, unit: 'Hz' },
    battery: deviceState.current?.batteryLevel || 0,
    // 🔥 CPU/RAM 데이터 개선 - undefined 체크 및 기본값 설정
    cpu: monitoringData.performance.cpuUsage !== undefined && monitoringData.performance.cpuUsage !== null 
      ? monitoringData.performance.cpuUsage.toFixed(1) 
      : 'N/A',
    ram: monitoringData.performance.memoryUsage !== undefined && monitoringData.performance.memoryUsage !== null 
      ? monitoringData.performance.memoryUsage.toFixed(1) 
      : 'N/A'
  };

  // 🔥 실시간 데이터 확인용 로그
  console.log('[StatusBar] Current systemStats:', systemStats);

  return (
    <footer className="bg-card border-t border-border px-6 py-2">
      <div className="flex items-center justify-between text-xs text-foreground">
        {/* Left side - System status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-1">
            <Cpu className="h-3 w-3 text-chart-2" />
            <span className="text-foreground">Streaming :</span>
            <Badge variant={engineStatus?.status === 'running' ? "default" : "secondary"} className="text-xs px-1 py-0">
              {engineStatus?.status === 'running' ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
          </div>

          <Separator orientation="vertical" className="h-4" />

          <div className="flex items-center gap-1">
            <Circle className={`h-3 w-3 ${recordingStatus.is_recording ? 'text-red-500 fill-red-500' : 'text-chart-1'}`} />
            <span className="text-foreground">Recording:</span>
            {recordingStatus.is_recording ? (
              <span className="text-xs text-cyan-400 font-mono">
                {recordingDuration}
              </span>
            ) : (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                IDLE
              </Badge>
            )}
          </div>

          <Separator orientation="vertical" className="h-4" />

          <div className="flex items-center gap-1">
            <Wifi className="h-3 w-3 text-chart-1" />
            <span className="text-foreground">Clients: {systemStats.clients}</span>
          </div>
        </div>

        {/* Center - Data rates */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-1">
            <Brain className="h-3 w-3 text-chart-1" />
            <span className="text-foreground">EEG: {isConnected && systemStats.eeg.value ? systemStats.eeg.value.toFixed(1) : '-'} {systemStats.eeg.unit}</span>
          </div>

          <div className="flex items-center gap-1">
            <HeartPulse className="h-3 w-3 text-chart-2" />
            <span className="text-foreground">PPG: {isConnected && systemStats.ppg.value ? systemStats.ppg.value.toFixed(1) : '-'} {systemStats.ppg.unit}</span>
          </div>

          <div className="flex items-center gap-1">
            <Move3d className="h-3 w-3 text-chart-3" />
            <span className="text-foreground">ACC: {isConnected && systemStats.accel.value ? systemStats.accel.value.toFixed(1) : '-'} {systemStats.accel.unit}</span>
          </div>

          <div className="flex items-center gap-1">
            <Battery className="h-3 w-3 text-chart-4" />
            <span className="text-foreground">Battery: {isConnected && systemStats.battery ? systemStats.battery : '-'}%</span>
          </div>
        </div>

        {/* Right side - System resources */}
        <div className="flex items-center space-x-4 text-muted-foreground">
          {/* 🔥 CPU/RAM 표시 개선 - 실시간 데이터 반영 */}
          <span className="text-foreground">
            CPU: {systemStats.cpu}%
            {monitoringData.performance.cpuUsage === 0 && (
              <span className="text-xs text-yellow-400 ml-1">(waiting...)</span>
            )}
            {monitoringData.performance.cpuUsage > 0 && (
              <span className="text-xs text-green-400 ml-1">✓</span>
            )}
          </span>
          <span className="text-foreground">
            RAM: {systemStats.ram}MB
            {monitoringData.performance.memoryUsage === 0 && (
              <span className="text-xs text-yellow-400 ml-1">(waiting...)</span>
            )}
            {monitoringData.performance.memoryUsage > 0 && (
              <span className="text-xs text-green-400 ml-1">✓</span>
            )}
          </span>
          
          {/* 🔥 시스템 상태 표시 추가 */}
          {monitoringData.systemHealth > 0 && (
            <span className="text-xs text-green-400">
              Health: {monitoringData.systemHealth.toFixed(0)}%
            </span>
          )}
          
          {/* 🔥 모니터링 데이터 수신 상태 표시 */}
          {monitoringData.systemHealth === 0 && monitoringData.performance.cpuUsage === 0 && (
            <span className="text-xs text-red-400 animate-pulse">
              🔍 Waiting for monitoring data...
            </span>
          )}
          
          {/* 🔥 실시간 업데이트 표시 */}
          {monitoringData.performance.cpuUsage > 0 && (
            <Badge variant="default" className="text-xs px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white">
              Live
            </Badge>
          )}
                    
          {/* {!isConnected && (
            <div className="text-destructive">
              System Error: Network Error Device Error Engine Error Network Error
            </div>
          )} */}
        </div>
      </div>
    </footer>
  );
} 