/**
 * Seamless Audio Stitching Engine
 * Concatenates multiple Ayah audio files into a single unified AudioBuffer
 * to provide 100% gapless, continuous recitation with sample-accurate timestamps.
 * Includes a robust HTML5 Audio fallback engine to guarantee audio output across
 * all mobile devices, webviews, and network conditions.
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
 * Fetches and decodes multiple audio URLs in parallel, then stitches them into a single AudioBuffer
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
 * Controller class for seamless gapless playback of a stitched AudioBuffer
 * with automatic HTML5 Audio streaming fallback.
 */
export class StitchedAudioPlayer {
  private audioCtx: AudioContext;
  private buffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private destinationNode: AudioNode;

  private startTime = 0;
  private pausedAt = 0;
  private isPlaying = false;
  private segments: VerseTimeSegment[] = [];
  private totalDuration = 0;
  private currentVolume = 1.0;

  // Fallback HTML5 audio state
  private fallbackUrls: string[] = [];
  private fallbackVerseKeys: string[] = [];
  private fallbackAudioEl: HTMLAudioElement | null = null;
  private fallbackIndex = 0;
  private isFallbackMode = false;
  private fallbackDurations: number[] = [];

  private animFrameId: number | null = null;
  public onTimeUpdate?: (
    currentTime: number,
    totalDuration: number,
    currentVerseIndex: number,
    verseProgress: number
  ) => void;
  public onEnded?: () => void;

  constructor(audioCtx?: AudioContext, destinationNode?: AudioNode) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = audioCtx || new AudioCtxClass();
    this.gainNode = this.audioCtx.createGain();

