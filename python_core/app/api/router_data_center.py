from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from app.services.data_center import DataCenterService
from app.services.recording_service import RecordingService
import os
import subprocess

router = APIRouter()
data_center_service = DataCenterService()
recording_service = RecordingService()

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

@router.post("/start-recording")
async def start_recording():
    """데이터 저장 시작"""
    try:
        result = recording_service.start_recording()
        if result.get("status") == "fail":
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "녹화를 시작할 수 없습니다.")
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop-recording")
async def stop_recording():
    """데이터 저장 종료"""
    try:
        result = recording_service.stop_recording()
        if result.get("status") == "fail":
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "녹화를 종료할 수 없습니다.")
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add-data")
async def add_data(data_item: DataItem):
    """데이터 추가"""
    try:
        result = recording_service.add_data(data_item.type, data_item.data)
        if result.get("status") == "fail":
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "데이터를 추가할 수 없습니다.")
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recording-status")
async def get_recording_status():
    """현재 녹화 상태 조회"""
    try:
        return recording_service.get_recording_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def get_sessions():
    """세션 목록 조회"""
    try:
        result = recording_service.get_sessions()
        if result.get("status") == "fail":
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "세션 목록을 조회할 수 없습니다.")
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_name}")
async def get_session_details(session_name: str):
    """세션 상세 정보 조회"""
    try:
        result = recording_service.get_session_details(session_name)
        if result.get("status") == "fail":
            raise HTTPException(
                status_code=404,
                detail=result.get("message", "세션을 찾을 수 없습니다.")
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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