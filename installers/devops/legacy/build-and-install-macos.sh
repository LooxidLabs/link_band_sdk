#!/bin/bash

# Link Band SDK macOS 로컬 빌드 및 설치 스크립트
# Copyright (c) 2025 Looxid Labs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PYTHON_MIN_VERSION="3.9"
SDK_VERSION="1.0.1"
INSTALL_DIR="$HOME/Applications"
SDK_NAME="Link Band SDK"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ELECTRON_APP_DIR="$PROJECT_ROOT/electron-app"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Link Band SDK 로컬 빌드 설치${NC}"
echo -e "${BLUE}  for macOS v${SDK_VERSION}${NC}"
echo -e "${BLUE}================================${NC}"
echo

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare version numbers
version_ge() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# Function to get Python version
get_python_version() {
    python3 -c "import sys; print('.'.join(map(str, sys.version_info[:2])))" 2>/dev/null || echo "0.0"
}

# Step 1: Check Node.js and npm
echo -e "${YELLOW}Step 1: Node.js 환경 확인...${NC}"

if command_exists node && command_exists npm; then
    NODE_VERSION=$(node --version | sed 's/v//')
    echo -e "Found Node.js ${NODE_VERSION}"
    
    if [[ $(echo "$NODE_VERSION" | cut -d. -f1) -ge 18 ]]; then
        echo -e "${GREEN}✓ Node.js ${NODE_VERSION} 호환 가능${NC}"
    else
        echo -e "${RED}✗ Node.js ${NODE_VERSION}는 너무 오래된 버전입니다. 18 이상 필요${NC}"
        echo -e "${YELLOW}Node.js 설치 방법:${NC}"
        echo -e "  ${BLUE}https://nodejs.org/에서 다운로드${NC}"
        echo -e "  ${BLUE}또는 Homebrew: brew install node${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Node.js가 설치되지 않았습니다${NC}"
    echo -e "${YELLOW}Node.js를 설치합니다...${NC}"
    
    if command_exists brew; then
        brew install node
        echo -e "${GREEN}✓ Node.js 설치 완료${NC}"
    else
        echo -e "${RED}Homebrew가 설치되지 않았습니다. Node.js를 수동으로 설치해주세요:${NC}"
        echo -e "  ${BLUE}1. Homebrew 설치: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
        echo -e "  ${BLUE}2. Node.js 설치: brew install node${NC}"
        echo -e "  ${BLUE}3. 이 스크립트를 다시 실행${NC}"
        exit 1
    fi
fi

# Step 2: Check Python installation
echo -e "\n${YELLOW}Step 2: Python 환경 확인...${NC}"

if command_exists python3; then
    PYTHON_VERSION=$(get_python_version)
    echo -e "Found Python ${PYTHON_VERSION}"
    
    if version_ge "$PYTHON_VERSION" "$PYTHON_MIN_VERSION"; then
        echo -e "${GREEN}✓ Python ${PYTHON_VERSION} 호환 가능${NC}"
    else
        echo -e "${RED}✗ Python ${PYTHON_VERSION}는 너무 오래된 버전입니다. ${PYTHON_MIN_VERSION} 이상 필요${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Python 3가 설치되지 않았습니다${NC}"
    echo -e "${YELLOW}Python을 설치합니다...${NC}"
    
    if command_exists brew; then
        brew install python
        echo -e "${GREEN}✓ Python 설치 완료${NC}"
    else
        echo -e "${RED}Python을 수동으로 설치해주세요${NC}"
        exit 1
    fi
fi

# Step 3: Install Python dependencies
echo -e "\n${YELLOW}Step 3: Python 의존성 설치...${NC}"

cd "$PROJECT_ROOT"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "Python 가상환경 생성 중..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo -e "Python 의존성 설치 중..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}✓ Python 의존성 설치 완료${NC}"

# Step 4: Install Node.js dependencies
echo -e "\n${YELLOW}Step 4: Node.js 의존성 설치...${NC}"

cd "$ELECTRON_APP_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "Node.js 의존성 설치 중..."
    npm install
else
    echo -e "Node.js 의존성 업데이트 중..."
    npm install
fi

echo -e "${GREEN}✓ Node.js 의존성 설치 완료${NC}"

# Step 5: Build the application
echo -e "\n${YELLOW}Step 5: 애플리케이션 빌드...${NC}"

echo -e "macOS용 Electron 앱 빌드 중..."
npm run electron:build:mac

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 빌드 완료${NC}"
else
    echo -e "${RED}✗ 빌드 실패${NC}"
    exit 1
fi

# Step 6: Install the built application
echo -e "\n${YELLOW}Step 6: 애플리케이션 설치...${NC}"

# Find the built DMG file
DMG_FILE=$(find "$ELECTRON_APP_DIR/release" -name "*.dmg" | head -1)

if [ -z "$DMG_FILE" ]; then
    echo -e "${RED}✗ 빌드된 DMG 파일을 찾을 수 없습니다${NC}"
    exit 1
fi

echo -e "빌드된 파일: $(basename "$DMG_FILE")"

# Mount the DMG
echo -e "DMG 파일 마운트 중..."
hdiutil attach "$DMG_FILE" -quiet

# Find the mounted volume
VOLUME_NAME=$(ls /Volumes/ | grep -i "link.*band.*sdk" | head -1)

if [ -z "$VOLUME_NAME" ]; then
    echo -e "${RED}✗ 마운트된 볼륨을 찾을 수 없습니다${NC}"
    exit 1
fi

# Copy the application
echo -e "애플리케이션을 Applications 폴더로 복사 중..."
mkdir -p "$INSTALL_DIR"

if [ -d "/Volumes/$VOLUME_NAME/Link Band SDK.app" ]; then
    cp -R "/Volumes/$VOLUME_NAME/Link Band SDK.app" "$INSTALL_DIR/"
    echo -e "${GREEN}✓ 설치 완료: $INSTALL_DIR/Link Band SDK.app${NC}"
else
    echo -e "${RED}✗ DMG에서 애플리케이션을 찾을 수 없습니다${NC}"
    exit 1
fi

# Unmount the DMG
hdiutil detach "/Volumes/$VOLUME_NAME" -quiet

# Step 7: Create desktop shortcut
echo -e "\n${YELLOW}Step 7: 바로가기 생성...${NC}"

if [ -d "$HOME/Desktop" ]; then
    ln -sf "$INSTALL_DIR/Link Band SDK.app" "$HOME/Desktop/Link Band SDK.app" 2>/dev/null || true
    echo -e "${GREEN}✓ 데스크톱 바로가기 생성 완료${NC}"
fi

# Step 8: Final instructions
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}  설치 완료!${NC}"
echo -e "${GREEN}================================${NC}"
echo
echo -e "${YELLOW}실행 방법:${NC}"
echo -e "  • Applications 폴더에서 실행"
echo -e "  • 데스크톱 바로가기"
echo -e "  • Spotlight 검색: 'Link Band SDK'"
echo
echo -e "${YELLOW}개발 모드 실행:${NC}"
echo -e "  cd $ELECTRON_APP_DIR"
echo -e "  npm run electron:preview"
echo
echo -e "${YELLOW}Python 가상환경:${NC}"
echo -e "  위치: $PROJECT_ROOT/venv"
echo -e "  활성화: source $PROJECT_ROOT/venv/bin/activate"
echo
echo -e "${YELLOW}빌드된 파일 위치:${NC}"
echo -e "  DMG: $DMG_FILE"
echo -e "  설치된 앱: $INSTALL_DIR/Link Band SDK.app"
echo 