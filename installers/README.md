# Link Band SDK 설치 가이드

Link Band SDK는 Looxid Labs의 차세대 초경량 뇌파 밴드(Link Band 2.0)를 위한 통합 개발 환경입니다.

## 🚀 빠른 설치 (권장)

### 통합 설치 스크립트 사용

**모든 플랫폼에서 동일한 명령어로 설치 가능:**

```bash
# 저장소 클론
git clone https://github.com/Brian-Chae/link_band_sdk.git
cd link_band_sdk/installers

# 통합 설치 스크립트 실행
bash install-linkband.sh
```

**특징:**
- ✅ 플랫폼 자동 감지 (macOS Intel/ARM, Linux, Windows/WSL)
- ✅ Python 환경 자동 구성 및 의존성 설치
- ✅ **로컬 소스코드에서 자동 빌드 및 설치**
- ✅ Node.js 환경 자동 설정
- ✅ 설치 검증 및 상세한 로그

## 📋 설치 과정

통합 스크립트는 다음 순서로 작동합니다:

1. **플랫폼 감지**: macOS (Intel/ARM), Linux, Windows 자동 감지
2. **시스템 요구사항 확인**: 디스크 공간, 포트 사용 여부 등
3. **Python 환경 구성**: Python 3.9+ 확인 및 가상환경 생성
4. **의존성 설치**: NumPy, SciPy, FastAPI 등 필수 패키지
5. **SDK 설치**: 
   - 로컬 설치 파일이 있으면 사용
   - 없으면 **로컬 소스에서 빌드 후 설치**
6. **설치 검증**: 모든 구성 요소 정상 작동 확인

## 🔧 플랫폼별 로컬 빌드 설치 (고급 사용자)

통합 스크립트 대신 각 플랫폼별 빌드 스크립트를 직접 사용할 수도 있습니다:

### macOS
```bash
bash legacy/build-and-install-macos.sh
```

**과정:**
1. Node.js 18+ 및 Python 3.9+ 확인
2. 의존성 설치 (npm install, pip install)
3. Electron 앱 빌드 (`npm run electron:build:mac`)
4. DMG 파일 생성 및 자동 설치
5. Applications 폴더 및 데스크톱 바로가기 생성

### Linux
```bash
bash legacy/build-and-install-linux.sh
```

**과정:**
1. 배포판별 패키지 관리자로 의존성 설치
2. Electron 시스템 라이브러리 설치
3. Electron 앱 빌드 (`npm run electron:build:linux`)
4. AppImage 파일 생성 및 설치
5. 데스크톱 엔트리 생성

### Windows
```cmd
legacy\build-and-install-windows.bat
```

**과정:**
1. Node.js 및 Python 환경 확인
2. 의존성 설치
3. Electron 앱 빌드 (`npm run electron:build:win`)
4. NSIS 설치 프로그램 생성 및 실행
5. 시작 메뉴 및 데스크톱 바로가기 생성

## 📦 수동 설치

자동 빌드가 실패하는 경우 수동으로 빌드할 수 있습니다:

### 1. 개발 환경 설정
```bash
# Python 의존성 설치
cd link_band_sdk
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate.bat
pip install -r requirements.txt

# Node.js 의존성 설치
cd electron-app
npm install
```

### 2. 플랫폼별 빌드
```bash
# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux

# Windows
npm run electron:build:win
```

### 3. 빌드 결과물
- **macOS**: `electron-app/release/*.dmg`
- **Linux**: `electron-app/release/*.AppImage`
- **Windows**: `electron-app/release/*.exe`

## 🐛 문제 해결

### 터미널이 갑자기 닫히는 경우
- ✅ **해결됨**: 최신 통합 스크립트에서 `set -e` 옵션 제거로 해결

### Node.js 버전 문제
```bash
# Node.js 18+ 필요
node --version  # v18.0.0 이상 확인

# macOS
brew install node

# Ubuntu/Debian
sudo apt install nodejs npm

# Windows
# https://nodejs.org에서 다운로드
```

### Python 의존성 충돌
```bash
# 가상환경 재생성
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Electron 빌드 실패
```bash
# 캐시 정리 후 재빌드
cd electron-app
rm -rf node_modules dist dist-electron release
npm install
npm run electron:build:mac  # 또는 해당 플랫폼
```

### macOS "손상된 파일" 오류
- ✅ **해결됨**: Developer ID Application 인증서로 코드 서명 완료
- 추가 보안 설정이 필요한 경우: `시스템 설정 > 개인정보 보호 및 보안`에서 허용

### 디버그 모드
상세한 로그가 필요한 경우:
```bash
DEBUG=1 bash install-linkband.sh
```

## 🚀 설치 후 실행

설치가 완료되면 다음 방법으로 실행할 수 있습니다:

### SDK 앱 실행 (빌드된 버전)
- **macOS**: Applications 폴더 또는 Spotlight에서 "Link Band SDK" 검색
- **Linux**: 애플리케이션 메뉴에서 "Link Band SDK" 검색 또는 `~/Applications/LinkBandSDK.AppImage` 실행
- **Windows**: 시작 메뉴에서 "Link Band SDK" 검색

### 개발 모드 실행 (개발자용)
```bash
cd link_band_sdk/electron-app
npm run electron:preview
```

## 📊 시스템 요구사항

### 기본 요구사항
- **Python**: 3.9 이상
- **Node.js**: 18 이상
- **디스크 공간**: 최소 2GB (빌드 과정 포함)
- **메모리**: 최소 4GB RAM

### 플랫폼별 추가 요구사항

#### macOS
- macOS 10.15 (Catalina) 이상
- Xcode Command Line Tools (자동 설치됨)

#### Linux
- 최신 배포판 (Ubuntu 20.04+, Fedora 35+, Arch Linux 등)
- 시스템 라이브러리 (자동 설치됨)

#### Windows
- Windows 10 이상
- Visual Studio Build Tools (Node.js 설치 시 자동 설치 옵션)

## 🔄 업데이트

SDK는 자동 업데이트를 지원합니다:
- 앱 시작 시 자동으로 업데이트 확인
- 새 버전 발견 시 다운로드 및 설치 안내

수동 업데이트:
```bash
# 최신 코드로 재빌드
git pull
bash install-linkband.sh
```

## 🏗️ 개발자 정보

### 빌드 구성
- **Frontend**: Electron + React + TypeScript
- **Backend**: Python FastAPI + WebSocket
- **빌드 도구**: electron-builder
- **패키징**: DMG (macOS), AppImage (Linux), NSIS (Windows)

### 빌드 설정 파일
- `electron-app/electron-builder.json`: Electron Builder 설정
- `electron-app/package.json`: npm 스크립트 및 의존성
- `requirements.txt`: Python 의존성

## 📞 지원

문제가 발생하면 다음 정보와 함께 이슈를 등록해주세요:
- 운영체제 및 버전
- Node.js 버전 (`node --version`)
- Python 버전 (`python3 --version`)
- 빌드 로그 (DEBUG=1 모드 실행 결과)

**GitHub Issues**: https://github.com/Brian-Chae/link_band_sdk/issues 