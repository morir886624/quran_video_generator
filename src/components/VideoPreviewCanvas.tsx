'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chapter, Verse, VideoConfig } from '@/types/quran';
import {
  createParticles,
  getCanvasDimensions,
  Particle,
  renderVideoFrame,
} from '@/lib/video-engine';
import {
  StitchedAudioPlayer,
  stitchAudioBuffers,
} from '@/lib/audio-stitcher';
import { fetchPersianTafsirSurah } from '@/lib/quran-api';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  Volume1,
  VolumeX,
  Loader2,
  Radio,
} from 'lucide-react';
import { useBackButton } from '@/lib/back-button';

/**
 * Solid rounded triangle icon matching user uploaded media
 * (pointing down for collapse, pointing up for expand)
 */
export const TriangleIcon: React.FC<{ direction: 'down' | 'up'; className?: string }> = ({
  direction,
  className = 'w-3.5 h-3.5 fill-current',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`${className} transition-transform duration-200 origin-center ${
      direction === 'up' ? 'rotate-180' : ''
    }`}
    aria-hidden="true"
  >
    <path d="M12 17.5a1.3 1.3 0 0 1-1.08-.58L3.42 6.92A1.25 1.25 0 0 1 4.5 5h15a1.25 1.25 0 0 1 1.08 1.92l-7.5 10a1.3 1.3 0 0 1-1.08.58z" />
  </svg>
);

interface VideoPreviewCanvasProps {
  verses: Verse[];
  audioUrls: string[];
  chapter: Chapter | null;
  config: VideoConfig;
  onChangeConfig?: (updates: Partial<VideoConfig>) => void;
  onActiveVerseChange?: (verse: Verse, index: number) => void;
  topBar?: React.ReactNode;
  categoryTabs?: React.ReactNode;
  children?: React.ReactNode;
  isModalOpen?: boolean;
}

