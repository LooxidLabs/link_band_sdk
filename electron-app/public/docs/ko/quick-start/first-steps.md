# 첫 번째 단계

Link Band SDK를 처음 사용하는 분들을 위한 단계별 가이드입니다. 이 가이드를 따라하면 5분 안에 첫 번째 뇌파 데이터를 수집할 수 있습니다.

## 1단계: SDK 실행 및 Engine 시작

### SDK 실행
설치된 Link Band SDK를 실행합니다.
- **Windows**: 시작 메뉴 또는 바탕화면에서 "Link Band SDK" 클릭
- **macOS**: Applications 폴더에서 "Link Band SDK" 실행
- **Linux**: 터미널에서 `link-band-sdk` 또는 AppImage 실행

### Engine 모듈 시작
1. 좌측 메뉴에서 **"Engine"** 클릭
2. **"Start"** 버튼 클릭
3. 서버가 시작되는 로그를 확인
4. 상태가 **"Started"**로 변경될 때까지 대기 (약 2-5초)

> **💡 팁**: Engine이 시작되지 않으면 [문제 해결](../examples/faq.md#engine-start-issues) 페이지를 확인해주세요.

## 2단계: Link Band 디바이스 연결

### 디바이스 준비
1. **Link Band 2.0** 디바이스를 준비합니다
2. 디바이스가 **충전되어 있는지** 확인합니다 (LED 표시등 확인)
3. 디바이스를 **머리에 착용**합니다
   - 전극이 이마와 귀 뒤쪽에 잘 접촉하도록 조정
   - 너무 꽉 조이지 말고 편안하게 착용

### 디바이스 연결
1. 좌측 메뉴에서 **"Link Band"** 클릭
2. **"Scan"** 버튼 클릭하여 디바이스 검색
3. 검색된 디바이스 목록에서 본인의 디바이스 확인
4. Register 를 이용하여 디바이스를 등록합니다.
5. SDK 는 **자동으로 등록된 디바이스를 연결(Connect)** 합니다. 
6. 연결 상태가 **"Connected"** 로 변경되는지 확인

### 센서 접촉 확인
연결 후 상단 상태바에서 **"Sensor Contact"** 상태를 확인합니다:
- **🟢 Contacted**: 센서가 잘 접촉됨 (데이터 수집 가능)
- **🔴 Not Contact**: 센서 접촉 불량 (디바이스 재착용 및 센서 위치 확인 필요)

## 3단계: 실시간 데이터 확인

### Visualizer 모듈 열기
1. 좌측 메뉴에서 **"Visualizer"** 클릭
2. 실시간 그래프가 표시되는지 확인

### 데이터 스트림 시작
1. **"Start Streaming"** 버튼 클릭
2. 다음 데이터들이 실시간으로 표시되는지 확인:
   - **EEG (뇌파)**: 2채널 뇌파 신호
   - **PPG (맥파)**: 심박 신호
   - **ACC (가속도)**: 움직임 데이터

### 신호 품질 확인
- **EEG 그래프**: 규칙적인 파형이 나타나야 함
- **PPG 그래프**: 심박에 따른 주기적 파형 확인
- **Signal Quality**: 각 신호의 품질 지수 확인

## 4단계: 첫 번째 데이터 녹화

### 녹화 시작
1. 좌측 메뉴에서 **"Data Center"** 클릭
2. **"Start Recording"** 버튼 클릭
3. 녹화 상태가 **"Recording"**으로 변경되는지 확인
4. 하단 상태바에서 녹화 시간이 카운트되는지 확인

### 테스트 활동 수행
녹화 중에 다음과 같은 간단한 활동을 해보세요:
- **30초간 눈 감고 휴식** (Total Power 및 관련 인덱스 변화)
- **30초간 간단한 계산** (Beta파 증가, Cognitive Load 증가)
- **30초간 깊은 호흡** (BPM 및 HRV 관련 인덱스 변화)

### 녹화 종료
1. **"Stop Recording"** 버튼 클릭
2. 세션이 자동으로 저장되는지 확인
3. **"Session List"** 탭에서 저장된 파일들 확인
4. **"Open"** 혹은 **"Export"** 를 이용하여 파일을 다운로드 받습니다.

## 5단계: 데이터 확인 및 내보내기

### 저장된 데이터 확인
Data Center의 **"Session List"** 탭에서:
1. 방금 녹화한 세션 폴더 **"Open"** 버튼 클릭
2. 다음 파일들이 생성되었는지 확인:
   - `*_eeg_raw.json`: 원시 뇌파 데이터
   - `*_eeg_processed.json`: 처리된 뇌파 데이터
   - `*_ppg_raw.json`: 원시 맥파 데이터
   - `*_ppg_processed.json`: 처리된 맥파 데이터
   - `*_acc_raw.json`: 가속도 데이터
   - `*_acc_processed.json`: 처리된 가속도 데이터
   - `*_bat.json`: 배터리 데이터

### 데이터 내보내기 (선택사항)
1. **"Export"** 버튼 클릭
2. 내보낸 파일 위치 확인
3. zip 파일 내부에 JSON 파일이 있는지 확인
4. python 등 원하는 방식으로 JSON 가공

## 상태바 정보 이해하기

하단 상태바에서 다음 정보들을 실시간으로 확인할 수 있습니다:

### 시스템 상태
- **Streaming**: 데이터 스트리밍 상태 (ACTIVE/INACTIVE)
- **Recording**: 녹화 상태 (녹화 시간 표시/IDLE)
- **Clients**: 연결된 클라이언트 수

### 신호 정보
- **EEG**: 뇌파 샘플링 레이트 (예: 250.0 Hz)
- **PPG**: 맥파 샘플링 레이트 (예: 50.0 Hz)  
- **ACC**: 가속도 샘플링 레이트 (예: 25.0 Hz)
- **Battery**: 디바이스 배터리 잔량 (%)

### 시스템 메트릭
- **CPU**: 프로세서 사용률 (%)
- **RAM**: 메모리 사용량 (MB)
- **Disk**: 디스크 사용량 (MB)

## 다음 단계

축하합니다! 첫 번째 뇌파 데이터 수집을 완료했습니다. 이제 다음 단계들을 진행해보세요:

### 더 자세한 사용법 학습
- [Visualizer 모듈](../user-guide/visualizer-module.md): 실시간 시각화 및 분석
- [Data Center 모듈](../user-guide/datacenter-module.md): 데이터 관리 및 내보내기

### 개발자를 위한 정보
- [API 참조](../api-reference/stream-api.md): REST API 사용법
- [Python 예제](../examples/python-integration.md): Python으로 데이터 수집

### 문제 해결
문제가 발생하면 다음 리소스를 활용해주세요:
- [자주 묻는 질문](../examples/faq.md): FAQ
- [GitHub Issues](https://github.com/looxid-labs/link-band-sdk/issues): 기술 지원

> **🎉 성공적으로 완료하셨습니다!**
> 
> Link Band SDK의 기본 사용법을 익혔습니다. 이제 본격적으로 뇌파 데이터를 활용한 프로젝트를 시작해보세요! 