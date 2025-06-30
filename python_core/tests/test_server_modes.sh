#!/bin/bash

echo "🔧 Link Band SDK 서버 모드 테스트 스크립트"
echo "============================================"
echo ""

# 현재 디렉토리 확인
if [ ! -d "electron-app" ]; then
    echo "❌ electron-app 디렉토리를 찾을 수 없습니다."
    echo "   프로젝트 루트에서 실행해주세요."
    exit 1
fi

if [ ! -d "python_core" ]; then
    echo "❌ python_core 디렉토리를 찾을 수 없습니다."
    echo "   프로젝트 루트에서 실행해주세요."
    exit 1
fi

echo "📁 디렉토리 구조 확인 완료"
echo ""

# 사용법 출력
echo "🚀 사용 가능한 모드:"
echo ""
echo "1. 기본 모드 (코드 서버 자동 시작):"
echo "   cd electron-app && npm run electron:preview"
echo ""
echo "2. 코드 테스트 모드 (서버 수동 시작):"
echo "   cd electron-app && npm run electron:preview:code"
echo "   # 별도 터미널에서: npm run server:dev"
echo ""
echo "3. 빌드 서버 테스트 모드:"
echo "   cd electron-app && npm run electron:preview:server"
echo ""
echo "4. 서버만 실행:"
echo "   cd electron-app && npm run server:dev      # 코드 버전"
echo "   cd electron-app && npm run server:built    # 빌드 버전"
echo ""

# 빌드된 서버 파일 확인
BUILT_SERVER="python_core/distribution/v1.0.2/macos-arm64/linkband-server-macos-arm64-v1.0.2"
if [ -f "$BUILT_SERVER" ]; then
    echo "✅ 빌드된 서버 파일 존재: $BUILT_SERVER"
else
    echo "⚠️  빌드된 서버 파일 없음: $BUILT_SERVER"
    echo "   빌드 서버 테스트 모드는 사용할 수 없습니다."
fi

# run_server.py 확인
if [ -f "python_core/run_server.py" ]; then
    echo "✅ 개발 서버 파일 존재: python_core/run_server.py"
else
    echo "❌ 개발 서버 파일 없음: python_core/run_server.py"
fi

echo ""
echo "🔍 processed EEG 데이터 문제 디버깅 순서:"
echo "1. npm run electron:preview        # 코드 서버로 테스트"
echo "2. npm run electron:preview:server # 빌드 서버로 테스트"
echo "3. 결과 비교하여 문제 원인 파악"
echo "" 