import path from 'path';

if (isDev) {
  // Development mode - use relative paths
  pythonPath = path.join(__dirname, '../../python_core/run_server.py');
  pythonExecutable = path.join(__dirname, '../../venv/bin/python3');
} else {
  // Production mode - use bundled resources and virtual environment
  const resourcesPath = process.resourcesPath;
  pythonPath = path.join(resourcesPath, 'python_core/run_server.py');
        // Use system Python with bundled packages via PYTHONPATH
      pythonExecutable = '/usr/bin/python3';
}

// 빌드된 서버 경로 (python_core/dist에서 찾기)
serverPath = path.join(__dirname, '../../python_core/dist', serverName);

if (isDev) {
  console.log('🧪 DEV MODE: Using built server for testing:', serverPath);
} else {
  // 프로덕션 모드에서 빌드된 서버 사용
  const resourcesPath = process.resourcesPath;
  serverPath = path.join(resourcesPath, serverName);
  console.log('🚀 PROD MODE: Using built server:', serverPath);
} 