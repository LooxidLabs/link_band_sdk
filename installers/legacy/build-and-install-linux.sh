#!/bin/bash

# Link Band SDK Linux 로컬 빌드 및 설치 스크립트
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
echo -e "${BLUE}  for Linux v${SDK_VERSION}${NC}"
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

# Function to detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo $ID
    elif command_exists lsb_release; then
        lsb_release -si | tr '[:upper:]' '[:lower:]'
    else
        echo "unknown"
    fi
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
        exit 1
    fi
else
    echo -e "${RED}✗ Node.js가 설치되지 않았습니다${NC}"
    echo -e "${YELLOW}Node.js를 설치합니다...${NC}"
    
    DISTRO=$(detect_distro)
    case $DISTRO in
        ubuntu|debian)
            sudo apt update
            sudo apt install -y nodejs npm
            ;;
        fedora|centos|rhel)
            sudo dnf install -y nodejs npm
            ;;
        arch)
            sudo pacman -S nodejs npm
            ;;
        opensuse*)
            sudo zypper install -y nodejs npm
            ;;
        *)
            echo -e "${RED}지원되지 않는 배포판입니다. Node.js를 수동으로 설치해주세요${NC}"
            echo -e "  ${BLUE}https://nodejs.org/에서 다운로드${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓ Node.js 설치 완료${NC}"
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
    
    DISTRO=$(detect_distro)
    case $DISTRO in
        ubuntu|debian)
            sudo apt update
            sudo apt install -y python3 python3-pip python3-venv
            ;;
        fedora|centos|rhel)
            sudo dnf install -y python3 python3-pip
            ;;
        arch)
            sudo pacman -S python python-pip
            ;;
        opensuse*)
            sudo zypper install -y python3 python3-pip
            ;;
        *)
            echo -e "${RED}지원되지 않는 배포판입니다. Python을 수동으로 설치해주세요${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✓ Python 설치 완료${NC}"
fi

# Step 3: Install system dependencies for Electron
echo -e "\n${YELLOW}Step 3: 시스템 의존성 설치...${NC}"

DISTRO=$(detect_distro)
case $DISTRO in
    ubuntu|debian)
        sudo apt update
        sudo apt install -y libnss3-dev libatk-bridge2.0-dev libdrm2 libxkbcommon0 libxss1 libasound2 libxtst6 libxrandr2 libasound2-dev libpangocairo-1.0-0 libatk1.0-dev libcairo-gobject2 libgtk-3-dev libgdk-pixbuf2.0-dev
        ;;
    fedora|centos|rhel)
        sudo dnf install -y nss atk at-spi2-atk libdrm libxkbcommon libXScrnSaver alsa-lib libXtst libXrandr alsa-lib-devel atk-devel cairo-gobject-devel gtk3-devel gdk-pixbuf2-devel
        ;;
    arch)
        sudo pacman -S nss atk at-spi2-atk libdrm libxkbcommon libxss alsa-lib libxtst libxrandr
        ;;
    opensuse*)
        sudo zypper install -y mozilla-nss libatk-1_0-0 at-spi2-atk libdrm2 libxkbcommon0 libXss1 alsa libasound2 libXtst6 libXrandr2
        ;;
esac

echo -e "${GREEN}✓ 시스템 의존성 설치 완료${NC}"

# Step 4: Install Python dependencies
echo -e "\n${YELLOW}Step 4: Python 의존성 설치...${NC}"

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

# Step 5: Install Node.js dependencies
echo -e "\n${YELLOW}Step 5: Node.js 의존성 설치...${NC}"

cd "$ELECTRON_APP_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "Node.js 의존성 설치 중..."
    npm install
else
    echo -e "Node.js 의존성 업데이트 중..."
    npm install
fi

echo -e "${GREEN}✓ Node.js 의존성 설치 완료${NC}"

# Step 6: Build the application
echo -e "\n${YELLOW}Step 6: 애플리케이션 빌드...${NC}"

echo -e "Linux용 Electron 앱 빌드 중..."
npm run electron:build:linux

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 빌드 완료${NC}"
else
    echo -e "${RED}✗ 빌드 실패${NC}"
    exit 1
fi

# Step 7: Install the built application
echo -e "\n${YELLOW}Step 7: 애플리케이션 설치...${NC}"

# Find the built AppImage file
APPIMAGE_FILE=$(find "$ELECTRON_APP_DIR/release" -name "*.AppImage" | head -1)

if [ -z "$APPIMAGE_FILE" ]; then
    echo -e "${RED}✗ 빌드된 AppImage 파일을 찾을 수 없습니다${NC}"
    exit 1
fi

echo -e "빌드된 파일: $(basename "$APPIMAGE_FILE")"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Copy and make executable
cp "$APPIMAGE_FILE" "$INSTALL_DIR/LinkBandSDK.AppImage"
chmod +x "$INSTALL_DIR/LinkBandSDK.AppImage"

echo -e "${GREEN}✓ 설치 완료: $INSTALL_DIR/LinkBandSDK.AppImage${NC}"

# Step 8: Create desktop entry
echo -e "\n${YELLOW}Step 8: 데스크톱 엔트리 생성...${NC}"

DESKTOP_FILE="$HOME/.local/share/applications/linkband-sdk.desktop"
mkdir -p "$(dirname "$DESKTOP_FILE")"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=Link Band SDK
Comment=Link Band SDK - Next-generation ultra-lightweight EEG headband SDK
Exec=$INSTALL_DIR/LinkBandSDK.AppImage
Icon=linkband-sdk
Terminal=false
Type=Application
Categories=Development;Science;Utility;
StartupWMClass=Link Band SDK
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 데스크톱 엔트리 생성 완료${NC}"
    
    # Update desktop database if available
    if command_exists update-desktop-database; then
        update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
    fi
else
    echo -e "${YELLOW}⚠ 데스크톱 엔트리 생성 실패 (선택사항)${NC}"
fi

# Step 9: Final instructions
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}  설치 완료!${NC}"
echo -e "${GREEN}================================${NC}"
echo
echo -e "${YELLOW}실행 방법:${NC}"
echo -e "  • 애플리케이션 메뉴에서 'Link Band SDK' 검색"
echo -e "  • 터미널: $INSTALL_DIR/LinkBandSDK.AppImage"
echo -e "  • 파일 매니저에서 더블클릭"
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
echo -e "  AppImage: $APPIMAGE_FILE"
echo -e "  설치된 앱: $INSTALL_DIR/LinkBandSDK.AppImage"
echo 