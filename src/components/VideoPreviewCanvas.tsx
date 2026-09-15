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
  VerseTimeSegment,
} from '@/lib/audio-stitcher';
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

interface VideoPreviewCanvasProps {
  verses: Verse[];
  audioUrls: string[];
  chapter: Chapter | null;
  config: VideoConfig;
  onActiveVerseChange?: (verse: Verse, index: number) => void;
}

export const VideoPreviewCanvas: React.FC<VideoPreviewCanvasProps> = ({
  verses,
  audioUrls,
  chapter,
  config,
  onActiveVerseChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<StitchedAudioPlayer | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const customMediaElRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isStitchingAudio, setIsStitchingAudio] = useState(false);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [verseProgress, setVerseProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [segments, setSegments] = useState<VerseTimeSegment[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const currentVerse = verses[currentAyahIndex] || verses[0] || null;

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
    setIsStitchingAudio(true);

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
          setSegments(stitchedResult.segments);
          setTotalDuration(stitchedResult.totalDuration);
          setIsStitchingAudio(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('Audio stitch warning (continuing with HTML5 streaming):', err);
          setIsStitchingAudio(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [audioUrls, verses]);

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

    let startTime = performance.now();

    const loop = (timestamp: number) => {
      const totalProgress =
        totalDuration > 0 ? Math.min(currentTime / totalDuration, 1) : verseProgress;

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
      });

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [config, chapter, currentVerse, verseProgress, currentTime, totalDuration]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getContainerAspectStyle = () => {
    switch (config.aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[68vh] w-auto max-w-[340px] sm:max-w-[380px]';
      case '1:1':
        return 'aspect-square max-h-[50vh] w-full max-w-[420px]';
      case '16:9':
        return 'aspect-[16/9] w-full max-w-[560px]';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Video Container Shell */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-black border-2 border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-300/40 dark:shadow-2xl dark:shadow-black/90 mx-auto flex items-center justify-center transition-all ${getContainerAspectStyle()}`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* Loading / Audio Stitching Badge */}
        {isStitchingAudio && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-emerald-400 shadow-md">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Optimizing audio...</span>
          </div>
        )}

        {/* Floating Play Button on Pause */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-emerald-500/80 hover:bg-emerald-500 backdrop-blur-md text-white flex items-center justify-center shadow-xl shadow-emerald-950/60 transition-transform active:scale-90 z-10"
            title="Play Video"
          >
            <Play className="w-7 h-7 fill-current ml-1" />
          </button>
        )}

        {/* Seamless Continuous Sound Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Ayah {currentAyahIndex + 1} of {verses.length}</span>
        </div>
      </div>

      {/* Modern Studio Playback Controls Bar */}
      <div className="w-full max-w-sm sm:max-w-md mt-4 p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 shadow-md dark:shadow-lg transition-colors">
        {/* Continuous Scrubber Track */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}
            onChange={handleScrubberChange}
            className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer transition-colors"
          />
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>{formatSeconds(currentTime)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] tracking-wide uppercase">
              Gapless Continuous Sound
            </span>
            <span>{formatSeconds(totalDuration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={handleRestart}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (playerRef.current) {
                  playerRef.current.setVolume(nextMuted ? 0 : 1);
                }
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Center: Prev, Play/Pause, Next */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentAyahIndex === 0}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Previous Ayah"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-950/30 dark:shadow-emerald-950/50 transition-all active:scale-95"
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
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              title="Next Ayah"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Ayah Key Badge */}
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {currentVerse?.verse_key || ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
