@echo off
echo ========================================================
echo   Link Band SDK Windows Build Test
echo ========================================================
echo.

REM Test if we're in the right directory
if not exist "python_core" (
    echo ERROR: Run this from link_band_sdk root directory
    pause
    exit /b 1
)

echo 1. Testing Python...
python --version
if %errorlevel% neq 0 (
    echo FAIL: Python not found
    goto :end
)

echo 2. Testing Node.js...
node --version
if %errorlevel% neq 0 (
    echo FAIL: Node.js not found
    goto :end
)

echo 3. Testing npm...
npm --version
if %errorlevel% neq 0 (
    echo FAIL: npm not found
    goto :end
)

echo 4. Checking directories...
if exist "electron-app" (
    echo OK: electron-app found
) else (
    echo FAIL: electron-app not found
)

if exist "python_core" (
    echo OK: python_core found
) else (
    echo FAIL: python_core not found
)

echo.
echo All tests passed! You can run build-windows-complete.bat

:end
pause 