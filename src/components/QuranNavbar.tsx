'use client';

import React from 'react';
import { Chapter } from '@/types/quran';
import { ChevronDown, Sun, Moon } from 'lucide-react';
import { QuranLogo } from './QuranLogo';

interface QuranNavbarProps {
  currentChapter: Chapter | null;
  onOpenSurahDrawer: () => void;
  activeTab?: 'reader' | 'studio' | 'creations' | 'settings';
  setActiveTab: (tab: 'reader' | 'studio' | 'creations' | 'settings') => void;
  selectedVersesCount?: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const QuranNavbar: React.FC<QuranNavbarProps> = ({
  currentChapter,
  onOpenSurahDrawer,
  setActiveTab,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0B1329]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors safe-top">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Left: Quran Logo (Returns to Reader) */}
        <button
          onClick={() => setActiveTab('reader')}
          title="Return to Reader"
          className="flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer select-none hover:opacity-85 active:scale-95 transition-all text-left"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/25 dark:border-emerald-500/30 flex items-center justify-center p-1 shadow-md shadow-emerald-950/10 dark:shadow-emerald-950/30">
            <QuranLogo variant="icon" className="w-full h-full" />
          </div>
          <div className="hidden sm:flex flex-col">
            <div className="flex items-center gap-1 font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
              <span>Quran Video</span>
              <span className="ml-1 text-[10px] tracking-wider uppercase font-extrabold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 border border-amber-500/30">
                Studio
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Shorts &amp; Reels Creator
            </span>
          </div>
        </button>

        {/* Center: Surah Selector Pill */}
        <button
          onClick={onOpenSurahDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/70 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 transition-all active:scale-95 shadow-sm"
        >
          <span className="w-5 h-5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold flex items-center justify-center">
            {currentChapter?.id || 1}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-[170px]">
            {currentChapter?.name_simple || 'Al-Fatihah'}
          </span>
          <span className="text-slate-500 dark:text-slate-400 font-serif text-xs hidden sm:inline">
            {currentChapter?.name_arabic}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
        </button>

        {/* Right: Theme Switcher Button */}
        <div className="flex items-center">
          <button
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span className="hidden md:inline text-xs font-medium">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                <span className="hidden md:inline text-xs font-medium">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
