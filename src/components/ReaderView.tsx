'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chapter, Verse, Reciter, TafsirEditionId } from '@/types/quran';
import { UserPreferences } from '@/lib/preferences';
import { SurahBanner } from './SurahBanner';
import {
  cleanTranslationText,
  fetchAyahTafsirText,
  prefetchSurahTafsir,
} from '@/lib/quran-api';
import { AVAILABLE_TAFSIRS } from '@/lib/constants';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
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
  Mic2,
  CheckCircle2,
  Loader2,
  Compass,
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
  onOpenReciters?: () => void;
  currentReciterName?: string;
  currentReciter?: Reciter;
  preferences?: UserPreferences;
  chapterAudioMap?: Record<string, string>;
  onSelectAllVerses?: () => void;
  onClearVerses?: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  chapter,
  verses,
  selectedVerseKeys,
  onToggleVerse,
  onSelectRange,
  onGoToStudio,
  activePlayingKey: externalPlayingKey,
  onPlayAyahAudio,
  onOpenTafsir,
  onOpenSurahInfo,
  onOpenTranslations,
  currentTranslationName,
  onOpenReciters,
  currentReciterName,
  currentReciter,
  preferences,
  chapterAudioMap = {},
  onSelectAllVerses,
  onClearVerses,
}) => {
  // ---------------------------------------------------------------------------
  // 1. Audio Playback & Sequential Recitation Pacer
  // ---------------------------------------------------------------------------
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Derive active verse key
  const activeVerse = verses[currentPlayingIndex] || verses[0];
  const activeVerseKey = isPlaying && activeVerse ? activeVerse.verse_key : null;

  // Resolve audio URL for any ayah in this surah
  const getVerseAudioUrl = useCallback(
    (verseKey: string, verseNum: number): string => {
      if (chapterAudioMap && chapterAudioMap[verseKey]) {
        return chapterAudioMap[verseKey];
      }
      const padC = String(chapter.id).padStart(3, '0');
      const padV = String(verseNum).padStart(3, '0');
      if (currentReciter?.audioSubfolder) {
        return `https://everyayah.com/data/${currentReciter.audioSubfolder}/${padC}${padV}.mp3`;
      }
      return `https://verses.quran.com/Alafasy/mp3/${padC}${padV}.mp3`;
    },
    [chapterAudioMap, chapter.id, currentReciter]
  );

  // Play a specific verse by index and sync audio
  const playVerseByIndex = useCallback(
    (index: number) => {
      if (!verses || verses.length === 0) return;
      const targetIndex = Math.max(0, Math.min(index, verses.length - 1));
      const targetVerse = verses[targetIndex];
      if (!targetVerse) return;

      const url = getVerseAudioUrl(targetVerse.verse_key, targetVerse.verse_number);
      if (!url) return;

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.src = url;
      audio.volume = isMuted ? 0 : volume;
      audio.playbackRate = playbackSpeed;

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setCurrentPlayingIndex(targetIndex);

          // Auto-scroll to active ayah if enabled
          if (autoScroll) {
            const el = document.getElementById(`verse-${targetVerse.verse_key}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        })
        .catch((err) => {
          console.warn('Playback error for verse:', targetVerse.verse_key, err);
          setIsPlaying(false);
        });
    },
    [verses, getVerseAudioUrl, isMuted, volume, playbackSpeed, autoScroll]
  );

  // Wire HTMLAudioElement events for seamless sequential recitation
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const handleEnded = () => {
      setCurrentPlayingIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex < verses.length) {
          playVerseByIndex(nextIndex);
          return nextIndex;
        } else {
          // Finished entire Surah
          setIsPlaying(false);
          return 0;
        }
      });
    };

    const handleError = () => {
      console.warn('Audio ended with error, advancing to next verse');
      setCurrentPlayingIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex < verses.length) {
          playVerseByIndex(nextIndex);
          return nextIndex;
        } else {
          setIsPlaying(false);
          return 0;
        }
      });
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [verses, playVerseByIndex]);

  // Reset audio when chapter changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentPlayingIndex(0);
    setRangeStart(1);
    setRangeEnd(Math.min(chapter.verses_count, 5));
  }, [chapter.id]);

  // Update volume & muted on existing audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update playback speed on existing audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Handle Full Surah Play / Pause Toggle
  const handleTogglePlaySurah = useCallback(() => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      playVerseByIndex(currentPlayingIndex);
    }
  }, [isPlaying, playVerseByIndex, currentPlayingIndex]);

  // Skip to next verse
  const handleNextAyah = useCallback(() => {
    if (currentPlayingIndex < verses.length - 1) {
      playVerseByIndex(currentPlayingIndex + 1);
    }
  }, [currentPlayingIndex, verses.length, playVerseByIndex]);

  // Skip to previous verse
  const handlePrevAyah = useCallback(() => {
    if (currentPlayingIndex > 0) {
      playVerseByIndex(currentPlayingIndex - 1);
    }
  }, [currentPlayingIndex, playVerseByIndex]);

  // Toggle speed
  const handleCycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 0.75];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // Single verse play button from verse card
  const handleVerseCardPlayToggle = (vIndex: number) => {
    if (isPlaying && currentPlayingIndex === vIndex) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      playVerseByIndex(vIndex);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Tafsir Selector & Commentary State
  // ---------------------------------------------------------------------------
  const [selectedTafsirId, setSelectedTafsirId] = useState<TafsirEditionId>(
    (preferences?.tafsirEdition as TafsirEditionId) || 'persian-mokhtasar'
  );
  const [isTafsirMode, setIsTafsirMode] = useState<boolean>(false);
  const [expandedVerseTafsirs, setExpandedVerseTafsirs] = useState<Set<string>>(new Set());
  const [tafsirCache, setTafsirCache] = useState<Record<string, string>>({});
  const [loadingTafsirKeys, setLoadingTafsirKeys] = useState<Set<string>>(new Set());

  const activeTafsirObj = useMemo(() => {
    return (
      AVAILABLE_TAFSIRS.find((t) => t.id === selectedTafsirId) || AVAILABLE_TAFSIRS[0]
    );
  }, [selectedTafsirId]);

  // Prefetch & cache tafsir for current surah
  useEffect(() => {
    if (!isTafsirMode && expandedVerseTafsirs.size === 0) return;

    let isMounted = true;

    // Fast batch prefetch for Persian editions
    if (selectedTafsirId === 'persian-mokhtasar' || selectedTafsirId === 'fr-tafsir-as-saadi') {
      prefetchSurahTafsir(chapter.id, selectedTafsirId).then((map) => {
        if (!isMounted) return;
        setTafsirCache((prev) => {
          const next = { ...prev };
          Object.entries(map).forEach(([ayahNum, text]) => {
            next[`${selectedTafsirId}_${chapter.id}:${ayahNum}`] = text;
          });
          return next;
        });
      });
    } else {
      // Async fetch for Quran.com tafsirs
      verses.forEach((v) => {
        const cacheKey = `${selectedTafsirId}_${v.verse_key}`;
        if (!tafsirCache[cacheKey] && !loadingTafsirKeys.has(cacheKey)) {
          setLoadingTafsirKeys((prev) => new Set(prev).add(cacheKey));
          fetchAyahTafsirText(v.verse_key, selectedTafsirId).then((text) => {
            if (!isMounted) return;
            setTafsirCache((prev) => ({ ...prev, [cacheKey]: text }));
            setLoadingTafsirKeys((prev) => {
              const updated = new Set(prev);
              updated.delete(cacheKey);
              return updated;
            });
          });
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isTafsirMode, selectedTafsirId, chapter.id, verses, expandedVerseTafsirs.size]);

  const toggleSingleVerseTafsir = (verseKey: string) => {
    setExpandedVerseTafsirs((prev) => {
      const next = new Set(prev);
      if (next.has(verseKey)) {
        next.delete(verseKey);
      } else {
        next.add(verseKey);
        // Ensure this verse's tafsir is fetched
        const cacheKey = `${selectedTafsirId}_${verseKey}`;
        if (!tafsirCache[cacheKey] && !loadingTafsirKeys.has(cacheKey)) {
          setLoadingTafsirKeys((l) => new Set(l).add(cacheKey));
          fetchAyahTafsirText(verseKey, selectedTafsirId).then((text) => {
            setTafsirCache((c) => ({ ...c, [cacheKey]: text }));
            setLoadingTafsirKeys((l) => {
              const updated = new Set(l);
              updated.delete(cacheKey);
              return updated;
            });
          });
        }
      }
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // 3. Video Verse Selection State
  // ---------------------------------------------------------------------------
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(
    Math.min(chapter.verses_count, 5)
  );

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

  const handleSelectCurrentAyahOnly = () => {
    const activeV = verses[currentPlayingIndex] || verses[0];
    if (activeV) {
      onSelectRange(activeV.verse_number, activeV.verse_number);
    }
  };

  const handleClearSelection = () => {
    if (onClearVerses) {
      onClearVerses();
    } else {
      // Leave first verse selected by default
      onSelectRange(1, 1);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Reading Helpers (Copy, Word-by-word, etc.)
  // ---------------------------------------------------------------------------
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showWordByWord, setShowWordByWord] = useState<boolean>(
    preferences?.showWordByWord ?? false
  );

  useEffect(() => {
    if (preferences?.showWordByWord !== undefined) {
      setShowWordByWord(preferences.showWordByWord);
    }
  }, [preferences?.showWordByWord]);

  const handleCopy = (verse: Verse) => {
    const text = `${verse.text_uthmani}\n${cleanTranslationText(
      verse.translations?.[0]?.text || ''
    )}\n(Surah ${chapter.name_simple} ${verse.verse_key})`;
    navigator.clipboard.writeText(text);
    setCopiedKey(verse.verse_key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-32">
      {/* ===================================================================== */}
      {/* SECTION 1: TOP SURAH HEADER, AUDIO PLAYER & TAFSIR SELECTOR          */}
      {/* ===================================================================== */}
      <section aria-label="Surah Player and Tafsir" className="mb-8">
        {/* Surah Banner Card matching reference image */}
        <SurahBanner chapter={chapter} />

        {/* Full Surah Audio Player & Recitation Controller */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md p-4 sm:p-5 mb-4 transition-colors">
          <div className="flex flex-col gap-4">
            {/* Player Top Status Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {isPlaying ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-300 dark:bg-slate-600" />
                  )}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {isPlaying ? 'Reciting Surah' : 'Surah Audio Player'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  • Ayah {currentPlayingIndex + 1} of {verses.length}
                </span>
              </div>

              {/* Reciter Selector Button */}
              {onOpenReciters && (
                <button
                  onClick={onOpenReciters}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700/80 transition-all shadow-xs"
                >
                  <Mic2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate max-w-[150px]">
                    {currentReciterName || currentReciter?.name || 'Reciter'}
                  </span>
                </button>
              )}
            </div>

            {/* Recitation Progress Bar across the Surah */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${((currentPlayingIndex + 1) / Math.max(1, verses.length)) * 100}%`,
                }}
              />
            </div>

            {/* Central Controls & Sound with Volume Level */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Skip & Main Play / Pause Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={handlePrevAyah}
                  disabled={currentPlayingIndex === 0}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-all"
                  title="Previous Ayah"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={handleTogglePlaySurah}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm text-white shadow-md transition-all active:scale-95 ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause Surah</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play Surah {chapter.name_simple}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleNextAyah}
                  disabled={currentPlayingIndex >= verses.length - 1}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-all"
                  title="Next Ayah"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Speed Selector */}
                <button
                  onClick={handleCycleSpeed}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all"
                  title="Recitation speed"
                >
                  {playbackSpeed}x
                </button>
              </div>

              {/* Sound with Volume Level Slider & Mute Toggle */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleToggleMute}
                  className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-500" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (val > 0 && isMuted) setIsMuted(false);
                  }}
                  className="w-20 sm:w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  title="Sound Volume Level"
                />

                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 w-7 text-right">
                  {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                </span>
              </div>
            </div>

            {/* Sub-row: Auto-scroll pacing toggle */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span className="font-medium">
                  Follow recitation (auto-scroll to current reciting ayah)
                </span>
              </label>

              {activeVerse && isPlaying && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Playing Ayah {activeVerse.verse_key}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tafsir Selector Bar (For hearing & reading the Quran) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-900/80 border border-amber-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Tafsir (Exegesis) Selector
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Select commentary for hearing and reading the Quran
                </p>
              </div>
            </div>

            {/* Tafsir edition picker and mode toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedTafsirId}
                onChange={(e) => setSelectedTafsirId(e.target.value as TafsirEditionId)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-amber-300/80 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer shadow-xs max-w-[220px] sm:max-w-xs truncate"
              >
                {AVAILABLE_TAFSIRS.map((taf) => (
                  <option key={taf.id} value={taf.id}>
                    {taf.name} ({taf.language})
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsTafsirMode((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  isTafsirMode
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{isTafsirMode ? 'Tafsir Mode: ON' : 'Show Tafsir'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 2: SELECT VERSES FOR CREATING A VIDEO                        */}
      {/* ===================================================================== */}
      <section
        aria-label="Select Verses for Video Creation"
        className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-[#08201D] border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-sm transition-colors"
      >
        <div className="flex flex-col gap-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 dark:border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Select Verses for Creating a Video
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Pick ayahs from Surah {chapter.name_simple} to animate, customize typography, and export to video.
                </p>
              </div>
            </div>

            {/* Action CTA Button directly to Video Studio */}
            <button
              onClick={onGoToStudio}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 transition-all active:scale-95"
            >
              <Video className="w-4 h-4" />
              <span>Create Video ({selectedVerseKeys.size} Ayahs) →</span>
            </button>
          </div>

          {/* Quick Range Selector Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Range:
              </span>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 dark:text-slate-500">From</span>
                <input
                  type="number"
                  min={1}
                  max={chapter.verses_count}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Number(e.target.value))}
                  className="w-12 bg-transparent text-slate-900 dark:text-white font-bold text-center focus:outline-none"
                />
              </div>

              <span className="text-slate-400 dark:text-slate-500">to</span>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-slate-400 dark:text-slate-500">To</span>
                <input
                  type="number"
                  min={1}
                  max={chapter.verses_count}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Number(e.target.value))}
                  className="w-12 bg-transparent text-slate-900 dark:text-white font-bold text-center focus:outline-none"
                />
              </div>

              <button
                onClick={handleApplyRange}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all active:scale-95 shadow-xs"
              >
                Apply Range
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={handleSelectAll}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700"
              >
                Select All
              </button>
              <button
                onClick={handleSelectCurrentAyahOnly}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700"
              >
                Select Current Ayah
              </button>
              <button
                onClick={handleClearSelection}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Interactive Ayah Chips Matrix */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Tap ayahs to toggle inclusion in video:
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {selectedVerseKeys.size} of {chapter.verses_count} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-white/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              {verses.map((v) => {
                const isSelected = selectedVerseKeys.has(v.verse_key);
                return (
                  <button
                    key={v.verse_key}
                    onClick={() => onToggleVerse(v.verse_key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs scale-[1.02]'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60'
                    }`}
                    title={`Ayah ${v.verse_number}: Click to ${isSelected ? 'remove from' : 'add to'} video`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    <span>{v.verse_number}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 3: READING THE QURAN WITH OR WITHOUT THE TAFSIR              */}
      {/* ===================================================================== */}
      <section aria-label="Reading the Quran with or without Tafsir">
        {/* Reading Section Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Quran Reading
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              Surah {chapter.name_simple}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Mode: With or Without Tafsir */}
            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setIsTafsirMode(false)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  !isTafsirMode
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Without Tafsir
              </button>
              <button
                onClick={() => setIsTafsirMode(true)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isTafsirMode
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                With Tafsir
              </button>
            </div>

            {/* Word-by-Word Toggle */}
            <button
              onClick={() => setShowWordByWord(!showWordByWord)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                showWordByWord
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Word-by-Word</span>
            </button>

            {/* Surah Info & Translations Shortcuts */}
            <button
              onClick={onOpenSurahInfo}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              title="About Surah"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenTranslations}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              title={`Translation: ${currentTranslationName}`}
            >
              <Languages className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Verses Reading List */}
        <div className="space-y-4">
          {verses.map((verse, vIndex) => {
            const isSelectedForVideo = selectedVerseKeys.has(verse.verse_key);
            const isCurrentlyPlaying = isPlaying && currentPlayingIndex === vIndex;
            const cleanTrans = cleanTranslationText(
              verse.translations?.[0]?.text || ''
            );

            // Tafsir text for this verse
            const tafsirKey = `${selectedTafsirId}_${verse.verse_key}`;
            const tafsirText = tafsirCache[tafsirKey];
            const isTafsirLoading = loadingTafsirKeys.has(tafsirKey);
            const shouldShowTafsir =
              isTafsirMode || expandedVerseTafsirs.has(verse.verse_key);

            return (
              <div
                key={verse.id}
                id={`verse-${verse.verse_key}`}
                className={`group relative rounded-2xl border transition-all duration-200 p-4 sm:p-6 ${
                  isCurrentlyPlaying
                    ? 'bg-emerald-50/80 dark:bg-slate-900/95 border-emerald-500 shadow-md ring-2 ring-emerald-500/40'
                    : isSelectedForVideo
                    ? 'bg-emerald-50/40 dark:bg-slate-900/80 border-emerald-500/50 shadow-xs'
                    : 'bg-white dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                {/* Verse Card Header Row */}
                <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 dark:border-slate-800/70 pb-3">
                  <div className="flex items-center gap-2">
                    {/* Ayah Key Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                        isCurrentlyPlaying
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {verse.verse_key}
                    </span>

                    {/* Equalizer Sound Wave Animation when Playing */}
                    {isCurrentlyPlaying && (
                      <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                        <span className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1 h-4 bg-emerald-500 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:300ms]" />
                        <span className="ml-1 hidden sm:inline">Now Reciting</span>
                      </span>
                    )}

                    {/* Single Play / Pause Button */}
                    <button
                      onClick={() => handleVerseCardPlayToggle(vIndex)}
                      className={`p-1.5 rounded-full transition-all ${
                        isCurrentlyPlaying
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                      }`}
                      title={isCurrentlyPlaying ? 'Pause Ayah' : 'Recite from this Ayah'}
                    >
                      {isCurrentlyPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopy(verse)}
                      className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800/60 dark:hover:bg-slate-700 dark:text-slate-400 transition-colors"
                      title="Copy Verse"
                    >
                      {copiedKey === verse.verse_key ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Tafsir Expand Button */}
                    <button
                      onClick={() => toggleSingleVerseTafsir(verse.verse_key)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        shouldShowTafsir
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-transparent'
                      }`}
                      title="Toggle Tafsir for this Ayah"
                    >
                      <BookOpen className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Tafsir</span>
                    </button>
                  </div>

                  {/* "Select for Video" Toggle Button */}
                  <button
                    onClick={() => onToggleVerse(verse.verse_key)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isSelectedForVideo
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    {isSelectedForVideo ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
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
                <div
                  className={`text-right font-semibold leading-[2.2] sm:leading-[2.4] tracking-wide mb-4 select-text ${
                    preferences?.arabicFontFamily === 'Scheherazade New'
                      ? 'font-scheherazade'
                      : preferences?.arabicFontFamily === 'Amiri'
                      ? 'font-serif'
                      : 'font-quran'
                  } ${
                    !preferences?.arabicFontSize ? 'text-2xl sm:text-3xl md:text-4xl' : ''
                  } ${
                    !preferences?.useCustomColors ? 'text-slate-900 dark:text-white' : ''
                  }`}
                  style={{
                    fontSize: preferences?.arabicFontSize
                      ? `${preferences.arabicFontSize}px`
                      : undefined,
                    color: preferences?.useCustomColors
                      ? preferences.arabicTextColor
                      : undefined,
                  }}
                >
                  {verse.text_uthmani}
                  {preferences?.showAyahNumber !== false && (
                    <span
                      className="inline-block font-bold mx-2"
                      style={{
                        color: preferences?.accentColor || undefined,
                        fontSize: preferences?.arabicFontSize
                          ? `${Math.max(16, Math.round(preferences.arabicFontSize * 0.65))}px`
                          : undefined,
                      }}
                    >
                      ۝{verse.verse_number}
                    </span>
                  )}
                </div>

                {/* Optional Word-by-Word Breakdown Display */}
                {showWordByWord && verse.words && verse.words.length > 0 && (
                  <div className="flex flex-wrap flex-row-reverse gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 mb-4">
                    {verse.words.map((w) => (
                      <div
                        key={w.id}
                        className="flex flex-col items-center p-2 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/60 text-center min-w-[50px] shadow-xs"
                      >
                        <span className="font-quran text-lg text-emerald-950 dark:text-amber-200 font-bold">
                          {w.text}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                          {w.transliteration?.text || ''}
                        </span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300">
                          {w.translation?.text || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Translation Display */}
                <div
                  className={`text-left leading-relaxed font-normal select-text ${
                    !preferences?.translationFontSize ? 'text-sm sm:text-base' : ''
                  } ${
                    !preferences?.useCustomColors
                      ? 'text-slate-700 dark:text-slate-300'
                      : ''
                  }`}
                  style={{
                    fontSize: preferences?.translationFontSize
                      ? `${preferences.translationFontSize}px`
                      : undefined,
                    color: preferences?.useCustomColors
                      ? preferences.translationTextColor
                      : undefined,
                  }}
                >
                  {cleanTrans}
                </div>

                {/* Inline Tafsir Commentary (Displayed when Tafsir Mode is ON or expanded for this ayah) */}
                {shouldShowTafsir && (
                  <div className="mt-4 pt-3.5 border-t border-amber-200/70 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>{activeTafsirObj.name}</span>
                      </div>

                      <button
                        onClick={() => onOpenTafsir(verse.verse_key, verse.text_uthmani)}
                        className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200 underline decoration-amber-500/40"
                      >
                        Full Commentary Modal
                      </button>
                    </div>

                    {isTafsirLoading ? (
                      <div className="flex items-center gap-2 py-2 text-slate-500 dark:text-slate-400 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                        <span>Loading Tafsir commentary...</span>
                      </div>
                    ) : tafsirText ? (
                      <p
                        dir={activeTafsirObj.direction}
                        className={`leading-relaxed text-slate-800 dark:text-amber-100/90 ${
                          activeTafsirObj.direction === 'rtl'
                            ? 'text-right font-medium'
                            : 'text-left'
                        }`}
                      >
                        {tafsirText}
                      </p>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 italic text-xs">
                        No commentary found for this ayah in {activeTafsirObj.name}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Floating Bottom Quick Video Action Pill */}
      {selectedVerseKeys.size > 0 && (
        <div className="fixed bottom-16 sm:bottom-20 left-0 right-0 z-30 px-4 pointer-events-none flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="pointer-events-auto flex items-center justify-between gap-4 px-5 py-3 rounded-full bg-white/95 dark:bg-slate-900/95 border border-emerald-500/40 shadow-xl shadow-slate-400/20 dark:shadow-black/80 backdrop-blur-md max-w-md w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                {selectedVerseKeys.size}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                {selectedVerseKeys.size === 1
                  ? '1 Ayah for Video'
                  : `${selectedVerseKeys.size} Ayahs for Video`}
              </span>
            </div>

            <button
              onClick={onGoToStudio}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
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
