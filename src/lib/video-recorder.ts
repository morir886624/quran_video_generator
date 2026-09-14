import { Chapter, Verse, VideoConfig } from '@/types/quran';
import { createParticles, getCanvasDimensions, renderVideoFrame } from './video-engine';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface ExportProgress {
  percent: number;
  currentAyahIndex: number;
  totalAyahs: number;
  status: string;
}

/**
 * Checks supported MediaRecorder mime types, preferring mp4 if supported, else webm
 */
export function getSupportedMimeType(): string {
  const types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];

  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return 'video/webm';
}

/**
 * Exports the selected verses with recitation audio into a video blob
 */
export async function exportVideo({
  verses,
  audioUrls,
  chapter,
  config,
  onProgress,
}: {
  verses: Verse[];
  audioUrls: string[];
  chapter: Chapter | null;
  config: VideoConfig;
  onProgress?: (p: ExportProgress) => void;
}): Promise<{ blob: Blob; url: string; filename: string }> {
  if (verses.length === 0) {
    throw new Error('No verses selected for video export.');
  }

  const { width, height } = getCanvasDimensions(config.aspectRatio, 1080);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available.');
  }

  const particles = createParticles(45, width, height);

  // Setup Web Audio context for mixing audio into video
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const dest = audioCtx.createMediaStreamDestination();

  // Setup MediaStream & MediaRecorder
  const fps = config.fps || 30;
  const canvasStream = canvas.captureStream(fps);

  // Add audio track to canvas stream
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeType = getSupportedMimeType();
  const isMp4 = mimeType.includes('mp4');
  const extension = isMp4 ? 'mp4' : 'webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 6_000_000, // 6 Mbps high quality
  });

  const recordedChunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  recorder.start(100);

  // Load custom media if any
  let customMediaElement: HTMLImageElement | HTMLVideoElement | null = null;
  if (config.customMediaUrl) {
    if (config.customMediaType === 'video') {
      const videoEl = document.createElement('video');
      videoEl.src = config.customMediaUrl;
      videoEl.crossOrigin = 'anonymous';
      videoEl.muted = true;
      videoEl.loop = true;
      await videoEl.play().catch(() => {});
      customMediaElement = videoEl;
    } else {
      const imgEl = new Image();
      imgEl.src = config.customMediaUrl;
      imgEl.crossOrigin = 'anonymous';
      await new Promise((res) => {
        imgEl.onload = res;
        imgEl.onerror = res;
      });
      customMediaElement = imgEl;
    }
  }

  // Sequential rendering through each Ayah with audio playback
  const totalAyahs = verses.length;

  for (let i = 0; i < totalAyahs; i++) {
    const verse = verses[i];
    const audioUrl = audioUrls[i];

    onProgress?.({
      percent: Math.round((i / totalAyahs) * 100),
      currentAyahIndex: i + 1,
      totalAyahs,
      status: `Rendering Ayah ${verse.verse_number}...`,
    });

    // Play Ayah audio through Web Audio API
    await new Promise<void>((resolveAyah) => {
      const audioEl = new Audio();
      audioEl.crossOrigin = 'anonymous';
      audioEl.src = audioUrl;

      // Pipe into audio context
      const source = audioCtx.createMediaElementSource(audioEl);
      source.connect(dest);
      // Connect to destination only (so device doesn't play aloud loudly while exporting)
      // If user wants preview, separate preview player is used

      let animationFrameId: number;
      let startTime = performance.now();

      const renderLoop = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const durationMs = (audioEl.duration && !isNaN(audioEl.duration))
          ? audioEl.duration * 1000
          : 5000;
        const verseProgress = Math.min(elapsed / durationMs, 1);

        renderVideoFrame({
          ctx,
          width,
          height,
          config,
          chapter,
          currentVerse: verse,
          verseProgress,
          particles,
          time: timestamp,
          customMediaElement,
        });

        if (!audioEl.ended && elapsed < durationMs + 800) {
          animationFrameId = requestAnimationFrame(renderLoop);
        } else {
          resolveAyah();
        }
      };

      audioEl.onloadedmetadata = () => {
        startTime = performance.now();
        audioEl.play().catch(() => {});
        animationFrameId = requestAnimationFrame(renderLoop);
      };

      audioEl.onended = () => {
        cancelAnimationFrame(animationFrameId);
        resolveAyah();
      };

      audioEl.onerror = () => {
        // Fallback: timer if audio fails to load
        setTimeout(() => {
          cancelAnimationFrame(animationFrameId);
          resolveAyah();
        }, 4000);
      };
    });
  }

  onProgress?.({
    percent: 100,
    currentAyahIndex: totalAyahs,
    totalAyahs,
    status: 'Finalizing video file...',
  });

  // Stop recorder and produce final blob
  const finalBlob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      resolve(blob);
    };
    recorder.stop();
  });

  try {
    await audioCtx.close();
  } catch {}

  const url = URL.createObjectURL(finalBlob);
  const chapterName = chapter ? chapter.name_simple.toLowerCase().replace(/\s+/g, '-') : 'quran';
  const filename = `${chapterName}-ayah-${verses[0]?.verse_number}-to-${verses[verses.length - 1]?.verse_number}.${extension}`;

  return { blob: finalBlob, url, filename };
}

/**
 * Triggers native mobile share or downloads video to device
 */
export async function shareOrDownloadVideo(url: string, filename: string, blob?: Blob) {
  // If native Capacitor platform (Android or iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: 'Quran Video',
        text: 'Created with Quran.com Video Studio',
        url: url,
        dialogTitle: 'Share Quran Reel',
      });
      return;
    } catch {
      // Fallback to web link
    }
  }

  // If Web Share API with files is supported
  if (blob && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Quran Video',
          text: 'Created with Quran.com Video Studio',
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to download
      }
    }
  }

  // Fallback: standard browser download
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

