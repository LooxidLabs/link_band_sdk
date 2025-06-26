#!/bin/bash

# Link Band SDK 통합 설치 스크립트
# 모든 플랫폼 지원 (macOS, Linux, Windows/WSL)

# 에러 발생 시 즉시 종료하지 않고 로그로 처리
# set -e  # 이 옵션이 터미널을 갑자기 닫는 원인이 될 수 있음

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 전역 변수
PYTHON_CMD=""
PLATFORM=""
ARCH=""
INSTALLER_FILE=""
VENV_PATH="$HOME/.linkband-sdk-venv"

# 로그 함수들
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "설치를 중단합니다. 문제를 해결한 후 다시 시도해주세요."
    exit 1
}

log_debug() {
    if [ "${DEBUG:-}" = "1" ]; then
        echo -e "${YELLOW}[DEBUG]${NC} $1"
    fi
}

# 진행 상황 표시
show_progress() {
    local current=$1
    local total=$2
    local step_name=$3
    local percent=$((current * 100 / total))
    printf "\r${BLUE}[%d/%d]${NC} %s... [%-50s] %d%%\n" $current $total "$step_name" $(printf "%*s" $((percent/2)) | tr ' ' '=') $percent
}

# 플랫폼 감지
detect_platform() {
    log_debug "플랫폼 감지 시작"
    
    case "$(uname -s)" in
        Darwin)
            PLATFORM="macos"
            ARCH=$(uname -m)
            if [ "$ARCH" = "arm64" ]; then
                INSTALLER_FILE="Link Band SDK-1.0.0-arm64.dmg"
            else
                INSTALLER_FILE="Link Band SDK-1.0.0.dmg"
            fi
            ;;
        Linux)
            PLATFORM="linux"
            ARCH=$(uname -m)
            if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
                INSTALLER_FILE="Link Band SDK-1.0.0-arm64.AppImage"
            else
                INSTALLER_FILE="Link Band SDK-1.0.0.AppImage"
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            PLATFORM="windows"
            INSTALLER_FILE="Link Band SDK-1.0.0.exe"
            ;;
        *)
            log_error "지원하지 않는 플랫폼입니다: $(uname -s)"
            return 1
            ;;
    esac
    
    log_info "플랫폼 감지: $PLATFORM ($ARCH)"
    log_debug "설치 파일: $INSTALLER_FILE"
    return 0
}

# Python 환경 검사
check_python() {
    log_info "Python 환경 검사 중..."
    log_debug "Python 명령어 확인 시작"
    
    # Python 3.9+ 확인
    if command -v python3 >/dev/null 2>&1; then
        log_debug "python3 명령어 발견"
        PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
        if [ $? -eq 0 ] && [ -n "$PYTHON_VERSION" ]; then
            PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
            PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
            
            if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 9 ]; then
                log_success "Python $PYTHON_VERSION 발견"
                PYTHON_CMD="python3"
                return 0
            else
                log_warning "Python 버전이 너무 낮습니다: $PYTHON_VERSION (3.9+ 필요)"
            fi
        else
            log_warning "Python 버전 확인 실패"
        fi
    else
        log_debug "python3 명령어를 찾을 수 없음"
    fi
    
    # Python 설치 필요
    log_warning "Python 3.9+ 설치가 필요합니다."
    if ! install_python; then
        log_error "Python 설치에 실패했습니다."
        return 1
    fi
    return 0
}

