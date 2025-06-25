# Link Band SDK Installation Guide

Link Band SDK는 Looxid Labs의 차세대 초경량 뇌파 밴드(Link Band 2.0)를 위한 개발 도구입니다.

## 🎯 설치 방법

### 자동 설치 (권장)

각 플랫폼별 설치 스크립트를 사용하여 Python과 SDK를 자동으로 설치할 수 있습니다.

#### macOS

**방법 1: 더블클릭 설치 (가장 쉬움)**
1. [install-macos.command](install-macos.command) 파일을 다운로드
2. 파일을 더블클릭하여 실행

**방법 2: 가상환경 설치 (Python 3.13+ 권장)**
1. [install-macos-venv.sh](install-macos-venv.sh) 파일을 다운로드
2. 터미널에서 `chmod +x install-macos-venv.sh && ./install-macos-venv.sh` 실행
3. 시스템 Python과 완전히 분리된 전용 환경 생성

**방법 3: 설치 앱 사용**
1. [Link Band SDK Installer.app](Link%20Band%20SDK%20Installer.app) 다운로드
2. 앱을 더블클릭하여 실행

**방법 4: 터미널에서 자동 설치**
```bash
curl -fsSL https://raw.githubusercontent.com/Brian-Chae/link_band_sdk/main/installers/install-macos.sh | bash
```

**방법 5: 수동 다운로드 후 실행**
```bash
wget https://raw.githubusercontent.com/Brian-Chae/link_band_sdk/main/installers/install-macos.sh
chmod +x install-macos.sh
./install-macos.sh
```

#### Windows

PowerShell을 관리자 권한으로 실행 후:
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Brian-Chae/link_band_sdk/main/installers/install-windows.bat" -OutFile "install-windows.bat"
.\install-windows.bat
```

또는 [install-windows.bat](install-windows.bat) 파일을 다운로드하여 실행

#### Linux

```bash
curl -fsSL https://raw.githubusercontent.com/Brian-Chae/link_band_sdk/main/installers/install-linux.sh | bash
```

또는 파일을 다운로드 후 실행:
```bash
wget https://raw.githubusercontent.com/Brian-Chae/link_band_sdk/main/installers/install-linux.sh
chmod +x install-linux.sh
./install-linux.sh
```

## 📋 설치 과정

자동 설치 스크립트는 다음 단계를 수행합니다:

1. **Python 확인/설치**
   - Python 3.9 이상 버전 확인
   - 필요시 Python 자동 설치

2. **Python 의존성 설치**
   - numpy, scipy, matplotlib
   - mne, heartpy
   - fastapi, uvicorn, websockets

3. **Link Band SDK 다운로드 및 설치**
   - 플랫폼별 최신 버전 다운로드
   - 자동 설치 및 바로가기 생성

4. **환경 설정**
   - 데스크톱 바로가기 생성
   - PATH 설정 (Linux)

## 🔧 수동 설치

자동 설치가 실패하는 경우 수동으로 설치할 수 있습니다:

### 1단계: Python 설치

#### macOS
```bash
# Homebrew 설치 (없는 경우)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Python 설치
brew install python
```

#### Windows
[Python 공식 웹사이트](https://www.python.org/downloads/)에서 Python 3.9+ 다운로드 및 설치
- ⚠️ **중요**: 설치 시 "Add Python to PATH" 체크박스 선택

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

#### Linux (Fedora/RHEL/CentOS)
```bash
sudo dnf install python3 python3-pip
```

#### Linux (Arch/Manjaro)
```bash
sudo pacman -S python python-pip
```

### 2단계: Python 의존성 설치

```bash
pip3 install numpy scipy matplotlib mne heartpy fastapi uvicorn websockets
```

### 3단계: Link Band SDK 다운로드

[GitHub Releases](https://github.com/Brian-Chae/link_band_sdk/releases/latest)에서 플랫폼에 맞는 파일 다운로드:

- **macOS (Intel)**: `Link-Band-SDK-1.0.0.dmg`
- **macOS (Apple Silicon)**: `Link-Band-SDK-1.0.0-arm64.dmg`
- **Windows**: `Link-Band-SDK-Setup-1.0.0.exe`
- **Linux (x64)**: `Link-Band-SDK-1.0.0.AppImage`
- **Linux (ARM64)**: `Link-Band-SDK-1.0.0-arm64.AppImage`

### 4단계: 설치 및 실행

#### macOS
1. DMG 파일을 더블클릭하여 마운트
2. `Link Band SDK.app`을 Applications 폴더로 드래그
3. Applications 폴더에서 실행

#### Windows
1. EXE 파일을 더블클릭하여 설치 마법사 실행
2. 설치 완료 후 시작 메뉴에서 실행

#### Linux
1. AppImage 파일에 실행 권한 부여: `chmod +x Link-Band-SDK-1.0.0.AppImage`
2. 파일을 더블클릭하거나 터미널에서 실행

## 🚀 첫 실행

1. Link Band SDK를 실행합니다
2. 첫 실행 시 Python 서버 초기화에 몇 초가 소요될 수 있습니다
3. 웹 브라우저가 자동으로 열리며 SDK 인터페이스가 표시됩니다

## ❗ 문제 해결

### Python 관련 오류

**오류**: `python3: command not found`
- **해결**: Python이 설치되지 않았거나 PATH에 추가되지 않음. 위의 Python 설치 단계를 따라 재설치

**오류**: `pip3: command not found`
- **해결**: `python3 -m ensurepip --upgrade` 실행

**오류**: `externally-managed-environment` (Python 3.13+)
- **해결**: 가상환경 설치 방법 사용 (`install-macos-venv.sh`)
- **또는**: `pip3 install --break-system-packages --user [패키지명]` 사용

**오류**: `ModuleNotFoundError: No module named 'xxx'`
- **해결**: `pip3 install xxx` 실행하여 누락된 모듈 설치
- **Python 3.13+**: 가상환경 설치 방법 권장

### SDK 실행 오류

**오류**: 앱이 시작되지 않음
- **해결**: 터미널에서 직접 실행하여 오류 메시지 확인
- macOS: `/Applications/Link\ Band\ SDK.app/Contents/MacOS/Link\ Band\ SDK`
- Linux: `./Link-Band-SDK-1.0.0.AppImage`

**오류**: Python 서버 시작 실패
- **해결**: Python 의존성이 올바르게 설치되었는지 확인
- 터미널에서 `python3 -c "import numpy, scipy, mne"` 실행하여 테스트

### 권한 관련 오류 (macOS)

**오류**: "앱이 손상되어 열 수 없습니다"
- **해결**: 
  ```bash
  sudo xattr -rd com.apple.quarantine "/Applications/Link Band SDK.app"
  ```

## 📞 지원

- **GitHub Issues**: [https://github.com/Brian-Chae/link_band_sdk/issues](https://github.com/Brian-Chae/link_band_sdk/issues)
- **이메일**: support@looxidlabs.com
- **문서**: [https://github.com/Brian-Chae/link_band_sdk/wiki](https://github.com/Brian-Chae/link_band_sdk/wiki)

## 📝 라이센스

Copyright (c) 2025 Looxid Labs. All rights reserved. 