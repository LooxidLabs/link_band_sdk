import os
import json
import csv
import threading
# import queue # queue는 더 이상 사용되지 않음
from datetime import datetime
from typing import Dict, Any, Optional, List
import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

class DataRecorder:
    def __init__(self, data_dir: str = "data"):
        # Check if we're running in a packaged environment
        if sys.platform == 'darwin' and '/Contents/Resources/python_core' in __file__:
            # We're in a packaged macOS app, use user's home directory
            home_dir = os.path.expanduser("~")
            app_data_dir = os.path.join(home_dir, "Library", "Application Support", "Link Band SDK")
            self.data_dir = os.path.join(app_data_dir, "data")
            logger.info(f"Running in packaged macOS app. Using data directory: {self.data_dir}")
        elif sys.platform == 'win32' and '\\resources\\python_core' in __file__.lower():
            # We're in a packaged Windows app, use user's AppData directory
            app_data_dir = os.path.join(os.environ.get('APPDATA', ''), "Link Band SDK")
            self.data_dir = os.path.join(app_data_dir, "data")
            logger.info(f"Running in packaged Windows app. Using data directory: {self.data_dir}")
        elif sys.platform.startswith('linux') and '/resources/python_core' in __file__:
            # We're in a packaged Linux app, use user's home directory
            home_dir = os.path.expanduser("~")
            app_data_dir = os.path.join(home_dir, ".link-band-sdk")
            self.data_dir = os.path.join(app_data_dir, "data")
            logger.info(f"Running in packaged Linux app. Using data directory: {self.data_dir}")
        else:
            # Development environment or unpackaged, use the provided data_dir
            self.data_dir = data_dir
            
        self.is_recording = False
        self.session_dir = None
        self.meta: Dict[str, Any] = {}
        # self.data_queue = queue.Queue() # queue 제거
        self.data_buffers: Dict[str, List[Dict[str, Any]]] = {} # 데이터 타입별 버퍼
        # self.thread = None # thread 제거
        self._ensure_data_directory()
        logger.info(f"DataRecorder initialized. Data directory: {os.path.abspath(self.data_dir)}")

    def _ensure_data_directory(self):
        try:
            os.makedirs(self.data_dir, exist_ok=True)
            # raw_data, processed_data 하위 디렉토리 생성은 session_dir 생성 시점으로 옮기거나,
            # 현재 구조에서는 session_dir이 바로 data_dir 하위에 생성되므로 이 단계에서 불필요할 수 있음.
            # session_YYYYMMDD_HHMMSS 디렉토리만 생성하도록 변경.
            # os.makedirs(os.path.join(self.data_dir, "raw_data"), exist_ok=True)
            # os.makedirs(os.path.join(self.data_dir, "processed_data"), exist_ok=True)
            logger.debug(f"Ensured base data directory exists: {self.data_dir}")
        except Exception as e:
            logger.error(f"Error ensuring data directory {self.data_dir}: {e}", exc_info=True)
            raise

    def start_recording(self, session_name: Optional[str] = None, export_path: Optional[str] = None, data_format: Optional[str] = None) -> Dict[str, Any]:
        if self.is_recording:
            logger.warning("Start recording called but already recording.")
            return {"status": "fail", "message": "Recording is already in progress."}
        
        now_dt = datetime.now()
        session_timestamp = now_dt.strftime("%Y%m%d_%H%M%S")
        
        # Custom session name 처리
        if session_name and session_name.strip():
            # Custom session name이 제공된 경우, 이름_타임스탬프 형태로 조합
            clean_session_name = session_name.strip()
            final_session_name = f"{clean_session_name}_{session_timestamp}"
        else:
            # 기본 형태
            final_session_name = f"session_{session_timestamp}"
        
        # Export path 처리
        if export_path and export_path.strip():
            # ~ 확장 처리
            expanded_path = os.path.expanduser(export_path.strip())
            # 상대 경로인 경우 절대 경로로 변환
            if not os.path.isabs(expanded_path):
                expanded_path = os.path.abspath(expanded_path)
            base_dir = expanded_path
        else:
            # 기본 data_dir 사용
            base_dir = self.data_dir
        
        # 디렉토리가 없으면 생성
        try:
            os.makedirs(base_dir, exist_ok=True)
            logger.info(f"Ensured base directory exists: {base_dir}")
        except Exception as e:
            logger.error(f"Failed to create base directory {base_dir}: {e}")
            return {"status": "fail", "message": f"Failed to create directory: {e}"}
        
        # session_dir을 base_dir 아래에 생성
        self.session_dir = os.path.join(base_dir, final_session_name)
        
        try:
            os.makedirs(self.session_dir, exist_ok=True)
            logger.info(f"Session directory created: {self.session_dir}")
            
            self.data_buffers = {} # 새 녹화 시작 시 버퍼 초기화

            self.meta = {
                "session_name": final_session_name,
                "start_time": now_dt.isoformat(),
                "files": [], # 파일 정보는 stop_recording 시점에 채워짐
                "status": "recording",
                "export_path": base_dir,  # 실제 사용된 경로 저장
                "data_format": data_format or "JSON"  # 데이터 포맷 저장
            }
            # 초기 meta.json은 파일 정보 없이 저장
            meta_file_path = os.path.join(self.session_dir, "meta.json")
            with open(meta_file_path, "w") as f:
                json.dump(self.meta, f, ensure_ascii=False, indent=2)
            logger.info(f"Initial meta.json saved to {meta_file_path}")
            
        except Exception as e:
            logger.error(f"Error during start_recording directory/meta.json creation: {e}", exc_info=True)
            return {"status": "fail", "message": f"Failed to initialize session: {e}"}

        self.is_recording = True
        # self.thread = threading.Thread(target=self._recording_loop, daemon=True) # 스레드 제거
        # self.thread.start() # 스레드 제거
        logger.info(f"Recording started: {self.meta['session_name']}")
        return {
            "status": "started", 
            "message": "Recording started successfully",
            "session_name": self.meta["session_name"], 
            "start_time": self.meta["start_time"],
            "data_format": self.meta["data_format"],
            "export_path": base_dir
        }

    def stop_recording(self) -> Dict[str, Any]:
        logger.info(f"Stop recording called for session: {self.meta.get('session_name')}")
        if not self.is_recording:
            logger.warning("Stop recording called but not currently recording.")
            return {"status": "fail", "message": "No recording is in progress."}
        
        self.is_recording = False
        # logger.info(f"is_recording set to False. Waiting for recording thread to join... Queue size: {self.data_queue.qsize()}") # queue 관련 로그 제거
        
        # if self.thread: # 스레드 관련 로직 제거
        #     self.thread.join(timeout=5)
        #     if self.thread.is_alive():
        #         logger.warning(f"Recording thread is still alive after 5s timeout. Queue size: {self.data_queue.qsize()}")
        #     else:
        #         logger.info(f"Recording thread finished. Queue size: {self.data_queue.qsize()}")
        # else:
        #     logger.warning("Recording thread was not found.")

        self.meta["end_time"] = datetime.now().isoformat()
        self.meta["status"] = "stopped"
        
        files_metadata = []
        total_records_saved = 0

        try:
            for data_type, samples in self.data_buffers.items():
                if not samples: # 빈 데이터 타입은 저장하지 않음
                    logger.info(f"No data for type {data_type}, skipping file save.")
                    continue
                
                # 파일 확장자를 데이터 형식에 따라 동적으로 결정
                file_extension = self._get_file_extension()
                filename = f"{data_type.replace(':', '_').replace('/', '_')}.{file_extension}" # 콜론, 슬래시 등 파일명에 부적합한 문자 처리

                file_path = os.path.join(self.session_dir, filename)
                
                # 설정된 형식에 따라 데이터 저장
                saved_file_path = self._save_data_by_format(file_path, samples)
                
                # 실제 저장된 파일 경로로 업데이트 (CSV 저장 실패 시 JSON으로 대체될 수 있음)
                if saved_file_path != file_path:
                    filename = os.path.basename(saved_file_path)
                    file_path = saved_file_path
                
                logger.info(f"Saved {len(samples)} samples of type '{data_type}' to {file_path}")
                
                file_stat = os.stat(file_path)
                files_metadata.append({
                    "type": data_type,
                    "filename": filename,
                    "path": file_path,
                    "size": file_stat.st_size,
                    "record_count": len(samples),
                    "created_at": datetime.fromtimestamp(file_stat.st_ctime).isoformat()
                })
                total_records_saved += len(samples)

            self.meta["files"] = files_metadata
            self._analyze_and_save_meta() # meta["files"]가 채워진 후 호출

            # 메타데이터도 선택된 형식에 따라 저장
            data_format = self.meta.get("data_format", "JSON").upper()
            if data_format == "CSV":
                self._save_meta_as_csv()
            else:
                self._save_meta_as_json()
            
            logger.info(f"Final metadata saved in {data_format} format. Total file types: {len(files_metadata)}. Total records: {total_records_saved}")

        except Exception as e:
            logger.error(f"Error saving buffered data or final meta.json: {e}", exc_info=True)
            return {"status": "fail_data_save", "message": f"Failed to save buffered data or final metadata: {e}", "session_name": self.meta.get("session_name"), "end_time": self.meta.get("end_time")}
        
        # remaining_items = self.data_queue.qsize() # queue 관련 로직 제거
        # if remaining_items > 0:
        #     logger.warning(f"{remaining_items} items still in data_queue after stopping recording for session {self.meta.get('session_name')}")

        self.data_buffers.clear() # 버퍼 비우기

        return {
            "status": "stopped", 
            "message": "Recording stopped successfully",
            "session_name": self.meta.get("session_name"), 
            "end_time": self.meta.get("end_time")
        }

    def add_data(self, data_type: str, data: Dict[str, Any]):
        if not isinstance(data, dict):
            logger.error(f"Data is not a dict! Type: {type(data)}, For data_type: {data_type}")
            return

        if not self.is_recording:
            return
        
        if data_type not in self.data_buffers:
            self.data_buffers[data_type] = []
        self.data_buffers[data_type].append(data)

    def _get_file_extension(self) -> str:
        """설정된 데이터 형식에 따른 파일 확장자 반환"""
        data_format = self.meta.get("data_format", "JSON").upper()
        return "csv" if data_format == "CSV" else "json"

    def _save_data_as_json(self, file_path: str, samples: List[Dict[str, Any]]) -> str:
        """JSON 형식으로 데이터 저장"""
        try:
            with open(file_path, "w", encoding='utf-8') as f:
                json.dump(samples, f, ensure_ascii=False, indent=2)
            logger.info(f"Successfully saved {len(samples)} samples as JSON to {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Error saving JSON file {file_path}: {e}", exc_info=True)
            raise

    def _save_data_as_csv(self, file_path: str, samples: List[Dict[str, Any]]) -> str:
        """CSV 형식으로 데이터 저장"""
        try:
            if not samples:
                logger.warning(f"No samples to save for CSV file {file_path}")
                return file_path
            
            # CSV 헤더 생성 - 모든 샘플의 키를 수집
            fieldnames = set()
            for sample in samples:
                if isinstance(sample, dict):
                    fieldnames.update(sample.keys())
            
            if not fieldnames:
                logger.warning(f"No valid fields found in samples for CSV file {file_path}")
                return file_path
            
            # 필드명을 정렬하여 일관성 확보 (timestamp가 있으면 첫 번째로)
            fieldnames = sorted(list(fieldnames))
            if 'timestamp' in fieldnames:
                fieldnames.remove('timestamp')
                fieldnames.insert(0, 'timestamp')
            
            with open(file_path, "w", newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                # 각 샘플을 CSV 행으로 작성
                for sample in samples:
                    if isinstance(sample, dict):
                        # 누락된 필드는 빈 문자열로 채움
                        row = {field: sample.get(field, '') for field in fieldnames}
                        writer.writerow(row)
            
            logger.info(f"Successfully saved {len(samples)} samples as CSV to {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Error saving CSV file {file_path}: {e}", exc_info=True)
            # CSV 저장 실패 시 JSON으로 대체 저장
            logger.info(f"Falling back to JSON format for {file_path}")
            json_path = file_path.replace('.csv', '.json')
            return self._save_data_as_json(json_path, samples)

    def _save_data_by_format(self, file_path: str, samples: List[Dict[str, Any]]) -> str:
        """설정된 형식에 따라 데이터 저장"""
        data_format = self.meta.get("data_format", "JSON").upper()
        
        if data_format == "CSV":
            return self._save_data_as_csv(file_path, samples)
        else:
            return self._save_data_as_json(file_path, samples)

    def _save_meta_as_json(self):
        """메타데이터를 JSON 형식으로 저장"""
        try:
            meta_file_path = os.path.join(self.session_dir, "meta.json")
            with open(meta_file_path, "w", encoding='utf-8') as f:
                json.dump(self.meta, f, ensure_ascii=False, indent=2)
            logger.info(f"Metadata saved as JSON to {meta_file_path}")
        except Exception as e:
            logger.error(f"Error saving metadata as JSON: {e}", exc_info=True)

    def _save_meta_as_csv(self):
        """메타데이터를 CSV 형식으로 저장"""
        try:
            meta_file_path = os.path.join(self.session_dir, "meta.csv")
            
            # 메타데이터를 플랫 구조로 변환
            flat_meta = self._flatten_metadata(self.meta)
            
            with open(meta_file_path, "w", newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['key', 'value'])  # 헤더
                
                for key, value in flat_meta.items():
                    writer.writerow([key, str(value)])
            
            logger.info(f"Metadata saved as CSV to {meta_file_path}")
        except Exception as e:
            logger.error(f"Error saving metadata as CSV: {e}", exc_info=True)
            # CSV 저장 실패 시 JSON으로 대체
            logger.info("Falling back to JSON format for metadata")
            self._save_meta_as_json()

    def _flatten_metadata(self, data: Dict[str, Any], parent_key: str = '', separator: str = '_') -> Dict[str, Any]:
        """중첩된 딕셔너리를 평면화"""
        items = []
        
        for key, value in data.items():
            new_key = f"{parent_key}{separator}{key}" if parent_key else key
            
            if isinstance(value, dict):
                items.extend(self._flatten_metadata(value, new_key, separator).items())
            elif isinstance(value, list):
                # 리스트는 JSON 문자열로 변환
                items.append((new_key, json.dumps(value, ensure_ascii=False)))
            else:
                items.append((new_key, value))
        
        return dict(items)

    # _recording_loop 메서드 제거
    # def _recording_loop(self):
    #     logger.info(f"Recording loop started for session: {self.meta.get('session_name')}. Thread ID: {threading.get_ident()}")
    #     files_saved_in_loop = 0
    #     while self.is_recording or not self.data_queue.empty():
    #         try:
    #             data_type, data = self.data_queue.get(timeout=0.5)
    #             now_dt = datetime.now()
    #             filename = f"{data_type}_{now_dt.strftime('%Y%m%d_%H%M%S_%f')}.json"
    #             file_path = os.path.join(self.session_dir, filename)
    #             try:
    #                 with open(file_path, "w") as f:
    #                     json.dump(data, f, ensure_ascii=False, indent=2)
    #                 logger.debug(f"Saved data to {file_path}")
    #                 files_saved_in_loop += 1
    #             except FileNotFoundError:
    #                 logger.error(f"Session directory {self.session_dir} not found when trying to save {filename}. Loop will terminate.", exc_info=True)
    #                 self.is_recording = False
    #                 break
    #             except Exception as e:
    #                 logger.error(f"Error saving data to {file_path}: {e}", exc_info=True)
    #             finally:
    #                 self.data_queue.task_done()
    #         except queue.Empty:
    #             if not self.is_recording:
    #                 logger.info("Recording stopped and queue is empty. Exiting loop.")
    #             continue
    #         except Exception as e:
    #             logger.error(f"Error in recording loop (e.g., getting from queue): {e}", exc_info=True)
    #     logger.info(f"Recording loop finished for session: {self.meta.get('session_name')}. Files saved in this loop: {files_saved_in_loop}")

    def _analyze_and_save_meta(self):
        # 이 함수는 stop_recording에서 self.meta["files"]가 이미 채워진 후에 호출됨
        # 따라서 여기서 os.listdir을 다시 할 필요는 없음.
        # self.meta["files"]에 이미 각 파일에 대한 정보 (type, filename, path, size, record_count, created_at)가 있음
        logger.info(f"Analyzing session data for meta.json: {self.meta.get('session_name')}")
        
        # stats 계산은 self.meta["files"]를 기반으로 수행
        stats: Dict[str, Any] = {"total_files": len(self.meta.get("files", []))}
        type_details = {} # 각 타입별 파일명, 레코드 수 등을 저장
        total_records = 0

        for f_info in self.meta.get("files", []):
            data_type = f_info.get("type", "unknown")
            type_details[data_type] = {
                "filename": f_info.get("filename"),
                "record_count": f_info.get("record_count", 0),
                "size_bytes": f_info.get("size", 0)
            }
            total_records += f_info.get("record_count", 0)
        
        stats["type_details"] = type_details
        stats["total_records"] = total_records # 전체 레코드 수 추가
        self.meta["stats"] = stats
        logger.info(f"Session analysis complete. Stats: {stats}")

    def get_recording_status(self) -> Dict[str, Any]:
        buffered_samples_count = sum(len(samples) for samples in self.data_buffers.values())
        return {
            "is_recording": self.is_recording,
            "session_dir": self.session_dir,
            "current_session_name": self.meta.get("session_name"),
            # "queue_size": self.data_queue.qsize() # queue 제거
            "buffered_samples_count": buffered_samples_count
        } 