'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chapter, Verse, Reciter, TafsirEditionId, ArabicScriptType } from '@/types/quran';
import { UserPreferences } from '@/lib/preferences';
import { SurahBanner } from './SurahBanner';
import {
  cleanTranslationText,
  fetchAyahTafsirText,
  prefetchSurahTafsir,
} from '@/lib/quran-api';
import { AVAILABLE_TAFSIRS, getReciterAyahUrl, POPULAR_RECITERS } from '@/lib/constants';
import {
  updateBackgroundAudioSession,
  stopBackgroundAudioSession,
} from '@/lib/background-audio';
import { useBackButton } from '@/lib/back-button';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
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
  Image as ImageIcon,
  MoreHorizontal,
  ChevronRight,
  Repeat,
  Repeat1,
  StepForward,
  CircleOff,
  ScrollText,
  Gauge,
} from 'lucide-react';

type SurahPlaybackMode = 'off' | 'next-chapter' | 'repeat-chapter' | 'repeat-ayah';

const PLAYER_SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0] as const;
const READER_PLAYER_SETTINGS_KEY = 'quran_reader_player_settings';

const PLAYBACK_MODE_OPTIONS: Array<{
  id: SurahPlaybackMode;
  label: string;
  description: string;
}> = [
  {
    id: 'off',
    label: 'Off',
    description: 'Stop playback when the Surah finishes',
  },
  {
    id: 'next-chapter',
    label: 'Next Surah',
    description: 'Auto-switch to the next Surah when finished',
  },
  {
    id: 'repeat-chapter',
    label: 'Repeat Surah',
    description: 'Loop the current Surah continuously',
  },
  {
    id: 'repeat-ayah',
    label: 'Repeat Ayah',
    description: 'Loop the active Ayah continuously',
  },
];

function formatPlaybackSpeed(speed: number): string {
  return Number.isInteger(speed * 10) ? `${speed.toFixed(1)}x` : `${speed}x`;
}

function loadReaderPlayerSettings(): {
  autoScroll: boolean;
  playbackSpeed: number;
  playbackMode: SurahPlaybackMode;
} {
  const defaults = {
    autoScroll: true,
    playbackSpeed: 1.0,
    playbackMode: 'off' as SurahPlaybackMode,
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(READER_PLAYER_SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      autoScroll: typeof parsed.autoScroll === 'boolean' ? parsed.autoScroll : defaults.autoScroll,
      playbackSpeed:
        typeof parsed.playbackSpeed === 'number' &&
        PLAYER_SPEED_OPTIONS.includes(parsed.playbackSpeed as (typeof PLAYER_SPEED_OPTIONS)[number])
          ? parsed.playbackSpeed
          : defaults.playbackSpeed,
      playbackMode:
        typeof parsed.playbackMode === 'string' &&
        PLAYBACK_MODE_OPTIONS.some((m) => m.id === parsed.playbackMode)
          ? (parsed.playbackMode as SurahPlaybackMode)
          : defaults.playbackMode,
    };
  } catch {
    return defaults;
  }
}

