import './App.css';
import { useEffect } from "react";
import { useDeviceStore } from "./stores/device";
import { useEngineStore } from "./stores/engine";
import { useUIStore } from "./stores/uiStore";
import { setupPythonServerEventListeners } from "./stores/pythonServerStore";
import { Sidebar } from './components/Sidebar';
import { TopNavigation } from './components/TopNavigation';

import { StatusBar } from './components/StatusBar';
import LinkBandModule from './components/LinkBandModule';
import { ProcessedDataVisualizer } from './components/ProcessedDataVisualizer';
import DataCenter from './components/DataCenter';
import EngineModule from './components/EngineModule';
import Documents from './components/Documents';

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
    autoConnectWebSocket,
    // samplingRates
  } = useEngineStore();

  const { activeMenu } = useUIStore();

  const isConnected = deviceStatus?.status === 'connected';
  const batteryLevel = deviceStatus?.bat_level || 0;

  useEffect(() => {
    // Initialize engine and start polling on component mount
    initEngine();
    startDevicePolling();
    startEnginePolling();
    autoConnectWebSocket();
    
    // Setup Python server event listeners
    setupPythonServerEventListeners();
     
    return () => {
      stopDevicePolling();
      stopEnginePolling();
    };
  }, []);

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
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                {activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1)}
              </h2>
              <p className="text-muted-foreground">This module is coming soon.</p>
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
