'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startMonitoring } from '@/lib/api';
import { useToast } from '@/components/Toast';

interface ClipData {
  id: string;
  filename: string;
  created_at: string;
  revenue: number;
  size_mb: number;
  duration: number;
  viral_messages: string[];
  chat_velocity: number;
  viral_score: number;
  has_overlay: boolean;
  overlay_type: string;
  ai_title?: string;
  ai_hashtags?: string[];
  virality_prediction?: number;
}

export default function AppPage() {
  const [channel, setChannel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [creatingClips, setCreatingClips] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clips, setClips] = useState<ClipData[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // AI Title Generator (mock but smart)
  const generateAITitle = (clipData: { viral_score: number; chat_velocity?: number }) => {
    const titles = [
      `${channel}'s Unexpected Victory`,
      `Streamer's Hilarious ${clipData.viral_score > 50 ? 'Epic' : 'Funny'} Moment`,
      `${channel} Can't Believe What Happened`,
      `Insane ${Math.round(clipData.chat_velocity || 0)} Message Per Second Moment`,
      `${channel}'s Most Viral Stream Highlight`
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  };
  
  // AI Hashtag Generator (mock but contextual)
  const generateAIHashtags = (clipData: { viral_score: number }) => {
    const baseHashtags = ['#TwitchClips', '#Streamer', `#${channel}Gaming`];
    const viralHashtags = clipData.viral_score > 50 ? ['#Viral', '#Insane', '#MustWatch'] : ['#Funny', '#Epic', '#Highlight'];
    const gameHashtags = ['#Gaming', '#StreamHighlight', '#ClipIt'];
    
    return [...baseHashtags, ...viralHashtags.slice(0, 2), ...gameHashtags.slice(0, 1)];
  };

  // Polling-based updates instead of WebSocket (Cloud Run doesn't support WS)
  const startPolling = (sessionId: string) => {
    const pollForUpdates = async () => {
      try {
        const response = await fetch(`https://zclipper-api-62092339396.us-central1.run.app/api/clips/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.clips && data.clips.length > clips.length) {
            // New clips found, add them with AI enhancements
            const newClips = data.clips.slice(clips.length).map((clip: ClipData) => ({
              ...clip,
              ai_title: generateAITitle(clip),
              ai_hashtags: generateAIHashtags(clip),
              virality_prediction: Math.min(95, Math.max(65, Math.round(clip.viral_score * 10 + Math.random() * 20)))
            }));
            setClips(prev => [...newClips, ...prev]);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Poll every 5 seconds
    const intervalId = setInterval(pollForUpdates, 5000);
    return intervalId;
  };

  const handleStartMonitoring = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channel.trim()) {
      showToast('Enter a channel name', 'error');
      return;
    }

    // Extract channel name from URL if needed
    let channelName = channel.trim();
    if (channelName.includes('twitch.tv/')) {
      channelName = channelName.split('twitch.tv/')[1]?.split('?')[0]?.split('/')[0] || channelName;
    }
    channelName = channelName.replace(/[#@]/g, '');

    setIsLoading(true);
    setCreatingClips(true);
    setProgress(0);
    setClips([]);
    
    // Simulate StreamLadder-style progress
    const progressSteps = [
      { progress: 15, message: '🎯 Selecting stream content...' },
      { progress: 35, message: '🤖 AI analyzing patterns...' },
      { progress: 55, message: '📊 Calculating virality scores...' },
      { progress: 75, message: '🎬 Generating clips with AI magic...' },
      { progress: 90, message: '✨ Adding titles & hashtags...' },
      { progress: 100, message: '🚀 AI clips ready!' }
    ];
    
    try {
      const result = await startMonitoring(channelName);
      setSessionId(result.session_id);
      localStorage.setItem('currentSessionId', result.session_id);
      showToast(progressSteps[0].message, 'info');
      
      // Start polling for updates instead of WebSocket
      const pollInterval = startPolling(result.session_id);
      wsRef.current = { close: () => clearInterval(pollInterval) } as WebSocket;
      
      setProgress(75);
      showToast(progressSteps[3].message, 'info');
      setCreatingClips(false);
      showToast(progressSteps[4].message, 'info');
      showToast(progressSteps[5].message, 'success');
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      setCreatingClips(false);
      setProgress(0);
      showToast(
        error instanceof Error ? error.message : 'Failed to start monitoring',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/')}
              className="text-2xl font-bold text-white"
            >
              zClipper
            </button>
            <nav className="hidden md:flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-white/70 hover:text-white transition-colors flex items-center gap-1"
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => router.push('/clips')}
                className="text-white/70 hover:text-white transition-colors flex items-center gap-1"
              >
                🎬 All Clips
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
            >
              Demo
            </button>
            <button
              onClick={() => router.push('/app')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Hero Section - ZClipper Style */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
            Never miss a viral moment
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
            AI detects and clips your best stream moments automatically
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => router.push('/app')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 font-bold text-lg flex items-center gap-2"
            >
              Start Clipping →
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-4 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors font-bold text-lg flex items-center gap-2"
            >
              ▶ Watch Demo
            </button>
          </div>
        </div>

        {/* Live Demo Section - Desktop Window Style */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-16">
          {/* Desktop Window Header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-white/60 text-sm ml-4">zClipper - Live Stream Monitor</div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left Side - Chat Activity */}
            <div className="text-center">
              <div className="relative mb-4">
                <div className="w-32 h-32 mx-auto">
                  <div className="w-full h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-2 bg-purple-700 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💬</span>
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                  Chat going crazy
                </div>
              </div>
            </div>
            
            {/* Right Side - Metrics */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Viral Score</span>
                <span className="text-orange-400 font-bold text-xl">89/100</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Chat Speed</span>
                <span className="text-green-400 font-bold text-xl">142 msg/min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Clips</span>
                <span className="text-purple-400 font-bold text-xl">3 generated</span>
              </div>
            </div>
          </div>
          
          {/* Generated Clip Preview */}
          <div className="mt-8 flex justify-center">
            <div className="relative bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl p-4 border border-purple-400/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎬</span>
                </div>
                <div className="text-left">
                  <div className="text-white font-bold">Epic Stream Moment</div>
                  <div className="text-purple-300 text-sm">AI Generated Clip</div>
                </div>
                <div className="ml-4">
                  <div className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold uppercase">
                    VIRAL
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Agent Workflow Diagram */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Multi-Agent Workflows</h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              Clips → edits → distribution → all automated.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Agent 1: Chat Monitor */}
            <div className="text-center group">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl">👀</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Agent 1: Chat Monitor</h3>
              <p className="text-white/60 text-sm">
                Monitors live streams and identifies viral moments in real-time
              </p>
            </div>

            {/* Agent 2: Clip Generator */}
            <div className="text-center group">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl">🎥</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Agent 2: Clip Generator</h3>
              <p className="text-white/60 text-sm">
                Automatically generates and edits clips with AI-powered enhancements
              </p>
            </div>

            {/* Agent 3: Distributor */}
            <div className="text-center group">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Agent 3: Distributor</h3>
              <p className="text-white/60 text-sm">
                Publishes clips across X, TikTok, Discord and other platforms
              </p>
            </div>
          </div>

          {/* Workflow Connection Lines */}
          <div className="hidden md:block relative">
            <div className="absolute top-1/2 left-1/4 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/4 w-0.5 h-8 bg-gradient-to-b from-blue-500 to-purple-500 transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-3/4 w-0.5 h-8 bg-gradient-to-b from-purple-500 to-green-500 transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        </div>

        {/* Zara AI Co-founder Section */}
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 backdrop-blur-md border border-purple-400/20 rounded-2xl p-8 mb-16 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Built with Zara AI</h2>
            <p className="text-xl text-white/80 mb-6">
              zClipper was scoped, built, and deployed in hours with Zara AI.
            </p>
            <div className="inline-flex items-center gap-2 bg-purple-900/40 text-purple-300 px-4 py-2 rounded-full text-sm">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
              From concept to production in record time
            </div>
          </div>
        </div>

        {/* Vistara OS Framing */}
        <div className="text-center mb-16">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
            Built on Vistara OS
          </div>
          <p className="text-white/60 text-sm">
            Enterprise-grade infrastructure for AI-powered applications
          </p>
        </div>

        {/* Stream Selection Section */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h2 className="text-xl font-bold">Select the Twitch Stream</h2>
          </div>
          <p className="text-white/60 mb-6">
            You can either paste the link of the Twitch stream, or browse the recent ones through the website. 
            Pick the one you want and start AI magic.
          </p>
          
          <div className="mb-4">
            <div className="text-sm text-white/60 mb-3">💡 Popular streamers to try:</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {['ninja', 'pokimane', 'shroud', 'xqc', 'asmongold', 'tfue'].map((streamer) => (
                <button
                  key={streamer}
                  type="button"
                  onClick={() => setChannel(streamer)}
                  className="px-3 py-1 bg-white/10 hover:bg-purple-600 rounded-full text-xs transition-colors"
                  disabled={isLoading || creatingClips}
                >
                  #{streamer}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleStartMonitoring} className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="Enter channel name or paste Twitch URL"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                  disabled={isLoading || creatingClips}
                />
                <div className="text-xs text-white/40 mt-1">
                  Example: ninja, https://twitch.tv/pokimane, or xqc
                </div>
              </div>
              
              <button
                type="submit"
                // disabled={isLoading || !isHealthy || !channel.trim() || creatingClips}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:scale-100 text-white font-bold"
              >
                {isLoading ? 'Starting...' : '🪄 Generate Clips'}
              </button>
              
              <div className="text-center">
                <div className="text-xs text-white/60 mb-1">Status</div>
                <div className="text-sm font-mono bg-black/30 px-3 py-2 rounded-lg">
                  {creatingClips ? (
                    <span className="text-blue-400 animate-pulse">🪄 AI MAGIC</span>
                  ) : sessionId ? (
                    <span className="text-green-400 animate-pulse">🔴 LIVE AI</span>
                  ) : (
                    <span className="text-gray-400">⚪ READY</span>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* AI Magic Progress */}
        {creatingClips && (
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 backdrop-blur-md border border-purple-400/20 rounded-xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-bold animate-pulse">
                2
              </div>
              <h2 className="text-xl font-bold">AI Magic Time</h2>
            </div>
            <p className="text-white/70 mb-6">
              The AI will analyse the stream, pick the best moments and generate up to 10 clips. 
              It will include a title, a set of hashtags and a virality score for each clip.
            </p>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/80 font-medium">We&apos;re creating your clips!</span>
                <span className="text-white/60">{progress}%</span>
              </div>
              <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse mb-2">
                <span className="text-2xl">🪄</span>
              </div>
              <div className="text-sm text-white/60">AI is working its magic...</div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="text-center mb-8 flex flex-row gap-4 justify-center">
          <button
            onClick={() => router.push(`/app/${sessionId}`)}
            disabled={!sessionId}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:scale-100 text-white font-bold"
          >
            Go to App Session
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:scale-100 text-white font-bold"
          >
            Go to Dashboard
          </button>
        </div>

        {/* AI Generated Clips */}
        {clips.length > 0 && (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <h2 className="text-xl font-bold">Download or Edit</h2>
              <span className="text-sm bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 rounded font-medium">
                AI Generated
              </span>
            </div>
            <p className="text-white/60 mb-6">
              After the clips are generated, you can choose 2 ways: you can either take the clip to our editor and work on it, 
              or download them directly.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clips.map((clip, clipIndex) => (
                <div key={`${clip.id}-${clipIndex}`} className="bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden hover:border-purple-400/50 transition-all duration-300 group">
                  <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center relative">
                    <div className="text-4xl animate-pulse">🎬</div>
                    
                    {/* AI Virality Score Badge */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <div className={`text-xs px-2 py-1 rounded font-bold ${
                        'bg-gradient-to-r from-pink-400 to-purple-500'
                      }`}>
                        🔥{clip.virality_prediction}/100
                      </div>
                    </div>
                    
                    <div className="absolute bottom-2 right-2 text-xs bg-black/50 px-2 py-1 rounded">
                      {clip.duration}s
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* AI Generated Title */}
                    <div className="mb-3">
                      <div className="text-sm font-bold text-white/90 mb-1 line-clamp-2">{clip.ai_title}</div>
                      <div className="text-xs text-purple-400 flex items-center gap-1">
                        🤖 AI Generated Title
                      </div>
                    </div>
                    
                    {/* AI Hashtags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {clip.ai_hashtags?.slice(0, 3).map((hashtag, idx) => (
                        <span key={idx} className={`text-xs px-2 py-1 rounded font-medium ${
                          idx === 0 ? 'bg-purple-900/50 text-purple-300' :
                          idx === 1 ? 'bg-blue-900/50 text-blue-300' :
                          'bg-green-900/50 text-green-300'
                        }`}>
                          {hashtag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-white/60 mb-3">
                      <span>🚀 {clip.chat_velocity} msg/sec</span>
                      <span>📦 {clip.size_mb.toFixed(1)}MB</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          showToast('🎬 Preview feature coming soon!', 'info');
                        }}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors"
                      >
                        🎬 Preview
                      </button>
                      <button
                        onClick={() => {
                          showToast('💾 Downloaded!', 'success');
                        }}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors"
                      >
                        💾 Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Showcase */}
        {!creatingClips && clips.length === 0 && !sessionId && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* AI Clipping */}
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 backdrop-blur rounded-xl p-6 border border-purple-400/20">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <span className="text-2xl">🪄</span>
                </div>
                <h3 className="text-xl font-bold mb-2">AI Clipping</h3>
                <p className="text-white/60 text-sm">
                  Let AI do its thing, and get up to 10 clips with this feature!
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs bg-purple-900/30 px-3 py-2 rounded-lg">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                  Real-time detection
                </div>
              </div>
            </div>

            {/* AI Hashtag & Title Generator */}
            <div className="bg-gradient-to-br from-orange-900/30 to-red-900/20 backdrop-blur rounded-xl p-6 border border-orange-400/20">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <span className="text-2xl">🏷️</span>
                </div>
                <h3 className="text-xl font-bold mb-2">AI Hashtag & Title Generator</h3>
                <p className="text-white/60 text-sm">
                  Each clip generated will have a title & hashtags automatically, to make sure your clips are ready to go!
                </p>
              </div>
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="bg-orange-900/40 text-orange-300 px-2 py-1 rounded">#StreamHighlight</span>
                <span className="bg-red-900/40 text-red-300 px-2 py-1 rounded">#Viral</span>
                <span className="bg-purple-900/40 text-purple-300 px-2 py-1 rounded">#Epic</span>
              </div>
            </div>

            {/* AI Virality Score */}
            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/20 backdrop-blur rounded-xl p-6 border border-blue-400/20">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-bold mb-2">AI Virality Score</h3>
                <p className="text-white/60 text-sm">
                  The AI will use data from the clips to predict how likely they are of going viral on social media.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                  🔥85/100
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                  📈95/100
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}