import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Wifi, Globe, Activity, Battery, Zap } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isWebSocketConnected: boolean;
  onConnectionToggle: () => void;
  samplingRates: {
    eeg: number;
    ppg: number;
    acc: number;
    bat: number;
  };
  batteryLevel: number;
}

export function ConnectionStatus({ 
  isConnected, 
  isWebSocketConnected,
  onConnectionToggle, 
  samplingRates,
  batteryLevel 
}: ConnectionStatusProps) {
  // Mock websocket data
  const websocketData = {
    servers: 3,
    clients: 12,
    status: isWebSocketConnected ? 'connected' : 'disconnected'
  };

  // Streaming data
  const streamingData = {
    eeg: { value: samplingRates.eeg, unit: 'Hz', active: isConnected },
    ppg: { value: samplingRates.ppg, unit: 'Hz', active: isConnected },
    accel: { value: samplingRates.acc, unit: 'Hz', active: isConnected },
    battery: { value: batteryLevel, unit: '%', active: true }
  };

  return (
    <Card className="h-fit border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-chart-1" />
          Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Websocket Status */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Websocket Status</h4>
            <Button 
              variant={isConnected ? "destructive" : "default"}
              size="sm"
              onClick={onConnectionToggle}
              className={`gap-2 ${isConnected ? 'bg-red-800 hover:bg-red-900 border-red-700' : ''}`}
            >
              <Wifi className="h-4 w-4" />
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Websocket Servers</span>
              <span>{websocketData.servers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connected Clients</span>
              <span>{websocketData.clients}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connection Status</span>
              <Badge variant={isWebSocketConnected ? "default" : "destructive"}>
                {websocketData.status}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Data Streaming Status */}
        <div>
          <h4 className="font-medium mb-4">Data Streaming Status</h4>
          <div className="space-y-4">
            {/* EEG */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-1" />
                <span className="text-sm">EEG</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-chart-1">
                  {streamingData.eeg.value} {streamingData.eeg.unit}
                </span>
                <div 
                  className={`w-2 h-2 rounded-full ${
                    streamingData.eeg.active ? 'subtle-pulse' : ''
                  }`} 
                  style={{ 
                    backgroundColor: streamingData.eeg.active 
                      ? 'var(--color-connection-active)' 
                      : 'var(--color-connection-inactive)' 
                  }}
                />
              </div>
            </div>

            {/* PPG */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-chart-2" />
                <span className="text-sm">PPG</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-chart-2">
                  {streamingData.ppg.value} {streamingData.ppg.unit}
                </span>
                <div 
                  className={`w-2 h-2 rounded-full ${
                    streamingData.ppg.active ? 'subtle-pulse' : ''
                  }`} 
                  style={{ 
                    backgroundColor: streamingData.ppg.active 
                      ? 'var(--color-connection-active)' 
                      : 'var(--color-connection-inactive)' 
                  }}
                />
              </div>
            </div>

            {/* Accelerometer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-3" />
                <span className="text-sm">Accelerometer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-chart-3">
                  {streamingData.accel.value} {streamingData.accel.unit}
                </span>
                <div 
                  className={`w-2 h-2 rounded-full ${
                    streamingData.accel.active ? 'subtle-pulse' : ''
                  }`} 
                  style={{ 
                    backgroundColor: streamingData.accel.active 
                      ? 'var(--color-connection-active)' 
                      : 'var(--color-connection-inactive)' 
                  }}
                />
              </div>
            </div>

            {/* Battery */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Battery className="h-4 w-4 text-chart-4" />
                <span className="text-sm">Battery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-chart-4">
                  {streamingData.battery.value}{streamingData.battery.unit}
                </span>
                <Progress value={streamingData.battery.value} className="w-16 h-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status Indicator */}
        {!isConnected && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <Wifi className="h-4 w-4" />
              <span>Disconnected - Network Error</span>
            </div>
          </div>
        )}

        {/* Subtle data flow indicator */}
        {isConnected && (
          <div className="relative h-1 bg-muted/50 rounded-full data-flow">
          </div>
        )}
      </CardContent>
    </Card>
  );
} 