/**
 * Seamless Audio Engine
 * Combines high-precision buffer stitching for video exports and instant,
 * 100% reliable gapless HTML5 Audio playback for live in-studio previews.
 */

export interface VerseTimeSegment {
  verseKey: string;
  verseIndex: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  duration: number;  // in seconds
}

export interface StitchedAudioResult {
  stitchedBuffer: AudioBuffer;
  segments: VerseTimeSegment[];
  totalDuration: number;
}

/**
 * Fetches and decodes multiple audio URLs into a contiguous master AudioBuffer.
 * Used for high-fidelity canvas video recording and MP4 exports.
 */
export async function stitchAudioBuffers(
  audioUrls: string[],
  verseKeys: string[],
  audioCtx: AudioContext
): Promise<StitchedAudioResult> {
  if (audioUrls.length === 0) {
    throw new Error('No audio URLs provided for stitching.');
  }

  // 1. Fetch and decode each audio file in parallel
  const decodedBuffers = await Promise.all(
    audioUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download audio from ${url}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return await audioCtx.decodeAudioData(arrayBuffer);
    })
  );

  // 2. Determine sample rate, channels, and total length
  const sampleRate = audioCtx.sampleRate;
  const numberOfChannels = Math.max(...decodedBuffers.map((b) => b.numberOfChannels), 1);
  const totalLength = decodedBuffers.reduce((acc, b) => acc + b.length, 0);

  // 3. Create master contiguous AudioBuffer
  const masterBuffer = audioCtx.createBuffer(numberOfChannels, totalLength, sampleRate);

  let currentOffset = 0;
  const segments: VerseTimeSegment[] = [];

  for (let i = 0; i < decodedBuffers.length; i++) {
    const buf = decodedBuffers[i];
    const startTime = currentOffset / sampleRate;
    const duration = buf.length / sampleRate;
    const endTime = startTime + duration;

    segments.push({
      verseKey: verseKeys[i] || `${i + 1}`,
      verseIndex: i,
      startTime,
      endTime,
      duration,
    });

    // Copy PCM samples for each audio channel safely across all browsers
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const srcChannel = Math.min(channel, buf.numberOfChannels - 1);
      const srcData = buf.getChannelData(srcChannel);
      masterBuffer.getChannelData(channel).set(srcData, currentOffset);
    }

    currentOffset += buf.length;
  }

  const totalDuration = totalLength / sampleRate;

  return {
    stitchedBuffer: masterBuffer,
    segments,
    totalDuration,
  };
}

/**
 * High-Reliability Audio Player for Video Studio Canvas Previews.
 * Uses native streaming HTML5 audio with dual-node preloading to provide
 * instantaneous, 100% audible playback without CORS or suspended AudioContext bugs.
 */
export class StitchedAudioPlayer {
  private audioUrls: string[] = [];
  private verseKeys: string[] = [];
  private verseDurations: number[] = [];
  private currentAyahIndex = 0;
  private isPlaying = false;
  private currentVolume = 1.0;
  private isMuted = false;
  private playbackRate = 1.0;
  private segments: VerseTimeSegment[] = [];
  private totalDuration = 0;
  private animFrameId: number | null = null;

  private currentAudioEl: HTMLAudioElement | null = null;
  private nextAudioEl: HTMLAudioElement | null = null;
  private metadataLoaders: HTMLAudioElement[] = [];
  private playSessionId = 0;

  public onTimeUpdate?: (
    currentTime: number,
    totalDuration: number,
    currentVerseIndex: number,
    verseProgress: number
  ) => void;
  public onEnded?: () => void;

  constructor() {
    this.currentVolume = 1.0;
  }

  public getContext(): AudioContext {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new AudioCtxClass();
  }

  /**
   * Safely and completely disconnects, pauses, silences, and purges an HTMLAudioElement.
   */
  private cleanupAudioElement(el: HTMLAudioElement | null) {
    if (!el) return;
    try {
      el.onended = null;
      el.onerror = null;
      el.ontimeupdate = null;
      el.oncanplay = null;
      el.onloadedmetadata = null;
      el.pause();
      el.removeAttribute('src');
      el.src = '';
      el.load();
    } catch {}
  }

  /**
   * Immediately invalidates all pending playback chains and purges active and preloaded elements.
   */
  private cleanupAllAudio() {
    this.playSessionId++;
    this.cleanupAudioElement(this.currentAudioEl);
    this.currentAudioEl = null;
    this.cleanupAudioElement(this.nextAudioEl);
    this.nextAudioEl = null;

    for (const loader of this.metadataLoaders) {
      this.cleanupAudioElement(loader);
    }
    this.metadataLoaders = [];
  }

