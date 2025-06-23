import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Wifi, WifiOff, Play, Square, MoreHorizontal, Bell, HelpCircle } from 'lucide-react';

interface TopNavigationProps {
  isConnected: boolean;
  isStreaming: boolean;
  onStreamingStart: () => void;
  onStreamingStop: () => void;
}

export function TopNavigation({ 
  isConnected, 
  isStreaming, 
  onStreamingStart, 
  onStreamingStop 
}: TopNavigationProps) {
  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-foreground">Engine Status</h2>
          <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={isStreaming ? "destructive" : "default"}
            size="sm"
            onClick={isStreaming ? onStreamingStop : onStreamingStart}
            disabled={!isConnected}
            className="gap-2"
          >
            {isStreaming ? (
              <>
                <Square className="h-4 w-4" />
                Streaming Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Streaming Start
              </>
            )}
          </Button>

          <Button variant="outline" size="sm">
            Init
          </Button>

          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 