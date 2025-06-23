import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.data.data_recorder import DataRecorder
from app.database.db_manager import DatabaseManager
from app.core.server import WebSocketServer, EventType
import time
import asyncio

logger = logging.getLogger(__name__)

class RecordingService:
    def __init__(self, data_recorder: DataRecorder, db_manager: DatabaseManager, ws_server: Optional[WebSocketServer] = None):
        self.data_recorder = data_recorder
        self.db = db_manager
        self.ws_server = ws_server
        self.is_device_connected_cached = None
        self.last_device_check_time = 0
        logger.info(f"RecordingService initialized. DataRecorder: {self.data_recorder}, DBManager: {self.db}, WSServer: {self.ws_server}")

    async def get_device_status_with_timeout(self, timeout=2):
        # Implementation of get_device_status_with_timeout method
        # This method seems unused now, consider removing if not needed.
        logger.warning("get_device_status_with_timeout called but not implemented.")
        return None

    async def check_device_connection(self) -> bool:
        logger.debug("Enter check_device_connection")
        current_time = time.time()
        if self.is_device_connected_cached is not None and (current_time - self.last_device_check_time) < 1:
            logger.debug(f"Using cached device connection status: {self.is_device_connected_cached}. Cache age: {current_time - self.last_device_check_time:.2f}s")
            logger.debug("Exit check_device_connection (cached)")
            return self.is_device_connected_cached

        logger.info("Checking device connection (no valid cache)...")
        if not self.ws_server:
            logger.warning("WebSocketServer is not available in check_device_connection.")
            self.is_device_connected_cached = False
            self.last_device_check_time = current_time
            logger.debug("Exit check_device_connection (no ws_server)")
            return False
        try:
            device_status_response = self.ws_server.get_device_status()
            logger.info(f"check_device_connection: ws_server.get_device_status() response: {device_status_response}")
            
            if device_status_response is None:
                logger.warning("Device status check returned None from ws_server.get_device_status().")
                self.is_device_connected_cached = False
                self.last_device_check_time = current_time
                logger.debug("Exit check_device_connection (response is None)")
                return False

            is_connected = device_status_response.get("status") == "connected"
            logger.info(f"check_device_connection: Evaluated is_connected: {is_connected} from response: {device_status_response.get('status')}")
            
            self.is_device_connected_cached = is_connected
            self.last_device_check_time = current_time
            logger.debug(f"Exit check_device_connection (updated cache). Returning: {is_connected}")
            return is_connected
        except Exception as e:
            logger.error(f"Error in check_device_connection: {e}", exc_info=True)
            self.is_device_connected_cached = False
            self.last_device_check_time = current_time
            logger.debug("Exit check_device_connection (exception)")
            return False

    async def start_recording(self, session_name: Optional[str] = None, settings: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        logger.info(f"Enter start_recording. Provided session_name (will be ignored by DataRecorder): {session_name}, Provided settings (will be ignored by DataRecorder): {settings}")
        
        is_connected = await self.check_device_connection()
        logger.info(f"start_recording: check_device_connection returned: {is_connected}")

        if not is_connected:
            logger.warning("Device not connected. Cannot start recording. (Checked by start_recording)")
            return {"status": "fail", "message": "Device not connected."}

        logger.info(f"start_recording: Before DataRecorder.start_recording(), data_recorder.is_recording: {self.data_recorder.is_recording}")
        if self.data_recorder.is_recording:
            logger.warning("Start recording called but already recording.")
            return {"status": "fail", "message": "Recording is already in progress."}
        
        try:
            logger.info("Calling DataRecorder.start_recording() without session_name and settings...")
            result = self.data_recorder.start_recording() # session_name 및 settings 인자 제거
            logger.info(f"DataRecorder.start_recording() returned: {result}")
            logger.info(f"start_recording: After DataRecorder.start_recording(), data_recorder.is_recording: {self.data_recorder.is_recording}") 
            
            if result.get("status") == "started":
                logger.info("Recording started successfully in DataRecorder, broadcasting WebSocket event...")
                if self.ws_server:
                    await self.ws_server.broadcast_event(EventType.STATUS, {"status": "recording_started", "session_name": result.get("session_name")})
            else:
                logger.warning(f"DataRecorder.start_recording() did not return 'started' status. Result: {result}")
            
            logger.info(f"Exit start_recording. Result: {result}")
            return result
        except AttributeError as ae:
            logger.error(f"AttributeError in start_recording: {ae}", exc_info=True)
            logger.info(f"Exit start_recording (AttributeError).")
            return {"status": "fail", "message": f"Internal server error (AttributeError): {ae}"}
        except Exception as e:
            logger.error(f"Error in start_recording: {e}", exc_info=True)
            logger.info(f"Exit start_recording (Exception).")
            return {"status": "fail", "message": f"Failed to start recording: {e}"}

    async def stop_recording(self) -> Dict[str, Any]:
        logger.info("Attempting to stop recording in RecordingService...")
        if not self.data_recorder.is_recording:
            logger.warning("Stop recording called but not currently recording (checked in RecordingService).")
            return {"status": "fail", "message": "No recording is in progress."}
        
        try:
            # DataRecorder에서 녹화 중지 및 파일 저장 처리
            recorder_result = self.data_recorder.stop_recording()
            logger.info(f"DataRecorder.stop_recording() result: {recorder_result}")

            if recorder_result.get("status") == "stopped":
                logger.info("Recording stopped successfully in DataRecorder.")
                
                # 세션 정보를 DB에 저장
                session_name = recorder_result.get("session_name")
                start_time = self.data_recorder.meta.get("start_time") # DataRecorder의 meta에서 가져옴
                end_time = recorder_result.get("end_time")
                session_dir_path = self.data_recorder.session_dir # DataRecorder에서 세션 경로 가져옴
                status = "completed" # 또는 recorder_result에서 상태를 가져올 수 있음

                if session_name and start_time and end_time and session_dir_path:
                    try:
                        logger.info(f"Attempting to save session to DB: Name: {session_name}, Start: {start_time}, End: {end_time}, Path: {session_dir_path}")
                        session_id = self.db.add_session(
                            session_name=session_name,
                            start_time=start_time,
                            end_time=end_time,
                            data_path=session_dir_path,
                            status=status
                        )
                        logger.info(f"Session {session_name} (ID: {session_id}) saved to database.")
                    except Exception as db_exc:
                        logger.error(f"Error saving session {session_name} to database: {db_exc}", exc_info=True)
                        # DB 저장 실패가 전체 중지 흐름을 막을 필요는 없을 수 있으나, 로그는 남김
                        # recorder_result에 DB 저장 실패 정보를 추가할 수도 있음
                else:
                    logger.warning(f"Could not save session to DB due to missing info: Name={session_name}, Start={start_time}, End={end_time}, Path={session_dir_path}")

                if self.ws_server:
                    await self.ws_server.broadcast_event(EventType.STATUS, {"status": "recording_stopped", "session_name": session_name})
                return recorder_result # DataRecorder의 결과를 그대로 반환하거나, DB 저장 상태 포함하여 가공 가능
            else:
                logger.warning(f"DataRecorder.stop_recording() did not return 'stopped' status. Result: {recorder_result}")
                return recorder_result # 실패 시 DataRecorder 결과 반환

        except Exception as e:
            logger.error(f"Error in RecordingService.stop_recording: {e}", exc_info=True)
            return {"status": "fail", "message": f"Failed to stop recording: {e}"}

    def get_recording_status(self) -> Dict[str, Any]:
        return self.data_recorder.get_recording_status()

    def add_data(self, data_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.ws_server or not hasattr(self.ws_server, 'data_recorder') or not self.ws_server.data_recorder: # Ensure ws_server and its data_recorder exist
            logger.error("DataRecorder not initialized via ws_server. Cannot add data.")
            return {"status": "fail", "message": "DataRecorder not initialized."}
        
        if not self.ws_server.data_recorder.is_recording:
            return {
                "status": "fail",
                "message": "No recording is in progress."
            }

        try:
            self.ws_server.data_recorder.add_data(data_type, data)
            return {"status": "success"}
        except Exception as e:
            logger.error(f"Error in RecordingService.add_data: {e}", exc_info=True)
            return {
                "status": "fail",
                "message": f"Error adding data: {str(e)}"
            }

    def get_sessions(self) -> Dict[str, Any]:
        # Assuming self.db is initialized elsewhere or this part needs re-evaluation
        # For now, to prevent AttributeError if self.db is not set:
        if not hasattr(self, 'db') or not self.db:
            logger.error("DatabaseManager (self.db) not initialized in RecordingService. Cannot get sessions.")
            return {"status": "fail", "message": "Internal server error: Database service not available."}
        try:
            sessions = self.db.get_sessions()
            return {"status": "success", "data": sessions} # Ensure consistent return structure
        except Exception as e:
            logger.error(f"Error retrieving sessions: {e}", exc_info=True)
            return {
                "status": "fail",
                "message": f"Error retrieving sessions: {str(e)}"
            }

    def get_session_details(self, session_name: str) -> Dict[str, Any]:
        if not hasattr(self, 'db') or not self.db:
            logger.error("DatabaseManager (self.db) not initialized in RecordingService. Cannot get session details.")
            return {"status": "fail", "message": "Internal server error: Database service not available."}
        try:
            session = self.db.get_session_by_name(session_name)
            if not session:
                return {
                    "status": "fail",
                    "message": f"Session not found: {session_name}"
                }
            return {"status": "success", "data": session} # Ensure consistent return structure
        except Exception as e:
            logger.error(f"Error retrieving session details: {e}", exc_info=True)
            return {
                "status": "fail",
                "message": f"Error retrieving session details: {str(e)}"
            }
