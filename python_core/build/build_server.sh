#!/bin/bash

# Link Band SDK Universal Build Script
# Usage: ./build_server.sh <platform> [version]
# Platforms: macos-arm64, macos-intel, windows, linux

set -e

# 사용법 출력
usage() {
    echo "Usage: $0 <platform> [version]"
    echo ""
    echo "Platforms:"
    echo "  macos-arm64    macOS Apple Silicon"
    echo "  macos-intel    macOS Intel"
    echo "  windows        Windows x64"
    echo "  linux          Linux x64"
    echo ""
    echo "Examples:"
    echo "  $0 macos-arm64           # Use default version from config"
    echo "  $0 windows 1.0.3         # Use specific version"
    echo ""
    exit 1
}

# 매개변수 검증
if [ $# -lt 1 ]; then
    echo "Error: Platform is required"
    usage
fi

PLATFORM=$1
VERSION=${2:-}

# 지원 플랫폼 검증
case $PLATFORM in
    macos-arm64|macos-intel|windows|linux)
        ;;
    *)
        echo "Error: Unsupported platform '$PLATFORM'"
        usage
        ;;
esac

# 스크립트 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_CORE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Link Band SDK Build Script"
echo "Platform: $PLATFORM"
echo "Script Dir: $SCRIPT_DIR"
echo "Python Core Dir: $PYTHON_CORE_DIR"

# 버전별 설정 로드
if [ -n "$VERSION" ]; then
    CONFIG_FILE="$SCRIPT_DIR/v$VERSION/build_config.sh"
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "❌ Error: Configuration file not found: $CONFIG_FILE"
        echo "Available versions:"
        ls -1 "$SCRIPT_DIR" | grep "^v" | sort -V
        exit 1
    fi
else
    # 기본 버전 찾기 (최신 버전)
    LATEST_VERSION=$(ls -1 "$SCRIPT_DIR" | grep "^v" | sort -V | tail -1)
    if [ -z "$LATEST_VERSION" ]; then
        echo "❌ Error: No version directories found"
        exit 1
    fi
    CONFIG_FILE="$SCRIPT_DIR/$LATEST_VERSION/build_config.sh"
    VERSION=${LATEST_VERSION#v}
fi

echo "Version: $VERSION"
echo "Config: $CONFIG_FILE"

# 설정 파일 로드
source "$CONFIG_FILE"

# Python 환경 확인
cd "$PYTHON_CORE_DIR"

# 가상환경 확인 (활성화된 환경 또는 venv 디렉토리 존재)
if [ -n "$VIRTUAL_ENV" ]; then
    echo "✅ Using active virtual environment: $VIRTUAL_ENV"
elif [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
else
    echo "❌ Error: Virtual environment not found"
    echo "Please create virtual environment first:"
    echo "  python -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

# 패키지 설치 확인
echo "🔍 Checking required packages..."
for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! pip show "$package" >/dev/null 2>&1; then
        echo "❌ Missing package: $package"
        echo "Installing..."
        pip install "$package"
    fi
done

# 빌드 디렉토리 생성
BUILD_DIR="$PYTHON_CORE_DIR/build/temp"
DIST_DIR="$PYTHON_CORE_DIR/$(get_distribution_dir $PLATFORM)"
EXECUTABLE_NAME="$(get_executable_name $PLATFORM)"
SPEC_FILE="$BUILD_DIR/$(get_spec_filename $PLATFORM)"

echo "📁 Creating build directories..."
mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

# Hidden imports 결합
ALL_HIDDEN_IMPORTS=("${COMMON_HIDDEN_IMPORTS[@]}")
PLATFORM_IMPORTS_STR=$(get_platform_hidden_imports "$PLATFORM")
if [ -n "$PLATFORM_IMPORTS_STR" ]; then
    IFS=' ' read -ra PLATFORM_IMPORTS <<< "$PLATFORM_IMPORTS_STR"
    ALL_HIDDEN_IMPORTS+=("${PLATFORM_IMPORTS[@]}")
fi

# Hidden imports를 PyInstaller 형식으로 변환
HIDDEN_IMPORTS_STR=""
for import in "${ALL_HIDDEN_IMPORTS[@]}"; do
    HIDDEN_IMPORTS_STR="$HIDDEN_IMPORTS_STR'$import', "
done

# PyInstaller spec 파일 생성
echo "📝 Generating PyInstaller spec file..."
cat > "$SPEC_FILE" << EOF
# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['$PYTHON_CORE_DIR/run_server.py'],
    pathex=['$PYTHON_CORE_DIR'],
    binaries=[],
    datas=[
        ('$PYTHON_CORE_DIR/app/data', 'app/data'),
        ('$PYTHON_CORE_DIR/database', 'database'),
    ],
    hiddenimports=[
        $HIDDEN_IMPORTS_STR
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='$EXECUTABLE_NAME',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
EOF

# 플랫폼별 옵션 적용
PLATFORM_OPTS=$(get_platform_options "$PLATFORM")
if [ -n "$PLATFORM_OPTS" ]; then
    echo "🔧 Applying platform-specific options: $PLATFORM_OPTS"
fi

# PyInstaller 실행
echo "🔨 Building executable..."
echo "Spec file: $SPEC_FILE"
echo "Output: $DIST_DIR/$EXECUTABLE_NAME"

cd "$BUILD_DIR"
pyinstaller --distpath="$DIST_DIR" "$SPEC_FILE"

# 빌드 결과 확인
if [ -f "$DIST_DIR/$EXECUTABLE_NAME" ]; then
    FILE_SIZE=$(du -h "$DIST_DIR/$EXECUTABLE_NAME" | cut -f1)
    echo ""
    echo "✅ Build completed successfully!"
    echo "📦 Executable: $DIST_DIR/$EXECUTABLE_NAME"
    echo "📏 Size: $FILE_SIZE"
    echo "🏷️  Version: $BUILD_VERSION"
    echo "🗓️  Built: $BUILD_DATE"
    echo ""
    echo "To test the server:"
    echo "  $DIST_DIR/$EXECUTABLE_NAME"
    echo ""
else
    echo "❌ Build failed - executable not found"
    exit 1
fi

# 임시 파일 정리
echo "🧹 Cleaning up temporary files..."
rm -rf "$BUILD_DIR"

echo "🎉 Build process completed!" 