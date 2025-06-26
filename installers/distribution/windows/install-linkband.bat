@echo off
setlocal enabledelayedexpansion

REM Link Band SDK Installer for Windows
REM Double-click to install

title Link Band SDK Installer for Windows

echo ================================================
echo     Link Band SDK Installer for Windows
echo ================================================
echo.

REM Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This installer requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [OK] Running with administrator privileges
echo.

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"

REM Check for required files
set "EXE_FILE=%SCRIPT_DIR%LinkBandSDK-Setup.exe"
set "SERVER_FILE=%SCRIPT_DIR%linkband-server-windows.exe"

if not exist "%EXE_FILE%" (
    echo [ERROR] LinkBandSDK-Setup.exe not found
    echo Please ensure all files are in the same folder
    echo.
    pause
    exit /b 1
)

if not exist "%SERVER_FILE%" (
    echo [ERROR] linkband-server-windows.exe not found
    echo.
    echo [CRITICAL] The Python backend server is required for Link Band SDK to function.
    echo Without it, the application cannot connect to devices or process data.
    echo.
    echo [SOLUTION] Choose one of the following options:
    echo.
    echo Option 1 - Auto Build ^(Recommended^):
    echo   1. Run 'windows-auto-build.bat' in this folder
    echo   2. Wait for build to complete
    echo   3. Run this installer again
    echo.
    echo Option 2 - Manual Build:
    echo   1. Download the complete source code
    echo   2. Run PyInstaller on python_core/run_server.py
    echo   3. Copy the exe file to this folder
    echo.
    
    REM Check if auto-build script exists
    if exist "%SCRIPT_DIR%windows-auto-build.bat" (
        echo [OPTION] Would you like to run auto-build now? ^(y/n^)
        set /p choice=
        if /i "%choice%"=="y" (
            echo.
            echo [INFO] Starting auto-build...
            call "%SCRIPT_DIR%windows-auto-build.bat"
            
            REM Check if build was successful
            if exist "%SERVER_FILE%" (
                echo.
                echo [SUCCESS] Auto-build completed! Continuing installation...
                goto :continue_install
            ) else (
                echo [ERROR] Auto-build failed
                pause
                exit /b 1
            )
        )
    )
    
    echo.
    pause
    exit /b 1
)

:continue_install

echo [OK] All required files found
echo.

REM Install Electron app
echo [INFO] Installing Link Band SDK Application...
echo Running installer: %EXE_FILE%
start /wait "" "%EXE_FILE%"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install application
    echo.
    pause
    exit /b 1
)

echo [OK] Application installed successfully
echo.

REM Install Python backend server
echo [INFO] Installing Python Backend Server...
set "INSTALL_DIR=C:\Program Files\LinkBandSDK"
set "TARGET_FILE=%INSTALL_DIR%\linkband-server.exe"

if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
)

echo Copying server to %INSTALL_DIR%...
copy "%SERVER_FILE%" "%TARGET_FILE%" >nul

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python backend server
    echo.
    pause
    exit /b 1
)

echo [OK] Python backend server installed successfully
echo.

REM Add to PATH
echo [INFO] Adding to system PATH...
set "CURRENT_PATH="
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "CURRENT_PATH=%%b"

echo !CURRENT_PATH! | find /i "%INSTALL_DIR%" >nul
if %errorlevel% neq 0 (
    reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH /t REG_EXPAND_SZ /d "!CURRENT_PATH!;%INSTALL_DIR%" /f >nul
    echo [OK] Added to system PATH
) else (
    echo [OK] Already in system PATH
)

echo.

REM Create launch script
echo [INFO] Creating launch script...
set "LAUNCH_SCRIPT=%INSTALL_DIR%\linkband-start.bat"

(
echo @echo off
echo echo Starting Link Band SDK...
echo echo Starting Python backend server...
echo start /b "LinkBand Server" "%INSTALL_DIR%\linkband-server.exe"
echo timeout /t 3 /nobreak ^>nul
echo echo Starting Link Band SDK application...
echo start "" "LinkBandSDK"
echo echo Link Band SDK started successfully!
echo echo.
echo echo To stop the server, close the "LinkBand Server" window
echo pause
) > "%LAUNCH_SCRIPT%"

echo [OK] Launch script created at %LAUNCH_SCRIPT%
echo.

REM Create desktop shortcut
echo [INFO] Creating desktop shortcut...
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\Link Band SDK.lnk"

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT%'); $Shortcut.TargetPath = '%LAUNCH_SCRIPT%'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.IconLocation = '%INSTALL_DIR%\linkband-server.exe'; $Shortcut.Save()"

if exist "%SHORTCUT%" (
    echo [OK] Desktop shortcut created
) else (
    echo [WARNING] Failed to create desktop shortcut
)

echo.

REM Installation complete
echo ================================================
echo   Installation completed successfully!
echo ================================================
echo.
echo How to use:
echo   1. Double-click "Link Band SDK" on your desktop
echo   2. Or run "linkband-start" from Command Prompt
echo   3. Or start them separately:
echo      - Backend: "linkband-server"
echo      - Frontend: "LinkBandSDK" from Start Menu
echo.
echo Installed components:
echo   - Application: Start Menu ^> LinkBandSDK
echo   - Backend Server: %INSTALL_DIR%\linkband-server.exe
echo   - Launch Script: %INSTALL_DIR%\linkband-start.bat
echo   - Desktop Shortcut: %SHORTCUT%
echo.
echo Tip: You can now close this window and start using Link Band SDK!
echo.

pause 