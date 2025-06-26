# 🔍 빌드된 서버 파일 찾기 가이드

## 🎉 빌드 성공!

로그를 보면 PyInstaller가 성공적으로 `linkband-server-windows.exe` 파일을 생성했습니다!

```
INFO: Building EXE from EXE-00.toc completed successfully.
INFO: Build complete! The results are available in: C:\Users\USER\AppData\Local\Temp\linkband_build_10465\link_band_sdk\python_core\dist
```

## 📂 파일 위치

빌드된 파일은 다음 위치에 있습니다:

```
C:\Users\USER\AppData\Local\Temp\linkband_build_10465\link_band_sdk\python_core\dist\linkband-server-windows.exe
```

## 🔧 해결 방법

### 방법 1: 자동 찾기 스크립트 실행
```
find-built-server.bat
```

### 방법 2: 수동으로 파일 찾기

1. **Windows 탐색기 열기**
2. **주소창에 입력**:
   ```
   C:\Users\USER\AppData\Local\Temp
   ```
3. **`linkband_build_` 로 시작하는 폴더 찾기**
4. **폴더 구조**:
   ```
   linkband_build_xxxxx/
   └── link_band_sdk/
       └── python_core/
           └── dist/
               └── linkband-server-windows.exe  ← 이 파일!
   ```
5. **파일을 복사해서 설치 폴더로 이동**

### 방법 3: 명령어로 찾기

명령 프롬프트에서:

```cmd
dir /s "linkband-server-windows.exe"
```

## 📋 파일 확인사항

찾은 파일이 올바른지 확인:

- **파일 크기**: 약 20-50MB
- **파일 형식**: .exe 실행 파일
- **생성 시간**: 방금 전 (빌드 시간)

## 🚀 복사 완료 후

파일을 설치 폴더에 복사한 후:

1. **install-linkband.bat 실행**
2. **설치 완료!**

## 🔧 문제 해결

### 파일이 없다면?
- 임시 폴더가 자동 삭제되었을 수 있음
- 빌드 스크립트를 다시 실행

### 권한 오류?
- 관리자 권한으로 명령 프롬프트 실행
- 파일을 데스크톱으로 먼저 복사

### 파일이 실행되지 않는다면?
- Windows Defender가 차단할 수 있음
- 바이러스 검사 예외 추가
- 또는 "실행" 선택

## 📞 추가 도움

문제가 지속되면 스크린샷과 함께 문의해주세요! 