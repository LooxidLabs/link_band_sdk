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