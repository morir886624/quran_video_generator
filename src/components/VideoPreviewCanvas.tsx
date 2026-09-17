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
  onActiveVerseChange?: (verse: Verse, index: number) => void;
  children?: React.ReactNode;
}

export const VideoPreviewCanvas: React.FC<VideoPreviewCanvasProps> = ({
  verses,
  audioUrls,
  chapter,
  config,
  onActiveVerseChange,
  children,
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
  const [isMuted, setIsMuted] = useState(false);
  const [persianTafsirMap, setPersianTafsirMap] = useState<Record<number, string>>({});
  const [isToolsOpen, setIsToolsOpen] = useState(true);

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

  // Initialize and stitch audio whenever selected verses or audioUrls change
  useEffect(() => {
    if (audioUrls.length === 0 || verses.length === 0) return;

    let isCancelled = false;

    if (!playerRef.current) {
      playerRef.current = new StitchedAudioPlayer();
    }
    const player = playerRef.current;

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
    <div className="w-full max-w-[380px] sm:max-w-[395px] mx-auto rounded-[48px] border-[8px] border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#080E1C] shadow-2xl shadow-slate-300/60 dark:shadow-black overflow-hidden flex flex-col relative transition-all">
      {/* Dynamic Island Notch */}
      <div className="pt-2.5 pb-1 flex justify-center z-20">
        <div className="w-24 h-5 bg-slate-900 dark:bg-black rounded-full shadow-inner" />
      </div>

      {/* Video Canvas Container (Top Half) */}
      <div
        className={`relative w-full flex items-center justify-center overflow-hidden bg-slate-900/10 dark:bg-transparent cursor-pointer transition-all duration-300 ease-in-out ${
          isToolsOpen ? 'h-[260px] sm:h-[285px]' : 'h-[430px] sm:h-[460px]'
        }`}
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

      {/* Docked Mobile Studio Editor Console (Bottom Half) */}
      <div className="rounded-t-[32px] bg-white dark:bg-[#0E1626] border-t border-slate-200/90 dark:border-slate-800/80 px-3.5 pt-2.5 pb-3 flex flex-col gap-2.5 shadow-xl dark:shadow-2xl z-10 transition-colors">
        {/* Modal Open/Close Header Button matching user attached icons */}
        <div className="flex items-center justify-between px-1 -mt-0.5 pb-0.5">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {isToolsOpen ? 'Editing Tools' : 'Video Mode'}
          </span>
          <button
            type="button"
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs border active:scale-95 ${
              isToolsOpen
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
            }`}
            title={isToolsOpen ? 'Close editing panel' : 'Open editing panel'}
            aria-label={isToolsOpen ? 'Close editing panel' : 'Open editing panel'}
          >
            <span>{isToolsOpen ? 'Close' : 'Open'}</span>
            <TriangleIcon direction={isToolsOpen ? 'down' : 'up'} className="w-2.5 h-2.5 fill-current" />
          </button>
        </div>

        {/* Category Tabs & Tool Options passed from VideoStudio */}
        {isToolsOpen && (
          <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {children}
          </div>
        )}

        {/* Integrated Gapless Audio Player & Scrubber */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/70 space-y-2 transition-colors">
          {/* Scrubber Track */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 min-w-[28px]">
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
                className="w-full accent-emerald-500 dark:accent-emerald-400 bg-slate-200 dark:bg-slate-800 h-1 rounded-full cursor-pointer transition-colors"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 min-w-[28px] text-right">
              {formatSeconds(totalDuration)}
            </span>
          </div>

          {/* Subtitle */}
          <div className="text-center -mt-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide">
              Gapless Sound
            </span>
          </div>

          {/* Transport Buttons */}
          <div className="flex items-center justify-between px-3 pt-0.5">
            <button
              onClick={handleRestart}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrev}
              disabled={currentAyahIndex === 0}
              className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
              title="Previous Ayah"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-emerald-500 dark:bg-emerald-400 hover:bg-emerald-600 dark:hover:bg-emerald-300 text-white dark:text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentAyahIndex >= verses.length - 1}
              className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
              title="Next Ayah"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (playerRef.current) {
                  playerRef.current.setVolume(nextMuted ? 0 : 1);
                }
              }}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Status line */}
          <div className="flex items-center justify-end gap-3 text-[11px] font-mono text-slate-400 dark:text-slate-500 pr-1 -mt-0.5">
            <span>1.0x</span>
            <span>{currentAyahIndex + 1}:{verses.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
