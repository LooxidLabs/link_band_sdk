# Link Band SDK Windows Build Guide

## 개요
이 가이드는 Windows에서 Link Band SDK v1.0.1을 완전히 빌드하고 설치하는 방법을 설명합니다.

## 시스템 요구사항
- Windows 10 이상 (64-bit)
- 관리자 권한 (소프트웨어 설치 시 필요)
- 인터넷 연결 (의존성 다운로드용)
- 최소 4GB RAM
- 5GB 이상 여유 디스크 공간

## 빌드 프로세스

### 1. 스크립트 다운로드
```bash
# GitHub에서 스크립트만 다운로드하거나
curl -O https://raw.githubusercontent.com/LooxidLabs/link_band_sdk/main/scripts/build-linkband-complete-windows.bat

# 또는 전체 저장소 클론
git clone https://github.com/LooxidLabs/link_band_sdk.git
cd link_band_sdk\scripts
```

### 2. 스크립트 실행
1. `build-linkband-complete-windows.bat` 파일을 **관리자 권한**으로 실행
2. 스크립트가 자동으로 다음을 수행합니다:
   - Python 3.11.9 설치 (필요시)
   - Node.js 18.20.4 LTS 설치 (필요시)
   - Git 설치 (필요시)
   - 최신 소스코드 다운로드
   - Python 서버 빌드
   - Electron 앱 빌드
   - 설치 패키지 생성

### 3. 빌드 결과물
빌드 완료 후 `output\windows\` 폴더에 다음 파일들이 생성됩니다:

```
output/windows/
├── linkband-server-windows.exe     # Python 백엔드 서버
├── Link Band SDK Setup 1.0.1.exe   # Electron 앱 설치 프로그램
├── install-linkband.bat             # 설치 스크립트 (선택사항)
├── README.md                        # 설치 가이드
└── BUILD_INFO.txt                   # 빌드 정보
```

## 설치 방법

### 방법 1: Electron 설치 프로그램 사용 (권장)
1. `Link Band SDK Setup 1.0.1.exe` 실행
2. 설치 마법사 따라 진행
3. 설치 완료 후 바탕화면 또는 시작 메뉴에서 실행

### 방법 2: 수동 설치
1. `linkband-server-windows.exe`를 원하는 폴더에 복사
2. 환경 변수 PATH에 해당 폴더 추가 (선택사항)
3. 명령 프롬프트에서 `linkband-server-windows.exe` 실행

## 사용법

### 서버 시작
```cmd
# 기본 포트 (8000)로 시작
linkband-server-windows.exe

# 다른 포트로 시작
linkband-server-windows.exe --port 8080

# 도움말 보기
linkband-server-windows.exe --help
```

### Electron 앱 사용
1. 설치된 "Link Band SDK" 앱 실행
2. 자동으로 Python 서버가 시작됩니다
3. 웹 인터페이스가 열립니다

## 문제 해결

### 빌드 오류
**Python 설치 실패:**
- 관리자 권한으로 스크립트 실행 확인
- 수동으로 https://python.org 에서 Python 3.11.9 설치

**Node.js 설치 실패:**
- 관리자 권한으로 스크립트 실행 확인
- 수동으로 https://nodejs.org 에서 Node.js LTS 설치

**Git 설치 실패:**
- 관리자 권한으로 스크립트 실행 확인
- 수동으로 https://git-scm.com 에서 Git 설치

**소스코드 다운로드 실패:**
- 인터넷 연결 확인
- 방화벽/바이러스 백신 설정 확인
- GitHub 접근 권한 확인

### 실행 오류
**서버 시작 실패:**
```cmd
# 포트 충돌 확인
netstat -an | findstr :8000

# 다른 포트로 시작
linkband-server-windows.exe --port 8080
```

**권한 오류:**
- 관리자 권한으로 실행
- 바이러스 백신 예외 설정 추가

**DLL 오류:**
- Visual C++ Redistributable 설치
- Windows 업데이트 확인

## 고급 설정

### 환경 변수
```cmd
# 서버 포트 설정
set LINKBAND_PORT=8080

# 로그 레벨 설정
set LINKBAND_LOG_LEVEL=DEBUG

# 데이터 디렉토리 설정
set LINKBAND_DATA_DIR=C:\LinkBandData
```

### 서비스 등록 (선택사항)
```cmd
# Windows 서비스로 등록
sc create LinkBandServer binPath= "C:\path\to\linkband-server-windows.exe"
sc start LinkBandServer
```

## 지원

### 문서
- [API 문서](../docs/api/)
- [사용자 가이드](../docs/user-guide/)
- [예제 코드](../docs/examples/)

### 문의
- GitHub Issues: https://github.com/LooxidLabs/link_band_sdk/issues
- 이메일: support@looxidlabs.com

## 라이선스
이 소프트웨어는 Looxid Labs의 라이선스 하에 배포됩니다.

---

**참고:** 이 가이드는 Link Band SDK v1.0.1 기준으로 작성되었습니다. 최신 버전은 GitHub 저장소를 확인해주세요. 