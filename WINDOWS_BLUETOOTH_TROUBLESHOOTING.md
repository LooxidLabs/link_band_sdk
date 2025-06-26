# Windows Bluetooth Troubleshooting Guide

Link Band SDK가 Windows에서 BLE 디바이스를 찾지 못할 때의 해결 방법입니다.

## 🔧 빠른 진단

먼저 자동 진단 도구를 실행하세요:

```bash
cd link_band_sdk
python scripts/windows-bluetooth-check.py
```

## 🚨 일반적인 문제와 해결방법

### 1. Windows 블루투스 권한 설정

**증상**: "No BLE devices found" 또는 권한 관련 오류

**해결방법**:
1. **Windows 설정 열기**: `Win + I`
2. **개인 정보 보호 및 보안** → **앱 권한** → **Bluetooth** 이동
3. 다음 설정을 **켜기**로 변경:
   - "앱이 Bluetooth에 액세스하도록 허용"
   - "데스크톱 앱이 Bluetooth에 액세스하도록 허용"

**또는 빠른 설정**:
- `Win + R` → `ms-settings:privacy-radios` 입력 → Enter

### 2. 관리자 권한으로 실행

**증상**: 스캔이 실패하거나 권한 오류

**해결방법**:
1. **명령 프롬프트를 관리자로 실행**:
   - `Win + X` → "터미널(관리자)" 선택
   - 또는 `Win + R` → `cmd` → `Ctrl + Shift + Enter`
2. 프로젝트 폴더로 이동:
   ```cmd
   cd C:\path\to\link_band_sdk
   npm run electron:preview
   ```

### 3. 블루투스 서비스 재시작

**증상**: 블루투스 어댑터가 응답하지 않음

**해결방법**:
1. **서비스 관리자 열기**: `Win + R` → `services.msc`
2. **Bluetooth Support Service** 찾기
3. 마우스 우클릭 → **다시 시작**

**또는 명령줄로**:
```cmd
net stop bthserv
net start bthserv
```

### 4. 블루투스 어댑터 재설정

**증상**: 어댑터가 제대로 작동하지 않음

**해결방법**:
1. **장치 관리자 열기**: `Win + X` → "장치 관리자"
2. **Bluetooth** 섹션 확장
3. 블루투스 어댑터 우클릭 → **사용 안 함**
4. 잠시 기다린 후 → **사용**
5. 또는 **제거** 후 **하드웨어 변경 사항 검색**

### 5. Windows 블루투스 설정 확인

**해결방법**:
1. **설정** → **장치** → **Bluetooth 및 기타 장치**
2. **Bluetooth**가 **켜짐**인지 확인
3. 문제가 있다면 **Bluetooth 끄기** → 잠시 기다리기 → **Bluetooth 켜기**

### 6. 블루투스 드라이버 업데이트

**증상**: 오래된 드라이버로 인한 호환성 문제

**해결방법**:
1. **장치 관리자** → **Bluetooth** 섹션
2. 블루투스 어댑터 우클릭 → **드라이버 업데이트**
3. **자동으로 드라이버 검색**

### 7. Windows 업데이트

**해결방법**:
1. **설정** → **Windows Update**
2. **업데이트 확인** 클릭
3. 사용 가능한 업데이트 설치

## 🔍 고급 문제 해결

### Python 환경 문제

**bleak 라이브러리 재설치**:
```bash
cd python_core
pip uninstall bleak
pip install bleak
```

**Python 버전 확인** (Python 3.8+ 필요):
```bash
python --version
```

### Windows 방화벽 확인

1. **Windows Defender 방화벽** 열기
2. **앱 또는 기능이 Windows Defender 방화벽을 통과하도록 허용**
3. **Python** 또는 **Node.js** 찾아서 **개인** 및 **공용** 네트워크 모두 허용

### 타사 보안 소프트웨어

일부 안티바이러스나 보안 소프트웨어가 블루투스 액세스를 차단할 수 있습니다:
- 임시로 실시간 보호 해제하고 테스트
- 방화벽 예외에 Python/Node.js 추가

## 📋 단계별 체크리스트

Windows에서 Link Band를 연결하기 전에 다음을 확인하세요:

- [ ] Windows 10 build 18362+ 또는 Windows 11
- [ ] 블루투스 어댑터가 BLE를 지원
- [ ] Windows 블루투스 권한 설정 완료
- [ ] 관리자 권한으로 실행
- [ ] 블루투스 서비스 실행 중
- [ ] Link Band 디바이스가 페어링 모드
- [ ] Link Band 디바이스가 10미터 이내에 위치
- [ ] Link Band 배터리 충분

## 🆘 여전히 문제가 있다면

### 1. 진단 정보 수집

```bash
# 블루투스 진단 실행
python scripts/windows-bluetooth-check.py

# 시스템 정보
systeminfo | findstr /C:"OS Name" /C:"OS Version"
```

### 2. 로그 확인

애플리케이션 실행 시 콘솔에 나타나는 오류 메시지를 확인하세요.

### 3. 대안 방법

1. **다른 블루투스 어댑터 사용**: USB 블루투스 동글 시도
2. **다른 컴퓨터에서 테스트**: 하드웨어 문제인지 확인
3. **macOS/Linux에서 테스트**: 디바이스 자체 문제인지 확인

## 📞 지원 요청

문제가 지속되면 다음 정보와 함께 지원을 요청하세요:

- Windows 버전 및 빌드 번호
- 블루투스 어댑터 모델
- `windows-bluetooth-check.py` 실행 결과
- 오류 메시지 전체 내용
- Link Band 디바이스 모델

---

**참고**: 이 가이드는 Windows 10/11 환경을 기준으로 작성되었습니다. 이전 버전의 Windows에서는 일부 단계가 다를 수 있습니다. 