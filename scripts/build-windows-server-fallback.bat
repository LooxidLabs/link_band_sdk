@echo off
setlocal enabledelayedexpansion
title Link Band SDK Windows Server Fallback Builder v1.0.2

echo ========================================================
echo Link Band SDK Windows Server Fallback Builder v1.0.2
echo ========================================================
echo.
echo This fallback script handles cases where run_server_production.py
echo is not available and builds with alternative files.
echo.

:: Check if we're in the correct directory
if not exist "python_core" (
    echo ERROR: python_core directory not found!
    echo Please run this script from the root of the Link Band SDK project.
    pause
    exit /b 1
)

:: Navigate to python_core directory
cd python_core

:: Check for any available server file
echo DEBUG: Searching for available server files...
set "SERVER_FILE="
set "BUILD_NAME=linkband-server-windows-v1.0.2"

if exist "run_server_production.py" (
    set "SERVER_FILE=run_server_production.py"
    echo Found: run_server_production.py (production)
) else if exist "run_server.py" (
    set "SERVER_FILE=run_server.py"
    echo Found: run_server.py (development)
) else if exist "server.py" (
    set "SERVER_FILE=server.py"
    echo Found: server.py
) else if exist "main.py" (
    set "SERVER_FILE=main.py"
    echo Found: main.py
) else if exist "app\main.py" (
    set "SERVER_FILE=app\main.py"
    echo Found: app\main.py
) else (
    echo ERROR: No suitable server file found!
    echo.
    echo Please ensure one of these files exists:
    echo - run_server_production.py (preferred)
    echo - run_server.py (development)
    echo - server.py
    echo - main.py
    echo - app\main.py
    echo.
    echo Current directory contents:
    dir /B *.py
    pause
    exit /b 1
)

echo Using server file: %SERVER_FILE%

:: Check Python and activate virtual environment if available
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

:: Install PyInstaller if not present
pip show pyinstaller >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing PyInstaller...
    pip install pyinstaller
)

:: Clean previous build
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist

:: Build the server
echo.
echo Building Windows server with %SERVER_FILE%...
pyinstaller --onefile --name %BUILD_NAME% %SERVER_FILE%

if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

:: Check if build was successful
if not exist "dist\%BUILD_NAME%.exe" (
    echo ERROR: Executable not found after build!
    pause
    exit /b 1
)

:: Create distribution directory
set "DIST_DIR=distribution\v1.0.2\windows"
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

:: Copy files
copy "dist\%BUILD_NAME%.exe" "%DIST_DIR%\"
if exist "database" (
    if not exist "%DIST_DIR%\database" mkdir "%DIST_DIR%\database"
    xcopy "database" "%DIST_DIR%\database" /E /I /Y >nul
)

echo.
echo ========================================================
echo                BUILD COMPLETED!
echo ========================================================
echo.
echo Built with: %SERVER_FILE%
echo Output: %DIST_DIR%\%BUILD_NAME%.exe
echo.

pause 