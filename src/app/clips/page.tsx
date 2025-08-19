'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { API } from '@/lib/api';
import PricingModal from '@/components/PricingModal';
import Navigation from '@/components/Navigation';

interface ClipFile {
  filename: string;
  created_at: string;
  size_mb: number;
  duration: number;
  url: string;
  thumbnail_url?: string;
  reel_thumbnail_url?: string;
  type?: string;
  is_premium?: boolean;
  available?: boolean;
  viral_score?: number;
}

export default function ClipsGalleryPage() {
  const [clips, setClips] = useState<ClipFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<ClipFile | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const router = useRouter();
  
  // Count free clips
  const freeClips = clips.filter(clip => !clip.is_premium).length;

  useEffect(() => {
    // Only load clips once when component mounts
    loadAllClips();
    
    // Cleanup function
    return () => {
      // Cleanup if needed
    };
  }, []); // Empty dependency array - only run once

  const loadAllClips = async () => {
    try {
      // Use the API constant and add proper URL construction
      const response = await fetch(`${API}/api/all-clips`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=60', // Cache for 1 minute
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Transform the clips data to include full URLs
        const transformedClips = (data.clips || []).map((clip: ClipFile) => ({
          ...clip,
          // Ensure URLs are absolute
          url: clip.url.startsWith('http') ? clip.url : `${API}${clip.url}`,
          thumbnail_url: clip.thumbnail_url ? 
            (clip.thumbnail_url.startsWith('http') ? clip.thumbnail_url : `${API}${clip.thumbnail_url}`) : 
            undefined,
          reel_thumbnail_url: clip.reel_thumbnail_url ? 
            (clip.reel_thumbnail_url.startsWith('http') ? clip.reel_thumbnail_url : `${API}${clip.reel_thumbnail_url}`) : 
            undefined
        }));
        setClips(transformedClips);
      }
    } catch (error) {
      console.error('Failed to load clips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading explosive moments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      {/* Navigation */}
      <Navigation />
      
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">💥 Explosive Moments</h1>
            <p className="text-white/60">Your automatically captured viral clips</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-white/70">
              {clips.length} clips ({freeClips}/3 free)
            </span>
            {freeClips >= 3 && (
              <button
                onClick={() => setShowPricing(true)}
                className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg transition-colors text-sm font-medium"
              >
                ⭐ Upgrade Now
              </button>
            )}
            <button
              onClick={loadAllClips}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => router.push('/app')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Start Monitoring
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">💥 Moments</h1>
          <p className="text-white/70">
            Your collection of automatically captured explosive moments
          </p>
        </div>

        {clips.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-xl font-medium mb-2">No clips yet</h2>
            <p className="text-white/60 mb-6">Start monitoring a stream to capture explosive moments</p>
            <button
              onClick={() => router.push('/app')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Start Monitoring
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {clips.map((clip) => (
              <div
                key={clip.filename}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden hover:border-purple-500/50 transition-all cursor-pointer transform hover:scale-105"
                onClick={() => {
                  if (clip.is_premium) {
                    setShowPricing(true);
                  } else {
                    setSelectedClip(clip);
                  }
                }}
              >
                {/* Video Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-purple-900/30 to-pink-900/30 flex items-center justify-center relative overflow-hidden">
                  {(clip.reel_thumbnail_url || clip.thumbnail_url) ? (
                    <Image 
                      src={(clip.reel_thumbnail_url || clip.thumbnail_url) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNjY2NjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'} 
                      alt={clip.filename}
                      fill
                      className="object-cover"
                      onError={() => {
                        // Fallback handled by next/image automatically
                      }}
                      unoptimized={true}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                      <div className="text-white/50 text-4xl">🎬</div>
                    </div>
                  )}
                  
                  {/* Show reel indicator if it's a reel thumbnail */}
                  {clip.type === 'reel_preview' && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-xs px-2 py-1 rounded font-medium">
                      🎞️ REEL
                    </div>
                  )}
                  
                  {/* Premium overlay */}
                  {clip.is_premium && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-3">
                          <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <div className="text-white font-bold text-sm">Premium Clip</div>
                        <div className="text-white/80 text-xs">Upgrade to access</div>
                      </div>
                    </div>
                  )}
                  
                  {!clip.is_premium && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2 bg-black/50 text-xs px-2 py-1 rounded">
                    {clip.duration}s
                  </div>
                  <div className="absolute bottom-2 left-2 text-xs bg-gradient-to-r from-orange-500 to-red-500 px-2 py-1 rounded font-medium">
                    🔥 HOT
                  </div>
                </div>

                {/* Clip Info */}
                <div className="p-4">
                  <h3 className="font-medium mb-2 truncate">
                    {clip.filename.replace('.mp4', '')}
                  </h3>
                  <div className="flex justify-between text-sm text-white/60 mb-2">
                    <span>{formatDate(clip.created_at)}</span>
                    <span>{formatFileSize(clip.size_mb)}</span>
                  </div>
                  <div className="flex space-x-2">
                    {clip.is_premium ? (
                      <div className="w-full bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded px-2 py-1 text-xs text-center">
                        ⭐ Premium - Upgrade to Download
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded px-2 py-1 text-xs text-center">
                          📱 TikTok
                        </div>
                        <div className="flex-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded px-2 py-1 text-xs text-center">
                          🐦 X/Twitter
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Video Modal */}
      {selectedClip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">{selectedClip.filename.replace('.mp4', '')}</h2>
              <button
                onClick={() => setSelectedClip(null)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Video Player */}
            <div className="p-6">
              <video
                src={selectedClip.url}
                controls
                autoPlay
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '60vh' }}
              >
                Your browser does not support the video tag.
              </video>
              
              {/* Clip Details */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-white/60">Duration</div>
                  <div className="font-medium">{selectedClip.duration}s</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-white/60">Size</div>
                  <div className="font-medium">{formatFileSize(selectedClip.size_mb)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-white/60">Created</div>
                  <div className="font-medium">{formatDate(selectedClip.created_at)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-white/60">Format</div>
                  <div className="font-medium">MP4</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3 justify-center">
                <a
                  href={selectedClip.url}
                  download={selectedClip.filename}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 17v2h18v-2H3zM12 2v12l-4-4h8l-4 4z"/>
                  </svg>
                  <span>Download</span>
                </a>
                
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API}/api/upload-clip-to-phyght`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clipFilename: selectedClip.filename })
                      });
                      const result = await response.json();
                      if (result.success) {
                        alert('🌐 Clip uploaded to Phyght platform!');
                      } else {
                        alert(`❌ Upload failed: ${result.message}`);
                      }
                    } catch (error) {
                      console.error('Upload error:', error);
                      alert('❌ Upload error');
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-medium transition-all inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/>
                  </svg>
                  <span>Upload to Phyght</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      <PricingModal 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
        currentClips={freeClips}
      />
    </div>
  );
}