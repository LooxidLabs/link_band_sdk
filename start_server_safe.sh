#!/bin/bash

# Link Band SDK 서버 안전 시작 스크립트
echo "=== Link Band SDK 서버 안전 시작 ==="

# 1. 기존 프로세스 확인 및 종료
echo "1. 기존 서버 프로세스 확인 중..."

# run_server.py 프로세스 종료
PYTHON_PIDS=$(ps aux | grep "run_server.py" | grep -v grep | awk '{print $2}')
if [ ! -z "$PYTHON_PIDS" ]; then
    echo "   기존 Python 서버 프로세스 발견: $PYTHON_PIDS"
    echo $PYTHON_PIDS | xargs kill -15 2>/dev/null
    sleep 2
    echo $PYTHON_PIDS | xargs kill -9 2>/dev/null
    echo "   ✅ Python 서버 프로세스 종료 완료"
else
    echo "   ✅ 실행 중인 Python 서버 프로세스 없음"
fi

# 2. 포트 점유 프로세스 확인 및 해제
echo "2. 포트 점유 상태 확인 중..."

# 8121 포트 확인
PORT_8121=$(lsof -ti:8121 2>/dev/null)
if [ ! -z "$PORT_8121" ]; then
    echo "   포트 8121 점유 중: $PORT_8121"
    kill -9 $PORT_8121 2>/dev/null
    echo "   ✅ 포트 8121 해제 완료"
else
    echo "   ✅ 포트 8121 사용 가능"
fi

# 18765 포트 확인
PORT_18765=$(lsof -ti:18765 2>/dev/null)
if [ ! -z "$PORT_18765" ]; then
    echo "   포트 18765 점유 중: $PORT_18765"
    kill -9 $PORT_18765 2>/dev/null
    echo "   ✅ 포트 18765 해제 완료"
else
    echo "   ✅ 포트 18765 사용 가능"
fi

# 3. 잠시 대기 (포트 해제 완료 대기)
echo "3. 포트 해제 완료 대기 중..."
sleep 3

# 4. 새 서버 시작
echo "4. 새 서버 시작 중..."
cd "$(dirname "$0")"

if [ "$1" = "background" ]; then
    echo "   백그라운드 모드로 서버 시작..."
    python python_core/run_server.py &
    SERVER_PID=$!
    echo "   ✅ 서버가 백그라운드에서 시작됨 (PID: $SERVER_PID)"
    
    # 서버 시작 확인
    sleep 5
    if curl -s http://localhost:8121/ > /dev/null 2>&1; then
        echo "   ✅ 서버가 정상적으로 시작되었습니다!"
        echo "   📡 REST API: http://localhost:8121"
        echo "   🔌 WebSocket: ws://localhost:18765"
        echo "   📚 API 문서: http://localhost:8121/docs"
    else
        echo "   ❌ 서버 시작 실패 - 로그를 확인해주세요"
        exit 1
    fi
else
    echo "   포그라운드 모드로 서버 시작..."
    echo "   (Ctrl+C로 종료 가능)"
    python python_core/run_server.py
fi

echo "=== 서버 시작 완료 ===" 