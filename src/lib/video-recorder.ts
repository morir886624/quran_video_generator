import { Chapter, Verse, VideoConfig } from '@/types/quran';
import { createParticles, getCanvasDimensions, renderVideoFrame } from './video-engine';
import { stitchAudioBuffers, StitchedAudioResult } from './audio-stitcher';
import { fetchPersianTafsirSurah } from './quran-api';
import { Share } from '@capacitor/share';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media } from '@capacitor-community/media';

import { MediaSaver, requestAppPermissions } from './permissions';

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
 * Exports selected verses into a video file with 100% seamless, stitched audio
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

  // 1. Setup Audio Context
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const dest = audioCtx.createMediaStreamDestination();

  // 2. Stitch all ayah audio into ONE continuous master AudioBuffer
  onProgress?.({
    percent: 5,
    currentAyahIndex: 1,
    totalAyahs: verses.length,
    status: 'Stitching recitation audio into seamless track...',
  });

  const verseKeys = verses.map((v) => v.verse_key);
  let stitchedResult: StitchedAudioResult;

  try {
    stitchedResult = await stitchAudioBuffers(audioUrls, verseKeys, audioCtx);
  } catch (err) {
    console.error('Audio stitching error, falling back:', err);
    throw new Error('Failed to download and stitch recitation audio. Please check network.');
  }

  const { stitchedBuffer, segments, totalDuration } = stitchedResult;

  // Fetch Persian Tafsir if enabled
  let persianTafsirMap: Record<number, string> = {};
  if (config.showPersianTafsir && chapter?.id) {
    try {
      persianTafsirMap = await fetchPersianTafsirSurah(chapter.id, config.persianTafsirEdition);
    } catch (e) {
      console.warn('Failed to load Persian tafsir for video export:', e);
    }
  }

  // 3. Setup MediaRecorder with canvas stream + stitched audio
  const fps = config.fps || 30;
  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeType = getSupportedMimeType();
  const isMp4 = mimeType.includes('mp4');
  const extension = isMp4 ? 'mp4' : 'webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  });

  const recordedChunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  recorder.start(100);

  // 4. Load custom media if any
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

  // 5. Connect and start seamless master audio buffer source
  const sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = stitchedBuffer;
  sourceNode.connect(dest);

  await audioCtx.resume();
  sourceNode.start(0);

  const startPerfTime = performance.now();
  const startAudioTime = audioCtx.currentTime;

  // 6. Continuous Render Loop synchronized to master audio timeline
  await new Promise<void>((resolveExport) => {
    let animId: number;

    const renderLoop = (now: number) => {
      const audioElapsed = audioCtx.currentTime - startAudioTime;
      const t = Math.min(audioElapsed, totalDuration);

      // Find active verse segment
      let activeIndex = 0;
      let verseProgress = 0;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (t >= seg.startTime && t < seg.endTime) {
          activeIndex = i;
          verseProgress = (t - seg.startTime) / seg.duration;
          break;
        }
      }

      if (t >= totalDuration && segments.length > 0) {
        activeIndex = segments.length - 1;
        verseProgress = 1;
      }

      const currentVerse = verses[activeIndex] || verses[0];
      const activePersianText = currentVerse
        ? persianTafsirMap[currentVerse.verse_number] || currentVerse.persianTafsir
        : undefined;

      // Draw frame
      renderVideoFrame({
        ctx,
        width,
        height,
        config,
        chapter,
        currentVerse,
        verseProgress,
        totalProgress: totalDuration > 0 ? Math.min(t / totalDuration, 1) : verseProgress,
        particles,
        time: now - startPerfTime,
        customMediaElement,
        persianTafsirText: activePersianText,
      });

      // Progress reporting
      const percent = Math.min(96, Math.round((t / totalDuration) * 90) + 6);
      onProgress?.({
        percent,
        currentAyahIndex: activeIndex + 1,
        totalAyahs: verses.length,
        status: `Rendering Ayah ${currentVerse.verse_number} (continuous audio)...`,
      });

      if (audioElapsed < totalDuration + 0.3) {
        animId = requestAnimationFrame(renderLoop);
      } else {
        cancelAnimationFrame(animId);
        resolveExport();
      }
    };

    animId = requestAnimationFrame(renderLoop);
  });

  onProgress?.({
    percent: 100,
    currentAyahIndex: verses.length,
    totalAyahs: verses.length,
    status: 'Finalizing video file...',
  });

  // Stop recorder
  const finalBlob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      resolve(blob);
    };
    recorder.stop();
  });

  try {
    sourceNode.stop();
    sourceNode.disconnect();
    await audioCtx.close();
  } catch {}

  const url = URL.createObjectURL(finalBlob);
  const chapterName = chapter ? chapter.name_simple.toLowerCase().replace(/\s+/g, '-') : 'quran';
  const filename = `${chapterName}-ayah-${verses[0]?.verse_number}-to-${verses[verses.length - 1]?.verse_number}.${extension}`;

  return { blob: finalBlob, url, filename };
}

/**
 * Converts a Blob to a raw base64 data string (stripping data URL prefix and whitespace)
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read video blob.'));
    reader.onloadend = () => {
      const result = reader.result as string;
      if (!result) {
        return reject(new Error('Video blob conversion resulted in empty data.'));
      }
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      // Strip any whitespace or MIME line breaks
      const cleanBase64 = base64.replace(/\s+/g, '');
      resolve(cleanBase64);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Writes binary data in safe chunks of 256KB to prevent Android WebView
 * bridge payload size overflow ("The 'writeFile' input parameters aren't valid").
 */
