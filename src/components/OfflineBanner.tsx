'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  onRetry?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onRetry }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [showReconnectedToast, setShowReconnectedToast] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial check
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnectedToast(true);
        const timer = setTimeout(() => setShowReconnectedToast(false), 3000);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowReconnectedToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    try {
      // Quick ping test
      const res = await fetch('https://api.quran.com/api/v4/chapters', {
        method: 'HEAD',
        cache: 'no-store',
      }).catch(() => null);

      if (res && res.ok) {
        setIsOnline(true);
        setShowReconnectedToast(true);
        setTimeout(() => setShowReconnectedToast(false), 3000);
        onRetry?.();
      }
    } finally {
      setTimeout(() => setIsRetrying(false), 600);
    }
  };

  if (isOnline && !showReconnectedToast) {
    return null;
  }

  return (
    <aside
      aria-label="Network status banner"
      className="fixed top-0 inset-x-0 z-50 pointer-events-auto transition-all duration-300 ease-in-out"
    >
      {!isOnline ? (
        <div className="bg-amber-500/95 dark:bg-amber-600/95 text-white backdrop-blur-md px-4 py-2 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 font-medium">
            <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span>Offline Mode • Using cached Surahs &amp; local creations</span>
          </div>
          <button
            onClick={handleManualRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white active:scale-95 transition-all cursor-pointer disabled:opacity-50 text-[11px] font-semibold"
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Checking...' : 'Retry'}</span>
          </button>
        </div>
      ) : showReconnectedToast ? (
        <div className="bg-emerald-600/95 text-white backdrop-blur-md px-4 py-2 text-xs flex items-center justify-center gap-2 shadow-md animate-in fade-in duration-200">
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium">Connection Restored • Back online</span>
        </div>
      ) : null}
    </aside>
  );
};