# Python 설치
install_python() {
    log_debug "Python 설치 시작: $PLATFORM"
    
    case $PLATFORM in
        macos)
            log_info "Homebrew를 통해 Python 설치를 시도합니다..."
            if command -v brew >/dev/null 2>&1; then
                if brew install python@3.11; then
                    PYTHON_CMD="python3.11"
                    return 0
                else
                    log_error "Homebrew를 통한 Python 설치 실패"
                    return 1
                fi
            else
                log_error "Homebrew가 설치되지 않았습니다. https://brew.sh 에서 Homebrew를 먼저 설치해주세요."
                return 1
            fi
            ;;
        linux)
            log_info "패키지 매니저를 통해 Python 설치를 시도합니다..."
            if command -v apt-get >/dev/null 2>&1; then
                if sudo apt-get update && sudo apt-get install -y python3.11 python3.11-pip python3.11-venv; then
                    PYTHON_CMD="python3.11"
                    return 0
                else
                    log_error "apt-get을 통한 Python 설치 실패"
                    return 1
                fi
            elif command -v yum >/dev/null 2>&1; then
                if sudo yum install -y python311 python311-pip; then
                    PYTHON_CMD="python3.11"
                    return 0
                else
                    log_error "yum을 통한 Python 설치 실패"
                    return 1
                fi
            elif command -v pacman >/dev/null 2>&1; then
                if sudo pacman -S python; then
                    PYTHON_CMD="python3"
                    return 0
                else
                    log_error "pacman을 통한 Python 설치 실패"
                    return 1
                fi
            else
                log_error "지원하는 패키지 매니저를 찾을 수 없습니다."
                return 1
            fi
            ;;
        windows)
            log_error "Windows에서는 https://python.org 에서 Python 3.11을 수동 설치해주세요."
            return 1
            ;;
    esac
    return 1
}

# 시스템 요구사항 검사
check_system_requirements() {
    log_info "시스템 요구사항 검사 중..."
    log_debug "디스크 공간 확인 시작"
    
    # 디스크 공간 확인 (1GB) - 개선된 방식
    case $PLATFORM in
        macos)
            if command -v df >/dev/null 2>&1; then
                AVAILABLE_SPACE_RAW=$(df -h . 2>/dev/null | tail -1 | awk '{print $4}' 2>/dev/null)
                if [ -n "$AVAILABLE_SPACE_RAW" ]; then
                    log_debug "사용 가능한 공간: $AVAILABLE_SPACE_RAW"
                    # 단위가 있는 값을 숫자로 변환 (Gi, G, Mi, M 등 처리)
                    AVAILABLE_SPACE_NUM=$(echo "$AVAILABLE_SPACE_RAW" | sed 's/[^0-9.]//g' 2>/dev/null)
                    if [ -n "$AVAILABLE_SPACE_NUM" ] && [ "$(echo "$AVAILABLE_SPACE_NUM < 1" | bc -l 2>/dev/null || echo "0")" = "1" ]; then
                        log_warning "디스크 공간이 부족할 수 있습니다. 현재: $AVAILABLE_SPACE_RAW, 권장: 1GB 이상"
                    else
                        log_debug "디스크 공간 충분: $AVAILABLE_SPACE_RAW"
                    fi
                else
                    log_warning "디스크 공간을 확인할 수 없습니다."
                fi
            else
                log_warning "df 명령어를 찾을 수 없습니다."
            fi
            ;;
        linux)
            if command -v df >/dev/null 2>&1; then
                AVAILABLE_SPACE_RAW=$(df -h . 2>/dev/null | tail -1 | awk '{print $4}' 2>/dev/null)
                if [ -n "$AVAILABLE_SPACE_RAW" ]; then
                    log_debug "사용 가능한 공간: $AVAILABLE_SPACE_RAW"
                    AVAILABLE_SPACE_NUM=$(echo "$AVAILABLE_SPACE_RAW" | sed 's/[^0-9.]//g' 2>/dev/null)
                    if [ -n "$AVAILABLE_SPACE_NUM" ] && [ "$(echo "$AVAILABLE_SPACE_NUM < 1" | bc -l 2>/dev/null || echo "0")" = "1" ]; then
                        log_warning "디스크 공간이 부족할 수 있습니다. 현재: $AVAILABLE_SPACE_RAW, 권장: 1GB 이상"
                    else
                        log_debug "디스크 공간 충분: $AVAILABLE_SPACE_RAW"
                    fi
                else
                    log_warning "디스크 공간을 확인할 수 없습니다."
                fi
            else
                log_warning "df 명령어를 찾을 수 없습니다."
            fi
            ;;
    esac
    
    # 포트 8121 확인
    log_debug "포트 8121 확인 시작"
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :8121 -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "포트 8121이 사용 중입니다. 설치 후 포트 충돌이 발생할 수 있습니다."
        else
            log_debug "포트 8121 사용 가능"
        fi
    else
        log_debug "lsof 명령어를 찾을 수 없음"
    fi
    
    log_success "시스템 요구사항 확인 완료"
    return 0
}

