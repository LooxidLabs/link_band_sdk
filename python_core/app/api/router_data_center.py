from fastapi import APIRouter, HTTPException, Depends, Request, Body
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.services.data_center import DataCenterService
from app.services.recording_service import RecordingService
import os
import subprocess
import logging
import shutil # For zipping
import zipfile # For zipping
from pathlib import Path # For path manipulations
from app.models.data_models import DataSessionCreate, DataSessionUpdate, DataExportRequest, FileOperationRequest, FolderOperationRequest

logger = logging.getLogger(__name__)
router = APIRouter()
data_center_service = DataCenterService()

# Configuration for exports
import sys

# Check if we're running in a packaged environment
if sys.platform == 'darwin' and '/Contents/Resources/python_core' in __file__:
    # We're in a packaged macOS app, use user's home directory
    home_dir = os.path.expanduser("~")
    app_data_dir = os.path.join(home_dir, "Library", "Application Support", "Link Band SDK")
    TEMP_EXPORT_DIR = Path(app_data_dir) / "temp_exports"
elif sys.platform == 'win32' and '\\resources\\python_core' in __file__.lower():
    # We're in a packaged Windows app, use user's AppData directory
    app_data_dir = os.path.join(os.environ.get('APPDATA', ''), "Link Band SDK")
    TEMP_EXPORT_DIR = Path(app_data_dir) / "temp_exports"
elif sys.platform.startswith('linux') and '/resources/python_core' in __file__:
    # We're in a packaged Linux app, use user's home directory
    home_dir = os.path.expanduser("~")
    app_data_dir = os.path.join(home_dir, ".link-band-sdk")
    TEMP_EXPORT_DIR = Path(app_data_dir) / "temp_exports"
else:
    # Development environment or unpackaged
    TEMP_EXPORT_DIR = Path("temp_exports")

TEMP_EXPORT_DIR.mkdir(parents=True, exist_ok=True) # Ensure directory exists

# Response Models for better API documentation
class RecordingResponse(BaseModel):
    """Response model for recording operations"""
    status: str = Field(..., description="Operation status", example="success")
    message: str = Field(..., description="Operation message")
    session_name: Optional[str] = Field(None, description="Recording session name")

class RecordingStatusResponse(BaseModel):
    """Response model for recording status"""
    is_recording: bool = Field(..., description="Whether recording is currently active")
    current_session: Optional[str] = Field(None, description="Current session name if recording")
    start_time: Optional[str] = Field(None, description="Recording start time in ISO format")

class SessionInfo(BaseModel):
    """Model for session information"""
    session_name: str = Field(..., description="Session name")
    start_time: str = Field(..., description="Session start time")
    end_time: Optional[str] = Field(None, description="Session end time")
    duration: Optional[float] = Field(None, description="Session duration in seconds")
    data_path: str = Field(..., description="Path to session data")
    file_count: int = Field(..., description="Number of files in session")
    total_size: int = Field(..., description="Total size in bytes")

class SessionListResponse(BaseModel):
    """Response model for session list"""
    sessions: List[SessionInfo] = Field(..., description="List of recording sessions")

class ExportResponse(BaseModel):
    """Response model for export operations"""
    status: str = Field(..., description="Export status")
    message: str = Field(..., description="Export message")
    zip_filename: Optional[str] = Field(None, description="Generated zip filename")
    download_url: Optional[str] = Field(None, description="Download URL for the exported file")
    full_server_zip_path: Optional[str] = Field(None, description="Full server path to zip file")

class SearchParams(BaseModel):
    """Search parameters for file search"""
    date_range: Optional[tuple[datetime, datetime]] = Field(None, description="Date range filter")
    file_types: Optional[List[str]] = Field(None, description="File type filters")
    search_text: Optional[str] = Field(None, description="Text search query")

class ExportParams(BaseModel):
    """Export parameters"""
    date_range: tuple[datetime, datetime] = Field(..., description="Date range for export")
    file_types: Optional[List[str]] = Field(None, description="File types to include")
    export_format: str = Field(..., description="Export format (zip, csv, json)")

class OpenFolderParams(BaseModel):
    """Parameters for opening folder"""
    path: str = Field(..., description="Folder path to open")

class DataItem(BaseModel):
    """Data item model"""
    type: str = Field(..., description="Data type")
    data: Dict[str, Any] = Field(..., description="Data content")

# 의존성 주입을 위한 함수
def get_recording_service(request: Request) -> RecordingService:
    """Get RecordingService instance from application state"""
    if not hasattr(request.app.state, 'recording_service'):
        # 이 문제는 main.py에서 RecordingService 인스턴스를 app.state에 설정함으로써 해결되어야 합니다.
        logger.error("RecordingService not initialized in app.state. This should be done at application startup.")
        raise HTTPException(status_code=500, detail="Internal server error: Recording service not available.")
    return request.app.state.recording_service

