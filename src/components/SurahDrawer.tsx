'use client';

import React, { useState, useMemo } from 'react';
import { Chapter } from '@/types/quran';
import { POPULAR_PRESETS } from '@/lib/constants';
import { Search, X, Sparkles, BookOpen } from 'lucide-react';

interface SurahDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentChapterId: number;
  onSelectChapter: (chapterId: number, startAyah?: number, endAyah?: number) => void;
}

export const SurahDrawer: React.FC<SurahDrawerProps> = ({
  isOpen,
  onClose,
  chapters,
  currentChapterId,
  onSelectChapter,
}) => {
  const [search, setSearch] = useState('');

  const filteredChapters = useMemo(() => {
    if (!search.trim()) return chapters;
    const q = search.toLowerCase();
    return chapters.filter(
      (c) =>
        c.id.toString() === q ||
        c.name_simple.toLowerCase().includes(q) ||
        c.name_arabic.includes(q) ||
        c.translated_name.name.toLowerCase().includes(q)
    );
  }, [chapters, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/70 backdrop-blur-sm transition-opacity">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Drawer Surface */}
      <div className="relative w-full sm:max-w-xl sm:mx-auto bg-[#0F172A] border border-slate-700/80 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg text-white">Select Surah</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Popular Presets Pills */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-900/40">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Popular Selections</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {POPULAR_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectChapter(preset.surahId, preset.startAyah, preset.endAyah);
                  onClose();
                }}
                className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium bg-slate-800 hover:bg-emerald-950/60 border border-slate-700/60 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-all active:scale-95"
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Surah name, number, or translation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Chapters list */}
        <div className="overflow-y-auto p-3 divide-y divide-slate-800/50">
          {filteredChapters.map((chapter) => {
            const isSelected = chapter.id === currentChapterId;
            return (
              <button
                key={chapter.id}
                onClick={() => {
                  onSelectChapter(chapter.id, 1, Math.min(chapter.verses_count, 7));
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all active:scale-[0.99] ${
                  isSelected
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                    : 'hover:bg-slate-800/60 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-900/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700/70'
                    }`}
                  >
                    {chapter.id}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                      <span>{chapter.name_simple}</span>
                      <span className="text-[10px] text-slate-400 uppercase">
                        ({chapter.revelation_place})
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {chapter.translated_name.name} • {chapter.verses_count} verses
                    </div>
                  </div>
                </div>

                <div className="font-quran text-2xl text-amber-200/90 pr-2">
                  {chapter.name_arabic}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

