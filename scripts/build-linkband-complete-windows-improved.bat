@echo off
setlocal enabledelayedexpansion
title Link Band SDK Complete Windows Builder v1.0.1 (Improved)

echo ========================================================
echo   Link Band SDK Complete Windows Builder v1.0.1
echo                    (Improved Version)
echo ========================================================
echo.
echo This improved script includes:
echo - Better network error handling
echo - Alternative installation methods
echo - More robust dependency management
echo.
echo The script will automatically:
echo 1. Check and Install Python
echo 2. Check and Install Node.js (with fallback methods)
echo 3. Check and Install Git  
echo 4. Download latest source code from GitHub
echo 5. Build Python server executable
echo 6. Build Electron desktop application
echo 7. Create complete installation package
echo.
pause

echo.
echo ==================== Network Connectivity Check ====================

echo Testing network connectivity...
ping -n 1 8.8.8.8 >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: No internet connection detected.
    echo Please check your network connection and try again.
    pause
    exit /b 1
)

echo Testing GitHub connectivity...
ping -n 1 github.com >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Cannot reach GitHub.
    echo Please check your firewall/proxy settings.
    pause
    exit /b 1
)

echo OK: Network connectivity verified.

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
    goto :check_nodejs
)

echo INFO: Python is not installed. Do you want to install it? (y/n)
set /p install_python=
if /i not "%install_python%"=="y" (
    echo SKIP: Skipping Python installation.
    echo WARNING: Cannot build Python server without Python.
    pause
    exit /b 1
)

echo DOWNLOAD: Downloading Python 3.11.9...
set "PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
set "PYTHON_FILE=%TEMP%\python-installer.exe"

powershell -Command "try { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_FILE%' -UseBasicParsing -TimeoutSec 60; Write-Host 'Python download complete' } catch { Write-Host 'Python download failed:' $_.Exception.Message; exit 1 }"
if %errorlevel% neq 0 (
    echo ERROR: Python download failed.
    echo SOLUTION: Please download and install Python manually from https://python.org
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

:check_nodejs
echo.
echo ==================== Node.js Check and Install ====================

node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo OK: Node.js is already installed.
    node --version
    npm --version
    goto :check_git
)

echo INFO: Node.js is not installed.
echo.
echo Available installation methods:
echo 1. Download ZIP archive (recommended for build environments)
echo 2. Download MSI installer (may trigger Visual Studio components)
echo 3. Skip Node.js installation (manual installation required)
echo.
set /p nodejs_method=Choose installation method (1/2/3): 

if "%nodejs_method%"=="1" goto :install_nodejs_zip
if "%nodejs_method%"=="2" goto :install_nodejs_msi
if "%nodejs_method%"=="3" goto :skip_nodejs
goto :install_nodejs_zip

:install_nodejs_zip
echo.
echo DOWNLOAD: Downloading Node.js ZIP archive...
set "NODEJS_URL=https://nodejs.org/dist/v18.20.4/node-v18.20.4-win-x64.zip"
set "NODEJS_ZIP=%TEMP%\nodejs.zip"
set "NODEJS_DIR=C:\nodejs"

powershell -Command "try { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODEJS_URL%' -OutFile '%NODEJS_ZIP%' -UseBasicParsing -TimeoutSec 120; Write-Host 'Node.js download complete' } catch { Write-Host 'Node.js download failed:' $_.Exception.Message; exit 1 }"
if %errorlevel% neq 0 (
    echo ERROR: Node.js download failed.
    goto :install_nodejs_msi
)

echo EXTRACT: Extracting Node.js...
if exist "%NODEJS_DIR%" rmdir /s /q "%NODEJS_DIR%"
powershell -Command "try { Expand-Archive -Path '%NODEJS_ZIP%' -DestinationPath '%TEMP%\nodejs_extract' -Force; Move-Item '%TEMP%\nodejs_extract\node-v18.20.4-win-x64' '%NODEJS_DIR%'; Write-Host 'Node.js extraction complete' } catch { Write-Host 'Node.js extraction failed:' $_.Exception.Message; exit 1 }"
if %errorlevel% neq 0 (
    echo ERROR: Node.js extraction failed.
    goto :install_nodejs_msi
)

