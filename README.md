# HypeClip - Never Miss a Viral Moment

A production-ready Next.js application that automatically detects and captures viral moments from live streams in real-time.

![HypeClip](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-cyan?style=flat-square&logo=tailwindcss)

## Features

- 🔥 **Real-time Viral Detection** - AI-powered detection of viral moments
- ⚡ **Live Dashboard** - Real-time metrics and chat pulse visualization
- 🎬 **Auto Clip Generation** - Automatic creation of perfectly timed clips
- 📊 **Analytics** - Comprehensive engagement and performance insights
- 🚀 **Multi-Platform** - Support for Twitch, YouTube Live, TikTok Live, and more
- 💰 **Revenue Tracking** - Monitor monetization opportunities
- 📱 **Responsive Design** - Mobile-first, glass-morphism UI

## Pages & Routes

- **`/`** - Landing page with hero, features, pricing, and FAQ
- **`/app`** - Creator console for starting monitoring sessions
- **`/app/[sessionId]`** - Live dashboard with real-time metrics and clips

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Real-time**: WebSocket connections with polling fallback
- **State Management**: React hooks with localStorage persistence
- **Styling**: Glass-morphism design with dark theme
- **Font**: Inter font family

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- HypeClip API server running

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/vistara-apps/zclipper/](https://github.com/vistara-apps/zclipper/)
   cd zclipper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.local.example .env.local
   ```
   
   Edit `.env.local` and set your API base URL:
   ```
   NEXT_PUBLIC_API_BASE=http://localhost:8000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## API Integration

The app integrates with the HypeClip API using the following endpoints:

- `POST /api/start-monitoring` - Start monitoring a channel
- `GET /api/status/{session_id}` - Get session status and metrics
- `GET /api/clips/{session_id}` - Retrieve generated clips
- `GET /api/download/{session_id}/{clip_id}` - Download clip files
- `POST /api/stop-monitoring/{session_id}` - Stop monitoring session
- `GET /api/sessions` - List all sessions
- `GET /health` - API health check
- `WS /ws/live-data/{session_id}` - WebSocket for real-time updates

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── app/               # App pages
│   │   ├── page.tsx       # Creator console (/app)
│   │   └── [sessionId]/   
│   │       └── page.tsx   # Live dashboard (/app/[sessionId])
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page (/)
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ClipCard.tsx       # Individual clip display
│   ├── Metrics.tsx        # KPI metrics display
│   ├── PulseRing.tsx      # Animated chat pulse gauge
│   ├── Toast.tsx          # Toast notifications
│   └── VideoModal.tsx     # Video preview modal
└── lib/
    └── api.ts             # API client functions
```

## Key Components

### PulseRing
Animated ring gauge that visualizes chat velocity (0-150+ msg/min) with color transitions:
- Blue (0-33%): Low activity
- Purple (34-66%): Medium activity  
- Green (67-100%): High activity

### Metrics
KPI tiles showing:
- Chat Speed (msg/min)
- Viral Score (0-100)
- Clips Generated (count)
- Revenue ($)

### ClipCard
Video clip display with:
- Thumbnail preview
- Metadata (duration, size, timestamp)
- Download functionality
- Social sharing buttons (stub)

### VideoModal
Full-screen video player for clip previews with controls and metadata.

## Real-time Features

### WebSocket Connection
- Connects to `ws://api-base/ws/live-data/{sessionId}`
- Handles session updates, clip generation events
- Auto-reconnection on disconnect

### Polling Fallback
- 3-second interval status polling
- Ensures data consistency if WebSocket fails
- Graceful degradation

### Toast Notifications
- Success/error messages
- Special "VIRAL DETECTED 🔥" alerts
- Auto-dismiss with manual close option

## State Management

- **Session Storage**: `localStorage` for session persistence
- **React State**: Component-level state management
- **WebSocket State**: Real-time data synchronization
- **Error Handling**: Graceful error states and user feedback

## Styling Guidelines

- **Theme**: Dark theme with glass-morphism effects
- **Colors**: Blue/purple/green gradients with white accents
- **Typography**: Inter font with various weights
- **Layout**: Mobile-first responsive design
- **Effects**: Backdrop blur, border glows, subtle animations

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Environment Variables

```bash
# Required
NEXT_PUBLIC_API_BASE=http://localhost:8000

# Optional (for production)
NEXT_PUBLIC_VERCEL_URL=https://your-domain.com
```

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set environment variables**
   - Configure `NEXT_PUBLIC_API_BASE` for your production API

3. **Deploy**
   - Deploy to Vercel, Netlify, or your hosting platform
   - Ensure environment variables are set

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the HypeClip team or create an issue in the repository.
