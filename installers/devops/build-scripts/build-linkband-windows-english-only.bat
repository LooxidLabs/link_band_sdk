@echo off
setlocal enabledelayedexpansion
title Link Band SDK Windows Builder - English Only

echo ========================================================
echo   Link Band SDK Windows Builder (English Only)
echo ========================================================
echo.
echo This script will automatically:
echo 1. Check and Install Python
echo 2. Check and Install Git  
echo 3. Download source code from GitHub
echo 4. Build Python server executable
echo 5. Copy file first, then clean up temporary files
echo.
pause

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
echo ==================== Python Check and Install ====================

python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo OK: Python is already installed.
    python --version
    goto :check_git
)

echo INFO: Python is not installed. Do you want to install it? (y/n)
set /p install_python=
if /i not "%install_python%"=="y" (
    echo SKIP: Skipping Python installation.
    echo WARNING: Cannot build without Python.
    pause
    exit /b 1
)

echo DOWNLOAD: Downloading Python 3.11.9...
set "PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
set "PYTHON_FILE=%TEMP%\python-installer.exe"

powershell -Command "try { Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_FILE%' -UseBasicParsing; Write-Host 'Python download complete' } catch { Write-Host 'Python download failed'; exit 1 }"
if %errorlevel% neq 0 (
    echo ERROR: Python download failed.
    pause
    exit /b 1
)

echo INSTALL: Installing Python... (Administrator rights may be required)
"%PYTHON_FILE%" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0
echo WAIT: Waiting for installation to complete...
timeout /t 30 /nobreak >nul

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python installation failed.
    echo SOLUTION: Please install Python manually from https://python.org
    pause
    exit /b 1
)

echo SUCCESS: Python installation complete!
del "%PYTHON_FILE%" 2>nul

:check_git
echo.
echo ==================== Git Check and Install ====================

git --version >nul 2>&1
if %errorlevel% equ 0 (
    echo OK: Git is already installed.
    git --version
    goto :download_source
)

echo INFO: Git is not installed. Do you want to install it? (y/n)
set /p install_git=
if /i not "%install_git%"=="y" (
    echo SKIP: Skipping Git installation.
    echo WARNING: Cannot download source code without Git.
    pause
    exit /b 1
)

echo DOWNLOAD: Downloading Git for Windows...
set "GIT_URL=https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/Git-2.45.2-64-bit.exe"
set "GIT_FILE=%TEMP%\git-installer.exe"

powershell -Command "try { Invoke-WebRequest -Uri '%GIT_URL%' -OutFile '%GIT_FILE%' -UseBasicParsing; Write-Host 'Git download complete' } catch { Write-Host 'Git download failed'; exit 1 }"
if %errorlevel% neq 0 (
    echo ERROR: Git download failed.
    pause
    exit /b 1
)

echo INSTALL: Installing Git...
"%GIT_FILE%" /VERYSILENT /NORESTART
echo WAIT: Waiting for installation to complete...
timeout /t 60 /nobreak >nul

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git installation failed.
    echo SOLUTION: Please install Git manually from https://git-scm.com
    pause
    exit /b 1
)

echo SUCCESS: Git installation complete!
del "%GIT_FILE%" 2>nul

:download_source
echo.
echo ==================== Source Code Download ====================

REM Fixed GitHub repository URL - no need to enter manually
set "REPO_URL=https://github.com/LooxidLabs/link_band_sdk.git"
echo INFO: Using fixed repository URL: %REPO_URL%
echo INFO: If you need to use a different repository, edit this script and change REPO_URL variable

set "BUILD_DIR=%TEMP%\linkband_build_%RANDOM%"
echo CREATE: Temporary directory: %BUILD_DIR%
mkdir "%BUILD_DIR%"
cd "%BUILD_DIR%"

echo DOWNLOAD: Downloading source code...
git clone --depth 1 "%REPO_URL%"
if %errorlevel% neq 0 (
    echo ERROR: Source code download failed.
    echo CHECK: 
    echo - Internet connection
    echo - GitHub URL correctness
    echo - Repository access permissions
    pause
    exit /b 1
)

