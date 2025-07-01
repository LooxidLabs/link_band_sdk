# Windows Server Build Scripts

Link Band SDK의 Windows 서버 빌드를 위한 스크립트 모음입니다.

## 📋 Available Scripts

### 1. `build-windows-server-safe.bat` ⭐ **RECOMMENDED**
- **가장 안전하고 간단한 버전**
- 특수 문자 처리 문제 완전 해결
- UTF-8 인코딩 지원
- 단계별 명확한 진행 상황 표시
- 최소한의 복잡성으로 안정적 빌드

```bash
# 사용법
cd link_band_sdk
scripts\build-windows-server-safe.bat
```

### 2. `build-windows-server-simple.bat`
- 향상된 오류 처리 및 디버깅
- 네트워크 연결 확인
- 타임아웃 처리가 포함된 설치
- 강력한 의존성 관리

### 3. `build-windows-server-quick.bat`
- 사전 구성된 환경용 빠른 빌드
- 향상된 오류 감지 및 문제 해결 가이드
- 빌드 진행률 표시기
- 자동 정리 및 최적화

### 4. `build-windows-server-fallback.bat`
- 누락된 프로덕션 파일에 대한 대체 옵션
- 대체 서버 파일 자동 감지 (`run_server.py`, `server.py`, `main.py`)
- 상세한 디버깅 및 대체 옵션

### 5. `build-windows-server-enhanced.bat` 🔧 **FOR DEPENDENCY ISSUES**
- **aiosqlite 의존성 문제 해결 특화**
- 포괄적인 의존성 수집 및 검증
- 빌드 전 모듈 import 테스트
- 강화된 PyInstaller 설정
- 실행파일 생성 후 의존성 검증

## 🚨 특수 문자 오류 해결

만약 다음과 같은 오류가 발생한다면:
```
:은(는) 예상되지 않았습니다.
```

**해결 방법:**

1. **`build-windows-server-safe.bat` 사용** (권장)
   - 이 스크립트는 특수 문자 문제를 완전히 해결했습니다.

2. **명령 프롬프트 인코딩 설정**
   ```cmd
   chcp 65001
   scripts\build-windows-server-safe.bat
   ```

3. **PowerShell 사용**
   ```powershell
   # PowerShell에서 실행
   .\scripts\build-windows-server-safe.bat
   ```

## 🔧 System Requirements

- **Python 3.8+** (PATH에 추가되어 있어야 함)
- **pip** (Python과 함께 설치됨)
- **Internet connection** (의존성 다운로드용)
- **Windows 10/11**

## 📁 Build Output

빌드 성공 시 다음 위치에 파일이 생성됩니다:

```
python_core/
├── distribution/
│   └── v1.0.2/
│       └── windows/
│           ├── linkband-server-windows-v1.0.2.exe
│           ├── database/ (있는 경우)
│           └── BUILD_INFO.txt
└── dist/
    └── linkband-server-windows-v1.0.2.exe
```

## 🚀 Usage Instructions

### Step 1: 프로젝트 루트에서 실행
```cmd
cd C:\path\to\link_band_sdk
```

### Step 2: 빌드 스크립트 실행
```cmd
scripts\build-windows-server-safe.bat
```

### Step 3: 빌드 결과 확인
```cmd
cd python_core\distribution\v1.0.2\windows
linkband-server-windows-v1.0.2.exe
```

## 🔍 Troubleshooting

### 문제 1: Python을 찾을 수 없음
```
ERROR: Python not found
```
**해결책:**
1. Python 3.8+ 설치: https://python.org
2. 설치 시 "Add Python to PATH" 체크
3. 명령 프롬프트 재시작

### 문제 2: 의존성 설치 실패
```
ERROR: Failed to install requirements
```
**해결책:**
1. 인터넷 연결 확인
2. 방화벽/프록시 설정 확인
3. 수동 설치: `pip install --upgrade pip`

### 문제 3: PyInstaller 빌드 실패
```
ERROR: Build failed
```
**해결책:**
1. 가상환경 재생성: `rmdir /s venv`
2. 캐시 정리: `pip cache purge`
3. PyInstaller 업그레이드: `pip install --upgrade pyinstaller`

### 문제 4: 서버 파일 없음
```
ERROR: No server file found
```
**해결책:**
1. 최신 코드 받기: `git pull origin main`
2. 다음 파일 중 하나 필요:
   - `run_server_production.py` (권장)
   - `run_server.py` (개발용)
   - `main.py` (기본)

### 문제 5: aiosqlite 모듈 없음 🔥
```
로그 시스템 초기화 실패: No module named 'aiosqlite'
서버 시작 실패: No module named 'aiosqlite'
```
**해결책:**
1. **Enhanced 스크립트 사용** (가장 효과적):
   ```cmd
   scripts\build-windows-server-enhanced.bat
   ```
2. **수동 의존성 확인**:
   ```cmd
   cd python_core
   venv\Scripts\activate
   python -c "import aiosqlite; print('OK')"
   ```
3. **강제 재설치**:
   ```cmd
   pip uninstall aiosqlite -y
   pip install aiosqlite --force-reinstall
   ```

## 📊 Build Performance

| Script | Build Time | Features | Stability | Use Case |
|--------|------------|----------|-----------|----------|
| safe | ~3-5분 | 기본 + UTF-8 | ⭐⭐⭐⭐⭐ | 첫 번째 빌드 |
| simple | ~5-8분 | 고급 + 네트워크 체크 | ⭐⭐⭐⭐ | 일반적인 빌드 |
| quick | ~2-4분 | 빠른 + 사전구성 | ⭐⭐⭐ | 개발 중 빠른 빌드 |
| fallback | ~4-6분 | 대체 + 디버깅 | ⭐⭐⭐⭐ | 파일 누락 시 |
| enhanced | ~6-10분 | 의존성 해결 + 검증 | ⭐⭐⭐⭐⭐ | **aiosqlite 오류 시** |

## 🎯 Recommendations

1. **첫 번째 빌드**: `build-windows-server-safe.bat` 사용
2. **aiosqlite 오류 발생**: `build-windows-server-enhanced.bat` 사용 🔥
3. **개발 중 빠른 빌드**: `build-windows-server-quick.bat` 사용
4. **문제 발생 시**: `build-windows-server-fallback.bat` 사용
5. **고급 기능 필요**: `build-windows-server-simple.bat` 사용

## 📝 Notes

- 모든 스크립트는 UTF-8 인코딩을 지원합니다
- 가상환경을 자동으로 생성하고 관리합니다
- 빌드 정보는 `BUILD_INFO.txt`에 저장됩니다
- Windows Defender가 실행파일을 차단할 수 있으니 예외 처리하세요

## 🆘 Support

문제가 지속되면:
1. 이슈 생성: GitHub Issues
2. 로그 파일 첨부: `BUILD_INFO.txt`
3. 시스템 정보 포함: Windows 버전, Python 버전 