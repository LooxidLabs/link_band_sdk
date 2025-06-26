#!/bin/bash

# Windows Python server builder using Wine
# Builds Windows executable on Linux/macOS using Wine

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    Windows Python Server Builder (Wine)${NC}"
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

echo -e "${BLUE}🍷 Building Windows server using Wine...${NC}"

# Create improved Wine Dockerfile
cat > "$PROJECT_ROOT/Dockerfile.wine" << 'EOF'
FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies first
RUN apt-get update && apt-get install -y \
    software-properties-common \
    wget \
    curl \
    gnupg2 \
    ca-certificates \
    apt-transport-https \
    && rm -rf /var/lib/apt/lists/*

# Add Wine repository with proper key handling
RUN mkdir -pm755 /etc/apt/keyrings && \
    wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key && \
    wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/jammy/winehq-jammy.sources

# Install Wine and dependencies
RUN apt-get update && apt-get install -y \
    winehq-stable \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Set up Wine environment
ENV WINEARCH=win64
ENV WINEPREFIX=/root/.wine
ENV DISPLAY=:99

# Create entrypoint script
RUN echo '#!/bin/bash\n\
Xvfb :99 -screen 0 1024x768x16 &\n\
export DISPLAY=:99\n\
wine wineboot --init\n\
exec "$@"' > /entrypoint.sh && chmod +x /entrypoint.sh

# Download Python installer
WORKDIR /tmp
RUN wget -q https://www.python.org/ftp/python/3.11.0/python-3.11.0-amd64.exe

# Set up application directory
WORKDIR /app
COPY python_core/requirements.txt .
COPY python_core/ ./python_core/

# Create build script
COPY scripts/docker-build-windows.sh ./build.sh
RUN chmod +x build.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["./build.sh"]
EOF

# Create Windows build script
cat > "$PROJECT_ROOT/scripts/docker-build-windows.sh" << 'EOF'
#!/bin/bash
set -e

echo "Setting up Wine environment..."

# Wait for Xvfb to start
sleep 2

# Install Python in Wine
echo "Installing Python in Wine..."
wine /tmp/python-3.11.0-amd64.exe /quiet InstallAllUsers=1 PrependPath=1 TargetDir="C:\\Python311"

# Wait for installation to complete
sleep 10

# Verify Python installation
echo "Verifying Python installation..."
wine python --version || {
    echo "Python installation failed, trying alternative path..."
    wine "C:\\Python311\\python.exe" --version
}

# Install pip packages
echo "Installing Python packages..."
wine python -m pip install --upgrade pip
wine python -m pip install -r requirements.txt
wine python -m pip install pyinstaller

# Build the executable
echo "Building Windows executable..."
cd python_core
wine python -m PyInstaller --onefile --name linkband-server-windows.exe run_server.py

# Copy to output directory
echo "Copying executable to output..."
if [ -f "dist/linkband-server-windows.exe" ]; then
    cp dist/linkband-server-windows.exe /output/
    echo "✅ Windows server built successfully!"
else
    echo "❌ Build failed - executable not found"
    ls -la dist/
    exit 1
fi
EOF

chmod +x "$PROJECT_ROOT/scripts/docker-build-windows.sh"

# Create output directory
mkdir -p "$PROJECT_ROOT/docker-output"

# Build Wine-based Windows image
echo "Building Wine Docker image (this may take several minutes)..."
docker build -f "$PROJECT_ROOT/Dockerfile.wine" -t linkband-wine-windows "$PROJECT_ROOT"

if [ $? -eq 0 ]; then
    echo "Running Wine-based Windows build..."
    docker run --rm -v "$PROJECT_ROOT/docker-output:/output" linkband-wine-windows
    
    if [ -f "$PROJECT_ROOT/docker-output/linkband-server-windows.exe" ]; then
        cp "$PROJECT_ROOT/docker-output/linkband-server-windows.exe" "$INSTALLERS_DIR/windows/"
        echo -e "${GREEN}✅ Windows server built successfully!${NC}"
        echo "Size: $(ls -lh "$INSTALLERS_DIR/windows/linkband-server-windows.exe" | awk '{print $5}')"
    else
        echo -e "${RED}❌ Windows server build failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Wine Docker build failed${NC}"
    exit 1
fi

# Cleanup
docker rmi linkband-wine-windows 2>/dev/null || true
rm -rf "$PROJECT_ROOT/docker-output"
rm -f "$PROJECT_ROOT/Dockerfile.wine"

echo -e "${GREEN}🎉 Windows build completed successfully!${NC}" 