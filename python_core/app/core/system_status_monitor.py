import asyncio
import time
import logging
import aiohttp
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

class SystemStatusMonitor:
    """시스템 전체 상태를 실시간으로 모니터링하는 클래스"""
    
    def __init__(self):
        self.server_status = "unknown"
        self.api_status = "unknown"
        self.websocket_status = "unknown"
        self.initialization_status = "not_started"
        self.device_ready_status = "unknown"
        self.last_error = None
        self.start_time = time.time()
        self.last_check_time = None
        
        # 컴포넌트별 상태 저장
        self.component_status = {
            "server": "unknown",
            "api": "unknown", 
            "websocket": "unknown",
            "device": "unknown"
        }
        
        # 상태 체크 설정
        self.check_interval = 2.0  # 2초마다 체크
        self.api_base_url = "http://127.0.0.1:8121"
        self.websocket_url = "ws://127.0.0.1:18765"
        
        logger.info("[SYSTEM_STATUS_MONITOR] SystemStatusMonitor initialized")
    
    async def start_monitoring(self):
        """시스템 모니터링 시작"""
        logger.info("[SYSTEM_STATUS_MONITOR] Starting system status monitoring...")
        self.initialization_status = "in_progress"
        
        # 초기 상태 체크
        await self.check_system_health()
        
        # 초기화 완료
        if self.get_overall_status() in ["ready", "partially_ready"]:
            self.initialization_status = "completed"
            logger.info("[SYSTEM_STATUS_MONITOR] System initialization completed")
        else:
            self.initialization_status = "failed"
            logger.warning(f"[SYSTEM_STATUS_MONITOR] System initialization failed: {self.last_error}")
    
    async def check_system_health(self):
        """전체 시스템 상태 종합 체크"""
        self.last_check_time = time.time()
        
        try:
            # 병렬로 모든 컴포넌트 상태 체크
            await asyncio.gather(
                self._check_server_status(),
                self._check_api_status(),
                self._check_websocket_status(),
                self._check_device_status(),
                return_exceptions=True
            )
            
            # 전체 상태 업데이트
            self._update_overall_status()
            
        except Exception as e:
            logger.error(f"[SYSTEM_STATUS_MONITOR] Error during system health check: {e}")
            self.last_error = str(e)
    
    async def _check_server_status(self):
        """서버 상태 체크"""
        try:
            # 서버 프로세스가 실행 중인지 확인
            # 여기서는 API 응답으로 서버 상태를 판단
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3)) as session:
                async with session.get(f"{self.api_base_url}/health") as response:
                    if response.status == 200:
                        self.server_status = "running"
                        self.component_status["server"] = "running"
                        logger.debug("[SYSTEM_STATUS_MONITOR] Server status: running")
                    else:
                        self.server_status = "error"
                        self.component_status["server"] = "error"
                        self.last_error = f"Server returned status {response.status}"
                        
        except asyncio.TimeoutError:
            self.server_status = "error"
            self.component_status["server"] = "error"
            self.last_error = "Server health check timeout"
            logger.warning("[SYSTEM_STATUS_MONITOR] Server health check timeout")
            
        except Exception as e:
            self.server_status = "stopped"
            self.component_status["server"] = "stopped"
            self.last_error = f"Server not responding: {str(e)}"
            logger.warning(f"[SYSTEM_STATUS_MONITOR] Server check failed: {e}")
    
    async def _check_api_status(self):
        """API 상태 체크"""
        try:
            # 주요 API 엔드포인트들 체크
            endpoints_to_check = [
                "/device/status",
                "/stream/status",
                "/data/sessions"
            ]
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3)) as session:
                working_endpoints = 0
                
                for endpoint in endpoints_to_check:
                    try:
                        async with session.get(f"{self.api_base_url}{endpoint}") as response:
                            logger.info(f"[SYSTEM_STATUS_MONITOR] Checking {endpoint}: status {response.status}")
                            if response.status in [200, 404]:  # 404도 API가 작동 중임을 의미
                                working_endpoints += 1
                                logger.info(f"[SYSTEM_STATUS_MONITOR] {endpoint} working, count: {working_endpoints}")
                    except Exception as e:
                        logger.info(f"[SYSTEM_STATUS_MONITOR] {endpoint} failed: {e}")
                        continue
                
                logger.info(f"[SYSTEM_STATUS_MONITOR] API check result: {working_endpoints}/{len(endpoints_to_check)} endpoints working")
                
                if working_endpoints >= len(endpoints_to_check) * 0.7:  # 70% 이상 작동
                    self.api_status = "available"
                    self.component_status["api"] = "available"
                    logger.debug("[SYSTEM_STATUS_MONITOR] API status: available")
                else:
                    self.api_status = "unavailable"
                    self.component_status["api"] = "unavailable"
                    self.last_error = f"Only {working_endpoints}/{len(endpoints_to_check)} API endpoints working"
                    logger.warning(f"[SYSTEM_STATUS_MONITOR] API status: unavailable - {self.last_error}")
                    
        except Exception as e:
            self.api_status = "error"
            self.component_status["api"] = "error"
            self.last_error = f"API check failed: {str(e)}"
            logger.warning(f"[SYSTEM_STATUS_MONITOR] API check failed: {e}")
    
    async def _check_websocket_status(self):
        """WebSocket 상태 체크"""
        try:
            import websockets
            
            # WebSocket 연결 테스트
            async with websockets.connect(
                self.websocket_url,
                ping_timeout=2
            ) as websocket:
                # 간단한 ping 테스트
                await websocket.send('{"type": "ping"}')
                response = await asyncio.wait_for(websocket.recv(), timeout=2)
                
                self.websocket_status = "connected"
                self.component_status["websocket"] = "connected"
                logger.debug("[SYSTEM_STATUS_MONITOR] WebSocket status: connected")
                
        except asyncio.TimeoutError:
            self.websocket_status = "error"
            self.component_status["websocket"] = "error"
            self.last_error = "WebSocket connection timeout"
            logger.warning("[SYSTEM_STATUS_MONITOR] WebSocket connection timeout")
            
        except Exception as e:
            self.websocket_status = "disconnected"
            self.component_status["websocket"] = "disconnected"
            self.last_error = f"WebSocket connection failed: {str(e)}"
            logger.warning(f"[SYSTEM_STATUS_MONITOR] WebSocket check failed: {e}")
    
    async def _check_device_status(self):
        """디바이스 상태 체크"""
        try:
            # 디바이스 상태 API 호출
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3)) as session:
                async with session.get(f"{self.api_base_url}/device/status") as response:
                    if response.status == 200:
                        device_data = await response.json()
                        
                        if device_data.get("is_connected", False):
                            self.device_ready_status = "ready"
                            self.component_status["device"] = "ready"
                            logger.debug("[SYSTEM_STATUS_MONITOR] Device status: ready")
                        else:
                            self.device_ready_status = "not_ready"
                            self.component_status["device"] = "not_ready"
                            logger.debug("[SYSTEM_STATUS_MONITOR] Device status: not ready")
                    else:
                        self.device_ready_status = "checking"
                        self.component_status["device"] = "checking"
                        
        except Exception as e:
            self.device_ready_status = "checking"
            self.component_status["device"] = "checking"
            logger.debug(f"[SYSTEM_STATUS_MONITOR] Device check failed (expected): {e}")
    
    def _update_overall_status(self):
        """전체 상태 업데이트"""
        # 핵심 컴포넌트 상태 확인
        server_ok = self.server_status == "running"
        api_ok = self.api_status == "available"
        websocket_ok = self.websocket_status == "connected"
        device_ok = self.device_ready_status == "ready"
        
        if server_ok and api_ok and websocket_ok and device_ok:
            self.overall_status = "ready"
        elif server_ok and api_ok and websocket_ok:
            self.overall_status = "partially_ready"
        elif server_ok and api_ok:
            self.overall_status = "initializing"
        else:
            self.overall_status = "error"
    
    def get_overall_status(self) -> str:
        """전체 상태 반환"""
        return getattr(self, 'overall_status', 'unknown')
    
    def get_active_components(self) -> List[str]:
        """활성 컴포넌트 목록 반환"""
        active = []
        
        if self.server_status == "running":
            active.append("Server")
        if self.api_status == "available":
            active.append("API")
        if self.websocket_status == "connected":
            active.append("WebSocket")
        if self.device_ready_status == "ready":
            active.append("Device")
            
        return active
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """시스템 상태 메트릭 반환"""
        uptime = time.time() - self.start_time
        
        return {
            "system_status": {
                "overall_status": self.get_overall_status(),
                "server_status": self.server_status,
                "api_status": self.api_status,
                "websocket_status": self.websocket_status,
                "initialization_status": self.initialization_status,
                "device_ready": self.device_ready_status,
                "components": self.get_active_components(),
                "last_error": self.last_error,
                "uptime": round(uptime, 1),
                "last_check": self.last_check_time,
                "component_details": self.component_status.copy()
            }
        }
    
    def get_status_message(self) -> str:
        """상태별 메시지 반환"""
        status = self.get_overall_status()
        
        if status == "ready":
            return "All services running normally"
        elif status == "partially_ready":
            if self.device_ready_status != "ready":
                return "Services ready, device not connected"
            else:
                return "Most services running normally"
        elif status == "initializing":
            return "Starting services and checking connections"
        elif status == "error":
            return self.last_error or "System error detected"
        else:
            return "Checking system status..."
    
    def reset_error(self):
        """에러 상태 리셋"""
        self.last_error = None
        logger.info("[SYSTEM_STATUS_MONITOR] Error status reset") 