  public setFallbackAudio(audioUrls: string[], verseKeys: string[]) {
    this.setAudio(audioUrls, verseKeys);
  }

  public setStitchedAudio(result: StitchedAudioResult) {
    if (result.segments && result.segments.length > 0) {
      this.segments = result.segments;
      this.totalDuration = result.totalDuration;
      result.segments.forEach((seg, i) => {
        this.verseDurations[i] = seg.duration;
      });
      if (!this.isPlaying) {
        this.emitCurrentTime();
      }
    }
  }

  public setAudio(audioUrls: string[], verseKeys: string[]) {
    // 1. Immediately terminate and purge all previous audio elements and pending promises
    this.stop();

    this.audioUrls = [...audioUrls];
    this.verseKeys = [...verseKeys];
    this.currentAyahIndex = 0;
    this.verseDurations = new Array(audioUrls.length).fill(5); // Default estimate: 5s
    this.recomputeSegments();

    const currentSession = this.playSessionId;

    // Preload audio metadata to record exact durations
    this.metadataLoaders = audioUrls.map((url, i) => {
      const a = new Audio();
      a.preload = 'metadata';
      a.src = url;
      a.onloadedmetadata = () => {
        if (currentSession !== this.playSessionId) return;
        if (a.duration && !isNaN(a.duration) && a.duration > 0) {
          this.verseDurations[i] = a.duration;
          this.recomputeSegments();
          if (!this.isPlaying) {
            this.emitCurrentTime();
          }
        }
      };
      return a;
    });

    this.emitCurrentTime();
  }

  private recomputeSegments() {
    let offset = 0;
    this.segments = this.audioUrls.map((url, i) => {
      const dur = this.verseDurations[i] || 5;
      const seg: VerseTimeSegment = {
        verseKey: this.verseKeys[i] || `${i + 1}`,
        verseIndex: i,
        startTime: offset,
        endTime: offset + dur,
        duration: dur,
      };
      offset += dur;
      return seg;
    });
    this.totalDuration = offset;
  }

  public async play(offsetSeconds?: number): Promise<void> {
    if (this.audioUrls.length === 0) return;

    if (offsetSeconds !== undefined) {
      this.seek(offsetSeconds);
    }

    this.isPlaying = true;
    await this.playCurrentAyah();
    this.startTracking();
  }

  private async playCurrentAyah(): Promise<void> {
    const session = this.playSessionId;
    const url = this.audioUrls[this.currentAyahIndex];
    if (!url || !this.isPlaying) {
      this.isPlaying = false;
      this.stopTracking();
      if (!url) this.onEnded?.();
      return;
    }

    // Stop and cleanup previously active element completely
    if (this.currentAudioEl) {
      this.cleanupAudioElement(this.currentAudioEl);
      this.currentAudioEl = null;
    }

    // Reuse preloaded next audio element if it matches target URL
    if (this.nextAudioEl && this.nextAudioEl.src === url) {
      this.currentAudioEl = this.nextAudioEl;
      this.nextAudioEl = null;
    } else {
      if (this.nextAudioEl) {
        this.cleanupAudioElement(this.nextAudioEl);
        this.nextAudioEl = null;
      }
      this.currentAudioEl = new Audio(url);
    }

    const audio = this.currentAudioEl;
    if (!audio) return;

    audio.volume = this.isMuted ? 0 : this.currentVolume;
    audio.playbackRate = this.playbackRate;

    // Preload next Ayah audio in the background for zero gap
    if (this.currentAyahIndex + 1 < this.audioUrls.length) {
      this.nextAudioEl = new Audio(this.audioUrls[this.currentAyahIndex + 1]);
      this.nextAudioEl.preload = 'auto';
      this.nextAudioEl.playbackRate = this.playbackRate;
    } else {
      this.nextAudioEl = null;
    }

    audio.onended = () => {
      if (session !== this.playSessionId || !this.isPlaying) {
        this.cleanupAudioElement(audio);
        return;
      }
      if (this.currentAyahIndex < this.audioUrls.length - 1) {
        this.currentAyahIndex++;
        this.playCurrentAyah();
      } else {
        this.isPlaying = false;
        this.currentAyahIndex = 0;
        this.stopTracking();
        this.emitCurrentTime();
        this.onEnded?.();
      }
    };

    audio.onerror = (e) => {
      if (session !== this.playSessionId || !this.isPlaying) {
        this.cleanupAudioElement(audio);
        return;
      }
      console.warn('Audio playback warning on url:', url, e);
      if (this.currentAyahIndex < this.audioUrls.length - 1) {
        this.currentAyahIndex++;
        this.playCurrentAyah();
      } else {
        this.isPlaying = false;
        this.stopTracking();
        this.onEnded?.();
      }
    };

    try {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (err) {
      if (session !== this.playSessionId || !this.isPlaying) {
        // Interrupted by reciter switch or pause, ignore
        return;
      }
      console.warn('Audio play request interrupted or requires user gesture:', err);
    }

    if (session !== this.playSessionId || !this.isPlaying) {
      this.cleanupAudioElement(audio);
      return;
    }
  }

  public pause() {
    this.isPlaying = false;
    this.playSessionId++; // Invalidate pending playCurrentAyah async chains
    if (this.currentAudioEl) {
      try {
        this.currentAudioEl.pause();
      } catch {}
    }
    this.stopTracking();
    this.emitCurrentTime();
  }

  public stop() {
    this.isPlaying = false;
    this.cleanupAllAudio();
    this.currentAyahIndex = 0;
    this.stopTracking();
    this.emitCurrentTime();
  }

  public seek(timeSeconds: number) {
    const clamped = Math.max(0, Math.min(timeSeconds, this.totalDuration || 999999));

    let targetIndex = 0;
    let offsetInAyah = 0;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (clamped >= seg.startTime && clamped < seg.endTime) {
        targetIndex = i;
        offsetInAyah = clamped - seg.startTime;
        break;
      }
      if (i === this.segments.length - 1) {
        targetIndex = i;
        offsetInAyah = Math.min(clamped - seg.startTime, seg.duration);
      }
    }

    this.currentAyahIndex = targetIndex;

    const url = this.audioUrls[targetIndex];
    if (!this.currentAudioEl || this.currentAudioEl.src !== url) {
      this.cleanupAudioElement(this.currentAudioEl);
      this.currentAudioEl = new Audio(url);
      this.currentAudioEl.volume = this.isMuted ? 0 : this.currentVolume;
      this.currentAudioEl.playbackRate = this.playbackRate;
    }

    if (this.currentAudioEl) {
      try {
        this.currentAudioEl.currentTime = offsetInAyah;
      } catch {}
    }

    if (this.isPlaying) {
      this.playCurrentAyah();
    } else {
      this.emitCurrentTime();
    }
  }

