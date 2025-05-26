from fastapi import APIRouter, HTTPException, Depends, Request, Body
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
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
TEMP_EXPORT_DIR = Path("temp_exports") # Store this in a config file or env var ideally
TEMP_EXPORT_DIR.mkdir(parents=True, exist_ok=True) # Ensure directory exists

class SearchParams(BaseModel):
    date_range: Optional[tuple[datetime, datetime]] = None
    file_types: Optional[List[str]] = None
    search_text: Optional[str] = None

class ExportParams(BaseModel):
    date_range: tuple[datetime, datetime]
    file_types: Optional[List[str]] = None
    export_format: str

class OpenFolderParams(BaseModel):
    path: str

class DataItem(BaseModel):
    type: str
    data: Dict[str, Any]

# 의존성 주입을 위한 함수
def get_recording_service(request: Request) -> RecordingService:
    if not hasattr(request.app.state, 'recording_service'):
        # 이 문제는 main.py에서 RecordingService 인스턴스를 app.state에 설정함으로써 해결되어야 합니다.
        logger.error("RecordingService not initialized in app.state. This should be done at application startup.")
        raise HTTPException(status_code=500, detail="Internal server error: Recording service not available.")
    return request.app.state.recording_service

@router.post("/start-recording", summary="Start a new data recording session")
async def start_recording_endpoint(
    session_create: Optional[DataSessionCreate] = Body(None), # 요청 본문에서 세션 이름과 설정을 받을 수 있도록 변경
    recording_service: RecordingService = Depends(get_recording_service)
):
    session_name = session_create.session_name if session_create and session_create.session_name else None
    settings = session_create.settings if session_create and session_create.settings else None
    logger.info(f"Endpoint /start-recording called with session_name: {session_name}, settings: {settings}")
    try:
        result = await recording_service.start_recording(session_name=session_name, settings=settings)
        if result.get("status") == "fail":
            logger.error(f"Failed to start recording: {result.get('message')}")
            raise HTTPException(status_code=400, detail=result.get("message"))
        logger.info(f"Recording started successfully: {result}")
        return result
    except Exception as e:
        logger.error(f"Exception in /start-recording endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/stop-recording", summary="Stop the current recording session")
async def stop_recording_endpoint(
    recording_service: RecordingService = Depends(get_recording_service)
):
    logger.info("Endpoint /stop-recording called")
    try:
        result = await recording_service.stop_recording()
        if result.get("status") == "fail":
            logger.error(f"Failed to stop recording: {result.get('message')}")
            raise HTTPException(status_code=400, detail=result.get("message"))
        logger.info(f"Recording stopped successfully: {result}")
        return result
    except Exception as e:
        logger.error(f"Exception in /stop-recording endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/recording-status", summary="Get the current recording status")
async def get_recording_status_endpoint( # async def로 변경
    recording_service: RecordingService = Depends(get_recording_service)
):
    logger.info("Endpoint /recording-status called")
    try:
        status = recording_service.get_recording_status() # 동기 함수 호출
        return status
    except Exception as e:
        logger.error(f"Exception in /recording-status endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/sessions", summary="List all data sessions")
async def list_sessions_endpoint(
    recording_service: RecordingService = Depends(get_recording_service)
):
    # Assuming get_sessions might become async or involve I/O in the future
    # For now, if it's synchronous in the service, direct call is fine.
    # If get_sessions is made async in service: result = await recording_service.get_sessions()
    logger.info("Endpoint /sessions called")
    try:
        result = recording_service.get_sessions() 
        if result.get("status") == "fail":
            raise HTTPException(status_code=500, detail=result.get("message"))
        return result.get("data", [])
    except Exception as e:
        logger.error(f"Exception in /sessions endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/sessions/{session_name}", summary="Get details of a specific session")
async def get_session_details_endpoint(
    session_name: str,
    recording_service: RecordingService = Depends(get_recording_service)
):
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

@router.post("/sessions/{session_name}/prepare-export", summary="Prepare a session for export by zipping its data.")
async def prepare_session_export_endpoint(
    session_name: str,
    recording_service: RecordingService = Depends(get_recording_service)
):
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