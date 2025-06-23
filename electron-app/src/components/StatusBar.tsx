import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Brain, Cpu, Activity, Zap, Battery, Wifi } from 'lucide-react';

interface StatusBarProps {
  isConnected: boolean;
  isWebSocketConnected: boolean;
  engineStatus: any;
  samplingRates: {
    eeg: number;
    ppg: number;
    acc: number;
    bat: number;
  };
  batteryLevel: number;
}

export function StatusBar({ 
  isConnected, 
  isWebSocketConnected,
  engineStatus,
  samplingRates,
  batteryLevel 
}: StatusBarProps) {
  // System status data
  const systemStats = {
    engine: engineStatus?.status === 'running',
    linkBand: isConnected,
    clients: isWebSocketConnected ? 12 : 0,
    eeg: { value: samplingRates.eeg, unit: 'Hz' },
    ppg: { value: samplingRates.ppg, unit: 'Hz' },
    accel: { value: samplingRates.acc, unit: 'Hz' },
    battery: batteryLevel,
    cpu: 'N/A',
    ram: 'N/A MB',
    disk: 'N/A MB'
  };

  return (
    <footer className="bg-card border-t border-border px-6 py-2">
      <div className="flex items-center justify-between text-xs text-foreground">
        {/* Left side - System status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-1">
            <Brain className="h-3 w-3 text-chart-1" />
            <span className="text-foreground">Engine:</span>
            <Badge variant={systemStats.engine ? "default" : "destructive"} className="text-xs px-1 py-0">
              {systemStats.engine ? 'ON' : 'OFF'}
            </Badge>
          </div>

          <Separator orientation="vertical" className="h-4" />

          <div className="flex items-center gap-1">
            <Cpu className="h-3 w-3 text-chart-2" />
            <span className="text-foreground">Link Band:</span>
            <Badge variant={systemStats.linkBand ? "default" : "destructive"} className="text-xs px-1 py-0">
              {systemStats.linkBand ? 'Connected' : 'Disconnected'}
            </Badge>
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
            <Activity className="h-3 w-3 text-chart-1" />
            <span className="text-foreground">EEG: {systemStats.eeg.value} {systemStats.eeg.unit}</span>
          </div>

          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-chart-2" />
            <span className="text-foreground">PPG: {systemStats.ppg.value} {systemStats.ppg.unit}</span>
          </div>

          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-chart-3" />
            <span className="text-foreground">ACC: {systemStats.accel.value} {systemStats.accel.unit}</span>
          </div>

          <div className="flex items-center gap-1">
            <Battery className="h-3 w-3 text-chart-4" />
            <span className="text-foreground">Battery: {systemStats.battery}%</span>
          </div>
        </div>

        {/* Right side - System resources */}
        <div className="flex items-center space-x-4 text-muted-foreground">
          <span className="text-foreground">CPU: {systemStats.cpu}%</span>
          <span className="text-foreground">RAM: {systemStats.ram}</span>
          <span className="text-foreground">Disk: {systemStats.disk}</span>
          
          {!isConnected && (
            <div className="text-destructive">
              System Error: Network Error Device Error Engine Error Network Error
            </div>
          )}
        </div>
      </div>
    </footer>
  );
} 