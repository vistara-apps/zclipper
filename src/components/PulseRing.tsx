'use client';

import { useEffect, useState } from 'react';

interface PulseRingProps {
  chatSpeed: number; // 0-150+
  size?: number;
}

export default function PulseRing({ chatSpeed, size = 120 }: PulseRingProps) {
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    // Map chat_speed (0-150+) to percentage (0-100)
    const newPercentage = Math.min((chatSpeed / 150) * 100, 100);
    setPercentage(newPercentage);
  }, [chatSpeed]);

  // Color based on percentage: blue -> purple -> green
  const getColor = () => {
    if (percentage <= 33) {
      return 'text-blue-400';
    } else if (percentage <= 66) {
      return 'text-purple-400';
    } else {
      return 'text-green-400';
    }
  };

  const getStrokeColor = () => {
    if (percentage <= 33) {
      return '#60a5fa'; // blue-400
    } else if (percentage <= 66) {
      return '#c084fc'; // purple-400
    } else {
      return '#4ade80'; // green-400
    }
  };

  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-white/10"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={getStrokeColor()}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
            style={{
              filter: 'drop-shadow(0 0 8px currentColor)',
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-2xl font-bold ${getColor()} drop-shadow-lg`}>
            {Math.round(percentage)}%
          </div>
          <div className="text-xs text-white/60 font-medium tracking-wider">
            PULSE
          </div>
        </div>

        {/* Animated pulse effects */}
        {percentage > 60 && (
          <>
            <div 
              className="absolute inset-0 rounded-full border-2 border-green-400/30 animate-ping"
              style={{ 
                animationDuration: `${2 - (percentage / 100)}s`,
                animationDelay: '0.5s'
              }}
            />
            <div 
              className="absolute inset-2 rounded-full border border-green-400/20 animate-ping"
              style={{ 
                animationDuration: `${1.5 - (percentage / 150)}s`,
                animationDelay: '0.2s'
              }}
            />
          </>
        )}
      </div>
      
      <div className="text-center">
        <div className="text-sm text-white/80 font-medium">Chat Pulse</div>
        <div className="text-xs text-white/50">{chatSpeed} msg/min</div>
      </div>
    </div>
  );
}
