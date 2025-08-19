'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { API } from '@/lib/api';
import Navigation from '@/components/Navigation';

// Live video preview component that shows live stream frames
function LiveVideoPreview({ sessionId, channel, mode = 'thumbnail' }: { sessionId: string; channel: string; mode?: 'thumbnail' | 'video' }) {
  const [previewSrc, setPreviewSrc] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [previewMode, setPreviewMode] = useState<'thumbnail' | 'video'>(mode);

  useEffect(() => {
    const refreshPreview = () => {
      const cacheBuster = Date.now();
      const endpoint = previewMode === 'video' ? 'live-frame' : 'thumbnail';
      const fullUrl = `${API}/api/${endpoint}/${sessionId}?v=${cacheBuster}`;
      setPreviewSrc(fullUrl);
    };

    // Update interval based on mode - video preview updates more frequently
    const interval = previewMode === 'video' ? 3000 : 10000; // 3s for video, 10s for thumbnail
    const refreshInterval = setInterval(refreshPreview, interval);
    
    // Initial load
    refreshPreview();

    return () => clearInterval(refreshInterval);
  }, [sessionId, previewMode]);

  return (
    <div className="w-full h-full relative group">
      <Image 
        src={previewSrc || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'} 
        alt={`${channel} live preview`} 
        fill
        className={`object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(false)}
        unoptimized={true}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
      
      {/* Live indicator with mode */}
      <div className="absolute bottom-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded animate-pulse">
        🔴 {previewMode === 'video' ? 'LIVE' : 'REEL'}
      </div>
      
      {/* Mode toggle button (appears on hover) */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPreviewMode(prev => prev === 'video' ? 'thumbnail' : 'video');
          }}
          className="bg-black/70 text-white text-xs px-2 py-1 rounded hover:bg-black/90"
        >
          {previewMode === 'video' ? '🎞️ Reel' : '📺 Live'}
        </button>
      </div>
      
      {/* Preview quality indicator */}
      {previewMode === 'video' && (
        <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
          HD
        </div>
      )}
    </div>
  );
}

// Legacy component for backward compatibility
function LiveThumbnail({ sessionId }: { src: string; alt: string; sessionId: string }) {
  return <LiveVideoPreview sessionId={sessionId} channel="" mode="thumbnail" />;
}

interface StreamSession {
  session_id: string;
  channel: string;
  status: string;
  chat_speed: number;
  viral_score: number;
  clips_generated: number;
  revenue: number;
  created_at: string;
  last_updated: string;
  thumbnail_url?: string;
  reel_thumbnail_url?: string;
  recent_clips: number;
  avg_viral_score: number;
  status_emoji: string;
  performance: string;
}

interface SessionsData {
  sessions: StreamSession[];
  total_active: number;
  total_clips: number;
  total_revenue: number;
}

export default function Dashboard() {
  const [sessionsData, setSessionsData] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const router = useRouter();

  const fetchSessions = async (isManualRefresh = false) => {
    const now = Date.now();
    
    // Prevent duplicate requests within 2 seconds
    if (!isManualRefresh && now - lastFetchTime < 2000) {
      console.log('Skipping duplicate session fetch request');
      return;
    }
    
    try {
      // Don't show loading for automatic refreshes
      if (isManualRefresh && !loading) {
        setLoading(true);
      }
      
      setLastFetchTime(now);
      
      const response = await fetch(`${API}/api/sessions`, {
        cache: 'no-cache', // Prevent caching issues
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sessions data received:', data); // Debug log
        
        // Process sessions to ensure thumbnail URLs are absolute
        if (data.sessions) {
          data.sessions = data.sessions.map((session: StreamSession) => ({
            ...session,
            reel_thumbnail_url: session.reel_thumbnail_url && !session.reel_thumbnail_url.startsWith('http') 
              ? `${API}${session.reel_thumbnail_url}` 
              : session.reel_thumbnail_url,
            thumbnail_url: session.thumbnail_url && !session.thumbnail_url.startsWith('http') 
              ? `${API}${session.thumbnail_url}` 
              : session.thumbnail_url
          }));
        }
        
        setSessionsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionsRef = React.useRef(fetchSessions);
  fetchSessionsRef.current = fetchSessions;

  useEffect(() => {
    fetchSessionsRef.current();
    const interval = setInterval(() => fetchSessionsRef.current(), 15000); // Reduced from 5s to 15s
    return () => clearInterval(interval);
  }, []);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      {/* Navigation */}
      <Navigation />
      
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-white/60">Multi-Stream Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`${API}/api/upload-to-phyght`, { method: 'POST' });
                  const result = await response.json();
                  if (result.success) {
                    alert(`✅ Started uploading ${result.clips_found} clips to Phyght platform!`);
                  } else {
                    alert(`❌ Upload failed: ${result.message}`);
                  }
                } catch (error) {
                  alert(`❌ Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-colors"
            >
              🌐 Upload to Phyght
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Global Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 backdrop-blur-md border border-green-400/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-green-200 font-medium">Active Streams</h3>
              <span className="text-2xl">🎥</span>
            </div>
            <div className="text-3xl font-bold text-white">{sessionsData?.total_active || 0}</div>
            <div className="text-sm text-green-300">live monitoring</div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-pink-800/30 backdrop-blur-md border border-purple-400/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-purple-200 font-medium">Total Clips</h3>
              <span className="text-2xl">🎬</span>
            </div>
            <div className="text-3xl font-bold text-white">{sessionsData?.total_clips || 0}</div>
            <div className="text-sm text-purple-300">AI generated</div>
          </div>

          <div className="bg-gradient-to-br from-orange-900/50 to-red-800/30 backdrop-blur-md border border-orange-400/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-orange-200 font-medium">Processing</h3>
              <span className="text-2xl">⚡</span>
            </div>
            <div className="text-3xl font-bold text-white">{sessionsData?.sessions.filter(s => s.status === 'monitoring').length || 0}</div>
            <div className="text-sm text-orange-300">live streams</div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/50 to-cyan-800/30 backdrop-blur-md border border-blue-400/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-blue-200 font-medium">Avg Performance</h3>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {sessionsData?.sessions.length ? 
                Math.round(sessionsData.sessions.reduce((acc, s) => acc + s.avg_viral_score, 0) / sessionsData.sessions.length) : 0}
            </div>
            <div className="text-sm text-blue-300">viral score</div>
          </div>
        </div>

        {/* Active Streams Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">🔴 Live Streams</h2>
            <button 
              onClick={() => fetchSessions(true)} 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              disabled={loading}
            >
              🔄 {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {!sessionsData?.sessions.length ? (
            <div className="text-center py-12 text-white/60">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-xl mb-2">No active streams</h3>
              <p>Start monitoring streamers to see them here</p>
              <button
                onClick={() => router.push('/app')}
                className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Start Monitoring
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessionsData.sessions.map((session) => (
                <div key={session.session_id} className="bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden hover:border-purple-400/50 transition-all duration-300 group cursor-pointer"
                     onClick={() => router.push(`/app/${session.session_id}`)}>
                  
                  {/* Stream Preview/Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center relative overflow-hidden">
                    {session.status === 'monitoring' ? (
                      <LiveVideoPreview 
                        sessionId={session.session_id}
                        channel={session.channel} 
                        mode="video"
                      />
                    ) : (session.reel_thumbnail_url || session.thumbnail_url) ? (
                      <LiveThumbnail 
                        src={session.reel_thumbnail_url || session.thumbnail_url || ''} 
                        alt={`${session.channel} live reel`} 
                        sessionId={session.session_id}
                      />
                    ) : (
                      <div className="text-center animate-pulse">
                        <div className="text-4xl mb-2">📺</div>
                        <div className="text-sm text-white/60">
                          {session.status === 'monitoring' ? 'Connecting to Live Stream...' : 'Starting Stream...'}
                        </div>
                      </div>
                    )}
                    
                    {/* Animated border for live streams */}
                    {session.status === 'active' && (
                      <div className="absolute inset-0 border-2 border-transparent animate-pulse bg-gradient-to-r from-red-500 via-transparent to-red-500 opacity-50"></div>
                    )}
                    
                    {/* Status indicator */}
                    <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/70 px-2 py-1 rounded">
                      <span className="text-lg">{session.status_emoji}</span>
                      <span className="text-xs font-medium">{session.status.toUpperCase()}</span>
                    </div>

                    {/* Performance badge */}
                    <div className="absolute top-2 right-2 text-2xl animate-pulse">
                      {session.performance}
                    </div>

                    {/* Live stats overlay */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/70 px-2 py-1 rounded text-xs">
                      <span>💬 {session.chat_speed}/sec</span>
                      <span>🔥 {Math.round(session.viral_score)}</span>
                    </div>
                  </div>

                  {/* Stream Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg truncate">#{session.channel}</h3>
                      <span className="text-sm text-white/60">{formatTime(session.last_updated)}</span>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                      <div className="bg-purple-900/30 rounded px-2 py-1 text-center">
                        <div className="font-bold">{session.clips_generated}</div>
                        <div className="text-white/60">clips</div>
                      </div>
                      <div className="bg-green-900/30 rounded px-2 py-1 text-center">
                        <div className="font-bold">{session.chat_speed}</div>
                        <div className="text-white/60">msg/sec</div>
                      </div>
                      <div className="bg-orange-900/30 rounded px-2 py-1 text-center">
                        <div className="font-bold">{Math.round(session.avg_viral_score)}</div>
                        <div className="text-white/60">avg score</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/app/${session.session_id}`);
                        }}
                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors"
                      >
                        📊 Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/chat/${session.session_id}`);
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
                      >
                        💬 Chat
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            // Stop monitoring action with debouncing
                            await fetch(`${API}/api/stop-monitoring/${session.session_id}`, { method: 'POST' });
                            // Wait a bit before refreshing to avoid race conditions
                            setTimeout(() => fetchSessions(), 1000);
                          } catch (error) {
                            console.error('Failed to stop monitoring:', error);
                          }
                        }}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
                      >
                        ⏹️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            ⚡ Recent Activity
          </h2>
          <div className="space-y-2 text-sm">
            {sessionsData?.sessions
              .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
              .slice(0, 5)
              .map((session) => (
                <div key={session.session_id} className="flex items-center justify-between p-2 bg-black/20 rounded">
                  <div className="flex items-center gap-3">
                    <span>{session.status_emoji}</span>
                    <span>#{session.channel}</span>
                    {session.clips_generated > 0 && (
                      <span className="text-green-400">+{session.clips_generated} clips</span>
                    )}
                  </div>
                  <span className="text-white/60">{formatTime(session.last_updated)}</span>
                </div>
              )) || (
              <div className="text-white/60 text-center py-4">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}