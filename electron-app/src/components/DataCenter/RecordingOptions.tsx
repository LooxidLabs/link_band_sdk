import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Settings, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { useDataCenterStore } from '../../stores/dataCenter';

export interface RecordingOptionsData {
  sessionName: string;
  dataFormat: 'JSON' | 'CSV';
  exportPath: string;
}

interface RecordingOptionsProps {
  options: RecordingOptionsData;
  onOptionsChange: (options: RecordingOptionsData) => void;
  pathValidation: {
    isValid: boolean;
    error: string;
  };
  onPathValidation: (path: string) => void;
}

export const RecordingOptions: React.FC<RecordingOptionsProps> = ({
  options,
  onOptionsChange,
  pathValidation,
  onPathValidation
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { getDefaultExportPath } = useDataCenterStore();

  // 컴포넌트 마운트 시 기본 export 경로가 설정되지 않았다면 설정
  useEffect(() => {
    const initializeDefaultPath = async () => {
      // 현재 exportPath가 기본값인 경우에만 새로운 기본 경로로 업데이트
      if (options.exportPath === '~/link-band-sdk/data' || !options.exportPath) {
        try {
          const defaultPath = await getDefaultExportPath();
          onOptionsChange({
            ...options,
            exportPath: defaultPath
          });
          onPathValidation(defaultPath);
        } catch (error) {
          console.error('Failed to get default export path:', error);
        }
      }
    };

    initializeDefaultPath();
  }, []); // 빈 의존성 배열로 마운트 시에만 실행

  // 기본값 생성 함수
  const getDefaultSessionName = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `session_${year}_${month}_${day}`;
  };

  const getDefaultOptions = async (): Promise<RecordingOptionsData> => {
    const defaultPath = await getDefaultExportPath();
    return {
      sessionName: getDefaultSessionName(),
      dataFormat: 'JSON',
      exportPath: defaultPath  // 동적으로 기본 export 경로 설정
    };
  };

  // 설정 초기화
  const handleReset = async () => {
    const defaultOptions = await getDefaultOptions();
    onOptionsChange(defaultOptions);
    onPathValidation(defaultOptions.exportPath);
  };

  // 개별 옵션 변경 핸들러
  const handleSessionNameChange = (value: string) => {
    onOptionsChange({
      ...options,
      sessionName: value
    });
  };

  const handleDataFormatChange = (value: string) => {
    onOptionsChange({
      ...options,
      dataFormat: value as 'JSON' | 'CSV'
    });
  };

  const handleExportPathChange = (value: string) => {
    onOptionsChange({
      ...options,
      exportPath: value
    });
    // 경로가 변경될 때마다 검증
    onPathValidation(value);
  };

  return (
    <Card className="bg-card mb-4" style={{ backgroundColor: '#161822' }}>
      <CardHeader className="pb-3 pt-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center text-sm font-semibold text-foreground">
            <Settings className="w-4 h-4 text-foreground mr-2" />
            Recording Options
          </h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-700"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4">
            {/* Session Name */}
            <div className="space-y-2">
              <Label htmlFor="sessionName" className="text-xs text-gray-300">
                Session Name
              </Label>
              <Input
                id="sessionName"
                value={options.sessionName}
                onChange={(e) => handleSessionNameChange(e.target.value)}
                placeholder={getDefaultSessionName()}
                className="h-8 text-xs bg-gray-800 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-500">
                Used as prefix for folders and filenames (e.g., {options.sessionName}_20250625_021254)
              </p>
            </div>

            {/* Data Format */}
            <div className="space-y-2">
              <Label htmlFor="dataFormat" className="text-xs text-gray-300">
                Data Format
              </Label>
              <Select value={options.dataFormat} onValueChange={handleDataFormatChange}>
                <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="JSON" className="text-white hover:bg-gray-700">
                    JSON (Default)
                  </SelectItem>
                  <SelectItem value="CSV" className="text-white hover:bg-gray-700">
                    CSV
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Select data file format for export
              </p>
            </div>

            {/* Export Path */}
            <div className="space-y-2">
              <Label htmlFor="exportPath" className="text-xs text-gray-300">
                Export Path
              </Label>
              <div className="relative">
                <Input
                  id="exportPath"
                  value={options.exportPath}
                  onChange={(e) => handleExportPathChange(e.target.value)}
                  placeholder="Enter export path (e.g., ./data, /Users/username/Documents)"
                  className={`h-8 text-xs bg-gray-800 border-gray-600 text-white pr-8 ${
                    pathValidation.isValid ? 'border-green-600' : 
                    pathValidation.error ? 'border-red-600' : 'border-gray-600'
                  }`}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  {pathValidation.isValid ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : pathValidation.error ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : null}
                </div>
              </div>
              
              {/* 검증 메시지 */}
              {pathValidation.error && (
                <div className="flex items-start gap-2 p-2 bg-red-900/20 border border-red-800 rounded-md">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">{pathValidation.error}</p>
                </div>
              )}
              
              {pathValidation.isValid && (
                <div className="flex items-start gap-2 p-2 bg-green-900/20 border border-green-800 rounded-md">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-400">Folder path is valid.</p>
                </div>
              )}
              
              <p className="text-xs text-gray-500">
                Enter the path where exported files will be saved. Both relative paths (./data) and absolute paths (/Users/username/Documents) are supported. Non-existent paths will be created automatically.
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}; 