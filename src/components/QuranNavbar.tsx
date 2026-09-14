'use client';

import React from 'react';
import { Chapter } from '@/types/quran';
import { BookOpen, ChevronDown, Video, Sparkles } from 'lucide-react';

interface QuranNavbarProps {
  currentChapter: Chapter | null;
  onOpenSurahDrawer: () => void;
  activeTab: 'reader' | 'studio' | 'reciters';
  setActiveTab: (tab: 'reader' | 'studio' | 'reciters') => void;
  selectedVersesCount: number;
}

export const QuranNavbar: React.FC<QuranNavbarProps> = ({
  currentChapter,
  onOpenSurahDrawer,
  activeTab,
  setActiveTab,
  selectedVersesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B1329]/95 backdrop-blur-md border-b border-slate-800/80 safe-top">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Left: Quran.com Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 font-bold text-base sm:text-lg tracking-tight text-white">
              <span>Quran</span>
              <span className="text-emerald-400">.com</span>
              <span className="ml-1 text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Video
              </span>
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:block">
              Shorts & Reels Studio
            </span>
          </div>
        </div>

        {/* Center: Surah Selector Pill */}
        <button
          onClick={onOpenSurahDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 text-xs sm:text-sm font-medium text-slate-200 transition-all active:scale-95 shadow-sm"
        >
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center justify-center">
            {currentChapter?.id || 1}
          </span>
          <span className="font-semibold text-white truncate max-w-[110px] sm:max-w-[160px]">
            {currentChapter?.name_simple || 'Al-Fatihah'}
          </span>
          <span className="text-slate-400 font-serif text-xs hidden sm:inline">
            {currentChapter?.name_arabic}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Right: Studio CTA or Switcher */}
        <div className="flex items-center gap-2">
          {activeTab !== 'studio' ? (
            <button
              onClick={() => setActiveTab('studio')}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-950/40 transition-all active:scale-95"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Studio</span>
              {selectedVersesCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white text-emerald-700 font-bold text-[10px]">
                  {selectedVersesCount}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('reader')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium border border-slate-700 transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Back to</span>
              <span>Reader</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

