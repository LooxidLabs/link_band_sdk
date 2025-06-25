import React from 'react';
import { usePythonServerStore } from '../stores/pythonServerStore';
import { useDeviceStore } from '../stores/device';
import { useSensorStore } from '../stores/sensor';
import { useUIStore } from '../stores/uiStore';
import { useLanguageStore } from '../stores/languageStore';
import { useTranslation } from '../locales';
import { Badge } from './ui/badge';
import { ChevronRight, Cpu, Brain, Nfc } from 'lucide-react';
import { useEffect } from 'react';
import { setupPythonServerEventListeners } from '../stores/pythonServerStore';

interface TopNavigationProps {
  menuName: string;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ menuName }) => {
  
  // Get server status from Python server store - use simple isRunning flag
  const { isRunning: engineRunning, refreshStatus } = usePythonServerStore();
  
  // Get device connection status
  const deviceStatus = useDeviceStore((state) => state.deviceStatus);
  const isDeviceConnected = deviceStatus?.is_connected || false;
  
  // Get sensor leadoff status - only valid when device is connected
  const eegData = useSensorStore((state) => state.eeg);
  const sensorContacted = isDeviceConnected && eegData ? (!eegData.ch1_leadoff && !eegData.ch2_leadoff) : false;
  
  // Get active menu for navigation breadcrumb
  const activeMenu = useUIStore((state) => state.activeMenu);
  
  // Get language and translation
  const { currentLanguage } = useLanguageStore();
  const t = useTranslation(currentLanguage);
  
  // Setup event listeners and refresh status on mount
  useEffect(() => {
    const cleanup = setupPythonServerEventListeners();
    return cleanup;
  }, []);
  
  // Refresh status on mount and periodically
  useEffect(() => {
    refreshStatus();
    const timer = setTimeout(() => {
      refreshStatus();
    }, 1000);
    return () => clearTimeout(timer);
  }, [refreshStatus]);
  
  // Convert menu id to display name
  const getMenuDisplayName = (menuId: string) => {
    const menuNames: Record<string, string> = {
      'engine': t.nav.engine.toUpperCase(),
      'linkband': t.nav.linkband.toUpperCase(),
      'visualizer': t.nav.visualizer.toUpperCase(),
      'datacenter': t.nav.datacenter.toUpperCase(),
      'cloudmanager': t.nav.documents.toUpperCase(),
      'settings': t.nav.settings.toUpperCase()
    };
    return menuNames[menuId] || menuId.toUpperCase();
  };
  
  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-foreground">LINK BAND SDK</h2>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
            <span className="text-xl font-semibold text-muted-foreground">
              {getMenuDisplayName(menuName || activeMenu)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Engine Status */}
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Engine:</span>
            <Badge 
              variant={engineRunning ? "default" : "destructive"}
              className={engineRunning ? "bg-cyan-600 hover:bg-cyan-700" : "bg-red-600 hover:bg-red-700"}
            >
              {engineRunning ? "Started" : "Stopped"}
            </Badge>
          </div>

          {/* Device Connection Status */}
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">LINK BAND:</span>
            <Badge 
              variant={isDeviceConnected ? "default" : "destructive"}
              className={isDeviceConnected ? "bg-cyan-600 hover:bg-cyan-700" : "bg-red-600 hover:bg-red-700"}
            >
              {isDeviceConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          {/* Sensor Contact Status */}
          <div className="flex items-center space-x-2">
            <Nfc className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Sensor Contact:</span>
            <Badge 
              variant={!isDeviceConnected ? "outline" : (sensorContacted ? "default" : "destructive")}
              className={
                !isDeviceConnected 
                  ? "bg-gray-600 hover:bg-gray-700" 
                  : (sensorContacted ? "bg-cyan-600 hover:bg-cyan-700" : "bg-red-600 hover:bg-red-700")
              }
            >
              {!isDeviceConnected ? "-" : (sensorContacted ? "Contacted" : "Not Contacted")}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
} 