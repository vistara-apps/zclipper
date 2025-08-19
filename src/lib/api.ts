export const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export interface Session {
  session_id: string;
  channel: string;
  status: 'active' | 'stopped' | 'error';
  created_at: string;
}

export interface SessionStatus {
  session_id: string;
  channel: string;
  status: 'active' | 'stopped' | 'error';
  chat_speed: number;
  viral_score: number;
  clips_generated: number;
  revenue: number;
  created_at: string;
  last_updated: string;
}

export interface Clip {
  clip_id: string;
  session_id: string;
  created_at: string;
  duration: number;
  size_mb: number;
  thumbnail_url?: string;
  status: 'processing' | 'ready' | 'error';
  filename?: string; // Add filename field
  viral_score?: number; // Add viral score
  chat_velocity?: number; // Add chat velocity
}

// Backend response interface
export interface BackendClip {
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
}

// Transform backend clip to frontend clip
export function transformBackendClip(backendClip: BackendClip, sessionId: string): Clip {
  return {
    clip_id: backendClip.id,
    session_id: sessionId,
    created_at: backendClip.created_at,
    duration: backendClip.duration,
    size_mb: backendClip.size_mb,
    thumbnail_url: undefined, // Backend doesn't provide thumbnails yet
    status: 'ready' as const, // Assume all clips are ready since they're generated
    filename: backendClip.filename,
    viral_score: backendClip.viral_score,
    chat_velocity: backendClip.chat_velocity,
  };
}

export interface WSMessage {
  type: 'session_update' | 'clip_generated' | 'error';
  data: {
    session_id: string;
    chat_speed?: number;
    viral_score?: number;
    clips_generated?: number;
    revenue?: number;
    clip?: BackendClip; // Updated to use BackendClip
    message?: string;
  };
}

// Get or create demo user token (use existing token if available)
async function getDemoToken(): Promise<string> {
  // Check if we already have a token that's less than 1 hour old
  const existingToken = localStorage.getItem('demo_token');
  const tokenTimestamp = localStorage.getItem('demo_token_timestamp');
  
  if (existingToken && tokenTimestamp) {
    const now = Date.now();
    const tokenAge = now - parseInt(tokenTimestamp);
    const oneHour = 60 * 60 * 1000;
    
    if (tokenAge < oneHour) {
      console.log('Using existing demo token:', existingToken);
      return existingToken;
    }
  }
  
  // Create a new token if none exists or it's expired
  const token = 'demo-token-' + Date.now();
  localStorage.setItem('demo_token', token);
  localStorage.setItem('demo_token_timestamp', Date.now().toString());
  console.log('Created new demo token:', token);
  
  return token;
}

export async function startMonitoring(channel: string): Promise<{ session_id: string }> {
  try {
    const token = await getDemoToken();
    console.log('Using token:', token);
    
    const response = await fetchWithTimeout(`${API}/api/start-monitoring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ channel }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to start monitoring' }));
      throw new Error(error.detail || `HTTP ${response.status}: Failed to start monitoring`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Please check your connection and try again');
      }
      throw error;
    }
    throw new Error('Unknown error occurred while starting monitoring');
  }
}

export async function getStatus(sessionId: string): Promise<SessionStatus> {
  try {
    const response = await fetchWithTimeout(`${API}/api/status/${sessionId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to get status' }));
      throw new Error(error.detail || `HTTP ${response.status}: Failed to get status`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Unable to fetch status');
      }
      throw error;
    }
    throw new Error('Unknown error occurred while fetching status');
  }
}

export async function getClips(sessionId: string): Promise<Clip[]> {
  try {
    const apiUrl = `${API}/api/clips/${sessionId}`;
    
    const response = await fetchWithTimeout(apiUrl);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to get clips' }));
      throw new Error(error.detail || `HTTP ${response.status}: Failed to get clips`);
    }

    const data = await response.json();
    
    // Handle the backend response structure
    if (data && typeof data === 'object' && 'clips' in data && Array.isArray(data.clips)) {
      const transformedClips = data.clips.map((backendClip: BackendClip) => 
        transformBackendClip(backendClip, sessionId)
      );
      return transformedClips;
    } else if (Array.isArray(data)) {
      // Fallback: if response is directly an array
      const transformedClips = data.map((backendClip: BackendClip) => 
        transformBackendClip(backendClip, sessionId)
      );
      return transformedClips;
    } else {
      return [];
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Clips request timeout, returning empty array');
        return [];
      }
      throw error;
    }
    throw new Error('Unknown error occurred while fetching clips');
  }
}

export async function stopMonitoring(sessionId: string): Promise<void> {
  const response = await fetch(`${API}/api/stop-monitoring/${sessionId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to stop monitoring' }));
    throw new Error(error.detail || 'Failed to stop monitoring');
  }
}

// Simple cache for sessions to prevent duplicate requests
let sessionsCache: { data: Session[]; timestamp: number } | null = null;
const SESSIONS_CACHE_TTL = 2000; // 2 seconds cache

export async function getSessions(): Promise<Session[]> {
  // Check cache first
  if (sessionsCache && Date.now() - sessionsCache.timestamp < SESSIONS_CACHE_TTL) {
    console.log('Returning cached sessions data');
    return sessionsCache.data;
  }
  
  const response = await fetchWithTimeout(`${API}/api/sessions`, {}, 10000); // 10s timeout

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get sessions' }));
    throw new Error(error.detail || 'Failed to get sessions');
  }

  const data = await response.json();
  
  // Update cache
  sessionsCache = {
    data,
    timestamp: Date.now()
  };
  
  return data;
}

// Helper function to add timeout to fetch requests
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API}/health`, {}, 3000);
    return response.ok;
  } catch (error) {
    console.warn('Health check failed:', error);
    return false;
  }
}

export function getDownloadUrl(sessionId: string, clipId: string): string {
  return `${API}/api/download/${sessionId}/${clipId}`;
}

export function wsUrl(sessionId: string): string {
  return `${API.replace('http', 'ws')}/ws/live-data/${sessionId}`;
}
