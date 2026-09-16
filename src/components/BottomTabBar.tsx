'use client';

import React from 'react';
import { BookOpen, Video, Film, Settings } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: 'reader' | 'studio' | 'creations' | 'settings';
  setActiveTab: (tab: 'reader' | 'studio' | 'creations' | 'settings') => void;
  selectedVersesCount: number;
  creationsCount?: number;
  onOpenSettings?: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  setActiveTab,
  selectedVersesCount,
  creationsCount = 0,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B1329]/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/90 transition-colors safe-bottom">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {/* 1. Reader Page */}
        <button
          onClick={() => setActiveTab('reader')}
          className={`flex flex-col items-center justify-center gap-1 w-16 transition-all active:scale-95 ${
            activeTab === 'reader'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'reader' ? 'bg-emerald-500/10' : ''
            }`}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Reader</span>
        </button>

        {/* 2. Video Studio Page (Center Spotlight) */}
        <button
          onClick={() => setActiveTab('studio')}
          className={`relative flex flex-col items-center justify-center gap-1 w-20 transition-all active:scale-95 ${
            activeTab === 'studio'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`relative p-2 rounded-2xl transition-all shadow-lg ${
              activeTab === 'studio'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-950/30 dark:shadow-emerald-950/60'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Video className="w-5 h-5" />
            {selectedVersesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[9px] flex items-center justify-center shadow">
                {selectedVersesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Studio</span>
        </button>

        {/* 3. Creations Page */}
        <button
          onClick={() => setActiveTab('creations')}
          className={`relative flex flex-col items-center justify-center gap-1 w-16 transition-all active:scale-95 ${
            activeTab === 'creations'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`relative p-1 rounded-xl transition-all ${
              activeTab === 'creations' ? 'bg-emerald-500/10' : ''
            }`}
          >
            <Film className="w-5 h-5" />
            {creationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white font-bold text-[8px] flex items-center justify-center shadow">
                {creationsCount > 9 ? '9+' : creationsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Creations</span>
        </button>

        {/* 4. Settings Page */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center gap-1 w-16 transition-all active:scale-95 ${
            activeTab === 'settings'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'settings' ? 'bg-emerald-500/10' : ''
            }`}
          >
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Settings</span>
        </button>
      </div>
    </nav>
  );
};
