import './App.css';
import { useEffect } from "react";
import { useDeviceStore } from "./stores/device";
import { useEngineStore } from "./stores/engine";
import { useUIStore } from "./stores/uiStore";
import { useSystemManager } from "./hooks/useSystemManager";
import { Sidebar } from './components/Sidebar';
import { TopNavigation } from './components/TopNavigation';

import { StatusBar } from './components/StatusBar';
import LinkBandModule from './components/LinkBandModule';
import { ProcessedDataVisualizer } from './components/ProcessedDataVisualizer';
import DataCenter from './components/DataCenter';
import EngineModule from './components/EngineModule';
import Documents from './components/Documents';
import { SystemStatus } from './components/SystemStatus';
import ConnectionTest from './components/ConnectionTest';

function App() {
  const { 
    deviceStatus, 
    startPolling: startDevicePolling,
    stopPolling: stopDevicePolling
  } = useDeviceStore();
  
  const { 
    // connectionInfo, 
    engineStatus,
    initEngine,
    startPolling: startEnginePolling,
    stopPolling: stopEnginePolling,
    isWebSocketConnected,
    // startWebSocketManager, // Temporarily disabled
    // samplingRates
  } = useEngineStore();

  const { activeMenu } = useUIStore();
  
  // 새로운 시스템 매니저 사용 (자동 초기화 활성화)
  useSystemManager({
    autoInitialize: true,
    autoReconnect: true,
    enableLogging: true
  });

  const isConnected = deviceStatus?.is_connected || false;
  const batteryLevel = deviceStatus?.battery_level || 0;

  useEffect(() => {
    // Initialize engine and start polling on component mount
    // WebSocket 연결은 useSystemManager에서 관리하므로 여기서는 폴링만 시작
    initEngine();
    startDevicePolling();
    startEnginePolling();
     
    return () => {
      stopDevicePolling();
      stopEnginePolling();
    };
  }, []);

  // Effect to start WebSocket connection only when Python server is running
  /*
  useEffect(() => {
    if (pythonServerStatus.status === 'running') {
      console.log('Python server is running, attempting to start WebSocket manager.');
      startWebSocketManager();
    }
  }, [pythonServerStatus.status, startWebSocketManager]);
  */

  const renderMainContent = () => {
    switch (activeMenu) {
      case 'engine':
        return <EngineModule />;
      case 'linkband':
        return <LinkBandModule />;
      case 'visualizer':
        return <ProcessedDataVisualizer />;
      case 'datacenter':
        return <DataCenter />;
      case 'cloudmanager':
        return <Documents />;
      default:
        return (
          <div className="h-full p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold text-foreground mb-6">
                {activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1)}
              </h2>
              
              {/* 새로운 시스템 상태 컴포넌트 테스트 */}
              <div className="mb-6">
                <SystemStatus showDebugInfo={true} showControls={true} />
              </div>
              
              {/* CommunicationManager 연결 테스트 */}
              <div className="mb-6">
                <ConnectionTest />
              </div>
              
              <div className="text-center">
                <p className="text-muted-foreground">This module is coming soon.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  위의 System Status와 Connection Test는 새로운 아키텍처 테스트용입니다.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dark h-screen w-screen flex bg-background text-foreground overflow-hidden">
      {/* Sidebar - 고정 */}
      <div className="flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Top Navigation - 고정 */}
        <div className="flex-shrink-0 border-b border-border">
          <TopNavigation
            menuName={activeMenu}
          />
        </div>
        
        {/* Main Dashboard - 스크롤 가능한 영역 */}
        <main className="flex-1 overflow-auto min-h-0">
          {renderMainContent()}
        </main>
        
        {/* Bottom Status Bar - 고정 */}
        <div className="flex-shrink-0 border-t border-border">
          <StatusBar 
            isConnected={isConnected} 
            isWebSocketConnected={isWebSocketConnected}
            engineStatus={engineStatus}
            batteryLevel={batteryLevel}
          />
        </div>
      </div>
    </div>
  );
}

export default App; 
