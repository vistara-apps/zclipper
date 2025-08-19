'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { API } from '@/lib/api';
import Navigation from '@/components/Navigation';

interface ChatMessage {
  message: string;
  timestamp: string;
  isViral?: boolean;
}

interface ChatData {
  messages: string[];
  velocity: number;
  viral_score: number;
  timestamp: string;
  channel: string;
}

export default function LiveChatPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatVelocity, setChatVelocity] = useState(0);
  const [viralScore, setViralScore] = useState(0);
  const [channel, setChannel] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch session info on mount
  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const response = await fetch(`${API}/api/status/${sessionId}`);
        if (response.ok) {
          const sessionData = await response.json();
          setChannel(sessionData.channel);
        }
      } catch (error) {
        console.log('Could not fetch session info:', error);
      }
    };
    
    if (sessionId) {
      fetchSessionInfo();
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    // Connect to WebSocket for real-time chat data
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
    const wsUrl = apiBase.replace('http://', 'ws://').replace('https://', 'wss://') + `/ws/live-data/${sessionId}`;
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to chat WebSocket');
      setIsConnected(true);
      
      // Add a test message to show connection is working
      setChatMessages(prev => [...prev, {
        message: "🔗 Connected to live chat feed",
        timestamp: new Date().toLocaleTimeString(),
        isViral: false
      }]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        if (data.type === 'chat_data') {
          const chatData: ChatData = data.data;
          setChannel(chatData.channel);
          setChatVelocity(chatData.velocity);
          setViralScore(chatData.viral_score);
          
          // Add new messages
          const newMessages: ChatMessage[] = chatData.messages.map(msg => ({
            message: msg,
            timestamp: new Date().toLocaleTimeString(),
            isViral: chatData.viral_score > 8
          }));
          
          setChatMessages(prev => {
            const updated = [...prev, ...newMessages];
            // Keep only last 50 messages for performance
            return updated.slice(-50);
          });
        } else if (data.type === 'session_update') {
          // Handle session updates to get channel name
          if (data.data?.channel) {
            setChannel(data.data.channel);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket data:', error);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from chat WebSocket');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const getScoreColor = (score: number) => {
    if (score > 15) return 'text-red-400';
    if (score > 8) return 'text-orange-400';
    if (score > 5) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getScoreEmoji = (score: number) => {
    if (score > 15) return '🔥🔥🔥';
    if (score > 8) return '🔥🔥';
    if (score > 5) return '🔥';
    return '💬';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      {/* Navigation */}
      <Navigation />
      
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-white/60">Live Chat Feed</span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              isConnected ? 'bg-green-900/30 border border-green-400/20' : 'bg-red-900/30 border border-red-400/20'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Channel Info */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">#{channel || 'Loading...'}</h1>
          <p className="text-white/70">Real-time chat analysis and viral detection</p>
        </div>

        {/* Stats Bar */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-900/50 to-cyan-800/30 backdrop-blur-md border border-blue-400/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-blue-200 font-medium">Chat Velocity</h3>
              <span className="text-2xl">💬</span>
            </div>
            <div className="text-2xl font-bold text-white">{chatVelocity}</div>
            <div className="text-sm text-blue-300">messages/sec</div>
          </div>

          <div className="bg-gradient-to-br from-orange-900/50 to-red-800/30 backdrop-blur-md border border-orange-400/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-orange-200 font-medium">Viral Score</h3>
              <span className="text-2xl">{getScoreEmoji(viralScore)}</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(viralScore)}`}>{viralScore}</div>
            <div className="text-sm text-orange-300">viral intensity</div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-pink-800/30 backdrop-blur-md border border-purple-400/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-purple-200 font-medium">Messages</h3>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-2xl font-bold text-white">{chatMessages.length}</div>
            <div className="text-sm text-purple-300">in feed</div>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="bg-black/30 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🔴 Live Chat Feed
              {viralScore > 10 && <span className="text-red-400 animate-pulse">VIRAL MOMENT!</span>}
            </h2>
          </div>
          
          <div 
            ref={chatContainerRef}
            className="h-96 overflow-y-auto p-4 space-y-2"
          >
            {chatMessages.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <div className="text-4xl mb-4">💬</div>
                <p>Waiting for chat messages...</p>
                {!isConnected && (
                  <p className="text-red-400 mt-2">Connection issue - trying to reconnect...</p>
                )}
              </div>
            ) : (
              chatMessages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    msg.isViral 
                      ? 'bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-400/20' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs text-white/40 mt-1 min-w-[60px]">
                    {msg.timestamp}
                  </div>
                  <div className="flex-1">
                    <div className={`${msg.isViral ? 'text-red-200 font-medium' : 'text-white/90'}`}>
                      {msg.message}
                    </div>
                  </div>
                  {msg.isViral && (
                    <div className="text-red-400 animate-pulse">🔥</div>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Chat Input Simulation */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 text-white/50">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-sm font-bold">
                AI
              </div>
              <div className="flex-1 text-sm">
                AI is monitoring chat for viral moments... 
                {viralScore > 8 && <span className="text-red-400 ml-2">🔥 High viral activity detected!</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}