export async function writeLargeBase64File(
  path: string,
  base64Data: string,
  directory: Directory
): Promise<string> {
  // 256KB = 262,144 characters (multiple of 4 for clean Base64 chunks)
  const CHUNK_SIZE = 256 * 1024;
  const totalLength = base64Data.length;

  if (totalLength <= CHUNK_SIZE) {
    const res = await Filesystem.writeFile({
      path,
      data: base64Data,
      directory,
      recursive: true,
    });
    return res.uri;
  }

  // Write initial chunk (creates/replaces file)
  const firstChunk = base64Data.slice(0, CHUNK_SIZE);
  await Filesystem.writeFile({
    path,
    data: firstChunk,
    directory,
    recursive: true,
  });

  // Append remaining chunks sequentially
  let offset = CHUNK_SIZE;
  while (offset < totalLength) {
    const nextOffset = Math.min(offset + CHUNK_SIZE, totalLength);
    const chunk = base64Data.slice(offset, nextOffset);
    await Filesystem.appendFile({
      path,
      data: chunk,
      directory,
    });
    offset = nextOffset;
  }

  const uriRes = await Filesystem.getUri({ path, directory });
  return uriRes.uri;
}

/**
 * Saves video file directly to device storage on mobile or triggers browser download on web
 */
export async function saveVideoToDevice({
  url,
  filename,
  blob,
}: {
  url: string;
  filename: string;
  blob?: Blob;
}): Promise<{ success: boolean; message: string; uri?: string }> {
  if (Capacitor.isNativePlatform()) {
    try {
      let targetBlob = blob;
      if (!targetBlob) {
        const response = await fetch(url);
        targetBlob = await response.blob();
      }

      const base64Data = await blobToBase64(targetBlob);
      const platform = Capacitor.getPlatform();

      if (platform === 'android') {
        try {
          // Request storage & audio permissions like standard Android apps
          await requestAppPermissions();

          // Save directly to Gallery via native MediaStore using Base64 bytes (no Filesystem EACCES issues)
          const res = await MediaSaver.saveVideoToGallery({
            base64Data,
            fileName: filename,
          });

          return {
            success: true,
            message: res.message || 'Saved to Gallery (Movies/QuranStudio)!',
            uri: res.uri,
          };
        } catch (androidErr: unknown) {
          console.warn('Direct MediaSaver save failed, attempting cache fallback:', androidErr);

          let fileUri: string | undefined;
          try {
            fileUri = await writeLargeBase64File(filename, base64Data, Directory.Cache);
          } catch (cacheErr) {
            console.warn('Cache write failed:', cacheErr);
          }

          if (fileUri) {
            await Share.share({
              title: 'Quran Video',
              text: 'Save Quran video',
              files: [fileUri],
              dialogTitle: 'Save Quran Video to Phone',
            });
            return {
              success: true,
              message: 'Video prepared. Choose Save in menu.',
              uri: fileUri,
            };
          }
          throw androidErr;
        }
      } else if (platform === 'ios') {
        let fileUri = await writeLargeBase64File(filename, base64Data, Directory.Cache);
        try {
          await Media.saveVideo({ path: fileUri });
          Filesystem.deleteFile({ path: filename, directory: Directory.Cache }).catch(() => {});
          return {
            success: true,
            message: 'Saved to Photos / Camera Roll!',
            uri: fileUri,
          };
        } catch (iosErr: unknown) {
          console.warn('iOS Media.saveVideo failed, falling back to Share:', iosErr);
          await Share.share({
            title: 'Quran Video',
            text: 'Save Quran video',
            files: [fileUri],
            dialogTitle: 'Save Quran Video to Photos',
          });
          return {
            success: true,
            message: 'Choose "Save Video" in menu.',
            uri: fileUri,
          };
        }
      }
    } catch (err: unknown) {
      console.error('Failed to save video natively:', err);
      throw new Error(err instanceof Error ? err.message : 'Could not save video to device storage.');
    }
  }

  // Web Browser Fallback
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return { success: true, message: 'Download started' };
}

/**
 * Triggers native mobile share sheet with attached video file, or Web Share API
 */
export async function shareVideo({
  url,
  filename,
  blob,
  title = 'Quran Video',
  text = 'Created with Quran Video Studio',
}: {
  url: string;
  filename: string;
  blob?: Blob;
  title?: string;
  text?: string;
}): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    let targetBlob = blob;
    if (!targetBlob) {
      const response = await fetch(url);
      targetBlob = await response.blob();
    }

    const base64Data = await blobToBase64(targetBlob);
    const fileUri = await writeLargeBase64File(filename, base64Data, Directory.Cache);

    try {
      await Share.share({
        title,
        text,
        files: [fileUri],
        dialogTitle: 'Share Quran Video',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes('cancel') ||
        msg.toLowerCase().includes('dismiss')
      ) {
        return;
      }
      console.warn('Native share error:', err);
    }
    return;
  }

  // Web Share API
  if (blob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title,
          text,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
  }

  // Fallback web download
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Backwards-compatible convenience function
 */
export async function shareOrDownloadVideo(url: string, filename: string, blob?: Blob) {
  if (Capacitor.isNativePlatform()) {
    return shareVideo({ url, filename, blob });
  }
  return saveVideoToDevice({ url, filename, blob });
}