# 가상환경 생성 및 활성화
setup_virtual_environment() {
    log_info "Python 가상환경 설정 중..."
    log_debug "가상환경 경로: $VENV_PATH"
    
    # 기존 가상환경 제거
    if [ -d "$VENV_PATH" ]; then
        log_info "기존 가상환경 제거 중..."
        if ! rm -rf "$VENV_PATH"; then
            log_error "기존 가상환경 제거 실패"
            return 1
        fi
    fi
    
    # 새 가상환경 생성
    log_debug "가상환경 생성: $PYTHON_CMD -m venv $VENV_PATH"
    if ! $PYTHON_CMD -m venv "$VENV_PATH"; then
        log_error "가상환경 생성 실패"
        return 1
    fi
    
    # 가상환경 활성화 확인
    if [ ! -f "$VENV_PATH/bin/activate" ]; then
        log_error "가상환경 활성화 스크립트를 찾을 수 없습니다: $VENV_PATH/bin/activate"
        return 1
    fi
    
    # 가상환경에서 pip 업그레이드 (서브셸에서 실행)
    log_debug "가상환경에서 pip 업그레이드"
    if ! (source "$VENV_PATH/bin/activate" && pip install --upgrade pip); then
        log_warning "pip 업그레이드 실패, 계속 진행합니다."
    fi
    
    log_success "가상환경 설정 완료: $VENV_PATH"
    return 0
}

# Python 의존성 설치
install_python_dependencies() {
    log_info "Python 의존성 설치 중..."
    
    # requirements.txt 파일 경로
    REQUIREMENTS_FILE="$(dirname "$0")/requirements.txt"
    log_debug "requirements.txt 경로: $REQUIREMENTS_FILE"
    
    if [ ! -f "$REQUIREMENTS_FILE" ]; then
        log_error "requirements.txt 파일을 찾을 수 없습니다: $REQUIREMENTS_FILE"
        return 1
    fi
    
    # 가상환경에서 의존성 설치 (서브셸에서 실행)
    log_debug "가상환경에서 의존성 설치 시작"
    if (source "$VENV_PATH/bin/activate" && pip install --no-cache-dir --only-binary=all -r "$REQUIREMENTS_FILE"); then
        log_success "Python 의존성 설치 완료 (바이너리)"
    else
        log_warning "바이너리 설치 실패. 소스에서 컴파일을 시도합니다..."
        if (source "$VENV_PATH/bin/activate" && pip install -r "$REQUIREMENTS_FILE"); then
            log_success "Python 의존성 설치 완료 (소스)"
        else
            log_error "Python 의존성 설치 실패"
            return 1
        fi
    fi
    
    return 0
}