for /d %%i in (*) do (
    if exist "%%i\python_core" (
        set "PROJECT_DIR=%%i"
        goto :found_project
    )
)

echo ERROR: python_core folder not found.
echo CHECK: Make sure python_core folder exists in the repository.
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

echo BUILD: Building Windows server... (This may take a while)
if exist run_server.py (
    pyinstaller --onefile --name linkband-server-windows run_server.py
) else if exist server.py (
    pyinstaller --onefile --name linkband-server-windows server.py
) else if exist main.py (
    pyinstaller --onefile --name linkband-server-windows main.py
) else (
    echo ERROR: Cannot find Python file to build.
    echo CHECK: Make sure one of these files exists: run_server.py, server.py, main.py
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo ERROR: Server build failed.
    pause
    exit /b 1
)

echo.
echo ==================== File Copy (BEFORE Cleanup) ====================

set "ORIGINAL_DIR=%~dp0"
echo INFO: Original directory: %ORIGINAL_DIR%
echo INFO: Current build directory: %CD%

if exist "dist\linkband-server-windows.exe" (
    echo SUCCESS: Server build complete!
    echo FOUND: Built file at: %CD%\dist\linkband-server-windows.exe
    
    for %%A in ("dist\linkband-server-windows.exe") do (
        echo FILE INFO: Size: %%~zA bytes, Modified: %%~tA
    )
    
    echo COPY: Copying server file to installer directory...
    echo FROM: %CD%\dist\linkband-server-windows.exe
    echo TO: %ORIGINAL_DIR%linkband-server-windows.exe
    
    copy "dist\linkband-server-windows.exe" "%ORIGINAL_DIR%linkband-server-windows.exe"
    
    if exist "%ORIGINAL_DIR%linkband-server-windows.exe" (
        echo COPY SUCCESS: File copied successfully!
        
        for %%A in ("%ORIGINAL_DIR%linkband-server-windows.exe") do (
            echo COPIED FILE: Size: %%~zA bytes, Location: %%A
        )
        
        echo TEST: Testing copied file...
        "%ORIGINAL_DIR%linkband-server-windows.exe" --help >nul 2>&1
        if %errorlevel% equ 0 (
            echo OK: Server executable is working correctly!
        ) else (
            echo INFO: Server file copied (test results may vary)
        )
        
    ) else (
        echo COPY ERROR: File copy failed!
        echo MANUAL: You can manually copy the file from:
        echo SOURCE: %CD%\dist\linkband-server-windows.exe
        echo TARGET: %ORIGINAL_DIR%linkband-server-windows.exe
        echo.
        echo PAUSE: Press any key to continue with cleanup, or Ctrl+C to stop and copy manually...
        pause
    )
    
) else (
    echo ERROR: Built server file not found at: %CD%\dist\linkband-server-windows.exe
    echo DEBUG: Checking dist folder contents:
    if exist dist (
        dir dist\*.* /b
    ) else (
        echo ERROR: dist folder does not exist
    )
    pause
    exit /b 1
)

echo.
echo ==================== Cleanup (AFTER Copy) ====================

echo CLEANUP: Now cleaning up temporary files...
echo INFO: Changing back to original directory: %ORIGINAL_DIR%
cd "%ORIGINAL_DIR%"

echo DELETE: Removing temporary build directory: %BUILD_DIR%
rmdir /s /q "%BUILD_DIR%" 2>nul

if exist "%BUILD_DIR%" (
    echo WARNING: Some temporary files could not be deleted
    echo LOCATION: %BUILD_DIR%
) else (
    echo OK: Temporary files cleaned up successfully
)

echo.
echo ========================================================
echo                   BUILD COMPLETE!
echo ========================================================
echo.
echo COMPLETE: linkband-server-windows.exe has been created!
echo LOCATION: %ORIGINAL_DIR%linkband-server-windows.exe

if exist "%ORIGINAL_DIR%linkband-server-windows.exe" (
    echo STATUS: File is ready for installation
    echo NEXT STEP: Run install-linkband.bat to complete installation.
) else (
    echo STATUS: File copy failed - check manual copy instructions above
)

echo.
pause 