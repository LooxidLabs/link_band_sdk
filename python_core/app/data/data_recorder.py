import os
import json
import threading
import queue
from datetime import datetime
from typing import Dict, Any, Optional

class DataRecorder:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.is_recording = False
        self.session_dir = None
        self.meta = {}
        self.data_queue = queue.Queue()
        self.thread = None
        self._ensure_data_directory()

    def _ensure_data_directory(self):
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(os.path.join(self.data_dir, "raw_data"), exist_ok=True)
        os.makedirs(os.path.join(self.data_dir, "processed_data"), exist_ok=True)

    def start_recording(self) -> Dict[str, Any]:
        if self.is_recording:
            return {"status": "fail", "message": "Recording is already in progress."}
        now = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.session_dir = os.path.join(self.data_dir, f"session_{now}")
        os.makedirs(self.session_dir, exist_ok=True)
        self.meta = {
            "session_name": f"session_{now}",
            "start_time": now,
            "files": [],
            "status": "recording"
        }
        with open(os.path.join(self.session_dir, "meta.json"), "w") as f:
            json.dump(self.meta, f, ensure_ascii=False, indent=2)
        self.is_recording = True
        self.thread = threading.Thread(target=self._recording_loop, daemon=True)
        self.thread.start()
        return {"status": "started", "session_name": self.meta["session_name"], "start_time": now}

    def stop_recording(self) -> Dict[str, Any]:
        if not self.is_recording:
            return {"status": "fail", "message": "No recording is in progress."}
        self.is_recording = False
        if self.thread:
            self.thread.join(timeout=2)
        self.meta["end_time"] = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.meta["status"] = "stopped"
        self._analyze_and_save_meta()
        with open(os.path.join(self.session_dir, "meta.json"), "w") as f:
            json.dump(self.meta, f, ensure_ascii=False, indent=2)
        return {"status": "stopped", "session_name": self.meta["session_name"], "end_time": self.meta["end_time"]}

    def add_data(self, data_type: str, data: Dict[str, Any]):
        if not self.is_recording:
            raise RuntimeError("No recording is in progress.")
        self.data_queue.put((data_type, data))

    def _recording_loop(self):
        while self.is_recording or not self.data_queue.empty():
            try:
                data_type, data = self.data_queue.get(timeout=0.5)
                filename = f"{data_type}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.json"
                file_path = os.path.join(self.session_dir, filename)
                with open(file_path, "w") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                self.meta["files"].append({"type": data_type, "path": file_path})
            except queue.Empty:
                continue

    def _analyze_and_save_meta(self):
        # 예시: 파일 개수, 타입별 개수 등 통계 저장
        stats = {"total_files": len(self.meta["files"])}
        type_count = {}
        for f in self.meta["files"]:
            t = f["type"]
            type_count[t] = type_count.get(t, 0) + 1
        stats["type_count"] = type_count
        self.meta["stats"] = stats

    def get_recording_status(self) -> Dict[str, Any]:
        return {
            "is_recording": self.is_recording,
            "session_dir": self.session_dir,
            "meta": self.meta
        } 