@router.post("/start-recording", 
    response_model=RecordingResponse,
    summary="Start a new data recording session",
    description="""
    Start a new data recording session
    
    Creates a new recording session and begins capturing data from the connected
    Link Band device. All sensor data will be saved to timestamped files.
    
    Args:
        session_create: Optional session configuration
        
    Returns:
        Recording start result with session name
        
    Raises:
        HTTPException: If recording fails to start
    """,
    responses={
        200: {
            "description": "Recording session started successfully",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "message": "Recording started",
                        "session_name": "session_20240624_143022"
                    }
                }
            }
        },
        400: {"description": "Recording failed - device not connected or already recording"},
        500: {"description": "Internal server error during recording start"}
    })
async def start_recording_endpoint(
    session_create: Optional[DataSessionCreate] = Body(None), # 요청 본문에서 세션 이름과 설정을 받을 수 있도록 변경
    recording_service: RecordingService = Depends(get_recording_service)
):
    session_name = session_create.session_name if session_create and session_create.session_name else None
    settings = session_create.settings if session_create and session_create.settings else None
    print(f"🎬 Start recording request: session_name={session_name}")
    try:
        result = await recording_service.start_recording(session_name=session_name, settings=settings)
        if result.get("status") == "fail":
            print(f"❌ Recording start failed: {result.get('message')}")
            raise HTTPException(status_code=400, detail=result.get("message"))
        print(f"✅ Recording started: {result.get('session_name')}")
        return result
    except Exception as e:
        print(f"❌ Recording start error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/stop-recording", 
    response_model=RecordingResponse,
    summary="Stop the current recording session",
    description="""
    Stop the currently active data recording session.
    
    **Process:**
    1. Stops data capture from all sensors
    2. Finalizes and saves all data files
    3. Updates session metadata
    4. Closes recording streams
    
    **Data Finalization:**
    - Saves all buffered data to files
    - Generates session summary
    - Updates file metadata
    - Calculates session statistics
    
    **File Organization:**
    - Raw data files (EEG, PPG, ACC)
    - Processed data files
    - Session metadata (JSON)
    - Battery and device logs
    
    **Note:** This operation is safe to call even if no recording is active.
    """,
    responses={
        200: {
            "description": "Recording session stopped successfully",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "message": "Recording stopped",
                        "session_name": "session_20240624_143022"
                    }
                }
            }
        },
        400: {"description": "Stop failed - no active recording session"},
        500: {"description": "Internal server error during recording stop"}
    })
async def stop_recording_endpoint(
    recording_service: RecordingService = Depends(get_recording_service)
):
    """
    Stop the current recording session
    
    Stops the active recording session and finalizes all data files.
    This ensures all captured data is properly saved and organized.
    
    Returns:
        Recording stop result with session information
        
    Raises:
        HTTPException: If stopping fails
    """
    print("🛑 Stop recording request")
    try:
        result = await recording_service.stop_recording()
        if result.get("status") == "fail":
            print(f"❌ Recording stop failed: {result.get('message')}")
            raise HTTPException(status_code=400, detail=result.get("message"))
        print(f"✅ Recording stopped: {result.get('session_name')}")
        return result
    except Exception as e:
        print(f"❌ Recording stop error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/recording-status", 
    response_model=RecordingStatusResponse,
    summary="Get the current recording status",
    description="""
    Retrieve the current status of data recording operations.
    
    **Status Information:**
    - Recording active/inactive status
    - Current session name (if recording)
    - Recording start time
    - Session duration
    - Data capture statistics
    
    **Use Cases:**
    - Monitor recording progress
    - Display recording status in UI
    - Validate recording state before operations
    - Check session duration
    
    **Real-time Updates:**
    This endpoint provides real-time status information that updates
    as recording progresses. Poll this endpoint for live status updates.
    """,
    responses={
        200: {
            "description": "Current recording status",
            "content": {
                "application/json": {
                    "example": {
                        "is_recording": True,
                        "current_session": "session_20240624_143022",
                        "start_time": "2024-06-24T14:30:22Z"
                    }
                }
            }
        },
        500: {"description": "Failed to get recording status"}
    })
