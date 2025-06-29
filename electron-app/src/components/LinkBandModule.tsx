import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Brain, Link, Link2Off, Loader2, RadioIcon as Radio } from 'lucide-react';
import { useDeviceStore } from '../stores/device';

const LinkBandModule: React.FC = () => {
  const { 
    deviceStatus, 
    registeredDevices,
    scannedDevices,
    isLoading,
    errors,
    connectDevice,
    disconnectDevice,
    unregisterDevice,
    scanDevices,
    registerDevice,
    clearScannedDevices,
    startPolling,
    stopPolling
  } = useDeviceStore();

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const handleConnect = async () => {
    if (deviceStatus?.is_connected) {
      await disconnectDevice(deviceStatus.device_address || '');
    } else if (registeredDevices.length > 0) {
      try {
        await connectDevice(registeredDevices[0].address);
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    }
  };

  const handleUnregister = async () => {
    if (deviceStatus) {
      if (deviceStatus.is_connected) {
        await disconnectDevice(deviceStatus.device_address || '');
      }
      await unregisterDevice(deviceStatus.device_address || '');
    }
  };

  const handleScan = async () => {
    await scanDevices();
    setSelectedDevice(null);
  };

  const handleDeviceSelect = (address: string) => {
    setSelectedDevice(address);
  };

  const handleRegister = async () => {
    if (selectedDevice) {
      const device = scannedDevices.find(d => d.address === selectedDevice);
      if (device) {
        // 사용자 확인 요청
        const confirmed = window.confirm(
          `Register this device?\n\nName: ${device.name}\nAddress: ${device.address}\n\nThis device will be saved for quick access.`
        );
        
        if (confirmed) {
          await registerDevice(device.name, device.address);
          setSelectedDevice(null);
          clearScannedDevices();
        }
      }
    }
  };

  return (
    <div className="h-full overflow-auto">
      <Card className="bg-card flex flex-col m-6">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Brain className="w-5 h-5" />
            Link Band Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading.connect ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Registered Device Information */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold text-foreground">Registered Device</h3>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleUnregister}
                    disabled={registeredDevices.length === 0}
                    className="bg-red-800 hover:bg-red-900 border-red-700"

                  >
                    Unregister
                  </Button>
                </div>
                
                {registeredDevices.length > 0 ? (
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Name</span>
                      <span className="text-sm font-medium">{registeredDevices[0].name || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Address</span>
                      <span className="text-sm font-mono">{registeredDevices[0].address || '-'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No registered device
                  </div>
                )}
              </div>

              <Separator />

              {/* Current Device Status */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold text-foreground">Current Status</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleConnect}
                      disabled={registeredDevices.length === 0 || deviceStatus?.is_connected || isLoading.connect}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isLoading.connect ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Connect'
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleConnect}
                      disabled={registeredDevices.length === 0 || !deviceStatus?.is_connected}
                      className="bg-red-800 hover:bg-red-900 border-red-700"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
                
                {deviceStatus ? (
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Serial Number</span>
                      <span className="text-sm font-medium">{deviceStatus.device_name || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">BLE Address</span>
                      <span className="text-sm font-mono">{deviceStatus.device_address || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Connection Status</span>
                      <div className="flex items-center gap-2">
                        {deviceStatus.is_connected ? (
                          <>
                            <Link className="w-4 h-4 text-green-500" />
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              Connected
                            </Badge>
                          </>
                        ) : (
                          <>
                            <Link2Off className="w-4 h-4 text-red-500" />
                            <Badge variant="destructive">
                              Disconnected
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Battery Level</span>
                      <div className="flex items-center gap-2">
                        <Progress value={deviceStatus.battery_level || 0} className="w-16" />
                        <span className="text-sm font-medium">{deviceStatus.battery_level || 0}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No device connected
                  </div>
                )}
              </div>

              <Separator />

              {/* Scan Devices Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold text-foreground">Scan Devices</h3>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleScan}
                    disabled={isLoading.scan || registeredDevices.length > 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading.scan ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Scan'
                    )}
                  </Button>
                </div>
                
                {isLoading.scan ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Scanning for devices...
                  </div>
                ) : scannedDevices.length > 0 ? (
                  <div className="space-y-2">
                    {scannedDevices.map((device) => (
                      <div 
                        key={device.address} 
                        className={`flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer transition-colors ${
                          selectedDevice === device.address 
                            ? 'bg-blue-700 hover:bg-blue-800' 
                            : 'hover:bg-muted/50'
                        } ${registeredDevices.length > 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                        onClick={() => registeredDevices.length === 0 && handleDeviceSelect(device.address)}
                      >
                        <Radio className={`w-4 h-4 ${selectedDevice === device.address ? 'text-white' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${selectedDevice === device.address ? 'text-white' : ''}`}>{device.name}</div>
                          <div className={`text-xs ${selectedDevice === device.address ? 'text-blue-200' : 'text-muted-foreground'}`}>{device.address}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 text-muted-foreground text-sm">
                    No devices found
                  </div>
                )}
                
                {scannedDevices.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="default"
                      onClick={handleRegister}
                      disabled={!selectedDevice || registeredDevices.length > 0}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Register Link Band
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {errors.connect && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{errors.connect}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkBandModule; 