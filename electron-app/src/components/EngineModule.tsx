import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { 
  Power, 
  RefreshCw, 
  PowerOff, 
  CheckCircle, 
  XCircle, 
  Server, 
  Wifi, 
  Database, 
  Cpu, 
  MemoryStick,
  Activity,
  Loader2,
  Settings
} from 'lucide-react';
import { useSystemStatus, useSystemActions } from '../hooks/useSystemManager';
import { useSystemStore } from '../stores/core/SystemStore';
import { engineApi } from '../api/engine';

const EngineModule: React.FC = () => {
  const {
    isInitialized,
    isInitializing,
    initializationError
  } = useSystemStatus();

  const { initialize, shutdown, restart, clearError } = useSystemActions();
  
  const deviceState = useSystemStore(state => state.device);
  const streamingStatus = useSystemStore(state => state.streaming);
  const recordingStatus = useSystemStore(state => state.recording);
  const monitoringData = useSystemStore(state => state.monitoring);
  const connectionState = useSystemStore(state => state.connection);

  // 스트리밍 상태 자동 감지 (Phase 2)
  const [autoStreamingStatus, setAutoStreamingStatus] = useState<any>(null);

  // 모니터링 데이터 변경 감지
  useEffect(() => {
    console.log('[EngineModule] Monitoring data updated:', monitoringData);
  }, [monitoringData]);

  // 자동 스트리밍 상태 주기적 업데이트
  useEffect(() => {
    if (!isInitialized || !connectionState.api) return;

    const fetchAutoStreamingStatus = async () => {
      try {
        const status = await engineApi.getAutoStreamingStatus();
        setAutoStreamingStatus(status);
      } catch (error) {
        console.error('[EngineModule] Failed to fetch auto streaming status:', error);
      }
    };

    // 초기 로드
    fetchAutoStreamingStatus();

    // 5초마다 업데이트
    const interval = setInterval(fetchAutoStreamingStatus, 5000);
    return () => clearInterval(interval);
  }, [isInitialized, connectionState.api]);

  const getSystemStatusInfo = () => {
    if (isInitializing) {
      return {
        title: 'System Initializing',
        status: 'loading',
        description: 'Connecting to Python server and setting up communication channels'
      };
    }
    
    if (isInitialized && connectionState.api && connectionState.websocket) {
      return {
        title: 'System Running',
        status: 'connected',
        description: 'All systems operational - monitoring active'
      };
    }
    
    if (initializationError) {
      return {
        title: 'System Error',
        status: 'error',
        description: `Error: ${initializationError}`
      };
    }
    
    return {
      title: 'System Offline',
      status: 'disconnected',
      description: 'Python server not detected - click Initialize to start'
    };
  };

  // Overall Status 계산 (WebSocket + API + Streaming 상태 고려)
  const getOverallConnectionStatus = () => {
    const hasWebSocket = connectionState.websocket;
    const hasApi = connectionState.api;
    const hasStreaming = autoStreamingStatus?.is_streaming || streamingStatus.isStreaming;
    
    if (hasWebSocket && hasApi && hasStreaming) {
      return {
        status: 'healthy',
        label: 'All Systems Operational',
        color: 'green'
      };
    } else if (hasWebSocket && hasApi) {
      return {
        status: 'ready',
        label: 'Ready - Awaiting Stream',
        color: 'blue'
      };
    } else if (hasWebSocket || hasApi) {
      return {
        status: 'degraded',
        label: 'Degraded',
        color: 'yellow'
      };
    } else {
      return {
        status: 'offline',
        label: 'Offline',
        color: 'red'
      };
    }
  };

  const systemStatus = getSystemStatusInfo();
  const overallStatus = getOverallConnectionStatus();

  return (
    <div className="h-full overflow-auto">
      <Card className="bg-card flex flex-col m-6">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Settings className="w-5 h-5" />
            Engine Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Status */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-foreground">System Status</h3>
              <div className="flex gap-2">
                {!isInitialized && !isInitializing && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={initialize}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Power className="w-4 h-4 mr-1" />
                    Initialize
                  </Button>
                )}
                
                {isInitialized && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={restart}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Restart
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={shutdown}
                      className="bg-red-800 hover:bg-red-900 border-red-700"
                    >
                      <PowerOff className="w-4 h-4 mr-1" />
                      Shutdown
                    </Button>
                  </>
                )}
                
                {initializationError && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearError}
                  >
                    Clear Error
                  </Button>
                )}
              </div>
            </div>
            
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  {systemStatus.status === 'loading' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      <Badge variant="secondary">Initializing</Badge>
                    </>
                  )}
                  {systemStatus.status === 'connected' && (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        Running
                      </Badge>
                    </>
                  )}
                  {systemStatus.status === 'error' && (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <Badge variant="destructive">Error</Badge>
                    </>
                  )}
                  {systemStatus.status === 'disconnected' && (
                    <>
                      <PowerOff className="w-4 h-4 text-gray-500" />
                      <Badge variant="secondary">Offline</Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Description</span>
                <span className="text-sm font-medium text-right max-w-xs">{systemStatus.description}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Connection Status */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Connection Status</h3>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">WebSocket</span>
                <div className="flex items-center gap-2">
                  {connectionState.websocket ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-500" />
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        Connected
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4 text-red-500" />
                      <Badge variant="destructive">Disconnected</Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">API Server</span>
                <div className="flex items-center gap-2">
                  {connectionState.api ? (
                    <>
                      <Server className="w-4 h-4 text-green-500" />
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        Connected
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Server className="w-4 h-4 text-red-500" />
                      <Badge variant="destructive">Disconnected</Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Streaming Status</span>
                <div className="flex items-center gap-2">
                  {(autoStreamingStatus?.is_streaming || streamingStatus.isStreaming) ? (
                    <>
                      <Activity className="w-4 h-4 text-green-500" />
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        Active
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 text-gray-500" />
                      <Badge variant="secondary">Inactive</Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Overall Status</span>
                <div className="flex items-center gap-2">
                  {overallStatus.status === 'healthy' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        {overallStatus.label}
                      </Badge>
                    </>
                  ) : overallStatus.status === 'ready' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        {overallStatus.label}
                      </Badge>
                    </>
                  ) : overallStatus.status === 'degraded' ? (
                    <>
                      <Activity className="w-4 h-4 text-yellow-500" />
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                        {overallStatus.label}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <Badge variant="destructive">{overallStatus.label}</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Device Status */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Device Status</h3>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Connected</span>
                <span className="text-sm font-medium">{deviceState.current?.isConnected ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Device Name</span>
                <span className="text-sm font-medium">{deviceState.current?.name || 'None'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Scanning</span>
                <span className="text-sm font-medium">{deviceState.isScanning ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Discovered Devices</span>
                <span className="text-sm font-medium">{deviceState.discovered.length}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Streaming Status */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Streaming Status</h3>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Streaming Active</span>
                <div className="flex items-center gap-2">
                  {streamingStatus.isStreaming ? (
                    <>
                      <Activity className="w-4 h-4 text-green-500" />
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        Active
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 text-gray-500" />
                      <Badge variant="secondary">Inactive</Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">EEG Packets</span>
                <span className="text-sm font-medium">{streamingStatus.dataCount.eeg}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">PPG Packets</span>
                <span className="text-sm font-medium">{streamingStatus.dataCount.ppg}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ACC Packets</span>
                <span className="text-sm font-medium">{streamingStatus.dataCount.acc}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Battery Packets</span>
                <span className="text-sm font-medium">{streamingStatus.dataCount.battery}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Recording Status */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Recording Status</h3>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recording Active</span>
                <div className="flex items-center gap-2">
                  {recordingStatus.isRecording ? (
                    <>
                      <Database className="w-4 h-4 text-red-500" />
                      <Badge variant="destructive">Recording</Badge>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 text-gray-500" />
                      <Badge variant="secondary">Inactive</Badge>
                    </>
                  )}
                </div>
              </div>
              {recordingStatus.sessionId && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Session ID</span>
                  <span className="text-sm font-mono">{recordingStatus.sessionId}</span>
                </div>
              )}
              {recordingStatus.duration > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm font-medium">{Math.floor(recordingStatus.duration / 1000)}s</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* System Monitoring */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">System Monitoring</h3>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Health Score</span>
                <div className="flex items-center gap-2">
                  <Progress value={monitoringData.systemHealth} className="w-16" />
                  <span className="text-sm font-medium">{Math.round(monitoringData.systemHealth)}/100</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">CPU Usage</span>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{monitoringData.performance.cpuUsage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Memory Usage</span>
                <div className="flex items-center gap-2">
                  <MemoryStick className={`w-4 h-4 ${monitoringData.performance.memoryUsage <= 300 ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-sm font-medium">{monitoringData.performance.memoryUsage.toFixed(1)}MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* 알림 표시 */}
          {monitoringData.alerts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-foreground text-yellow-600">
                  Active Alerts ({monitoringData.alerts.length})
                </h3>
                <div className="space-y-2">
                  {monitoringData.alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={alert.level === 'critical' || alert.level === 'error' ? 'destructive' : 
                                   alert.level === 'warning' ? 'secondary' : 'default'}
                        >
                          {alert.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm">{alert.message}</span>
                      </div>
                    </div>
                  ))}
                  {monitoringData.alerts.length > 3 && (
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">
                        +{monitoringData.alerts.length - 3} more alerts
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 시스템이 오프라인일 때 도움말 */}
          {!isInitialized && !isInitializing && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-foreground text-gray-500">Getting Started</h3>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>1. Make sure Python server is running: <code className="bg-background px-1 rounded">cd python_core && python run_server.py</code></div>
                    <div>2. Click "Initialize" to connect to the server</div>
                    <div>3. Use Link Band module to connect your device</div>
                    <div>4. Start streaming data and monitoring</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 에러 표시 */}
          {initializationError && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{initializationError}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EngineModule; 