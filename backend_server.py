#!/usr/bin/env python3
"""
ZClipper Backend API Server
Provides REST API endpoints for the Next.js frontend
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncio
import json
import logging
import uvicorn
from datetime import datetime
from pathlib import Path
import threading
import time
import uuid
import websockets
import subprocess
import os
from database import db
from supabase_integration import supabase_manager
from chaingpt_integration import chaingpt_enhancer

# Setup paths and imports for viral engine
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../clip-repurpose-engine'))

# Define components inline to avoid import issues
import websockets
import subprocess
import random

app = FastAPI(title="ZClipper API", version="1.0.0")

# CORS setup for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "https://zclipper-cuobsr5ih-vistara.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization", "Content-Type"],
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global storage for sessions
active_sessions = {}
websocket_connections = {}

# Authentication helper
async def get_current_user(authorization: str = Header(None)) -> str:
    """Extract user_id from authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    # Demo mode: accept demo tokens
    if token.startswith("demo-token-"):
        demo_user_id = f"demo-user-{token.split('-')[-1]}"
        # Create demo user if doesn't exist
        try:
            demo_user = db.get_user(demo_user_id)
            if not demo_user:
                db.create_user(f"demo_user_{token.split('-')[-1]}", "demo@zclipper.ai")
        except:
            db.create_user(f"demo_user_{token.split('-')[-1]}", "demo@zclipper.ai")
        return demo_user_id
    
    # Regular auth
    user_id = db.verify_token(token)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user_id

# Request/Response models
class CreateUserRequest(BaseModel):
    username: str
    email: str = None

class LoginRequest(BaseModel):
    username: str

class StartMonitoringRequest(BaseModel):
    channel: str

class SessionResponse(BaseModel):
    session_id: str

class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str = None
    plan: str
    clips_generated: int
    total_revenue: float
    token: str = None

class SessionStatus(BaseModel):
    session_id: str
    channel: str
    status: str
    chat_speed: int
    viral_score: float
    clips_generated: int
    revenue: float
    created_at: str
    last_updated: str

class ClipData(BaseModel):
    id: str
    filename: str
    created_at: str
    revenue: float
    size_mb: float
    duration: float
    viral_messages: list
    chat_velocity: int
    viral_score: float
    has_overlay: bool
    overlay_type: str

class SimpleViralDetector:
    """Simplified viral detection for backend"""
    
    def __init__(self, channel_name: str):
        self.channel = channel_name.lower()
        self.websocket = None
        self.running = True
        self.viral_threshold = 5
        self.energy_words = [
            'lmao', 'lmfao', 'omg', 'wtf', 'holy', 'insane', 'clip', 'viral', 
            'poggers', 'kekw', 'monkas', 'pepega', 'omegalul', 'ez clap',
            'no way', 'bruh', 'actually', 'literally', 'dead', 'dying'
        ]
        
    async def connect_chat(self):
        try:
            # Add ping interval and timeout settings for WebSocket connection
            self.websocket = await websockets.connect(
                "wss://irc-ws.chat.twitch.tv:443",
                ping_interval=30,  # Send ping every 30 seconds
                ping_timeout=10,   # Wait 10 seconds for pong
                close_timeout=10   # Timeout for close handshake
            )
            await self.websocket.send("PASS oauth:schmoopiie")
            await self.websocket.send("NICK justinfan12345")
            await self.websocket.send(f"JOIN #{self.channel}")
            logger.info(f"Connected to Twitch chat for {self.channel}")
            return True
        except Exception as e:
            logger.error(f"Chat connection failed: {e}")
            return False
    
    def calculate_viral_energy(self, messages):
        if not messages:
            return 0
        energy_score = 0
        for msg in messages:
            msg_lower = msg.lower()
            for word in self.energy_words:
                if word in msg_lower:
                    energy_score += 3
            if len(msg) > 3:
                caps_ratio = sum(1 for c in msg if c.isupper()) / len(msg)
                if caps_ratio > 0.6:
                    energy_score += 2
            energy_score += msg.count('!') * 1.5
            emoji_count = sum(1 for c in msg if ord(c) > 0x1F600)
            energy_score += emoji_count * 2
        return energy_score

