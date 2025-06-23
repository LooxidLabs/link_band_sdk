# Link Band SDK - 배포 가이드

이 문서는 Link Band SDK Electron 앱의 배포와 자동 업데이트 설정에 대한 가이드입니다.

## 📦 배포 준비

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# electron-updater 설치 확인
npm list electron-updater
```

### 2. 버전 관리

`package.json`에서 버전을 업데이트:

```json
{
  "version": "1.0.0"
}
```

### 3. 배포 설정 확인

`electron-builder.json` 파일에서 GitHub 설정을 확인하고 수정:

```json
{
  "publish": [
    {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "link_band_sdk"
    }
  ]
}
```

## 🚀 배포 방법

### Option 1: GitHub Releases (권장)

1. **GitHub 토큰 설정**
   ```bash
   export GH_TOKEN=your_github_personal_access_token
   ```

2. **빌드 및 배포**
   ```bash
   npm run electron:build:publish
   ```

3. **GitHub Release 생성**
   - GitHub에서 자동으로 Release가 생성됩니다
   - 빌드된 파일들이 Assets에 업로드됩니다

### Option 2: 로컬 빌드만

```bash
npm run electron:build
```

생성된 파일들은 `release/` 폴더에 저장됩니다.

## 🔄 자동 업데이트 구현

### 1. 메인 프로세스 (이미 구현됨)

- `electron-updater` 설정
- 업데이트 체크 및 다운로드 로직
- 사용자 알림 다이얼로그

### 2. 렌더러 프로세스

`UpdateNotification` 컴포넌트를 앱에 추가:

```tsx
import UpdateNotification from './components/UpdateNotification';

function App() {
  return (
    <div>
      {/* 기존 컴포넌트들 */}
      <UpdateNotification />
    </div>
  );
}
```

### 3. 업데이트 플로우

1. **자동 체크**: 앱 시작 시 자동으로 업데이트 확인
2. **수동 체크**: 사용자가 "Check for Updates" 버튼 클릭
3. **다운로드**: 업데이트 발견 시 자동 다운로드
4. **설치**: 사용자가 "Restart & Install" 선택 시 설치

## 🛠 배포 환경별 설정

### macOS
- **코드 사이닝**: `entitlements.mac.plist` 파일 사용
- **공증**: 프로덕션에서는 `notarize: true` 설정 필요
- **배포 형식**: DMG 파일

### Windows
- **코드 사이닝**: 인증서 필요 (프로덕션)
- **배포 형식**: NSIS 인스톨러
- **자동 업데이트**: 관리자 권한 없이 설치 가능

### Linux
- **배포 형식**: AppImage
- **자동 업데이트**: 지원

## 📋 배포 체크리스트

- [ ] 버전 번호 업데이트
- [ ] GitHub 리포지토리 설정 확인
- [ ] 환경 변수 설정 (GH_TOKEN)
- [ ] 테스트 빌드 실행
- [ ] 업데이트 기능 테스트
- [ ] 각 플랫폼별 빌드 확인

## 🔧 고급 설정

### 1. 업데이트 서버 변경

GitHub 대신 다른 서버를 사용하려면:

```json
{
  "publish": [
    {
      "provider": "generic",
      "url": "https://your-update-server.com/releases/"
    }
  ]
}
```

### 2. 베타 채널 설정

```json
{
  "publish": [
    {
      "provider": "github",
      "owner": "your-username",
      "repo": "your-repo",
      "channel": "beta"
    }
  ]
}
```

### 3. 수동 업데이트 체크 비활성화

`main.ts`에서 자동 체크를 비활성화:

```typescript
// autoUpdater.checkForUpdatesAndNotify(); // 이 줄을 주석 처리
```

## 📚 참고 자료

- [electron-builder 공식 문서](https://electron.build/)
- [electron-updater 공식 문서](https://github.com/electron-userland/electron-builder/tree/master/packages/electron-updater)
- [GitHub Releases 설정 가이드](https://docs.github.com/en/repositories/releasing-projects-on-github)

## 🚨 주의사항

1. **GitHub Token**: 배포 시 반드시 적절한 권한을 가진 토큰 사용
2. **코드 사이닝**: 프로덕션 환경에서는 반드시 코드 사이닝 적용
3. **테스트**: 업데이트 기능은 실제 배포 환경에서만 테스트 가능
4. **백업**: 중요한 사용자 데이터는 업데이트 전 백업 권장 