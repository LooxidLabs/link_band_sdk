#!/bin/bash

# Create Automator app for Link Band SDK Installer
# This script creates a macOS app that runs the installer

INSTALLER_APP="Link Band SDK Installer (Auto).app"
CURRENT_DIR="$(pwd)"

# Create the Automator app structure
mkdir -p "$INSTALLER_APP/Contents/MacOS"
mkdir -p "$INSTALLER_APP/Contents/Resources"

# Create Info.plist
cat > "$INSTALLER_APP/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Application Stub</string>
    <key>CFBundleIconFile</key>
    <string>AutomatorApplet</string>
    <key>CFBundleIdentifier</key>
    <string>com.looxidlabs.linkband.installer.automator</string>
    <key>CFBundleName</key>
    <string>Link Band SDK Installer</string>
    <key>CFBundleDisplayName</key>
    <string>Link Band SDK Installer</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>LSUIElement</key>
    <false/>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Create the main executable
cat > "$INSTALLER_APP/Contents/MacOS/Application Stub" << 'EOF'
#!/bin/bash

# Get the directory where this app is located
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
INSTALLER_SCRIPT="$APP_DIR/install-macos.sh"

# Function to show dialog
show_dialog() {
    osascript -e "display dialog \"$1\" buttons {\"확인\"} default button \"확인\" with icon $2"
}

# Check if installer script exists
if [[ ! -f "$INSTALLER_SCRIPT" ]]; then
    show_dialog "Link Band SDK 설치 스크립트를 찾을 수 없습니다.\\n\\n경로: $INSTALLER_SCRIPT" "stop"
    exit 1
fi

# Show welcome dialog
RESPONSE=$(osascript -e 'display dialog "🚀 Link Band SDK 설치 프로그램\\n\\n이 프로그램은 다음을 자동으로 수행합니다:\\n\\n✓ Python 3.9+ 확인 및 설치\\n✓ 필요한 Python 패키지 설치\\n✓ Link Band SDK 다운로드 및 설치\\n✓ 바로가기 생성\\n\\n설치를 시작하시겠습니까?" buttons {"취소", "설치 시작"} default button "설치 시작" with icon note' 2>/dev/null)

if [[ $RESPONSE == *"설치 시작"* ]]; then
    # Show progress dialog
    osascript -e 'display dialog "설치를 시작합니다...\\n\\n터미널 창이 열리면 설치 과정을 확인할 수 있습니다." buttons {"확인"} default button "확인" with icon note giving up after 3'
    
    # Open Terminal and run installer
    osascript -e "tell application \"Terminal\"
        activate
        do script \"echo '🚀 Link Band SDK 설치 시작...'; cd '$APP_DIR' && bash '$INSTALLER_SCRIPT'\"
    end tell"
else
    exit 0
fi
EOF

# Make executable
chmod +x "$INSTALLER_APP/Contents/MacOS/Application Stub"

# Copy Automator icon if available
if [[ -f "/System/Library/CoreServices/Automator.app/Contents/Resources/AutomatorApplet.icns" ]]; then
    cp "/System/Library/CoreServices/Automator.app/Contents/Resources/AutomatorApplet.icns" "$INSTALLER_APP/Contents/Resources/"
fi

echo "✅ '$INSTALLER_APP' 생성 완료!"
echo "이제 이 앱을 더블클릭하면 Link Band SDK 설치가 시작됩니다." 