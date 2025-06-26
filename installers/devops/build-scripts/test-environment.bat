@echo off
echo ========================================================
echo           환경 테스트 (Environment Test)
echo ========================================================
echo.

echo [테스트 1] 현재 디렉토리
echo %CD%
echo.

echo [테스트 2] PowerShell 확인
powershell -Command "Write-Host '[OK] PowerShell 작동 중'"
echo.

echo [테스트 3] Python 확인
python --version 2>nul
if %errorlevel% equ 0 (
    echo [OK] Python 설치됨
) else (
    echo [INFO] Python 미설치
)
echo.

echo [테스트 4] Git 확인
git --version 2>nul
if %errorlevel% equ 0 (
    echo [OK] Git 설치됨
) else (
    echo [INFO] Git 미설치
)
echo.

echo [테스트 5] 인터넷 연결 확인
ping -n 1 google.com >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 인터넷 연결됨
) else (
    echo [WARNING] 인터넷 연결 확인 필요
)
echo.

echo [테스트 6] 임시 폴더 생성/삭제 테스트
set "TEST_DIR=%TEMP%\linkband_test_%RANDOM%"
mkdir "%TEST_DIR%" 2>nul
if exist "%TEST_DIR%" (
    echo [OK] 임시 폴더 생성 가능
    rmdir "%TEST_DIR%" 2>nul
) else (
    echo [ERROR] 임시 폴더 생성 실패
)
echo.

echo ========================================================
echo                   테스트 완료
echo ========================================================
pause 