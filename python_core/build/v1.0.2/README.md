# Link Band SDK Build System v1.0.2

이 디렉토리는 Link Band SDK v1.0.2의 빌드 설정과 스크립트를 포함합니다.

## 📁 디렉토리 구조

```
python_core/
├── build/
│   ├── build_server.sh           # 범용 빌드 스크립트 (Bash)
│   ├── build_server.py           # 범용 빌드 스크립트 (Python)
│   └── v1.0.2/                   # 버전별 설정
│       ├── build_config.sh       # Bash 설정 파일
│       ├── build_server_mac_arm64.sh     # macOS ARM64 전용 스크립트
│       ├── build_server_windows.py       # Windows 전용 스크립트
│       └── README.md             # 이 파일
└── distribution/
    └── v1.0.2/                   # 버전별 배포 파일
        ├── macos-arm64/
        ├── macos-intel/
        ├── windows/
        └── linux/
```

## 🚀 빌드 방법

### 1. 범용 빌드 스크립트 사용 (권장)

#### Bash 스크립트 (macOS/Linux)
```bash
# 기본 버전으로 빌드 (최신 버전 자동 선택)
./build/build_server.sh macos-arm64

# 특정 버전으로 빌드
./build/build_server.sh macos-arm64 1.0.2
./build/build_server.sh windows 1.0.2
./build/build_server.sh linux 1.0.2
```

#### Python 스크립트 (모든 플랫폼)
```bash
# 기본 버전으로 빌드
python build/build_server.py macos-arm64

# 특정 버전으로 빌드
python build/build_server.py windows 1.0.2
python build/build_server.py linux 1.0.2

# 도움말 보기
python build/build_server.py --help
```

### 2. 플랫폼별 전용 스크립트 사용

#### macOS ARM64
```bash
./build/v1.0.2/build_server_mac_arm64.sh
```

#### Windows
```bash
python build/v1.0.2/build_server_windows.py
```

## 🔧 설정 파일

### build_config.sh
버전별 빌드 설정을 정의하는 Bash 스크립트입니다.

**주요 설정:**
- `BUILD_VERSION`: 빌드 버전
- `BUILD_NAME`: 실행파일 기본 이름
- `REQUIRED_PACKAGES`: 필수 Python 패키지 목록
- `COMMON_HIDDEN_IMPORTS`: 모든 플랫폼 공통 hidden imports
- `PLATFORM_HIDDEN_IMPORTS`: 플랫폼별 hidden imports
- `PLATFORM_OPTIONS`: 플랫폼별 PyInstaller 옵션

## 📦 지원 플랫폼

| 플랫폼 | 식별자 | 설명 |
|--------|--------|------|
| macOS Apple Silicon | `macos-arm64` | M1/M2/M3 Mac |
| macOS Intel | `macos-intel` | Intel Mac |
| Windows | `windows` | Windows x64 |
| Linux | `linux` | Linux x64 |

## 🔍 빌드 결과

빌드가 성공하면 다음 위치에 실행파일이 생성됩니다:

```
distribution/v1.0.2/{platform}/linkband-server-{platform}-v1.0.2
```

**예시:**
- `distribution/v1.0.2/macos-arm64/linkband-server-macos-arm64-v1.0.2`
- `distribution/v1.0.2/windows/linkband-server-windows-v1.0.2.exe`

### 📤 Git LFS 자동 관리

빌드 스크립트는 10MB 이상의 대용량 실행파일을 자동으로 Git LFS에 추가합니다:

- **자동 감지**: 실행파일 크기가 10MB 초과시 자동으로 LFS 처리
- **Git 저장소 확인**: Git 저장소 내에서만 LFS 추가 실행
- **상대 경로 계산**: 저장소 루트 기준 상대 경로로 자동 추가
- **에러 처리**: LFS 추가 실패시 경고 메시지 출력

**수동 LFS 관리:**
```bash
# 특정 파일을 LFS에 추가
git lfs track "python_core/distribution/**/*"
git add .gitattributes
git add python_core/distribution/v1.0.2/macos-arm64/linkband-server-macos-arm64-v1.0.2
git commit -m "Add executable to LFS"

# LFS 상태 확인
git lfs ls-files
git lfs status
```

## ⚙️ 빌드 요구사항

### 사전 준비
1. **Python 가상환경 생성 및 활성화**
   ```bash
   cd python_core
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **의존성 설치**
   ```bash
   pip install -r requirements.txt
   pip install pyinstaller
   ```

### 필수 패키지
- `pyinstaller` - 실행파일 빌드
- `fastapi` - 웹 API 프레임워크
- `uvicorn` - ASGI 서버
- `websockets` - WebSocket 지원
- `bleak` - 블루투스 통신
- `numpy`, `scipy` - 수치 연산
- `mne` - 뇌파 신호 처리
- `matplotlib` - 데이터 시각화
- `sklearn` - 머신러닝
- `heartpy` - 심박 신호 처리
- `aiosqlite` - 비동기 SQLite
- `psutil` - 시스템 모니터링

## 🐛 문제 해결

### 일반적인 문제

1. **모듈 누락 오류**
   ```
   ModuleNotFoundError: No module named 'xxx'
   ```
   **해결:** `build_config.sh`의 `COMMON_HIDDEN_IMPORTS`에 누락된 모듈 추가

2. **빌드 실패**
   ```
   pyinstaller: command not found
   ```
   **해결:** 가상환경 활성화 후 `pip install pyinstaller`

3. **실행파일 크기가 너무 큼**
   - UPX 압축 활성화: `PLATFORM_OPTIONS`에서 `--upx=True` 설정
   - 불필요한 패키지 제거

4. **플랫폼별 모듈 오류**
   - `PLATFORM_HIDDEN_IMPORTS`에 플랫폼별 모듈 추가

### 디버깅

1. **상세 빌드 로그 확인**
   ```bash
   pyinstaller --log-level DEBUG [spec_file]
   ```

2. **임시 파일 보존**
   - `build/temp` 디렉토리의 임시 파일 확인
   - spec 파일 내용 검토

## 🔄 새 버전 추가

새로운 버전을 추가하려면:

1. **버전 디렉토리 생성**
   ```bash
   mkdir build/v1.0.3
   ```

2. **설정 파일 복사 및 수정**
   ```bash
   cp build/v1.0.2/build_config.sh build/v1.0.3/
   # build_config.sh에서 BUILD_VERSION="1.0.3"으로 수정
   ```

3. **배포 디렉토리 생성**
   ```bash
   mkdir -p distribution/v1.0.3/{macos-arm64,macos-intel,windows,linux}
   ```

## 📝 버전 히스토리

### v1.0.2 (2024-12-19)
- MNE 패키지 완전 지원
- aiosqlite 의존성 추가
- 플랫폼별 최적화 옵션 추가
- 범용 빌드 스크립트 도입
- 버전별 설정 관리 시스템 구축

## 🤝 기여

빌드 시스템 개선사항이나 새로운 플랫폼 지원이 필요한 경우:

1. 새로운 플랫폼 설정을 `build_config.sh`에 추가
2. 플랫폼별 hidden imports 및 옵션 정의
3. 테스트 후 문서 업데이트

---

**📞 문의사항**
빌드 관련 문제가 있으면 개발팀에 문의하세요. 