'use client';

import { useEffect, useRef, useState } from 'react';
import { Clip } from '@/lib/api';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip?: Clip;
  videoUrl?: string;
  title?: string;
}

export default function VideoModal({ isOpen, onClose, clip, videoUrl, title }: VideoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      setIsLoading(true);
      setHasError(false);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-black rounded-xl overflow-hidden max-w-4xl w-full mx-4 max-h-[90vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        {(title || clip) && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
            <h3 className="text-white font-medium">
              {title || `Clip ${clip?.clip_id.slice(0, 8)}`}
            </h3>
            {clip && (
              <div className="text-white/60 text-sm mt-1">
                {new Date(clip.created_at).toLocaleString()} • {clip.duration}s • {clip.size_mb.toFixed(1)}MB
              </div>
            )}
          </div>
        )}

        {/* Video content */}
        <div className="relative">
          {isLoading && (
            <div className="w-full h-64 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/80">Loading video...</p>
              </div>
            </div>
          )}
          
          {hasError && (
            <div className="w-full h-64 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">❌</div>
                <p className="text-white/80 mb-2">Failed to load video</p>
                <p className="text-white/60 text-sm">The video may not be available or the server is down</p>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            className={`w-full h-auto max-h-[80vh] ${isLoading || hasError ? 'hidden' : ''}`}
            controls
            autoPlay
            playsInline
            onLoadStart={() => setIsLoading(true)}
            onCanPlay={handleVideoLoad}
            onError={handleVideoError}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Footer actions for clips */}
        {clip && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Download
                </button>
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors">
                  Share
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/60 text-sm font-medium rounded transition-colors"
                  disabled
                >
                  Post to TikTok
                </button>
                <button 
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/60 text-sm font-medium rounded transition-colors"
                  disabled
                >
                  Post to X
                </button>
                <button 
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/60 text-sm font-medium rounded transition-colors"
                  disabled
                >
                  Post to IG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
