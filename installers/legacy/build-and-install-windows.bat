@echo off
:: Link Band SDK Windows 로컬 빌드 및 설치 스크립트
:: Copyright (c) 2025 Looxid Labs

setlocal enabledelayedexpansion

:: Configuration
set PYTHON_MIN_VERSION=3.9
set SDK_VERSION=1.0.1
set SDK_NAME=Link Band SDK
set PROJECT_ROOT=%~dp0..\..
set ELECTRON_APP_DIR=%PROJECT_ROOT%\electron-app

echo ================================
echo   Link Band SDK 로컬 빌드 설치
echo   for Windows v%SDK_VERSION%
echo ================================
echo.

:: Function to check if command exists
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js가 설치되지 않았습니다
    echo Node.js를 설치해주세요: https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm이 설치되지 않았습니다
    echo Node.js와 함께 npm을 설치해주세요
    pause
    exit /b 1
)

:: Step 1: Check Node.js and npm
echo Step 1: Node.js 환경 확인...

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
set NODE_VERSION=%NODE_VERSION:v=%
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set NODE_MAJOR=%%a

if %NODE_MAJOR% geq 18 (
    echo [SUCCESS] Node.js %NODE_VERSION% 호환 가능
) else (
    echo [ERROR] Node.js %NODE_VERSION%는 너무 오래된 버전입니다. 18 이상 필요
    echo Node.js를 업데이트해주세요: https://nodejs.org/
    pause
    exit /b 1
)

:: Step 2: Check Python installation
echo.
echo Step 2: Python 환경 확인...

where python >nul 2>&1
if errorlevel 1 (
    where py >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python이 설치되지 않았습니다
        echo Python을 설치해주세요: https://www.python.org/downloads/
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)

for /f "tokens=*" %%i in ('%PYTHON_CMD% --version') do set PYTHON_VERSION=%%i
echo Found %PYTHON_VERSION%

:: Extract version number and check
for /f "tokens=2" %%a in ("%PYTHON_VERSION%") do set PYTHON_VER=%%a
for /f "tokens=1,2 delims=." %%a in ("%PYTHON_VER%") do (
    set PYTHON_MAJOR=%%a
    set PYTHON_MINOR=%%b
)

if %PYTHON_MAJOR% gtr 3 (
    echo [SUCCESS] Python %PYTHON_VER% 호환 가능
) else if %PYTHON_MAJOR% equ 3 (
    if %PYTHON_MINOR% geq 9 (
        echo [SUCCESS] Python %PYTHON_VER% 호환 가능
    ) else (
        echo [ERROR] Python %PYTHON_VER%는 너무 오래된 버전입니다. 3.9 이상 필요
        pause
        exit /b 1
    )
) else (
    echo [ERROR] Python %PYTHON_VER%는 너무 오래된 버전입니다. 3.9 이상 필요
    pause
    exit /b 1
)

:: Step 3: Install Python dependencies
echo.
echo Step 3: Python 의존성 설치...

cd /d "%PROJECT_ROOT%"

if not exist "venv" (
    echo Python 가상환경 생성 중...
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo [ERROR] 가상환경 생성 실패
        pause
        exit /b 1
    )
)

echo Python 의존성 설치 중...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

if errorlevel 1 (
    echo [ERROR] Python 의존성 설치 실패
    pause
    exit /b 1
)

echo [SUCCESS] Python 의존성 설치 완료

:: Step 4: Install Node.js dependencies
echo.
echo Step 4: Node.js 의존성 설치...

cd /d "%ELECTRON_APP_DIR%"

if not exist "node_modules" (
    echo Node.js 의존성 설치 중...
    npm install
) else (
    echo Node.js 의존성 업데이트 중...
    npm install
)

if errorlevel 1 (
    echo [ERROR] Node.js 의존성 설치 실패
    pause
    exit /b 1
)

echo [SUCCESS] Node.js 의존성 설치 완료

:: Step 5: Build the application
echo.
echo Step 5: 애플리케이션 빌드...

echo Windows용 Electron 앱 빌드 중...
npm run electron:build:win

if errorlevel 1 (
    echo [ERROR] 빌드 실패
    pause
    exit /b 1
)

echo [SUCCESS] 빌드 완료

:: Step 6: Install the built application
echo.
echo Step 6: 애플리케이션 설치...

:: Find the built installer
for /r "%ELECTRON_APP_DIR%\release" %%f in (*.exe) do (
    if not "%%~nxf"=="builder-effective-config.yaml" (
        set INSTALLER_FILE=%%f
        goto :found_installer
    )
)

echo [ERROR] 빌드된 설치 파일을 찾을 수 없습니다
pause
exit /b 1

:found_installer
echo 빌드된 파일: %INSTALLER_FILE%

echo 설치 프로그램을 실행합니다...
echo 설치 과정에서 관리자 권한이 필요할 수 있습니다.
"%INSTALLER_FILE%"

if errorlevel 1 (
    echo [WARNING] 설치 프로그램 실행 중 오류가 발생했을 수 있습니다
    echo 수동으로 설치 파일을 실행해보세요: %INSTALLER_FILE%
)

:: Step 7: Final instructions
echo.
echo ================================
echo   설치 완료!
echo ================================
echo.
echo 실행 방법:
echo   • 시작 메뉴에서 'Link Band SDK' 검색
echo   • 데스크톱 바로가기 (설치 시 생성한 경우)
echo   • 프로그램 목록에서 실행
echo.
echo 개발 모드 실행:
echo   cd %ELECTRON_APP_DIR%
echo   npm run electron:preview
echo.
echo Python 가상환경:
echo   위치: %PROJECT_ROOT%\venv
echo   활성화: %PROJECT_ROOT%\venv\Scripts\activate.bat
echo.
echo 빌드된 파일 위치:
echo   설치 파일: %INSTALLER_FILE%
echo.

pause 