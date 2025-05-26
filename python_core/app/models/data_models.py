from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime

class DataSessionCreate(BaseModel):
    session_name: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class DataSessionUpdate(BaseModel):
    # Define fields for updating a session, e.g., name, description, status
    session_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None # e.g., 'completed', 'archived'

class DataExportRequest(BaseModel):
    session_ids: List[str]
    export_format: str # e.g., 'csv', 'json_lines'
    # Add other export options if needed
    # date_range: Optional[Tuple[datetime, datetime]] = None
    # file_types: Optional[List[str]] = None 

class FileOperationRequest(BaseModel):
    operation: str # e.g., 'delete', 'move', 'rename'
    file_path: str
    new_path: Optional[str] = None # For move/rename

class FolderOperationRequest(BaseModel):
    operation: str # e.g., 'create', 'delete', 'rename'
    folder_path: str
    new_name: Optional[str] = None # For rename 