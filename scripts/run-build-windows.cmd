@echo off
title Link Band SDK Windows Builder Launcher

echo ========================================================
echo   Link Band SDK Windows Builder Launcher
echo ========================================================
echo.
echo This launcher will start the build process in a proper CMD environment.
echo.

REM Check if we're running in PowerShell and switch to CMD if needed
if "%PSModulePath%" neq "" (
    echo DETECTED: Running in PowerShell environment
    echo SWITCH: Launching in CMD for better compatibility...
    echo.
    cmd /c "%~dp0build-linkband-complete-windows-fixed.bat"
    echo.
    echo Build process completed. Press any key to close this window.
    pause >nul
    exit
)

REM Check if the build script exists
if exist "%~dp0build-linkband-complete-windows-fixed.bat" (
    echo FOUND: Build script located
    echo START: Launching build process...
    echo.
    call "%~dp0build-linkband-complete-windows-fixed.bat"
) else if exist "%~dp0build-linkband-complete-windows.bat" (
    echo FOUND: Original build script located
    echo START: Launching build process...
    echo.
    call "%~dp0build-linkband-complete-windows.bat"
) else (
    echo ERROR: Build script not found!
    echo.
    echo Please make sure one of these files exists in the same directory:
    echo - build-linkband-complete-windows-fixed.bat (recommended)
    echo - build-linkband-complete-windows.bat (original)
    echo.
    echo You can download the scripts from:
    echo https://github.com/LooxidLabs/link_band_sdk/tree/main/scripts
    echo.
    pause
    exit /b 1
)

echo.
echo Build launcher finished.
pause 