# SDK 설치
install_sdk() {
    log_info "Link Band SDK 설치 중..."
    
    # 먼저 로컬 설치 파일 확인
    INSTALLER_PATH="$(dirname "$0")/$INSTALLER_FILE"
    log_debug "설치 파일 경로: $INSTALLER_PATH"
    
    if [ -f "$INSTALLER_PATH" ]; then
        log_info "로컬 설치 파일 발견: $INSTALLER_FILE"
        case $PLATFORM in
            macos)
                install_macos_sdk "$INSTALLER_PATH"
                ;;
            linux)
                install_linux_sdk "$INSTALLER_PATH"
                ;;
            windows)
                install_windows_sdk "$INSTALLER_PATH"
                ;;
        esac
        return $?
    fi
    
         # 로컬 파일이 없으면 로컬 빌드 스크립트 사용
     log_info "로컬 설치 파일이 없습니다. 로컬 빌드 및 설치를 시작합니다..."
     
     BUILD_SCRIPT_PATH=""
     case $PLATFORM in
         macos)
             BUILD_SCRIPT_PATH="$(dirname "$0")/legacy/build-and-install-macos.sh"
             ;;
         linux)
             BUILD_SCRIPT_PATH="$(dirname "$0")/legacy/build-and-install-linux.sh"
             ;;
         windows)
             BUILD_SCRIPT_PATH="$(dirname "$0")/legacy/build-and-install-windows.bat"
             ;;
     esac
    
         if [ -f "$BUILD_SCRIPT_PATH" ]; then
         log_info "로컬 빌드 스크립트 실행: $BUILD_SCRIPT_PATH"
         
         case $PLATFORM in
             macos|linux)
                 # 실행 권한 부여
                 chmod +x "$BUILD_SCRIPT_PATH"
                 if bash "$BUILD_SCRIPT_PATH"; then
                     log_success "로컬 빌드를 통한 SDK 설치 완료"
                     return 0
                 else
                     log_error "로컬 빌드 스크립트 실행 실패"
                     return 1
                 fi
                 ;;
             windows)
                 if cmd.exe /c "$BUILD_SCRIPT_PATH"; then
                     log_success "로컬 빌드를 통한 SDK 설치 완료"
                     return 0
                 else
                     log_error "로컬 빌드 스크립트 실행 실패"
                     return 1
                 fi
                 ;;
         esac
     else
         log_warning "로컬 빌드 스크립트를 찾을 수 없습니다: $BUILD_SCRIPT_PATH"
         log_info "개발 환경에서는 SDK 바이너리 설치를 건너뜁니다."
         log_info ""
         log_info "🚀 개발 모드 실행 방법:"
         echo "  cd $(dirname "$(dirname "$0")")"
         echo "  npm run electron:preview"
         log_info ""
         log_info "📦 수동 설치 (프로덕션 사용):"
         case $PLATFORM in
             macos)
                 echo "  1. GitHub Releases에서 DMG 파일 다운로드"
                 echo "  2. DMG 마운트 후 Applications 폴더로 복사"
                 ;;
             linux)
                 echo "  1. GitHub Releases에서 AppImage 파일 다운로드"
                 echo "  2. 실행 권한 부여 후 실행"
                 ;;
             windows)
                 echo "  1. GitHub Releases에서 EXE 파일 다운로드"
                 echo "  2. 설치 프로그램 실행"
                 ;;
         esac
         echo "  GitHub: https://github.com/Brian-Chae/link_band_sdk/releases"
         return 0
     fi
}

# macOS SDK 설치
install_macos_sdk() {
    local installer_path=$1
    
    # DMG 마운트
    log_info "DMG 파일 마운트 중..."
    if ! hdiutil attach "$installer_path" -quiet; then
        log_error "DMG 마운트 실패: $installer_path"
        return 1
    fi
    
    # 마운트된 볼륨 찾기
    local volume_name
    volume_name=$(ls /Volumes/ | grep -i "link.*band.*sdk" | head -1)
    
    if [ -z "$volume_name" ]; then
        log_warning "마운트된 SDK 볼륨을 찾을 수 없습니다"
        log_debug "현재 마운트된 볼륨들:"
        ls /Volumes/ | while read vol; do log_debug "  - $vol"; done
        hdiutil detach "/Volumes/*" -quiet 2>/dev/null || true
        return 1
    fi
    
    log_info "애플리케이션을 Applications 폴더로 복사 중..."
    
    # 가능한 애플리케이션 이름들 확인
    local app_found=false
    for app_name in "Link Band SDK.app" "LinkBandSDK.app" "Link-Band-SDK.app"; do
        if [ -d "/Volumes/$volume_name/$app_name" ]; then
            log_info "발견된 앱: $app_name"
            mkdir -p "$HOME/Applications"
            if cp -R "/Volumes/$volume_name/$app_name" "$HOME/Applications/Link Band SDK.app"; then
                log_success "SDK 설치 완료: $HOME/Applications/Link Band SDK.app"
                app_found=true
                break
            else
                log_warning "애플리케이션 복사 실패: $app_name"
            fi
        fi
    done
    
    if [ "$app_found" = false ]; then
        log_warning "DMG에서 Link Band SDK 앱을 찾을 수 없습니다"
        log_debug "DMG 내용:"
        ls -la "/Volumes/$volume_name/" | while read line; do log_debug "  $line"; done
        
        # 개발 환경에서는 경고만 하고 계속 진행
        log_info "개발 환경에서는 이 단계를 건너뛰고 개발 모드로 실행하세요."
    fi
    
    # DMG 언마운트
    hdiutil detach "/Volumes/$volume_name" -quiet 2>/dev/null || true
    
    return 0
}

