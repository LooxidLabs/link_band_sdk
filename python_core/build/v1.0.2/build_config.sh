#!/bin/bash

# Link Band SDK Build Configuration v1.0.2
# 이 파일은 버전별 빌드 설정을 정의합니다.

# 버전 정보
export BUILD_VERSION="1.0.2"
export BUILD_DATE=$(date +"%Y-%m-%d")

# 빌드 설정
export BUILD_NAME="linkband-server"
export BUILD_DESCRIPTION="MNE-enabled build with full dependencies"

# 필수 패키지 목록
export REQUIRED_PACKAGES=(
    "pyinstaller"
    "fastapi"
    "uvicorn"
    "websockets"
    "bleak"
    "numpy"
    "scipy"
    "psutil"
    "python-dotenv"
    "python-multipart"
    "aiosqlite"
    "mne"
    "matplotlib"
    "scikit-learn"
    "heartpy"
)

# 플랫폼별 파일명 생성 함수
get_executable_name() {
    local platform=$1
    echo "${BUILD_NAME}-${platform}-v${BUILD_VERSION}"
}

# 배포 디렉토리 경로 생성 함수
get_distribution_dir() {
    local platform=$1
    echo "distribution/v${BUILD_VERSION}/${platform}"
}

# PyInstaller spec 파일명 생성 함수
get_spec_filename() {
    local platform=$1
    echo "${BUILD_NAME}_${platform}_v${BUILD_VERSION//./_}.spec"
}

# 공통 hidden imports (플랫폼별로 추가 가능)
export COMMON_HIDDEN_IMPORTS=(
    # Core modules
    "sqlite3" "json" "logging" "pathlib" "threading" "queue"
    "time" "datetime" "os" "sys" "platform" "signal" "atexit"
    "asyncio" "asyncio.subprocess" "asyncio.queues" "asyncio.selector_events"
    "concurrent" "concurrent.futures"
    
    # Encoding
    "encodings" "encodings.utf_8" "encodings.ascii" "encodings.latin_1"
    
    # Web server
    "uvicorn" "uvicorn.logging" "uvicorn.loops" "uvicorn.loops.auto"
    "uvicorn.protocols" "uvicorn.protocols.http" "uvicorn.protocols.http.auto"
    "uvicorn.protocols.websockets" "uvicorn.protocols.websockets.auto"
    "uvicorn.lifespan" "uvicorn.lifespan.on"
    "fastapi" "fastapi.middleware" "fastapi.middleware.cors"
    "fastapi.staticfiles" "fastapi.responses"
    "websockets" "websockets.server" "websockets.protocol" "websockets.exceptions"
    
    # Bluetooth
    "bleak" "bleak.backends"
    
    # Scientific computing
    "numpy" "numpy.core" "numpy.lib" "numpy.linalg" "numpy.fft" "numpy.random"
    "scipy" "scipy.signal" "scipy.stats" "scipy.fft" "scipy.interpolate"
    "scipy.optimize" "scipy.sparse" "scipy.special" "scipy.integrate"
    "scipy.linalg" "scipy.ndimage"
    
    # MNE
    "mne" "mne.io" "mne.filter" "mne.viz" "mne.channels" "mne.datasets"
    "mne.epochs" "mne.event" "mne.forward" "mne.minimum_norm"
    "mne.preprocessing" "mne.source_estimate" "mne.source_space"
    "mne.surface" "mne.time_frequency" "mne.utils" "mne.viz.backends"
    "mne.transforms" "mne.bem" "mne.coreg" "mne.defaults"
    "mne.externals" "mne.simulation"
    
    # Signal processing
    "heartpy" "sklearn" "sklearn.preprocessing" "sklearn.decomposition"
    "sklearn.base" "sklearn.utils" "sklearn.metrics"
    
    # System
    "psutil"
    
    # Utils
    "python-dotenv" "dotenv" "python-multipart" "multipart"
    "importlib-metadata" "importlib_metadata" "lazy_loader"
    
    # Visualization
    "matplotlib" "matplotlib.pyplot" "matplotlib.backends"
    "matplotlib.backends.backend_agg" "matplotlib.figure"
    "matplotlib.patches" "matplotlib.colors" "matplotlib.cm"
    
    # App modules
    "app" "app.main" "app.api" "app.core" "app.services"
    "app.data" "app.database" "app.models"
    
    # Database
    "sqlite3" "sqlite3.dbapi2" "_sqlite3" "aiosqlite"
    
    # File handling
    "csv" "io" "tempfile" "shutil" "glob" "fnmatch"
    
    # Package utilities
    "pkg_resources" "jaraco" "jaraco.classes" "jaraco.functools"
    "jaraco.context" "jaraco.text" "jaraco.collections" "jaraco.structures"
)

# 플랫폼별 추가 hidden imports (함수로 구현)
get_platform_hidden_imports() {
    local platform=$1
    case $platform in
        macos-arm64|macos-intel)
            echo "asyncio.unix_events bleak.backends.corebluetooth bleak.backends.corebluetooth.client bleak.backends.corebluetooth.scanner"
            ;;
        windows)
            echo "asyncio.windows_events encodings.cp1252 encodings.mbcs bleak.backends.winrt bleak.backends.winrt.client bleak.backends.winrt.scanner"
            ;;
        linux)
            echo "asyncio.unix_events bleak.backends.bluezdbus bleak.backends.bluezdbus.client bleak.backends.bluezdbus.scanner"
            ;;
        *)
            echo ""
            ;;
    esac
}

# 플랫폼별 PyInstaller 옵션 (함수로 구현)
get_platform_options() {
    local platform=$1
    case $platform in
        macos-arm64|macos-intel)
            echo "--noupx"
            ;;
        windows|linux)
            echo ""  # UPX는 기본적으로 활성화됨
            ;;
        *)
            echo ""
            ;;
    esac
}

echo "✅ Build configuration v${BUILD_VERSION} loaded" 