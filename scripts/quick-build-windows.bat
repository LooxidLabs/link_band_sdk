@echo off
title Link Band SDK Quick Windows Builder

echo ========================================================
echo   Link Band SDK Quick Windows Builder v1.0.1
echo ========================================================
echo.
echo This is a quick launcher for the complete build script.
echo Make sure you have Administrator privileges!
echo.

REM Check if we're running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script requires Administrator privileges.
    echo Please right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo OK: Running with Administrator privileges.
echo.

REM Check if the main build script exists
if exist "build-linkband-complete-windows.bat" (
    echo FOUND: Main build script found.
    echo LAUNCH: Starting complete build process...
    echo.
    call build-linkband-complete-windows.bat
) else (
    echo ERROR: Main build script not found!
    echo.
    echo SOLUTION: Make sure both files are in the same directory:
    echo - quick-build-windows.bat (this file)
    echo - build-linkband-complete-windows.bat (main script)
    echo.
    echo You can download the main script from:
    echo https://github.com/LooxidLabs/link_band_sdk/blob/main/scripts/build-linkband-complete-windows.bat
    echo.
    pause
    exit /b 1
)

echo.
echo Quick build launcher finished.
pause 