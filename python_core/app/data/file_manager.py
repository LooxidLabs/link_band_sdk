import os
import shutil
import zipfile
import tarfile
from datetime import datetime
from pathlib import Path
import json
import sys
from typing import List, Dict, Any

class FileManager:
    def __init__(self, data_dir: str = "data"):
        # Check if we're running in a packaged environment
        if sys.platform == 'darwin' and '/Contents/Resources/python_core' in __file__:
            # We're in a packaged macOS app, use user's home directory
            home_dir = os.path.expanduser("~")
            app_data_dir = os.path.join(home_dir, "Library", "Application Support", "Link Band SDK")
            self.data_dir = os.path.join(app_data_dir, "data")
        elif sys.platform == 'win32' and '\\resources\\python_core' in __file__.lower():
            # We're in a packaged Windows app, use user's AppData directory
            app_data_dir = os.path.join(os.environ.get('APPDATA', ''), "Link Band SDK")
            self.data_dir = os.path.join(app_data_dir, "data")
        elif sys.platform.startswith('linux') and '/resources/python_core' in __file__:
            # We're in a packaged Linux app, use user's home directory
            home_dir = os.path.expanduser("~")
            app_data_dir = os.path.join(home_dir, ".link-band-sdk")
            self.data_dir = os.path.join(app_data_dir, "data")
        else:
            # Development environment or unpackaged, use the provided data_dir
            self.data_dir = data_dir
            
        self._ensure_data_directory()

    def _ensure_data_directory(self):
        os.makedirs(self.data_dir, exist_ok=True)

    def save_file(self, filename: str, content: bytes, file_type: str) -> Dict[str, Any]:
        file_path = os.path.join(self.data_dir, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        return {
            "filename": filename,
            "file_path": file_path,
            "file_size": os.path.getsize(file_path),
            "file_type": file_type,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

    def get_file_path(self, file_id: int) -> str:
        # 실제 구현에서는 DB 연동 필요
        return os.path.join(self.data_dir, f"file_{file_id}.json")

    def export_files(self, file_paths: List[str], export_format: str = "zip") -> Dict[str, Any]:
        export_dir = os.path.join(self.data_dir, "exports")
        os.makedirs(export_dir, exist_ok=True)
        now = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_name = f"export_{now}.{export_format}"
        export_path = os.path.join(export_dir, export_name)
        if export_format == "zip":
            with zipfile.ZipFile(export_path, "w") as zipf:
                for file_path in file_paths:
                    zipf.write(file_path, arcname=os.path.basename(file_path))
        elif export_format == "tar":
            with tarfile.open(export_path, "w") as tarf:
                for file_path in file_paths:
                    tarf.add(file_path, arcname=os.path.basename(file_path))
        else:
            raise ValueError("지원하지 않는 포맷입니다.")
        total_size = sum(os.path.getsize(fp) for fp in file_paths)
        return {
            "export_path": export_path,
            "file_count": len(file_paths),
            "total_size": total_size,
            "export_format": export_format
        }

    def open_file(self, file_id: int):
        file_path = self.get_file_path(file_id)
        if os.path.exists(file_path):
            os.system(f"open '{file_path}'")
        else:
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")

    def open_folder(self, folder_path: str):
        if os.path.exists(folder_path):
            os.system(f"open '{folder_path}'")
        else:
            raise FileNotFoundError(f"폴더를 찾을 수 없습니다: {folder_path}")
