# Link Band SDK 서버 관리 명령어 모음

## 🚀 서버 시작

### 안전 시작 (권장)
```bash
# 백그라운드 모드
./start_server_safe.sh background

# 포그라운드 모드 (로그 확인)
./start_server_safe.sh
```

### 빠른 시작
```bash
# 자동 포트 정리 포함
python python_core/run_server.py

# 포트 정리 없이 빠른 시작
python python_core/run_server.py --no-cleanup
```

## 🛑 서버 종료

### 안전 종료
```bash
./kill_server.sh
```

### 빠른 종료 (원라이너)
```bash
# 포트 기반 강제 종료
lsof -ti:8121 -ti:18765 | xargs kill -9 2>/dev/null || echo "포트 정리 완료"

# 프로세스 이름 기반 종료
pkill -f "run_server.py"
```

## 🔍 서버 상태 확인

### 포트 점유 상태 확인
```bash
# 8121, 18765 포트 확인
lsof -i:8121,18765

# 네트워크 상태 확인
netstat -an | grep -E "8121|18765"
```

### 프로세스 확인
```bash
# run_server.py 프로세스 확인
ps aux | grep "run_server.py" | grep -v grep

# 서버 응답 확인
curl -s http://localhost:8121/ && echo "✅ 서버 응답 정상" || echo "❌ 서버 응답 없음"
```

## 🔧 문제 해결

### Address already in use 오류 시
```bash
# 1단계: 포트 정리
lsof -ti:8121 -ti:18765 | xargs kill -9 2>/dev/null

# 2단계: 잠시 대기
sleep 3

# 3단계: 서버 재시작
./start_server_safe.sh background
```

### 서버 무응답 시
```bash
# 강제 종료 후 재시작
pkill -9 -f "run_server.py"
sleep 2
python python_core/run_server.py &
```

## 📊 모니터링 테스트

### WebSocket 연결 테스트
```bash
# 독립 WebSocket 서버 테스트
node test_monitoring_debug.js

# FastAPI WebSocket 엔드포인트 테스트
node test_fastapi_websocket_monitoring.js
```

### 서버 헬스체크
```bash
# REST API 확인
curl -s http://localhost:8121/ | head -5

# 모니터링 상태 확인
curl -s http://localhost:8121/monitoring/monitoring/status
``` 