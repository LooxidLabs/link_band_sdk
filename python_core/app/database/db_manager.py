import sqlite3
import os
import sys
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, db_path: str = "database/data_center.db"):
        # Check if we're running in a packaged environment
        if sys.platform == 'darwin' and '/Contents/Resources/python_core' in __file__:
            # We're in a packaged macOS app, use user's home directory
            home_dir = os.path.expanduser("~")
            app_data_dir = os.path.join(home_dir, "Library", "Application Support", "Link Band SDK")
            self.db_path = os.path.join(app_data_dir, "database", "data_center.db")
        elif sys.platform == 'win32' and '\\resources\\python_core' in __file__.lower():
            # We're in a packaged Windows app, use user's AppData directory
            app_data_dir = os.path.join(os.environ.get('APPDATA', ''), "Link Band SDK")
            self.db_path = os.path.join(app_data_dir, "database", "data_center.db")
        elif sys.platform.startswith('linux') and '/resources/python_core' in __file__:
            # We're in a packaged Linux app, use user's home directory
            home_dir = os.path.expanduser("~")
            app_data_dir = os.path.join(home_dir, ".link-band-sdk")
            self.db_path = os.path.join(app_data_dir, "database", "data_center.db")
        else:
            # Development environment or unpackaged, use the provided db_path
            self.db_path = db_path
            
        self._ensure_db_directory()
        self._init_db()

    def _ensure_db_directory(self):
        db_dir = os.path.dirname(self.db_path)
        os.makedirs(db_dir, exist_ok=True)

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            file_path TEXT,
            file_size INTEGER,
            file_type TEXT,
            created_at TEXT,
            updated_at TEXT
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS export_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            export_path TEXT,
            file_count INTEGER,
            total_size INTEGER,
            export_format TEXT,
            exported_at TEXT
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_name TEXT,
            start_time TEXT,
            end_time TEXT,
            data_path TEXT,
            status TEXT,
            data_format TEXT,
            created_at TEXT
        )''')
        
        # 기존 테이블에 data_format 컬럼이 없는 경우 추가
        try:
            c.execute('ALTER TABLE sessions ADD COLUMN data_format TEXT DEFAULT "JSON"')
            logger.info("Added data_format column to sessions table")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                logger.info("data_format column already exists in sessions table")
            else:
                logger.warning(f"Error adding data_format column: {e}")
        conn.commit()
        conn.close()

    def add_file(self, filename: str, file_path: str, file_size: int, file_type: str) -> int:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        now = datetime.now().isoformat()
        c.execute('''INSERT INTO files (filename, file_path, file_size, file_type, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?)''',
                  (filename, file_path, file_size, file_type, now, now))
        file_id = c.lastrowid
        conn.commit()
        conn.close()
        return file_id

    def get_files(self, date_range: Optional[List[str]] = None, file_types: Optional[List[str]] = None, search_text: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        query = "SELECT * FROM files WHERE 1=1"
        params = []
        if date_range:
            query += " AND created_at BETWEEN ? AND ?"
            params.extend(date_range)
        if file_types:
            query += " AND file_type IN ({})".format(",".join(["?"] * len(file_types)))
            params.extend(file_types)
        if search_text:
            query += " AND filename LIKE ?"
            params.append(f"%{search_text}%")
        c.execute(query, params)
        rows = c.fetchall()
        conn.close()
        return [self._row_to_file_dict(row) for row in rows]

    def add_export_history(self, export_path: str, file_count: int, total_size: int, export_format: str) -> int:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        now = datetime.now().isoformat()
        c.execute('''INSERT INTO export_history (export_path, file_count, total_size, export_format, exported_at)
                     VALUES (?, ?, ?, ?, ?)''',
                  (export_path, file_count, total_size, export_format, now))
        export_id = c.lastrowid
        conn.commit()
        conn.close()
        return export_id

    def get_export_history(self) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT * FROM export_history ORDER BY exported_at DESC")
        rows = c.fetchall()
        conn.close()
        return [self._row_to_export_dict(row) for row in rows]

    def get_file_by_id(self, file_id: int) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT * FROM files WHERE id = ?", (file_id,))
        row = c.fetchone()
        conn.close()
        return self._row_to_file_dict(row) if row else None

    def add_session(self, session_name: str, start_time: str, end_time: str, data_path: str, status: str, data_format: str = "JSON") -> int:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        now = datetime.now().isoformat()
        c.execute('''INSERT INTO sessions (session_name, start_time, end_time, data_path, status, data_format, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                  (session_name, start_time, end_time, data_path, status, data_format, now))
        session_id = c.lastrowid
        conn.commit()
        conn.close()
        return session_id

    def update_session(self, session_id: int, end_time: str, status: str):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''UPDATE sessions SET end_time = ?, status = ? WHERE id = ?''',
                  (end_time, status, session_id))
        conn.commit()
        conn.close()

    def get_session(self, session_id: int) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = c.fetchone()
        conn.close()
        return self._row_to_session_dict(row) if row else None

    def get_sessions(self) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT * FROM sessions ORDER BY start_time DESC")
        rows = c.fetchall()
        conn.close()
        return [self._row_to_session_dict(row) for row in rows]

    def get_session_by_name(self, session_name: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT * FROM sessions WHERE session_name = ?", (session_name,))
        row = c.fetchone()
        conn.close()
        return self._row_to_session_dict(row) if row else None

    def _row_to_file_dict(self, row):
        if not row:
            return None
        return {
            "id": row[0],
            "filename": row[1],
            "file_path": row[2],
            "file_size": row[3],
            "file_type": row[4],
            "created_at": row[5],
            "updated_at": row[6],
        }

    def _row_to_export_dict(self, row):
        if not row:
            return None
        return {
            "id": row[0],
            "export_path": row[1],
            "file_count": row[2],
            "total_size": row[3],
            "export_format": row[4],
            "exported_at": row[5],
        }

    def close(self):
        """데이터베이스 연결 종료 (SQLite는 연결을 유지하지 않으므로 실제로는 아무것도 하지 않음)"""
        # SQLite는 각 쿼리마다 연결을 열고 닫으므로 특별히 할 일이 없음
        pass

    def _row_to_session_dict(self, row):
        if not row:
            return None
            
        session_dict = {
            "session_id": row[0],  # id를 session_id로 변경
            "session_name": row[1],
            "start_time": row[2],
            "end_time": row[3],
            "data_path": row[4],
            "status": row[5],
            "created_at": row[6],  # created_at는 인덱스 6
            "data_format": row[7] if len(row) > 7 else "JSON",  # data_format는 인덱스 7
        }
        
        # 세션 폴더의 파일 크기와 개수 계산
        try:
            import os
            data_path = row[4]  # data_path
            print(f"[DB] Calculating file size for session {row[0]}, path: {data_path}")
            
            if data_path and os.path.exists(data_path):
                total_size = 0
                file_count = 0
                
                # 절대 경로로 변환
                if not os.path.isabs(data_path):
                    # 상대 경로인 경우 현재 작업 디렉토리 기준으로 절대 경로 생성
                    data_path = os.path.abspath(data_path)
                    print(f"[DB] Converted to absolute path: {data_path}")
                
                if os.path.exists(data_path):
                    for root, dirs, files in os.walk(data_path):
                        for file in files:
                            try:
                                file_path = os.path.join(root, file)
                                if os.path.exists(file_path) and os.path.isfile(file_path):
                                    file_size = os.path.getsize(file_path)
                                    total_size += file_size
                                    file_count += 1
                                    print(f"[DB] File: {file}, Size: {file_size} bytes")
                            except (OSError, IOError) as e:
                                print(f"[DB] Error accessing file {file}: {e}")
                                continue
                    
                    print(f"[DB] Total size: {total_size} bytes, File count: {file_count}")
                    session_dict["total_size"] = total_size
                    session_dict["file_count"] = file_count
                else:
                    print(f"[DB] Path does not exist after conversion: {data_path}")
                    session_dict["total_size"] = 0
                    session_dict["file_count"] = 0
            else:
                print(f"[DB] Path is None or does not exist: {data_path}")
                session_dict["total_size"] = 0
                session_dict["file_count"] = 0
        except Exception as e:
            # 파일 크기 계산 실패 시 기본값 설정
            print(f"[DB] Error calculating file size: {e}")
            session_dict["total_size"] = 0
            session_dict["file_count"] = 0
            
        return session_dict 