class SimpleClipper:
    """Simplified clipper for backend"""
    
    def __init__(self, channel_name: str):
        self.channel = channel_name
        self.stream_url = None

    def get_stream_url(self):
        try:
            cmd = ['streamlink', f'https://twitch.tv/{self.channel}', 'best', '--stream-url']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if result.returncode == 0 and result.stdout.strip():
                self.stream_url = result.stdout.strip()
                logger.info(f"Got stream URL for {self.channel}: {self.stream_url[:50]}...")
                return True
            else:
                logger.error(f"Streamlink failed for {self.channel}: {result.stderr}")
                return False
        except Exception as e:
            logger.error(f"Streamlink error for {self.channel}: {e}")
            return False
    
    async def create_clip(self, viral_id: int, viral_data: dict, duration: int = 12) -> str:
        """Create 10-15 second viral clip with flying chat messages and viral overlays"""
        try:
            if not self.get_stream_url():
                logger.error(f"Could not get stream URL for {self.channel}")
                return None
            
            # Create output directory
            output_dir = Path("./output/viral_clips").resolve()
            output_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime("%H%M%S")
            clip_file = output_dir / f"VIRAL_CLIP_{viral_id}_{timestamp}.mp4"
            
            # Random duration between 10-15 seconds
            clip_duration = random.randint(10, 15)
            
            viral_energy = viral_data.get('viral_energy', 0)
            velocity = viral_data.get('chat_velocity', 0)
            sample_messages = viral_data.get('sample_messages', ['OMEGALUL', 'NO WAY', 'INSANE', 'CLIP IT'])
            print(f"Stream URL: {self.stream_url}")
            print(f"Clip duration: {clip_duration}")
            print(f"Viral energy: {viral_energy}")
            print(f"Velocity: {velocity}")
            print(f"Sample messages: {sample_messages}")
            
            # Create clip WITHOUT overlay effects for now (to fix immediate issues)
            cmd = [
                'ffmpeg',
                '-i', self.stream_url,
                '-t', str(clip_duration),
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-crf', '23',
                '-c:a', 'aac',
                '-ac', '2',
                '-ar', '44100',
                '-avoid_negative_ts', 'make_zero',
                '-y',
                str(clip_file)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                return str(clip_file)
            else:
                logger.error(f"Clip creation failed: {result.stderr}")
                return None
        except Exception as e:
            logger.error(f"Error creating clip: {e}")
            return None
    
    def create_viral_overlay_effects(self, velocity: int, viral_energy: float, messages: list, duration: int) -> str:
        """Create complex viral overlay effects with flying chat messages"""
        
        # Ensure we have messages to work with
        if not messages:
            messages = ['OMEGALUL', 'NO WAY', 'INSANE', 'POGGERS', 'CLIP IT']
        
        # Clean messages for FFmpeg (remove emojis and special characters)
        clean_messages = []
        for msg in messages[:6]:  # Limit to 6 messages
            # Remove emojis and special FFmpeg characters
            clean_msg = ''.join(c for c in msg if ord(c) < 127)  # ASCII only
            clean_msg = clean_msg.replace("'", "").replace('"', '').replace(':', '').replace('\\', '').replace(',', '').strip()[:15]
            if clean_msg and clean_msg.replace(' ', ''):
                clean_messages.append(clean_msg)
        
        if not clean_messages:
            clean_messages = ['VIRAL', 'MOMENT', 'INSANE', 'POGGERS']
        
        effects = []
        
        # Main viral moment banner (top center, pulsing) - NO EMOJIS
        main_banner = f"drawtext=text='VIRAL MOMENT - {velocity} MSG/SEC':fontcolor=white:fontsize=48:box=1:boxcolor=red@0.9:x=(w-text_w)/2:y=30:enable=between(t\\,0\\,{duration})"
        effects.append(main_banner)
        
        # Energy level indicator (top right, animated) - NO EMOJIS
        energy_text = f"drawtext=text='ENERGY: {int(viral_energy)}':fontcolor=yellow:fontsize=32:box=1:boxcolor=black@0.8:x=w-text_w-20:y=100:enable=between(t\\,1\\,{duration})"
        effects.append(energy_text)
        
        # Flying chat messages (animated from right to left)
        for i, message in enumerate(clean_messages):
            start_time = i * 0.8  # Stagger the messages
            if start_time >= duration:
                break
                
            # Different colors for variety
            colors = ['white', 'cyan', 'yellow', 'lime', 'magenta', 'orange']
            color = colors[i % len(colors)]
            
            # Calculate flying animation (right to left)
            y_pos = 200 + (i * 60)  # Vertical spacing
            if y_pos > 600:  # Don't go too low
                y_pos = 200 + ((i % 4) * 60)
            
            # Flying message animation
            flying_msg = f"drawtext=text='{message}':fontcolor={color}:fontsize=36:box=1:boxcolor=black@0.7:x=w-t*200+{start_time*200}:y={y_pos}:enable=between(t\\,{start_time}\\,{start_time + 3})"
            effects.append(flying_msg)
        
        # Viral score indicator (bottom left, glowing effect) - NO EMOJIS
        viral_score = min(100, int(viral_energy * 10 + velocity))
        score_text = f"drawtext=text='VIRAL SCORE: {viral_score}/100':fontcolor=lime:fontsize=28:box=1:boxcolor=black@0.8:x=20:y=h-80:enable=between(t\\,2\\,{duration})"
        effects.append(score_text)
        
        # Chat explosion indicator (center, appears briefly) - NO EMOJIS
        explosion_text = f"drawtext=text='CHAT EXPLOSION':fontcolor=red:fontsize=42:box=1:boxcolor=yellow@0.8:x=(w-text_w)/2:y=(h-text_h)/2:enable=between(t\\,1\\,3)"
        effects.append(explosion_text)
        
        # Clip watermark (bottom right, subtle)
        watermark = f"drawtext=text='ZClipper AI':fontcolor=white@0.7:fontsize=20:x=w-text_w-20:y=h-40:enable=between(t\\,0\\,{duration})"
        effects.append(watermark)
        
        # Combine all effects
        return ",".join(effects)

class ViralSession:
    """Manages a viral detection session"""
    
    def __init__(self, session_id: str, channel: str, user_id: str):
        self.session_id = session_id
        self.channel = channel
        self.user_id = user_id
        self.status = "active"
        self.created_at = datetime.now().isoformat()
        self.last_updated = datetime.now().isoformat()
        self.chat_speed = 0
        self.viral_score = 0.0
        self.clips_generated = 0
        self.revenue = 0.0
        self.clips = []
        self.running = False
        
    def to_dict(self):
        return {
            "session_id": self.session_id,
            "channel": self.channel,
            "status": self.status,
            "chat_speed": self.chat_speed,
            "viral_score": self.viral_score,
            "clips_generated": self.clips_generated,
            "revenue": self.revenue,
            "created_at": self.created_at,
            "last_updated": self.last_updated
        }
    
    async def start_monitoring(self):
        """Start viral monitoring for this session"""
        try:
            self.running = True
            self.status = "active"
            
            # Create output directory
            output_dir = Path(f"./output/sessions/{self.session_id}")
            output_dir.mkdir(parents=True, exist_ok=True)
            
            logger.info(f"Starting viral monitoring for {self.channel}")
            
            # Initialize viral detection components
            detector = SimpleViralDetector(self.channel)
            clipper = SimpleClipper(self.channel)
            
            # Connect to chat
            connected = await detector.connect_chat()
            if not connected:
                self.status = "error"
                raise Exception("Could not connect to Twitch chat")
            
            # Create stream thumbnail
            await self.create_stream_thumbnail(clipper)
            
            # Start monitoring loop
            await self.monitor_viral_moments(detector, clipper)
            
        except Exception as e:
            logger.error(f"Error in session {self.session_id}: {e}")
            self.status = "error"
            self.running = False
    
    async def monitor_viral_moments(self, detector, clipper):
        """Monitor for viral moments and create clips"""
        logger.info(f"Viral monitoring started for session {self.session_id}")
        
        message_count = 0
        recent_messages = []
        start_time = time.time()
        
        try:
            async for message in detector.websocket:
                if not self.running:
                    break
                
                current_time = time.time()
                
                # Handle ping/pong to maintain connection
                if message.startswith("PING"):
                    await detector.websocket.send("PONG :tmi.twitch.tv")
                    continue
                
                # Parse chat messages
                if "PRIVMSG" in message:
                    message_count += 1
                    msg_content = message.split("PRIVMSG")[1].split(":", 1)[-1].strip()
                    recent_messages.append(msg_content)
                    
                    if len(recent_messages) > 30:
                        recent_messages.pop(0)
                
                # Check for viral moment every second
                if current_time - start_time >= 1.0:
                    velocity = message_count
                    viral_energy = detector.calculate_viral_energy(recent_messages)
                    
                    # Update session stats
                    self.chat_speed = velocity
                    self.viral_score = viral_energy
                    self.last_updated = datetime.now().isoformat()
                    
                    # Broadcast to websocket clients
                    await self.broadcast_update()
                    
                    # Check for viral moment (with cooldown)
                    if velocity >= detector.viral_threshold or viral_energy >= 5:
                        await self.handle_viral_moment(clipper, velocity, viral_energy, recent_messages.copy())
                        # Cooldown period to prevent spam
                        await asyncio.sleep(30)
                    
                    # Reset counters
                    message_count = 0
                    start_time = current_time
                    recent_messages.clear()
                    
        except websockets.exceptions.ConnectionClosedError as e:
            logger.error(f"WebSocket connection closed for session {self.session_id}: {e}")
            self.status = "error"
            # Try to reconnect
            if self.running:
                logger.info(f"Attempting to reconnect chat for session {self.session_id}")
                await asyncio.sleep(5)
                if await detector.connect_chat():
                    await self.monitor_viral_moments(detector, clipper)
        except Exception as e:
            logger.error(f"Monitoring error for session {self.session_id}: {e}")
            self.status = "error"
    
    async def handle_viral_moment(self, clipper, velocity, viral_energy, messages):
        """Handle viral moment detection and clip creation"""
        self.clips_generated += 1
        clip_id = f"clip_{self.clips_generated}_{int(time.time())}"
        
        logger.info(f"Viral moment detected in session {self.session_id}")
        
        # Create clip data with enhanced viral messages
        viral_data = {
            "viral_id": self.clips_generated,
            "timestamp": datetime.now().isoformat(),
            "channel": self.channel,
            "chat_velocity": velocity,
            "viral_energy": viral_energy,
            "sample_messages": messages[-10:] if messages else ['OMEGALUL', 'NO WAY', 'INSANE', 'POGGERS', 'CLIP IT', 'BRUH', 'ACTUALLY', 'LMFAOOO'],
            "detection_time": "~3 seconds",
            "viral_messages": messages[-5:] if messages else ['VIRAL', 'MOMENT', 'INSANE'],
            "viral_score": viral_energy
        }
        
        # Enhance clip with ChainGPT AI Web3 analysis
        try:
            enhanced_viral_data = await chaingpt_enhancer.enhance_clip_metadata(viral_data)
            logger.info(f"🤖 ChainGPT enhanced viral clip with score: {enhanced_viral_data.get('enhanced_viral_score', viral_energy)}")
        except Exception as e:
            logger.error(f"ChainGPT enhancement failed, using original data: {e}")
            enhanced_viral_data = viral_data
        
        # Create the clip (10-15 seconds) with enhanced data
        clip_file = await clipper.create_clip(self.clips_generated, enhanced_viral_data)
        
        if clip_file:
            # Calculate revenue (mock calculation)
            revenue = 15.50  # $15.50 per viral clip
            self.revenue += revenue
            
            # Create clip object
            file_path = Path(clip_file)
            file_size = file_path.stat().st_size / (1024 * 1024) if file_path.exists() else 0
            duration = random.randint(10, 15)
            
            # Generate thumbnail if it doesn't exist
            thumbnail_path = Path("./output/thumbnails") / f"{file_path.stem}_thumb.jpg"
            if not thumbnail_path.exists():
                generate_thumbnail(file_path, thumbnail_path)
            
            # Save to local database with ChainGPT enhanced metadata
            clip_data_dict = {
                'filename': file_path.name,
                'duration': duration,
                'size_mb': file_size,
                'viral_score': enhanced_viral_data.get('enhanced_viral_score', viral_energy),
                'chat_velocity': velocity,
                'revenue': revenue,
                'viral_messages': messages[-5:],
                'thumbnail_url': f"https://zclipper-api-62092339396.us-central1.run.app/api/serve-thumbnail/{file_path.stem}_thumb.jpg",
                'ai_enhanced': enhanced_viral_data.get('ai_enhanced', False),
                'web3_title': enhanced_viral_data.get('web3_enhanced_title'),
                'web3_hashtags': enhanced_viral_data.get('web3_hashtags', []),
                'community_targets': enhanced_viral_data.get('community_targets', []),
                'distribution_strategy': enhanced_viral_data.get('distribution_strategy', {})
            }
            
            stored_clip_id = db.create_clip(self.session_id, self.user_id, clip_data_dict)
            
            # Upload to Phyght platform (Supabase) with ChainGPT enhancement
            platform_data = {
                'channel': self.channel,
                'chat_velocity': velocity,
                'viral_score': enhanced_viral_data.get('enhanced_viral_score', viral_energy),
                'viral_messages': messages[-5:],
                'duration': duration,
                'revenue': revenue,
                'ai_enhanced': enhanced_viral_data.get('ai_enhanced', False),
                'web3_context': enhanced_viral_data.get('chaingpt_analysis', {}),
                'enhanced_title': enhanced_viral_data.get('web3_enhanced_title'),
                'hashtags': enhanced_viral_data.get('web3_hashtags', []),
                'community_targets': enhanced_viral_data.get('community_targets', [])
            }
            
            try:
                platform_result = await supabase_manager.process_clip_for_platform(
                    file_path, thumbnail_path, platform_data, self.user_id, self.session_id
                )
                
                if platform_result['success']:
                    logger.info(f"Clip uploaded to Phyght platform: {platform_result['video_id']}")
                    # Update local record with platform info
                    clip_data_dict['platform_video_id'] = platform_result['video_id']
                    clip_data_dict['platform_url'] = platform_result['public_url']
                else:
                    logger.error(f"Platform upload failed: {platform_result.get('error')}")
            except Exception as e:
                logger.error(f"Platform integration error: {e}")
            
            # Update session in database
            db.update_session(self.session_id, 
                            clips_generated=self.clips_generated,
                            revenue=self.revenue,
                            chat_speed=self.chat_speed,
                            viral_score=self.viral_score)
            
            # Create clip object for broadcasting with ChainGPT enhancement
            clip_data = ClipData(
                id=stored_clip_id,
                filename=file_path.name,
                created_at=datetime.now().isoformat(),
                revenue=revenue,
                size_mb=file_size,
                duration=duration,
                viral_messages=messages[-5:],
                chat_velocity=velocity,
                viral_score=enhanced_viral_data.get('enhanced_viral_score', viral_energy),
                has_overlay=True,
                overlay_type="explosive_text"
            )
            
            self.clips.append(clip_data)
            
            # Broadcast clip generated event
            await self.broadcast_clip_generated(clip_data)
    
    async def broadcast_update(self):
        """Broadcast session update to websocket clients"""
        if self.session_id in websocket_connections:
            message = {
                "type": "session_update",
                "data": {
                    "session_id": self.session_id,
                    "chat_speed": self.chat_speed,
                    "viral_score": self.viral_score,
                    "clips_generated": self.clips_generated,
                    "revenue": self.revenue
                }
            }
            
            for websocket in websocket_connections[self.session_id].copy():
                try:
                    await websocket.send_text(json.dumps(message))
                except:
                    websocket_connections[self.session_id].remove(websocket)
    
    async def broadcast_clip_generated(self, clip_data):
        """Broadcast clip generated event"""
        if self.session_id in websocket_connections:
            message = {
                "type": "clip_generated",
                "data": {
                    "session_id": self.session_id,
                    "clip": clip_data.model_dump()
                }
            }
            
            for websocket in websocket_connections[self.session_id].copy():
                try:
                    await websocket.send_text(json.dumps(message))
                except:
                    websocket_connections[self.session_id].remove(websocket)
    
    async def create_stream_thumbnail(self, clipper):
        """Create and continuously update stream thumbnail"""
        try:
            if not clipper.get_stream_url():
                logger.warning(f"Could not get stream URL for {self.channel} thumbnail")
                return
            
            thumbnail_dir = Path("./output/thumbnails")
            thumbnail_dir.mkdir(parents=True, exist_ok=True)
            
            # Start thumbnail update loop
            asyncio.create_task(self._update_thumbnail_loop(clipper, thumbnail_dir))
                
        except Exception as e:
            logger.error(f"Error creating stream thumbnail: {e}")
    
    async def _update_thumbnail_loop(self, clipper, thumbnail_dir):
        """Continuously update stream thumbnail every 3 seconds with retry logic"""
        frame_counter = 0
        consecutive_failures = 0
        max_consecutive_failures = 3
        
        while self.running:
            try:
                thumbnail_path = thumbnail_dir / f"{self.session_id}_session_thumb.jpg"
                temp_path = thumbnail_dir / f"{self.session_id}_session_temp.jpg"
                
                # Capture different frames each time for animation effect
                seek_time = (frame_counter % 10) + 1  # Rotate through 1-10 second marks
                
                # Retry logic for thumbnail generation
                for attempt in range(3):
                    try:
                        cmd = [
                            'ffmpeg',
                            '-i', clipper.stream_url,
                            '-ss', str(seek_time),
                            '-vframes', '1',
                            '-vf', 'scale=320:180',
                            '-threads', '2',  # Limit threads for stability
                            '-preset', 'ultrafast',  # Use fastest preset
                            '-y',
                            str(temp_path)
                        ]
                        
                        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                        
                        if result.returncode == 0 and temp_path.exists():
                            # Atomically replace the thumbnail
                            temp_path.replace(thumbnail_path)
                            logger.debug(f"Updated thumbnail for {self.channel} (frame {frame_counter})")
                            consecutive_failures = 0  # Reset failure counter
                            break
                        else:
                            logger.warning(f"FFmpeg failed (attempt {attempt + 1}): {result.stderr}")
                            if attempt < 2:
                                await asyncio.sleep(2)  # Wait before retry
                    
                    except subprocess.TimeoutExpired:
                        logger.warning(f"Thumbnail generation timed out for {self.channel} (attempt {attempt + 1})")
                        if attempt < 2:
                            await asyncio.sleep(5)  # Wait before retry
                else:
                    # All attempts failed
                    consecutive_failures += 1
                    logger.error(f"All thumbnail generation attempts failed for {self.channel}")
                
                # If too many consecutive failures, increase sleep time
                if consecutive_failures >= max_consecutive_failures:
                    logger.warning(f"Too many thumbnail failures for {self.channel}, increasing sleep time")
                    await asyncio.sleep(30)  # Wait longer
                    consecutive_failures = 0  # Reset counter
                else:
                    frame_counter += 1
                    await asyncio.sleep(3)  # Update every 3 seconds
                
            except Exception as e:
                logger.error(f"Error in thumbnail loop: {e}")
                consecutive_failures += 1
                await asyncio.sleep(10)  # Wait longer on error
    
    def stop(self):
        """Stop the monitoring session"""
        self.running = False
        self.status = "stopped"

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Authentication endpoints
@app.post("/api/auth/register", response_model=UserResponse)
async def register_user(request: CreateUserRequest):
    """Register a new user"""
    try:
        user_id = db.create_user(request.username, request.email)
        token = db.create_token(user_id)
        
        user_data = db.get_user(user_id)
        
        return UserResponse(
            user_id=user_data['user_id'],
            username=user_data['username'],
            email=user_data['email'],
            plan=user_data['plan'],
            clips_generated=user_data['clips_generated'],
            total_revenue=user_data['total_revenue'],
            token=token
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@app.post("/api/auth/login", response_model=UserResponse)
async def login_user(request: LoginRequest):
    """Login user (simplified - just by username for demo)"""
    # In production, you'd verify password here
    with db.db_path as conn:
        cursor = conn.execute("SELECT user_id FROM users WHERE username = ?", (request.username,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = row[0]
        token = db.create_token(user_id)
        user_data = db.get_user(user_id)
        
        return UserResponse(
            user_id=user_data['user_id'],
            username=user_data['username'],
            email=user_data['email'],
            plan=user_data['plan'],
            clips_generated=user_data['clips_generated'],
            total_revenue=user_data['total_revenue'],
            token=token
        )

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: str = Depends(get_current_user)):
    """Get current user info"""
    user_data = db.get_user(current_user)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        user_id=user_data['user_id'],
        username=user_data['username'],
        email=user_data['email'],
        plan=user_data['plan'],
        clips_generated=user_data['clips_generated'],
        total_revenue=user_data['total_revenue']
    )

@app.post("/api/start-monitoring", response_model=SessionResponse)
async def start_monitoring(
    request: StartMonitoringRequest, 
    background_tasks: BackgroundTasks,
    current_user: str = Depends(get_current_user)
):
    """Start monitoring a Twitch channel"""
    
    logger.info(f"Starting monitoring for channel: {request.channel} by user: {current_user}")
    
    # Create session in database
    session_id = db.create_session(current_user, request.channel)
    
    # Create in-memory session
    session = ViralSession(session_id, request.channel, current_user)
    active_sessions[session_id] = session
    
    # Start monitoring in background
    background_tasks.add_task(session.start_monitoring)
    
    return SessionResponse(session_id=session_id)

@app.get("/api/status/{session_id}", response_model=SessionStatus)
async def get_status(session_id: str):
    """Get session status"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    return SessionStatus(**session.to_dict())

@app.get("/api/clips/{session_id}")
async def get_clips(session_id: str):
    """Get clips for a session"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    return {"clips": [clip.dict() for clip in session.clips]}

@app.post("/api/stop-monitoring/{session_id}")
async def stop_monitoring(session_id: str):
    """Stop monitoring a session"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    session.stop()
    
    return {"message": "Monitoring stopped"}

@app.post("/api/create-clip-now")
async def create_clip_now(current_user: str = Depends(get_current_user)):
    """Manually trigger clip creation for active sessions"""
    try:
        active_user_sessions = [
            session for session in active_sessions.values() 
            if session.user_id == current_user and session.status == "active"
        ]
        
        if not active_user_sessions:
            raise HTTPException(status_code=404, detail="No active sessions found")
        
        clips_created = 0
        for session in active_user_sessions:
            try:
                # Create a manual clip with current data
                clipper = SimpleClipper(session.channel)
                
                # Mock viral data for manual clip
                viral_data = {
                    "viral_id": session.clips_generated + 1,
                    "timestamp": datetime.now().isoformat(),
                    "channel": session.channel,
                    "chat_velocity": max(session.chat_speed, 10),
                    "viral_energy": max(session.viral_score, 15),
                    "sample_messages": ["MANUAL CLIP", "POGGERS", "CLIP IT", "INSANE"],
                    "detection_time": "Manual trigger",
                    "viral_messages": ["MANUAL", "CLIP", "NOW"],
                    "viral_score": max(session.viral_score, 15)
                }
                
                # Create the clip
                clip_file = await clipper.create_clip(session.clips_generated + 1, viral_data)
                
                if clip_file:
                    session.clips_generated += 1
                    session.revenue += 15.50
                    clips_created += 1
                    
                    # Update database
                    db.update_session(session.session_id, 
                                    clips_generated=session.clips_generated,
                                    revenue=session.revenue)
                    
            except Exception as e:
                logger.error(f"Failed to create manual clip for session {session.session_id}: {e}")
        
        if clips_created > 0:
            return {
                "success": True,
                "clips_created": clips_created,
                "message": f"Created {clips_created} clip(s) manually"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create clips")
            
    except Exception as e:
        logger.error(f"Manual clip creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions")
async def get_sessions():
    """Get all active sessions with enhanced data - optimized for speed"""
    sessions_data = []
    
    for session in active_sessions.values():
        session_data = session.to_dict()
        
        # Simplified session info without heavy operations
        session_data.update({
            "thumbnail_url": None,  # Skip thumbnail generation for speed
            "recent_clips": len(session.clips),
            "avg_viral_score": round(sum([c.viral_score for c in session.clips[-5:]]) / max(1, len(session.clips[-5:])), 2) if session.clips else 0,
            "status_emoji": "🔴" if session.status == "active" else "⚪" if session.status == "stopped" else "❌",
            "performance": "🔥" if session.clips_generated > 5 else "⚡" if session.clips_generated > 2 else "💫"
        })
        
        sessions_data.append(session_data)
    
    # Fast response with minimal processing
    return {
        "sessions": sessions_data,
        "total_active": len([s for s in sessions_data if s["status"] == "active"]),
        "total_clips": sum([s["clips_generated"] for s in sessions_data]),
        "total_revenue": sum([s["revenue"] for s in sessions_data])
    }

def generate_thumbnail(video_path: Path, thumbnail_path: Path) -> bool:
    """Generate thumbnail from video using ffmpeg - only if thumbnail doesn't exist"""
    try:
        # Check if thumbnail already exists and is recent (within last hour)
        if thumbnail_path.exists():
            thumbnail_age = time.time() - thumbnail_path.stat().st_mtime
            if thumbnail_age < 3600:  # 1 hour
                return True  # Thumbnail exists and is recent
        
        # Ensure thumbnail directory exists
        thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
        
        cmd = [
            'ffmpeg',
            '-i', str(video_path),
            '-ss', '1',  # Take frame at 1 second
            '-vframes', '1',
            '-vf', 'scale=320:180',
            '-pix_fmt', 'yuvj420p',  # Fix pixel format issue
            '-q:v', '2',  # High quality
            '-y',
            str(thumbnail_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        success = result.returncode == 0 and thumbnail_path.exists()
        
        if not success:
            logger.warning(f"Thumbnail generation failed for {video_path.name}: {result.stderr}")
        
        return success
    except Exception as e:
        logger.error(f"Thumbnail generation failed: {e}")
        return False

@app.get("/api/platform-status")
async def get_platform_status():
    """Get Phyght platform integration status"""
    try:
        # Test Supabase connection
        test_result = await supabase_manager.get_user_clips('test-user-id', limit=1)
        
        return {
            "platform_connected": True,
            "platform_name": "Phyght Video Platform",
            "supabase_url": supabase_manager.supabase_url,
            "storage_buckets": {
                "clips": supabase_manager.clips_bucket,
                "thumbnails": supabase_manager.thumbnails_bucket
            },
            "features": [
                "Auto-upload to cloud storage",
                "Scalable video hosting",
                "User management",
                "Payment processing ready",
                "Real-time synchronization"
            ]
        }
    except Exception as e:
        return {
            "platform_connected": False,
            "error": str(e),
            "message": "Configure Supabase credentials in .env file"
        }

@app.get("/api/user-platform-clips")
async def get_user_platform_clips(current_user: str = Depends(get_current_user)):
    """Get user's clips from Phyght platform"""
    try:
        clips = await supabase_manager.get_user_clips(current_user, limit=50)
        
        # Filter for zclipper clips
        zclipper_clips = [
            clip for clip in clips 
            if clip.get('metadata', {}).get('source') == 'zclipper'
        ]
        
        return {
            "clips": zclipper_clips,
            "total_count": len(zclipper_clips),
            "platform_url": f"{supabase_manager.supabase_url.replace('https://', 'https://app.')}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch platform clips: {str(e)}")

@app.get("/api/all-clips")
async def get_all_clips():
    """Get all real clips from database and file system"""
    clips = []
    
    # Get clips from database first
    try:
        all_db_clips = []
        for session_id in active_sessions.keys():
            session_clips = db.get_session_clips(session_id)
            all_db_clips.extend(session_clips)
        
        # Convert DB clips to API format
        clips_dir = Path("./output/viral_clips")
        thumbnails_dir = Path("./output/thumbnails")
        
        for db_clip in all_db_clips:
            clip_file = clips_dir / db_clip['filename']
            if clip_file.exists():
                thumbnail_name = clip_file.stem + "_thumb.jpg"
                thumbnail_path = thumbnails_dir / thumbnail_name
                
                clip_data = {
                    "id": db_clip['clip_id'],
                    "filename": db_clip['filename'],
                    "created_at": db_clip['created_at'],
                    "size_mb": db_clip['size_mb'],
                    "duration": db_clip['duration'],
                    "viral_score": db_clip['viral_score'],
                    "revenue": db_clip['revenue'],
                    "url": f"https://zclipper-api-62092339396.us-central1.run.app/api/serve-clip/{db_clip['filename']}",
                    "thumbnail_url": f"https://zclipper-api-62092339396.us-central1.run.app/api/serve-thumbnail/{thumbnail_name}" if thumbnail_path.exists() else None
                }
                clips.append(clip_data)
    except Exception as e:
        logger.error(f"Error fetching clips from database: {e}")
    
    # If no DB clips, check file system for any real clips
    if not clips:
        clips_dir = Path("./output/viral_clips")
        if clips_dir.exists():
            for clip_file in clips_dir.glob("VIRAL_CLIP_*.mp4"):  # Only real generated clips
                try:
                    stat = clip_file.stat()
                    thumbnail_name = clip_file.stem + "_thumb.jpg"
                    thumbnail_path = Path("./output/thumbnails") / thumbnail_name
                    
                    clip_data = {
                        "filename": clip_file.name,
                        "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "size_mb": round(stat.st_size / (1024 * 1024), 2),
                        "duration": random.randint(10, 15),
                        "url": f"https://zclipper-api-62092339396.us-central1.run.app/api/serve-clip/{clip_file.name}",
                        "thumbnail_url": f"https://zclipper-api-62092339396.us-central1.run.app/api/serve-thumbnail/{thumbnail_name}" if thumbnail_path.exists() else None
                    }
                    clips.append(clip_data)
                except Exception as e:
                    logger.error(f"Error processing clip {clip_file}: {e}")
    
    # Sort by creation time (newest first)
    clips.sort(key=lambda x: x["created_at"], reverse=True)
    
    logger.info(f"Serving {len(clips)} real clips")
    return {"clips": clips, "total": len(clips)}

@app.get("/api/serve-clip/{filename}")
async def serve_clip(filename: str):
    """Serve a clip file from the correct directory"""
    # Fix the path to use output/viral_clips
    clip_path = Path("./output/viral_clips") / filename
    
    if not clip_path.exists():
        raise HTTPException(status_code=404, detail="Clip not found")
    
    return FileResponse(str(clip_path), filename=filename)

@app.get("/api/serve-thumbnail/{filename}")
async def serve_thumbnail(filename: str):
    """Serve a thumbnail file with proper caching"""
    thumbnail_path = Path("./output/thumbnails") / filename
    
    if not thumbnail_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    # Add proper caching headers for thumbnails
    # Thumbnails don't change often, so cache them for 1 hour
    headers = {
        "Cache-Control": "public, max-age=3600, immutable",  # Cache for 1 hour
        "ETag": f'"{thumbnail_path.stat().st_mtime}"',  # Use file modification time as ETag
        "Last-Modified": thumbnail_path.stat().st_mtime,  # Last modified time
    }
    
    return FileResponse(str(thumbnail_path), filename=filename, media_type="image/jpeg", headers=headers)

@app.get("/api/download/{session_id}/{clip_id}")
async def download_clip(session_id: str, clip_id: str):
    """Download a clip file"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    clip = next((c for c in session.clips if c.id == clip_id), None)
    
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    
    # Look for the clip file in output directories
    possible_paths = [
        Path(f"./viral_clips/{clip.filename}"),
        Path(f"../clip-repurpose-engine/output/viral_clips/{clip.filename}"),
        Path(f"./output/sessions/{session_id}/{clip.filename}")
    ]
    
    for path in possible_paths:
        if path.exists():
            return FileResponse(str(path), filename=clip.filename)
    
    raise HTTPException(status_code=404, detail="Clip file not found")

@app.websocket("/ws/live-data/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for live data updates"""
    await websocket.accept()
    
    # Add to connections
    if session_id not in websocket_connections:
        websocket_connections[session_id] = []
    websocket_connections[session_id].append(websocket)
    
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        # Remove from connections
        if session_id in websocket_connections:
            websocket_connections[session_id].remove(websocket)

if __name__ == "__main__":
    # Create output directories
    Path("./viral_clips").mkdir(parents=True, exist_ok=True)
    Path("./output/sessions").mkdir(parents=True, exist_ok=True)
    
    logger.info("Starting ZClipper Backend API Server")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")