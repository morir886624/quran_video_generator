'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Scissors,
  X,
  Play,
  Pause,
  Check,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface VideoIntervalModalProps {
  isOpen: boolean;
  videoUrl: string | null;
  fileName?: string;
  initialStartTime?: number | null;
  initialEndTime?: number | null;
  onConfirm: (startTime: number, endTime: number) => void;
  onCancel: () => void;
}

const MIN_INTERVAL_SECONDS = 0.5;

function roundTenth(val: number): number {
  return Math.round(val * 10) / 10;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function formatIntervalTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00.0';
  const totalTenths = Math.round(seconds * 10);
  const tenths = totalTenths % 10;
  const totalSecs = Math.floor(totalTenths / 10);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}.${tenths}`;
}

export const VideoIntervalModal: React.FC<VideoIntervalModalProps> = ({
  isOpen,
  videoUrl,
  fileName,
  initialStartTime,
  initialEndTime,
  onConfirm,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const dragModeRef = useRef<'start' | 'end' | 'range' | 'playhead' | null>(null);
  const dragOriginRef = useRef<{ pointerTime: number; start: number; end: number }>({
    pointerTime: 0,
    start: 0,
    end: 0,
  });

  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const minGap = duration > 0 ? Math.min(MIN_INTERVAL_SECONDS, duration) : MIN_INTERVAL_SECONDS;

  const initializeWithDuration = useCallback(
    (rawDuration: number) => {
      const safeDur = Math.max(0.2, roundTenth(rawDuration));
      const gap = Math.min(MIN_INTERVAL_SECONDS, safeDur);

      let initStart = 0;
      let initEnd = safeDur;

      if (
        typeof initialStartTime === 'number' &&
        Number.isFinite(initialStartTime) &&
        typeof initialEndTime === 'number' &&
        Number.isFinite(initialEndTime) &&
        initialEndTime > initialStartTime
      ) {
        initStart = roundTenth(clamp(initialStartTime, 0, Math.max(0, safeDur - gap)));
        initEnd = roundTenth(clamp(initialEndTime, initStart + gap, safeDur));
      }

      setDuration(safeDur);
      setStartTime(initStart);
      setEndTime(initEnd);
      setCurrentTime(initStart);
      setIsReady(true);
      setLoadError(null);

      const vid = videoRef.current;
      if (vid) {
        try {
          vid.currentTime = initStart;
          vid
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        } catch {
          setIsPlaying(false);
        }
      }
    },
    [initialStartTime, initialEndTime]
  );

  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (Number.isFinite(vid.duration) && vid.duration > 0) {
      initializeWithDuration(vid.duration);
      return;
    }

    // Handle WebM / stream-recorded blobs whose metadata reports Infinity duration initially
    const onDurationResolve = () => {
      if (Number.isFinite(vid.duration) && vid.duration > 0) {
        vid.removeEventListener('timeupdate', onDurationResolve);
        vid.removeEventListener('durationchange', onDurationResolve);
        initializeWithDuration(vid.duration);
      }
    };
    vid.addEventListener('timeupdate', onDurationResolve);
    vid.addEventListener('durationchange', onDurationResolve);
    try {
      vid.currentTime = 1e7;
    } catch {
      setLoadError('Unable to read video duration.');
    }
  }, [initializeWithDuration]);

  // Keep modal preview playback strictly looping inside [startTime, endTime]
  useEffect(() => {
    if (!isOpen || !isReady || !isPlaying) return;

    let rafId: number;
    const tick = () => {
      const vid = videoRef.current;
      if (vid && !vid.paused) {
        if (!vid.seeking && (vid.currentTime >= endTime || vid.currentTime < startTime - 0.05)) {
          vid.currentTime = startTime;
        }
        setCurrentTime(clamp(vid.currentTime, startTime, endTime));
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [isOpen, isReady, isPlaying, startTime, endTime]);

  // Pause and clean up video element on unmount
  useEffect(() => {
    const vid = videoRef.current;
    return () => {
      if (vid) {
        try {
          vid.pause();
        } catch {}
      }
    };
  }, []);

  const seekVideoTo = useCallback((targetSec: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    try {
      vid.currentTime = targetSec;
    } catch {}
    setCurrentTime(targetSec);
  }, []);

  const togglePlayPause = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !isReady) return;
    if (vid.paused) {
      if (vid.currentTime >= endTime - 0.05 || vid.currentTime < startTime) {
        vid.currentTime = startTime;
      }
      vid
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, [isReady, startTime, endTime]);

  const updateStart = useCallback(
    (next: number) => {
      if (duration <= 0) return;
      const clamped = roundTenth(clamp(next, 0, Math.max(0, endTime - minGap)));
      setStartTime(clamped);
      seekVideoTo(clamped);
    },
    [duration, endTime, minGap, seekVideoTo]
  );

  const updateEnd = useCallback(
    (next: number) => {
      if (duration <= 0) return;
      const clamped = roundTenth(clamp(next, Math.min(duration, startTime + minGap), duration));
      setEndTime(clamped);
      seekVideoTo(clamped);
    },
    [duration, startTime, minGap, seekVideoTo]
  );

  const clientXToTime = useCallback(
    (clientX: number): number => {
      const el = timelineRef.current;
      if (!el || duration <= 0) return 0;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return roundTenth(ratio * duration);
    },
    [duration]
  );

  const handlePointerDownTimeline = (
    e: React.PointerEvent<HTMLDivElement>,
    mode: 'start' | 'end' | 'range' | 'playhead'
  ) => {
    if (!isReady || duration <= 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragModeRef.current = mode;

    const pointerTime = clientXToTime(e.clientX);
    dragOriginRef.current = {
      pointerTime,
      start: startTime,
      end: endTime,
    };

    if (mode === 'playhead') {
      if (pointerTime < startTime) {
        updateStart(pointerTime);
      } else if (pointerTime > endTime) {
        updateEnd(pointerTime);
      } else {
        seekVideoTo(pointerTime);
      }
    }
  };

  const handlePointerMoveTimeline = (e: React.PointerEvent<HTMLDivElement>) => {
    const mode = dragModeRef.current;
    if (!mode || !isReady || duration <= 0) return;

    const pointerTime = clientXToTime(e.clientX);
    if (mode === 'start') {
      updateStart(pointerTime);
    } else if (mode === 'end') {
      updateEnd(pointerTime);
    } else if (mode === 'playhead') {
      seekVideoTo(clamp(pointerTime, startTime, endTime));
    } else if (mode === 'range') {
      const origin = dragOriginRef.current;
      const windowLen = origin.end - origin.start;
      const delta = pointerTime - origin.pointerTime;
      const nextStart = roundTenth(clamp(origin.start + delta, 0, Math.max(0, duration - windowLen)));
      const nextEnd = roundTenth(Math.min(duration, nextStart + windowLen));
      setStartTime(nextStart);
      setEndTime(nextEnd);
      seekVideoTo(nextStart);
    }
  };

  const handlePointerUpTimeline = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragModeRef.current) {
      dragModeRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleResetFull = () => {
    if (duration <= 0) return;
    setStartTime(0);
    setEndTime(duration);
    seekVideoTo(0);
  };

  const handleConfirm = () => {
    if (!isReady || duration <= 0) return;
    const safeStart = roundTenth(clamp(startTime, 0, Math.max(0, duration - minGap)));
    const safeEnd = roundTenth(clamp(endTime, safeStart + minGap, duration));
    onConfirm(safeStart, safeEnd);
  };

  if (!isOpen || !videoUrl) return null;

  const startPct = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPct = duration > 0 ? (endTime / duration) * 100 : 100;
  const playheadPct = duration > 0 ? clamp((currentTime / duration) * 100, startPct, endPct) : 0;
  const selectedSpan = Math.max(0, roundTenth(endTime - startTime));

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative w-full sm:max-w-lg bg-white dark:bg-[#0B1120] sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/60 dark:border-slate-800/80 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Select Video Interval
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {fileName || 'Choose the part to loop in the video background'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Video Preview Box */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[190px] max-h-[36vh]">
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={() => {
                const vid = videoRef.current;
                if (!vid || !isReady) return;
                if (vid.currentTime >= endTime) {
                  vid.currentTime = startTime;
                }
                setCurrentTime(clamp(vid.currentTime, 0, duration));
              }}
              onEnded={() => {
                const vid = videoRef.current;
                if (!vid || !isReady) return;
                vid.currentTime = startTime;
                vid.play().catch(() => setIsPlaying(false));
              }}
              onError={() => setLoadError('Could not load this video file. Please try another format.')}
              onClick={togglePlayPause}
              className="w-full max-h-[36vh] object-contain cursor-pointer"
            />

            {!isReady && !loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-slate-300">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs font-medium">Loading video...</span>
              </div>
            )}

            {loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 px-4 text-center text-rose-400">
                <AlertCircle className="w-6 h-6" />
                <span className="text-xs font-medium">{loadError}</span>
              </div>
            )}

            {isReady && !loadError && (
              <>
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/85 text-white text-xs font-semibold backdrop-blur-sm border border-white/15 transition-all active:scale-95"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Preview</span>
                    </>
                  )}
                </button>

                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-mono backdrop-blur-sm border border-white/15">
                  {formatIntervalTime(currentTime)}
                </div>
              </>
            )}
          </div>

          {/* Interactive Range Timeline */}
          {isReady && duration > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Drag handles to pick interval
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/25">
                    {selectedSpan.toFixed(1)}s selected
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFull}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                    title="Select full video"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Full</span>
                  </button>
                </div>
              </div>

              {/* Timeline Scrubber Track */}
              <div className="px-2 pt-1 pb-2">
                <div
                  ref={timelineRef}
                  onPointerDown={(e) => handlePointerDownTimeline(e, 'playhead')}
                  onPointerMove={handlePointerMoveTimeline}
                  onPointerUp={handlePointerUpTimeline}
                  onPointerCancel={handlePointerUpTimeline}
                  className="relative h-12 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-visible touch-none select-none cursor-pointer"
                >
                  {/* Unselected dimmed areas */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-l-xl bg-slate-900/25 dark:bg-black/55 pointer-events-none"
                    style={{ width: `${startPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 rounded-r-xl bg-slate-900/25 dark:bg-black/55 pointer-events-none"
                    style={{ width: `${Math.max(0, 100 - endPct)}%` }}
                  />

                  {/* Selected active window (draggable to shift interval) */}
                  <div
                    onPointerDown={(e) => handlePointerDownTimeline(e, 'range')}
                    onPointerMove={handlePointerMoveTimeline}
                    onPointerUp={handlePointerUpTimeline}
                    onPointerCancel={handlePointerUpTimeline}
                    className="absolute inset-y-0 bg-emerald-500/25 dark:bg-emerald-500/30 border-y-2 border-emerald-500 cursor-grab active:cursor-grabbing"
                    style={{
                      left: `${startPct}%`,
                      width: `${Math.max(0, endPct - startPct)}%`,
                    }}
                  />

                  {/* Playhead indicator */}
                  <div
                    className="absolute -top-1 -bottom-1 w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none z-10"
                    style={{ left: `${playheadPct}%` }}
                  />

                  {/* Left (Start) Drag Handle */}
                  <div
                    role="slider"
                    aria-label="Start time"
                    aria-valuemin={0}
                    aria-valuemax={endTime}
                    aria-valuenow={startTime}
                    onPointerDown={(e) => handlePointerDownTimeline(e, 'start')}
                    onPointerMove={handlePointerMoveTimeline}
                    onPointerUp={handlePointerUpTimeline}
                    onPointerCancel={handlePointerUpTimeline}
                    style={{ left: `${startPct}%` }}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-14 rounded-lg bg-emerald-500 hover:bg-emerald-400 border-2 border-white dark:border-slate-950 shadow-lg flex items-center justify-center cursor-ew-resize z-20 touch-none"
                  >
                    <div className="w-0.5 h-5 rounded-full bg-white/90" />
                  </div>

                  {/* Right (End) Drag Handle */}
                  <div
                    role="slider"
                    aria-label="End time"
                    aria-valuemin={startTime}
                    aria-valuemax={duration}
                    aria-valuenow={endTime}
                    onPointerDown={(e) => handlePointerDownTimeline(e, 'end')}
                    onPointerMove={handlePointerMoveTimeline}
                    onPointerUp={handlePointerUpTimeline}
                    onPointerCancel={handlePointerUpTimeline}
                    style={{ left: `${endPct}%` }}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-14 rounded-lg bg-emerald-500 hover:bg-emerald-400 border-2 border-white dark:border-slate-950 shadow-lg flex items-center justify-center cursor-ew-resize z-20 touch-none"
                  >
                    <div className="w-0.5 h-5 rounded-full bg-white/90" />
                  </div>
                </div>

                {/* Timeline Axis Markers */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1.5">
                  <span>0:00.0</span>
                  <span>{formatIntervalTime(duration / 2)}</span>
                  <span>{formatIntervalTime(duration)}</span>
                </div>
              </div>

              {/* Precision Start & End Controls */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Start Box */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Start
                    </span>
                    <button
                      type="button"
                      onClick={() => updateStart(currentTime)}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Set Current
                    </button>
                  </div>
                  <div className="text-base font-mono font-bold text-slate-900 dark:text-white text-center">
                    {formatIntervalTime(startTime)}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateStart(startTime - 0.5)}
                      className="py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
                    >
                      -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStart(startTime + 0.5)}
                      className="py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>

                {/* End Box */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      End
                    </span>
                    <button
                      type="button"
                      onClick={() => updateEnd(currentTime)}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Set Current
                    </button>
                  </div>
                  <div className="text-base font-mono font-bold text-slate-900 dark:text-white text-center">
                    {formatIntervalTime(endTime)}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateEnd(endTime - 0.5)}
                      className="py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
                    >
                      -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEnd(endTime + 0.5)}
                      className="py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                This selected part will loop cleanly as your background in both preview and export.
              </p>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isReady || !!loadError}
            onClick={handleConfirm}
            className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            <span>Use Selected Part</span>
          </button>
        </div>
      </div>
    </div>
  );
};
