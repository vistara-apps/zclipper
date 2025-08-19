'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clip, getDownloadUrl } from '@/lib/api';

interface ClipCardProps {
  clip: Clip;
  sessionId: string;
  onPreview?: (clip: Clip) => void;
}

export default function ClipCard({ clip, sessionId, onPreview }: ClipCardProps) {
  const [imageError, setImageError] = useState(false);

  const handlePreview = () => {
    onPreview?.(clip);
  };

  const formatDuration = (seconds: number) => {
    return `${seconds}s`;
  };

  const formatSize = (mb: number) => {
    return `${mb.toFixed(1)}MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = () => {
    switch (clip.status) {
      case 'ready':
        return 'text-green-400';
      case 'processing':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-white/60';
    }
  };

  const getStatusIcon = () => {
    switch (clip.status) {
      case 'ready':
        return '✅';
      case 'processing':
        return '⏳';
      case 'error':
        return '❌';
      default:
        return '⚪';
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Thumbnail */}
      <div className="aspect-video bg-black/50 relative group cursor-pointer" onClick={() => onPreview?.(clip)}>
        {clip.thumbnail_url && !imageError ? (
          <Image
            src={clip.thumbnail_url}
            alt="Clip thumbnail"
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="text-4xl text-white/30 mb-2">🎬</div>
            <div className="text-xs text-white/50 text-center">
              {clip.filename || 'Clip Video'}
            </div>
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent ml-1"></div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute top-2 right-2">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm ${getStatusColor()}`}>
            <span className="text-xs">{getStatusIcon()}</span>
            <span className="text-xs font-medium capitalize">{clip.status}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{formatDate(clip.created_at)}</span>
          <div className="flex items-center space-x-2">
            <span>{formatDuration(clip.duration)}</span>
            <span>•</span>
            <span>{formatSize(clip.size_mb)}</span>
          </div>
        </div>

        {/* Viral metrics */}
        {(clip.viral_score !== undefined || clip.chat_velocity !== undefined) && (
          <div className="flex items-center justify-between text-xs">
            {clip.viral_score !== undefined && (
              <div className="flex items-center space-x-1 text-orange-400">
                <span>🔥</span>
                <span>{clip.viral_score}/100</span>
              </div>
            )}
            {clip.chat_velocity !== undefined && (
              <div className="flex items-center space-x-1 text-blue-400">
                <span>💬</span>
                <span>{clip.chat_velocity} msg/min</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {/* Preview button */}
          <button
            onClick={handlePreview}
            className="block w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors text-center mb-2"
          >
            Preview Video
          </button>

          {/* Download button */}
          {clip.status === 'ready' && (
            <a
              href={getDownloadUrl(sessionId, clip.clip_id)}
              download
              className="block w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors text-center"
            >
              Download
            </a>
          )}

          {/* Social share buttons (stub) */}
          <div className="grid grid-cols-3 gap-2">
            <button 
              className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white/60 text-xs font-medium rounded transition-colors"
              disabled
            >
              TikTok
            </button>
            <button 
              className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white/60 text-xs font-medium rounded transition-colors"
              disabled
            >
              X
            </button>
            <button 
              className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white/60 text-xs font-medium rounded transition-colors"
              disabled
            >
              IG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
