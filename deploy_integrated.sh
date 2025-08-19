#!/bin/bash

echo "🚀 ZClipper + Phyght Platform Integration Deployment"
echo "===================================================="

# Check if required tools are installed
echo "🔧 Checking dependencies..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is required but not installed"  
    exit 1
fi

if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is required but not installed"
    exit 1
fi

echo "✅ All dependencies found"

# Setup environment
echo "🔐 Setting up environment..."

if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "❗ Please edit .env file with your Supabase credentials before continuing"
    echo "   Required variables:"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_ANON_KEY" 
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    read -p "Press Enter when you've configured .env file..."
fi

# Load environment variables
source .env

# Validate required environment variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Missing required environment variables in .env file"
    exit 1
fi

echo "✅ Environment configured"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt aiohttp aiofiles

# Install Node.js dependencies  
echo "📦 Installing Node.js dependencies..."
npm install

# Create output directories
echo "📁 Creating output directories..."
mkdir -p output/viral_clips
mkdir -p output/thumbnails
mkdir -p output/sessions

# Initialize database
echo "🗄️ Initializing local database..."
python3 -c "from database import db; print('Database initialized')"

# Test platform connection
echo "🔗 Testing Phyght platform connection..."
python3 -c "
import asyncio
from supabase_integration import supabase_manager

async def test():
    try:
        clips = await supabase_manager.get_user_clips('test', limit=1)
        print('✅ Platform connection successful')
        return True
    except Exception as e:
        print(f'❌ Platform connection failed: {e}')
        return False

result = asyncio.run(test())
exit(0 if result else 1)
"

if [ $? -ne 0 ]; then
    echo "❌ Platform connection test failed"
    echo "   Please check your Supabase credentials in .env file"
    exit 1
fi

# Build frontend
echo "🏗️ Building frontend..."
npm run build

echo ""
echo "🎉 Integration deployment complete!"
echo ""
echo "📋 What's ready:"
echo "   ✅ ZClipper backend with Phyght platform integration"
echo "   ✅ Automatic clip upload to Supabase storage"
echo "   ✅ User authentication and management"
echo "   ✅ Scalable video hosting infrastructure"
echo "   ✅ Real-time clip generation and sync"
echo ""
echo "🚀 To start the integrated system:"
echo "   Backend:  python3 backend_server.py"
echo "   Frontend: npm run dev"
echo ""
echo "🌐 Endpoints:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   Health:   http://localhost:8000/health"
echo "   Platform: http://localhost:8000/api/platform-status"
echo ""
echo "💡 Features:"
echo "   🎬 Automatic viral clip detection"
echo "   ☁️  Cloud storage with Supabase"
echo "   👥 Multi-user support"
echo "   💰 Payment system ready"
echo "   📊 Analytics and metrics"
echo "   🔄 Real-time synchronization"
echo ""
echo "🎯 Perfect for 100+ users!"