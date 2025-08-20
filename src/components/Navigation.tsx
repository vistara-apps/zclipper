'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useToast } from './Toast';

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  // Function to handle creating a clip now
  const createClipNow = useCallback(async () => {
    try {
      showToast('Creating clip now! 🎬', 'info');
      
      const response = await fetch('https://zclipper-api-62092339396.us-central1.run.app/api/create-clip-now', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer demo-token-${Date.now()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        showToast(`✅ ${result.message}`, 'success');
      } else {
        const error = await response.json();
        showToast(`❌ ${error.detail || 'Failed to create clip'}`, 'error');
      }
    } catch {
      showToast('❌ Network error creating clip', 'error');
    }
  }, [showToast]);

  // Add global hotkey listener for Shift+C
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Shift+C was pressed
      if (event.shiftKey && event.key === 'C') {
        createClipNow();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [createClipNow]);

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: '📊',
      description: 'Monitor streams'
    },
    { 
      name: 'Clips', 
      path: '/clips', 
      icon: '🎬',
      description: 'View clips'
    },
    { 
      name: 'Create Clip', 
      path: '/create-clip', 
      icon: '✂️',
      description: 'Create custom clips'
    },
    { 
      name: 'Start', 
      path: '/app', 
      icon: '🚀',
      description: 'New stream'
    }
  ];

  return (
    <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <button
            onClick={() => router.push('/')}
            className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            ZClipper AI
          </button>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`px-4 py-2 rounded-lg transition-all font-medium flex items-center gap-2 ${
                  pathname === item.path
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.name}</span>
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={createClipNow}
              className="px-3 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
              title="Shortcut: Shift+C"
            >
              🎬 Clip Now
            </button>
            <button
              onClick={() => router.push('/clips')}
              className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-colors text-sm font-medium"
            >
              💥 Clips
            </button>
            <button
              onClick={() => router.push('/app')}
              className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-colors text-sm font-medium"
            >
              + Stream
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
