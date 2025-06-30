#!/bin/bash

# Link Band SDK 안전한 서버 시작 스크립트
# 기존 프로세스를 안전하게 정리하고 새 서버를 시작합니다.

echo "🚀 Link Band SDK 서버 안전 시작"
echo "================================"

# 1. 현재 프로세스 상태 확인
echo "📊 현재 서버 상태 확인..."

# Python 서버 프로세스 확인
PYTHON_PIDS=$(pgrep -f "python.*run_server.py" 2>/dev/null || true)
UVICORN_PIDS=$(pgrep -f "uvicorn.*app.main:app" 2>/dev/null || true)

# 포트 점유 상태 확인
PORT_8121=$(lsof -ti :8121 2>/dev/null || true)
PORT_18765=$(lsof -ti :18765 2>/dev/null || true)

echo "   Python 서버 프로세스: ${PYTHON_PIDS:-없음}"
echo "   Uvicorn 프로세스: ${UVICORN_PIDS:-없음}"
echo "   포트 8121 점유: ${PORT_8121:-없음}"
echo "   포트 18765 점유: ${PORT_18765:-없음}"

# 2. 기존 프로세스 안전하게 정리
if [[ -n "$PYTHON_PIDS" ]] || [[ -n "$UVICORN_PIDS" ]] || [[ -n "$PORT_8121" ]] || [[ -n "$PORT_18765" ]]; then
    echo ""
    echo "🧹 기존 프로세스 정리 중..."
    
    # Python 서버 프로세스 종료
    if [[ -n "$PYTHON_PIDS" ]]; then
        echo "   Python 서버 프로세스 종료: $PYTHON_PIDS"
        echo "$PYTHON_PIDS" | xargs -r kill -TERM 2>/dev/null || true
    fi
    
    # Uvicorn 프로세스 종료
    if [[ -n "$UVICORN_PIDS" ]]; then
        echo "   Uvicorn 프로세스 종료: $UVICORN_PIDS"
        echo "$UVICORN_PIDS" | xargs -r kill -TERM 2>/dev/null || true
    fi
    
    # 포트 점유 프로세스 종료
    if [[ -n "$PORT_8121" ]]; then
        echo "   포트 8121 점유 프로세스 종료: $PORT_8121"
        echo "$PORT_8121" | xargs -r kill -TERM 2>/dev/null || true
    fi
    
    if [[ -n "$PORT_18765" ]]; then
        echo "   포트 18765 점유 프로세스 종료: $PORT_18765"
        echo "$PORT_18765" | xargs -r kill -TERM 2>/dev/null || true
    fi
    
    # 프로세스 종료 대기
    echo "   ⏳ 프로세스 종료 대기 (5초)..."
    sleep 5
    
    # 강제 종료가 필요한 프로세스 확인
    REMAINING_PIDS=$(lsof -ti :8121,:18765 2>/dev/null || true)
    if [[ -n "$REMAINING_PIDS" ]]; then
        echo "   ⚠️  일부 프로세스가 아직 실행 중 - 강제 종료: $REMAINING_PIDS"
        echo "$REMAINING_PIDS" | xargs -r kill -KILL 2>/dev/null || true
        sleep 2
    fi
    
    echo "   ✅ 프로세스 정리 완료"
else
    echo "   ✅ 정리할 프로세스 없음"
fi

# 3. 포트 상태 최종 확인
echo ""
echo "🔍 포트 상태 최종 확인..."
FINAL_8121=$(lsof -ti :8121 2>/dev/null || true)
FINAL_18765=$(lsof -ti :18765 2>/dev/null || true)

if [[ -n "$FINAL_8121" ]] || [[ -n "$FINAL_18765" ]]; then
    echo "   ⚠️  포트가 아직 점유되어 있습니다:"
    [[ -n "$FINAL_8121" ]] && echo "      포트 8121: $FINAL_8121"
    [[ -n "$FINAL_18765" ]] && echo "      포트 18765: $FINAL_18765"
    echo "   잠시 후 다시 시도하거나 수동으로 프로세스를 종료해주세요."
    exit 1
else
    echo "   ✅ 모든 포트가 사용 가능합니다"
fi

# 4. 새 서버 시작
echo ""
echo "🚀 새 서버 시작 중..."
echo "   서버 주소: http://localhost:8121"
echo "   WebSocket: ws://localhost:18765"
echo "   API 문서: http://localhost:8121/docs"
echo ""

cd python_core

# 가상환경 활성화 (있는 경우)
if [[ -f "../venv/bin/activate" ]]; then
    echo "   📦 가상환경 활성화..."
    source ../venv/bin/activate
fi

# 서버 시작 (--no-cleanup 옵션으로 중복 정리 방지)
python run_server.py --no-cleanup

echo ""
echo "🛑 서버가 종료되었습니다." 