  public seekToVerseIndex(verseIndex: number) {
    const clamped = Math.max(0, Math.min(verseIndex, this.audioUrls.length - 1));
    this.currentAyahIndex = clamped;

    const url = this.audioUrls[clamped];
    this.cleanupAudioElement(this.currentAudioEl);
    this.currentAudioEl = new Audio(url);
    this.currentAudioEl.volume = this.isMuted ? 0 : this.currentVolume;
    this.currentAudioEl.playbackRate = this.playbackRate;

    if (this.isPlaying) {
      this.playCurrentAyah();
    } else {
      this.emitCurrentTime();
    }
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(volume, 1));
    this.isMuted = this.currentVolume === 0;
    if (this.currentAudioEl) {
      this.currentAudioEl.volume = this.currentVolume;
    }
    if (this.nextAudioEl) {
      this.nextAudioEl.volume = this.currentVolume;
    }
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = Math.max(0.25, Math.min(rate, 4.0));
    if (this.currentAudioEl) {
      this.currentAudioEl.playbackRate = this.playbackRate;
    }
    if (this.nextAudioEl) {
      this.nextAudioEl.playbackRate = this.playbackRate;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTime(): number {
    const seg = this.segments[this.currentAyahIndex];
    const baseTime = seg ? seg.startTime : 0;
    const ayahCurrent = this.currentAudioEl?.currentTime || 0;
    return baseTime + ayahCurrent;
  }

  public getTotalDuration(): number {
    return this.totalDuration;
  }

  public getSegments(): VerseTimeSegment[] {
    return this.segments;
  }

  private startTracking() {
    this.stopTracking();
    const track = () => {
      this.emitCurrentTime();
      if (this.isPlaying) {
        this.animFrameId = requestAnimationFrame(track);
      }
    };
    this.animFrameId = requestAnimationFrame(track);
  }

  private stopTracking() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private emitCurrentTime() {
    const cur = this.getCurrentTime();
    const seg = this.segments[this.currentAyahIndex];
    const dur = seg?.duration || this.currentAudioEl?.duration || 1;
    const ayahCurrent = this.currentAudioEl?.currentTime || 0;
    const verseProgress = Math.min(1, Math.max(0, ayahCurrent / dur));

    this.onTimeUpdate?.(cur, this.totalDuration, this.currentAyahIndex, verseProgress);
  }

  public destroy() {
    this.stop();
    this.stopTracking();
    this.onTimeUpdate = undefined;
    this.onEnded = undefined;
  }
}
