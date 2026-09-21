'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Reciter, Chapter } from '@/types/quran';
import { POPULAR_RECITERS, getReciterPreviewUrl } from '@/lib/constants';
import {
  isSurahAudioCached,
  downloadSurahAudio,
  deleteSurahAudioCache,
} from '@/lib/audio-cache';
import {
  Mic2,
  X,
  Check,
  Play,
  Pause,
  Search,
  Download,
  Loader2,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface ReciterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReciterId: number;
  onSelectReciter: (reciter: Reciter) => void;
  currentChapter?: Chapter | null;
}

export const ReciterModal: React.FC<ReciterModalProps> = ({
  isOpen,
  onClose,
  selectedReciterId,
  onSelectReciter,
  currentChapter,
}) => {
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingReciterId, setPlayingReciterId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Download & offline caching states
  const [downloadingReciterId, setDownloadingReciterId] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    [reciterId: number]: { current: number; total: number; percent: number };
  }>({});
  const [cachedMap, setCachedMap] = useState<{ [reciterId: number]: boolean }>({});

  const stopPreviewAudio = useCallback(() => {
    if (previewAudio) {
      try {
        previewAudio.onended = null;
        previewAudio.onerror = null;
        previewAudio.pause();
        previewAudio.removeAttribute('src');
        previewAudio.src = '';
        previewAudio.load();
      } catch {}
      setPreviewAudio(null);
    }
    setPlayingReciterId(null);
  }, [previewAudio]);

  // Clean up preview audio on unmount or if modal closes
  useEffect(() => {
    if (!isOpen) {
      stopPreviewAudio();
    }
  }, [isOpen, stopPreviewAudio]);

  useEffect(() => {
    return () => {
      stopPreviewAudio();
    };
  }, [stopPreviewAudio]);

  // Check cache status for all reciters for the current Surah
  const checkCacheStatus = useCallback(async () => {
    if (!currentChapter?.id) return;
    const totalAyahs = currentChapter.verses_count || 7;
    const statusMap: { [reciterId: number]: boolean } = {};

    for (const r of POPULAR_RECITERS) {
      const res = await isSurahAudioCached(r, currentChapter.id, totalAyahs);
      statusMap[r.id] = res.isFullyCached;
    }
    setCachedMap(statusMap);
  }, [currentChapter]);

  useEffect(() => {
    if (isOpen) {
      checkCacheStatus();
    }
  }, [isOpen, checkCacheStatus]);

  if (!isOpen) return null;

  const handlePreview = (reciter: Reciter, e: React.MouseEvent) => {
    e.stopPropagation();

    if (previewAudio) {
      stopPreviewAudio();
      if (playingReciterId === reciter.id) {
        return;
      }
    }

    const audioUrl = getReciterPreviewUrl(reciter);
    const audio = new Audio(audioUrl);
    audio.onended = () => {
      setPlayingReciterId(null);
    };
    audio.onerror = () => {
      setPlayingReciterId(null);
    };

    audio.play().catch(() => {
      setPlayingReciterId(null);
    });

    setPreviewAudio(audio);
    setPlayingReciterId(reciter.id);
  };

  const handleDownload = async (reciter: Reciter, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentChapter?.id) return;

    const totalAyahs = currentChapter.verses_count || 7;

    // If already fully cached, delete cache to free space
    if (cachedMap[reciter.id]) {
      await deleteSurahAudioCache(reciter, currentChapter.id, totalAyahs);
      setCachedMap((prev) => ({ ...prev, [reciter.id]: false }));
      return;
    }

    // Start downloading with AbortController for pause/cancel
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsPaused(false);
    setDownloadingReciterId(reciter.id);
    setDownloadProgress((prev) => ({
      ...prev,
      [reciter.id]: prev[reciter.id] || { current: 0, total: totalAyahs, percent: 0 },
    }));

    try {
      await downloadSurahAudio(
        reciter,
        currentChapter.id,
        totalAyahs,
        (current, total, percent) => {
          setDownloadProgress((prev) => ({
            ...prev,
            [reciter.id]: { current, total, percent },
          }));
        },
        controller.signal
      );
      setCachedMap((prev) => ({ ...prev, [reciter.id]: true }));
      setDownloadingReciterId(null);
      setIsPaused(false);
    } catch (err) {
      console.warn('Download paused or cancelled:', err);
    }
  };

  const handleTogglePause = (reciter: Reciter, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPaused) {
      // Resume
      handleDownload(reciter, e);
    } else {
      // Pause
      abortControllerRef.current?.abort();
      setIsPaused(true);
    }
  };

  const handleCancelDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    abortControllerRef.current?.abort();
    setDownloadingReciterId(null);
    setIsPaused(false);
    checkCacheStatus();
  };

  const handleClose = () => {
    stopPreviewAudio();
    setSearchQuery('');
    onClose();
  };

  const filteredReciters = POPULAR_RECITERS.filter((reciter) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      reciter.name.toLowerCase().includes(q) ||
      (reciter.description && reciter.description.toLowerCase().includes(q)) ||
      (reciter.style && reciter.style.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Mic2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Choose Reciter Voice
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentChapter ? (
                  <>
                    Download voice for{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Surah {currentChapter.name_simple}
                    </span>{' '}
                    to use offline anytime
                  </>
                ) : (
                  `${POPULAR_RECITERS.length} world-renowned Quran reciters available`
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reciter by name, style, or country..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Reciters List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
          {filteredReciters.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No reciters found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredReciters.map((reciter) => {
              const isSelected = reciter.id === selectedReciterId;
              const isPlaying = playingReciterId === reciter.id;
              const isDownloading = downloadingReciterId === reciter.id;
              const progress = downloadProgress[reciter.id];
              const isCached = cachedMap[reciter.id];

              return (
                <div
                  key={reciter.id}
                  onClick={() => {
                    stopPreviewAudio();
                    onSelectReciter(reciter);
                    handleClose();
                  }}
                  className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500/70 text-slate-900 dark:text-white shadow-sm ring-1 ring-emerald-500/40'
                      : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Mic2 className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span className="truncate">{reciter.name}</span>
                        {reciter.style && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-medium shrink-0">
                            {reciter.style}
                          </span>
                        )}
                        {isCached && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Downloaded</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {reciter.description}
                      </p>

                      {/* Download Progress Bar & Pause / Cancel Controls */}
                      {isDownloading && progress && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 animate-in fade-in cursor-default"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              {isPaused ? (
                                <Pause className="w-3 h-3 text-amber-500" />
                              ) : (
                                <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                              )}
                              <span>{isPaused ? 'Paused' : 'Downloading'}:</span>
                              <span>{progress.current} / {progress.total} ayahs</span>
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{progress.percent}%</span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-200 ${
                                isPaused ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>

                          {/* Pause / Resume & Cancel Buttons */}
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => handleTogglePause(reciter, e)}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all"
                            >
                              {isPaused ? (
                                <>
                                  <Play className="w-2.5 h-2.5 fill-current text-emerald-600 dark:text-emerald-400" />
                                  <span>Resume</span>
                                </>
                              ) : (
                                <>
                                  <Pause className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                  <span>Pause</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={handleCancelDownload}
                              className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 transition-all"
                            >
                              <X className="w-2.5 h-2.5" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Download / Cache Button */}
                    {currentChapter && (
                      <button
                        type="button"
                        onClick={(e) => handleDownload(reciter, e)}
                        disabled={isDownloading}
                        className={`p-2 rounded-xl transition-all ${
                          isCached
                            ? 'bg-emerald-500/10 hover:bg-rose-500/15 text-emerald-600 dark:text-emerald-400 hover:text-rose-600 dark:hover:text-rose-400 border border-emerald-500/30 hover:border-rose-500/30'
                            : isDownloading
                            ? 'bg-emerald-500 text-white animate-pulse'
                            : 'bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={
                          isCached
                            ? `Surah ${currentChapter.name_simple} downloaded offline. Click to remove.`
                            : `Download Surah ${currentChapter.name_simple} voice offline`
                        }
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isCached ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => handlePreview(reciter, e)}
                      className={`p-2 rounded-xl transition-all ${
                        isPlaying
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-600/30 animate-pulse'
                          : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                      title="Listen to 1:1 preview"
                    >
                      {isPlaying ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>

                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
