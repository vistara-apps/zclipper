'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VideoModal from '@/components/VideoModal';

export default function Home() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const router = useRouter();

  // Sample viral clips data with actual video files
  const viralClips = [
    {
      id: '1',
      video: '/viral_clips/VIRAL_CLIP_1_142601.mp4',
      title: 'Epic Stream Moment',
      viralScore: 89,
      chatSpeed: '142 msg/min',
      duration: '15s',
      isViral: true
    },
    {
      id: '2', 
      video: '/viral_clips/VIRAL_CLIP_2_142632.mp4',
      title: 'Insane Chat Reaction',
      viralScore: 94,
      chatSpeed: '189 msg/min',
      duration: '12s',
      isViral: true
    },
    {
      id: '3',
      video: '/viral_clips/VIRAL_CLIP_1_141659.mp4',
      title: 'Streamer Can\'t Believe It',
      viralScore: 87,
      chatSpeed: '156 msg/min',
      duration: '18s',
      isViral: false
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-black to-blue-900/10"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)]"></div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-white">
            zClipper
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDemoModal(true)}
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

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-none">
            Never miss a{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              viral
            </span>{' '}
            moment
          </h1>
          
          <p className="text-xl md:text-2xl text-white/70 mb-12 max-w-2xl mx-auto">
            AI detects and clips your best stream moments automatically
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => router.push('/app')}
              className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 animate-glow relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/50 to-pink-600/50 animate-shimmer"></div>
              <span className="relative flex items-center gap-2">
                Start Clipping →
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            
            <button
              onClick={() => setShowDemoModal(true)}
              className="px-8 py-4 border border-white/20 hover:bg-white/10 rounded-xl font-bold text-lg transition-all duration-300 backdrop-blur-sm"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Watch Demo
              </span>
            </button>
          </div>
        </div>

        {/* Live Stream Monitor - Real Video Clips Section */}
        <div className="mt-16 max-w-6xl mx-auto w-full">
          <div className="relative rounded-2xl border border-white/20 bg-black/40 backdrop-blur-md overflow-hidden">
            {/* Desktop Window Header */}
            <div className="absolute top-4 left-4 flex gap-2 z-20">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="absolute top-4 left-16 text-white/60 text-sm z-20">zClipper - Live Stream Monitor</div>
            
            <div className="p-8 pt-16">
              {/* Live Stats Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Chat Activity Indicator */}
                <div className="text-center">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 mx-auto">
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
                
                {/* Live Metrics */}
                <div className="space-y-4 flex flex-col justify-center">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Viral Score</span>
                    <span className="text-green-400 font-bold text-xl">89/100</span>
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

                {/* Live Status */}
                <div className="flex flex-col justify-center items-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-2 animate-pulse">
                    <span className="text-2xl">🔴</span>
                  </div>
                  <div className="text-green-400 font-bold text-sm">LIVE</div>
                  <div className="text-white/60 text-xs">Streaming now</div>
                </div>
              </div>
              
              {/* Real Viral Clips Grid with Videos */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Live Generated Clips
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {viralClips.map((clip) => (
                    <div key={clip.id} className="group relative bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl overflow-hidden border border-white/10 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
                      {/* Video Element */}
                      <div className="aspect-video relative overflow-hidden">
                        <video 
                          src={clip.video}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          muted
                          loop
                          autoPlay
                          playsInline
                        />
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <span className="text-white text-xl">▶</span>
                          </div>
                        </div>
                        
                        {/* Duration Badge */}
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {clip.duration}
                        </div>
                        
                        {/* Viral Badge */}
                        {clip.isViral && (
                          <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold uppercase animate-pulse">
                            VIRAL
                          </div>
                        )}
                      </div>
                      
                      {/* Clip Info */}
                      <div className="p-3">
                        <div className="text-white font-bold text-sm mb-1 line-clamp-1">{clip.title}</div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-purple-300">🔥 {clip.viralScore}/100</span>
                          <span className="text-green-300">{clip.chatSpeed}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Activity Feed */}
              <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-4 border border-purple-400/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-white/80 text-sm font-medium">Live Activity</span>
                </div>
                <div className="space-y-2 text-xs text-white/60">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">🎬</span>
                    <span>New clip generated: &quot;Epic Stream Moment&quot;</span>
                    <span className="text-green-400">+2s ago</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">📊</span>
                    <span>Viral score updated: 89 → 94</span>
                    <span className="text-green-400">+5s ago</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-pink-400">🚀</span>
                    <span>Clip auto-distributed to X & TikTok</span>
                    <span className="text-green-400">+8s ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black mb-8">
            How it works
          </h2>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-purple-900/10 to-blue-900/10 rounded-2xl p-8 border border-white/10">
              <p className="text-xl text-white/70">
                Our AI monitors your streams in real-time, automatically detecting viral moments and generating optimized clips for maximum engagement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Simple and visual */}
      <section className="relative z-10 py-20 px-6 bg-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Pricing</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-white/10 rounded-2xl p-6 bg-white/5 backdrop-blur">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <div className="text-3xl font-bold mb-4">$0</div>
                <p className="text-white/60 mb-6">Try it out</p>
                <ul className="space-y-2 text-sm text-white/70 mb-6">
                  <li>✓ 10 clips/month</li>
                  <li>✓ Basic quality</li>
                  <li>✓ Community support</li>
                </ul>
                <button 
                  onClick={() => router.push('/app')}
                  className="w-full py-2 border border-white/20 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Start Free
                </button>
              </div>
            </div>

            <div className="border border-purple-400 rounded-2xl p-6 bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-xs px-3 py-1 rounded-full">
                Popular
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Creator</h3>
                <div className="text-3xl font-bold mb-4">$29<span className="text-sm text-white/60">/mo</span></div>
                <p className="text-white/60 mb-6">For streamers</p>
                <ul className="space-y-2 text-sm text-white/70 mb-6">
                  <li>✓ Unlimited clips</li>
                  <li>✓ HD quality</li>
                  <li>✓ Auto-posting</li>
                  <li>✓ Priority support</li>
                </ul>
                <button 
                  onClick={() => router.push('/app')}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Start Trial
                </button>
              </div>
            </div>

            <div className="border border-white/10 rounded-2xl p-6 bg-white/5 backdrop-blur">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Agency</h3>
                <div className="text-3xl font-bold mb-4">$99<span className="text-sm text-white/60">/mo</span></div>
                <p className="text-white/60 mb-6">For teams</p>
                <ul className="space-y-2 text-sm text-white/70 mb-6">
                  <li>✓ Everything in Creator</li>
                  <li>✓ Team features</li>
                  <li>✓ White-label</li>
                  <li>✓ API access</li>
                </ul>
                <button className="w-full py-2 border border-white/20 hover:bg-white/10 rounded-lg transition-colors">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-white/60">
        <p>&copy; 2024 HypeClip. Built for creators.</p>
      </footer>

      {/* Video Modal */}
      <VideoModal 
        isOpen={showDemoModal} 
        onClose={() => setShowDemoModal(false)}
        videoUrl="/demo-video.mp4"
        title="zClipper Demo"
      />
    </div>
  );
}