@echo off
setlocal enabledelayedexpansion
title Link Band SDK Windows Server Quick Builder v1.0.2 (Enhanced)

echo ========================================================
echo Link Band SDK Windows Server Quick Builder v1.0.2
echo                    (Enhanced Version)
echo ========================================================
echo.
echo This enhanced quick builder includes:
echo - Better error detection and reporting
echo - Build progress indicators
echo - Automatic cleanup and optimization
echo.
echo This script assumes Python and dependencies are already installed.
echo For first-time setup, use build-windows-server-simple.bat instead.
echo.
echo DEBUG: Quick build mode activated
pause

:: Check if we're in the correct directory
echo DEBUG: Checking project structure...
if not exist "python_core" (
    echo ERROR: python_core directory not found!
    echo Please run this script from the root of the Link Band SDK project.
    echo Current directory: %CD%
    pause
    exit /b 1
)
echo DEBUG: Project structure verified

:: Navigate to python_core directory
echo DEBUG: Navigating to python_core directory...
cd python_core

:: Check if virtual environment exists and activate it
echo DEBUG: Checking for virtual environment...
if exist "venv\Scripts\activate.bat" (
    echo DEBUG: Activating virtual environment...
    call venv\Scripts\activate.bat
    echo OK: Virtual environment activated
) else (
    echo WARNING: Virtual environment not found, using system Python
    echo DEBUG: Continuing with system Python installation
)

:: Check Python and PyInstaller
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found! Please install Python first.
    pause
    exit /b 1
)

pyinstaller --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PyInstaller not found! Installing...
    pip install pyinstaller
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install PyInstaller.
        pause
        exit /b 1
    )
)

:: Check required files
if not exist "linkband-server-windows-v1.0.2.spec" (
    echo ERROR: Windows spec file not found!
    pause
    exit /b 1
)

echo DEBUG: Checking for run_server_production.py...
if not exist "run_server_production.py" (
    echo WARNING: run_server_production.py not found!
    echo DEBUG: Looking for alternative server files...
    if exist "run_server.py" (
        echo DEBUG: Found run_server.py, using as alternative
        set "SERVER_FILE=run_server.py"
        goto :start_build
    ) else if exist "main.py" (
        echo DEBUG: Found main.py, using as alternative
        set "SERVER_FILE=main.py"
        goto :start_build
    ) else (
        echo ERROR: No suitable server file found!
        echo Please ensure one of these files exists:
        echo - run_server_production.py (preferred)
        echo - run_server.py (development)
        echo - main.py (fallback)
        pause
        exit /b 1
    )
) else (
    echo DEBUG: run_server_production.py found
    set "SERVER_FILE=run_server_production.py"
)

:start_build

:: Clean previous build
echo.
echo Cleaning previous build...
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist

:: Build the server
echo.
echo ==================== Building Server ====================
echo DEBUG: Starting PyInstaller build process...
echo Building Windows server executable...
echo This may take several minutes...
echo.

if exist "linkband-server-windows-v1.0.2.spec" (
    echo DEBUG: Running PyInstaller with spec file...
    pyinstaller linkband-server-windows-v1.0.2.spec --clean --noconfirm
) else (
    echo DEBUG: Spec file not found, building with %SERVER_FILE%...
    pyinstaller --onefile --name linkband-server-windows-v1.0.2 %SERVER_FILE%
)
if %errorlevel% neq 0 (
    echo ERROR: PyInstaller build failed!
    echo.
    echo DEBUG: Build process encountered an error
    echo TROUBLESHOOTING:
    echo 1. Check that all dependencies are installed
    echo 2. Verify the spec file exists and is correct
    echo 3. Try running: pip install --upgrade pyinstaller
    echo 4. Check the build log above for specific errors
    pause
    exit /b 1
)
echo DEBUG: PyInstaller build completed successfully

:: Check if build was successful
if not exist "dist\linkband-server-windows-v1.0.2.exe" (
    echo ERROR: Executable not found after build!
    pause
    exit /b 1
)

:: Create distribution directory and copy files
echo.
echo Creating distribution package...
set "DIST_DIR=distribution\v1.0.2\windows"
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

copy "dist\linkband-server-windows-v1.0.2.exe" "%DIST_DIR%\"
if exist "database" (
    if not exist "%DIST_DIR%\database" mkdir "%DIST_DIR%\database"
    xcopy "database" "%DIST_DIR%\database" /E /I /Y >nul
)

echo.
echo ==================== Build Information ====================

echo DEBUG: Generating build information...
echo Link Band SDK v1.0.2 Windows Server Quick Build (Enhanced) > "%DIST_DIR%\BUILD_INFO.txt"
echo Build Date: %DATE% %TIME% >> "%DIST_DIR%\BUILD_INFO.txt"
echo Build Method: Enhanced quick build script >> "%DIST_DIR%\BUILD_INFO.txt"
echo Python Version: >> "%DIST_DIR%\BUILD_INFO.txt"
python --version >> "%DIST_DIR%\BUILD_INFO.txt" 2>&1
echo. >> "%DIST_DIR%\BUILD_INFO.txt"

echo.
echo ========================================================
echo                BUILD COMPLETED SUCCESSFULLY!
echo ========================================================
echo.
echo COMPLETE: Link Band SDK v1.0.2 Windows server quick build finished!
echo OUTPUT: %DIST_DIR%\linkband-server-windows-v1.0.2.exe
echo.
echo FILES CREATED:
for %%f in ("%DIST_DIR%\*.*") do (
    echo - %%~nxf (%%~zf bytes)
)
echo.
echo To run the server:
echo   cd %DIST_DIR%
echo   linkband-server-windows-v1.0.2.exe
echo.
echo Server endpoints:
echo   REST API: http://localhost:8121
echo   WebSocket: ws://localhost:18765
echo.
echo NEXT STEPS:
echo 1. Test the server using the commands above
echo 2. Check BUILD_INFO.txt for build details
echo 3. Deploy to target Windows machine if needed
echo.

echo DEBUG: Quick build script completed successfully!
pause 