async def get_recording_status_endpoint( # async def로 변경
    recording_service: RecordingService = Depends(get_recording_service)
):
    """
    Get the current recording status
    
    Returns real-time information about the current recording session
    including status, session name, and timing information.
    
    Returns:
        Current recording status and session information
        
    Raises:
        HTTPException: If status retrieval fails
    """
    logger.info("Endpoint /recording-status called")
    try:
        status = recording_service.get_recording_status() # 동기 함수 호출
        
        # DataRecorder가 반환하는 형식을 프론트엔드가 기대하는 형식으로 변환
        response = {
            "is_recording": status.get("is_recording", False),
            "current_session": status.get("current_session_name"),  # current_session_name -> current_session
            "start_time": None  # 기본값
        }
        
        # 녹화 중이고 recording_service의 data_recorder에 meta 정보가 있으면 start_time 추가
        if response["is_recording"] and hasattr(recording_service.data_recorder, 'meta'):
            response["start_time"] = recording_service.data_recorder.meta.get("start_time")
        
        logger.info(f"Returning recording status: {response}")
        return response
    except Exception as e:
        logger.error(f"Exception in /recording-status endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/sessions", 
    summary="List all data recording sessions",
    description="""
    Retrieve a comprehensive list of all recorded data sessions.
    
    **Session Information:**
    - Session names and timestamps
    - Recording duration and file counts
    - Data file paths and sizes
    - Session metadata and statistics
    
    **Data Organization:**
    Sessions are organized chronologically with the most recent first.
    Each session contains multiple data files for different sensor types.
    
    **File Types per Session:**
    - EEG raw and processed data
    - PPG heart rate measurements
    - ACC accelerometer data
    - Battery status logs
    - Session metadata (JSON)
    
    **Use Cases:**
    - Browse recorded sessions
    - Select sessions for analysis
    - Monitor storage usage
    - Session management operations
    """,
    responses={
        200: {
            "description": "List of all recording sessions",
            "content": {
                "application/json": {
                    "example": {
                        "sessions": [
                            {
                                "session_name": "session_20240624_143022",
                                "start_time": "2024-06-24T14:30:22Z",
                                "end_time": "2024-06-24T14:45:30Z",
                                "duration": 908.5,
                                "data_path": "/data/session_20240624_143022",
                                "file_count": 8,
                                "total_size": 2048576
                            }
                        ]
                    }
                }
            }
        },
        500: {"description": "Failed to retrieve sessions list"}
    })
async def list_sessions_endpoint(
    recording_service: RecordingService = Depends(get_recording_service)
):
    """
    List all data recording sessions
    
    Returns a comprehensive list of all recorded sessions with
    metadata and statistics for each session.
    
    Returns:
        List of all recording sessions with details
        
    Raises:
        HTTPException: If session listing fails
    """
    # Assuming get_sessions might become async or involve I/O in the future
    # For now, if it's synchronous in the service, direct call is fine.
    # If get_sessions is made async in service: result = await recording_service.get_sessions()
    logger.info("[API] Endpoint /sessions called")
    try:
        print(f"[API] Fetching sessions from recording service...")
        result = recording_service.get_sessions() 
        print(f"[API] Recording service returned: {result}")
        
        if result.get("status") == "fail":
            print(f"[API] Recording service failed: {result.get('message')}")
            raise HTTPException(status_code=500, detail=result.get("message"))
        
        # Return data in the expected format for frontend
        sessions_data = result.get("data", [])
        print(f"[API] Sessions data type: {type(sessions_data)}")
        print(f"[API] Sessions data length: {len(sessions_data) if isinstance(sessions_data, list) else 'N/A'}")
        
        if isinstance(sessions_data, list):
            for i, session in enumerate(sessions_data):
                print(f"[API] Session {i}: {session.get('session_name', 'Unknown')} - Size: {session.get('total_size', 'N/A')}")
        
        response = {"sessions": sessions_data}
        print(f"[API] Returning response: {response}")
        return response
    except Exception as e:
        print(f"[API] Exception in /sessions endpoint: {e}")
        logger.error(f"Exception in /sessions endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/sessions/{session_name}", 
    response_model=SessionInfo,
    summary="Get detailed information about a specific session",
    description="""
    Retrieve comprehensive details about a specific recording session.
    
    **Detailed Information:**
    - Complete session metadata
    - File inventory and sizes
    - Recording statistics
    - Data quality metrics
    - Session configuration
    
    **File Details:**
    - Individual file paths and sizes
    - Data type breakdown
    - Recording timestamps
    - Processing status
    
    **Quality Metrics:**
    - Signal quality indicators
    - Data completeness
    - Error rates
    - Device performance during session
    
    **Use Cases:**
    - Session analysis preparation
    - Data quality assessment
    - Export planning
    - Detailed session review
    """,
    responses={
        200: {
            "description": "Detailed session information",
            "content": {
                "application/json": {
                    "example": {
                        "session_name": "session_20240624_143022",
                        "start_time": "2024-06-24T14:30:22Z",
                        "end_time": "2024-06-24T14:45:30Z",
                        "duration": 908.5,
                        "data_path": "/data/session_20240624_143022",
                        "file_count": 8,
                        "total_size": 2048576
                    }
                }
            }
        },
        404: {"description": "Session not found"},
        500: {"description": "Failed to retrieve session details"}
    })
