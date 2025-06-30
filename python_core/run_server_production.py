#!/usr/bin/env python3
"""
Link Band SDK 서버 프로덕션 진입점
- PyInstaller 빌드용 안전한 시작 스크립트
- 프로세스 정리 로직 비활성화
"""

import os
import sys
import subprocess
from pathlib import Path

def setup_python_path():
    """Python 모듈 경로 설정"""
    # PyInstaller 실행 환경에서는 _MEIPASS 사용
    if hasattr(sys, '_MEIPASS'):
        # PyInstaller로 빌드된 실행파일
        current_dir = Path(sys._MEIPASS)
    else:
        # 개발 환경
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
        print(f"의존성 누락: {e}")
        return False

def start_server():
    """서버 시작 (프로덕션 모드)"""
    setup_python_path()
    
    if not check_dependencies():
        print("❌ 필수 의존성이 누락되었습니다.")
        return False
    
    # 통합 로그 시스템 초기화
    try:
        from app.core.logging_config import linkband_logger, get_system_logger, LogTags
        
        # 프로덕션 환경 설정
        environment = 'production'
        linkband_logger.configure(
            environment=environment,
            enable_history=True,
            console_level='INFO'
        )
        
        logger = get_system_logger(__name__)
        
        logger.info(f"[{LogTags.SERVER}:{LogTags.START}] Link Band SDK 서버 시작 중... (프로덕션 모드)")
        logger.info(f"[{LogTags.SERVER}] 서버 주소: http://127.0.0.1:8121")
        logger.info(f"[{LogTags.SERVER}] WebSocket: ws://127.0.0.1:18765")
        logger.info(f"[{LogTags.SERVER}] API 문서: http://127.0.0.1:8121/docs")
        logger.info(f"[{LogTags.SERVER}] " + "-" * 50)
        
        try:
            # 직접 app 모듈에서 서버 시작
            from app.main import app
            import uvicorn
            
            # 프로덕션 모드로 uvicorn 실행
            uvicorn.run(
                app,
                host="127.0.0.1",
                port=8121,
                reload=False,  # 프로덕션에서는 reload 비활성화
                log_level="info"
            )
            
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
        
        print("Link Band SDK 서버 시작 중... (프로덕션 모드)")
        print("서버 주소: http://127.0.0.1:8121")
        print("WebSocket: ws://127.0.0.1:18765")
        print("API 문서: http://127.0.0.1:8121/docs")
        print("-" * 50)
        
        try:
            from app.main import app
            import uvicorn
            
            uvicorn.run(
                app,
                host="127.0.0.1",
                port=8121,
                reload=False,
                log_level="info"
            )
            
        except KeyboardInterrupt:
            print("\n서버 종료됨")
        except Exception as e:
            print(f"서버 시작 실패: {e}")
            return False
        
        return True

if __name__ == "__main__":
    start_server() 