# Windows Python 서버 수동 빌드 가이드

Link Band SDK의 Windows용 Python 백엔드 서버를 빌드하는 방법입니다.

## 🖥️ Windows 환경에서 빌드

### 1. 필수 요구사항
- Windows 10/11 (64-bit)
- Python 3.9+ 설치
- Git 설치

### 2. 빌드 과정

#### 2.1 프로젝트 클론
```cmd
git clone https://github.com/your-repo/link_band_sdk.git
cd link_band_sdk
```

#### 2.2 Python 가상환경 생성
```cmd
cd python_core
python -m venv venv
venv\Scripts\activate
```

#### 2.3 의존성 설치
```cmd
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller
```

#### 2.4 실행 파일 빌드
```cmd
pyinstaller --onefile --name linkband-server-windows run_server.py
```

#### 2.5 결과 파일 복사
빌드가 완료되면 `dist/linkband-server-windows.exe` 파일이 생성됩니다.

이 파일을 `installers/windows/linkband-server-windows.exe`로 복사하세요:
```cmd
copy dist\linkband-server-windows.exe ..\installers\windows\linkband-server-windows.exe
```

### 3. 빌드 완료 확인
```cmd
cd ..\installers\windows
linkband-server-windows.exe --version
```

## 🚀 자동 빌드 스크립트 (Windows)

Windows에서 한 번에 빌드하려면 다음 배치 파일을 사용하세요:

```batch
@echo off
echo ================================================
echo     Link Band SDK Windows Server Builder
echo ================================================
echo.

cd python_core

echo Creating virtual environment...
python -m venv venv
call venv\Scripts\activate

echo Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

echo Building Windows server...
pyinstaller --onefile --name linkband-server-windows run_server.py

echo Copying to installers directory...
copy dist\linkband-server-windows.exe ..\installers\windows\linkband-server-windows.exe

echo.
echo [SUCCESS] Windows server built successfully!
echo Output: installers\windows\linkband-server-windows.exe
echo.
pause
```

이 내용을 `build-windows-server.bat` 파일로 저장하고 실행하세요.

## 📝 참고사항

- 빌드된 실행 파일은 약 60-80MB 크기입니다
- 빌드 시간은 시스템에 따라 5-10분 소요됩니다
- 빌드 중 방화벽 경고가 나타날 수 있습니다 (허용하세요)
- 빌드 완료 후 가상환경은 삭제해도 됩니다

## 🔧 문제 해결

### PyInstaller 설치 실패
```cmd
pip install --upgrade setuptools wheel
pip install pyinstaller
```

### 빌드 중 모듈 누락 오류
```cmd
pip install --upgrade -r requirements.txt
```

### 실행 파일 크기가 너무 큰 경우
```cmd
pyinstaller --onefile --exclude-module tkinter --exclude-module matplotlib run_server.py
``` 