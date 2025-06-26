# Link Band SDK Windows Build Troubleshooting Guide

## 개요
Windows에서 Link Band SDK 빌드 중 발생할 수 있는 문제들과 해결 방법을 정리한 가이드입니다.

---

## 🔧 Node.js 설치 문제

### 문제: Visual Studio Build Tools 네트워크 오류
```
[2980:0004] Failed to download channels file from https://aka.ms/vs/channels
[2980:0004] 작업이 취소되었습니다.
RequestCanceled with 'https://aka.ms/vs/channels'
```

**원인:** Node.js MSI 설치 중 Visual Studio Build Tools가 Microsoft 서버에서 파일을 다운로드하지 못함

**해결 방법:**

#### 방법 1: ZIP 버전 사용 (권장)
```cmd
# 개선된 스크립트 사용
build-linkband-complete-windows-improved.bat
# Node.js 설치 방법 선택 시 "1" 선택 (ZIP 버전)
```

#### 방법 2: 수동 설치
```cmd
# 1. Node.js 공식 사이트에서 직접 다운로드
# https://nodejs.org/dist/v18.20.4/node-v18.20.4-x64.msi

# 2. 관리자 권한으로 설치
# 3. 설치 중 "Automatically install the necessary tools" 체크박스 해제

# 4. 설치 확인
node --version
npm --version
```

#### 방법 3: Chocolatey 사용
```powershell
# PowerShell을 관리자 권한으로 실행
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Node.js 설치
choco install nodejs --version=18.20.4 -y
```

---

## 🌐 네트워크 연결 문제

### 문제: 인터넷 연결 오류
```
ERROR: Source code download failed.
ping: cannot resolve github.com
```

**해결 방법:**

#### DNS 설정 확인
```cmd
# DNS 캐시 플러시
ipconfig /flushdns

# DNS 서버 변경 (Google DNS)
netsh interface ip set dns "Wi-Fi" static 8.8.8.8
netsh interface ip add dns "Wi-Fi" 8.8.4.4 index=2

# 연결 테스트
ping 8.8.8.8
ping github.com
```

#### 프록시/방화벽 설정
```cmd
# 회사 네트워크의 경우 프록시 설정
git config --global http.proxy http://proxy.company.com:8080
git config --global https.proxy https://proxy.company.com:8080

# 방화벽 임시 비활성화 (테스트용)
netsh advfirewall set allprofiles state off
```

---

## 🐍 Python 설치 문제

### 문제: Python 설치 실패
```
ERROR: Python installation failed.
```

**해결 방법:**

#### 수동 설치
```cmd
# 1. Python 공식 사이트에서 다운로드
# https://www.python.org/downloads/release/python-3119/

# 2. 설치 옵션 확인
# - "Add Python to PATH" 체크
# - "Install for all users" 체크 (선택사항)

# 3. 설치 확인
python --version
pip --version
```

#### 기존 Python 충돌 해결
```cmd
# 기존 Python 경로 확인
where python

# 환경 변수 정리
# 시스템 속성 > 고급 > 환경 변수에서 PATH 정리

# Python 재설치
```

---

## 📦 패키지 설치 문제

### 문제: pip 패키지 설치 실패
```
ERROR: Package installation failed.
```

**해결 방법:**

#### 타임아웃 증가
```cmd
pip install -r requirements.txt --timeout 300
```

#### 미러 서버 사용
```cmd
pip install -r requirements.txt -i https://pypi.org/simple/
```

#### 개별 패키지 설치
```cmd
# requirements.txt 내용을 하나씩 설치
pip install fastapi
pip install uvicorn
pip install websockets
# ... 기타 패키지들
```

---

## 🔨 빌드 오류

### 문제: PyInstaller 빌드 실패
```
ERROR: Server build failed.
```

**해결 방법:**

#### 가상환경 재생성
```cmd
# 기존 가상환경 삭제
rmdir /s venv

# 새 가상환경 생성
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
pip install pyinstaller
```

#### 메모리 부족 해결
```cmd
# 시스템 메모리 확인
wmic computersystem get TotalPhysicalMemory

# 가상 메모리 증가
# 시스템 속성 > 고급 > 성능 설정 > 고급 > 가상 메모리
```

### 문제: Electron 빌드 실패
```
ERROR: Electron build failed.
```

**해결 방법:**

#### Node.js 버전 확인
```cmd
node --version  # v18.20.4 권장
npm --version   # 10.x 권장
```

#### 캐시 정리
```cmd
npm cache clean --force
rmdir /s node_modules
npm install
```

#### 메모리 증가
```cmd
# Node.js 메모리 한계 증가
set NODE_OPTIONS=--max_old_space_size=4096
npm run electron:build:win
```

---

## 🔐 권한 문제

### 문제: 관리자 권한 필요
```
ERROR: Access denied.
```

**해결 방법:**

#### 관리자 권한으로 실행
```cmd
# 1. 명령 프롬프트를 관리자 권한으로 실행
# 2. 스크립트 실행

# 또는 PowerShell 사용
Start-Process cmd -Verb RunAs
```

#### 사용자 권한 설치
```cmd
# Python 사용자 설치
python-installer.exe /quiet InstallAllUsers=0 PrependPath=1

# Node.js 사용자 설치 (ZIP 버전 사용)
```

---

## 🛡️ 바이러스 백신 문제

### 문제: 바이러스 백신이 파일을 차단
```
WARNING: File could not be created.
```

**해결 방법:**

#### 예외 설정 추가
```
1. 바이러스 백신 설정 열기
2. 예외/화이트리스트에 다음 추가:
   - C:\Users\[사용자명]\AppData\Local\Temp\
   - 빌드 디렉토리 경로
   - linkband-server-windows.exe
```

#### 실시간 검사 임시 비활성화
```
빌드 중에만 실시간 검사 비활성화 (완료 후 재활성화)
```

---

## 🔍 디버깅 방법

### 상세 로그 확인
```cmd
# Python 빌드 로그
pyinstaller --onefile --name linkband-server-windows run_server.py --log-level DEBUG

# npm 빌드 로그
npm run electron:build:win --verbose
```

### 시스템 정보 수집
```cmd
# 시스템 정보
systeminfo

# 설치된 소프트웨어 확인
wmic product get name,version

# 환경 변수 확인
set
```

---

## 📞 추가 지원

### 로그 파일 위치
```
- Python 빌드: %TEMP%\pyinstaller\
- Electron 빌드: electron-app\release\
- npm 로그: %APPDATA%\npm-cache\_logs\
```

### 문의하기
문제가 해결되지 않으면 다음 정보와 함께 문의해주세요:
- Windows 버전 (`winver` 명령어 결과)
- 오류 메시지 전문
- 시스템 사양 (RAM, CPU)
- 네트워크 환경 (회사/개인, 프록시 사용 여부)

**GitHub Issues:** https://github.com/LooxidLabs/link_band_sdk/issues

---

## 📋 체크리스트

빌드 전 확인사항:
- [ ] 관리자 권한으로 실행
- [ ] 인터넷 연결 확인
- [ ] 방화벽/바이러스 백신 설정 확인
- [ ] 최소 4GB RAM 여유 공간
- [ ] 5GB 이상 디스크 여유 공간
- [ ] Windows 10 이상 (64-bit)

**참고:** 이 가이드는 Link Band SDK v1.0.1 기준으로 작성되었습니다. 