@echo off
setlocal enabledelayedexpansion
title Link Band SDK Windows Builder - Quick Build

echo ========================================================
echo   Link Band SDK Windows Builder (Quick Build)
echo ========================================================
echo.
echo Fixed Repository: https://github.com/LooxidLabs/link_band_sdk.git
echo This script will automatically build the Windows server.
echo.
echo Press any key to start, or Ctrl+C to cancel...
pause >nul

echo.
echo ==================== Environment Check ====================

echo Current Location: %CD%

powershell -Command "Write-Host 'PowerShell is available'" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is not available.
    pause
    exit /b 1
)

echo.
echo ==================== Python Check ====================

python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo OK: Python is available
    python --version
    goto :check_git
)

echo ERROR: Python is not installed.
echo SOLUTION: Please install Python from https://python.org
echo Then run this script again.
pause
exit /b 1

:check_git
echo.
echo ==================== Git Check ====================

git --version >nul 2>&1
if %errorlevel% equ 0 (
    echo OK: Git is available
    git --version
    goto :download_source
)

echo ERROR: Git is not installed.
echo SOLUTION: Please install Git from https://git-scm.com
echo Then run this script again.
pause
exit /b 1

:download_source
echo.
echo ==================== Source Code Download ====================

REM Fixed GitHub repository URL
set "REPO_URL=https://github.com/LooxidLabs/link_band_sdk.git"
echo INFO: Downloading from: %REPO_URL%

set "BUILD_DIR=%TEMP%\linkband_build_%RANDOM%"
echo CREATE: Temporary directory: %BUILD_DIR%
mkdir "%BUILD_DIR%"
cd "%BUILD_DIR%"

echo DOWNLOAD: Cloning repository...
git clone --depth 1 "%REPO_URL%"
if %errorlevel% neq 0 (
    echo ERROR: Source code download failed.
    echo CHECK: Internet connection and repository access
    pause
    exit /b 1
)

for /d %%i in (*) do (
    if exist "%%i\python_core" (
        set "PROJECT_DIR=%%i"
        goto :found_project
    )
)

echo ERROR: python_core folder not found in downloaded repository.
pause
exit /b 1

:found_project
echo OK: Project folder found: %PROJECT_DIR%
cd "%PROJECT_DIR%\python_core"

echo.
echo ==================== Python Server Build ====================

echo SETUP: Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Virtual environment creation failed.
    pause
    exit /b 1
)

echo ACTIVATE: Activating virtual environment...
call venv\Scripts\activate.bat

echo UPGRADE: Upgrading pip...
python -m pip install --upgrade pip --quiet

echo INSTALL: Installing required packages...
if exist requirements.txt (
    pip install -r requirements.txt --quiet
    if %errorlevel% neq 0 (
        echo ERROR: Package installation failed.
        pause
        exit /b 1
    )
) else (
    echo WARNING: requirements.txt file not found.
)

echo INSTALL: Installing PyInstaller...
pip install pyinstaller --quiet

echo BUILD: Building Windows server... (This may take a few minutes)
if exist run_server.py (
    pyinstaller --onefile --name linkband-server-windows run_server.py
) else if exist server.py (
    pyinstaller --onefile --name linkband-server-windows server.py
) else if exist main.py (
    pyinstaller --onefile --name linkband-server-windows main.py
) else (
    echo ERROR: Cannot find Python server file to build.
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo ERROR: Server build failed.
    pause
    exit /b 1
)

echo.
echo ==================== File Copy ====================

set "ORIGINAL_DIR=%~dp0"
echo INFO: Copying to: %ORIGINAL_DIR%

if exist "dist\linkband-server-windows.exe" (
    echo SUCCESS: Server build complete!
    
    for %%A in ("dist\linkband-server-windows.exe") do (
        echo FILE INFO: Size: %%~zA bytes
    )
    
    echo COPY: Copying server file...
    copy "dist\linkband-server-windows.exe" "%ORIGINAL_DIR%linkband-server-windows.exe"
    
    if exist "%ORIGINAL_DIR%linkband-server-windows.exe" (
        echo COPY SUCCESS: File copied successfully!
        
        for %%A in ("%ORIGINAL_DIR%linkband-server-windows.exe") do (
            echo FINAL FILE: Size: %%~zA bytes
        )
    ) else (
        echo COPY ERROR: File copy failed!
        echo MANUAL COPY: From %CD%\dist\linkband-server-windows.exe
        echo MANUAL COPY: To %ORIGINAL_DIR%linkband-server-windows.exe
        pause
    )
    
) else (
    echo ERROR: Built server file not found.
    if exist dist (
        echo DEBUG: Contents of dist folder:
        dir dist\*.* /b
    )
    pause
    exit /b 1
)

echo.
echo ==================== Cleanup ====================

echo CLEANUP: Returning to original directory...
cd "%ORIGINAL_DIR%"

echo DELETE: Removing temporary files...
rmdir /s /q "%BUILD_DIR%" 2>nul

echo.
echo ========================================================
echo                   BUILD COMPLETE!
echo ========================================================
echo.
echo SUCCESS: linkband-server-windows.exe has been created!
echo LOCATION: %ORIGINAL_DIR%linkband-server-windows.exe

if exist "%ORIGINAL_DIR%linkband-server-windows.exe" (
    echo STATUS: Ready for installation
    echo NEXT: Run install-linkband.bat to complete setup
) else (
    echo STATUS: Build completed but file copy failed
)

echo.
echo Press any key to exit...
pause >nul 