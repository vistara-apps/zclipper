'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { useToast } from '@/components/Toast';
import { API } from '@/lib/api';

// Define clip duration presets
const DURATION_PRESETS: Array<{ label: string; value: number | 'custom' }> = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: 'Custom', value: 'custom' }
];

// Define social platforms
const SOCIAL_PLATFORMS = [
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'from-blue-600 to-blue-700' },
  { id: 'tiktok', name: 'TikTok', icon: '📱', color: 'from-pink-600 to-purple-700' },
  { id: 'youtube', name: 'YouTube Shorts', icon: '▶️', color: 'from-red-600 to-red-700' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'from-purple-600 to-pink-600' }
];

// Define text overlay positions
const TEXT_POSITIONS = [
  { id: 'top', label: 'Top' },
  { id: 'center', label: 'Center' },
  { id: 'bottom', label: 'Bottom' }
];

// Define visual effects
const VISUAL_EFFECTS = [
  { id: 'none', label: 'None', icon: '⚪' },
  { id: 'highlight', label: 'Highlight Border', icon: '🔆' },
  { id: 'zoom', label: 'Zoom Effect', icon: '🔍' },
  { id: 'blur', label: 'Background Blur', icon: '🌫️' }
];

export default function CreateClipPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const startHandleRef = useRef<HTMLDivElement>(null);
  const endHandleRef = useRef<HTMLDivElement>(null);
  
  // State for video source and upload
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // State for clip settings
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState<number | 'custom'>(DURATION_PRESETS[0].value);
  const [customDuration, setCustomDuration] = useState(15);
  
  // State for text overlay
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [textPosition, setTextPosition] = useState(TEXT_POSITIONS[2].id);
  const [textColor, setTextColor] = useState('#FFFFFF');
  
  // State for visual effects
  const [selectedEffect, setSelectedEffect] = useState(VISUAL_EFFECTS[0].id);
  
  // State for social sharing
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  
  // State for processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedClipUrl, setProcessedClipUrl] = useState<string | null>(null);
  
  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if file is a video
    if (!file.type.startsWith('video/')) {
      showToast('Please upload a video file', 'error');
      return;
    }
    
    // Check file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      showToast('File size exceeds 500MB limit', 'error');
      return;
    }
    
    // Create object URL for the video
    const objectUrl = URL.createObjectURL(file);
    setVideoSource(objectUrl);
    
    // Simulate upload progress
    setIsUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        showToast('Video uploaded successfully!', 'success');
      }
    }, 100);
    
    // Reset clip settings
    setClipStart(0);
    setClipEnd(0);
    setSelectedDuration(DURATION_PRESETS[0].value);
  };
  
  // Handle video loaded metadata
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      
      // Set default clip end to either 15 seconds or video duration
      const defaultEnd = Math.min(15, duration);
      setClipEnd(defaultEnd);
    }
  };
  
  // Update clip end when duration preset changes
  useEffect(() => {
    if (selectedDuration !== 'custom' && videoRef.current) {
      const newEnd = Math.min(clipStart + selectedDuration, videoDuration);
      setClipEnd(newEnd);
    }
  }, [selectedDuration, clipStart, videoDuration]);
  
  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const clickTime = clickPosition * videoDuration;
    
    // Set video current time
    videoRef.current.currentTime = clickTime;
  };
  
  // Format time in MM:SS format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate clip duration
  const clipDuration = clipEnd - clipStart;
  
  // Handle start handle drag
  const handleStartDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const handleStartDrag = (moveEvent: MouseEvent) => {
      const position = (moveEvent.clientX - rect.left) / rect.width;
      const newStart = Math.max(0, Math.min(clipEnd - 1, position * videoDuration));
      setClipStart(newStart);
      
      if (videoRef.current) {
        videoRef.current.currentTime = newStart;
      }
    };
    
    const handleStopDrag = () => {
      document.removeEventListener('mousemove', handleStartDrag);
      document.removeEventListener('mouseup', handleStopDrag);
    };
    
    document.addEventListener('mousemove', handleStartDrag);
    document.addEventListener('mouseup', handleStopDrag);
  };
  
  // Handle end handle drag
  const handleEndDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const handleEndDrag = (moveEvent: MouseEvent) => {
      const position = (moveEvent.clientX - rect.left) / rect.width;
      const newEnd = Math.max(clipStart + 1, Math.min(videoDuration, position * videoDuration));
      setClipEnd(newEnd);
      
      if (videoRef.current) {
        videoRef.current.currentTime = newEnd;
      }
    };
    
    const handleStopDrag = () => {
      document.removeEventListener('mousemove', handleEndDrag);
      document.removeEventListener('mouseup', handleStopDrag);
    };
    
    document.addEventListener('mousemove', handleEndDrag);
    document.addEventListener('mouseup', handleStopDrag);
  };
  
  // Toggle platform selection
  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };
  
  // Handle clip creation
  const handleCreateClip = async () => {
    if (!videoSource) {
      showToast('Please upload a video first', 'error');
      return;
    }
    
    if (clipDuration < 1) {
      showToast('Clip duration must be at least 1 second', 'error');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Simulate clip processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // In a real implementation, you would send the clip data to the server
      // For now, we'll just simulate a successful response
      setProcessedClipUrl(videoSource);
      showToast('Clip created successfully!', 'success');
    } catch (error) {
      console.error('Error creating clip:', error);
      showToast('Failed to create clip', 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle clip sharing
  const handleShareClip = async () => {
    if (!processedClipUrl || selectedPlatforms.length === 0) {
      showToast('Please create a clip and select at least one platform', 'error');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Simulate sharing process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would send the sharing request to the server
      showToast(`Clip shared to ${selectedPlatforms.length} platform(s)!`, 'success');
      
      // Redirect to clips page after sharing
      router.push('/clips');
    } catch (error) {
      console.error('Error sharing clip:', error);
      showToast('Failed to share clip', 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      {/* Navigation */}
      <Navigation />
      
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">✂️ Create Clip</h1>
            <p className="text-white/60">Create and share high-quality clips</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/clips')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              View My Clips
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Video Preview */}
          <div className="lg:col-span-2">
            <div className="bg-black/30 rounded-xl border border-white/10 overflow-hidden">
              {!videoSource ? (
                // Video Upload UI
                <div className="aspect-video flex flex-col items-center justify-center p-8">
                  <div className="text-6xl mb-4">📤</div>
                  <h3 className="text-xl font-medium mb-4">Upload your video</h3>
                  <p className="text-white/60 text-center mb-6 max-w-md">
                    Upload a video to create a clip. Supported formats: MP4, MOV, AVI, WEBM
                  </p>
                  <label className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg cursor-pointer hover:from-purple-700 hover:to-pink-700 transition-all">
                    <input 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    {isUploading ? 'Uploading...' : 'Select Video'}
                  </label>
                  
                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="w-full max-w-md mt-6">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <div className="text-right text-sm text-white/60 mt-1">
                        {uploadProgress}%
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Video Player with Timeline
                <div className="relative">
                  {/* Video Element */}
                  <div className="relative aspect-video bg-black">
                    <video
                      ref={videoRef}
                      src={videoSource}
                      className="w-full h-full object-contain"
                      controls
                      onLoadedMetadata={handleVideoLoaded}
                    />
                    
                    {/* Text Overlay Preview */}
                    {showTextOverlay && overlayText && (
                      <div 
                        className={`absolute left-0 right-0 text-center px-4 py-2 font-bold text-xl drop-shadow-lg ${
                          textPosition === 'top' ? 'top-4' : 
                          textPosition === 'center' ? 'top-1/2 transform -translate-y-1/2' : 
                          'bottom-4'
                        }`}
                        style={{ color: textColor }}
                      >
                        {overlayText}
                      </div>
                    )}
                    
                    {/* Visual Effect Preview */}
                    {selectedEffect === 'highlight' && (
                      <div className="absolute inset-0 border-8 border-yellow-500/50 pointer-events-none"></div>
                    )}
                    {selectedEffect === 'blur' && (
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-none"></div>
                    )}
                    {selectedEffect === 'zoom' && (
                      <div className="absolute inset-0 scale-110 pointer-events-none"></div>
                    )}
                  </div>
                  
                  {/* Timeline */}
                  <div className="p-4 bg-black/50">
                    <div className="mb-2 flex justify-between text-sm text-white/70">
                      <span>Start: {formatTime(clipStart)}</span>
                      <span>Duration: {formatTime(clipDuration)}</span>
                      <span>End: {formatTime(clipEnd)}</span>
                    </div>
                    
                    <div 
                      ref={timelineRef}
                      className="h-8 bg-white/10 rounded-lg relative cursor-pointer"
                      onClick={handleTimelineClick}
                    >
                      {/* Clip Selection Area */}
                      <div 
                        className="absolute top-0 bottom-0 bg-purple-600/50"
                        style={{ 
                          left: `${(clipStart / videoDuration) * 100}%`,
                          right: `${100 - (clipEnd / videoDuration) * 100}%`
                        }}
                      ></div>
                      
                      {/* Start Handle */}
                      <div 
                        ref={startHandleRef}
                        className="absolute top-0 bottom-0 w-4 bg-purple-600 rounded-l-lg cursor-ew-resize"
                        style={{ left: `${(clipStart / videoDuration) * 100}%`, marginLeft: '-2px' }}
                        onMouseDown={handleStartDrag}
                      ></div>
                      
                      {/* End Handle */}
                      <div 
                        ref={endHandleRef}
                        className="absolute top-0 bottom-0 w-4 bg-purple-600 rounded-r-lg cursor-ew-resize"
                        style={{ left: `${(clipEnd / videoDuration) * 100}%`, marginLeft: '-2px' }}
                        onMouseDown={handleEndDrag}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Duration Presets */}
            {videoSource && (
              <div className="mt-6 bg-white/5 rounded-xl border border-white/10 p-4">
                <h3 className="text-lg font-medium mb-3">Clip Duration</h3>
                <div className="flex flex-wrap gap-3">
                  {DURATION_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        selectedDuration === preset.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                      onClick={() => setSelectedDuration(preset.value)}
                    >
                      {preset.label}
                    </button>
                  ))}
                  
                  {selectedDuration === 'custom' && (
                    <div className="flex items-center gap-2 ml-2">
                      <input
                        type="number"
                        min="1"
                        max={Math.floor(videoDuration)}
                        value={customDuration}
                        onChange={e => {
                          const value = parseInt(e.target.value);
                          setCustomDuration(value);
                          const newEnd = Math.min(clipStart + value, videoDuration);
                          setClipEnd(newEnd);
                        }}
                        className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-center text-white"
                      />
                      <span className="text-white/70">seconds</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Clip Settings */}
          <div>
            {videoSource && (
              <div className="space-y-6">
                {/* Text Overlay */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium">Text Overlay</h3>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showTextOverlay}
                        onChange={e => setShowTextOverlay(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-5 rounded-full ${showTextOverlay ? 'bg-purple-600' : 'bg-white/20'} relative transition-colors`}>
                        <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-transform ${showTextOverlay ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                      </div>
                    </label>
                  </div>
                  
                  {showTextOverlay && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Text</label>
                        <input
                          type="text"
                          value={overlayText}
                          onChange={e => setOverlayText(e.target.value)}
                          placeholder="Enter text overlay"
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Position</label>
                        <div className="flex gap-2">
                          {TEXT_POSITIONS.map(position => (
                            <button
                              key={position.id}
                              className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                                textPosition === position.id
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-white/10 text-white/70 hover:bg-white/20'
                              }`}
                              onClick={() => setTextPosition(position.id)}
                            >
                              {position.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-white/70 mb-1">Color</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={textColor}
                            onChange={e => setTextColor(e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <span className="text-sm">{textColor}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Visual Effects */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <h3 className="text-lg font-medium mb-3">Visual Effects</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {VISUAL_EFFECTS.map(effect => (
                      <button
                        key={effect.id}
                        className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          selectedEffect === effect.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                        onClick={() => setSelectedEffect(effect.id)}
                      >
                        <span>{effect.icon}</span>
                        <span>{effect.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Social Sharing */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <h3 className="text-lg font-medium mb-3">Share To</h3>
                  <div className="space-y-2">
                    {SOCIAL_PLATFORMS.map(platform => (
                      <div
                        key={platform.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 ${
                          selectedPlatforms.includes(platform.id)
                            ? `bg-gradient-to-r ${platform.color} text-white`
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                        onClick={() => togglePlatform(platform.id)}
                      >
                        <span className="text-xl">{platform.icon}</span>
                        <span>{platform.name}</span>
                        {selectedPlatforms.includes(platform.id) && (
                          <span className="ml-auto">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleCreateClip}
                    disabled={isProcessing || !videoSource}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : processedClipUrl ? (
                      <>
                        <span>✓</span>
                        Clip Created
                      </>
                    ) : (
                      <>
                        <span>✂️</span>
                        Create Clip
                      </>
                    )}
                  </button>
                  
                  {processedClipUrl && (
                    <button
                      onClick={handleShareClip}
                      disabled={isProcessing || selectedPlatforms.length === 0}
                      className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Sharing...
                        </>
                      ) : (
                        <>
                          <span>🚀</span>
                          Share Clip
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => router.push('/clips')}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
