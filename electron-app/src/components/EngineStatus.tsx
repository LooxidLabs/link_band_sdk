import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Brain, Activity, Zap, Battery } from 'lucide-react';

interface EngineStatusProps {
  isStreaming: boolean;
  samplingRates: {
    eeg: number;
    ppg: number;
    acc: number;
    bat: number;
  };
  batteryLevel: number;
}

export function EngineStatus({ isStreaming, samplingRates, batteryLevel }: EngineStatusProps) {
  // Data for display
  const eegData = { value: samplingRates.eeg, unit: 'Hz', status: isStreaming ? 'active' : 'inactive' };
  const ppgData = { value: samplingRates.ppg, unit: 'Hz', status: isStreaming ? 'active' : 'inactive' };
  const accelData = { value: samplingRates.acc, unit: 'Hz', status: isStreaming ? 'active' : 'inactive' };
  const batteryData = { value: batteryLevel, unit: '%', status: batteryLevel > 20 ? 'good' : 'low' };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      error: 'destructive',
      good: 'default',
      low: 'destructive'
    } as const;
    
    return variants[status as keyof typeof variants] || 'secondary';
  };

  return (
    <Card className="h-fit border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-chart-1" />
          Engine Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Device Connection Status */}
        <div>
          <h4 className="font-medium mb-3">Device Connection Status</h4>
          <Badge 
            variant={isStreaming ? "default" : "secondary"}
            className={isStreaming ? 'subtle-pulse' : ''}
          >
            {isStreaming ? 'Connected & Streaming' : 'Connected'}
          </Badge>
        </div>

        <Separator />

        {/* Streaming Service Status */}
        <div>
          <h4 className="font-medium mb-3">Streaming Service Status</h4>
          <Badge variant={isStreaming ? "default" : "secondary"}>
            {isStreaming ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <Separator />

        {/* Data Processing Status */}
        <div>
          <h4 className="font-medium mb-4">Data Processing Status</h4>
          <div className="space-y-4">
            {/* EEG */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-1" />
                <span className="text-sm">EEG</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className={`text-sm font-mono transition-colors ${
                    isStreaming ? 'text-chart-1' : 'text-muted-foreground'
                  }`}
                >
                  {eegData.value} {eegData.unit}
                </span>
                <Badge 
                  variant={getStatusBadge(eegData.status)}
                >
                  {eegData.status}
                </Badge>
              </div>
            </div>

            {/* PPG */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-chart-2" />
                <span className="text-sm">PPG</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className={`text-sm font-mono transition-colors ${
                    isStreaming ? 'text-chart-2' : 'text-muted-foreground'
                  }`}
                >
                  {ppgData.value} {ppgData.unit}
                </span>
                <Badge 
                  variant={getStatusBadge(ppgData.status)}
                >
                  {ppgData.status}
                </Badge>
              </div>
            </div>

            {/* Accelerometer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-3" />
                <span className="text-sm">Accelerometer</span>
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className={`text-sm font-mono transition-colors ${
                    isStreaming ? 'text-chart-3' : 'text-muted-foreground'
                  }`}
                >
                  {accelData.value} {accelData.unit}
                </span>
                <Badge 
                  variant={getStatusBadge(accelData.status)}
                >
                  {accelData.status}
                </Badge>
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
                  {batteryData.value}{batteryData.unit}
                </span>
                <Progress value={batteryData.value} className="w-16 h-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Neural activity visualization */}
        {isStreaming && (
          <div className="relative">
            <div className="h-6 bg-muted/30 rounded-md overflow-hidden relative data-flow">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Neural Activity</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 