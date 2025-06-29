#!/usr/bin/env python3
"""
Link Band SDK 서버 메인 진입점
- 모듈 경로 문제 해결 (start_server_fixed.py 기반)
- 개발 및 프로덕션 환경 지원
"""

import os
import sys
import subprocess
from pathlib import Path

def setup_python_path():
    """Python 모듈 경로 설정"""
    # 현재 스크립트의 디렉토리 (python_core)
    current_dir = Path(__file__).parent.absolute()
    
    # python_core 디렉토리를 PYTHONPATH에 추가
    if str(current_dir) not in sys.path:
        sys.path.insert(0, str(current_dir))
    
    # 환경변수로도 설정
    current_pythonpath = os.environ.get('PYTHONPATH', '')
    if str(current_dir) not in current_pythonpath:
        if current_pythonpath:
            os.environ['PYTHONPATH'] = f"{current_dir}{os.pathsep}{current_pythonpath}"
        else:
            os.environ['PYTHONPATH'] = str(current_dir)

def check_dependencies():
    """필수 의존성 확인"""
    try:
        import fastapi
        import uvicorn
        return True
    except ImportError as e:
        # 의존성 체크 실패는 일단 print로 출력 (로거 초기화 전이므로)
        print(f"의존성 누락: {e}")
        print("pip install fastapi uvicorn 실행 필요")
        return False

def start_server():
    """서버 시작"""
    setup_python_path()
    
    if not check_dependencies():
        return False
    
    # 통합 로그 시스템 초기화 (의존성 확인 후)
    try:
        from app.core.logging_config import linkband_logger, get_system_logger, LogTags
        
        # 환경 감지 및 로그 설정
        environment = os.getenv('LINKBAND_ENV', 'development')
        linkband_logger.configure(
            environment=environment,
            enable_history=True,
            console_level='INFO'
        )
        
        logger = get_system_logger(__name__)
        
        logger.info(f"[{LogTags.SERVER}:{LogTags.START}] Link Band SDK 서버 시작 중...")
        logger.info(f"[{LogTags.SERVER}] PYTHONPATH 설정: {Path(__file__).parent.absolute()}")
        logger.info(f"[{LogTags.SERVER}] FastAPI, Uvicorn 설치 확인됨")
        logger.info(f"[{LogTags.SERVER}] 서버 주소: http://localhost:8121")
        logger.info(f"[{LogTags.SERVER}] WebSocket: ws://127.0.0.1:18765")
        logger.info(f"[{LogTags.SERVER}] API 문서: http://localhost:8121/docs")
        logger.info(f"[{LogTags.SERVER}] " + "-" * 50)
        
        try:
            # uvicorn으로 서버 실행
            cmd = [
                sys.executable, "-m", "uvicorn",
                "app.main:app",
                "--host", "localhost",
                "--port", "8121",
                "--reload"
            ]
            
            subprocess.run(cmd, cwd=Path(__file__).parent)
            
        except KeyboardInterrupt:
            logger.info(f"[{LogTags.SERVER}:{LogTags.STOP}] 서버 종료됨")
        except Exception as e:
            logger.error(f"[{LogTags.SERVER}:{LogTags.ERROR}] 서버 시작 실패: {e}", exc_info=True)
            return False
        
        return True
        
    except ImportError as e:
        # 로그 시스템 초기화 실패 시 fallback
        print(f"로그 시스템 초기화 실패: {e}")
        print("기본 print 모드로 실행")
        
        print("Link Band SDK 서버 시작 중...")
        print("서버 주소: http://localhost:8121")
        print("WebSocket: ws://127.0.0.1:18765")
        print("API 문서: http://localhost:8121/docs")
        print("-" * 50)
        
        try:
            cmd = [
                sys.executable, "-m", "uvicorn",
                "app.main:app",
                "--host", "localhost",
                "--port", "8121",
                "--reload"
            ]
            
            subprocess.run(cmd, cwd=Path(__file__).parent)
            
        except KeyboardInterrupt:
            print("\n서버 종료됨")
        except Exception as e:
            print(f"서버 시작 실패: {e}")
            return False
        
        return True

if __name__ == "__main__":
    start_server() 