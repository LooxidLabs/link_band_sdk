#!/bin/bash

# Simple Windows Python server builder
# Uses basic Ubuntu packages instead of WineHQ

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    Simple Windows Python Server Builder${NC}"
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

echo -e "${BLUE}🐳 Building Windows server using Ubuntu Wine...${NC}"

# Create simple Wine Dockerfile
cat > "$PROJECT_ROOT/Dockerfile.simple-wine" << 'EOF'
FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wine \
    winetricks \
    xvfb \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up Wine environment
ENV WINEARCH=win64
ENV WINEPREFIX=/root/.wine
ENV DISPLAY=:99

# Create virtual display
RUN Xvfb :99 -screen 0 1024x768x16 &

# Initialize Wine
RUN wine wineboot --init || true

# Download Python installer
WORKDIR /tmp
RUN wget -q https://www.python.org/ftp/python/3.11.0/python-3.11.0-amd64.exe

# Set up application directory
WORKDIR /app
COPY python_core/requirements.txt .
COPY python_core/ ./python_core/

# Create build script
COPY scripts/docker-build-simple.sh ./build.sh
RUN chmod +x build.sh

CMD ["bash", "-c", "Xvfb :99 -screen 0 1024x768x16 & sleep 2 && ./build.sh"]
EOF

# Create simple build script
cat > "$PROJECT_ROOT/scripts/docker-build-simple.sh" << 'EOF'
#!/bin/bash
set -e

echo "Setting up Wine environment..."

# Initialize Wine if not already done
wine wineboot --init || true
sleep 5

# Install Python in Wine
echo "Installing Python in Wine..."
wine /tmp/python-3.11.0-amd64.exe /quiet InstallAllUsers=1 PrependPath=1

# Wait for installation to complete
sleep 15

# Try different Python paths
PYTHON_PATHS=(
    "python"
    "C:\\Python311\\python.exe"
    "C:\\Python\\python.exe"
    "C:\\Program Files\\Python311\\python.exe"
)

PYTHON_CMD=""
for path in "${PYTHON_PATHS[@]}"; do
    if wine "$path" --version 2>/dev/null; then
        PYTHON_CMD="$path"
        echo "Found Python at: $path"
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ Python installation failed"
    wine regedit /E python_paths.reg 'HKEY_LOCAL_MACHINE\SOFTWARE\Python'
    cat python_paths.reg || true
    exit 1
fi

# Install pip packages
echo "Installing Python packages..."
wine "$PYTHON_CMD" -m pip install --upgrade pip
wine "$PYTHON_CMD" -m pip install -r requirements.txt
wine "$PYTHON_CMD" -m pip install pyinstaller

# Build the executable
echo "Building Windows executable..."
cd python_core
wine "$PYTHON_CMD" -m PyInstaller --onefile --name linkband-server-windows.exe run_server.py

# Copy to output directory
echo "Copying executable to output..."
if [ -f "dist/linkband-server-windows.exe" ]; then
    cp dist/linkband-server-windows.exe /output/
    echo "✅ Windows server built successfully!"
    ls -la /output/
else
    echo "❌ Build failed - executable not found"
    ls -la dist/ || true
    exit 1
fi
EOF

chmod +x "$PROJECT_ROOT/scripts/docker-build-simple.sh"

# Create output directory
mkdir -p "$PROJECT_ROOT/docker-output"

# Build simple Wine image
echo "Building simple Wine Docker image..."
docker build -f "$PROJECT_ROOT/Dockerfile.simple-wine" -t linkband-simple-wine "$PROJECT_ROOT"

if [ $? -eq 0 ]; then
    echo "Running simple Wine build..."
    docker run --rm -v "$PROJECT_ROOT/docker-output:/output" linkband-simple-wine
    
    if [ -f "$PROJECT_ROOT/docker-output/linkband-server-windows.exe" ]; then
        cp "$PROJECT_ROOT/docker-output/linkband-server-windows.exe" "$INSTALLERS_DIR/windows/"
        echo -e "${GREEN}✅ Windows server built successfully!${NC}"
        echo "Size: $(ls -lh "$INSTALLERS_DIR/windows/linkband-server-windows.exe" | awk '{print $5}')"
    else
        echo -e "${RED}❌ Windows server build failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Cleanup
docker rmi linkband-simple-wine 2>/dev/null || true
rm -rf "$PROJECT_ROOT/docker-output"
rm -f "$PROJECT_ROOT/Dockerfile.simple-wine"

echo -e "${GREEN}🎉 Windows build completed successfully!${NC}" 