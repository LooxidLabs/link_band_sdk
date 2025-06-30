#!/usr/bin/env python3
"""
Link Band SDK 서버 메인 진입점
- 모듈 경로 문제 해결 (start_server_fixed.py 기반)
- 개발 및 프로덕션 환경 지원
"""

import os
import sys
import subprocess
import signal
import time
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

def cleanup_existing_processes():
    """기존 서버 프로세스 및 포트 정리"""
    try:
        import psutil
        
        print("🔍 기존 서버 프로세스 확인 중...")
        
        # 1. run_server.py 프로세스 찾기
        current_pid = os.getpid()
        killed_processes = []
        
        for proc in psutil.process_iter(['pid', 'cmdline']):
            try:
                cmdline = proc.info['cmdline']
                if cmdline and any('run_server.py' in arg for arg in cmdline):
                    if proc.info['pid'] != current_pid:  # 현재 프로세스는 제외
                        print(f"   기존 run_server.py 프로세스 발견: PID {proc.info['pid']}")
                        proc.terminate()
                        killed_processes.append(proc.info['pid'])
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # 2. 포트 점유 프로세스 확인 및 종료
        ports_to_check = [8121, 18765]
        for port in ports_to_check:
            for conn in psutil.net_connections():
                if conn.laddr.port == port and conn.status == 'LISTEN':
                    try:
                        proc = psutil.Process(conn.pid)
                        if conn.pid not in killed_processes:
                            print(f"   포트 {port} 점유 프로세스 발견: PID {conn.pid}")
                            proc.terminate()
                            killed_processes.append(conn.pid)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
        
        # 3. 프로세스 종료 대기
        if killed_processes:
            print(f"   {len(killed_processes)}개 프로세스 종료 대기 중...")
            time.sleep(2)
            
            # 강제 종료가 필요한 프로세스 확인
            for pid in killed_processes:
                try:
                    proc = psutil.Process(pid)
                    if proc.is_running():
                        print(f"   PID {pid} 강제 종료 중...")
                        proc.kill()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            time.sleep(1)
            print("   ✅ 기존 프로세스 정리 완료")
        else:
            print("   ✅ 정리할 프로세스 없음")
            
    except ImportError:
        # psutil이 없는 경우 기본 방법 사용
        print("⚠️  psutil 미설치 - 기본 포트 정리 방법 사용")
        try:
            # lsof 명령어로 포트 점유 프로세스 확인
            for port in [8121, 18765]:
                result = subprocess.run(['lsof', '-ti', f':{port}'], 
                                      capture_output=True, text=True)
                if result.stdout.strip():
                    pids = result.stdout.strip().split('\n')
                    for pid in pids:
                        if pid.strip():
                            print(f"   포트 {port} 점유 프로세스 종료: PID {pid}")
                            try:
                                os.kill(int(pid), signal.SIGTERM)
                                time.sleep(1)
                                os.kill(int(pid), signal.SIGKILL)
                            except (ProcessLookupError, ValueError):
                                pass
        except FileNotFoundError:
            print("   lsof 명령어를 찾을 수 없습니다.")
    
    except Exception as e:
        print(f"⚠️  프로세스 정리 중 오류: {e}")
    
    # 포트 해제 대기
    print("⏳ 포트 해제 대기 중...")
    time.sleep(2)

def start_server():
    """서버 시작"""
    setup_python_path()
    
    if not check_dependencies():
        return False
    
    # 기존 프로세스 정리 (--force 옵션이 있거나 기본 동작)
    if len(sys.argv) > 1 and '--no-cleanup' in sys.argv:
        print("⚠️  프로세스 정리 건너뛰기")
    else:
        cleanup_existing_processes()
    
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