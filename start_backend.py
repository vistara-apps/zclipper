#!/usr/bin/env python3
"""
Startup script for ZClipper Backend Server
"""

import uvicorn
import os
import sys

# Add the clip-repurpose-engine to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '../clip-repurpose-engine'))

if __name__ == "__main__":
    print("🚀 Starting ZClipper Backend Server...")
    print("📁 Using clip-repurpose-engine from:", os.path.join(os.path.dirname(__file__), '../clip-repurpose-engine'))
    
    # Create output directories
    os.makedirs("./output/viral_clips", exist_ok=True)
    os.makedirs("./output/sessions", exist_ok=True)
    os.makedirs("./output/thumbnails", exist_ok=True)
    
    print("✅ Output directories created")
    print("🌐 Server will be available at: http://localhost:8000")
    print("📚 API docs will be available at: http://localhost:8000/docs")
    
    # Start the server
    uvicorn.run(
        "backend_server:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=True
    )
