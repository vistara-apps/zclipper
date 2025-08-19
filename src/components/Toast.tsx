'use client';

import { useEffect, useState } from 'react';

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'viral';
  duration?: number;
  onRemove: (id: string) => void;
}

export default function Toast({ id, message, type, duration = 4000, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Fade in
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto remove
    const removeTimer = setTimeout(() => {
      setIsRemoving(true);
      setTimeout(() => onRemove(id), 300);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(removeTimer);
    };
  }, [id, duration, onRemove]);

  const getToastStyles = () => {
    const baseStyles = "flex items-center space-x-3 p-4 rounded-xl border backdrop-blur-sm max-w-md transition-all duration-300";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-900/50 border-green-400/20 text-green-100`;
      case 'error':
        return `${baseStyles} bg-red-900/50 border-red-400/20 text-red-100`;
      case 'viral':
        return `${baseStyles} bg-gradient-to-r from-red-900/50 to-orange-900/50 border-red-400/20 text-white animate-pulse`;
      default:
        return `${baseStyles} bg-blue-900/50 border-blue-400/20 text-blue-100`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'viral':
        return '🔥';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      className={`${getToastStyles()} ${
        isVisible && !isRemoving
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="text-lg">{getIcon()}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={() => {
          setIsRemoving(true);
          setTimeout(() => onRemove(id), 300);
        }}
        className="text-white/60 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

// Toast Provider/Context
interface ToastContextType {
  showToast: (message: string, type?: ToastProps['type']) => void;
  showViral: () => void;
}

import { createContext, useContext, ReactNode } from 'react';

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (message: string, type: ToastProps['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastProps = {
      id,
      message,
      type,
      onRemove: removeToast,
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showViral = () => {
    addToast('VIRAL DETECTED 🔥', 'viral');
  };

  return (
    <ToastContext.Provider value={{ showToast: addToast, showViral }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
