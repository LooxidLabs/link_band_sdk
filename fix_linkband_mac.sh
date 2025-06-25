#!/bin/bash
# Link Band SDK Mac 실행 문제 해결 스크립트

echo "🔧 Link Band SDK Mac 실행 문제 해결 스크립트"
echo "=============================================="
echo ""

# 관리자 권한 확인
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  이 스크립트를 sudo로 실행하지 마세요. 일반 사용자로 실행하세요."
    exit 1
fi

echo "📋 현재 상황 확인 중..."

# DMG 파일들 확인 및 처리
dmg_found=false

if [ -f "$HOME/Downloads/Link Band SDK-1.0.0-arm64.dmg" ]; then
    echo "✅ Apple Silicon DMG 파일 발견"
    echo "🔄 Quarantine 속성 제거 중..."
    sudo xattr -rd com.apple.quarantine "$HOME/Downloads/Link Band SDK-1.0.0-arm64.dmg"
    dmg_found=true
fi

if [ -f "$HOME/Downloads/Link Band SDK-1.0.0.dmg" ]; then
    echo "✅ Intel DMG 파일 발견"
    echo "🔄 Quarantine 속성 제거 중..."
    sudo xattr -rd com.apple.quarantine "$HOME/Downloads/Link Band SDK-1.0.0.dmg"
    dmg_found=true
fi

# 설치된 앱 확인 및 처리
if [ -d "/Applications/Link Band SDK.app" ]; then
    echo "✅ 설치된 앱 발견"
    echo "🔄 앱 Quarantine 속성 제거 중..."
    sudo xattr -rd com.apple.quarantine "/Applications/Link Band SDK.app"
    
    echo "✨ 문제 해결 완료!"
    echo "🚀 앱을 실행합니다..."
    open "/Applications/Link Band SDK.app"
    
elif [ "$dmg_found" = true ]; then
    echo "📦 DMG 파일은 처리되었습니다."
    echo "💡 이제 DMG 파일을 열어서 앱을 Applications 폴더로 드래그하세요."
    echo "   그 후 이 스크립트를 다시 실행하면 앱을 자동으로 실행합니다."
    
else
    echo "❌ Link Band SDK 파일을 찾을 수 없습니다."
    echo "💡 다음을 확인하세요:"
    echo "   1. DMG 파일이 Downloads 폴더에 있는지 확인"
    echo "   2. 파일명이 정확한지 확인:"
    echo "      - Link Band SDK-1.0.0-arm64.dmg (Apple Silicon)"
    echo "      - Link Band SDK-1.0.0.dmg (Intel)"
fi

echo ""
echo "📞 추가 도움이 필요하면:"
echo "   GitHub Issues: https://github.com/Brian-Chae/link_band_sdk/issues"
echo "   이메일: support@looxidlabs.com" 