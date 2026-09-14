'use client';

import React, { useState } from 'react';
import { Chapter, Verse } from '@/types/quran';
import { SurahBanner } from './SurahBanner';
import { cleanTranslationText } from '@/lib/quran-api';
import {
  Play,
  Pause,
  Video,
  CheckSquare,
  Square,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Info,
  Languages,
  Layers,
} from 'lucide-react';

interface ReaderViewProps {
  chapter: Chapter;
  verses: Verse[];
  selectedVerseKeys: Set<string>;
  onToggleVerse: (verseKey: string) => void;
  onSelectRange: (start: number, end: number) => void;
  onGoToStudio: () => void;
  activePlayingKey: string | null;
  onPlayAyahAudio: (verseKey: string) => void;
  onOpenTafsir: (verseKey: string, arabicText: string) => void;
  onOpenSurahInfo: () => void;
  onOpenTranslations: () => void;
  currentTranslationName: string;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  chapter,
  verses,
  selectedVerseKeys,
  onToggleVerse,
  onSelectRange,
  onGoToStudio,
  activePlayingKey,
  onPlayAyahAudio,
  onOpenTafsir,
  onOpenSurahInfo,
  onOpenTranslations,
  currentTranslationName,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(
    Math.min(chapter.verses_count, 5)
  );
  const [showWordByWord, setShowWordByWord] = useState<boolean>(false);

  const handleCopy = (verse: Verse) => {
    const text = `${verse.text_uthmani}\n${cleanTranslationText(verse.translations?.[0]?.text || '')}\n(Surah ${chapter.name_simple} ${verse.verse_key})`;
    navigator.clipboard.writeText(text);
    setCopiedKey(verse.verse_key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyRange = () => {
    onSelectRange(rangeStart, rangeEnd);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-32">
      {/* Decorative Surah Banner */}
      <SurahBanner chapter={chapter} />

      {/* Surah Action Shortcuts Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSurahInfo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 transition-all"
          >
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>About Surah</span>
          </button>

          <button
            onClick={onOpenTranslations}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 transition-all"
          >
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-[140px]">{currentTranslationName}</span>
          </button>
        </div>

        <button
          onClick={() => setShowWordByWord(!showWordByWord)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            showWordByWord
              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border-slate-700/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Word-by-Word</span>
        </button>
      </div>

      {/* Quick Range Selection Bar */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Quick Range Select:</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <span className="text-slate-400">From</span>
            <input
              type="number"
              min={1}
              max={chapter.verses_count}
              value={rangeStart}
              onChange={(e) => setRangeStart(Number(e.target.value))}
              className="w-12 bg-transparent text-white font-bold text-center focus:outline-none"
            />
          </div>

          <span className="text-slate-500">to</span>

          <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <span className="text-slate-400">To</span>
            <input
              type="number"
              min={rangeStart}
              max={chapter.verses_count}
              value={rangeEnd}
              onChange={(e) => setRangeEnd(Number(e.target.value))}
              className="w-12 bg-transparent text-white font-bold text-center focus:outline-none"
            />
          </div>

          <button
            onClick={handleApplyRange}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all active:scale-95 shadow-sm"
          >
            Select Range
          </button>
        </div>
      </div>

      {/* Verses List */}
      <div className="space-y-4">
        {verses.map((verse) => {
          const isSelected = selectedVerseKeys.has(verse.verse_key);
          const isPlaying = activePlayingKey === verse.verse_key;
          const cleanTrans = cleanTranslationText(
            verse.translations?.[0]?.text || ''
          );

          return (
            <div
              key={verse.id}
              className={`group relative rounded-2xl border transition-all duration-200 p-4 sm:p-6 ${
                isSelected
                  ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/50 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Verse Header Row */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                {/* Ayah Key Badge */}
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-xs font-bold text-emerald-400">
                    {verse.verse_key}
                  </span>

                  {/* Play Audio Button */}
                  <button
                    onClick={() => onPlayAyahAudio(verse.verse_key)}
                    className={`p-1.5 rounded-full transition-all ${
                      isPlaying
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                    title={isPlaying ? 'Pause Ayah' : 'Play Ayah'}
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </button>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(verse)}
                    className="p-1.5 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Copy Verse"
                  >
                    {copiedKey === verse.verse_key ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Tafsir Ibn Kathir button */}
                  <button
                    onClick={() => onOpenTafsir(verse.verse_key, verse.text_uthmani)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                  >
                    <BookOpen className="w-3 h-3 text-emerald-400" />
                    <span>Tafsir</span>
                  </button>
                </div>

                {/* "Select for Video" Toggle Button */}
                <button
                  onClick={() => onToggleVerse(verse.verse_key)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>In Video</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>Add to Video</span>
                    </>
                  )}
                </button>
              </div>

              {/* Arabic Calligraphy Verse Text */}
              <div className="text-right font-quran text-2xl sm:text-3xl md:text-4xl text-white font-semibold leading-[2.2] sm:leading-[2.4] tracking-wide mb-4 select-text">
                {verse.text_uthmani}
                <span className="inline-block text-emerald-400 font-bold mx-2 text-xl sm:text-2xl">
                  ۝{verse.verse_number}
                </span>
              </div>

              {/* Optional Word-by-Word Breakdown Display */}
              {showWordByWord && verse.words && verse.words.length > 0 && (
                <div className="flex flex-wrap flex-row-reverse gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 mb-4">
                  {verse.words.map((w) => (
                    <div
                      key={w.id}
                      className="flex flex-col items-center p-2 rounded-lg bg-slate-900/80 border border-slate-800/60 text-center min-w-[50px]"
                    >
                      <span className="font-quran text-lg text-amber-200 font-bold">
                        {w.text}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {w.transliteration?.text || ''}
                      </span>
                      <span className="text-[10px] text-slate-300">
                        {w.translation?.text || ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* English Translation */}
              <div className="text-left text-sm sm:text-base text-slate-300 leading-relaxed font-normal select-text">
                {cleanTrans}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Selection Bar (when ayahs are selected) */}
      {selectedVerseKeys.size > 0 && (
        <div className="fixed bottom-16 sm:bottom-20 left-0 right-0 z-30 px-4 pointer-events-none flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="pointer-events-auto flex items-center justify-between gap-4 px-5 py-3 rounded-full bg-slate-900/95 border border-emerald-500/40 shadow-2xl shadow-black/80 backdrop-blur-md max-w-md w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">
                {selectedVerseKeys.size}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white">
                {selectedVerseKeys.size === 1
                  ? '1 Ayah selected'
                  : `${selectedVerseKeys.size} Ayahs selected`}
              </span>
            </div>

            <button
              onClick={onGoToStudio}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/50 transition-all active:scale-95"
            >
              <Video className="w-4 h-4" />
              <span>Create Video</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
