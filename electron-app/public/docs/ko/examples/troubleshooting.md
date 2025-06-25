# 문제 해결

Link Band SDK 사용 중 발생할 수 있는 일반적인 문제들과 해결 방법을 정리했습니다.

## Engine 관련 문제

### Engine이 시작되지 않음

**증상**
- "Start" 버튼을 클릭해도 상태가 "Started"로 변경되지 않음
- 로그에 오류 메시지 표시

**원인 및 해결책**

**1. Python 환경 문제**
```bash
[ERROR] Python interpreter not found
```
해결책:
```bash
# Python 버전 확인 (3.8+ 필요)
python --version
python3 --version

# Python 경로 확인
which python
which python3

# 필요시 Python 설치
# macOS: brew install python
# Ubuntu: sudo apt install python3
# Windows: python.org에서 다운로드
```

**2. 의존성 패키지 누락**
```bash
[ERROR] ModuleNotFoundError: No module named 'fastapi'
```
해결책:
```bash
cd python_core
pip install -r requirements.txt

# 가상환경 사용 권장
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**3. 포트 충돌**
```bash
[ERROR] Port 8121 is already in use
```
해결책:
```bash
# 사용 중인 프로세스 확인 및 종료
# macOS/Linux
lsof -ti:8121 | xargs kill -9
lsof -ti:18765 | xargs kill -9

# Windows
netstat -ano | findstr :8121
taskkill /PID <PID번호> /F
```

**4. 권한 문제**
```bash
[ERROR] Permission denied
```
해결책:
```bash
# macOS/Linux
sudo chown -R $USER:$USER python_core/
chmod +x python_core/app/main.py

# Windows: 관리자 권한으로 실행
```

### Engine이 자주 중지됨

**원인 및 해결책**

**1. 메모리 부족**
- 하단 상태바에서 RAM 사용량 확인
- 다른 애플리케이션 종료
- 가상 메모리 증가

**2. CPU 과부하**
- 하단 상태바에서 CPU 사용량 확인
- 백그라운드 프로세스 정리
- 샘플링 레이트 낮추기

**3. 디스크 공간 부족**
- 저장 공간 확인
- 오래된 세션 데이터 삭제
- 임시 파일 정리

## 디바이스 연결 문제

### 디바이스가 검색되지 않음

**증상**
- "Scan" 버튼을 클릭해도 디바이스 목록이 비어있음
- 검색 시간이 너무 오래 걸림

**원인 및 해결책**

**1. 블루투스 비활성화**
```bash
# 블루투스 상태 확인
# macOS
system_profiler SPBluetoothDataType

