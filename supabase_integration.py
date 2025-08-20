#!/usr/bin/env python3
"""
ZClipper Supabase Integration
Connects zclipper to Supabase for database and storage
"""

import os
import logging
from dotenv import load_dotenv
from supabase_database import supabase_db

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Re-export the supabase_db instance as supabase_manager for backward compatibility
supabase_manager = supabase_db