async def get_session_details_endpoint(
    session_name: str,
    recording_service: RecordingService = Depends(get_recording_service)
):
    """
    Get detailed information about a specific session
    
    Returns comprehensive details about the specified recording session
    including files, statistics, and quality metrics.
    
    Args:
        session_name: Name of the session to retrieve
        
    Returns:
        Detailed session information
        
    Raises:
        HTTPException: If session not found or retrieval fails
    """
    logger.info(f"Endpoint /sessions/{session_name} called")
    try:
        result = recording_service.get_session_details(session_name)
        if result.get("status") == "fail":
            raise HTTPException(status_code=404 if "not found" in result.get("message","").lower() else 500, detail=result.get("message"))
        # Ensure the data being returned is the session dictionary itself
        session_data = result.get("data")
        if not session_data or not isinstance(session_data, dict):
            logger.error(f"Session data for {session_name} is not in expected format: {session_data}")
            raise HTTPException(status_code=500, detail=f"Invalid data format for session {session_name}")
        return session_data # Return the session dictionary directly
    except Exception as e:
        logger.error(f"Exception in /sessions/{session_name} endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/sessions/{session_name}/prepare-export", 
    response_model=ExportResponse,
    summary="Prepare a session for export by creating a downloadable zip file",
    description="""
    Prepare a recording session for export by creating a compressed zip file.
    
    **Export Process:**
    1. Validates session existence and data integrity
    2. Creates compressed zip archive of all session files
    3. Generates secure download URL
    4. Provides export metadata
    
    **Included Files:**
    - All raw sensor data files
    - Processed data files
    - Session metadata and configuration
    - Battery and device logs
    - Data quality reports
    
    **Security:**
    - Sanitized filenames prevent path traversal
    - Temporary export directory isolation
    - Secure download URLs with expiration
    
    **File Organization in Zip:**
    Files maintain their original structure and naming within the zip archive
    for easy identification and analysis.
    
    **Note:** Large sessions may take time to compress. Monitor the operation status.
    """,
    responses={
        200: {
            "description": "Session prepared for export successfully",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "message": "Session session_20240624_143022 prepared for export.",
                        "zip_filename": "session_20240624_143022.zip",
                        "download_url": "/exports/session_20240624_143022.zip",
                        "full_server_zip_path": "/temp_exports/session_20240624_143022.zip"
                    }
                }
            }
        },
        404: {"description": "Session not found or data directory missing"},
        500: {"description": "Export preparation failed"}
    })
async def prepare_session_export_endpoint(
    session_name: str,
    recording_service: RecordingService = Depends(get_recording_service)
):
    """
    Prepare a session for export by creating a zip archive
    
    Creates a compressed zip file containing all session data
    and provides a download URL for the exported archive.
    
    Args:
        session_name: Name of the session to export
        
    Returns:
        Export preparation result with download information
        
    Raises:
        HTTPException: If session not found or export fails
    """
    logger.info(f"Endpoint /sessions/{session_name}/prepare-export called")
    try:
        session_details_response = recording_service.get_session_details(session_name)
        if session_details_response.get("status") == "fail":
            raise HTTPException(status_code=404, detail=session_details_response.get("message"))
        
        session_data = session_details_response.get("data")
        if not session_data or not isinstance(session_data, dict):
            logger.error(f"Session data for {session_name} is not in expected format for export: {session_data}")
            raise HTTPException(status_code=500, detail="Invalid data format for session.")

        data_path_str = session_data.get("data_path")
        if not data_path_str or not isinstance(data_path_str, str):
            logger.error(f"data_path not found or invalid for session {session_name}: {data_path_str}")
            raise HTTPException(status_code=404, detail=f"Data path not found or invalid for session {session_name}.")

        data_path = Path(data_path_str)
        if not data_path.exists() or not data_path.is_dir():
            logger.error(f"Data path {data_path} does not exist or is not a directory for session {session_name}.")
            raise HTTPException(status_code=404, detail=f"Data directory not found for session {session_name}.")

        # Sanitize session_name for use in filename to prevent path traversal issues
        safe_session_name = "".join(c if c.isalnum() or c in ('_', '-') else '_' for c in session_name)
        zip_filename = f"{safe_session_name}.zip"
        zip_file_path = TEMP_EXPORT_DIR / zip_filename

        logger.info(f"Zipping directory {data_path} to {zip_file_path} for session {session_name}")
        
        # Using zipfile for more control and to avoid relying on shell commands
        with zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, _, files in os.walk(data_path):
                for file in files:
                    file_path_in_archive = Path(root).relative_to(data_path) / file
                    zf.write(Path(root) / file, arcname=file_path_in_archive)
        
        logger.info(f"Successfully created zip file: {zip_file_path}")
        
        # The download URL will be relative to the /exports mount point in main.py
        download_url = f"/exports/{zip_filename}"
        
        return {
            "status": "success", 
            "message": f"Session {session_name} prepared for export.",
            "zip_filename": zip_filename,
            "download_url": download_url,
            "full_server_zip_path": str(zip_file_path.resolve()) # For debugging or server-side ops
        }

    except HTTPException: # Re-raise HTTPExceptions directly
        raise
    except Exception as e:
        logger.error(f"Error preparing export for session {session_name}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error preparing export: {str(e)}")

