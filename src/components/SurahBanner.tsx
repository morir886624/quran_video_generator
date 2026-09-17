'use client';

import React from 'react';
import { Chapter } from '@/types/quran';
import { Sparkles, MapPin, Hash, Layers } from 'lucide-react';

interface SurahBannerProps {
  chapter: Chapter;
}

export const SurahBanner: React.FC<SurahBannerProps> = ({ chapter }) => {
  const showBismillah = chapter.id !== 1 && chapter.id !== 9;

  return (
    <div className="w-full mb-6">
      {/* Quran.com Signature Surah Decorative Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-50/50 via-white to-slate-50 dark:from-[#162544] dark:to-[#0E1830] border border-slate-200 dark:border-slate-700/80 p-5 sm:p-7 text-center shadow-lg shadow-slate-200/50 dark:shadow-slate-950/30 transition-colors">
        {/* Subtle geometric background watermark matching reference image */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none flex items-center justify-center text-slate-800 dark:text-emerald-300">
          <svg className="w-80 h-80 max-w-full" viewBox="0 0 200 200" fill="currentColor">
            <polygon points="100,10 120,70 180,50 145,100 180,150 120,130 100,190 80,130 20,150 55,100 20,50 80,70" />
          </svg>
        </div>

        {/* Revelation Badge matching reference image */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{chapter.revelation_place}</span>
          <span className="text-emerald-500 font-bold">•</span>
          <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{chapter.verses_count} VERSES</span>
        </div>

        {/* Grand Arabic Surah Calligraphy */}
        <h1 className="font-quran text-4xl sm:text-5xl md:text-6xl text-slate-900 dark:text-amber-200/90 font-bold mb-2 drop-shadow-sm dark:drop-shadow-md">
          {chapter.name_arabic}
        </h1>

        {/* English Title & Translation */}
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-wide">
            {chapter.name_simple}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            {chapter.translated_name.name}
          </p>
        </div>

        {/* Meta badges */}
        <div className="flex items-center justify-center gap-3 mt-4 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700/60">
            <Layers className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Surah #{chapter.id}
          </span>
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700/60">
            <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
            Order #{chapter.revelation_order}
          </span>
        </div>
      </div>

      {/* Ornate Bismillah Header (Quran.com Style) */}
      {showBismillah && (
        <div className="mt-6 mb-4 text-center">
          <div className="inline-block relative px-6 py-2">
            <span className="font-quran text-3xl sm:text-4xl text-slate-800 dark:text-slate-100 font-bold drop-shadow-sm">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </span>
            <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent mx-auto mt-2" />
          </div>
        </div>
      )}
    </div>
  );
};

