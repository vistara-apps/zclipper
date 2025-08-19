#!/usr/bin/env python3
"""
ZClipper Database Manager
SQLite-based storage for scalable user management
"""

import sqlite3
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path: str = "./zclipper.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE NOT NULL,
                    username TEXT NOT NULL,
                    email TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    plan TEXT DEFAULT 'free',
                    clips_generated INTEGER DEFAULT 0,
                    total_revenue REAL DEFAULT 0.0
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    user_id TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    chat_speed INTEGER DEFAULT 0,
                    viral_score REAL DEFAULT 0.0,
                    clips_generated INTEGER DEFAULT 0,
                    revenue REAL DEFAULT 0.0,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS clips (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    clip_id TEXT UNIQUE NOT NULL,
                    session_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    duration REAL DEFAULT 0.0,
                    size_mb REAL DEFAULT 0.0,
                    viral_score REAL DEFAULT 0.0,
                    chat_velocity INTEGER DEFAULT 0,
                    revenue REAL DEFAULT 0.0,
                    viral_messages TEXT,
                    thumbnail_url TEXT,
                    download_count INTEGER DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users (user_id),
                    FOREIGN KEY (session_id) REFERENCES sessions (session_id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)
            
            conn.commit()
            logger.info("Database initialized successfully")
    
    def create_user(self, username: str, email: str = None) -> str:
        """Create a new user and return user_id"""
        user_id = str(uuid.uuid4())
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO users (user_id, username, email)
                VALUES (?, ?, ?)
            """, (user_id, username, email))
            conn.commit()
        
        logger.info(f"Created user: {username} ({user_id})")
        return user_id
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by user_id"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM users WHERE user_id = ?
            """, (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def create_token(self, user_id: str, expires_hours: int = 24) -> str:
        """Create auth token for user"""
        token = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(hours=expires_hours)
        
        with sqlite3.connect(self.db_path) as conn:
            # Clean old tokens
            conn.execute("""
                DELETE FROM user_tokens 
                WHERE user_id = ? AND expires_at < CURRENT_TIMESTAMP
            """, (user_id,))
            
            # Create new token
            conn.execute("""
                INSERT INTO user_tokens (user_id, token, expires_at)
                VALUES (?, ?, ?)
            """, (user_id, token, expires_at))
            conn.commit()
        
        return token
    
    def verify_token(self, token: str) -> Optional[str]:
        """Verify token and return user_id if valid"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT user_id FROM user_tokens 
                WHERE token = ? AND expires_at > CURRENT_TIMESTAMP
            """, (token,))
            row = cursor.fetchone()
            return row[0] if row else None
    
    def create_session(self, user_id: str, channel: str) -> str:
        """Create monitoring session"""
        session_id = str(uuid.uuid4())
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO sessions (session_id, user_id, channel)
                VALUES (?, ?, ?)
            """, (session_id, user_id, channel))
            conn.commit()
        
        return session_id
    
    def update_session(self, session_id: str, **kwargs):
        """Update session data"""
        if not kwargs:
            return
        
        set_clause = ", ".join([f"{key} = ?" for key in kwargs.keys()])
        values = list(kwargs.values()) + [session_id]
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(f"""
                UPDATE sessions 
                SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                WHERE session_id = ?
            """, values)
            conn.commit()
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session by session_id"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT s.*, u.username 
                FROM sessions s 
                JOIN users u ON s.user_id = u.user_id 
                WHERE s.session_id = ?
            """, (session_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all sessions for user"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM sessions 
                WHERE user_id = ? 
                ORDER BY created_at DESC
            """, (user_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    def create_clip(self, session_id: str, user_id: str, clip_data: Dict[str, Any]) -> str:
        """Create clip record"""
        clip_id = str(uuid.uuid4())
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO clips (
                    clip_id, session_id, user_id, filename, duration, size_mb,
                    viral_score, chat_velocity, revenue, viral_messages, thumbnail_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                clip_id, session_id, user_id,
                clip_data.get('filename', ''),
                clip_data.get('duration', 0),
                clip_data.get('size_mb', 0),
                clip_data.get('viral_score', 0),
                clip_data.get('chat_velocity', 0),
                clip_data.get('revenue', 0),
                json.dumps(clip_data.get('viral_messages', [])),
                clip_data.get('thumbnail_url', '')
            ))
            
            # Update session clip count
            conn.execute("""
                UPDATE sessions 
                SET clips_generated = clips_generated + 1,
                    revenue = revenue + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE session_id = ?
            """, (clip_data.get('revenue', 0), session_id))
            
            # Update user totals
            conn.execute("""
                UPDATE users 
                SET clips_generated = clips_generated + 1,
                    total_revenue = total_revenue + ?
                WHERE user_id = ?
            """, (clip_data.get('revenue', 0), user_id))
            
            conn.commit()
        
        return clip_id
    
    def get_user_clips(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get clips for user"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT c.*, s.channel 
                FROM clips c 
                JOIN sessions s ON c.session_id = s.session_id 
                WHERE c.user_id = ? 
                ORDER BY c.created_at DESC 
                LIMIT ?
            """, (user_id, limit))
            
            clips = []
            for row in cursor.fetchall():
                clip = dict(row)
                # Parse viral_messages JSON
                if clip['viral_messages']:
                    clip['viral_messages'] = json.loads(clip['viral_messages'])
                clips.append(clip)
            
            return clips
    
    def get_session_clips(self, session_id: str) -> List[Dict[str, Any]]:
        """Get clips for specific session"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM clips 
                WHERE session_id = ? 
                ORDER BY created_at DESC
            """, (session_id,))
            
            clips = []
            for row in cursor.fetchall():
                clip = dict(row)
                if clip['viral_messages']:
                    clip['viral_messages'] = json.loads(clip['viral_messages'])
                clips.append(clip)
            
            return clips
    
    def increment_download(self, clip_id: str):
        """Increment clip download count"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE clips 
                SET download_count = download_count + 1 
                WHERE clip_id = ?
            """, (clip_id,))
            conn.commit()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get platform statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT 
                    COUNT(DISTINCT user_id) as total_users,
                    COUNT(DISTINCT session_id) as total_sessions,
                    COUNT(*) as total_clips,
                    SUM(revenue) as total_revenue,
                    SUM(download_count) as total_downloads
                FROM clips
            """)
            row = cursor.fetchone()
            
            return {
                'total_users': row[0] or 0,
                'total_sessions': row[1] or 0,
                'total_clips': row[2] or 0,
                'total_revenue': row[3] or 0.0,
                'total_downloads': row[4] or 0
            }

# Global database instance
db = Database()