import React from 'react';
import { useDeviceStore } from '../stores/device';
import { useSensorStore } from '../stores/sensor';
import { useUIStore } from '../stores/uiStore';
import { useLanguageStore } from '../stores/languageStore';
import { useTranslation } from '../locales';
import { Badge } from './ui/badge';
import { ChevronRight, Cpu, Brain, Nfc } from 'lucide-react';
import { useSystemStatus } from '../hooks/useSystemManager';

interface TopNavigationProps {
  menuName: string;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ menuName }) => {
  
  // Get system status from SystemStore (same as EngineModule)
  const { 
    isInitialized,
    isInitializing
  } = useSystemStatus();
  
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
            {isInitializing ? (
              <Badge className="bg-yellow-600 hover:bg-yellow-700 flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </Badge>
            ) : (
              <Badge 
                variant={isInitialized ? "default" : "destructive"}
                className={isInitialized ? "bg-cyan-600 hover:bg-cyan-700" : "bg-red-600 hover:bg-red-700"}
              >
                {isInitialized ? "Started" : "Stopped"}
              </Badge>
            )}
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