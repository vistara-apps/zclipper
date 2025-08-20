#!/usr/bin/env python3
"""
Supabase Database Implementation for ZClipper
Provides database operations using Supabase PostgreSQL
"""

import os
import json
import uuid
import logging
import asyncio
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import redis
from supabase import create_client, Client
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class SupabaseDatabase:
    """Supabase database implementation for ZClipper"""
    
    def __init__(self):
        """Initialize Supabase client and Redis cache"""
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            logger.warning("Supabase credentials not found in environment variables")
            self.supabase_url = "https://your-project.supabase.co"
            self.supabase_key = "your-anon-key"
        
        # Initialize Supabase client
        self.supabase = create_client(self.supabase_url, self.supabase_key)
        
        # Initialize Redis cache if available
        redis_url = os.getenv("REDIS_URL")
        self.cache_enabled = bool(redis_url)
        if self.cache_enabled:
            try:
                self.redis = redis.from_url(redis_url)
                logger.info("Redis cache initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Redis cache: {e}")
                self.cache_enabled = False
        
        logger.info(f"Supabase database initialized with cache {'enabled' if self.cache_enabled else 'disabled'}")
    
    # User operations
    
    async def create_user(self, username: str, email: str = None) -> str:
        """Create a new user in the database"""
        try:
            user_id = str(uuid.uuid4())
            
            # Check if username already exists
            response = self.supabase.table('users').select('user_id').eq('username', username).execute()
            if response.data and len(response.data) > 0:
                logger.warning(f"Username {username} already exists")
                return None
            
            # Create user record
            user_data = {
                'user_id': user_id,
                'username': username,
                'email': email,
                'plan': 'free',
                'clips_generated': 0,
                'total_revenue': 0.0,
                'created_at': datetime.now().isoformat()
            }
            
            response = self.supabase.table('users').insert(user_data).execute()
            
            if not response.data or len(response.data) == 0:
                logger.error("Failed to create user in Supabase")
                return None
            
            logger.info(f"Created user {username} with ID {user_id}")
            return user_id
        
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return None
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data by ID"""
        try:
            # Check cache first
            if self.cache_enabled:
                cached_user = self.redis.get(f"user:{user_id}")
                if cached_user:
                    return json.loads(cached_user)
            
            # Query database
            response = self.supabase.table('users').select('*').eq('user_id', user_id).execute()
            
            if not response.data or len(response.data) == 0:
                logger.warning(f"User {user_id} not found")
                return None
            
            user_data = response.data[0]
            
            # Cache result
            if self.cache_enabled:
                self.redis.setex(
                    f"user:{user_id}",
                    300,  # Cache for 5 minutes
                    json.dumps(user_data)
                )
            
            return user_data
        
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None
    
    async def update_user(self, user_id: str, **kwargs) -> bool:
        """Update user data"""
        try:
            # Validate user exists
            user = await self.get_user(user_id)
            if not user:
                logger.warning(f"Cannot update non-existent user {user_id}")
                return False
            
            # Update user record
            update_data = {k: v for k, v in kwargs.items() if k in [
                'username', 'email', 'plan', 'clips_generated', 'total_revenue'
            ]}
            
            if not update_data:
                logger.warning("No valid fields to update")
                return False
            
            response = self.supabase.table('users').update(update_data).eq('user_id', user_id).execute()
            
            if not response.data or len(response.data) == 0:
                logger.error(f"Failed to update user {user_id}")
                return False
            
            # Invalidate cache
            if self.cache_enabled:
                self.redis.delete(f"user:{user_id}")
            
            logger.info(f"Updated user {user_id}")
            return True
        
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return False
    
    async def create_token(self, user_id: str) -> str:
        """Create an authentication token for a user"""
        try:
            # Validate user exists
            user = await self.get_user(user_id)
            if not user:
                logger.warning(f"Cannot create token for non-existent user {user_id}")
                return None
            
            # Create token
            token = str(uuid.uuid4())
            expires_at = (datetime.now() + timedelta(days=30)).isoformat()
            
            token_data = {
                'token': token,
                'user_id': user_id,
                'expires_at': expires_at,
                'created_at': datetime.now().isoformat()
            }
            
            response = self.supabase.table('user_tokens').insert(token_data).execute()
            
            if not response.data or len(response.data) == 0:
                logger.error(f"Failed to create token for user {user_id}")
                return None
            
            logger.info(f"Created token for user {user_id}")
            return token
        
        except Exception as e:
            logger.error(f"Error creating token: {e}")
            return None
    
    async def verify_token(self, token: str) -> Optional[str]:
        """Verify an authentication token and return the user ID"""
        try:
            # Check cache first
            if self.cache_enabled:
                cached_user_id = self.redis.get(f"token:{token}")
                if cached_user_id:
                    return cached_user_id.decode('utf-8')
            
            # Query database
            response = self.supabase.table('user_tokens').select('user_id', 'expires_at').eq('token', token).execute()
            
            if not response.data or len(response.data) == 0:
                logger.warning(f"Token {token} not found")
                return None
            
            token_data = response.data[0]
            
            # Check if token is expired
            expires_at = datetime.fromisoformat(token_data['expires_at'].replace('Z', '+00:00'))
            if expires_at < datetime.now():
                logger.warning(f"Token {token} is expired")
                return None
            
            user_id = token_data['user_id']
            
            # Cache result
            if self.cache_enabled:
                self.redis.setex(
                    f"token:{token}",
                    3600,  # Cache for 1 hour
                    user_id
                )
            
            return user_id
        
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None
    
    # Session operations
    
    async def create_session(self, user_id: str, channel: str) -> str:
        """Create a new session"""
        try:
            # Validate user exists
            user = await self.get_user(user_id)
            if not user:
                logger.warning(f"Cannot create session for non-existent user {user_id}")
                return None
            
            session_id = str(uuid.uuid4())
            
            # Create session record
            session_data = {
                'session_id': session_id,
                'user_id': user_id,
                'channel': channel,
                'status': 'active',
                'chat_speed': 0,
                'viral_score': 0.0,
                'clips_generated': 0,
                'revenue': 0.0,
                'created_at': datetime.now().isoformat(),
                'last_updated': datetime.now().isoformat()
            }
            
            response = self.supabase.table('sessions').insert(session_data).execute()
            
            if not response.data or len(response.data) == 0:
                logger.error(f"Failed to create session for user {user_id}")
                return None
            
            logger.info(f"Created session {session_id} for user {user_id}")
            return session_id
        
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            return None
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data by ID"""
        try:
            # Check cache first
            if self.cache_enabled:
                cached_session = self.redis.get(f"session:{session_id}")
                if cached_session:
                    return json.loads(cached_session)
            
            # Query database
            response = self.supabase.table('sessions').select('*').eq('session_id', session_id).execute()
            
            if not response.data or len(response.data) == 0:
                logger.warning(f"Session {session_id} not found")
                return None
            
            session_data = response.data[0]
            
            # Cache result
            if self.cache_enabled:
                self.redis.setex(
                    f"session:{session_id}",
                    60,  # Cache for 1 minute
                    json.dumps(session_data)
                )
            
            return session_data
        
        except Exception as e:
            logger.error(f"Error getting session: {e}")
            return None
    
    async def update_session(self, session_id: str, **kwargs) -> bool:
        """Update session data"""
        try:
            # Validate session exists
            session = await self.get_session(session_id)
            if not session:
                logger.warning(f"Cannot update non-existent session {session_id}")
                return False
            
            # Update session record
            update_data = {k: v for k, v in kwargs.items() if k in [
                'status', 'chat_speed', 'viral_score', 'clips_generated', 'revenue'
            ]}
            
            if not update_data:
                logger.warning("No valid fields to update")
                return False
            
            # Add last_updated timestamp
            update_data['last_updated'] = datetime.now().isoformat()
            
            response = self.supabase.table('sessions').update(update_data).eq('session_id', session_id).execute()
            
            if not response.data or len(response.data) == 0:
                logger.error(f"Failed to update session {session_id}")
                return False
            
            # Invalidate cache
            if self.cache_enabled:
                self.redis.delete(f"session:{session_id}")
            
            logger.info(f"Updated session {session_id}")
            return True
        
        except Exception as e:
            logger.error(f"Error updating session: {e}")
            return False
    
    async def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all sessions for a user"""
        try:
            # Query database
            response = self.supabase.table('sessions').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            
            if not response.data:
                return []
            
            return response.data
        
        except Exception as e:
            logger.error(f"Error getting user sessions: {e}")
            return []
    
    # Clip operations
    
    async def create_clip(self, session_id: str, user_id: str, clip_data: Dict[str, Any]) -> str:
        """Create a new clip"""
        try:
            # Validate session exists
            session = await self.get_session(session_id)
            if not session:
                logger.warning(f"Cannot create clip for non-existent session {session_id}")
                return None
            
            clip_id = str(uuid.uuid4())
            
            # Create clip record
            db_clip_data = {
                'clip_id': clip_id,
                'session_id': session_id,
                'user_id': user_id,
                'filename': clip_data.get('filename'),
                'duration': clip_data.get('duration', 0),
                'size_mb': clip_data.get('size_mb', 0),
                'viral_score': clip_data.get('viral_score', 0),
                'chat_velocity': clip_data.get('chat_velocity', 0),
                'revenue': clip_data.get('revenue', 0),
                'viral_messages': json.dumps(clip_data.get('viral_messages', [])),
                'thumbnail_url': clip_data.get('thumbnail_url'),
                'ai_enhanced': clip_data.get('ai_enhanced', False),
                'web3_title': clip_data.get('web3_title'),
                'web3_hashtags': json.dumps(clip_data.get('web3_hashtags', [])),
                'community_targets': json.dumps(clip_data.get('community_targets', [])),
                'distribution_strategy': json.dumps(clip_data.get('distribution_strategy', {})),
                'created_at': datetime.now().isoformat()
            }
            
            response = self.supabase.table('clips').insert(db_clip_data).execute()
            
            if not response.data or len(response.data) == 0:
                logger.error(f"Failed to create clip for session {session_id}")
                return None
            
            # Update session stats
            await self.update_session(
                session_id,
                clips_generated=session['clips_generated'] + 1,
                revenue=session['revenue'] + clip_data.get('revenue', 0)
            )
            
            # Update user stats
            await self.update_user(
                user_id,
                clips_generated=session['clips_generated'] + 1,
                total_revenue=session['revenue'] + clip_data.get('revenue', 0)
            )
            
            logger.info(f"Created clip {clip_id} for session {session_id}")
            return clip_id
        
        except Exception as e:
            logger.error(f"Error creating clip: {e}")
            return None
    
    async def get_clip(self, clip_id: str) -> Optional[Dict[str, Any]]:
        """Get clip data by ID"""
        try:
            # Check cache first
            if self.cache_enabled:
                cached_clip = self.redis.get(f"clip:{clip_id}")
                if cached_clip:
                    return json.loads(cached_clip)
            
            # Query database
            response = self.supabase.table('clips').select('*').eq('clip_id', clip_id).execute()
            
            if not response.data or len(response.data) == 0:
                logger.warning(f"Clip {clip_id} not found")
                return None
            
            clip_data = response.data[0]
            
            # Parse JSON fields
            for field in ['viral_messages', 'web3_hashtags', 'community_targets', 'distribution_strategy']:
                if clip_data.get(field) and isinstance(clip_data[field], str):
                    try:
                        clip_data[field] = json.loads(clip_data[field])
                    except:
                        clip_data[field] = []
            
            # Cache result
            if self.cache_enabled:
                self.redis.setex(
                    f"clip:{clip_id}",
                    300,  # Cache for 5 minutes
                    json.dumps(clip_data)
                )
            
            return clip_data
        
        except Exception as e:
            logger.error(f"Error getting clip: {e}")
            return None
    
    async def get_session_clips(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all clips for a session"""
        try:
            # Query database
            response = self.supabase.table('clips').select('*').eq('session_id', session_id).order('created_at', desc=True).execute()
            
            if not response.data:
                return []
            
            clips = response.data
            
            # Parse JSON fields
            for clip in clips:
                for field in ['viral_messages', 'web3_hashtags', 'community_targets', 'distribution_strategy']:
                    if clip.get(field) and isinstance(clip[field], str):
                        try:
                            clip[field] = json.loads(clip[field])
                        except:
                            clip[field] = []
            
            return clips
        
        except Exception as e:
            logger.error(f"Error getting session clips: {e}")
            return []
    
    async def get_user_clips(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all clips for a user"""
        try:
            # Query database
            response = self.supabase.table('clips').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            
            if not response.data:
                return []
            
            clips = response.data
            
            # Parse JSON fields
            for clip in clips:
                for field in ['viral_messages', 'web3_hashtags', 'community_targets', 'distribution_strategy']:
                    if clip.get(field) and isinstance(clip[field], str):
                        try:
                            clip[field] = json.loads(clip[field])
                        except:
                            clip[field] = []
            
            return clips
        
        except Exception as e:
            logger.error(f"Error getting user clips: {e}")
            return []
    
    # Subscription operations
    
    async def create_subscription(self, user_id: str, plan: str, payment_id: str = None) -> str:
        """Create a new subscription"""
        try:
            # Validate user exists
            user = await self.get_user(user_id)
            if not user:
                logger.warning(f"Cannot create subscription for non-existent user {user_id}")
                return None
            
            subscription_id = str(uuid.uuid4())
            
            # Create subscription record
            subscription_data = {
                'subscription_id': subscription_id,
                'user_id': user_id,
                'plan': plan,
                'status': 'active',
                'payment_id': payment_id,
                'created_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(days=30)).isoformat()
            }
            
            response = self.supabase.table('subscriptions').insert(subscription_data).execute()
            
            if not response.data or len(response.data) == 0:
                logger.error(f"Failed to create subscription for user {user_id}")
                return None
            
            # Update user plan
            await self.update_user(user_id, plan=plan)
            
            logger.info(f"Created subscription {subscription_id} for user {user_id}")
            return subscription_id
        
        except Exception as e:
            logger.error(f"Error creating subscription: {e}")
            return None
    
    async def get_user_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get active subscription for a user"""
        try:
            # Query database
            response = self.supabase.table('subscriptions').select('*').eq('user_id', user_id).eq('status', 'active').execute()
            
            if not response.data or len(response.data) == 0:
                return None
            
            return response.data[0]
        
        except Exception as e:
            logger.error(f"Error getting user subscription: {e}")
            return None
    
    async def cancel_subscription(self, subscription_id: str) -> bool:
        """Cancel a subscription"""
        try:
            # Update subscription record
            response = self.supabase.table('subscriptions').update({'status': 'cancelled'}).eq('subscription_id', subscription_id).execute()
            
            if not response.data or len(response.data) == 0:
                logger.error(f"Failed to cancel subscription {subscription_id}")
                return False
            
            logger.info(f"Cancelled subscription {subscription_id}")
            return True
        
        except Exception as e:
            logger.error(f"Error cancelling subscription: {e}")
            return False

# Initialize database
supabase_db = SupabaseDatabase()

