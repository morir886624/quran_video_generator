'use client';

import React, { useState, useEffect } from 'react';
import { Chapter } from '@/types/quran';
import { fetchChapterInfo } from '@/lib/quran-api';
import { Info, X, MapPin, Hash, Sparkles, Loader2 } from 'lucide-react';

interface SurahInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
}

export const SurahInfoModal: React.FC<SurahInfoModalProps> = ({
  isOpen,
  onClose,
  chapter,
}) => {
  const [info, setInfo] = useState<{ text: string; shortText: string; source: string } | null>(null);
  const [loadedChapterId, setLoadedChapterId] = useState<number | null>(null);

  const isLoading = isOpen && chapter ? loadedChapterId !== chapter.id : false;

  useEffect(() => {
    if (!isOpen || !chapter) return;

    let isMounted = true;
    fetchChapterInfo(chapter.id)
      .then((res) => {
        if (isMounted) {
          setInfo(res);
          setLoadedChapterId(chapter.id);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error fetching chapter info:', err);
          setInfo({
            text: 'Information currently unavailable for this chapter.',
            shortText: '',
            source: 'Quran.com',
          });
          setLoadedChapterId(chapter.id);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, chapter]);

  if (!isOpen || !chapter) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/90 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Surah {chapter.name_simple}</span>
                <span className="font-quran text-emerald-950 dark:text-amber-200 text-base">{chapter.name_arabic}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {chapter.translated_name.name} • Revelation Context &amp; History
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badges bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/60 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="capitalize">{chapter.revelation_place}</span>
          </span>
          <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-xs">
            <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{chapter.verses_count} Verses</span>
          </span>
          <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Order #{chapter.revelation_order}</span>
          </span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Loading Surah History...</span>
            </div>
          ) : (
            <>
              {info?.shortText && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-400/30 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-sm leading-relaxed">
                  {info.shortText}
                </div>
              )}

              <div
                className="prose dark:prose-invert prose-emerald max-w-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: info?.text || '' }}
              />

              {info?.source && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                  Source: {info.source}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

