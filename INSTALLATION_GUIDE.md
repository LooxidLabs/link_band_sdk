# Link Band SDK 설치 가이드

## Windows 사용자

1. `Link Band SDK Setup 1.0.0.exe` 파일을 다운로드합니다.
2. 파일을 실행하고 설치 마법사를 따라 진행합니다.
3. 설치 완료 후 바탕화면 또는 시작 메뉴에서 실행할 수 있습니다.

## Mac 사용자 (중요!)

### Intel Mac
1. `Link Band SDK-1.0.0.dmg` 파일을 다운로드합니다.
2. DMG 파일을 더블클릭하여 마운트합니다.
3. **중요**: 앱을 Applications 폴더로 드래그합니다.
4. **첫 실행 시**: 앱을 우클릭 → "열기" 선택
5. "확인되지 않은 개발자" 경고가 나오면 "열기" 클릭

### Apple Silicon Mac (M1/M2/M3)
1. `Link Band SDK-1.0.0-arm64.dmg` 파일을 다운로드합니다.
2. 위와 동일한 과정을 따릅니다.

### Mac에서 "손상된 파일" 오류 해결 방법

터미널에서 다음 명령어를 실행하세요:

```bash
# 방법 1: Quarantine 속성 제거
sudo xattr -rd com.apple.quarantine "/Applications/Link Band SDK.app"

# 방법 2: 터미널에서 직접 실행
open "/Applications/Link Band SDK.app"
```

## 시스템 요구사항

- **Windows**: Windows 10 이상
- **Mac**: macOS 10.14 이상
- **RAM**: 최소 4GB 권장
- **저장공간**: 500MB 이상

## 문제 해결

### Windows
- 설치 시 "Windows에서 PC를 보호했습니다" 메시지가 나오면:
  1. "추가 정보" 클릭
  2. "실행" 버튼 클릭

### Mac
- 앱이 실행되지 않으면:
  1. 시스템 환경설정 → 보안 및 개인 정보 보호
  2. 일반 탭에서 "확인되지 않은 개발자의 앱 허용" 클릭

## 지원

문제가 발생하면 GitHub Issues에서 문의하세요:
https://github.com/Brian-Chae/link_band_sdk/issues 