function applyAudioElementSettings(
  audio: HTMLAudioElement,
  volume: number,
  isMuted: boolean,
  playbackSpeed: number
) {
  audio.volume = isMuted ? 0 : volume;
  audio.preservesPitch = true;
  (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
  (audio as HTMLAudioElement & { mozPreservesPitch?: boolean }).mozPreservesPitch = true;
  audio.playbackRate = playbackSpeed;
}

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
  onSwitchChapter?: (chapterId: number) => void;
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
  onSwitchChapter,
}) => {
  // ---------------------------------------------------------------------------
  // 1. Audio Playback & Sequential Recitation Pacer
  // ---------------------------------------------------------------------------
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(
    () => loadReaderPlayerSettings().playbackSpeed
  );
  const [autoScroll, setAutoScroll] = useState<boolean>(
    () => loadReaderPlayerSettings().autoScroll
  );
  const [playbackMode, setPlaybackMode] = useState<SurahPlaybackMode>(
    () => loadReaderPlayerSettings().playbackMode
  );
  const [isPlayerMenuOpen, setIsPlayerMenuOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [verseDurations, setVerseDurations] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayingIndexRef = useRef<number>(0);
  const hasActiveBackgroundSessionRef = useRef<boolean>(false);
  const pendingAutoPlayChapterRef = useRef<number | null>(null);
  const playbackModeRef = useRef<SurahPlaybackMode>(playbackMode);
  const autoScrollRef = useRef<boolean>(autoScroll);
  const verseDurationsRef = useRef<number[]>([]);
  const currentReciterRef = useRef<Reciter>(currentReciter || POPULAR_RECITERS[0]);
  const handleNextChapterRef = useRef<() => void>(() => {});
  const playerMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    currentPlayingIndexRef.current = currentPlayingIndex;
  }, [currentPlayingIndex]);

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  useEffect(() => {
    verseDurationsRef.current = verseDurations;
  }, [verseDurations]);

  useEffect(() => {
    currentReciterRef.current = currentReciter || POPULAR_RECITERS[0];
  }, [currentReciter]);

  useEffect(() => {
    try {
      localStorage.setItem(
        READER_PLAYER_SETTINGS_KEY,
        JSON.stringify({ autoScroll, playbackSpeed, playbackMode })
      );
    } catch {
      // ignore storage write errors
    }
  }, [autoScroll, playbackSpeed, playbackMode]);

  useBackButton(isPlayerMenuOpen, () => setIsPlayerMenuOpen(false), 15);

  useEffect(() => {
    if (!isPlayerMenuOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (playerMenuRef.current && !playerMenuRef.current.contains(e.target as Node)) {
        setIsPlayerMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPlayerMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlayerMenuOpen]);

  // Format seconds to mm:ss or hh:mm:ss
  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec) || sec < 0) return '0:00';
    const totalSec = Math.floor(sec);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Derive active verse key
  const activeVerse = verses[currentPlayingIndex] || verses[0];
  const activeVerseKey = isPlaying && activeVerse ? activeVerse.verse_key : null;

  // Resolve audio URL for any ayah in this surah
  const getVerseAudioUrl = useCallback(
    (verseKey: string, verseNum: number): string => {
      if (chapterAudioMap && chapterAudioMap[verseKey]) {
        return chapterAudioMap[verseKey];
      }
      return getReciterAyahUrl(currentReciter || POPULAR_RECITERS[0], chapter.id, verseNum);
    },
    [chapterAudioMap, chapter.id, currentReciter]
  );

  // Preload audio metadata across the chapter to compute exact whole-chapter duration
  useEffect(() => {
    if (!verses || verses.length === 0) {
      setVerseDurations([]);
      return;
    }

    let isCancelled = false;
    // Initial smart estimate based on Arabic text length so total duration is non-zero immediately
    const durations = verses.map((v) =>
      Math.max(3, Math.round((v.text_uthmani?.length || 45) * 0.12))
    );
    setVerseDurations([...durations]);

    let nextIdx = 0;
    const activeLoaders: HTMLAudioElement[] = [];
    const CONCURRENCY = 6;

    const loadNext = () => {
      if (isCancelled || nextIdx >= verses.length) return;
      const idx = nextIdx++;
      const v = verses[idx];
      const url = getVerseAudioUrl(v.verse_key, v.verse_number);
      if (!url) {
        loadNext();
        return;
      }

      const a = new Audio();
      a.preload = 'metadata';
      activeLoaders.push(a);

      const finish = () => {
        a.onloadedmetadata = null;
        a.onerror = null;
        const pos = activeLoaders.indexOf(a);
        if (pos !== -1) activeLoaders.splice(pos, 1);
        if (!isCancelled) {
          loadNext();
        }
      };

      a.onloadedmetadata = () => {
        if (!isCancelled && a.duration && !isNaN(a.duration) && isFinite(a.duration) && a.duration > 0) {
          durations[idx] = a.duration;
          setVerseDurations([...durations]);
        }
        finish();
      };

      a.onerror = () => {
        finish();
      };

      a.src = url;
    };

    for (let i = 0; i < Math.min(CONCURRENCY, verses.length); i++) {
      loadNext();
    }

    return () => {
      isCancelled = true;
      activeLoaders.forEach((a) => {
        try {
          a.onloadedmetadata = null;
          a.onerror = null;
          a.removeAttribute('src');
          a.src = '';
        } catch {}
      });
    };
  }, [verses, getVerseAudioUrl]);

  // Whole-chapter total duration and cumulative elapsed time
  const totalChapterDuration = useMemo(() => {
    return verseDurations.reduce((sum, d) => sum + (d || 0), 0);
  }, [verseDurations]);

  const chapterCurrentTime = useMemo(() => {
    let elapsedBefore = 0;
    for (let i = 0; i < currentPlayingIndex; i++) {
      elapsedBefore += verseDurations[i] || 0;
    }
    return Math.min(totalChapterDuration, elapsedBefore + currentTime);
  }, [verseDurations, currentPlayingIndex, currentTime, totalChapterDuration]);

  const preloadAudioUrl = useCallback((url: string) => {
    if (!url) return;
    if (!preloadAudioRef.current) {
      preloadAudioRef.current = new Audio();
      preloadAudioRef.current.preload = 'auto';
    }
    if (preloadAudioRef.current.src !== url) {
      preloadAudioRef.current.src = url;
      preloadAudioRef.current.load();
    }
  }, []);

  const playDirectUrl = useCallback(
    (url: string, targetIndex: number, initialSeekSeconds?: number, onPlaySuccess?: () => void) => {
      if (!url) return;
      currentPlayingIndexRef.current = targetIndex;
      setCurrentPlayingIndex(targetIndex);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      if (audio.src !== url) {
        audio.src = url;
      }
      try {
        audio.currentTime = initialSeekSeconds || 0;
      } catch {}
      applyAudioElementSettings(audio, volume, isMuted, playbackSpeed);
      setCurrentTime(initialSeekSeconds || 0);

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          onPlaySuccess?.();
        })
        .catch((err) => {
          console.warn('Playback error:', err);
          setIsPlaying(false);
        });
    },
    [volume, isMuted, playbackSpeed]
  );

  // Play a specific verse by index and sync audio
  const playVerseByIndex = useCallback(
    (index: number, initialSeekSeconds?: number) => {
      if (!verses || verses.length === 0) return;
      const targetIndex = Math.max(0, Math.min(index, verses.length - 1));
      const targetVerse = verses[targetIndex];
      if (!targetVerse) return;

      const url = getVerseAudioUrl(targetVerse.verse_key, targetVerse.verse_number);
      if (!url) return;

      const existingAudio = audioRef.current;
      const resolvedDuration =
        existingAudio &&
        existingAudio.src === url &&
        existingAudio.duration &&
        isFinite(existingAudio.duration)
          ? existingAudio.duration
          : verseDurationsRef.current[targetIndex] || 0;
      setDuration(resolvedDuration);

      // Preload next ayah (or Ayah 1 of next Surah when Next Surah mode is active)
      if (targetIndex + 1 < verses.length) {
        const nextVerse = verses[targetIndex + 1];
        const nextUrl = getVerseAudioUrl(nextVerse.verse_key, nextVerse.verse_number);
        if (nextUrl) preloadAudioUrl(nextUrl);
      } else if (playbackModeRef.current === 'next-chapter') {
        const nextChapId = chapter.id < 114 ? chapter.id + 1 : 1;
        const nextUrl = getReciterAyahUrl(currentReciterRef.current, nextChapId, 1);
        if (nextUrl) preloadAudioUrl(nextUrl);
      }

      playDirectUrl(url, targetIndex, initialSeekSeconds, () => {
        // Auto-scroll to active ayah if enabled and screen is visible
        if (autoScrollRef.current && typeof document !== 'undefined' && !document.hidden) {
          const el = document.getElementById(`verse-${targetVerse.verse_key}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    },
    [verses, getVerseAudioUrl, chapter.id, preloadAudioUrl, playDirectUrl]
  );

  // Wire HTMLAudioElement events for seamless sequential recitation (including when screen is locked)
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const stopAtSurahEnd = () => {
      hasActiveBackgroundSessionRef.current = false;
      currentPlayingIndexRef.current = 0;
      setCurrentPlayingIndex(0);
      setIsPlaying(false);
      setCurrentTime(0);
      stopBackgroundAudioSession();
    };

    const handleEnded = () => {
      const mode = playbackModeRef.current;
      const expectedChapterId = pendingAutoPlayChapterRef.current ?? chapter.id;
      const areVersesSynced =
        verses.length > 0 && verses[0]?.verse_key.startsWith(`${expectedChapterId}:`);

      // Guard against verse finish before newly switched chapter verses finish fetching
      if (!areVersesSynced) {
        const currentIdx = currentPlayingIndexRef.current;
        if (mode === 'repeat-ayah') {
          const url = getReciterAyahUrl(currentReciterRef.current, expectedChapterId, currentIdx + 1);
          playDirectUrl(url, currentIdx, 0);
          return;
        }
        const nextIdx = currentIdx + 1;
        if (nextIdx < chapter.verses_count) {
          const url = getReciterAyahUrl(currentReciterRef.current, expectedChapterId, nextIdx + 1);
          playDirectUrl(url, nextIdx, 0);
          return;
        }
        if (mode === 'next-chapter') {
          handleNextChapterRef.current();
        } else if (mode === 'repeat-chapter') {
          const url = getReciterAyahUrl(currentReciterRef.current, expectedChapterId, 1);
          playDirectUrl(url, 0, 0);
        } else {
          stopAtSurahEnd();
        }
        return;
      }

      if (mode === 'repeat-ayah') {
        playVerseByIndex(currentPlayingIndexRef.current, 0);
        return;
      }

      const nextIndex = currentPlayingIndexRef.current + 1;
      if (nextIndex < verses.length) {
        playVerseByIndex(nextIndex);
      } else if (mode === 'next-chapter') {
        handleNextChapterRef.current();
      } else if (mode === 'repeat-chapter') {
        playVerseByIndex(0, 0);
      } else {
        stopAtSurahEnd();
      }
    };

    const handleError = () => {
      console.warn('Audio ended with error, advancing to next verse');
      const nextIndex = currentPlayingIndexRef.current + 1;
      if (nextIndex < verses.length) {
        playVerseByIndex(nextIndex);
      } else {
        stopAtSurahEnd();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleLoadedMetadata = () => {
      const d = audio.duration || 0;
      setDuration(d);
      if (d > 0 && isFinite(d)) {
        const idx = currentPlayingIndexRef.current;
        setVerseDurations((prev) => {
          if (prev[idx] === d) return prev;
          const next = [...prev];
          next[idx] = d;
          return next;
        });
      }
      applyAudioElementSettings(audio, volume, isMuted, playbackSpeed);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('emptied', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('emptied', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [verses, chapter.id, chapter.verses_count, playVerseByIndex, playDirectUrl, playbackSpeed, isMuted, volume]);

  // Stop audio and release background session on unmount
  useEffect(() => {
    return () => {
      hasActiveBackgroundSessionRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopBackgroundAudioSession();
    };
  }, []);

  // Scroll to active ayah when user unlocks screen if autoScroll is on
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isPlaying && autoScroll) {
        const v = verses[currentPlayingIndexRef.current];
        if (v) {
          const el = document.getElementById(`verse-${v.verse_key}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, autoScroll, verses]);

  // Switch to previous or next chapter and automatically play from Ayah 1 (for background controls)
  const switchAndPlayChapter = useCallback(
    (targetChapterId: number) => {
      pendingAutoPlayChapterRef.current = targetChapterId;
      const reciter = currentReciterRef.current;
      const firstAyahUrl = getReciterAyahUrl(reciter, targetChapterId, 1);
      const secondAyahUrl = getReciterAyahUrl(reciter, targetChapterId, 2);
      preloadAudioUrl(secondAyahUrl);
      playDirectUrl(firstAyahUrl, 0, 0);
      onSwitchChapter?.(targetChapterId);
    },
    [preloadAudioUrl, playDirectUrl, onSwitchChapter]
  );

  const handleNextChapter = useCallback(() => {
    const nextId = chapter.id < 114 ? chapter.id + 1 : 1;
    switchAndPlayChapter(nextId);
  }, [chapter.id, switchAndPlayChapter]);

  useEffect(() => {
    handleNextChapterRef.current = handleNextChapter;
  }, [handleNextChapter]);

  const handlePrevChapter = useCallback(() => {
    const prevId = chapter.id > 1 ? chapter.id - 1 : 114;
    switchAndPlayChapter(prevId);
  }, [chapter.id, switchAndPlayChapter]);

  // Reset audio when chapter changes (unless triggered by background Prev/Next chapter auto-play)
  useEffect(() => {
    if (pendingAutoPlayChapterRef.current === chapter.id) {
      currentPlayingIndexRef.current = 0;
      setCurrentPlayingIndex(0);
      setRangeStart(1);
      setRangeEnd(Math.min(chapter.verses_count, 5));
      return;
    }
    hasActiveBackgroundSessionRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    stopBackgroundAudioSession();
    setIsPlaying(false);
    currentPlayingIndexRef.current = 0;
    setCurrentPlayingIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setRangeStart(1);
    setRangeEnd(Math.min(chapter.verses_count, 5));
  }, [chapter.id, chapter.verses_count]);

  // Complete chapter transition once new chapter verses arrive
  useEffect(() => {
    if (
      pendingAutoPlayChapterRef.current === chapter.id &&
      verses.length > 0 &&
      verses[0]?.verse_key.startsWith(`${chapter.id}:`)
    ) {
      pendingAutoPlayChapterRef.current = null;
      if (!audioRef.current || audioRef.current.paused) {
        playVerseByIndex(0);
      } else if (autoScrollRef.current && typeof document !== 'undefined' && !document.hidden) {
        const activeV = verses[currentPlayingIndexRef.current] || verses[0];
        const el = activeV ? document.getElementById(`verse-${activeV.verse_key}`) : null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [chapter.id, verses, playVerseByIndex]);

  // Immediately apply newly selected reciter to current audio stream
  const prevReciterIdRef = useRef<number | undefined>(currentReciter?.id);
  useEffect(() => {
    const newId = currentReciter?.id;
    if (prevReciterIdRef.current !== newId) {
      prevReciterIdRef.current = newId;
      if (isPlaying) {
        playVerseByIndex(currentPlayingIndexRef.current, 0);
      } else if (audioRef.current) {
        const currentV = verses[currentPlayingIndexRef.current];
        if (currentV) {
          const newUrl = getVerseAudioUrl(currentV.verse_key, currentV.verse_number);
          if (newUrl && audioRef.current.src !== newUrl) {
            audioRef.current.src = newUrl;
          }
        }
        try {
          audioRef.current.currentTime = 0;
        } catch {}
      }
    }
  }, [currentReciter?.id, isPlaying, playVerseByIndex, verses, getVerseAudioUrl]);

  // Update volume & muted on existing audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update playback speed on existing audio element
  useEffect(() => {
    if (audioRef.current) {
      applyAudioElementSettings(audioRef.current, volume, isMuted, playbackSpeed);
    }
  }, [playbackSpeed, volume, isMuted]);

  // Handle Full Surah Play / Pause Toggle
  const handleTogglePlaySurah = useCallback(() => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      playVerseByIndex(currentPlayingIndexRef.current);
    }
  }, [isPlaying, playVerseByIndex]);

  // Skip to next verse
  const handleNextAyah = useCallback(() => {
    if (currentPlayingIndexRef.current < verses.length - 1) {
      playVerseByIndex(currentPlayingIndexRef.current + 1);
    }
  }, [verses.length, playVerseByIndex]);

  // Skip to previous verse
  const handlePrevAyah = useCallback(() => {
    if (currentPlayingIndexRef.current > 0) {
      playVerseByIndex(currentPlayingIndexRef.current - 1);
    }
  }, [playVerseByIndex]);

  // Seek to an exact second offset across the entire chapter
  const seekToChapterTime = useCallback(
    (targetChapterTime: number) => {
      if (totalChapterDuration <= 0 || verses.length === 0) return;
      const clampedTime = Math.max(0, Math.min(targetChapterTime, totalChapterDuration));

      let accumulated = 0;
      let targetIdx = 0;
      let offsetInVerse = 0;

      for (let i = 0; i < verses.length; i++) {
        const vDur = verseDurations[i] || 5;
        if (clampedTime < accumulated + vDur || i === verses.length - 1) {
          targetIdx = i;
          offsetInVerse = Math.max(0, Math.min(clampedTime - accumulated, vDur));
          break;
        }
        accumulated += vDur;
      }

      if (targetIdx === currentPlayingIndexRef.current && audioRef.current) {
        try {
          audioRef.current.currentTime = offsetInVerse;
        } catch {}
        setCurrentTime(offsetInVerse);
      } else {
        currentPlayingIndexRef.current = targetIdx;
        setCurrentPlayingIndex(targetIdx);
        setCurrentTime(offsetInVerse);
        if (isPlaying) {
          playVerseByIndex(targetIdx, offsetInVerse);
        } else {
          const targetVerse = verses[targetIdx];
          if (targetVerse) {
            const url = getVerseAudioUrl(targetVerse.verse_key, targetVerse.verse_number);
            if (url) {
              if (!audioRef.current) {
                audioRef.current = new Audio();
              }
              audioRef.current.src = url;
              try {
                audioRef.current.currentTime = offsetInVerse;
              } catch {}
            }
          }
        }
      }
    },
    [totalChapterDuration, verses, verseDurations, isPlaying, playVerseByIndex, getVerseAudioUrl]
  );

  // Sync MediaSession & Android Foreground Service for lock-screen playback
  useEffect(() => {
    if (isPlaying) {
      hasActiveBackgroundSessionRef.current = true;
    } else if (!hasActiveBackgroundSessionRef.current) {
      return;
    }
    const v = verses[currentPlayingIndex] || verses[0];
    const surahName = `Surah ${chapter.name_simple}`;
    const isVersesSynced = v && v.verse_key.startsWith(`${chapter.id}:`);
    const ayahNum = isVersesSynced ? v.verse_number : currentPlayingIndex + 1;
    const ayahLabel = `Ayah ${ayahNum}`;
    updateBackgroundAudioSession({
      title: `${surahName} • ${ayahLabel}`,
      artist: currentReciterName || currentReciter?.name || 'Mishari Rashid Al-Afasy',
      album: surahName,
      isPlaying,
      duration: totalChapterDuration,
      position: chapterCurrentTime,
      playbackSpeed,
      controls: {
        onPlay: () => {
          playVerseByIndex(currentPlayingIndexRef.current);
        },
        onPause: () => {
          audioRef.current?.pause();
          setIsPlaying(false);
        },
        onStop: () => {
          hasActiveBackgroundSessionRef.current = false;
          audioRef.current?.pause();
          setIsPlaying(false);
          stopBackgroundAudioSession();
        },
        onNext: handleNextChapter,
        onPrev: handlePrevChapter,
        onSeek: seekToChapterTime,
      },
    });
  }, [
    isPlaying,
    currentPlayingIndex,
    currentTime,
    verses,
    chapter.id,
    chapter.name_simple,
    currentReciterName,
    currentReciter?.name,
    totalChapterDuration,
    chapterCurrentTime,
    playbackSpeed,
    playVerseByIndex,
    handleNextChapter,
    handlePrevChapter,
    seekToChapterTime,
  ]);

  // Restart chapter from beginning
  const handleRestart = useCallback(() => {
    currentPlayingIndexRef.current = 0;
    setCurrentPlayingIndex(0);
    setCurrentTime(0);
    if (isPlaying) {
      playVerseByIndex(0, 0);
    } else if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
      } catch {}
    }
  }, [isPlaying, playVerseByIndex]);

  // Scrubber seeking across the whole chapter
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (totalChapterDuration <= 0 || verses.length === 0) return;
    const targetChapterTime = (parseFloat(e.target.value) / 100) * totalChapterDuration;
    seekToChapterTime(targetChapterTime);
  };

  // Select playback speed
  const handleSelectSpeed = useCallback(
    (nextSpeed: number) => {
      setPlaybackSpeed(nextSpeed);
      if (audioRef.current) {
        applyAudioElementSettings(audioRef.current, volume, isMuted, nextSpeed);
      }
    },
    [volume, isMuted]
  );

  // Toggle auto-scroll and snap to active verse when re-enabled mid-recitation
  const handleToggleAutoScroll = useCallback(() => {
    const next = !autoScroll;
    setAutoScroll(next);
    autoScrollRef.current = next;
    if (next && isPlaying && typeof document !== 'undefined' && !document.hidden) {
      const activeV = verses[currentPlayingIndexRef.current];
      if (activeV) {
        const el = document.getElementById(`verse-${activeV.verse_key}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [autoScroll, isPlaying, verses]);

  // Select end-of-playback / repeat mode
  const handleSelectPlaybackMode = useCallback(
    (mode: SurahPlaybackMode) => {
      setPlaybackMode(mode);
      playbackModeRef.current = mode;
      if (mode === 'next-chapter' && currentPlayingIndexRef.current === verses.length - 1) {
        const nextChapId = chapter.id < 114 ? chapter.id + 1 : 1;
        const nextUrl = getReciterAyahUrl(currentReciterRef.current, nextChapId, 1);
        if (nextUrl) preloadAudioUrl(nextUrl);
      }
    },
    [verses.length, chapter.id, preloadAudioUrl]
  );

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      return next;
    });
  }, [volume]);

  // Volume slider change
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
      if (val > 0 && isMuted) {
        setIsMuted(false);
      }
      if (audioRef.current) {
        audioRef.current.volume = val;
      }
    },
    [isMuted]
  );

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
    preferences?.showWordByWord ?? true
  );
  const [localScriptType, setLocalScriptType] = useState<ArabicScriptType>(
    preferences?.arabicScriptType || 'text_uthmani_tajweed'
  );

  useEffect(() => {
    if (preferences?.showWordByWord !== undefined) {
      setShowWordByWord(preferences.showWordByWord);
    }
  }, [preferences?.showWordByWord]);

  const handleCopy = (verse: Verse) => {
    // @ts-ignore
    const scriptText = cleanTranslationText(verse[preferences?.arabicScriptType || 'text_uthmani'] || verse.text_uthmani);
    const text = `${scriptText}\n${cleanTranslationText(
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

        {/* Integrated Gapless Audio Player & Recitation Controller matching Studio page */}
        <div className="rounded-3xl bg-white dark:bg-[#0E1626] border border-slate-200 dark:border-slate-800/80 shadow-md dark:shadow-xl p-4 sm:p-5 mb-6 transition-colors">
          {/* Top Bar inside Player: Status & Three-Point Options Menu */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {isPlaying ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-300 dark:bg-slate-600" />
                )}
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                {isPlaying ? `Reciting Surah ${chapter.name_simple}` : 'Surah Audio Player'}
              </span>
            </div>

            {/* Three-Point (...) Options Menu Button */}
            <div className="relative shrink-0" ref={playerMenuRef}>
              <button
                type="button"
                onClick={() => setIsPlayerMenuOpen((prev) => !prev)}
                aria-label="Player options"
                aria-expanded={isPlayerMenuOpen}
                aria-haspopup="menu"
                title="Player options"
                className={`relative flex items-center justify-center w-8 h-8 rounded-full border transition-all active:scale-95 cursor-pointer ${
                  isPlayerMenuOpen
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80'
                }`}
              >
                <MoreHorizontal className="w-4 h-4" />
                {(playbackMode !== 'off' || playbackSpeed !== 1.0 || !autoScroll) && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 ring-2 ring-white dark:ring-[#0E1626]"
                    aria-hidden="true"
                  />
                )}
              </button>

              {isPlayerMenuOpen && (
                <div
                  role="menu"
                  aria-label="Surah audio player options"
                  className="absolute right-0 top-full mt-2 w-[min(calc(100vw-2.5rem),19rem)] max-h-[75vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/80 shadow-2xl shadow-slate-900/15 dark:shadow-black/70 p-3 z-[35] space-y-3 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
                >
                  {/* 1. Change Reciter */}
                  {onOpenReciters && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsPlayerMenuOpen(false);
                        onOpenReciters();
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Mic2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-slate-900 dark:text-white">
                            Change Reciter
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {currentReciterName || currentReciter?.name || 'Select Reciter'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5 shrink-0" />
                    </button>
                  )}

                  {/* 2. Auto-scroll Toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoScroll}
                    onClick={handleToggleAutoScroll}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <ScrollText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white">
                          Auto-scroll
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          Follow active ayah
                        </span>
                      </div>
                    </div>
                    <span
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                        autoScroll ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
                          autoScroll ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* 3. Auto-switch Next Chapter or Repeat */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Repeat className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                        After Surah &amp; Repeat
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PLAYBACK_MODE_OPTIONS.map((opt) => {
                        const isSelected = playbackMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={isSelected}
                            onClick={() => handleSelectPlaybackMode(opt.id)}
                            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {opt.id === 'off' && <CircleOff className="w-3.5 h-3.5 shrink-0" />}
                            {opt.id === 'next-chapter' && <StepForward className="w-3.5 h-3.5 shrink-0" />}
                            {opt.id === 'repeat-chapter' && <Repeat className="w-3.5 h-3.5 shrink-0" />}
                            {opt.id === 'repeat-ayah' && <Repeat1 className="w-3.5 h-3.5 shrink-0" />}
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="px-1 text-[10.5px] text-slate-500 dark:text-slate-400">
                      {PLAYBACK_MODE_OPTIONS.find((m) => m.id === playbackMode)?.description}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* 4. Playback Speed */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Gauge className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                        Playback Speed
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPlaybackSpeed(playbackSpeed)}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {PLAYER_SPEED_OPTIONS.map((speed) => {
                        const isSelected = playbackSpeed === speed;
                        return (
                          <button
                            key={speed}
                            type="button"
                            role="menuitemradio"
                            aria-checked={isSelected}
                            onClick={() => handleSelectSpeed(speed)}
                            className={`py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950 border-emerald-500 dark:border-emerald-400 shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {formatPlaybackSpeed(speed)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Integrated Gapless Audio Player & Scrubber */}
          <div className="space-y-2 transition-colors">
            {/* Scrubber Track */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 min-w-[28px]">
                {formatSeconds(chapterCurrentTime)}
              </span>
              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={totalChapterDuration > 0 ? (chapterCurrentTime / totalChapterDuration) * 100 : 0}
                  onChange={handleScrubberChange}
                  className="w-full accent-emerald-500 dark:accent-emerald-400 bg-slate-200 dark:bg-slate-800 h-1 rounded-full cursor-pointer transition-colors"
                />
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 min-w-[28px] text-right">
                {formatSeconds(totalChapterDuration)}
              </span>
            </div>

            {/* Subtitle */}
            <div className="text-center -mt-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide">
                Gapless Sound
              </span>
            </div>

            {/* Transport Buttons */}
            <div className="grid grid-cols-3 items-center px-3 pt-0.5">
              {/* Left: Restart & Prev */}
              <div className="flex items-center justify-start gap-4">
                <button
                  onClick={handleRestart}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={handlePrevAyah}
                  disabled={currentPlayingIndex === 0}
                  className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                  title="Previous Ayah"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Center: Play/Pause */}
              <div className="flex items-center justify-center">
                <button
                  onClick={handleTogglePlaySurah}
                  className="w-12 h-12 rounded-full bg-emerald-500 dark:bg-emerald-400 hover:bg-emerald-600 dark:hover:bg-emerald-300 text-white dark:text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>
              </div>

              {/* Right: Next & Volume */}
              <div className="flex items-center justify-end gap-2 sm:gap-3">
                <button
                  onClick={handleNextAyah}
                  disabled={currentPlayingIndex >= verses.length - 1}
                  className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                  title="Next Ayah"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>

                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    onClick={handleToggleMute}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-12 sm:w-16 accent-emerald-500 dark:accent-emerald-400 bg-slate-200 dark:bg-slate-800 h-1 rounded-full cursor-pointer transition-colors"
                    title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                  />
                </div>
              </div>
            </div>

            {/* Status line */}
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400 dark:text-slate-500 px-3 -mt-0.5">
              {/* Current Reciter Label */}
              <div className="flex items-center gap-1.5 min-w-0">
                <Mic2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span className="truncate font-sans text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {currentReciterName || currentReciter?.name || 'Reciter'}
                </span>
              </div>

              {/* Active Mode/Speed Badges & Ayah Count */}
              <div className="flex items-center gap-2 shrink-0">
                {playbackMode !== 'off' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-sans text-[10px] font-semibold">
                    {playbackMode === 'next-chapter' && <StepForward className="w-2.5 h-2.5" />}
                    {playbackMode === 'repeat-chapter' && <Repeat className="w-2.5 h-2.5" />}
                    {playbackMode === 'repeat-ayah' && <Repeat1 className="w-2.5 h-2.5" />}
                    <span>
                      {PLAYBACK_MODE_OPTIONS.find((m) => m.id === playbackMode)?.label}
                    </span>
                  </span>
                )}
                {playbackSpeed !== 1.0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                    {formatPlaybackSpeed(playbackSpeed)}
                  </span>
                )}
                <span>
                  {currentPlayingIndex + 1}:{verses.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 2: READING THE QURAN WITH OR WITHOUT THE TAFSIR              */}
      {/* ===================================================================== */}
      <section aria-label="Reading the Quran with or without Tafsir">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 p-4 rounded-2xl bg-white dark:bg-[#0E1626] border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md transition-colors">
          
          {/* Header Title & Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Quran Reading
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Surah {chapter.name_simple}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize your reading and exegesis experience
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Toggles */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <button
                onClick={() => setIsTafsirMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isTafsirMode
                    ? 'bg-white dark:bg-[#0B1120] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Reading
              </button>
              <button
                onClick={() => setIsTafsirMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isTafsirMode
                    ? 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Tafsir
              </button>
            </div>

            {/* Tafsir Selector Dropdown (Shown only in Tafsir Mode) */}
            {isTafsirMode && (
              <select
                value={selectedTafsirId}
                onChange={(e) => setSelectedTafsirId(e.target.value as TafsirEditionId)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer shadow-xs max-w-[160px] sm:max-w-[200px] truncate"
                title="Select Exegesis (Tafsir)"
              >
                {AVAILABLE_TAFSIRS.map((taf) => (
                  <option key={taf.id} value={taf.id}>
                    {taf.name}
                  </option>
                ))}
              </select>
            )}

            {/* Word-by-Word Toggle */}
            <button
              onClick={() => setShowWordByWord(!showWordByWord)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                showWordByWord
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-white dark:bg-[#0B1120] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Word-by-Word</span>
            </button>

            <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            {/* Script Type Segmented Control */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <button
                onClick={() => setLocalScriptType('text_uthmani_tajweed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  localScriptType === 'text_uthmani_tajweed'
                    ? 'bg-white dark:bg-[#0B1120] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                تجويد
              </button>
              <button
                onClick={() => setLocalScriptType('text_indopak')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  localScriptType === 'text_indopak'
                    ? 'bg-white dark:bg-[#0B1120] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                IndoPak
              </button>
              <button
                onClick={() => setLocalScriptType('text_uthmani')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  localScriptType === 'text_uthmani'
                    ? 'bg-white dark:bg-[#0B1120] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                عثماني
              </button>
            </div>

            <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            {/* Info and Translation Shortcuts */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenSurahInfo}
                className="p-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-[#0B1120] dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                title="About Surah"
              >
                <Info className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenTranslations}
                className="p-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-[#0B1120] dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                title={`Translation: ${currentTranslationName}`}
              >
                <Languages className="w-4 h-4" />
              </button>
            </div>
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

                    {/* View Image Button */}
                    {verse.image_url && (
                      <a
                        href={`https:${verse.image_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800/60 dark:hover:bg-slate-700 dark:text-slate-400 transition-colors flex items-center justify-center"
                        title="View Quran Image"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </a>
                    )}

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
                  className={`text-right font-semibold leading-[2.2] sm:leading-[2.4] tracking-wide mb-4 select-text flex flex-wrap flex-row-reverse ${
                    !preferences?.arabicFontSize ? 'text-2xl sm:text-3xl md:text-4xl' : ''
                  } ${
                    !preferences?.useCustomColors ? 'text-slate-900 dark:text-white' : ''
                  }`}
                  style={{
                    fontFamily: `"${preferences?.arabicFontFamily || 'Amiri Quran'}", serif`,
                    fontSize: preferences?.arabicFontSize
                      ? `${preferences.arabicFontSize}px`
                      : undefined,
                    color: preferences?.useCustomColors
                      ? preferences.arabicTextColor
                      : undefined,
                  }}
                  dir="rtl"
                >
                  {showWordByWord && verse.words && verse.words.length > 0 ? (
                    verse.words.map((w) => {
                      const scriptType = localScriptType;
                      // @ts-ignore
                      let wordText = w[scriptType] || w.text_uthmani || w.text;
                      if (w.char_type_name === 'end') {
                        return (
                          <span
                            key={w.id}
                            className="inline-block font-bold mx-2 relative group cursor-default"
                            style={{
                              color: preferences?.accentColor || undefined,
                              fontSize: preferences?.arabicFontSize
                                ? `${Math.max(16, Math.round(preferences.arabicFontSize * 0.65))}px`
                                : undefined,
                            }}
                          >
                            ۝{verse.verse_number}
                          </span>
                        );
                      }
                      return (
                        <div key={w.id} className="relative group inline-block mx-1 sm:mx-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors px-1">
                          {scriptType === 'text_uthmani_tajweed' ? (
                             <span dangerouslySetInnerHTML={{ __html: wordText }} />
                          ) : (
                             <span>{wordText}</span>
                          )}
                          
                          {/* Tooltip */}
                          {w.translation?.text && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 w-max max-w-[150px]">
                              <div className="bg-slate-900 dark:bg-slate-800 text-white text-[11px] sm:text-xs font-sans px-2.5 py-1.5 rounded-lg shadow-xl text-center border border-slate-700/50">
                                {w.translation.text}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <>
                      {/* @ts-ignore */}
                      <span dangerouslySetInnerHTML={{ __html: cleanTranslationText(verse[localScriptType] || verse.text_uthmani) }} />
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
                    </>
                  )}
                </div>



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
                        // @ts-ignore
                        onClick={() => onOpenTafsir(verse.verse_key, cleanTranslationText(verse[preferences?.arabicScriptType || 'text_uthmani'] || verse.text_uthmani))}
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