echo PATH: Adding Node.js to PATH...
set "PATH=%NODEJS_DIR%;%PATH%"
setx PATH "%NODEJS_DIR%;%PATH%" >nul 2>&1

node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo SUCCESS: Node.js ZIP installation complete!
    node --version
    npm --version
    del "%NODEJS_ZIP%" 2>nul
    rmdir /s /q "%TEMP%\nodejs_extract" 2>nul
    goto :check_git
) else (
    echo WARNING: ZIP installation failed, trying MSI method...
    goto :install_nodejs_msi
)

:install_nodejs_msi
echo.
echo DOWNLOAD: Downloading Node.js MSI installer...
set "NODEJS_URL=https://nodejs.org/dist/v18.20.4/node-v18.20.4-x64.msi"
set "NODEJS_FILE=%TEMP%\nodejs-installer.msi"

powershell -Command "try { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODEJS_URL%' -OutFile '%NODEJS_FILE%' -UseBasicParsing -TimeoutSec 60; Write-Host 'Node.js download complete' } catch { Write-Host 'Node.js download failed:' $_.Exception.Message; exit 1 }"
if %errorlevel% neq 0 (
    echo ERROR: Node.js download failed.
    goto :skip_nodejs
)

echo INSTALL: Installing Node.js... (Administrator rights may be required)
echo WARNING: This may trigger Visual Studio Build Tools installation.
echo If you encounter network errors, press Ctrl+C and install manually.
msiexec /i "%NODEJS_FILE%" /quiet /norestart
echo WAIT: Waiting for installation to complete...
timeout /t 60 /nobreak >nul

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js MSI installation failed.
    goto :skip_nodejs
)

echo SUCCESS: Node.js MSI installation complete!
del "%NODEJS_FILE%" 2>nul
goto :check_git

:skip_nodejs
echo.
echo SKIP: Node.js installation skipped.
echo.
echo MANUAL INSTALLATION REQUIRED:
echo 1. Download Node.js from: https://nodejs.org/dist/v18.20.4/node-v18.20.4-x64.msi
echo 2. Install manually
echo 3. Re-run this script
echo.
pause
exit /b 1

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

