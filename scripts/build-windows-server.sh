#!/bin/bash

# Build Windows Python server using Docker
# This script creates a Windows executable from Python source

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    Windows Python Server Builder (Docker)${NC}"
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
PYTHON_CORE_DIR="$PROJECT_ROOT/python_core"
INSTALLERS_DIR="$PROJECT_ROOT/installers"

echo -e "${BLUE}🐳 Building Windows Python server using Docker...${NC}"

# Create Dockerfile for Windows Python build
cat > "$PROJECT_ROOT/Dockerfile.windows" << 'EOF'
# Use Windows Server Core with Python
FROM python:3.11-windowsservercore

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY python_core/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install PyInstaller
RUN pip install pyinstaller

# Copy Python source code
COPY python_core/ ./python_core/

# Build the executable
WORKDIR /app/python_core
RUN pyinstaller --onefile --name linkband-server-windows run_server.py

# The output will be in dist/linkband-server-windows.exe
EOF

# Build Docker image
echo "Building Docker image for Windows..."
docker build -f "$PROJECT_ROOT/Dockerfile.windows" -t linkband-windows-builder "$PROJECT_ROOT"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build Docker image${NC}"
    exit 1
fi

# Run container and copy the executable
echo "Extracting Windows executable..."
CONTAINER_ID=$(docker create linkband-windows-builder)
docker cp "$CONTAINER_ID:/app/python_core/dist/linkband-server-windows.exe" "$INSTALLERS_DIR/windows/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Windows Python server built successfully${NC}"
    echo "Output: $INSTALLERS_DIR/windows/linkband-server-windows.exe"
else
    echo -e "${RED}❌ Failed to extract Windows executable${NC}"
    exit 1
fi

# Cleanup
docker rm "$CONTAINER_ID"
docker rmi linkband-windows-builder
rm "$PROJECT_ROOT/Dockerfile.windows"

echo -e "${GREEN}🎉 Windows Python server build completed!${NC}" 