@router.post("/search-files")
async def search_files(params: SearchParams):
    try:
        files = await data_center_service.search_files(
            date_range=params.date_range,
            file_types=params.file_types,
            search_text=params.search_text
        )
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export-data")
async def export_data(params: ExportParams):
    try:
        result = await data_center_service.export_data(
            date_range=params.date_range,
            file_types=params.file_types,
            export_format=params.export_format
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export-history")
async def get_export_history():
    try:
        history = await data_center_service.get_export_history()
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/open-file/{file_id}")
async def open_file(file_id: int):
    try:
        await data_center_service.open_file(file_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/open-folder")
async def open_folder(params: OpenFolderParams):
    try:
        if not os.path.exists(params.path):
            raise HTTPException(status_code=404, detail="Folder not found")
            
        if os.name == 'nt':  # Windows
            os.startfile(params.path)
        elif os.name == 'posix':  # macOS and Linux
            subprocess.run(['open' if os.uname().sysname == 'Darwin' else 'xdg-open', params.path])
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 

@router.post("/export", summary="Export data sessions")
async def export_data_endpoint(
    export_request: DataExportRequest,
    recording_service: RecordingService = Depends(get_recording_service) # Example
):
    logger.info(f"Endpoint /export called with request: {export_request}")
    # Assume recording_service has an async method like export_data
    # result = await recording_service.export_data(export_request) 
    # if result.get("status") == "fail":
    #     raise HTTPException(status_code=400, detail=result.get("message"))
    # return result
    raise HTTPException(status_code=501, detail="Export endpoint not fully implemented.")

@router.post("/file-operation", summary="Perform file operations (e.g., delete, move)")
async def file_operation_endpoint(
    operation_request: FileOperationRequest,
    recording_service: RecordingService = Depends(get_recording_service) # Example
):
    logger.info(f"Endpoint /file-operation called with request: {operation_request}")
    # Assume recording_service has an async method like perform_file_operation
    # result = await recording_service.perform_file_operation(operation_request)
    # if result.get("status") == "fail":
    #     raise HTTPException(status_code=400, detail=result.get("message"))
    # return result
    raise HTTPException(status_code=501, detail="File operation endpoint not fully implemented.")

@router.post("/folder-operation", summary="Perform folder operations (e.g., create, delete, rename)")
async def folder_operation_endpoint(
    operation_request: FolderOperationRequest,
    recording_service: RecordingService = Depends(get_recording_service) # Example
):
    logger.info(f"Endpoint /folder-operation called with request: {operation_request}")
    # Assume recording_service has an async method like perform_folder_operation
    # result = await recording_service.perform_folder_operation(operation_request)
    # if result.get("status") == "fail":
    #     raise HTTPException(status_code=400, detail=result.get("message"))
    # return result
    raise HTTPException(status_code=501, detail="Folder operation endpoint not fully implemented.")

@router.get("/search", summary="Search for files or sessions")
async def search_endpoint(
    query: str,
    type: Optional[str] = None, # 'file' or 'session'
    recording_service: RecordingService = Depends(get_recording_service) # Example
):
    logger.info(f"Endpoint /search called with query: {query}, type: {type}")
    # Assume recording_service has an async method like search_data
    # result = await recording_service.search_data(query, type)
    # if result.get("status") == "fail":
    #     raise HTTPException(status_code=400, detail=result.get("message"))
    # return result
    raise HTTPException(status_code=501, detail="Search endpoint not fully implemented.") 