# Linux
bluetoothctl show
```
해결책: 시스템 설정에서 블루투스 활성화

**2. 디바이스 상태 문제**
- Link Band 2.0이 충전되어 있는지 확인
- 페어링 모드인지 확인 (파란색 LED 깜빡임)
- 다른 기기와 연결되어 있지 않은지 확인

**3. 거리 및 간섭**
- 디바이스와 2m 이내 거리 유지
- 다른 블루투스 기기 간섭 최소화
- Wi-Fi 라우터 등 전자기기와 거리 두기

### 연결이 자주 끊어짐

**증상**
- 연결 후 몇 분 내에 자동으로 연결 해제
- "Connection lost" 메시지 표시

**원인 및 해결책**

**1. 신호 강도 약함**
- RSSI 값 확인 (-70 dBm 이상 권장)
- 장애물 제거 (벽, 금속 물체 등)
- 거리 단축

**2. 배터리 부족**
- 디바이스 배터리 30% 이상 유지
- 정기적인 충전 (주 2-3회)
- 저전력 모드 활용

**3. 블루투스 드라이버 문제**
```bash
# Windows: 장치 관리자에서 블루투스 드라이버 업데이트
# macOS: 시스템 업데이트 확인
# Linux
sudo apt update && sudo apt upgrade bluez
```

### 센서 접촉 불량

**증상**
- "No Contact" 표시
- 신호 품질이 낮음 (50% 이하)

**원인 및 해결책**

**1. 착용 위치 문제**
- 전극이 피부에 직접 닿도록 조정
- 머리카락 정리
- 적절한 압력으로 고정

**2. 피부 상태**
- 전극 부위 청소 (알코올 솜 사용)
- 화장품, 로션 제거
- 건조한 피부의 경우 살짝 적시기

**3. 디바이스 상태**
- 전극 청소 (부드러운 천 사용)
- 전극 부식 확인
- 필요시 A/S 문의

## 데이터 관련 문제

### 데이터가 저장되지 않음

**증상**
- 녹화 후 파일이 생성되지 않음
- "File List"에 세션이 표시되지 않음

**원인 및 해결책**

**1. 저장 권한 문제**
```bash
# 데이터 폴더 권한 확인
ls -la data/
chmod 755 data/
```

**2. 디스크 공간 부족**
- 저장 공간 확인
- 불필요한 파일 삭제
- 다른 드라이브로 데이터 폴더 이동

**3. 녹화 설정 문제**
- Engine과 Link Band가 모두 연결된 상태에서 녹화 시작
- 스트리밍이 활성화된 상태인지 확인

### 데이터 품질이 낮음

**증상**
- 신호에 노이즈가 많음
- SQI (Signal Quality Index)가 낮음
- 그래프가 불규칙함

**원인 및 해결책**

**1. 환경적 요인**
- 전자기기 간섭 최소화 (스마트폰, 전자레인지 등)
- 형광등 아래 사용 피하기
- 안정된 환경에서 측정

**2. 착용 상태**
- 센서 접촉 상태 개선
- 과도한 움직임 피하기
- 적절한 자세 유지

## 성능 문제

### 애플리케이션이 느림

**증상**
- UI 반응이 느림
- 그래프 업데이트 지연
- 메모리 사용량 증가

**원인 및 해결책**

**1. 시스템 리소스 부족**
- 다른 애플리케이션 종료
- 백그라운드 프로세스 정리
- 시스템 재시작

**2. 데이터 처리 부하**
- 샘플링 레이트 낮추기
- 불필요한 센서 비활성화
- 그래프 업데이트 간격 조정

**3. 메모리 누수**
- 애플리케이션 재시작
- 오래된 세션 데이터 정리
- 최신 버전으로 업데이트

### 배터리 소모가 빠름

**증상**
- 디바이스 배터리가 예상보다 빨리 소모됨
- 사용 시간이 짧음

## 지원 요청

### 버그 리포트 작성

문제가 지속되면 다음 정보와 함께 버그 리포트를 작성해주세요:

**필수 정보**
- 운영체제 및 버전
- Link Band SDK 버전
- Python 버전
- 발생한 오류 메시지
- 재현 단계

**추가 정보**
- 시스템 사양 (CPU, RAM, 저장공간)
- 사용 중인 다른 블루투스 기기
- 스크린샷 (해당하는 경우)

### 지원 채널

- **GitHub Issues**: [https://github.com/looxid-labs/link-band-sdk/issues](https://github.com/looxid-labs/link-band-sdk/issues)
- **이메일**: support@looxidlabs.com
- **문서**: [자주 묻는 질문](faq.md)

### 임시 해결책

문제가 해결될 때까지 사용할 수 있는 임시 방법:

**1. 안전 모드 실행**
- 최소한의 기능만 활성화
- 디버그 모드 비활성화
- 낮은 샘플링 레이트 사용

**2. 수동 모드**
- API를 직접 호출하여 제어
- 명령줄 도구 사용
- 별도의 데이터 수집 스크립트 작성

> **💡 팁**: 문제가 발생하면 당황하지 말고 차근차근 로그를 확인하고 기본적인 해결책부터 시도해보세요. 대부분의 문제는 간단한 설정 변경으로 해결됩니다. 