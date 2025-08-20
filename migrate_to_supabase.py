#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to Supabase
"""

import os
import json
import sqlite3
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
from supabase_database import supabase_db
from database import db as sqlite_db

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class DataMigrator:
    """Handles migration of data from SQLite to Supabase"""
    
    def __init__(self):
        """Initialize the migrator"""
        self.sqlite_db = sqlite_db
        self.supabase_db = supabase_db
        
        # Statistics
        self.stats = {
            'users_migrated': 0,
            'users_failed': 0,
            'sessions_migrated': 0,
            'sessions_failed': 0,
            'clips_migrated': 0,
            'clips_failed': 0,
            'tokens_migrated': 0,
            'tokens_failed': 0
        }
    
    async def migrate_users(self):
        """Migrate users from SQLite to Supabase"""
        logger.info("Starting user migration...")
        
        try:
            # Get all users from SQLite
            with self.sqlite_db.db_path as conn:
                cursor = conn.execute("SELECT * FROM users")
                users = cursor.fetchall()
                
                # Get column names
                columns = [description[0] for description in cursor.description]
                
                # Convert to list of dictionaries
                users = [dict(zip(columns, user)) for user in users]
            
            logger.info(f"Found {len(users)} users to migrate")
            
            # Migrate each user
            for user in users:
                try:
                    # Check if user already exists in Supabase
                    existing_user = await self.supabase_db.get_user(user['user_id'])
                    
                    if existing_user:
                        logger.info(f"User {user['username']} already exists in Supabase, skipping")
                        self.stats['users_migrated'] += 1
                        continue
                    
                    # Insert user into Supabase
                    response = self.supabase_db.supabase.table('users').insert({
                        'user_id': user['user_id'],
                        'username': user['username'],
                        'email': user['email'],
                        'plan': user['plan'],
                        'clips_generated': user['clips_generated'],
                        'total_revenue': user['total_revenue'],
                        'created_at': datetime.now().isoformat()
                    }).execute()
                    
                    if not response.data or len(response.data) == 0:
                        logger.error(f"Failed to migrate user {user['username']}")
                        self.stats['users_failed'] += 1
                    else:
                        logger.info(f"Migrated user {user['username']}")
                        self.stats['users_migrated'] += 1
                
                except Exception as e:
                    logger.error(f"Error migrating user {user.get('username', 'unknown')}: {e}")
                    self.stats['users_failed'] += 1
        
        except Exception as e:
            logger.error(f"Error in user migration: {e}")
    
    async def migrate_tokens(self):
        """Migrate user tokens from SQLite to Supabase"""
        logger.info("Starting token migration...")
        
        try:
            # Get all tokens from SQLite
            with self.sqlite_db.db_path as conn:
                cursor = conn.execute("SELECT * FROM user_tokens")
                tokens = cursor.fetchall()
                
                # Get column names
                columns = [description[0] for description in cursor.description]
                
                # Convert to list of dictionaries
                tokens = [dict(zip(columns, token)) for token in tokens]
            
            logger.info(f"Found {len(tokens)} tokens to migrate")
            
            # Migrate each token
            for token in tokens:
                try:
                    # Check if token already exists in Supabase
                    response = self.supabase_db.supabase.table('user_tokens').select('token').eq('token', token['token']).execute()
                    
                    if response.data and len(response.data) > 0:
                        logger.info(f"Token for user {token['user_id']} already exists in Supabase, skipping")
                        self.stats['tokens_migrated'] += 1
                        continue
                    
                    # Insert token into Supabase
                    response = self.supabase_db.supabase.table('user_tokens').insert({
                        'token': token['token'],
                        'user_id': token['user_id'],
                        'expires_at': token['expires_at'],
                        'created_at': token.get('created_at', datetime.now().isoformat())
                    }).execute()
                    
                    if not response.data or len(response.data) == 0:
                        logger.error(f"Failed to migrate token for user {token['user_id']}")
                        self.stats['tokens_failed'] += 1
                    else:
                        logger.info(f"Migrated token for user {token['user_id']}")
                        self.stats['tokens_migrated'] += 1
                
                except Exception as e:
                    logger.error(f"Error migrating token for user {token.get('user_id', 'unknown')}: {e}")
                    self.stats['tokens_failed'] += 1
        
        except Exception as e:
            logger.error(f"Error in token migration: {e}")
    
    async def migrate_sessions(self):
        """Migrate sessions from SQLite to Supabase"""
        logger.info("Starting session migration...")
        
        try:
            # Get all sessions from SQLite
            with self.sqlite_db.db_path as conn:
                cursor = conn.execute("SELECT * FROM sessions")
                sessions = cursor.fetchall()
                
                # Get column names
                columns = [description[0] for description in cursor.description]
                
                # Convert to list of dictionaries
                sessions = [dict(zip(columns, session)) for session in sessions]
            
            logger.info(f"Found {len(sessions)} sessions to migrate")
            
            # Migrate each session
            for session in sessions:
                try:
                    # Check if session already exists in Supabase
                    existing_session = await self.supabase_db.get_session(session['session_id'])
                    
                    if existing_session:
                        logger.info(f"Session {session['session_id']} already exists in Supabase, skipping")
                        self.stats['sessions_migrated'] += 1
                        continue
                    
                    # Insert session into Supabase
                    response = self.supabase_db.supabase.table('sessions').insert({
                        'session_id': session['session_id'],
                        'user_id': session['user_id'],
                        'channel': session['channel'],
                        'status': session['status'],
                        'chat_speed': session['chat_speed'],
                        'viral_score': session['viral_score'],
                        'clips_generated': session['clips_generated'],
                        'revenue': session['revenue'],
                        'created_at': session.get('created_at', datetime.now().isoformat()),
                        'last_updated': session.get('last_updated', datetime.now().isoformat())
                    }).execute()
                    
                    if not response.data or len(response.data) == 0:
                        logger.error(f"Failed to migrate session {session['session_id']}")
                        self.stats['sessions_failed'] += 1
                    else:
                        logger.info(f"Migrated session {session['session_id']}")
                        self.stats['sessions_migrated'] += 1
                
                except Exception as e:
                    logger.error(f"Error migrating session {session.get('session_id', 'unknown')}: {e}")
                    self.stats['sessions_failed'] += 1
        
        except Exception as e:
            logger.error(f"Error in session migration: {e}")
    
    async def migrate_clips(self):
        """Migrate clips from SQLite to Supabase"""
        logger.info("Starting clip migration...")
        
        try:
            # Get all clips from SQLite
            with self.sqlite_db.db_path as conn:
                cursor = conn.execute("SELECT * FROM clips")
                clips = cursor.fetchall()
                
                # Get column names
                columns = [description[0] for description in cursor.description]
                
                # Convert to list of dictionaries
                clips = [dict(zip(columns, clip)) for clip in clips]
            
            logger.info(f"Found {len(clips)} clips to migrate")
            
            # Migrate each clip
            for clip in clips:
                try:
                    # Check if clip already exists in Supabase
                    response = self.supabase_db.supabase.table('clips').select('clip_id').eq('clip_id', clip['clip_id']).execute()
                    
                    if response.data and len(response.data) > 0:
                        logger.info(f"Clip {clip['clip_id']} already exists in Supabase, skipping")
                        self.stats['clips_migrated'] += 1
                        continue
                    
                    # Parse JSON fields
                    viral_messages = clip.get('viral_messages', '[]')
                    if isinstance(viral_messages, str):
                        try:
                            viral_messages = json.loads(viral_messages)
                        except:
                            viral_messages = []
                    
                    web3_hashtags = clip.get('web3_hashtags', '[]')
                    if isinstance(web3_hashtags, str):
                        try:
                            web3_hashtags = json.loads(web3_hashtags)
                        except:
                            web3_hashtags = []
                    
                    community_targets = clip.get('community_targets', '[]')
                    if isinstance(community_targets, str):
                        try:
                            community_targets = json.loads(community_targets)
                        except:
                            community_targets = []
                    
                    distribution_strategy = clip.get('distribution_strategy', '{}')
                    if isinstance(distribution_strategy, str):
                        try:
                            distribution_strategy = json.loads(distribution_strategy)
                        except:
                            distribution_strategy = {}
                    
                    # Insert clip into Supabase
                    response = self.supabase_db.supabase.table('clips').insert({
                        'clip_id': clip['clip_id'],
                        'session_id': clip['session_id'],
                        'user_id': clip['user_id'],
                        'filename': clip['filename'],
                        'duration': clip.get('duration', 0),
                        'size_mb': clip.get('size_mb', 0),
                        'viral_score': clip.get('viral_score', 0),
                        'chat_velocity': clip.get('chat_velocity', 0),
                        'revenue': clip.get('revenue', 0),
                        'viral_messages': json.dumps(viral_messages),
                        'thumbnail_url': clip.get('thumbnail_url'),
                        'ai_enhanced': clip.get('ai_enhanced', False),
                        'web3_title': clip.get('web3_title'),
                        'web3_hashtags': json.dumps(web3_hashtags),
                        'community_targets': json.dumps(community_targets),
                        'distribution_strategy': json.dumps(distribution_strategy),
                        'platform_video_id': clip.get('platform_video_id'),
                        'platform_url': clip.get('platform_url'),
                        'created_at': clip.get('created_at', datetime.now().isoformat())
                    }).execute()
                    
                    if not response.data or len(response.data) == 0:
                        logger.error(f"Failed to migrate clip {clip['clip_id']}")
                        self.stats['clips_failed'] += 1
                    else:
                        logger.info(f"Migrated clip {clip['clip_id']}")
                        self.stats['clips_migrated'] += 1
                
                except Exception as e:
                    logger.error(f"Error migrating clip {clip.get('clip_id', 'unknown')}: {e}")
                    self.stats['clips_failed'] += 1
        
        except Exception as e:
            logger.error(f"Error in clip migration: {e}")
    
    async def run_migration(self):
        """Run the full migration process"""
        logger.info("Starting migration from SQLite to Supabase...")
        
        # Migrate in order of dependencies
        await self.migrate_users()
        await self.migrate_tokens()
        await self.migrate_sessions()
        await self.migrate_clips()
        
        # Print migration statistics
        logger.info("Migration completed!")
        logger.info(f"Users: {self.stats['users_migrated']} migrated, {self.stats['users_failed']} failed")
        logger.info(f"Tokens: {self.stats['tokens_migrated']} migrated, {self.stats['tokens_failed']} failed")
        logger.info(f"Sessions: {self.stats['sessions_migrated']} migrated, {self.stats['sessions_failed']} failed")
        logger.info(f"Clips: {self.stats['clips_migrated']} migrated, {self.stats['clips_failed']} failed")

async def main():
    """Main function to run the migration"""
    migrator = DataMigrator()
    await migrator.run_migration()

if __name__ == "__main__":
    asyncio.run(main())

