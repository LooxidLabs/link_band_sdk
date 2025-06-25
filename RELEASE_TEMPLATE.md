# Link Band SDK v1.0.0

Looxid Labs의 차세대 초경량 뇌파 밴드(Link Band 2.0)를 위한 공식 SDK입니다.

## 🚀 주요 기능

- **실시간 데이터 스트리밍**: EEG, PPG, ACC 센서 데이터 실시간 처리
- **데이터 레코딩**: JSON/CSV 형식으로 데이터 저장
- **신호 처리**: 실시간 필터링 및 신호 처리
- **디바이스 관리**: 연결/해제 및 배터리 상태 모니터링
- **직관적 UI**: Material-UI 기반 사용자 친화적 인터페이스

## 📥 다운로드

### Windows
- **Link Band SDK Setup 1.0.0.exe** (156MB)
- 시스템 요구사항: Windows 10 이상

### Mac
- **Link Band SDK-1.0.0.dmg** (204MB) - Intel Mac용
- **Link Band SDK-1.0.0-arm64.dmg** (199MB) - Apple Silicon Mac용 (M1/M2/M3)
- 시스템 요구사항: macOS 10.14 이상

## 🔧 설치 방법

### Windows
1. `Link Band SDK Setup 1.0.0.exe` 다운로드
2. 실행하여 설치 마법사 따라 진행
3. "Windows에서 PC를 보호했습니다" 메시지 시 "추가 정보" → "실행" 클릭

### Mac
1. 해당 Mac 버전의 DMG 파일 다운로드
2. DMG 파일 마운트 후 Applications 폴더로 드래그
3. **중요**: 첫 실행 시 앱을 우클릭 → "열기" 선택
4. "확인되지 않은 개발자" 경고 시 "열기" 클릭

### Mac "손상된 파일" 오류 해결
터미널에서 다음 명령어 실행:
```bash
sudo xattr -rd com.apple.quarantine "/Applications/Link Band SDK.app"
```

## 📋 시스템 요구사항

- **RAM**: 최소 4GB 권장
- **저장공간**: 500MB 이상
- **연결**: Bluetooth 4.0 이상

## 🆕 새로운 기능

- 실시간 데이터 시각화
- 세션 기반 데이터 관리
- 커스텀 데이터 내보내기
- 배터리 상태 실시간 모니터링
- 다국어 지원 (한국어/영어)

## 🐛 알려진 문제

- Mac에서 첫 실행 시 보안 경고 발생 (정상적인 현상)
- Windows Defender에서 경고 표시 가능 (정상적인 현상)

## 📞 지원

- **GitHub Issues**: [문제 신고](https://github.com/Brian-Chae/link_band_sdk/issues)
- **이메일**: support@looxidlabs.com
- **문서**: [API 문서](https://github.com/Brian-Chae/link_band_sdk/tree/main/docs)

## 🔄 자동 업데이트

앱 내에서 자동으로 업데이트를 확인하고 다운로드합니다.

---

**체크섬 (SHA256)**
- Windows: `[자동 생성됨]`
- Mac Intel: `[자동 생성됨]`
- Mac Apple Silicon: `[자동 생성됨]`
