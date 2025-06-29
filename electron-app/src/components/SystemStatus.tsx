import React from 'react';
import { useSystemStatus, useSystemActions } from '../hooks/useSystemManager';
import { useSystemStore } from '../stores/core/SystemStore';

interface SystemStatusProps {
  showDebugInfo?: boolean;
  showControls?: boolean;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  showDebugInfo = false,
  showControls = true
}) => {
  const {
    isInitialized,
    isInitializing,
    initializationError,
    connectionStatus
  } = useSystemStatus();

  const { initialize, shutdown, restart, clearError } = useSystemActions();
  
  const deviceState = useSystemStore(state => state.device);
  const streamingStatus = useSystemStore(state => state.streaming);
  const recordingStatus = useSystemStore(state => state.recording);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'degraded': return '#f59e0b';
      case 'offline': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      margin: '10px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>System Status</h3>
      
      {/* 시스템 상태 */}
      <div style={{ marginBottom: '15px', lineHeight: '1.6' }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontWeight: '500' }}>System:</span>
          {isInitializing && <span style={{ color: '#f59e0b' }}>🔄 Initializing...</span>}
          {!isInitializing && (
            <span style={{ color: isInitialized ? '#10b981' : '#ef4444' }}>
              {isInitialized ? '✅ Ready' : '❌ Not initialized'}
            </span>
          )}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontWeight: '500' }}>Connection:</span>
          <span style={{ color: getStatusColor(connectionStatus.overall) }}>
            {connectionStatus.overall.toUpperCase()}
          </span>
          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
            (WS: {connectionStatus.websocket ? '✅' : '❌'}, API: {connectionStatus.api ? '✅' : '❌'})
          </span>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontWeight: '500' }}>Device:</span>
          <span style={{ color: deviceState.current ? '#10b981' : '#ef4444' }}>
            {deviceState.current ? `✅ ${deviceState.current.name}` : '❌ Not connected'}
          </span>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontWeight: '500' }}>Streaming:</span>
          <span style={{ color: streamingStatus.isStreaming ? '#10b981' : '#6b7280' }}>
            {streamingStatus.isStreaming ? '🔴 Active' : '⭕ Inactive'}
          </span>
          {streamingStatus.lastDataReceived > 0 && (
            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
              Last: {formatTimestamp(streamingStatus.lastDataReceived)}
            </span>
          )}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontWeight: '500' }}>Recording:</span>
          <span style={{ color: recordingStatus.isRecording ? '#ef4444' : '#6b7280' }}>
            {recordingStatus.isRecording ? '🔴 Recording' : '⭕ Not recording'}
          </span>
        </div>
      </div>

      {/* 제어 버튼들 */}
      {showControls && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => initialize()}
            disabled={isInitialized || isInitializing}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: isInitialized || isInitializing ? '#f3f4f6' : '#3b82f6',
              color: isInitialized || isInitializing ? '#9ca3af' : 'white',
              cursor: isInitialized || isInitializing ? 'not-allowed' : 'pointer'
            }}
          >
            Initialize
          </button>

          <button
            onClick={() => restart()}
            disabled={!isInitialized || isInitializing}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: !isInitialized || isInitializing ? '#f3f4f6' : '#f59e0b',
              color: !isInitialized || isInitializing ? '#9ca3af' : 'white',
              cursor: !isInitialized || isInitializing ? 'not-allowed' : 'pointer'
            }}
          >
            Restart
          </button>

          <button
            onClick={() => shutdown()}
            disabled={!isInitialized || isInitializing}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: !isInitialized || isInitializing ? '#f3f4f6' : '#ef4444',
              color: !isInitialized || isInitializing ? '#9ca3af' : 'white',
              cursor: !isInitialized || isInitializing ? 'not-allowed' : 'pointer'
            }}
          >
            Shutdown
          </button>

          {initializationError && (
            <button
              onClick={clearError}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#10b981',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Clear Error
            </button>
          )}
        </div>
      )}

      {/* 디버그 정보 */}
      {showDebugInfo && isInitialized && (
        <details style={{ marginTop: '16px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: '500' }}>Debug Info</summary>
          <pre style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#1f2937',
            color: '#f9fafb',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto'
          }}>
            {JSON.stringify({
              connection: connectionStatus,
              device: deviceState,
              streaming: streamingStatus,
              recording: recordingStatus
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}; 