    this.destinationNode = destinationNode || this.audioCtx.destination;
    this.gainNode.connect(this.destinationNode);
    this.setVolume(1.0);
  }

  public getContext(): AudioContext {
    return this.audioCtx;
  }

  /**
   * Supplies audio URLs immediately so playback is ready via HTML5 audio streaming
   * even before full Web Audio buffer stitching finishes.
   */
  public setFallbackAudio(audioUrls: string[], verseKeys: string[]) {
    this.fallbackUrls = [...audioUrls];
    this.fallbackVerseKeys = [...verseKeys];
    this.fallbackIndex = 0;
    this.fallbackDurations = new Array(audioUrls.length).fill(0);

    // If we do not yet have stitched audio, use fallback mode by default
    if (!this.buffer) {
      this.isFallbackMode = true;
    }
  }

  public setStitchedAudio(result: StitchedAudioResult) {
    const wasPlaying = this.isPlaying;
    const currentPos = this.getCurrentTime();

    if (this.isFallbackMode) {
      this.stopFallback();
    } else {
      this.stopSource();
    }

    this.buffer = result.stitchedBuffer;
    this.segments = result.segments;
    this.totalDuration = result.totalDuration;
    this.isFallbackMode = false;
    this.pausedAt = currentPos;

    if (wasPlaying) {
      this.play(currentPos);
    } else {
      this.emitCurrentTime();
    }
  }

  public async play(offsetSeconds?: number): Promise<void> {
    // 1. Primary Engine: High-performance stitched Web Audio
    if (this.buffer) {
      this.isFallbackMode = false;
      this.stopFallback();

      if (this.audioCtx.state === 'suspended') {
        try {
          await this.audioCtx.resume();
        } catch (err) {
          console.warn('Could not resume AudioContext, falling back to HTML5 audio:', err);
          this.playFallback(offsetSeconds);
          return;
        }
      }

      if (this.isPlaying) {
        this.stopSource();
      }

      const startFrom =
        offsetSeconds !== undefined ? offsetSeconds : this.pausedAt;
      this.pausedAt = startFrom;

      this.sourceNode = this.audioCtx.createBufferSource();
      this.sourceNode.buffer = this.buffer;
      this.sourceNode.connect(this.gainNode);

      this.startTime = this.audioCtx.currentTime - startFrom;
      this.sourceNode.start(0, startFrom);
      this.isPlaying = true;

      this.sourceNode.onended = () => {
        if (this.isPlaying && this.getCurrentTime() >= this.totalDuration - 0.1) {
          this.isPlaying = false;
          this.pausedAt = 0;
          this.stopTracking();
          this.onEnded?.();
        }
      };

      this.startTracking();
      return;
    }

    // 2. Fallback Engine: Instant HTML5 Audio streaming
    if (this.fallbackUrls.length > 0) {
      this.isFallbackMode = true;
      await this.playFallback(offsetSeconds);
    }
  }

  private async playFallback(offsetSeconds?: number): Promise<void> {
    const startFrom =
      offsetSeconds !== undefined ? offsetSeconds : this.pausedAt;
    this.pausedAt = startFrom;

    // Determine starting ayah index from offset time
    let targetIndex = 0;
    if (this.segments.length > 0) {
      for (let i = 0; i < this.segments.length; i++) {
        if (startFrom >= this.segments[i].startTime && startFrom < this.segments[i].endTime) {
          targetIndex = i;
          break;
        }
      }
    } else {
      // Approximate if segments not known
      targetIndex = Math.min(
        Math.floor(startFrom / 5),
        Math.max(0, this.fallbackUrls.length - 1)
      );
    }

    this.fallbackIndex = targetIndex;
    await this.startFallbackAtCurrentIndex(
      this.segments[targetIndex] ? Math.max(0, startFrom - this.segments[targetIndex].startTime) : 0
    );
  }

  private async startFallbackAtCurrentIndex(offsetInAyah = 0): Promise<void> {
    this.stopFallback();

    const url = this.fallbackUrls[this.fallbackIndex];
    if (!url) {
      this.isPlaying = false;
      this.onEnded?.();
      return;
    }

    const audio = new Audio(url);
    audio.volume = this.currentVolume;
    this.fallbackAudioEl = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        this.fallbackDurations[this.fallbackIndex] = audio.duration;
        if (this.totalDuration === 0) {
          const sum = this.fallbackDurations.reduce((a, b) => a + (b || 5), 0);
          this.totalDuration = sum;
        }
      }
      if (offsetInAyah > 0 && offsetInAyah < audio.duration) {
        audio.currentTime = offsetInAyah;
      }
    };

    audio.onended = () => {
      if (this.fallbackIndex < this.fallbackUrls.length - 1) {
        this.fallbackIndex++;
        this.startFallbackAtCurrentIndex(0);
      } else {
        this.isPlaying = false;
        this.pausedAt = 0;
        this.stopTracking();
        this.onEnded?.();
      }
    };

    audio.onerror = (e) => {
      console.warn('Fallback HTML5 audio error on url:', url, e);
      if (this.fallbackIndex < this.fallbackUrls.length - 1) {
        this.fallbackIndex++;
        this.startFallbackAtCurrentIndex(0);
      } else {
        this.isPlaying = false;
      }
    };

    try {
      await audio.play();
      this.isPlaying = true;
      this.startTracking();
    } catch (err) {
      console.warn('Fallback audio play blocked:', err);
      this.isPlaying = false;
    }
  }

  public pause() {
    if (!this.isPlaying) return;
    this.pausedAt = this.getCurrentTime();

    if (this.isFallbackMode) {
      if (this.fallbackAudioEl) {
        this.fallbackAudioEl.pause();
      }
    } else {
      this.stopSource();
    }

    this.isPlaying = false;
    this.stopTracking();
  }

  public stop() {
    this.stopSource();
    this.stopFallback();
    this.pausedAt = 0;
    this.isPlaying = false;
    this.stopTracking();
  }

  public seek(timeSeconds: number) {
    const clamped = Math.max(0, Math.min(timeSeconds, this.totalDuration || 999999));
    if (this.isPlaying) {
      this.play(clamped);
    } else {
      this.pausedAt = clamped;
      this.emitCurrentTime();
    }
  }

  public seekToVerseIndex(verseIndex: number) {
    if (this.segments[verseIndex]) {
      this.seek(this.segments[verseIndex].startTime);
    } else {
      this.fallbackIndex = verseIndex;
      if (this.isPlaying) {
        this.startFallbackAtCurrentIndex(0);
      } else {
        this.pausedAt = verseIndex * 5;
        this.emitCurrentTime();
      }
    }
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(volume, 1));
    try {
      this.gainNode.gain.setValueAtTime(this.currentVolume, this.audioCtx.currentTime);
    } catch {}
    if (this.fallbackAudioEl) {
      this.fallbackAudioEl.volume = this.currentVolume;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTime(): number {
    if (this.isFallbackMode) {
      if (!this.fallbackAudioEl) return this.pausedAt;
      if (this.segments[this.fallbackIndex]) {
        return this.segments[this.fallbackIndex].startTime + (this.fallbackAudioEl.currentTime || 0);
      }
      let elapsedPrior = 0;
      for (let i = 0; i < this.fallbackIndex; i++) {
        elapsedPrior += this.fallbackDurations[i] || 5;
      }
      return elapsedPrior + (this.fallbackAudioEl.currentTime || 0);
    }

    if (!this.isPlaying) return this.pausedAt;
    return Math.max(0, this.audioCtx.currentTime - this.startTime);
  }

  public getTotalDuration(): number {
    return this.totalDuration;
  }

  public getSegments(): VerseTimeSegment[] {
    return this.segments;
  }

  private stopSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
  }

  private stopFallback() {
    if (this.fallbackAudioEl) {
      try {
        this.fallbackAudioEl.pause();
        this.fallbackAudioEl.src = '';
        this.fallbackAudioEl.load();
      } catch {}
      this.fallbackAudioEl = null;
    }
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
    let activeIdx = this.fallbackIndex;
    let verseProgress = 0;

    if (this.segments.length > 0) {
      for (let i = 0; i < this.segments.length; i++) {
        const seg = this.segments[i];
        if (cur >= seg.startTime && cur < seg.endTime) {
          activeIdx = i;
          verseProgress = (cur - seg.startTime) / seg.duration;
          break;
        }
      }

      if (cur >= this.totalDuration && this.segments.length > 0) {
        activeIdx = this.segments.length - 1;
        verseProgress = 1;
      }
    } else if (this.fallbackAudioEl && this.fallbackAudioEl.duration > 0) {
      activeIdx = this.fallbackIndex;
      verseProgress = this.fallbackAudioEl.currentTime / this.fallbackAudioEl.duration;
    }

    this.onTimeUpdate?.(cur, this.totalDuration, activeIdx, verseProgress);
  }

  public destroy() {
    this.stop();
    try {
      this.gainNode.disconnect();
    } catch {}
  }
}
