# ZClipper.com Deployment Guide

## 🚀 Quick Deploy to Production

### Frontend (Next.js) - Deploy to Vercel

1. **Connect to Vercel**
```bash
cd /Users/mayurchougule/development/zara/zclipper
npm install -g vercel
vercel login
vercel --prod
```

2. **Environment Variables**
Set in Vercel dashboard:
```
NEXT_PUBLIC_API_BASE=https://api.zclipper.com
```

3. **Domain Setup**
- Point zclipper.com to Vercel
- Add custom domain in Vercel dashboard

### Backend (FastAPI) - Deploy to Railway/Render

1. **Railway Setup** (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
```

2. **Environment Variables**
```
PORT=8000
SUPABASE_URL=https://mxqrlqnmgrvfzkbkgdtr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. **Deploy Backend**
```bash
cd /Users/mayurchougule/development/zara/clip-repurpose-engine
railway deploy
```

### DNS Configuration for zclipper.com

```
Type    Name        Value                          TTL
A       @           76.76.19.123 (Vercel)         300
CNAME   api         your-backend-domain            300
CNAME   www         zclipper.com                   300
```

## 🔧 Production Optimizations

### Backend Optimizations

1. **Increase Thresholds for Better Clips**
```python
# In final_working_clipper.py
self.viral_threshold = 10  # Even lower for more clips
```

2. **Add Production Logging**
```python
# In native_api_server.py
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('zclipper.log'),
        logging.StreamHandler()
    ]
)
```

### Frontend Optimizations

1. **Update API URLs**
```typescript
// In src/lib/api.ts
export const API = process.env.NEXT_PUBLIC_API_BASE || 'https://api.zclipper.com';
```

2. **Add Production WebSocket**
```typescript
// In chat page
const wsUrl = process.env.NODE_ENV === 'production' 
  ? `wss://api.zclipper.com/ws/live-data/${sessionId}`
  : `ws://localhost:8000/ws/live-data/${sessionId}`;
```

## 📊 Performance & Scaling

### Viral Detection Tuning
```python
# More aggressive clip generation for production
VIRAL_THRESHOLDS = {
    'very_high': 25,    # 🔥🔥🔥 Clips
    'high': 15,         # 🔥🔥 Clips  
    'medium': 8,        # 🔥 Clips
    'low': 5            # 💬 Clips
}
```

### Chat Performance
- Real-time chat feed with WebSockets
- Binary protobuf for chat data (future enhancement)
- Message batching every 1 second
- Keep only last 50 messages in memory

### Auto-scaling Settings
```yaml
# Railway/Render config
instances:
  min: 2
  max: 10
resources:
  memory: 2GB
  cpu: 1vCPU
```

## 🔥 Marketing Features for Launch

### 1. Real-time Chat Visualization
- Live chat feed with viral moment detection
- Color-coded messages based on viral score
- Real-time metrics dashboard

### 2. Instant Clip Generation  
- Lower viral threshold = more clips
- Better content filtering
- Auto-upload to Phyght platform

### 3. Multi-stream Dashboard
- Monitor multiple streamers simultaneously
- Live video previews
- Viral leaderboard

## 🚀 Launch Checklist

- [ ] Deploy backend to Railway/Render
- [ ] Deploy frontend to Vercel  
- [ ] Configure zclipper.com DNS
- [ ] Set production environment variables
- [ ] Test WebSocket connections
- [ ] Verify Supabase integration
- [ ] Test clip generation end-to-end
- [ ] Set up monitoring/logging
- [ ] Configure auto-scaling
- [ ] Add error tracking (Sentry)

## 🔗 Production URLs

- **Main Site**: https://zclipper.com
- **API**: https://api.zclipper.com  
- **Dashboard**: https://zclipper.com/dashboard
- **Chat Feed**: https://zclipper.com/chat/{sessionId}
- **Clips Gallery**: https://zclipper.com/clips

## 📱 Social Media Integration

- Auto-generated TikTok/Twitter ready clips
- Viral chat overlay generation
- Phyght platform auto-upload
- Instant sharing capabilities

Ready to launch! 🎉