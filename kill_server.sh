#!/bin/bash

echo "=== Link Band SDK 서버 종료 ==="

# 1. run_server.py 프로세스 종료
PYTHON_PIDS=$(ps aux | grep "run_server.py" | grep -v grep | awk '{print $2}')
if [ ! -z "$PYTHON_PIDS" ]; then
    echo "Python 서버 프로세스 종료 중: $PYTHON_PIDS"
    echo $PYTHON_PIDS | xargs kill -15 2>/dev/null
    sleep 2
    echo $PYTHON_PIDS | xargs kill -9 2>/dev/null
    echo "✅ Python 서버 프로세스 종료 완료"
fi

# 2. 포트 점유 프로세스 해제
for port in 8121 18765; do
    PORT_PID=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo "포트 $port 해제 중: $PORT_PID"
        kill -9 $PORT_PID 2>/dev/null
        echo "✅ 포트 $port 해제 완료"
    else
        echo "✅ 포트 $port 이미 사용 가능"
    fi
done

echo "=== 서버 종료 완료 ===" 