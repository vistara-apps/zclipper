#!/usr/bin/env python3
"""
ZClipper Supabase Integration
Connects zclipper to the existing Phyght platform for scalable storage
"""

import os
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
import logging
import aiohttp
import aiofiles

logger = logging.getLogger(__name__)

class SupabaseClipManager:
    """Manages clip uploads to Supabase storage"""
    
    def __init__(self):
        # Supabase configuration from existing Phyght platform
        self.supabase_url = os.getenv('VITE_SUPABASE_URL', 'https://your-project.supabase.co')
        self.supabase_key = os.getenv('VITE_SUPABASE_ANON_KEY', 'your_key_here')
        self.service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'your_service_key')
        
        # Storage bucket for clips
        self.clips_bucket = 'video-clips'
        self.thumbnails_bucket = 'thumbnails'
        
        # API endpoints
        self.storage_url = f"{self.supabase_url}/storage/v1/object"
        self.rest_url = f"{self.supabase_url}/rest/v1"
        
        logger.info("SupabaseClipManager initialized")
    
    async def upload_clip_to_storage(self, clip_path: Path, user_id: str, session_id: str) -> Dict[str, Any]:
        """Upload clip to Supabase storage"""
        try:
            # Generate storage path
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            storage_path = f"users/{user_id}/sessions/{session_id}/{timestamp}_{clip_path.name}"
            
            headers = {
                'Authorization': f'Bearer {self.service_role_key}',
                'Content-Type': 'video/mp4'
            }
            
            # Upload video file
            async with aiohttp.ClientSession() as session:
                async with aiofiles.open(clip_path, 'rb') as file:
                    file_data = await file.read()
                
                upload_url = f"{self.storage_url}/{self.clips_bucket}/{storage_path}"
                
                async with session.post(upload_url, data=file_data, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Get public URL
                        public_url = f"{self.supabase_url}/storage/v1/object/public/{self.clips_bucket}/{storage_path}"
                        
                        logger.info(f"Clip uploaded successfully: {public_url}")
                        
                        return {
                            'success': True,
                            'storage_path': storage_path,
                            'public_url': public_url,
                            'size_bytes': len(file_data)
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"Upload failed: {response.status} - {error_text}")
                        return {'success': False, 'error': error_text}
                        
        except Exception as e:
            logger.error(f"Upload error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def upload_thumbnail_to_storage(self, thumbnail_path: Path, storage_path: str) -> Optional[str]:
        """Upload thumbnail to Supabase storage"""
        try:
            # Generate thumbnail storage path
            thumb_storage_path = storage_path.replace('.mp4', '_thumb.jpg').replace('video-clips/', 'thumbnails/')
            
            headers = {
                'Authorization': f'Bearer {self.service_role_key}',
                'Content-Type': 'image/jpeg'
            }
            
            async with aiohttp.ClientSession() as session:
                async with aiofiles.open(thumbnail_path, 'rb') as file:
                    file_data = await file.read()
                
                upload_url = f"{self.storage_url}/{self.thumbnails_bucket}/{thumb_storage_path}"
                
                async with session.post(upload_url, data=file_data, headers=headers) as response:
                    if response.status == 200:
                        public_url = f"{self.supabase_url}/storage/v1/object/public/{self.thumbnails_bucket}/{thumb_storage_path}"
                        logger.info(f"Thumbnail uploaded: {public_url}")
                        return public_url
                    else:
                        logger.error(f"Thumbnail upload failed: {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Thumbnail upload error: {e}")
            return None
    
    async def create_video_record(self, clip_data: Dict[str, Any], user_id: str) -> Optional[str]:
        """Create video record in Supabase database"""
        try:
            headers = {
                'Authorization': f'Bearer {self.service_role_key}',
                'Content-Type': 'application/json',
                'apikey': self.supabase_key
            }
            
            # Prepare video data for Phyght platform
            video_record = {
                'title': f"Explosive Moment - {clip_data.get('channel', 'Unknown')}",
                'description': f"Auto-generated explosive moment with {clip_data.get('chat_velocity', 0)} msgs/sec",
                'video_url': clip_data['public_url'],
                'thumbnail_url': clip_data.get('thumbnail_url', ''),
                'duration': clip_data.get('duration', 0),
                'file_size': clip_data.get('size_bytes', 0),
                'user_id': user_id,
                'category': 'explosive-moments',
                'tags': ['explosive', 'moments', 'zclipper', 'auto-generated'],
                'metadata': {
                    'source': 'zclipper',
                    'session_id': clip_data.get('session_id'),
                    'channel': clip_data.get('channel'),
                    'chat_velocity': clip_data.get('chat_velocity', 0),
                    'viral_score': clip_data.get('viral_score', 0),
                    'viral_messages': clip_data.get('viral_messages', []),
                    'created_by': 'zclipper-ai'
                },
                'is_public': True,
                'created_at': datetime.now().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                create_url = f"{self.rest_url}/videos"
                
                async with session.post(create_url, json=video_record, headers=headers) as response:
                    if response.status in [200, 201]:
                        result = await response.json()
                        video_id = result[0]['id'] if isinstance(result, list) else result['id']
                        logger.info(f"Video record created: {video_id}")
                        return video_id
                    else:
                        error_text = await response.text()
                        logger.error(f"Database insert failed: {response.status} - {error_text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Database error: {e}")
            return None
    
    async def process_clip_for_platform(self, clip_path: Path, thumbnail_path: Path, 
                                      clip_data: Dict[str, Any], user_id: str, session_id: str) -> Dict[str, Any]:
        """Complete pipeline: upload clip + thumbnail + create database record"""
        try:
            # Step 1: Upload video clip
            upload_result = await self.upload_clip_to_storage(clip_path, user_id, session_id)
            
            if not upload_result['success']:
                return {'success': False, 'error': 'Video upload failed'}
            
            # Step 2: Upload thumbnail
            thumbnail_url = None
            if thumbnail_path and thumbnail_path.exists():
                thumbnail_url = await self.upload_thumbnail_to_storage(thumbnail_path, upload_result['storage_path'])
            
            # Step 3: Create database record
            enhanced_clip_data = {
                **clip_data,
                'public_url': upload_result['public_url'],
                'storage_path': upload_result['storage_path'],
                'size_bytes': upload_result['size_bytes'],
                'thumbnail_url': thumbnail_url,
                'session_id': session_id
            }
            
            video_id = await self.create_video_record(enhanced_clip_data, user_id)
            
            if video_id:
                logger.info(f"✅ Clip successfully processed for platform: video_id={video_id}")
                return {
                    'success': True,
                    'video_id': video_id,
                    'public_url': upload_result['public_url'],
                    'thumbnail_url': thumbnail_url,
                    'storage_path': upload_result['storage_path']
                }
            else:
                return {'success': False, 'error': 'Database record creation failed'}
                
        except Exception as e:
            logger.error(f"Complete pipeline error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_clips(self, user_id: str, limit: int = 20) -> list:
        """Get user's clips from the platform"""
        try:
            headers = {
                'Authorization': f'Bearer {self.service_role_key}',
                'apikey': self.supabase_key
            }
            
            async with aiohttp.ClientSession() as session:
                query_url = f"{self.rest_url}/videos?user_id=eq.{user_id}&limit={limit}&order=created_at.desc"
                
                async with session.get(query_url, headers=headers) as response:
                    if response.status == 200:
                        clips = await response.json()
                        return clips
                    else:
                        logger.error(f"Failed to fetch clips: {response.status}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error fetching clips: {e}")
            return []
    
    async def increment_views(self, video_id: str):
        """Increment view count for a video"""
        try:
            headers = {
                'Authorization': f'Bearer {self.service_role_key}',
                'Content-Type': 'application/json',
                'apikey': self.supabase_key
            }
            
            async with aiohttp.ClientSession() as session:
                update_url = f"{self.rest_url}/videos?id=eq.{video_id}"
                
                # Use RPC for atomic increment
                rpc_url = f"{self.rest_url}/rpc/increment_video_views"
                payload = {'video_id': video_id}
                
                async with session.post(rpc_url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        logger.info(f"Views incremented for video {video_id}")
                    else:
                        logger.error(f"Failed to increment views: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error incrementing views: {e}")

# Global instance
supabase_manager = SupabaseClipManager()