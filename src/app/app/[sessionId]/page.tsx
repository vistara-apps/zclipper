'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getStatus, getClips, stopMonitoring, type SessionStatus, type Clip, API } from '@/lib/api';
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
  // WebSocket removed - using polling instead
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const loadClipsOnly = useCallback(async () => {
    if (!sessionId) return;
    try {
      const clipsData = await getClips(sessionId as string);
      setClips(ensureClipsArray(clipsData));
    } catch (error) {
      console.error('Failed to load clips:', error);
    }
  }, [sessionId]);

  // WebSocket message handling removed - using polling instead

  const cleanupConnections = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Polling for session updates (WebSocket removed for Cloud Run compatibility)
  const setupPollingUpdates = useCallback(() => {
    if (!sessionId) return;

    const pollData = async () => {
      try {
        // Poll for status updates
        const statusData = await getStatus(sessionId as string);
        setStatus(prev => {
          if (!prev) return statusData;
          
          // Check if clips count increased
          if (statusData.clips_generated > prev.clips_generated) {
            // New clips detected, refresh clips
            loadClipsOnly();
          }
          
          return statusData;
        });
      } catch (error) {
        console.error('Polling failed:', error);
      }
    };

    // Initial poll
    pollData();
    
    // Set up interval
    const interval = setInterval(pollData, 3000); // Poll every 3 seconds for responsiveness
    pollingRef.current = interval;
    
    return interval;
  }, [sessionId, loadClipsOnly]);

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

  // Removed old polling function - using setupPollingUpdates instead

  useEffect(() => {
    if (!sessionId) return;

    loadData();
    setupPollingUpdates();

    return cleanupConnections;
  }, [sessionId, loadData, setupPollingUpdates, cleanupConnections]);

  useEffect(() => {
    if (status && status?.clips_generated > lastClipCount && lastClipCount > 0) {
      showViral();
    }
    if (status) {
      setLastClipCount(status?.clips_generated || 0);
    }
  }, [status, lastClipCount, showViral, loadClipsOnly]);

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

  const handleMakeClip = async () => {
    try {
      showToast('Creating clip now! 🎬', 'info');
      
      const response = await fetch(`${API}/api/create-clip-now`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer demo-token-${Date.now()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        showToast(`✅ ${result.message}`, 'success');
        // Refresh clips after creation
        setTimeout(() => loadClipsOnly(), 2000);
      } else {
        const error = await response.json();
        showToast(`❌ ${error.detail || 'Failed to create clip'}`, 'error');
      }
    } catch {
      showToast('❌ Network error creating clip', 'error');
    }
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
                ZClipper AI
              </button>
              <div className="text-white/60">•</div>
              <div>
                <div className="font-medium">{status?.channel || "Unknown Channel"}</div>
                <div className="text-sm text-white/60">Session {sessionId?.toString().slice(0, 8)}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-blue-900/30 text-blue-400">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <span>Live Polling</span>
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
                🎬 Clip Now (30s)
              </button>
              <p className="text-xs text-white/60 mt-2 text-center">
                Manual clip generation • Shortcut: Shift+C • Auto-clips happen automatically
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