# Linux SDK 설치
install_linux_sdk() {
    local installer_path=$1
    
    # AppImage 실행 권한 부여
    if ! chmod +x "$installer_path"; then
        log_error "AppImage 실행 권한 설정 실패"
        return 1
    fi
    
    # 홈 디렉토리에 복사
    if ! cp "$installer_path" "$HOME/LinkBandSDK.AppImage"; then
        log_error "AppImage 복사 실패"
        return 1
    fi
    
    # 데스크톱 엔트리 생성
    if ! create_desktop_entry; then
        log_warning "데스크톱 엔트리 생성 실패"
    fi
    
    log_success "Linux SDK 설치 완료"
    return 0
}

# Windows SDK 설치
install_windows_sdk() {
    local installer_path=$1
    
    log_info "Windows 설치 프로그램을 실행합니다..."
    if ! "$installer_path"; then
        log_error "Windows 설치 프로그램 실행 실패"
        return 1
    fi
    
    log_success "Windows SDK 설치 완료"
    return 0
}

# GitHub에서 SDK 다운로드
download_sdk() {
    log_error "자동 다운로드는 아직 구현되지 않았습니다. 수동으로 다운로드해주세요."
    return 1
}

# Linux 데스크톱 엔트리 생성
create_desktop_entry() {
    local desktop_file="$HOME/.local/share/applications/linkband-sdk.desktop"
    
    if ! mkdir -p "$(dirname "$desktop_file")"; then
        log_error "데스크톱 엔트리 디렉토리 생성 실패"
        return 1
    fi
    
    cat > "$desktop_file" << EOF
[Desktop Entry]
Name=Link Band SDK
Comment=Link Band SDK - EEG Development Kit
Exec=$HOME/LinkBandSDK.AppImage
Icon=linkband-sdk
Terminal=false
Type=Application
Categories=Development;Science;
EOF
    
    if [ $? -eq 0 ]; then
        log_success "데스크톱 엔트리 생성 완료"
        return 0
    else
        log_error "데스크톱 엔트리 생성 실패"
        return 1
    fi
}

# 설치 검증
verify_installation() {
    log_info "설치 검증 중..."
    
    local verification_failed=0
    
    case $PLATFORM in
        macos)
            if [ -d "/Applications/Link Band SDK.app" ] || [ -d "$HOME/Applications/Link Band SDK.app" ]; then
                log_success "macOS 앱 설치 확인됨"
            else
                log_info "macOS 앱이 설치되지 않음 (개발 모드에서는 정상)"
            fi
            ;;
        linux)
            if [ -f "$HOME/LinkBandSDK.AppImage" ] || [ -f "$HOME/Applications/LinkBandSDK.AppImage" ]; then
                log_success "Linux AppImage 설치 확인됨"
            else
                log_info "Linux AppImage가 설치되지 않음 (개발 모드에서는 정상)"
            fi
            ;;
    esac
    
    # Python 의존성 확인
    if [ -f "$VENV_PATH/bin/activate" ]; then
        log_debug "Python 의존성 확인 시작"
        if (source "$VENV_PATH/bin/activate" && python -c "import fastapi, uvicorn, websockets, bleak, numpy, scipy" 2>/dev/null); then
            log_success "Python 의존성 확인됨"
        else
            log_warning "일부 Python 의존성을 확인할 수 없습니다."
            verification_failed=1
        fi
    else
        log_warning "가상환경을 찾을 수 없습니다: $VENV_PATH"
        verification_failed=1
    fi
    
    if [ $verification_failed -eq 0 ]; then
        log_success "설치 검증 완료"
    else
        log_warning "설치 검증에서 일부 문제가 발견되었지만, 설치는 완료되었습니다."
    fi
    
    return 0
}

