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
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const customMediaElRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [verseProgress, setVerseProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const currentVerse = verses[currentAyahIndex] || verses[0] || null;

  // Initialize particles when config/aspect ratio changes
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

  // Audio setup and transitions
  const playAyahAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= verses.length) return;
      setCurrentAyahIndex(index);
      setVerseProgress(0);

      const audioUrl = audioUrls[index];
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;
      audio.crossOrigin = 'anonymous';
      audio.src = audioUrl || '';
      audio.muted = isMuted;
      audio.volume = volume;

      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback error / Autoplay blocked:', e);
        setIsPlaying(false);
      });
    },
    [audioUrls, isMuted, verses.length, volume]
  );

  const togglePlay = useCallback(() => {
    if (verses.length === 0) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (!audio.src || audio.ended) {
        playAyahAt(currentAyahIndex);
      } else {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  }, [currentAyahIndex, isPlaying, playAyahAt, verses.length]);

  const handleNext = useCallback(() => {
    if (currentAyahIndex < verses.length - 1) {
      playAyahAt(currentAyahIndex + 1);
    } else {
      // Loop to beginning
      playAyahAt(0);
    }
  }, [currentAyahIndex, playAyahAt, verses.length]);

  const handlePrev = useCallback(() => {
    if (currentAyahIndex > 0) {
      playAyahAt(currentAyahIndex - 1);
    } else {
      playAyahAt(0);
    }
  }, [currentAyahIndex, playAyahAt]);

  const handleRestart = useCallback(() => {
    playAyahAt(0);
  }, [playAyahAt]);

  // Handle audio timeupdate and ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setVerseProgress(audio.currentTime / audio.duration);
      }
    };

    const handleEnded = () => {
      if (currentAyahIndex < verses.length - 1) {
        playAyahAt(currentAyahIndex + 1);
      } else {
        setIsPlaying(false);
        setVerseProgress(1);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentAyahIndex, playAyahAt, verses.length]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

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
      renderVideoFrame({
        ctx,
        width,
        height,
        config,
        chapter,
        currentVerse,
        verseProgress,
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
  }, [config, chapter, currentVerse, verseProgress]);

  // Aspect ratio styling for responsive mobile container
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
      {/* Video Container Shell with Phone frame feel */}
      <div
        className={`relative overflow-hidden rounded-3xl bg-black border-2 border-slate-800 shadow-2xl shadow-black/90 mx-auto flex items-center justify-center transition-all ${getContainerAspectStyle()}`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* Floating Play Overlay Indicator on Pause */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-emerald-500/80 hover:bg-emerald-500 backdrop-blur-md text-white flex items-center justify-center shadow-xl shadow-emerald-950/60 transition-transform active:scale-90"
            title="Play Video"
          >
            <Play className="w-7 h-7 fill-current ml-1" />
          </button>
        )}

        {/* Current Ayah Pill Indicator at Bottom Corner */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white/90">
          Ayah {currentAyahIndex + 1} of {verses.length}
        </div>
      </div>

      {/* Modern Studio Playback Controls Bar */}
      <div className="w-full max-w-sm sm:max-w-md mt-4 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2.5 shadow-lg">
        {/* Scrubber track */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-100"
              style={{ width: `${verseProgress * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400 w-9 text-right">
            {Math.round(verseProgress * 100)}%
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={handleRestart}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (audioRef.current) audioRef.current.muted = nextMuted;
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
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
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Previous Ayah"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
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
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Next Ayah"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Ayah Counter badge */}
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-400">
              {currentVerse?.verse_key || ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

