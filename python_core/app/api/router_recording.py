from fastapi import APIRouter

router = APIRouter()

@router.post("/start")
def start_recording():
    return {"result": "recording started"}

@router.post("/stop")
def stop_recording():
    return {"result": "recording stopped"}

@router.get("")
def list_recordings():
    return {"recordings": []}

@router.get("/{id}")
def get_recording(id: int):
    return {"id": id, "info": "recording info"}

@router.get("/{id}/download")
def download_recording(id: int):
    return {"id": id, "download": True}

@router.delete("/{id}")
def delete_recording(id: int):
    return {"id": id, "deleted": True}
