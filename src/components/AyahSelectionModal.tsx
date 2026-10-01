import React, { useState } from 'react';
import { Chapter, Verse } from '@/types/quran';
import { X, Check, Video } from 'lucide-react';

interface AyahSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
  verses: Verse[];
  selectedVerseKeys: Set<string>;
  onToggleVerse: (verseKey: string) => void;
  onSelectRange: (start: number, end: number) => void;
  onSelectAllVerses: () => void;
  onClearVerses: () => void;
}

export const AyahSelectionModal: React.FC<AyahSelectionModalProps> = ({
  isOpen,
  onClose,
  chapter,
  verses,
  selectedVerseKeys,
  onToggleVerse,
  onSelectRange,
  onSelectAllVerses,
  onClearVerses,
}) => {
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(chapter ? Math.min(chapter.verses_count, 5) : 5);

  if (!isOpen || !chapter) return null;

  const handleApplyRange = () => {
    const start = Math.min(rangeStart, rangeEnd);
    const end = Math.max(rangeStart, rangeEnd);
    onSelectRange(start, end);
  };

  const handleSelectAll = () => {
    if (onSelectAllVerses) {
      onSelectAllVerses();
    } else {
      onSelectRange(1, chapter.verses_count);
    }
  };

  const handleClearSelection = () => {
    if (onClearVerses) {
      onClearVerses();
    } else {
      onSelectRange(1, 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white dark:bg-[#0B1120] sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden border border-slate-200/50 dark:border-slate-800/50 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Select Ayahs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Surah {chapter.name_simple}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          {/* Quick Range Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Quick Range</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wide"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearSelection}
                  className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:underline uppercase tracking-wide"
                >
                  Reset
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/50">
              <div className="flex-1 flex items-center bg-white dark:bg-[#0E1626] rounded-lg border border-slate-200/60 dark:border-slate-700/60 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <span className="pl-3 text-xs font-semibold text-slate-400 select-none">From</span>
                <input
                  type="number"
                  min={1}
                  max={chapter.verses_count}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Number(e.target.value))}
                  className="w-full bg-transparent px-2 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="flex-1 flex items-center bg-white dark:bg-[#0E1626] rounded-lg border border-slate-200/60 dark:border-slate-700/60 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <span className="pl-3 text-xs font-semibold text-slate-400 select-none">To</span>
                <input
                  type="number"
                  min={1}
                  max={chapter.verses_count}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Number(e.target.value))}
                  className="w-full bg-transparent px-2 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <button
                onClick={handleApplyRange}
                className="px-4 py-2 h-full rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Apply
              </button>
            </div>
          </section>

          {/* Manual Selection Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Manual Selection</h3>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {selectedVerseKeys.size} Selected
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {verses.map((v) => {
                const isSelected = selectedVerseKeys.has(v.verse_key);
                return (
                  <button
                    key={v.verse_key}
                    onClick={() => onToggleVerse(v.verse_key)}
                    className={`relative flex items-center justify-center py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20 scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-1 right-1">
                        <Check className="w-2.5 h-2.5 stroke-[4]" />
                      </span>
                    )}
                    {v.verse_number}
                  </button>
                );
              })}
            </div>
          </section>

        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0B1120]">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-600 text-white text-sm font-bold shadow-md transition-all active:scale-[0.98]"
          >
            <span>Done</span>
            <Check className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

