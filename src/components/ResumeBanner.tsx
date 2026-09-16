'use client';

import React from 'react';
import { ProjectDraft } from '@/lib/storage-db';
import { Sparkles, X, RotateCcw } from 'lucide-react';

interface ResumeBannerProps {
  session: ProjectDraft | null;
  onResume: (session: ProjectDraft) => void;
  onDismiss: () => void;
}

export const ResumeBanner: React.FC<ResumeBannerProps> = ({
  session,
  onResume,
  onDismiss,
}) => {
  if (!session) return null;

  const firstKey = session.verseKeys?.[0] || '1:1';
  const lastKey = session.verseKeys?.[session.verseKeys.length - 1] || firstKey;
  const startAyah = firstKey.split(':')[1] || '1';
  const endAyah = lastKey.split(':')[1] || startAyah;
  const rangeStr = startAyah === endAyah ? `Ayah ${startAyah}` : `Ayahs ${startAyah}–${endAyah}`;

  return (
    <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 pt-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-3 p-3 sm:px-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900/40 border border-emerald-500/25 dark:border-emerald-500/30 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              Resume your previous project?
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Surah #{session.chapterId} {session.chapterName}
              </span>{' '}
              ({rangeStr}) • Reciter: {session.reciterName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onResume(session)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Resume</span>
          </button>
          <button
            onClick={onDismiss}
            aria-label="Dismiss banner"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
