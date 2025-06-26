@echo off
setlocal enabledelayedexpansion

REM 로그 파일 설정
set "LOG_FILE=%~dp0build-log-%DATE:~0,4%%DATE:~5,2%%DATE:~8,2%-%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%.txt"
set "LOG_FILE=%LOG_FILE: =0%"

REM 로그 함수 정의
call :log "========================================================"
call :log "  Link Band SDK Build Only (Windows)"
call :log "========================================================"
call :log ""
call :log "This script will:"
call :log "1. Download source code from GitHub"
call :log "2. Build Python server"
call :log "3. Build Electron app"
call :log "4. Package everything"
call :log ""
call :log "Prerequisites: Python, Node.js, Git must be installed"
call :log ""
call :log "Log file: %LOG_FILE%"
call :log ""
pause

call :log ""
call :log "Starting build process..."
call :log "Current directory: %CD%"

REM Create build directory
set "BUILD_DIR=%TEMP%\linkband_build_%RANDOM%"
call :log "Build directory: %BUILD_DIR%"
mkdir "%BUILD_DIR%" 2>>"%LOG_FILE%"
cd "%BUILD_DIR%"

call :log ""
call :log "==================== Downloading Source Code ===================="
call :log ""
call :log "Downloading from GitHub..."
git clone --depth 1 https://github.com/LooxidLabs/link_band_sdk.git >>"%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    call :log "ERROR: Failed to download source code"
    pause
    exit /b 1
)

call :log "Source download completed!"
cd link_band_sdk

call :log ""
call :log "==================== Building Python Server ===================="
call :log ""
call :log "Building Python server..."
cd python_core

call :log "Creating virtual environment..."
python -m venv venv >>"%LOG_FILE%" 2>&1
call venv\Scripts\activate.bat

call :log "Installing Python dependencies..."
pip install --upgrade pip >>"%LOG_FILE%" 2>&1
pip install -r requirements.txt >>"%LOG_FILE%" 2>&1
pip install pyinstaller >>"%LOG_FILE%" 2>&1

call :log "Building server executable..."
pyinstaller --onefile --name linkband-server-windows run_server.py >>"%LOG_FILE%" 2>&1

if not exist "dist\linkband-server-windows.exe" (
    call :log "ERROR: Python server build failed"
    pause
    exit /b 1
)

call :log "Python server build completed!"
set "SERVER_PATH=%CD%\dist\linkband-server-windows.exe"

call :log ""
call :log "==================== Building Electron App ===================="
call :log ""
call :log "Building Electron application..."
cd ..\electron-app

call :log "Installing Node.js dependencies..."
npm install >>"%LOG_FILE%" 2>&1

call :log "Building frontend..."
npm run build >>"%LOG_FILE%" 2>&1

call :log "Building Electron app for Windows..."
npm run electron:build:win >>"%LOG_FILE%" 2>&1

if not exist "release\" (
    call :log "ERROR: Electron app build failed"
    pause
    exit /b 1
)

call :log "Electron app build completed!"

call :log ""
call :log "==================== Packaging Results ===================="
call :log ""
call :log "Creating output directory..."
set "SCRIPT_DIR=%~dp0"
set "OUTPUT_DIR=%SCRIPT_DIR%output"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

call :log "Copying Python server..."
copy "%SERVER_PATH%" "%OUTPUT_DIR%\linkband-server-windows.exe" >>"%LOG_FILE%" 2>&1

call :log "Copying Electron installer..."
for %%f in (release\*.exe) do (
    copy "%%f" "%OUTPUT_DIR%\" >>"%LOG_FILE%" 2>&1
    call :log "Copied: %%~nxf"
)

call :log "Creating build info..."
call :log "Link Band SDK Windows Build" > "%OUTPUT_DIR%\BUILD_INFO.txt"
call :log "Build Date: %DATE% %TIME%" >> "%OUTPUT_DIR%\BUILD_INFO.txt"
call :log "" >> "%OUTPUT_DIR%\BUILD_INFO.txt"
call :log "Files:" >> "%OUTPUT_DIR%\BUILD_INFO.txt"
dir "%OUTPUT_DIR%\*.*" /B >> "%OUTPUT_DIR%\BUILD_INFO.txt" 2>>"%LOG_FILE%"

call :log ""
call :log "==================== Cleanup ===================="
call :log ""
call :log "Cleaning up build directory..."
cd "%SCRIPT_DIR%"
rmdir /s /q "%BUILD_DIR%" >>"%LOG_FILE%" 2>&1

call :log ""
call :log "========================================================"
call :log "                   BUILD COMPLETED!"
call :log "========================================================"
call :log ""
call :log "Output directory: %OUTPUT_DIR%"
call :log ""
call :log "Files created:"
dir "%OUTPUT_DIR%\*.*" /B 2>>"%LOG_FILE%" | call :log_stdin
call :log ""
call :log "Installation:"
call :log "1. Run the .exe installer to install the desktop app"
call :log "2. The Python server is included"
call :log ""
call :log "Complete log saved to: %LOG_FILE%"
call :log ""
pause
exit /b 0

:log
echo %~1
echo %~1 >> "%LOG_FILE%"
goto :eof

:log_stdin
for /f "delims=" %%i in ('more') do (
    echo %%i
    echo %%i >> "%LOG_FILE%"
)
goto :eof 