'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getStatus, getClips, stopMonitoring, wsUrl, type SessionStatus, type Clip, type WSMessage, transformBackendClip, API } from '@/lib/api';
import { useToast } from '@/components/Toast';
import PulseRing from '@/components/PulseRing';
import Metrics from '@/components/Metrics';
import ClipCard from '@/components/ClipCard';
import VideoModal from '@/components/VideoModal';

// Type guard to ensure clips is always an array
function ensureClipsArray(clips: unknown): Clip[] {
  return Array.isArray(clips) ? clips : [];
}

export default function DashboardPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { showToast, showViral } = useToast();
  
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [lastClipCount, setLastClipCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadClipsOnly = useCallback(async () => {
    if (!sessionId) return;
    try {
      const clipsData = await getClips(sessionId as string);
      setClips(ensureClipsArray(clipsData));
    } catch (error) {
      console.error('Failed to load clips:', error);
    }
  }, [sessionId]);

  const handleWebSocketMessage = useCallback((message: WSMessage) => {
    
    switch (message.type) {
      case 'session_update':
        setStatus(prev => prev ? {
          ...prev,
          chat_speed: message.data.chat_speed ?? prev.chat_speed,
          viral_score: message.data.viral_score ?? prev.viral_score,
          clips_generated: message.data.clips_generated ?? prev.clips_generated,
          revenue: message.data.revenue ?? prev.revenue,
          last_updated: new Date().toISOString(),
        } : null);
        break;
      
      case 'clip_generated':
        if (message.data.clip) {
          const transformedClip = transformBackendClip(message.data.clip, sessionId as string);
          setClips(prev => [transformedClip, ...ensureClipsArray(prev)]);
          showToast('New clip generated! 🎬', 'success');
        }
        break;
      
      case 'error':
        showToast(message.data.message || 'WebSocket error', 'error');
        break;
    }
  }, [showToast, sessionId]);

  const cleanupConnections = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    setWsConnected(false);
  }, []);

  const setupWebSocket = useCallback(async () => {
    if (!sessionId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Check if backend is available before attempting WebSocket connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const healthResponse = await fetch(`${API}/health`, {
          signal: controller.signal,
          method: 'GET',
        });
        clearTimeout(timeoutId);
        
        if (!healthResponse.ok) {
          console.warn("Backend health check failed. Skipping WebSocket connection.");
          return;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn("Backend health check failed. Skipping WebSocket connection:", error);
        return;
      }

      const ws = new WebSocket(wsUrl(sessionId as string));
      
      // Connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.warn("WebSocket connection timeout. Backend server may not be running.");
          ws.close();
        }
      }, 5000);
      
      ws.onopen = () => {
        console.log("WebSocket connected");
        setWsConnected(true);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket connection failed. Please ensure the backend server is running at:", wsUrl(sessionId as string));
        console.error("WebSocket error details:", error);
        setWsConnected(false);
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setWsConnected(false);
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        // Only attempt reconnection if the component is still mounted and we have a session
        if (sessionId && !event.wasClean && event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting WebSocket reconnection...');
            setupWebSocket();
          }, 3000);
        }
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
      setWsConnected(false);
    }
  }, [sessionId, handleWebSocketMessage]);

  const loadData = useCallback(async () => {
    if (!sessionId) return;

    try {
      setIsLoading(true);
      // Only load status initially, clips will be updated via WebSocket
      const statusData = await getStatus(sessionId as string);
      setStatus(statusData);
      setLastClipCount(statusData.clips_generated);
      
      // Load clips only if there are any
      if (statusData.clips_generated > 0) {
        const clipsData = await getClips(sessionId as string);
        setClips(ensureClipsArray(clipsData));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('Failed to load session data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, showToast]);

  const setupPolling = useCallback(() => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    if (!sessionId) return;

    console.log('Setting up polling for session:', sessionId);
    
    const interval = setInterval(async () => {
      // Only poll if WebSocket is not connected and session is active
      if (!wsConnected && status?.status === 'active') {
        try {
          const statusData = await getStatus(sessionId as string);
          setStatus(statusData);
        } catch (error) {
          console.error('Polling failed:', error);
        }
      }
    }, 30000); // Poll every 30 seconds (increased from 15 to reduce calls)
    
    pollingRef.current = interval;
  }, [sessionId, wsConnected, status?.status]);

  useEffect(() => {
    if (!sessionId) return;

    loadData();
    setupWebSocket();
    setupPolling();

    return cleanupConnections;
  }, [sessionId, loadData, setupWebSocket, setupPolling, cleanupConnections]);

  useEffect(() => {
    if (status && status?.clips_generated > lastClipCount && lastClipCount > 0) {
      showViral();
      // Only load clips if websocket didn't already update them
      if (!wsConnected) {
        loadClipsOnly();
      }
    }
    if (status) {
      setLastClipCount(status?.clips_generated || 0);
    }
  }, [status, lastClipCount, showViral, wsConnected, loadClipsOnly]);

  const handlePreviewClip = (clip: Clip) => {
    setSelectedClip(clip);
  };

  const handleClosePreview = () => {
    setSelectedClip(null);
  };

  const handleStopMonitoring = async () => {
    try {
      await stopMonitoring(sessionId as string);
      showToast('Monitoring stopped', 'success');
      localStorage.removeItem('currentSessionId');
      cleanupConnections();
      router.push('/app');
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      showToast('Failed to stop monitoring', 'error');
    }
  };

  const handleMakeClip = () => {
    showToast('Manual clip generation coming soon!', 'info');
  };

  const refreshClips = async () => {
    try {
      const clipsData = await getClips(sessionId as string);
      setClips(ensureClipsArray(clipsData));
      showToast('Clips refreshed', 'success');
    } catch (error) {
      console.error('Failed to refresh clips:', error);
      showToast('Failed to refresh clips', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80">Loading session data...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Session not found or failed to load</p>
          <button
            onClick={() => router.push('/app')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              >
                HypeClip
              </button>
              <div className="text-white/60">•</div>
              <div>
                <div className="font-medium">{status?.channel || "Unknown Channel"}</div>
                <div className="text-sm text-white/60">Session {sessionId?.toString().slice(0, 8)}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* WebSocket Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                wsConnected 
                  ? 'bg-green-900/30 text-green-400' 
                  : 'bg-yellow-900/30 text-yellow-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                }`}></div>
                <span>{wsConnected ? 'Live' : 'Polling'}</span>
              </div>

              {/* Session Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                status?.status === 'active' 
                  ? 'bg-green-900/30 text-green-400' 
                  : 'bg-red-900/30 text-red-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  status?.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="capitalize">{status?.status || "unknown"}</span>
              </div>
              
              <button
                onClick={handleStopMonitoring}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Stop Monitoring
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Chat Pulse */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
              <div className="flex justify-center mb-4">
                <PulseRing chatSpeed={status?.chat_speed || 0} />
              </div>
            </div>

            {/* Live Metrics */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Live Metrics</h3>
              <Metrics
                chatSpeed={status?.chat_speed || 0}
                viralScore={status?.viral_score || 0}
                clipsGenerated={status?.clips_generated || 0}
                revenue={status?.revenue || 0}
              />
            </div>

            {/* Primary Action */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
              <button
                onClick={handleMakeClip}
                className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Make Clip (30s)
              </button>
              <p className="text-xs text-white/60 mt-2 text-center">
                Manual clip generation • Auto-clips happen automatically
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-semibold">Recent Clips</h3>
                  {clips.length > 0 && (
                    <span className="px-2 py-1 bg-white/10 text-white/80 text-sm rounded-full">
                      {clips.length} clips
                    </span>
                  )}
                </div>
                <button
                  onClick={refreshClips}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
                >
                  Refresh
                </button>
              </div>

              {ensureClipsArray(clips).length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🎬</div>
                  <h4 className="text-lg font-medium mb-2">No clips yet</h4>
                  <p className="text-white/60">
                    Clips will appear here automatically when viral moments are detected.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {ensureClipsArray(clips).map((clip) => (
                    <ClipCard
                      key={clip.clip_id}
                      clip={clip}
                      sessionId={sessionId as string}
                      onPreview={handlePreviewClip}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Video Preview Modal */}
      <VideoModal
        isOpen={!!selectedClip}
        onClose={handleClosePreview}
        clip={selectedClip || undefined}
        videoUrl={selectedClip ? `${API}/api/download/${sessionId}/${selectedClip.clip_id}` : ''}
      />
    </div>
  );
}
