import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { CommunicationManager } from '../services/communication/CommunicationManager';
import type { ConnectionStatus } from '../services/communication/CommunicationManager';

const ConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    websocket: false,
    api: false,
    overall: 'offline',
    lastCheck: 0
  });
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);

  const commManager = CommunicationManager.getInstance();

  const addTestResult = (message: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 9)]);
  };

  const updateStatus = () => {
    const status = commManager.getConnectionStatus();
    setConnectionStatus(status);
    
    const debug = commManager.getDebugInfo();
    setDebugInfo(debug);
    
    addTestResult(`Status check - WS: ${status.websocket}, API: ${status.api}, Overall: ${status.overall}`);
  };

  const testWebSocketDirect = async () => {
    addTestResult('Testing direct WebSocket connection...');
    
    try {
      const ws = new WebSocket('ws://127.0.0.1:18765');
      
      ws.onopen = () => {
        addTestResult('✅ Direct WebSocket connection successful');
        ws.close();
      };
      
      ws.onerror = (error) => {
        addTestResult('❌ Direct WebSocket connection failed');
        console.error('Direct WS error:', error);
      };
      
      ws.onclose = (event) => {
        addTestResult(`WebSocket closed: ${event.code} ${event.reason}`);
      };
      
    } catch (error) {
      addTestResult(`❌ WebSocket test error: ${error}`);
    }
  };

  const testAPIConnection = async () => {
    addTestResult('Testing API connection...');
    
    try {
      const response = await fetch('http://127.0.0.1:8121/metrics/');
      if (response.ok) {
        const data = await response.json();
        addTestResult('✅ API connection successful');
        addTestResult(`API data: ${JSON.stringify(data).slice(0, 100)}...`);
      } else {
        addTestResult(`❌ API response error: ${response.status}`);
      }
    } catch (error) {
      addTestResult(`❌ API connection error: ${error}`);
    }
  };

  const initializeSystem = async () => {
    setIsInitializing(true);
    addTestResult('Initializing communication system...');
    
    try {
      await commManager.initialize();
      addTestResult('✅ System initialization successful');
      updateStatus();
    } catch (error) {
      addTestResult(`❌ System initialization failed: ${error}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const shutdownSystem = async () => {
    addTestResult('Shutting down communication system...');
    
    try {
      await commManager.shutdown();
      addTestResult('✅ System shutdown successful');
      updateStatus();
    } catch (error) {
      addTestResult(`❌ System shutdown failed: ${error}`);
    }
  };

  const reconnectSystem = async () => {
    addTestResult('Attempting manual reconnection...');
    
    try {
      await commManager.reconnect();
      addTestResult('✅ Manual reconnection successful');
      updateStatus();
    } catch (error) {
      addTestResult(`❌ Manual reconnection failed: ${error}`);
    }
  };

  useEffect(() => {
    // 초기 상태 확인
    updateStatus();
    
    // 주기적 상태 업데이트
    const interval = setInterval(updateStatus, 5000);
    
    // 연결 상태 변경 리스너 등록
    const unsubscribe = commManager.onStatusChange((status) => {
      setConnectionStatus(status);
      addTestResult(`Status changed - WS: ${status.websocket}, API: ${status.api}`);
    });
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return (
    <Card sx={{ background: 'rgba(40,44,52,0.95)', borderRadius: 4, boxShadow: 6, m: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
          🔧 Connection Debug Tool
        </Typography>
        
        {/* 현재 연결 상태 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#ccc' }}>Current Status</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`WebSocket: ${connectionStatus.websocket ? 'Connected' : 'Disconnected'}`}
              color={connectionStatus.websocket ? 'success' : 'error'}
              size="small"
            />
            <Chip
              label={`API: ${connectionStatus.api ? 'Connected' : 'Disconnected'}`}
              color={connectionStatus.api ? 'success' : 'error'}
              size="small"
            />
            <Chip
              label={`Overall: ${connectionStatus.overall}`}
              color={connectionStatus.overall === 'healthy' ? 'success' : 
                     connectionStatus.overall === 'degraded' ? 'warning' : 'error'}
              size="small"
            />
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 테스트 버튼들 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#ccc' }}>Actions</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={initializeSystem}
              disabled={isInitializing}
            >
              {isInitializing ? 'Initializing...' : 'Initialize'}
            </Button>
            <Button
              variant="contained"
              color="warning"
              size="small"
              onClick={reconnectSystem}
            >
              Reconnect
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={shutdownSystem}
            >
              Shutdown
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={testWebSocketDirect}
            >
              Test WebSocket
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={testAPIConnection}
            >
              Test API
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={updateStatus}
            >
              Refresh Status
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 디버그 정보 */}
        {debugInfo && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#ccc' }}>Debug Info</Typography>
            <Box sx={{ 
              backgroundColor: 'rgba(0,0,0,0.3)', 
              p: 1, 
              borderRadius: 1,
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#ccc'
            }}>
              <div>Initialized: {debugInfo.isInitialized ? 'Yes' : 'No'}</div>
              <div>WebSocket URL: {debugInfo.config?.websocketUrl}</div>
              <div>API URL: {debugInfo.config?.apiBaseUrl}</div>
              {debugInfo.websocketDebug && (
                <>
                  <div>WS Ready State: {debugInfo.websocketDebug.readyState}</div>
                  <div>WS URL: {debugInfo.websocketDebug.url}</div>
                  <div>Reconnect Attempts: {debugInfo.websocketDebug.reconnectAttempts}</div>
                  <div>Last Error: {debugInfo.websocketDebug.lastError || 'None'}</div>
                  <div>Subscriptions: {debugInfo.websocketDebug.subscriptionCount}</div>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* 테스트 결과 로그 */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#ccc' }}>Test Log</Typography>
          <Box sx={{ 
            backgroundColor: 'rgba(0,0,0,0.3)', 
            p: 1, 
            borderRadius: 1,
            maxHeight: '200px',
            overflowY: 'auto',
            fontSize: '11px',
            fontFamily: 'monospace'
          }}>
            {testResults.length === 0 ? (
              <div style={{ color: '#666' }}>No test results yet...</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} style={{ 
                  color: result.includes('✅') ? '#4ade80' : 
                         result.includes('❌') ? '#f87171' : '#ccc',
                  marginBottom: '2px'
                }}>
                  {result}
                </div>
              ))
            )}
          </Box>
        </Box>

        {/* 도움말 */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            이 도구를 사용하여 연결 문제를 진단하세요:
            <br />• "Initialize"로 시스템 초기화
            <br />• "Test WebSocket/API"로 개별 연결 테스트
            <br />• 로그에서 상세한 에러 정보 확인
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ConnectionTest; 