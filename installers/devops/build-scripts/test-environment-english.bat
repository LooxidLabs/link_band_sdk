@echo off
echo ========================================================
echo           Environment Test for Link Band SDK
echo ========================================================
echo.

echo [Test 1] Current Directory
echo %CD%
echo.

echo [Test 2] PowerShell Check
powershell -Command "Write-Host '[OK] PowerShell is working'"
echo.

echo [Test 3] Python Check
python --version 2>nul
if %errorlevel% equ 0 (
    echo [OK] Python is installed
) else (
    echo [INFO] Python is not installed
)
echo.

echo [Test 4] Git Check
git --version 2>nul
if %errorlevel% equ 0 (
    echo [OK] Git is installed
) else (
    echo [INFO] Git is not installed
)
echo.

echo [Test 5] Internet Connection Check
ping -n 1 google.com >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Internet connection available
) else (
    echo [WARNING] Internet connection may be required
)
echo.

echo [Test 6] Temp Folder Creation Test
set "TEST_DIR=%TEMP%\linkband_test_%RANDOM%"
mkdir "%TEST_DIR%" 2>nul
if exist "%TEST_DIR%" (
    echo [OK] Temp folder creation successful
    rmdir "%TEST_DIR%" 2>nul
) else (
    echo [ERROR] Temp folder creation failed
)
echo.

echo ========================================================
echo                   Test Complete
echo ========================================================
pause 