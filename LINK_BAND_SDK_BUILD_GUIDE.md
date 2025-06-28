# Link Band SDK 빌드 가이드 v1.0.2

## 📋 목차
1. [개요](#개요)
2. [아키텍처 구조](#아키텍처-구조)
3. [개발 환경 설정](#개발-환경-설정)
4. [빌드 과정 개요](#빌드-과정-개요)
5. [단계별 빌드 가이드](#단계별-빌드-가이드)
6. [플랫폼별 빌드 방법](#플랫폼별-빌드-방법)
7. [배포 패키징](#배포-패키징)
8. [트러블슈팅](#트러블슈팅)

---

## 개요

Link Band SDK는 Looxid Labs의 차세대 초경량 뇌파 밴드(Link Band 2.0)를 위한 SDK입니다.

### 아키텍처
- **Frontend**: Electron + React + TypeScript
- **Backend**: Python FastAPI
- **데이터 전송**: WebSocket (localhost:18765)
- **API**: REST API (localhost:8121)

### 실행 모드
1. **개발 모드**: `npm run electron:preview` - 실시간 코드 변경 반영
2. **프로덕션 모드**: 빌드된 standalone 실행파일 사용

## 빌드 과정

### 전체 빌드 흐름
```
1단계: Python 서버 빌드 (PyInstaller)
2단계: Electron 앱 빌드 (electron-builder)  
3단계: 배포 파일 정리
```

### 빌드 결과물 (v1.0.2)
- **Windows**: `linkband-server-windows-v1.0.2.exe`
- **macOS ARM64**: `linkband-server-macos-arm64-v1.0.2`
- **macOS Intel**: `linkband-server-macos-intel-v1.0.2`
- **Linux**: `linkband-server-linux-v1.0.2`

### 📤 Git LFS 대용량 파일 관리
빌드된 실행파일(50MB+)은 Git LFS로 자동 관리됩니다:
- **자동 추가**: 10MB 이상 파일 자동 LFS 처리
- **효율적 저장**: GitHub 권장 크기 제한 준수
- **빠른 클론**: 대용량 파일 별도 관리로 저장소 경량화

---

## 아키텍처 구조

```
Link Band SDK
├── Frontend (Electron App)
│   ├── React + TypeScript UI
│   ├── Material-UI 컴포넌트
│   ├── Zustand 상태 관리
│   └── WebSocket 클라이언트
│
├── Backend (Python Server)
│   ├── FastAPI REST API
│   ├── WebSocket 서버 (포트 18765)
│   ├── 블루투스 디바이스 관리
│   ├── 실시간 데이터 처리
│   └── SQLite 데이터베이스
│
└── Distribution
    ├── Windows (.exe + installer)
    ├── macOS (.dmg - ARM64/Intel)
    └── Linux (.AppImage)
```

---

## 개발 환경 설정

### 필수 요구사항

#### 모든 플랫폼
- **Node.js**: 18.x 이상
- **Python**: 3.9 이상
- **Git**: 최신 버전
- **인터넷 연결**: 의존성 다운로드용

#### 플랫폼별 요구사항

**Windows**
- Windows 10/11 64-bit
- Visual Studio Build Tools (선택사항)
- 관리자 권한 (일부 빌드 작업)

**macOS**
- macOS 10.15+ (Catalina 이상)
- Xcode Command Line Tools
- Apple Developer ID (배포용 코드 서명)

**Linux**
- Ubuntu 20.04+ 또는 호환 배포판
- `build-essential`, `python3-dev` 패키지

### 초기 설정

```bash
# 1. 저장소 클론
git clone https://github.com/LooxidLabs/link_band_sdk.git
cd link_band_sdk

# 2. Python 의존성 설치
cd python_core
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Node.js 의존성 설치
cd ../electron-app
npm install

# 4. 개발 서버 실행 테스트
npm run electron:preview
```

---

## 단계별 빌드 가이드

### 1단계: Python 서버 빌드

#### Windows
```bash
cd python_core
python build_windows_server_mne.py
```
**출력**: `dist/linkband-server-windows-fixed.exe`

#### macOS
```bash
cd python_core
# 자동화 빌드 스크립트 사용 (권장)
./build_standalone.sh

# 또는 특정 spec 파일 사용
pyinstaller linkband-server-macos-arm64-final.spec --clean  # ARM64
pyinstaller linkband-server-macos-x64.spec --clean          # Intel
```

#### Linux
```bash
cd python_core
pyinstaller --onefile --name linkband-server-linux run_server.py
```

### 2단계: Electron 앱 빌드

```bash
cd electron-app

# 모든 플랫폼 빌드
npm run electron:build

# 플랫폼별 빌드
npm run electron:build:mac    # macOS
npm run electron:build:win    # Windows
npm run electron:build:linux  # Linux
```

### 3단계: 배포 파일 정리

```bash
# 자동화된 배포 빌드 (권장)
cd scripts
./build-for-distribution.sh
```

---

## 플랫폼별 빌드 방법

### Windows 빌드

#### 자동 빌드 (권장)
```bash
cd scripts
# 완전 자동화 빌드 (Python/Node.js 자동 설치 포함)
./build-linkband-complete-windows-fixed.bat

# 빠른 빌드 (기존 환경 사용)
./build-linkband-quick.bat
```

#### 수동 빌드
```bash
# 1. Python 서버 빌드
cd python_core
python build_windows_server_mne.py

# 2. Electron 앱 빌드
cd ../electron-app
npm run electron:build:win
```

**출력 파일**:
- `python_core/dist/linkband-server-windows-fixed.exe`
- `electron-app/release/LinkBandSDK-Setup-1.0.1.exe`

### macOS 빌드

#### 자동 빌드
```bash
cd scripts
./build-for-distribution.sh
```

#### 수동 빌드
```bash
# 1. Python 서버 빌드
cd python_core
./build_standalone.sh

# 2. Electron 앱 빌드
cd ../electron-app
npm run electron:build:mac

# 3. 코드 서명 (배포용)
codesign --force --sign "Developer ID Application: Looxid Labs Inc." \
  dist/linkband-server-macos-arm64-final
```

**출력 파일**:
- `python_core/dist/linkband-server-macos-arm64-final`
- `electron-app/release/LinkBandSDK-1.0.1-arm64.dmg`
- `electron-app/release/LinkBandSDK-1.0.1.dmg` (Intel)

### Linux 빌드

#### 자동 빌드
```bash
cd installers/devops/build-scripts
./build-and-install-linux.sh
```

#### 수동 빌드
```bash
# 1. 시스템 의존성 설치
sudo apt update
sudo apt install python3-dev build-essential

# 2. Python 서버 빌드
cd python_core
pyinstaller --onefile --name linkband-server-linux run_server.py

# 3. Electron 앱 빌드
cd ../electron-app
npm run electron:build:linux
```

**출력 파일**:
- `python_core/dist/linkband-server-linux`
- `electron-app/release/LinkBandSDK-1.0.1.AppImage`

---

## 배포 패키징

### 배포 파일 구조

```
installers/distribution/
├── windows/
│   ├── LinkBandSDK-Setup.exe
│   ├── linkband-server-windows.exe
│   ├── install-linkband.bat
│   └── README.md
│
├── macos-arm64/
│   ├── LinkBandSDK.dmg
│   ├── linkband-server-macos-arm64-final
│   ├── install-linkband.command
│   └── README.md
│
├── macos-intel/
│   ├── LinkBandSDK.dmg
│   ├── linkband-server-macos-x64
│   ├── install-linkband.command
│   └── README.md
│
└── linux/
    ├── LinkBandSDK.AppImage
    ├── linkband-server-linux
    ├── install-linkband.sh
    └── README.md
```

### 자동 배포 빌드

```bash
# 모든 플랫폼 배포 파일 생성
cd scripts
./build-for-distribution.sh

# 결과: installers/distribution/ 디렉토리에 정리된 배포 파일들
```

### 수동 배포 파일 정리

```bash
# 1. 배포 디렉토리 생성
mkdir -p installers/distribution/{windows,macos-arm64,macos-intel,linux}

# 2. 빌드된 파일들 복사
# Windows
cp electron-app/release/*Setup*.exe installers/distribution/windows/LinkBandSDK-Setup.exe
cp python_core/dist/linkband-server-windows-fixed.exe installers/distribution/windows/

# macOS
cp electron-app/release/*arm64.dmg installers/distribution/macos-arm64/LinkBandSDK.dmg
cp electron-app/release/*.dmg installers/distribution/macos-intel/LinkBandSDK.dmg
cp python_core/dist/linkband-server-macos-* installers/distribution/macos-*/

# Linux
cp electron-app/release/*.AppImage installers/distribution/linux/LinkBandSDK.AppImage
cp python_core/dist/linkband-server-linux installers/distribution/linux/
```

---

## 트러블슈팅

### 일반적인 문제

#### 1. Python 의존성 문제
```bash
# 해결방법: 가상환경 재생성
cd python_core
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### 2. Node.js 의존성 문제
```bash
# 해결방법: node_modules 재설치
cd electron-app
rm -rf node_modules package-lock.json
npm install
```

#### 3. PyInstaller 빌드 실패
```bash
# 해결방법: PyInstaller 재설치 및 캐시 정리
pip uninstall pyinstaller
pip install pyinstaller
pyinstaller --clean server.spec
```

### 플랫폼별 문제

#### Windows
- **인코딩 오류**: `build-linkband-windows-english-only.bat` 사용
- **권한 오류**: 관리자 권한으로 실행
- **Python 경로 오류**: PATH 환경변수 확인

#### macOS
- **코드 서명 오류**: Apple Developer ID 인증서 확인
- **권한 거부**: `sudo` 사용 또는 파일 권한 확인
- **아키텍처 불일치**: 타겟 아키텍처 명시적 지정

#### Linux
- **라이브러리 누락**: 개발 패키지 설치
- **권한 오류**: 파일 권한 및 소유권 확인
- **배포판 차이**: 타겟 배포판에서 테스트

### 빌드 검증

#### 기본 기능 테스트
```bash
# 서버 실행 테스트
./linkband-server-{platform} --help

# WebSocket 연결 테스트
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" \
  -H "Sec-WebSocket-Version: 13" \
  http://localhost:18765/

# REST API 테스트
curl http://localhost:8121/device/status
```

#### 통합 테스트
1. 서버 시작 확인
2. WebSocket 연결 (포트 18765)
3. REST API 엔드포인트 테스트
4. 디바이스 연결 기능 확인
5. 데이터 스트리밍 기능 테스트

---

## 빌드 스크립트 참고

### 주요 빌드 스크립트
- `scripts/build-for-distribution.sh`: 전체 배포 빌드
- `scripts/build-linkband-complete-windows-fixed.bat`: Windows 완전 자동 빌드
- `python_core/build_windows_server_mne.py`: Windows Python 서버 빌드
- `electron-app/package.json`: Electron 빌드 설정

### 설정 파일
- `electron-app/electron-builder.json`: Electron 빌드 설정
- `python_core/server.spec`: PyInstaller 설정
- `python_core/requirements.txt`: Python 의존성

---

## 버전 관리

### 버전 업데이트
1. `electron-app/package.json`의 version 필드 수정
2. `python_core/app/main.py`의 버전 정보 수정
3. 빌드 및 테스트
4. Git 태그 생성: `git tag v1.0.2`

### 릴리즈 노트
각 버전별 변경사항을 `RELEASE_TEMPLATE.md`에 기록하여 관리합니다.

---

**📝 참고**: 이 문서는 Link Band SDK v1.0.2 기준으로 작성되었습니다. 최신 정보는 프로젝트 저장소를 확인해주세요. 