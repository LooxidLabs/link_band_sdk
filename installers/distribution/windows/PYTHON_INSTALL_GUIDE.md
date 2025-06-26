# 🐍 Python Windows 설치 가이드

## ❌ 자동 설치 실패 시 해결 방법

Python 자동 설치가 실패하는 이유는 다음과 같습니다:
- 관리자 권한 부족
- Windows Defender/방화벽 차단
- 네트워크 연결 문제
- 기존 Python 설치 충돌

## 🔧 해결 방법

### 방법 1: Python 공식 사이트에서 설치 (권장)

1. **웹 브라우저 열기**
2. **https://www.python.org/downloads/** 접속
3. **"Download Python 3.11.x"** 버튼 클릭
4. **다운로드된 파일 실행** (python-3.11.x-amd64.exe)
5. **중요: "Add Python to PATH" 체크박스 선택** ✅
6. **"Install Now" 클릭**
7. **설치 완료 대기**

### 방법 2: Microsoft Store에서 설치

1. **Microsoft Store 열기**
2. **"Python 3.11" 검색**
3. **"Python 3.11" 설치**
4. **설치 완료 대기**

### 방법 3: 관리자 권한으로 재시도

1. **명령 프롬프트를 관리자 권한으로 열기**
   - Windows 키 + R
   - "cmd" 입력
   - Ctrl + Shift + Enter (관리자 권한)
2. **빌드 스크립트 다시 실행**

## ✅ 설치 확인

설치 후 다음 명령어로 확인:

```cmd
python --version
```

결과 예시:
```
Python 3.11.9
```

## 🚀 설치 완료 후

Python 설치가 완료되면:

1. **명령 프롬프트 재시작**
2. **빌드 스크립트 다시 실행**:
   ```
   build-linkband-manual-install.bat
   ```

## 🔧 문제 해결

### "python is not recognized" 오류
- PATH 환경변수에 Python이 추가되지 않음
- **해결**: Python 재설치 시 "Add Python to PATH" 체크

### 여러 Python 버전 충돌
- 기존 Python과 충돌
- **해결**: 기존 Python 제거 후 재설치

### 권한 오류
- 관리자 권한 필요
- **해결**: 관리자 권한으로 명령 프롬프트 실행

## 📞 추가 도움

문제가 지속되면:
1. Windows 버전 확인
2. 에러 메시지 스크린샷
3. 개발자에게 문의 