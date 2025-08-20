#!/usr/bin/env python3
"""
Minimal ZClipper Backend API Server for deployment
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
from datetime import datetime
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ZClipper API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple models
class StartMonitoringRequest(BaseModel):
    channel: str

class SessionResponse(BaseModel):
    session_id: str

# Mock data
mock_sessions = {}
mock_clips = [
    {
        "id": "clip_1",
        "filename": "viral_moment_1.mp4",
        "created_at": "2025-08-19T22:30:00Z",
        "revenue": 15.50,
        "size_mb": 25.3,
        "duration": 12.0,
        "viral_messages": ["OMEGALUL", "NO WAY", "INSANE"],
        "chat_velocity": 45,
        "viral_score": 85.0,
        "has_overlay": True,
        "overlay_type": "explosive_text"
    },
    {
        "id": "clip_2", 
        "filename": "epic_reaction_2.mp4",
        "created_at": "2025-08-19T22:25:00Z",
        "revenue": 22.75,
        "size_mb": 18.7,
        "duration": 15.0,
        "viral_messages": ["POGGERS", "CLIP IT", "BRUH"],
        "chat_velocity": 67,
        "viral_score": 92.0,
        "has_overlay": True,
        "overlay_type": "chat_explosion"
    }
]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ZClipper Backend API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": ["/health", "/api/start-monitoring", "/api/sessions", "/api/clips"]
    }

@app.post("/api/start-monitoring", response_model=SessionResponse)
async def start_monitoring(request: StartMonitoringRequest):
    """Start monitoring a Twitch channel"""
    session_id = f"session_{len(mock_sessions) + 1}_{int(datetime.now().timestamp())}"
    
    mock_sessions[session_id] = {
        "session_id": session_id,
        "channel": request.channel,
        "status": "active",
        "chat_speed": 25,
        "viral_score": 45.0,
        "clips_generated": 2,
        "revenue": 38.25,
        "created_at": datetime.now().isoformat(),
        "last_updated": datetime.now().isoformat()
    }
    
    logger.info(f"Started monitoring session {session_id} for channel {request.channel}")
    
    return SessionResponse(session_id=session_id)

@app.get("/api/sessions")
async def get_sessions():
    """Get all sessions"""
    return {
        "sessions": list(mock_sessions.values()),
        "total_active": len(mock_sessions),
        "total_clips": sum(s["clips_generated"] for s in mock_sessions.values()),
        "total_revenue": sum(s["revenue"] for s in mock_sessions.values())
    }

@app.get("/api/clips/{session_id}")
async def get_clips(session_id: str):
    """Get clips for a session"""
    if session_id not in mock_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"clips": mock_clips}

@app.get("/api/all-clips")
async def get_all_clips():
    """Get all clips"""
    return {"clips": mock_clips}

@app.get("/api/status/{session_id}")
async def get_status(session_id: str):
    """Get session status"""
    if session_id not in mock_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return mock_sessions[session_id]

@app.post("/api/stop-monitoring/{session_id}")
async def stop_monitoring(session_id: str):
    """Stop monitoring a session"""
    if session_id not in mock_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    mock_sessions[session_id]["status"] = "stopped"
    return {"message": "Monitoring stopped"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    logger.info(f"Starting ZClipper Minimal Backend on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