# 설치 완료 메시지
show_completion_message() {
    echo
    echo "🎉 Link Band SDK 설치가 완료되었습니다!"
    echo
    echo "실행 방법:"
    case $PLATFORM in
        macos)
            echo "  - 개발 모드: cd $(dirname "$0")/../electron-app && npm run electron:preview"
            echo "  - Launchpad에서 'Link Band SDK' 검색 (릴리스 버전)"
            echo "  - Applications 폴더에서 실행 (릴리스 버전)"
            ;;
        linux)
            echo "  - 개발 모드: cd $(dirname "$0")/../electron-app && npm run electron:preview"
            echo "  - 애플리케이션 메뉴에서 'Link Band SDK' 검색 (릴리스 버전)"
            echo "  - 또는 터미널: $HOME/LinkBandSDK.AppImage (릴리스 버전)"
            ;;
        windows)
            echo "  - 개발 모드: cd $(dirname "$0")/../electron-app && npm run electron:preview"
            echo "  - 시작 메뉴에서 'Link Band SDK' 검색 (릴리스 버전)"
            ;;
    esac
    echo
    echo "Python 가상환경:"
    echo "  위치: $VENV_PATH"
    echo "  활성화: source $VENV_PATH/bin/activate"
    echo
    echo "문제가 발생하면 GitHub Issues에서 문의하세요:"
    echo "  https://github.com/Brian-Chae/link_band_sdk/issues"
    echo
    echo "디버그 모드로 실행하려면: DEBUG=1 bash install-linkband.sh"
    echo
}

# 메인 설치 과정
main() {
    echo "🚀 Link Band SDK 설치를 시작합니다..."
    echo
    
    local total_steps=7
    local current_step=0
    local failed_steps=0
    
    # 1. 플랫폼 감지
    ((current_step++))
    show_progress $current_step $total_steps "플랫폼 감지"
    if ! detect_platform; then
        ((failed_steps++))
        log_error "플랫폼 감지 실패"
    fi
    
    # 2. 시스템 요구사항 검사
    ((current_step++))
    show_progress $current_step $total_steps "시스템 요구사항 검사"
    if ! check_system_requirements; then
        ((failed_steps++))
        log_warning "시스템 요구사항 검사에서 문제 발견"
    fi
    
    # 3. Python 환경 검사
    ((current_step++))
    show_progress $current_step $total_steps "Python 환경 검사"
    if ! check_python; then
        ((failed_steps++))
        log_error "Python 환경 검사 실패"
    fi
    
    # 4. 가상환경 설정
    ((current_step++))
    show_progress $current_step $total_steps "가상환경 설정"
    if ! setup_virtual_environment; then
        ((failed_steps++))
        log_error "가상환경 설정 실패"
    fi
    
    # 5. Python 의존성 설치
    ((current_step++))
    show_progress $current_step $total_steps "Python 의존성 설치"
    if ! install_python_dependencies; then
        ((failed_steps++))
        log_error "Python 의존성 설치 실패"
    fi
    
    # 6. SDK 설치
    ((current_step++))
    show_progress $current_step $total_steps "SDK 설치"
    if ! install_sdk; then
        ((failed_steps++))
        log_warning "SDK 설치에서 문제 발생"
    fi
    
    # 7. 설치 검증
    ((current_step++))
    show_progress $current_step $total_steps "설치 검증"
    if ! verify_installation; then
        ((failed_steps++))
        log_warning "설치 검증에서 문제 발견"
    fi
    
    if [ $failed_steps -eq 0 ]; then
        show_completion_message
    else
        echo
        log_warning "설치 과정에서 $failed_steps 개의 문제가 발생했습니다."
        echo "그러나 주요 기능은 정상적으로 작동할 수 있습니다."
        show_completion_message
    fi
}

# Ctrl+C 핸들러
cleanup() {
    echo
    log_warning "설치가 중단되었습니다."
    exit 130
}

# 신호 핸들러 설정
trap cleanup INT TERM

# 스크립트 실행
main "$@" 