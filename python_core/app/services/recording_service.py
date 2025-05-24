from typing import Dict, Any, Optional
from datetime import datetime
from app.data.data_recorder import DataRecorder
from app.database.db_manager import DatabaseManager
from app.core.server import WebSocketServer

class RecordingService:
    def __init__(self):
        self.data_recorder = DataRecorder()
        self.db = DatabaseManager()
        self.ws_server = WebSocketServer()

    def start_recording(self) -> Dict[str, Any]:
        """Start recording"""
        # Check device connection status
        device_status = self.ws_server.get_device_status()
        if not device_status.get('connected', False):
            return {
                "status": "fail",
                "message": "Device is not connected. Please connect a device to start recording."
            }

        # Check if already recording
        if self.data_recorder.is_recording:
            return {
                "status": "fail",
                "message": "Recording is already in progress."
            }

        # Start recording
        result = self.data_recorder.start_recording()
        if result.get("status") == "started":
            # Notify clients via WebSocket
            self.ws_server.broadcast_message({
                "type": "recording_status",
                "status": "started",
                "session_name": result.get("session_name"),
                "start_time": result.get("start_time")
            })
        return result

    def stop_recording(self) -> Dict[str, Any]:
        """Stop recording"""
        if not self.data_recorder.is_recording:
            return {
                "status": "fail",
                "message": "No recording is in progress."
            }

        result = self.data_recorder.stop_recording()
        if result.get("status") == "stopped":
            # Notify clients via WebSocket
            self.ws_server.broadcast_message({
                "type": "recording_status",
                "status": "stopped",
                "session_name": result.get("session_name"),
                "end_time": result.get("end_time")
            })
        return result

    def add_data(self, data_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add data"""
        if not self.data_recorder.is_recording:
            return {
                "status": "fail",
                "message": "No recording is in progress."
            }

        try:
            self.data_recorder.add_data(data_type, data)
            return {"status": "success"}
        except Exception as e:
            return {
                "status": "fail",
                "message": f"Error adding data: {str(e)}"
            }

    def get_recording_status(self) -> Dict[str, Any]:
        """Get current recording status"""
        status = self.data_recorder.get_recording_status()
        device_status = self.ws_server.get_device_status()
        
        return {
            **status,
            "device_connected": device_status.get('connected', False)
        }

    def get_sessions(self) -> Dict[str, Any]:
        """Get list of sessions"""
        try:
            sessions = self.db.get_sessions()
            return {"data": sessions}
        except Exception as e:
            return {
                "status": "fail",
                "message": f"Error retrieving sessions: {str(e)}"
            }

    def get_session_details(self, session_name: str) -> Dict[str, Any]:
        """Get details of a specific session"""
        try:
            session = self.db.get_session_by_name(session_name)
            if not session:
                return {
                    "status": "fail",
                    "message": f"Session not found: {session_name}"
                }
            return {"data": session}
        except Exception as e:
            return {
                "status": "fail",
                "message": f"Error retrieving session details: {str(e)}"
            }
