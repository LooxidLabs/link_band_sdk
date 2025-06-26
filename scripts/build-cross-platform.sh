#!/bin/bash

# Cross-platform Python server builder using Docker
# Builds Python servers for Windows, Linux, and macOS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    Cross-Platform Python Server Builder${NC}"
echo -e "${BLUE}================================================${NC}"
echo

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not running${NC}"
    echo "Please install Docker Desktop and try again"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo -e "${GREEN}✅ Docker is available${NC}"

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALLERS_DIR="$PROJECT_ROOT/installers"

echo -e "${BLUE}🐳 Building cross-platform Python servers...${NC}"

# Create Dockerfile for cross-platform build (without Wine for now)
cat > "$PROJECT_ROOT/Dockerfile.crossbuild" << 'EOF'
FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    wget \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set up Python environment
WORKDIR /app
COPY python_core/requirements.txt .

# Create virtual environment and install dependencies
RUN python3 -m venv venv
RUN . venv/bin/activate && pip install --upgrade pip
RUN . venv/bin/activate && pip install -r requirements.txt
RUN . venv/bin/activate && pip install pyinstaller

# Copy source code
COPY python_core/ ./python_core/

# Build script
COPY scripts/docker-build-servers.sh ./
RUN chmod +x docker-build-servers.sh

CMD ["./docker-build-servers.sh"]
EOF

# Create the build script that runs inside Docker (Linux only for now)
cat > "$PROJECT_ROOT/scripts/docker-build-servers.sh" << 'EOF'
#!/bin/bash
set -e

echo "Building Python servers for Linux..."

# Activate virtual environment
source /app/venv/bin/activate

cd /app/python_core

# Build Linux version
echo "Building Linux server..."
pyinstaller --onefile --name linkband-server-linux run_server.py
cp dist/linkband-server-linux /output/

echo "Linux build completed!"
EOF

chmod +x "$PROJECT_ROOT/scripts/docker-build-servers.sh"

# Create output directory
mkdir -p "$PROJECT_ROOT/docker-output"

# Build Docker image
echo "Building Docker image..."
docker build -f "$PROJECT_ROOT/Dockerfile.crossbuild" -t linkband-crossbuild "$PROJECT_ROOT"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build Docker image${NC}"
    exit 1
fi

# Run container with volume mount for output
echo "Running cross-platform build..."
docker run --rm -v "$PROJECT_ROOT/docker-output:/output" linkband-crossbuild

# Copy results to appropriate directories
if [ -f "$PROJECT_ROOT/docker-output/linkband-server-linux" ]; then
    cp "$PROJECT_ROOT/docker-output/linkband-server-linux" "$INSTALLERS_DIR/linux/"
    chmod +x "$INSTALLERS_DIR/linux/linkband-server-linux"
    echo -e "${GREEN}✅ Linux server built successfully${NC}"
fi

echo -e "${BLUE}🍷 Now attempting Wine-based Windows build...${NC}"

# Create Wine-based Windows build
cat > "$PROJECT_ROOT/Dockerfile.wine" << 'EOF'
FROM ubuntu:20.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    software-properties-common \
    wget \
    gnupg2 \
    && rm -rf /var/lib/apt/lists/*

# Add Wine repository
RUN wget -nc https://dl.winehq.org/wine-builds/winehq.key && \
    apt-key add winehq.key && \
    add-apt-repository 'deb https://dl.winehq.org/wine-builds/ubuntu/ focal main'

# Install Wine
RUN apt-get update && apt-get install -y \
    winehq-stable \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Set up Wine environment
ENV WINEARCH=win64
ENV WINEPREFIX=/root/.wine
ENV DISPLAY=:0

# Initialize Wine
RUN wine wineboot --init

# Download and install Python in Wine
RUN wget https://www.python.org/ftp/python/3.11.0/python-3.11.0-amd64.exe && \
    wine python-3.11.0-amd64.exe /quiet InstallAllUsers=1 PrependPath=1

# Set up Python environment
WORKDIR /app
COPY python_core/requirements.txt .
COPY python_core/ ./python_core/

# Install Python packages in Wine
RUN wine python -m pip install --upgrade pip
RUN wine python -m pip install -r requirements.txt
RUN wine python -m pip install pyinstaller

# Build script
COPY scripts/docker-build-windows.sh ./
RUN chmod +x docker-build-windows.sh

CMD ["./docker-build-windows.sh"]
EOF

# Create Windows build script
cat > "$PROJECT_ROOT/scripts/docker-build-windows.sh" << 'EOF'
#!/bin/bash
set -e

echo "Building Windows server with Wine..."

cd /app/python_core

# Build Windows executable
wine python -m PyInstaller --onefile --name linkband-server-windows.exe run_server.py

# Copy to output
cp dist/linkband-server-windows.exe /output/

echo "Windows build completed!"
EOF

chmod +x "$PROJECT_ROOT/scripts/docker-build-windows.sh"

# Build Wine-based Windows image
echo "Building Wine-based Docker image for Windows..."
docker build -f "$PROJECT_ROOT/Dockerfile.wine" -t linkband-wine-build "$PROJECT_ROOT"

if [ $? -eq 0 ]; then
    echo "Running Wine-based Windows build..."
    docker run --rm -v "$PROJECT_ROOT/docker-output:/output" linkband-wine-build
    
    if [ -f "$PROJECT_ROOT/docker-output/linkband-server-windows.exe" ]; then
        cp "$PROJECT_ROOT/docker-output/linkband-server-windows.exe" "$INSTALLERS_DIR/windows/"
        echo -e "${GREEN}✅ Windows server built successfully${NC}"
    else
        echo -e "${YELLOW}⚠️ Windows server build failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Wine Docker build failed, skipping Windows build${NC}"
fi

# Cleanup
docker rmi linkband-crossbuild 2>/dev/null || true
docker rmi linkband-wine-build 2>/dev/null || true
rm -rf "$PROJECT_ROOT/docker-output"
rm -f "$PROJECT_ROOT/Dockerfile.crossbuild"
rm -f "$PROJECT_ROOT/Dockerfile.wine"

echo -e "${GREEN}🎉 Cross-platform build completed!${NC}" 