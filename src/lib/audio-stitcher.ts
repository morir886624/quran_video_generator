/**
 * Seamless Audio Stitching Engine
 * Concatenates multiple Ayah audio files into a single unified AudioBuffer
 * to provide 100% gapless, continuous recitation with sample-accurate timestamps.
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

    // Copy PCM samples for each audio channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const srcChannel = Math.min(channel, buf.numberOfChannels - 1);
      const srcData = buf.getChannelData(srcChannel);
      masterBuffer.copyToChannel(srcData, channel, currentOffset);
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
  }

  public getContext(): AudioContext {
    return this.audioCtx;
  }

  public setStitchedAudio(result: StitchedAudioResult) {
    this.stop();
    this.buffer = result.stitchedBuffer;
    this.segments = result.segments;
    this.totalDuration = result.totalDuration;
    this.pausedAt = 0;
  }

  public play(offsetSeconds?: number) {
    if (!this.buffer) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
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
  }

  public pause() {
    if (!this.isPlaying) return;
    this.pausedAt = this.getCurrentTime();
    this.stopSource();
    this.isPlaying = false;
    this.stopTracking();
  }

  public stop() {
    this.stopSource();
    this.pausedAt = 0;
    this.isPlaying = false;
    this.stopTracking();
  }

  public seek(timeSeconds: number) {
    const clamped = Math.max(0, Math.min(timeSeconds, this.totalDuration));
    if (this.isPlaying) {
      this.play(clamped);
    } else {
      this.pausedAt = clamped;
      this.emitCurrentTime();
    }
  }

  public seekToVerseIndex(verseIndex: number) {
    const seg = this.segments[verseIndex];
    if (seg) {
      this.seek(seg.startTime);
    }
  }

  public setVolume(volume: number) {
    this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(volume, 1)), this.audioCtx.currentTime);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTime(): number {
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
    let activeIdx = 0;
    let verseProgress = 0;

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

    this.onTimeUpdate?.(cur, this.totalDuration, activeIdx, verseProgress);
  }

  public destroy() {
    this.stop();
    try {
      this.gainNode.disconnect();
    } catch {}
  }
}
