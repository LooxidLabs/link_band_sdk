# 🔧 Git Windows 설치 가이드

## ❌ 자동 설치 실패 시 해결 방법

Git 자동 설치가 실패하는 이유는 다음과 같습니다:
- 관리자 권한 부족
- Windows Defender/방화벽 차단
- 네트워크 연결 문제
- 설치 프로그램 실행 권한 문제

## 🔧 해결 방법

### 방법 1: Git 공식 사이트에서 설치 (권장)

1. **웹 브라우저 열기**
2. **https://git-scm.com/download/win** 접속
3. **"64-bit Git for Windows Setup" 다운로드**
4. **다운로드된 파일 실행** (Git-x.xx.x-64-bit.exe)
5. **설치 옵션**:
   - **기본 설정 사용** (모든 단계에서 "Next" 클릭)
   - 또는 다음 권장 설정:
     - ✅ "Git from the command line and also from 3rd-party software"
     - ✅ "Use bundled OpenSSH"
     - ✅ "Use the OpenSSL library"
     - ✅ "Checkout Windows-style, commit Unix-style line endings"
6. **"Install" 클릭**
7. **설치 완료 대기**

### 방법 2: GitHub Desktop 설치 (GUI 포함)

1. **https://desktop.github.com/** 접속
2. **"Download for Windows" 클릭**
3. **설치 후 Git 명령어도 사용 가능**

### 방법 3: 관리자 권한으로 재시도

1. **명령 프롬프트를 관리자 권한으로 열기**
   - Windows 키 + R
   - "cmd" 입력
   - Ctrl + Shift + Enter (관리자 권한)
2. **빌드 스크립트 다시 실행**

## ✅ 설치 확인

설치 후 다음 명령어로 확인:

```cmd
git --version
```

결과 예시:
```
git version 2.45.2.windows.1
```

## 🚀 설치 완료 후

Git 설치가 완료되면:

1. **명령 프롬프트 재시작** (중요!)
2. **빌드 스크립트 다시 실행**:
   ```
   build-linkband-manual-install.bat
   ```

## 🔧 문제 해결

### "git is not recognized" 오류
- PATH 환경변수에 Git이 추가되지 않음
- **해결**: 
  1. 명령 프롬프트 재시작
  2. Git 재설치 시 "Git from the command line" 옵션 선택

### 설치 프로그램 실행 안됨
- Windows Defender가 차단
- **해결**: 
  1. Windows Defender 일시 해제
  2. 다운로드 파일 우클릭 → "관리자 권한으로 실행"

### 네트워크 오류
- 방화벽이나 프록시 차단
- **해결**: 
  1. 방화벽 설정 확인
  2. 다른 네트워크에서 시도

## 📝 Git 설정 (선택사항)

Git 설치 후 기본 설정:

```cmd
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 📞 추가 도움

문제가 지속되면:
1. Windows 버전 확인
2. 에러 메시지 스크린샷
3. 개발자에게 문의 