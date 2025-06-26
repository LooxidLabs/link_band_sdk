# Link Band SDK - Windows Setup Guide

Windows에서 Link Band SDK 개발 환경을 설정하는 가이드입니다.

## 사전 요구사항

1. **Python 3.11+** - [python.org](https://python.org)에서 다운로드
   - ⚠️ 설치 시 "Add Python to PATH" 옵션을 체크하세요
   - `python3` 명령어가 사용 가능해야 합니다

2. **Node.js 18+** - [nodejs.org](https://nodejs.org)에서 다운로드
   - npm이 함께 설치됩니다

3. **Git** - [git-scm.com](https://git-scm.com)에서 다운로드 (선택사항)

## 빠른 설정 (권장)

1. **저장소 다운로드**
   ```bash
   git clone https://github.com/LooxidLabs/link_band_sdk.git
   cd link_band_sdk
   ```

2. **자동 설치 스크립트 실행**
   ```bash
   scripts\setup-windows-dev.bat
   ```
   
   이 스크립트는 다음을 자동으로 수행합니다:
   - Python 가상환경 생성
   - Python 패키지 설치 (FastAPI, MNE 등)
   - Node.js 패키지 설치

3. **앱 실행**
   ```bash
   cd electron-app
   npm run electron:preview
   ```

## 수동 설정

자동 스크립트가 실패하는 경우 수동으로 설정할 수 있습니다:

### 1. Python 환경 설정
```bash
cd python_core
python3 -m venv venv
venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

### 2. Node.js 환경 설정
```bash
cd electron-app
npm install
cd ..
```

### 3. 앱 실행
```bash
cd electron-app
npm run electron:preview
```

## 문제 해결

### Python 관련 문제

**"python3 is not recognized"**
- Python 설치 시 PATH에 추가되지 않았습니다
- 환경변수에서 Python 경로를 수동으로 추가하거나 Python을 재설치하세요

**"pip install failed"**
- 관리자 권한으로 실행해보세요
- 또는 `pip install --user -r requirements.txt` 사용

**"Virtual environment creation failed"**
- `python -m venv venv` 대신 `python3 -m venv venv` 사용
- 또는 `py -3 -m venv venv` 사용

### Node.js 관련 문제

**"npm install failed"**
- 네트워크 연결 확인
- `npm cache clean --force` 후 재시도
- `npm install --legacy-peer-deps` 사용

### Electron 앱 관련 문제

**"Python server failed to start"**
- Python 가상환경이 올바르게 설정되었는지 확인
- `python_core/venv/Scripts/python.exe`가 존재하는지 확인
- 수동으로 Python 서버 실행: `cd python_core && venv\Scripts\activate.bat && python run_server.py`

## 빌드 (배포용)

완전한 Windows 설치 파일을 만들려면:

```bash
scripts\build-windows-complete.bat
```

이 스크립트는 다음을 생성합니다:
- Python 서버 실행 파일 (`linkband-server-windows.exe`)
- Electron 앱 설치 파일 (`Link Band SDK Setup.exe`)

## 지원

문제가 발생하면 다음을 확인하세요:

1. **Python 버전**: `python3 --version` (3.11+ 필요)
2. **Node.js 버전**: `node --version` (18+ 권장)
3. **가상환경 상태**: `python_core/venv/Scripts/python.exe` 존재 여부
4. **패키지 설치 상태**: `pip list` (가상환경 활성화 후)

더 자세한 도움이 필요하면 GitHub Issues에 문의하세요. 