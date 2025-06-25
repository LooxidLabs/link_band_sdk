# 설치

Link Band SDK를 설치하고 설정하는 방법을 단계별로 안내합니다.

## 시스템 준비사항

설치를 시작하기 전에 다음 사항들을 확인해주세요:

- **운영체제**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **메모리**: 최소 4GB RAM
- **저장공간**: 최소 2GB 여유 공간

## 설치 방법

### 사전 빌드된 설치파일 사용

가장 간단한 설치 방법입니다. 별도의 개발 환경 설정이 필요하지 않습니다.

**Windows**
1. [Release 페이지](https://github.com/looxid-labs/link-band-sdk/releases)에서 최신 버전을 다운로드합니다
2. `Link-Band-SDK-Setup-x.x.x.exe` 파일을 실행합니다
3. 설치 마법사의 지시를 따라 설치를 완료합니다
4. 바탕화면 또는 시작 메뉴에서 "Link Band SDK"를 실행합니다

**macOS**
1. [Release 페이지](https://github.com/looxid-labs/link-band-sdk/releases)에서 최신 버전을 다운로드합니다
2. `Link-Band-SDK-x.x.x.dmg` 파일을 더블클릭합니다
3. Link Band SDK를 Applications 폴더로 드래그합니다
4. Applications에서 Link Band SDK를 실행합니다
5. 보안 설정에서 "확인되지 않은 개발자" 경고가 나타나면 "시스템 환경설정 > 보안 및 개인 정보 보호"에서 허용해주세요

**Linux (Ubuntu/Debian)**
```bash
# .deb 패키지 다운로드 후 설치
sudo dpkg -i Link-Band-SDK-x.x.x.deb
sudo apt-get install -f  # 의존성 해결

# 또는 AppImage 사용
chmod +x Link-Band-SDK-x.x.x.AppImage
./Link-Band-SDK-x.x.x.AppImage
```

## 설치 확인

설치가 완료되면 다음과 같이 확인할 수 있습니다:

1. **Link Band SDK 실행**
   - 애플리케이션을 시작합니다
   - 좌측 메뉴에서 "Engine" 모듈을 클릭합니다
   - "Start" 버튼을 클릭하여 백엔드 서버를 시작합니다

2. **서버 상태 확인**
   - Engine 상태가 "Started"로 변경되는지 확인합니다
   - 하단 상태바에서 시스템 메트릭(CPU, RAM, Disk)이 표시되는지 확인합니다

3. **Link Band 연결 테스트**
   - Link Band 2.0 디바이스를 준비합니다
   - "Link Band" 모듈에서 "Scan" 버튼을 클릭합니다
   - 디바이스가 검색되면 "Connect" 버튼을 클릭합니다

## 문제 해결

### 일반적인 설치 문제

**권한 관련 오류 (macOS)**
```bash
# 애플리케이션 실행 권한 부여
sudo xattr -rd com.apple.quarantine /Applications/Link\ Band\ SDK.app
```

**포트 충돌 오류**
```bash
# 포트 8121이 사용 중인 경우
lsof -ti:8121 | xargs kill -9

# 포트 18765가 사용 중인 경우  
lsof -ti:18765 | xargs kill -9
```

**방화벽 설정**
- Windows: Windows Defender 방화벽에서 Link Band SDK 허용
- macOS: 시스템 환경설정 > 보안 및 개인정보 보호 > 방화벽에서 허용
- Linux: ufw 또는 iptables에서 포트 8121, 18765 허용

### 로그 파일 위치

문제 발생 시 다음 위치의 로그 파일을 확인해주세요:

**Windows**
```
%APPDATA%\Link Band SDK\logs\
```

**macOS**
```
~/Library/Application Support/Link Band SDK/logs/
```

**Linux**
```
~/.config/Link Band SDK/logs/
```

## 다음 단계

설치가 완료되었다면 [첫 번째 단계](first-steps.md) 가이드를 통해 Link Band SDK 사용법을 익혀보세요.

> **도움이 필요하신가요?**
> 
> 설치 과정에서 문제가 발생하면 [문제 해결](../examples/faq.md) 페이지를 확인하거나 [GitHub Issues](https://github.com/looxid-labs/link-band-sdk/issues)에 문의해주세요. 