export const VideoPreviewCanvas: React.FC<VideoPreviewCanvasProps> = ({
  verses,
  audioUrls,
  chapter,
  config,
  onChangeConfig,
  onActiveVerseChange,
  topBar,
  categoryTabs,
  children,
  isModalOpen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<StitchedAudioPlayer | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const customMediaElRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [stitchedKey, setStitchedKey] = useState<string | null>(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [verseProgress, setVerseProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const playbackSpeed = config.playbackSpeed || 1.0;
  const [persianTafsirMap, setPersianTafsirMap] = useState<Record<number, string>>({});
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  // Close editing drawer on back button if open
  useBackButton(isToolsOpen, () => setIsToolsOpen(false), 20);

  const currentStitchKey = `${audioUrls.join(',')}|${verses.map((v) => v.verse_key).join(',')}`;
  const isStitchingAudio = audioUrls.length > 0 && verses.length > 0 && stitchedKey !== currentStitchKey;

  const currentVerse = verses[currentAyahIndex] || verses[0] || null;

  // Load Persian Tafsir when chapter or edition changes or showPersianTafsir is enabled
  useEffect(() => {
    if (!chapter?.id || !config.showPersianTafsir) return;

    let isMounted = true;
    fetchPersianTafsirSurah(chapter.id, config.persianTafsirEdition)
      .then((map) => {
        if (isMounted) {
          setPersianTafsirMap(map);
        }
      })
      .catch((err) => {
        console.error('Failed to load Persian tafsir for canvas:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [chapter?.id, config.showPersianTafsir, config.persianTafsirEdition]);

  // Initialize particles when config or aspect ratio changes
  useEffect(() => {
    const { width, height } = getCanvasDimensions(config.aspectRatio, 1080);
    particlesRef.current = createParticles(45, width, height);
  }, [config.aspectRatio, config.backgroundPreset]);

  // Load custom media element if custom URL is provided
  useEffect(() => {
    if (!config.customMediaUrl) {
      customMediaElRef.current = null;
      return;
    }

    if (config.customMediaType === 'video') {
      const vid = document.createElement('video');
      vid.src = config.customMediaUrl;
      vid.crossOrigin = 'anonymous';
      vid.loop = true;
      vid.muted = true;
      vid.play().catch(() => {});
      customMediaElRef.current = vid;
    } else {
      const img = new Image();
      img.src = config.customMediaUrl;
      img.crossOrigin = 'anonymous';
      customMediaElRef.current = img;
    }
  }, [config.customMediaUrl, config.customMediaType]);

  // Notify parent of active verse
  useEffect(() => {
    if (currentVerse && onActiveVerseChange) {
      onActiveVerseChange(currentVerse, currentAyahIndex);
    }
  }, [currentVerse, currentAyahIndex, onActiveVerseChange]);

  // Automatically pause canvas video playback whenever a modal is opened
  useEffect(() => {
    if (isModalOpen && playerRef.current) {
      playerRef.current.pause();
      setIsPlaying(false);
    }
  }, [isModalOpen]);

  // Initialize and stitch audio whenever selected verses or audioUrls change
  useEffect(() => {
    if (audioUrls.length === 0 || verses.length === 0) return;

    let isCancelled = false;

    if (!playerRef.current) {
      playerRef.current = new StitchedAudioPlayer();
    }
    const player = playerRef.current;
    player.setPlaybackRate(playbackSpeed);

    // Fully stop any existing playback and reset UI play state on audio change
    player.stop();
    setIsPlaying(false);
    setCurrentAyahIndex(0);
    setCurrentTime(0);
    setVerseProgress(0);

    const verseKeys = verses.map((v) => v.verse_key);
    player.setFallbackAudio(audioUrls, verseKeys);

    player.onTimeUpdate = (cur, total, activeIdx, vProg) => {
      if (!isCancelled) {
        setCurrentTime(cur);
        setTotalDuration(total);
        setCurrentAyahIndex(activeIdx);
        setVerseProgress(vProg);
      }
    };

    player.onEnded = () => {
      if (!isCancelled) {
        setIsPlaying(false);
      }
    };

    stitchAudioBuffers(audioUrls, verseKeys, player.getContext())
      .then((stitchedResult) => {
        if (!isCancelled) {
          player.setStitchedAudio(stitchedResult);
          setTotalDuration(stitchedResult.totalDuration);
          setStitchedKey(currentStitchKey);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('Audio stitch warning (continuing with HTML5 streaming):', err);
          setStitchedKey(currentStitchKey);
        }
      });

    return () => {
      isCancelled = true;
      if (playerRef.current) {
        playerRef.current.stop();
      }
      setIsPlaying(false);
    };
  }, [audioUrls, verses, currentStitchKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  const togglePlay = useCallback(async () => {
    if (!playerRef.current) return;
    const player = playerRef.current;

    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await player.play();
    }
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    if (!playerRef.current) return;
    if (currentAyahIndex < verses.length - 1) {
      playerRef.current.seekToVerseIndex(currentAyahIndex + 1);
    } else {
      playerRef.current.seek(0);
    }
  }, [currentAyahIndex, verses.length]);

  const handlePrev = useCallback(() => {
    if (!playerRef.current) return;
    if (currentAyahIndex > 0) {
      playerRef.current.seekToVerseIndex(currentAyahIndex - 1);
    } else {
      playerRef.current.seek(0);
    }
  }, [currentAyahIndex]);

  const handleRestart = useCallback(() => {
    if (!playerRef.current) return;
    playerRef.current.seek(0);
  }, []);

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current || totalDuration === 0) return;
    const seekTime = (parseFloat(e.target.value) / 100) * totalDuration;
    playerRef.current.seek(seekTime);
  };

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (playerRef.current) {
      playerRef.current.setVolume(nextMuted ? 0 : volume);
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
    if (playerRef.current) {
      playerRef.current.setVolume(val);
    }
  }, [isMuted]);

  // Sync playback speed to player and background video whenever playbackSpeed changes
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(playbackSpeed);
    }
    if (customMediaElRef.current instanceof HTMLVideoElement) {
      customMediaElRef.current.playbackRate = playbackSpeed;
      const vid = customMediaElRef.current;
      vid.preservesPitch = true;
      (vid as any).webkitPreservesPitch = true;
      (vid as any).mozPreservesPitch = true;
      vid.playbackRate = playbackSpeed;
      vid.preservesPitch = true;
      (vid as any).webkitPreservesPitch = true;
      (vid as any).mozPreservesPitch = true;
    }
  }, [playbackSpeed]);

  const handleCycleSpeed = useCallback(() => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    onChangeConfig?.({ playbackSpeed: nextSpeed });
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(nextSpeed);
    }
    if (customMediaElRef.current instanceof HTMLVideoElement) {
      customMediaElRef.current.playbackRate = nextSpeed;
      const vid = customMediaElRef.current;
      vid.preservesPitch = true;
      (vid as any).webkitPreservesPitch = true;
      (vid as any).mozPreservesPitch = true;
      vid.playbackRate = nextSpeed;
      vid.preservesPitch = true;
      (vid as any).webkitPreservesPitch = true;
      (vid as any).mozPreservesPitch = true;
    }
  }, [playbackSpeed, onChangeConfig]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getCanvasDimensions(config.aspectRatio, 1080);
    canvas.width = width;
    canvas.height = height;

    const startTime = performance.now();

    const loop = (timestamp: number) => {
      const totalProgress =
        totalDuration > 0 ? Math.min(currentTime / totalDuration, 1) : verseProgress;

      const activePersianText = currentVerse
        ? persianTafsirMap[currentVerse.verse_number] || currentVerse.persianTafsir
        : undefined;

      renderVideoFrame({
        ctx,
        width,
        height,
        config,
        chapter,
        currentVerse,
        verseProgress,
        totalProgress,
        particles: particlesRef.current,
        time: timestamp - startTime,
        customMediaElement: customMediaElRef.current,
        persianTafsirText: activePersianText,
      });

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [config, chapter, currentVerse, verseProgress, currentTime, totalDuration, persianTafsirMap]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getContainerAspectStyle = () => {
    switch (config.aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[42vh] sm:max-h-[46vh] w-auto max-w-[270px] sm:max-w-[310px]';
      case '1:1':
        return 'aspect-square max-h-[36vh] sm:max-h-[40vh] w-full max-w-[320px]';
      case '16:9':
        return 'aspect-[16/9] max-h-[28vh] sm:max-h-[32vh] w-full max-w-[460px]';
    }
  };

  return (
    <div className="w-full max-w-[380px] sm:max-w-[395px] mx-auto rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-2xl shadow-slate-300/40 dark:shadow-black overflow-hidden flex flex-col relative transition-all h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px)-9px)] sm:h-[694px]">
      {/* Joint Top Bar at the top of the video frame */}
      <div className="shrink-0 z-20">
        {topBar}
      </div>

      {/* Video Canvas Container (Top Half) */}
      <div
        className="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-300 ease-in-out bg-slate-950"
        onClick={togglePlay}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />

        {/* Loading / Audio Stitching Badge */}
        {isStitchingAudio && (
          <div className="absolute top-2 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-emerald-400 shadow-md">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Optimizing audio...</span>
          </div>
        )}
      </div>

      {/* Exterior Open/Close Button on Top Right of modal using relative positions */}
      <div className={`relative w-full flex justify-end  -mb-px z-30 pointer-events-none transition-all duration-300 ease-in-out shrink-0 ${
        isToolsOpen ? '-mt-[188px] sm:-mt-[198px]' : '-mt-8'
      }`}>
        <button
          type="button"
          onClick={() => setIsToolsOpen(!isToolsOpen)}
          style={{
            borderTopLeftRadius: '14px',
            borderTopRightRadius: '14px',
            borderBottomLeftRadius: '0px',
            borderBottomRightRadius: '0px',
          }}
          className={`pointer-events-auto relative flex items-center gap-1.5 px-3 py-1.5 rounded-tab-top rounded-t-2xl rounded-b-none text-xs font-bold transition-all shadow-md border active:scale-95 cursor-pointer ${
            isToolsOpen
              ? 'bg-white/95 dark:bg-[#0E1626]/95 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-700/90 border-b-0'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white dark:text-slate-950 border-emerald-400 border-b-0 shadow-emerald-500/20'
          }`}
          title={isToolsOpen ? 'Close Tools' : 'Open Tools'}
          aria-label={isToolsOpen ? 'Close Tools' : 'Open Tools'}
        >
          <span>{isToolsOpen ? 'Close Tools' : 'Open Tools'}</span>
          <TriangleIcon direction={isToolsOpen ? 'down' : 'up'} className="w-2.5 h-2.5 fill-current" />
        </button>
      </div>

      {/* Docked Mobile Studio Editor & Audio Console */}
      <div className={`rounded-b-2xl shrink-0 bg-white/95 dark:bg-[#0E1626]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/80 px-3.5 pt-3 pb-3 flex flex-col gap-2 z-20 transition-all duration-300 ease-in-out ${
        isToolsOpen ? 'shadow-[0_-12px_30px_rgba(0,0,0,0.3)]' : 'shadow-xl dark:shadow-2xl'
      }`}>
        {/* Fixed at top of tools modal: Category Tabs */}
        {isToolsOpen && categoryTabs && (
          <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
            {categoryTabs}
          </div>
        )}

        {/* Scrollable Tool Options using space at bottom of page like before */}
        {isToolsOpen && (
          <div className="flex flex-col gap-2.5 max-h-[260px] sm:max-h-[280px] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-t-lg">
            {children}
          </div>
        )}

        {/* Integrated Gapless Audio Player & Scrubber */}
        <div className={`space-y-2.5 transition-colors ${isToolsOpen ? 'pt-2 border-t border-slate-200/80 dark:border-slate-800/80' : ''}`}>
          {/* 1. Scrubber Track */}
          <div className="flex items-center gap-2.5 px-0.5">
            <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 min-w-[28px] tabular-nums">
              {formatSeconds(currentTime)}
            </span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}
                onChange={handleScrubberChange}
                className="w-full accent-emerald-500 dark:accent-emerald-400 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full cursor-pointer transition-colors"
                title="Seek position"
              />
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 min-w-[28px] text-right tabular-nums">
              {formatSeconds(totalDuration)}
            </span>
          </div>

          {/* 2. Primary Transport Controls & Volume */}
          <div className="flex items-center justify-between px-1 sm:px-3 pt-0.5">
            {/* Left Controls: Speed, Restart, Previous */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 justify-start">
              {/* Playback Speed Pill Button */}
              <button
                onClick={handleCycleSpeed}
                className="min-w-[34px] px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-[10.5px] font-bold font-mono text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200/60 dark:border-slate-700/60 active:scale-95 transition-all cursor-pointer"
                title={`Playback speed: ${playbackSpeed.toFixed(1)}x (Click to cycle)`}
                aria-label={`Playback speed: ${playbackSpeed.toFixed(1)}x`}
              >
                {playbackSpeed.toFixed(1)}x
              </button>

              {/* Restart */}
              <button
                onClick={handleRestart}
                className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-95 transition-all cursor-pointer"
                title="Restart recitation"
                aria-label="Restart recitation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Previous Ayah */}
              <button
                onClick={handlePrev}
                disabled={currentAyahIndex === 0}
                className="p-1.5 sm:p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 disabled:opacity-25 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                title="Previous Ayah"
                aria-label="Previous Ayah"
              >
                <SkipBack className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
              </button>
            </div>

            {/* Center: Play / Pause Hero Button */}
            <div className="flex items-center justify-center shrink-0 px-1 sm:px-2">
              <button
                onClick={togglePlay}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-500 dark:bg-emerald-400 hover:bg-emerald-600 dark:hover:bg-emerald-300 text-white dark:text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
            </div>

            {/* Right Controls: Next, Volume Mute & Slider */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-1 justify-end">
              {/* Next Ayah */}
              <button
                onClick={handleNext}
                disabled={currentAyahIndex >= verses.length - 1}
                className="p-1.5 sm:p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 disabled:opacity-25 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                title="Next Ayah"
                aria-label="Next Ayah"
              >
                <SkipForward className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
              </button>

              {/* Volume Mute */}
              <button
                onClick={handleToggleMute}
                className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Volume Slider */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-12 sm:w-16 accent-emerald-500 dark:accent-emerald-400 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full cursor-pointer transition-colors"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                aria-label="Volume slider"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
