#!/usr/bin/env python3
"""
Link Band SDK Universal Build Script (Python)
Usage: python build_server.py <platform> [version]
Platforms: macos-arm64, macos-intel, windows, linux
"""

import os
import sys
import subprocess
import shutil
import argparse
from pathlib import Path
import json

# 지원 플랫폼
SUPPORTED_PLATFORMS = ['macos-arm64', 'macos-intel', 'windows', 'linux']

def load_build_config(version_dir):
    """빌드 설정 로드 (JSON 형식)"""
    config_file = version_dir / 'build_config.json'
    if not config_file.exists():
        # bash 설정에서 JSON 생성
        bash_config = version_dir / 'build_config.sh'
        if bash_config.exists():
            return parse_bash_config(bash_config)
        raise FileNotFoundError(f"Configuration file not found: {config_file}")
    
    with open(config_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def parse_bash_config(bash_file):
    """bash 설정 파일에서 기본 정보 추출"""
    config = {
        'version': '1.0.2',
        'build_name': 'linkband-server',
        'description': 'MNE-enabled build with full dependencies',
        'required_packages': [
            'pyinstaller', 'fastapi', 'uvicorn', 'websockets', 'bleak',
            'numpy', 'scipy', 'psutil', 'python-dotenv', 'python-multipart',
            'aiosqlite', 'mne', 'matplotlib', 'scikit-learn', 'heartpy'
        ],
        'common_hidden_imports': [
            # Core modules
            'sqlite3', 'json', 'logging', 'pathlib', 'threading', 'queue',
            'time', 'datetime', 'os', 'sys', 'platform', 'signal', 'atexit',
            'asyncio', 'asyncio.subprocess', 'asyncio.queues', 'asyncio.selector_events',
            'concurrent', 'concurrent.futures',
            
            # Encoding
            'encodings', 'encodings.utf_8', 'encodings.ascii', 'encodings.latin_1',
            
            # Web server
            'uvicorn', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto',
            'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
            'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
            'uvicorn.lifespan', 'uvicorn.lifespan.on',
            'fastapi', 'fastapi.middleware', 'fastapi.middleware.cors',
            'fastapi.staticfiles', 'fastapi.responses',
            'websockets', 'websockets.server', 'websockets.protocol', 'websockets.exceptions',
            
            # Bluetooth
            'bleak', 'bleak.backends',
            
            # Scientific computing
            'numpy', 'numpy.core', 'numpy.lib', 'numpy.linalg', 'numpy.fft', 'numpy.random',
            'scipy', 'scipy.signal', 'scipy.stats', 'scipy.fft', 'scipy.interpolate',
            'scipy.optimize', 'scipy.sparse', 'scipy.special', 'scipy.integrate',
            'scipy.linalg', 'scipy.ndimage',
            
            # MNE
            'mne', 'mne.io', 'mne.filter', 'mne.viz', 'mne.channels', 'mne.datasets',
            'mne.epochs', 'mne.event', 'mne.forward', 'mne.minimum_norm',
            'mne.preprocessing', 'mne.source_estimate', 'mne.source_space',
            'mne.surface', 'mne.time_frequency', 'mne.utils', 'mne.viz.backends',
            'mne.transforms', 'mne.bem', 'mne.coreg', 'mne.defaults',
            'mne.externals', 'mne.simulation',
            
            # Signal processing
            'heartpy', 'sklearn', 'sklearn.preprocessing', 'sklearn.decomposition',
            'sklearn.base', 'sklearn.utils', 'sklearn.metrics',
            
            # System
            'psutil',
            
            # Utils
            'python-dotenv', 'dotenv', 'python-multipart', 'multipart',
            'importlib-metadata', 'importlib_metadata', 'lazy_loader',
            
            # Visualization
            'matplotlib', 'matplotlib.pyplot', 'matplotlib.backends',
            'matplotlib.backends.backend_agg', 'matplotlib.figure',
            'matplotlib.patches', 'matplotlib.colors', 'matplotlib.cm',
            
            # App modules
            'app', 'app.main', 'app.api', 'app.core', 'app.services',
            'app.data', 'app.database', 'app.models',
            
            # Database
            'sqlite3', 'sqlite3.dbapi2', '_sqlite3', 'aiosqlite',
            
            # File handling
            'csv', 'io', 'tempfile', 'shutil', 'glob', 'fnmatch',
            
            # Package utilities
            'pkg_resources', 'jaraco', 'jaraco.classes', 'jaraco.functools',
            'jaraco.context', 'jaraco.text', 'jaraco.collections', 'jaraco.structures'
        ],
        'platform_hidden_imports': {
            'macos-arm64': [
                'asyncio.unix_events', 'bleak.backends.corebluetooth',
                'bleak.backends.corebluetooth.client', 'bleak.backends.corebluetooth.scanner'
            ],
            'macos-intel': [
                'asyncio.unix_events', 'bleak.backends.corebluetooth',
                'bleak.backends.corebluetooth.client', 'bleak.backends.corebluetooth.scanner'
            ],
            'windows': [
                'asyncio.windows_events', 'encodings.cp1252', 'encodings.mbcs',
                'bleak.backends.winrt', 'bleak.backends.winrt.client', 'bleak.backends.winrt.scanner'
            ],
            'linux': [
                'asyncio.unix_events', 'bleak.backends.bluezdbus',
                'bleak.backends.bluezdbus.client', 'bleak.backends.bluezdbus.scanner'
            ]
        },
        'platform_options': {
            'macos-arm64': ['--noupx'],
            'macos-intel': ['--noupx'],
            'windows': [],  # UPX는 기본적으로 활성화됨
            'linux': []     # UPX는 기본적으로 활성화됨
        }
    }
    return config

def get_executable_name(platform, config):
    """실행파일명 생성"""
    return f"{config['build_name']}-{platform}-v{config['version']}"

def get_distribution_dir(platform, config):
    """배포 디렉토리 경로 생성"""
    return f"distribution/v{config['version']}/{platform}"

def get_spec_filename(platform, config):
    """PyInstaller spec 파일명 생성"""
    version_safe = config['version'].replace('.', '_')
    return f"{config['build_name']}_{platform}_v{version_safe}.spec"

def check_packages(packages):
    """필수 패키지 설치 확인"""
    print("🔍 Checking required packages...")
    missing_packages = []
    
    for package in packages:
        try:
            result = subprocess.run([sys.executable, '-m', 'pip', 'show', package], 
                                  capture_output=True, text=True)
            if result.returncode != 0:
                missing_packages.append(package)
        except Exception:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing packages: {', '.join(missing_packages)}")
        print("Installing missing packages...")
        for package in missing_packages:
            subprocess.run([sys.executable, '-m', 'pip', 'install', package], check=True)
    
    print("✅ All required packages are installed")

def create_spec_file(spec_path, executable_name, python_core_dir, hidden_imports, platform_options):
    """PyInstaller spec 파일 생성"""
    hidden_imports_str = ',\n        '.join([f"'{imp}'" for imp in hidden_imports])
    
    upx_setting = 'True'
    if '--noupx' in platform_options:
        upx_setting = 'False'
    
    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['{python_core_dir}/run_server.py'],
    pathex=['{python_core_dir}'],
    binaries=[],
    datas=[
        ('{python_core_dir}/app/data', 'app/data'),
        ('{python_core_dir}/database', 'database'),
    ],
    hiddenimports=[
        {hidden_imports_str}
    ],
    hookspath=[],
    hooksconfig={{}},
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
    name='{executable_name}',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx={upx_setting},
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    with open(spec_path, 'w', encoding='utf-8') as f:
        f.write(spec_content)

def main():
    parser = argparse.ArgumentParser(description='Link Band SDK Universal Build Script')
    parser.add_argument('platform', choices=SUPPORTED_PLATFORMS, 
                       help='Target platform')
    parser.add_argument('version', nargs='?', 
                       help='Build version (optional, uses latest if not specified)')
    
    args = parser.parse_args()
    
    print("🚀 Link Band SDK Build Script (Python)")
    print(f"Platform: {args.platform}")
    
    # 스크립트 디렉토리 확인
    script_dir = Path(__file__).parent
    python_core_dir = script_dir.parent
    
    print(f"Script Dir: {script_dir}")
    print(f"Python Core Dir: {python_core_dir}")
    
    # 버전별 설정 로드
    if args.version:
        version_dir = script_dir / f'v{args.version}'
        if not version_dir.exists():
            print(f"❌ Error: Version directory not found: {version_dir}")
            available_versions = [d.name for d in script_dir.iterdir() 
                                if d.is_dir() and d.name.startswith('v')]
            if available_versions:
                print(f"Available versions: {', '.join(sorted(available_versions))}")
            sys.exit(1)
        version = args.version
    else:
        # 최신 버전 찾기
        version_dirs = [d for d in script_dir.iterdir() 
                       if d.is_dir() and d.name.startswith('v')]
        if not version_dirs:
            print("❌ Error: No version directories found")
            sys.exit(1)
        
        latest_version_dir = sorted(version_dirs, key=lambda x: x.name)[-1]
        version_dir = latest_version_dir
        version = latest_version_dir.name[1:]  # v 제거
    
    print(f"Version: {version}")
    print(f"Config Dir: {version_dir}")
    
    # 설정 로드
    try:
        config = load_build_config(version_dir)
    except Exception as e:
        print(f"❌ Error loading configuration: {e}")
        sys.exit(1)
    
    # Python 환경 확인
    os.chdir(python_core_dir)
    
    # 가상환경 확인 (활성화된 환경 또는 venv 디렉토리 존재)
    venv_dir = python_core_dir / 'venv'
    is_venv_active = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    
    if not venv_dir.exists() and not is_venv_active:
        print("❌ Error: Virtual environment not found")
        print("Please create virtual environment first:")
        print("  python -m venv venv")
        print("  source venv/bin/activate  # or venv\\Scripts\\activate on Windows")
        print("  pip install -r requirements.txt")
        sys.exit(1)
    
    if is_venv_active:
        print("✅ Using active virtual environment")
    else:
        print("✅ Virtual environment directory found")
    
    # 패키지 확인
    check_packages(config['required_packages'])
    
    # 빌드 디렉토리 생성
    build_dir = python_core_dir / 'build' / 'temp'
    dist_dir = python_core_dir / get_distribution_dir(args.platform, config)
    executable_name = get_executable_name(args.platform, config)
    spec_file = build_dir / get_spec_filename(args.platform, config)
    
    print("📁 Creating build directories...")
    build_dir.mkdir(parents=True, exist_ok=True)
    dist_dir.mkdir(parents=True, exist_ok=True)
    
    # Hidden imports 결합
    all_hidden_imports = config['common_hidden_imports'].copy()
    platform_imports = config['platform_hidden_imports'].get(args.platform, [])
    all_hidden_imports.extend(platform_imports)
    
    # PyInstaller spec 파일 생성
    print("📝 Generating PyInstaller spec file...")
    platform_options = config['platform_options'].get(args.platform, [])
    create_spec_file(spec_file, executable_name, python_core_dir, 
                    all_hidden_imports, platform_options)
    
    # 플랫폼별 옵션 적용
    if platform_options:
        print(f"🔧 Applying platform-specific options: {' '.join(platform_options)}")
    
    # PyInstaller 실행
    print("🔨 Building executable...")
    print(f"Spec file: {spec_file}")
    print(f"Output: {dist_dir / executable_name}")
    
    os.chdir(build_dir)
    
    cmd = ['pyinstaller', '--distpath', str(dist_dir), str(spec_file)]
    
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed: {e}")
        sys.exit(1)
    
    # 빌드 결과 확인
    executable_path = dist_dir / executable_name
    if executable_path.exists():
        file_size = executable_path.stat().st_size
        file_size_mb = file_size / (1024 * 1024)
        
        print("")
        print("✅ Build completed successfully!")
        print(f"📦 Executable: {executable_path}")
        print(f"📏 Size: {file_size_mb:.1f} MB")
        print(f"🏷️  Version: {config['version']}")
        print(f"🗓️  Built: {subprocess.run(['date'], capture_output=True, text=True).stdout.strip()}")
        
        # Git LFS에 자동 추가 (대용량 파일인 경우)
        if file_size_mb > 10:  # 10MB 이상인 경우
            try:
                # Git 저장소인지 확인
                git_check = subprocess.run(['git', 'rev-parse', '--is-inside-work-tree'], 
                                         capture_output=True, text=True, cwd=python_core_dir.parent)
                if git_check.returncode == 0:
                    # Git LFS 추가
                    relative_path = executable_path.relative_to(python_core_dir.parent)
                    lfs_add = subprocess.run(['git', 'add', str(relative_path)], 
                                           capture_output=True, text=True, cwd=python_core_dir.parent)
                    if lfs_add.returncode == 0:
                        print(f"📤 Added to Git LFS: {relative_path}")
                    else:
                        print(f"⚠️  Could not add to Git LFS: {lfs_add.stderr}")
                else:
                    print("ℹ️  Not in a Git repository - skipping LFS add")
            except Exception as e:
                print(f"⚠️  Git LFS add failed: {e}")
        
        print("")
        print("To test the server:")
        print(f"  {executable_path}")
        print("")
    else:
        print("❌ Build failed - executable not found")
        sys.exit(1)
    
    # 임시 파일 정리
    print("🧹 Cleaning up temporary files...")
    shutil.rmtree(build_dir, ignore_errors=True)
    
    print("🎉 Build process completed!")

if __name__ == '__main__':
    main() 