powershell -Command "try { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%GIT_URL%' -OutFile '%GIT_FILE%' -UseBasicParsing -TimeoutSec 120; Write-Host 'Git download complete' } catch { Write-Host 'Git download failed:' $_.Exception.Message; exit 1 }"
if %errorlevel% neq 0 (
    echo ERROR: Git download failed.
    echo SOLUTION: Please download and install Git manually from https://git-scm.com
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

set "REPO_URL=https://github.com/LooxidLabs/link_band_sdk.git"
echo INFO: Using repository URL: %REPO_URL%

set "BUILD_DIR=%TEMP%\linkband_complete_build_%RANDOM%"
echo CREATE: Temporary directory: %BUILD_DIR%
mkdir "%BUILD_DIR%"
cd "%BUILD_DIR%"

echo DOWNLOAD: Downloading latest source code...
git clone --depth 1 "%REPO_URL%"
if %errorlevel% neq 0 (
    echo ERROR: Source code download failed.
    echo CHECK: 
    echo - Internet connection
    echo - GitHub URL correctness
    echo - Repository access permissions
    echo - Firewall/proxy settings
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
cd "%PROJECT_DIR%"

echo.
echo ==================== Python Server Build ====================

echo SETUP: Building Python server...
cd python_core

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
    pip install -r requirements.txt --quiet --timeout 120
    if %errorlevel% neq 0 (
        echo ERROR: Package installation failed.
        echo RETRY: Trying with increased timeout...
        pip install -r requirements.txt --timeout 300
        if %errorlevel% neq 0 (
            echo ERROR: Package installation failed even with retry.
            pause
            exit /b 1
        )
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

if not exist "dist\linkband-server-windows.exe" (
    echo ERROR: Built server file not found.
    pause
    exit /b 1
)

echo SUCCESS: Python server built successfully!
set "PYTHON_SERVER_PATH=%CD%\dist\linkband-server-windows.exe"

echo.
echo ==================== Electron App Build ====================

echo SETUP: Building Electron application...
cd "..\electron-app"

echo INSTALL: Installing Node.js dependencies... (This may take a while)
npm install --timeout 120000
if %errorlevel% neq 0 (
    echo ERROR: Node.js dependencies installation failed.
    echo RETRY: Trying with increased timeout...
    npm install --timeout 300000
    if %errorlevel% neq 0 (
        echo ERROR: Node.js dependencies installation failed even with retry.
        pause
        exit /b 1
    )
)

echo BUILD: Building frontend...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)

echo BUILD: Building Electron app for Windows... (This may take a while)
npm run electron:build:win
if %errorlevel% neq 0 (
    echo ERROR: Electron build failed.
    pause
    exit /b 1
)

echo SUCCESS: Electron app built successfully!

echo.
echo ==================== File Organization ====================

set "ORIGINAL_DIR=%~dp0"
echo INFO: Original directory: %ORIGINAL_DIR%

echo CREATE: Creating output directory...
if not exist "%ORIGINAL_DIR%output" mkdir "%ORIGINAL_DIR%output"
if not exist "%ORIGINAL_DIR%output\windows" mkdir "%ORIGINAL_DIR%output\windows"

echo COPY: Copying Python server...
copy "%PYTHON_SERVER_PATH%" "%ORIGINAL_DIR%output\windows\linkband-server-windows.exe"
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy Python server.
    pause
    exit /b 1
)

echo COPY: Copying Electron installer...
for %%f in (release\*.exe) do (
    copy "%%f" "%ORIGINAL_DIR%output\windows\"
    echo COPIED: %%f
)

echo COPY: Copying installation scripts...
if exist "..\installers\distribution\windows\install-linkband.bat" (
    copy "..\installers\distribution\windows\install-linkband.bat" "%ORIGINAL_DIR%output\windows\"
)

if exist "..\installers\distribution\windows\README.md" (
    copy "..\installers\distribution\windows\README.md" "%ORIGINAL_DIR%output\windows\"
)

echo.
echo ==================== Build Information ====================

echo GENERATE: Creating build information file...
echo Link Band SDK v1.0.1 Windows Build (Improved) > "%ORIGINAL_DIR%output\windows\BUILD_INFO.txt"
echo Build Date: %DATE% %TIME% >> "%ORIGINAL_DIR%output\windows\BUILD_INFO.txt"
echo Build Method: Improved script with network error handling >> "%ORIGINAL_DIR%output\windows\BUILD_INFO.txt"
echo. >> "%ORIGINAL_DIR%output\windows\BUILD_INFO.txt"
echo Files included: >> "%ORIGINAL_DIR%output\windows\BUILD_INFO.txt"

for %%f in ("%ORIGINAL_DIR%output\windows\*.*") do (
    echo - %%~nxf (%%~zf bytes) >> "%ORIGINAL_DIR%output\windows\BUILD_INFO.txt"
)

echo.
echo ==================== Cleanup ====================

echo CLEANUP: Cleaning up temporary files...
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
echo COMPLETE: Link Band SDK v1.0.1 Windows build finished!
echo LOCATION: %ORIGINAL_DIR%output\windows\

echo.
echo FILES CREATED:
for %%f in ("%ORIGINAL_DIR%output\windows\*.*") do (
    echo - %%~nxf (%%~zf bytes)
)

echo.
echo NEXT STEPS:
echo 1. Navigate to: %ORIGINAL_DIR%output\windows\
echo 2. Run the Electron installer (.exe file) to install the desktop app
echo 3. The Python server (linkband-server-windows.exe) will be included
echo 4. Follow the README.md for additional setup instructions
echo.

pause 