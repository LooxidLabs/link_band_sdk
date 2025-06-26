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
