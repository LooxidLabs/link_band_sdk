import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Play, Square, Users, Link, Link2Off, Server, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { useEngineStore } from '../stores/engine';
import { useMetricsStore } from '../stores/metrics';
import { usePythonServerStore, setupPythonServerEventListeners } from '../stores/pythonServerStore';

const EngineModule: React.FC = () => {
  const { 
    error,
    isWebSocketConnected,
    startPolling, 
    stopPolling,
    connectWebSocket,
    disconnectWebSocket
  } = useEngineStore();

  const {
    deviceStatus,
    engineStatus,
    connectionInfo,
    startPolling: startMetricsPolling,
    stopPolling: stopMetricsPolling
  } = useMetricsStore();

  // Python Server Store
  const {
    status: serverStatus,
    logs: serverLogs,
    isLoading: serverLoading,
    lastMessage: serverMessage,
    isRunning: serverRunning,
    isVerifyingMetrics,
    startServer,
    stopServer,
    restartServer,
    clearLogs
  } = usePythonServerStore();

  // Debug logging
  console.log('EngineModule - serverRunning:', serverRunning);
  console.log('EngineModule - serverStatus:', serverStatus);

  // const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' }>({ message: '', type: 'success' });

  useEffect(() => {
    // Setup event listeners for Python server
    setupPythonServerEventListeners();
    
    startPolling();
    startMetricsPolling();
    
    return () => {
      stopPolling();
      stopMetricsPolling();
    };
  }, []);

  useEffect(() => {
    if (error?.connection) {
      // setNotification({ message: error.connection, type: 'error' });
    }
  }, [error?.connection]);

  useEffect(() => {
    if (serverMessage) {
      // setNotification({ message: serverMessage, type: 'info' });
    }
  }, [serverMessage]);

  const handleConnect = () => {
    connectWebSocket();
    // setNotification({ message: 'Connecting to WebSocket...', type: 'info' });
  };

  const handleDisconnect = () => {
    disconnectWebSocket();
    // setNotification({ message: 'Disconnected from WebSocket', type: 'info' });
  };

  const handleServerStart = async () => {
    try {
      // Don't update UI state immediately - let the store handle it
      await startServer();
      // setNotification({ message: 'Python server is starting...', type: 'info' });
    } catch (e) {
      // setNotification({ message: 'Failed to start Python server', type: 'error' });
    }
  };

  const handleServerStop = async () => {
    try {
      // Don't update UI state immediately - let the store handle it
      await stopServer();
    } catch (e) {
      // setNotification({ message: 'Failed to stop Python server', type: 'error' });
    }
  };

  const handleServerRestart = async () => {
    try {
      await restartServer();
    } catch (e) {
      // setNotification({ message: 'Failed to restart Python server', type: 'error' });
    }
  };

  const getStatusBadge = (status: string, isConnected?: boolean, isVerifyingMetrics?: boolean) => {
    if (isConnected === false) {
      return <Badge variant="destructive">Disconnected</Badge>;
    }
    
    switch (status) {
      case 'running':
        return <Badge className="bg-green-600">Started</Badge>;
      case 'starting':
        return (
          <Badge className="bg-yellow-600 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {isVerifyingMetrics ? 'Loading...' : 'Starting'}
          </Badge>
        );
      case 'stopping':
        return <Badge className="bg-orange-600">Stopping</Badge>;
      case 'stopped':
        return <Badge variant="secondary">Stopped</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'connected':
        return <Badge className="bg-green-600">Connected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#0a0a0a] min-h-screen">
      {/* Python Server Control Card */}
      <Card className="bg-[#161822]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Server className="w-5 h-5" />
            Engine Server Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Status:</span>
                {getStatusBadge(serverStatus.status, undefined, isVerifyingMetrics)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Port:</span>
                <span className="text-sm text-white font-mono">{serverStatus.port}</span>
              </div>
              {serverStatus.pid && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">PID:</span>
                  <span className="text-sm text-white font-mono">{serverStatus.pid}</span>
                </div>
              )}
              {serverStatus.uptime && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Uptime:</span>
                  <span className="text-sm text-white">{serverStatus.uptime}s</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-500"
                size="sm"
                onClick={handleServerStart}
                disabled={serverLoading || serverRunning}
              >
                {serverLoading && !serverRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Start
              </Button>
              <Button
                className="!bg-red-600 hover:!bg-red-700 !text-white !border-red-500 disabled:!bg-red-600 disabled:opacity-50"
                size="sm"
                onClick={handleServerStop}
                disabled={serverLoading || !serverRunning}
              >
                {serverLoading && serverRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Stop
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleServerRestart}
                disabled={serverLoading}
              >
                {serverLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Restart
              </Button>
            </div>
          </div>

          {/* Server Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">EngineServer Logs</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLogs}
                disabled={serverLogs.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </Button>
            </div>
            <div className="bg-[#1a1d29] border border-gray-700 rounded-md p-3 h-[250px] overflow-y-auto">
              {serverLogs.length === 0 ? (
                <p className="text-xs text-gray-500">No logs available</p>
              ) : (
                <div className="space-y-1">
                  {serverLogs.slice(-30).map((log, index) => (
                    <p key={index} className="text-xs text-gray-300 font-mono">
                      {log}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* {serverStatus.lastError && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-md">
              <p className="text-sm text-red-400">Error: {serverStatus.lastError}</p>
            </div>
          )} */}
          <Separator />

        </CardContent>
      </Card>

      {/* Connection Status Card */}
      <Card className="bg-[#161822]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Link className="w-5 h-5" />
            Client Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">WebSocket Status:</span>
                {getStatusBadge(isWebSocketConnected ? 'connected' : 'disconnected', isWebSocketConnected)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Connected Clients:</span>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-white">{engineStatus?.clients_connected ?? 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">WebSocket URL:</span>
                <span className="text-xs text-white font-mono">{connectionInfo?.ws_url ?? 'Not available'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                // variant="outline"
                size="sm"
                onClick={handleConnect}
                disabled={isWebSocketConnected}
                className="bg-blue-600 hover:bg-blue-700 border-blue-500 text-white"
              >
                <Link className="w-4 h-4" />
                Connect
              </Button>
              <Button
                // variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={!isWebSocketConnected}
                className="!bg-red-600 hover:!bg-red-700 !border-red-500 !text-white disabled:!bg-red-600 disabled:opacity-50"
              >
                <Link2Off className="w-4 h-4" />
                Disconnect
              </Button>
            </div>
          </div>

          <Separator />
          {/* Data Streaming Status */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Data Processing Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">EEG</span>
                <span className="text-xs text-white">{deviceStatus?.eeg_sampling_rate?.toFixed(1) || '-'} Hz</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">PPG</span>
                <span className="text-xs text-white">{deviceStatus?.ppg_sampling_rate?.toFixed(1) || '-'} Hz</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Accelerometer</span>
                <span className="text-xs text-white">{deviceStatus?.acc_sampling_rate?.toFixed(1) || '-'} Hz</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Battery</span>
                <span className="text-xs text-white">{deviceStatus?.bat_sampling_rate?.toFixed(1) || '-'} Hz</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification */}
      {/* {notification.message && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 max-w-sm z-50">
          <div className={`p-3 rounded-md border shadow-lg ${
            notification.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-400' :
            notification.type === 'error' ? 'bg-red-900/20 border-red-800 text-red-400' :
            'bg-blue-900/20 border-blue-800 text-blue-400'
          }`}>
            <p className="text-sm">{notification.message}</p>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default EngineModule; 