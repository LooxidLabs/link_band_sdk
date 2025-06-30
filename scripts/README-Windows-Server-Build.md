# Windows Server Build Guide (Enhanced)

Link Band SDK의 Windows용 서버 실행파일을 빌드하기 위한 개선된 가이드입니다.

## 빌드 스크립트 (Enhanced Versions)

### 1. build-windows-server-simple.bat (권장 - Enhanced)
완전 자동화된 빌드 스크립트입니다. 개선된 버전은 다음 기능을 포함합니다:
- **네트워크 연결 체크**: 인터넷 및 PyPI 연결 상태 확인
- **향상된 에러 처리**: 상세한 디버그 정보와 해결책 제공
- **재시도 로직**: 설치 실패 시 자동 재시도
- **빌드 정보 생성**: BUILD_INFO.txt 파일 자동 생성

**사용법:**
```cmd
cd link_band_sdk
scripts\build-windows-server-simple.bat
```

**기능:**
- **환경 검증**: Python, pip, PowerShell 가용성 체크
- **네트워크 체크**: 인터넷 연결 및 PyPI 접근성 확인
- **가상환경 관리**: 자동 생성 및 활성화
- **의존성 설치**: 타임아웃 및 재시도 로직 포함
- **빌드 실행**: PyInstaller를 통한 실행파일 생성
- **배포 준비**: distribution 디렉토리 자동 생성
- **테스트 실행**: 빌드된 실행파일 자동 테스트
- **빌드 정보**: 상세한 빌드 정보 파일 생성

### 2. build-windows-server-quick.bat (Enhanced)
이미 환경이 설정된 경우를 위한 개선된 빠른 빌드 스크립트입니다.
- **빌드 진행 상황**: 각 단계별 상세한 디버그 정보
- **에러 감지**: 향상된 에러 감지 및 문제 해결 가이드
- **자동 정리**: 빌드 후 자동 정리 및 최적화

**사용법:**
```cmd
cd link_band_sdk
scripts\build-windows-server-quick.bat
```

**전제조건:**
- Python 3.8+ 설치됨
- PyInstaller 설치됨
- 가상환경 설정 완료

## 빌드 결과

빌드가 성공하면 다음 위치에 실행파일과 빌드 정보가 생성됩니다:
```
python_core/distribution/v1.0.2/windows/
├── linkband-server-windows-v1.0.2.exe  # 서버 실행파일
├── BUILD_INFO.txt                       # 빌드 정보 (새로 추가)
└── database/                           # 데이터베이스 디렉토리 (있는 경우)
```

**BUILD_INFO.txt 파일에는 다음 정보가 포함됩니다:**
- 빌드 날짜 및 시간
- 사용된 Python 버전
- 빌드 방법 (Enhanced/Quick)
- 생성된 파일 목록 및 크기

## 실행 방법

빌드된 서버를 실행하려면:
```cmd
cd python_core\distribution\v1.0.2\windows
linkband-server-windows-v1.0.2.exe
```

서버가 시작되면:
- REST API: http://localhost:8121
- WebSocket: ws://localhost:18765

## 문제 해결 (Enhanced)

### 네트워크 연결 문제
Enhanced 스크립트는 자동으로 네트워크 연결을 체크합니다:
```cmd
# 수동 체크 방법
ping 8.8.8.8
ping pypi.org
```

### PyInstaller 설치 오류
Enhanced 스크립트는 자동 재시도를 포함하지만, 수동 해결 방법:
```cmd
pip install --upgrade pip
pip cache purge
pip install pyinstaller --timeout 300
```

### 의존성 설치 오류
Enhanced 스크립트는 타임아웃과 재시도 로직을 포함하지만, 수동 해결 방법:
```cmd
cd python_core
pip install -r requirements.txt --timeout 300 --retries 3
```

### 빌드 실패
1. **가상환경 재생성** (Enhanced 스크립트가 자동 처리):
   ```cmd
   cd python_core
   rmdir /s venv
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **캐시 및 빌드 정리** (Enhanced 스크립트가 자동 처리):
   ```cmd
   rmdir /s build
   rmdir /s dist
   pip cache purge
   ```

3. **디버그 정보 확인**:
   Enhanced 스크립트는 상세한 디버그 정보를 제공합니다. `DEBUG:` 메시지를 확인하여 어느 단계에서 실패했는지 파악하세요.

### Windows Defender 경고
빌드된 실행파일이 Windows Defender에 의해 차단될 수 있습니다. 이는 PyInstaller로 빌드된 실행파일의 일반적인 현상입니다. 안전한 파일이므로 예외 처리하거나 허용해주세요.

## 시스템 요구사항

- Windows 10 이상
- Python 3.8 이상
- 최소 4GB RAM
- 1GB 이상의 여유 디스크 공간

## 빌드 시간

- 첫 번째 빌드: 10-15분 (의존성 다운로드 포함)
- 후속 빌드: 3-5분

## 지원

빌드 관련 문제가 있으면 다음을 확인해주세요:
1. Python 버전 (3.8 이상)
2. 인터넷 연결 상태
3. 디스크 여유 공간
4. Windows Defender 설정 