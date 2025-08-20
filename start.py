#!/usr/bin/env python3
"""
Cloud Run startup script for ZClipper backend
"""
import os
import uvicorn
from minimal_backend import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
