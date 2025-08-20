#!/usr/bin/env python3
"""
ZClipper Backend Startup Script
"""

import os
import logging
import uvicorn
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def main():
    """Start the ZClipper backend server"""
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8080"))
    
    logger.info(f"Starting ZClipper backend on {host}:{port}")
    
    # Start the server
    uvicorn.run(
        "backend_server:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )

if __name__ == "__main__":
    main()

