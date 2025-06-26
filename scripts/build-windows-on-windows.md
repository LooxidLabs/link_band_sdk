# Windows에서 Python 서버 미리 빌드하기

이 가이드는 **개발자/배포자**가 Windows 환경에서 Python 서버를 미리 빌드해서 배포 패키지에 포함시키는 방법입니다.

## 🎯 목표
- Windows용 `linkband-server-windows.exe` 생성
- 소스코드 없이 바이너리만 배포
- 사용자는 설치 스크립트만 실행

## 🖥️ Windows 환경에서 실행 (개발자용)

### 1. 환경 준비
```cmd
# Python 3.9+ 설치 확인
python --version

# 프로젝트 클론 (개발자 환경)
git clone <repository-url>
cd link_band_sdk
```

### 2. Python 서버 빌드
```cmd
cd python_core

# 가상환경 생성
python -m venv venv
venv\Scripts\activate

# 의존성 설치
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

# Windows 서버 빌드
pyinstaller --onefile --name linkband-server-windows run_server.py
```

### 3. 배포 패키지에 추가
```cmd
# 빌드된 서버를 Windows 설치 폴더에 복사
copy dist\linkband-server-windows.exe ..\installers\windows\

# 배포 패키지 재생성
cd ..
.\scripts\build-for-distribution.sh
```

## 📦 결과
- `LinkBandSDK-windows.zip`에 `linkband-server-windows.exe` 포함
- 사용자는 소스코드 없이 설치 가능
- 완전한 기능의 Windows 패키지

## 🔄 배포 워크플로우

1. **개발자**: Windows 환경에서 Python 서버 빌드
2. **개발자**: 빌드된 서버를 배포 패키지에 포함
3. **사용자**: ZIP 다운로드 → 설치 스크립트 실행
4. **완료**: 소스코드 노출 없이 완전 설치 