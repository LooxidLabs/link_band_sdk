# Engine 모듈

Engine 모듈은 Link Band SDK의 핵심 백엔드 서버를 관리하는 모듈입니다. Python FastAPI 기반의 서버를 시작/중지하고, 서버 상태를 모니터링할 수 있습니다.

## 개요

Engine 모듈의 주요 기능:
- **서버 관리**: Python 백엔드 서버 시작/중지
- **상태 모니터링**: 서버 상태 실시간 확인
- **로그 관리**: 서버 로그 실시간 모니터링
- **자동 복구**: 서버 오류 시 자동 재시작 옵션

## 인터페이스 구성

### 서버 제어 패널
- **Start 버튼**: 백엔드 서버 시작
- **Stop 버튼**: 백엔드 서버 중지
- **Restart 버튼**: 서버 재시작 (중지 후 시작)
- **상태 표시**: 현재 서버 상태 (Stopped/Starting/Started/Error)

### 로그 뷰어
- **실시간 로그**: 서버에서 발생하는 모든 로그 실시간 표시
- **로그 레벨**: INFO, WARNING, ERROR 등 레벨별 색상 구분
- **자동 스크롤**: 새로운 로그가 추가되면 자동으로 스크롤
- **로그 지우기**: Clear 버튼으로 화면의 로그 지우기

## 서버 시작하기

### 1. 기본 시작
1. Engine 모듈을 클릭합니다
2. **"Start"** 버튼을 클릭합니다
3. 로그 창에서 서버 시작 과정을 확인합니다
4. 상태가 **"Started"**로 변경될 때까지 대기합니다 (2-5초 소요)

### 2. 시작 과정 이해하기
서버 시작 시 다음과 같은 단계를 거칩니다:

```
[INFO] Starting Python server...
[INFO] Checking Python environment...
[INFO] Loading dependencies...
[INFO] Initializing FastAPI application...
[INFO] Starting WebSocket server on port 18765...
[INFO] Starting HTTP server on port 8121...
[INFO] Link Band SDK Server ready!
[INFO] Application startup complete.
```

### 3. 시작 실패 시 대처법
서버 시작이 실패하는 경우:

**포트 충돌**
```bash
[ERROR] Port 8121 is already in use
```
해결책: 다른 애플리케이션에서 포트를 사용 중입니다. 해당 애플리케이션을 종료하거나 포트를 변경하세요.

**Python 환경 오류**
```bash
[ERROR] Python interpreter not found
```
해결책: Python 3.8+ 버전이 설치되어 있는지 확인하세요.

**의존성 오류**
```bash
[ERROR] ModuleNotFoundError: No module named 'fastapi'
```
해결책: 필요한 Python 패키지가 설치되지 않았습니다. `pip install -r requirements.txt` 실행하세요.

## 서버 상태 모니터링

### 상태 표시등
Engine 모듈 상단의 상태 표시등으로 현재 상태를 확인할 수 있습니다:

- **Stopped**: 서버가 중지된 상태
- **Starting**: 서버가 시작 중인 상태
- **Started**: 서버가 정상 작동 중인 상태
- **Error**: 서버에 오류가 발생한 상태

### 실시간 로그 모니터링
로그 창에서 다음과 같은 정보를 확인할 수 있습니다:

**일반 정보 로그**
```
[INFO] 2024-01-15 10:30:25 - Server health check passed
[INFO] 2024-01-15 10:30:30 - WebSocket client connected
[INFO] 2024-01-15 10:30:35 - Device scan completed
```

**경고 로그**
```
[WARNING] 2024-01-15 10:31:00 - Device connection unstable
[WARNING] 2024-01-15 10:31:05 - High CPU usage detected
```

**오류 로그**
```
[ERROR] 2024-01-15 10:31:10 - Failed to connect to device
[ERROR] 2024-01-15 10:31:15 - WebSocket connection lost
```

## 문제 해결

### 일반적인 문제들

**서버가 자주 중지됨**
1. 메모리 사용량 확인 (하단 상태바의 RAM 메트릭)
2. CPU 사용량 확인 (하단 상태바의 CPU 메트릭)
3. 로그에서 오류 메시지 확인
4. 자동 재시작 옵션 활성화

**로그가 표시되지 않음**
1. Engine 모듈 새로고침 (Restart 버튼 클릭)
2. 로그 파일 권한 확인
3. 디스크 공간 확인

## API 엔드포인트

Engine이 시작되면 다음 API 엔드포인트들이 활성화됩니다:

### 기본 엔드포인트
- `GET /`: 서버 상태 확인
- `GET /health`: 헬스체크
- `GET /docs`: API 문서 (Swagger UI)

### 디바이스 관리
- `GET /device/scan`: 디바이스 검색
- `POST /device/connect`: 디바이스 연결
- `DELETE /device/disconnect`: 디바이스 연결 해제

### 데이터 스트리밍
- `POST /stream/start`: 스트리밍 시작
- `POST /stream/stop`: 스트리밍 중지
- `GET /stream/status`: 스트리밍 상태

### WebSocket
- `ws://localhost:18765/ws`: 실시간 데이터 스트림

> **💡 팁**: 브라우저에서 [http://localhost:8121/docs](http://localhost:8121/docs)에 접속하면 대화형 API 문서를 확인할 수 있습니다.

## 다음 단계

Engine 모듈을 성공적으로 시작했다면:
1. [Link Band 모듈](linkband-module.md)에서 디바이스 연결 방법을 학습하세요
2. [API 참조](../api-reference/device-api.md)에서 프로그래밍 방식으로 서버를 제어하는 방법을 확인하세요
3. [문제 해결](../examples/troubleshooting.md)에서 일반적인 문제 해결 방법을 확인하세요 