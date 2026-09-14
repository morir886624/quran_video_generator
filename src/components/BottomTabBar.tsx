'use client';

import React from 'react';
import { BookOpen, Video, Mic2, Settings } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: 'reader' | 'studio' | 'reciters';
  setActiveTab: (tab: 'reader' | 'studio' | 'reciters') => void;
  selectedVersesCount: number;
  onOpenSettings: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  setActiveTab,
  selectedVersesCount,
  onOpenSettings,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B1329]/95 backdrop-blur-lg border-t border-slate-800/90 safe-bottom">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {/* Reader Tab */}
        <button
          onClick={() => setActiveTab('reader')}
          className={`flex flex-col items-center justify-center gap-1 w-16 transition-all active:scale-95 ${
            activeTab === 'reader'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 font-medium'
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

        {/* Video Studio Tab (Center Spotlight) */}
        <button
          onClick={() => setActiveTab('studio')}
          className={`relative flex flex-col items-center justify-center gap-1 w-20 transition-all active:scale-95 ${
            activeTab === 'studio'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`relative p-2 rounded-2xl transition-all shadow-lg ${
              activeTab === 'studio'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-950/60'
                : 'bg-slate-800 text-slate-300'
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

        {/* Reciters Tab */}
        <button
          onClick={() => setActiveTab('reciters')}
          className={`flex flex-col items-center justify-center gap-1 w-16 transition-all active:scale-95 ${
            activeTab === 'reciters'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'reciters' ? 'bg-emerald-500/10' : ''
            }`}
          >
            <Mic2 className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Reciters</span>
        </button>

        {/* Settings Tab */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center gap-1 w-16 text-slate-400 hover:text-slate-200 transition-all active:scale-95"
        >
          <div className="p-1 rounded-xl">
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Settings</span>
        </button>
      </div>
    </nav>
  );
};

