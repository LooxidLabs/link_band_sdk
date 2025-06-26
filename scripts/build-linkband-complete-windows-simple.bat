@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   Link Band SDK Complete Windows Builder v1.0.1
echo                    (Simple Version)
echo ========================================================
echo.
echo This script will build Link Band SDK for Windows
echo.
pause

echo.
echo ==================== Environment Check ====================
echo Current Location: %CD%

REM Check Python
echo.
echo Checking Python...
python --version >nul 2>&1
if not %errorlevel% equ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)
echo OK: Python is installed
python --version

REM Check Node.js
echo.
echo Checking Node.js...
node --version >nul 2>&1
if not %errorlevel% equ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
echo OK: Node.js is installed
node --version
npm --version

REM Check Git
echo.
echo Checking Git...
git --version >nul 2>&1
if not %errorlevel% equ 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com
    pause
    exit /b 1
)
echo OK: Git is installed
git --version

echo.
echo ==================== Source Code Download ====================
echo.
echo All dependencies are installed!
echo Proceeding with source code download...

set "REPO_URL=https://github.com/LooxidLabs/link_band_sdk.git"
set "BUILD_DIR=%TEMP%\linkband_build_%RANDOM%"

echo Repository: %REPO_URL%
echo Build Directory: %BUILD_DIR%
echo.

mkdir "%BUILD_DIR%"
cd "%BUILD_DIR%"

echo Downloading source code...
git clone --depth 1 "%REPO_URL%"
if not %errorlevel% equ 0 (
    echo ERROR: Failed to download source code
    echo Please check your internet connection and try again
    pause
    cd %~dp0
    exit /b 1
)

REM Find project directory
for /d %%i in (*) do (
    if exist "%%i\python_core" (
        set "PROJECT_DIR=%%i"
        goto found_project
    )
)

echo ERROR: Could not find python_core directory
pause
cd %~dp0
exit /b 1

:found_project
echo Found project directory: %PROJECT_DIR%
cd "%PROJECT_DIR%"

echo.
echo ==================== Python Server Build ====================
echo.
echo Building Python server...
cd python_core

echo Creating virtual environment...
python -m venv venv
if not %errorlevel% equ 0 (
    echo ERROR: Failed to create virtual environment
    pause
    cd %~dp0
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt
if not %errorlevel% equ 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    cd %~dp0
    exit /b 1
)

echo Installing PyInstaller...
pip install pyinstaller

echo Building server executable...
if exist run_server.py (
    pyinstaller --onefile --name linkband-server-windows run_server.py
) else if exist server.py (
    pyinstaller --onefile --name linkband-server-windows server.py
) else if exist main.py (
    pyinstaller --onefile --name linkband-server-windows main.py
) else (
    echo ERROR: Cannot find Python server file
    pause
    cd %~dp0
    exit /b 1
)

if not exist "dist\linkband-server-windows.exe" (
    echo ERROR: Failed to build server executable
    pause
    cd %~dp0
    exit /b 1
)

echo Python server build completed!
set "SERVER_PATH=%CD%\dist\linkband-server-windows.exe"

echo.
echo ==================== Electron App Build ====================
echo.
echo Building Electron application...
cd "..\electron-app"

echo Installing Node.js dependencies...
npm install
if not %errorlevel% equ 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    cd %~dp0
    exit /b 1
)

echo Building frontend...
npm run build
if not %errorlevel% equ 0 (
    echo ERROR: Failed to build frontend
    pause
    cd %~dp0
    exit /b 1
)

echo Building Electron app...
npm run electron:build:win
if not %errorlevel% equ 0 (
    echo ERROR: Failed to build Electron app
    pause
    cd %~dp0
    exit /b 1
)

echo Electron app build completed!

echo.
echo ==================== File Organization ====================
echo.
echo Organizing build files...

set "ORIGINAL_DIR=%~dp0"
set "OUTPUT_DIR=%ORIGINAL_DIR%output\windows"

if not exist "%ORIGINAL_DIR%output" mkdir "%ORIGINAL_DIR%output"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo Copying Python server...
copy "%SERVER_PATH%" "%OUTPUT_DIR%\linkband-server-windows.exe"

echo Copying Electron installer...
for %%f in (release\*.exe) do (
    copy "%%f" "%OUTPUT_DIR%\"
    echo Copied: %%~nxf
)

echo Creating build info...
echo Link Band SDK v1.0.1 Windows Build > "%OUTPUT_DIR%\BUILD_INFO.txt"
echo Build Date: %DATE% %TIME% >> "%OUTPUT_DIR%\BUILD_INFO.txt"
echo. >> "%OUTPUT_DIR%\BUILD_INFO.txt"
echo Files: >> "%OUTPUT_DIR%\BUILD_INFO.txt"
for %%f in ("%OUTPUT_DIR%\*.*") do (
    echo - %%~nxf >> "%OUTPUT_DIR%\BUILD_INFO.txt"
)

echo.
echo ==================== Cleanup ====================
echo.
echo Cleaning up temporary files...
cd "%ORIGINAL_DIR%"
rmdir /s /q "%BUILD_DIR%" 2>nul

echo.
echo ========================================================
echo                   BUILD COMPLETE!
echo ========================================================
echo.
echo Build completed successfully!
echo.
echo Output location: %OUTPUT_DIR%
echo.
echo Files created:
for %%f in ("%OUTPUT_DIR%\*.*") do (
    echo - %%~nxf
)
echo.
echo Next steps:
echo 1. Navigate to the output directory
echo 2. Run the Electron installer to install the desktop app
echo 3. The Python server is included in the installation
echo.
pause 