@echo off
setlocal enabledelayedexpansion
title Link Band SDK Simple Test

echo ========================================================
echo   Link Band SDK Simple Build Test
echo ========================================================
echo.

echo Testing each step individually...
echo.

REM Step 1: Python Check
echo ==================== Python Check ====================
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo OK: Python is installed
    python --version
    echo Proceeding to Node.js check...
) else (
    echo ERROR: Python not found
    echo Please install Python first
    pause
    exit /b 1
)

REM Step 2: Node.js Check  
echo.
echo ==================== Node.js Check ====================
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo OK: Node.js is installed
    node --version
    npm --version
    echo Proceeding to Git check...
) else (
    echo ERROR: Node.js not found
    echo Please install Node.js first
    pause
    exit /b 1
)

REM Step 3: Git Check
echo.
echo ==================== Git Check ====================
git --version >nul 2>&1
if %errorlevel% equ 0 (
    echo OK: Git is installed
    git --version
    echo Proceeding to source download...
) else (
    echo ERROR: Git not found
    echo Please install Git first
    pause
    exit /b 1
)

REM Step 4: Test Source Download
echo.
echo ==================== Source Download Test ====================
echo This would normally download source code from GitHub
echo Repository: https://github.com/LooxidLabs/link_band_sdk.git
echo.
echo Do you want to test the actual download? (y/n)
set /p test_download=
if /i "%test_download%"=="y" (
    echo Testing git clone...
    set "TEST_DIR=%TEMP%\linkband_test_%RANDOM%"
    mkdir "!TEST_DIR!"
    cd "!TEST_DIR!"
    git clone --depth 1 https://github.com/LooxidLabs/link_band_sdk.git
    if !errorlevel! equ 0 (
        echo SUCCESS: Source download test completed
        echo Cleaning up test directory...
        cd %~dp0
        rmdir /s /q "!TEST_DIR!"
    ) else (
        echo ERROR: Source download failed
        cd %~dp0
        rmdir /s /q "!TEST_DIR!"
        pause
        exit /b 1
    )
) else (
    echo SKIP: Source download test skipped
)

echo.
echo ==================== All Tests Completed ====================
echo.
echo All dependency checks passed!
echo You can now run the full build script.
echo.
pause 