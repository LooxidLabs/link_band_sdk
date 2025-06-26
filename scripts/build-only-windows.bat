@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   Link Band SDK Build Only (Windows)
echo ========================================================
echo.
echo This script will:
echo 1. Download source code from GitHub
echo 2. Build Python server
echo 3. Build Electron app
echo 4. Package everything
echo.
echo Prerequisites: Python, Node.js, Git must be installed
echo.
pause

echo.
echo Starting build process...
echo Current directory: %CD%

REM Create build directory
set "BUILD_DIR=%TEMP%\linkband_build_%RANDOM%"
echo Build directory: %BUILD_DIR%
mkdir "%BUILD_DIR%"
if %errorlevel% neq 0 (
    echo ERROR: Failed to create build directory
    pause
    exit /b 1
)
cd "%BUILD_DIR%"

echo.
echo ==================== Downloading Source Code ====================
echo.
echo Downloading from GitHub...
git clone --depth 1 https://github.com/LooxidLabs/link_band_sdk.git
if %errorlevel% neq 0 (
    echo ERROR: Failed to download source code
    pause
    exit /b 1
)

echo Source download completed!
cd link_band_sdk

echo.
echo ==================== Building Python Server ====================
echo.
echo Building Python server...
cd python_core

echo Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
pip install pyinstaller --quiet

echo Building server executable...
pyinstaller --onefile --name linkband-server-windows run_server.py

if not exist "dist\linkband-server-windows.exe" (
    echo ERROR: Python server build failed
    pause
    exit /b 1
)

echo Python server build completed!
set "SERVER_PATH=%CD%\dist\linkband-server-windows.exe"

echo.
echo ==================== Building Electron App ====================
echo.
echo Building Electron application...
cd ..\electron-app

echo Installing Node.js dependencies...
npm install

echo Building frontend...
npm run build

echo Building Electron app for Windows...
npm run electron:build:win

if not exist "release\" (
    echo ERROR: Electron app build failed
    pause
    exit /b 1
)

echo Electron app build completed!

echo.
echo ==================== Packaging Results ====================
echo.
echo Creating output directory...
set "SCRIPT_DIR=%~dp0"
set "OUTPUT_DIR=%SCRIPT_DIR%output"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo Copying Python server...
copy "%SERVER_PATH%" "%OUTPUT_DIR%\linkband-server-windows.exe"

echo Copying Electron installer...
for %%f in (release\*.exe) do (
    copy "%%f" "%OUTPUT_DIR%\"
    echo Copied: %%~nxf
)

echo Creating build info...
echo Link Band SDK Windows Build > "%OUTPUT_DIR%\BUILD_INFO.txt"
echo Build Date: %DATE% %TIME% >> "%OUTPUT_DIR%\BUILD_INFO.txt"
echo. >> "%OUTPUT_DIR%\BUILD_INFO.txt"
echo Files: >> "%OUTPUT_DIR%\BUILD_INFO.txt"
dir "%OUTPUT_DIR%\*.*" /B >> "%OUTPUT_DIR%\BUILD_INFO.txt"

echo.
echo ==================== Cleanup ====================
echo.
echo Cleaning up build directory...
cd "%SCRIPT_DIR%"
rmdir /s /q "%BUILD_DIR%"

echo.
echo ========================================================
echo                   BUILD COMPLETED!
echo ========================================================
echo.
echo Output directory: %OUTPUT_DIR%
echo.
echo Files created:
if exist "%OUTPUT_DIR%" (
    for %%f in ("%OUTPUT_DIR%\*.*") do echo   %%~nxf
) else (
    echo   No files found
)
echo.
echo Installation:
echo 1. Run the .exe installer to install the desktop app
echo 2. The Python server is included
echo.
pause
exit /b 0 