#!/bin/bash

set -e

TEMPLATE="$(dirname "$0")/com.linkband.runserver.plist.template"
PLIST="$HOME/Library/LaunchAgents/com.linkband.runserver.plist"
PROJECT_PATH="$(cd "$(dirname "$0")/../.." && pwd)"
PYTHON_PATH="$(which python3)"

if [ ! -f "$TEMPLATE" ]; then
  echo "Template file not found: $TEMPLATE"
  exit 1
fi

echo "Registering launchd service for run_server.py..."

sed "s#__PROJECT_PATH__#${PROJECT_PATH}#g; s#__PYTHON_PATH__#${PYTHON_PATH}#g" "$TEMPLATE" > "$PLIST"

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Done. You can check with: launchctl list | grep com.linkband.runserver"
if launchctl list | grep com.linkband.runserver; then
  echo '서비스가 정상 등록되었습니다.'
else
  echo '서비스 등록에 실패했습니다. plist와 경로를 확인하세요.' 