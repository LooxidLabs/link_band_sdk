import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

class DatabaseManager:
    def __init__(self, db_path: str = "database/data_center.db"):
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
            created_at TEXT
        )''')
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

    def add_session(self, session_name: str, start_time: str, end_time: str, data_path: str, status: str) -> int:
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        now = datetime.now().isoformat()
        c.execute('''INSERT INTO sessions (session_name, start_time, end_time, data_path, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?)''',
                  (session_name, start_time, end_time, data_path, status, now))
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

    def _row_to_session_dict(self, row):
        if not row:
            return None
        return {
            "id": row[0],
            "session_name": row[1],
            "start_time": row[2],
            "end_time": row[3],
            "data_path": row[4],
            "status": row[5],
            "created_at": row[6],
        } 