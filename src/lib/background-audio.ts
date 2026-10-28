import { Capacitor } from '@capacitor/core';
import { MediaSaver, checkAppPermissions, requestBackgroundPlayPermission } from './permissions';

export interface BackgroundMediaControls {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSeek?: (seconds: number) => void;
}

export interface BackgroundMediaInfo {
  title: string;
  artist: string;
  album?: string;
  isPlaying: boolean;
  duration?: number;
  position?: number;
  playbackSpeed?: number;
  controls?: BackgroundMediaControls;
}

let activeControls: BackgroundMediaControls | null = null;
let nativeListenerInitialized = false;
let backgroundPermissionCheckedThisSession = false;

let lastNativeTitle = '';
let lastNativeArtist = '';
let lastNativeAlbum = '';
let lastNativePlaying: boolean | null = null;
let lastNativeDurationMs = 0;
let lastNativeSpeed = 1.0;
let lastNativeUpdateTimestamp = 0;
let lastNativePositionMs = 0;

function ensureNativeListener() {
  if (nativeListenerInitialized) return;
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

  nativeListenerInitialized = true;
  MediaSaver.addListener('mediaControlAction', (data) => {
    if (!activeControls || !data?.command) return;
    switch (data.command) {
      case 'play':
        activeControls.onPlay?.();
        break;
      case 'pause':
        activeControls.onPause?.();
        break;
      case 'next':
        activeControls.onNext?.();
        break;
      case 'prev':
        activeControls.onPrev?.();
        break;
      case 'seek':
        if (typeof data.seekMs === 'number') {
          activeControls.onSeek?.(Math.max(0, data.seekMs / 1000));
        }
        break;
    }
  }).catch(() => {});
}

/**
 * Updates both the Web MediaSession API and the Android Foreground Media Service
 * so Quran recitations display a rich media player card with artwork, seekbar, and controls.
 */
export function updateBackgroundAudioSession(info: BackgroundMediaInfo) {
  if (typeof window === 'undefined') return;

  if (info.controls) {
    activeControls = info.controls;
  }

  ensureNativeListener();

  const album = info.album || 'Quran Video Studio';
  const durationSec = info.duration && isFinite(info.duration) && info.duration > 0 ? info.duration : 0;
  const positionSec = info.position && isFinite(info.position) && info.position >= 0 ? Math.min(info.position, durationSec || info.position) : 0;
  const speed = info.playbackSpeed && info.playbackSpeed > 0 ? info.playbackSpeed : 1.0;

  // 1. Configure Web MediaSession API (Lock screen controls, artwork & seekbar)
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: info.title,
        artist: info.artist,
        album,
        artwork: [
          { src: '/icon.png', sizes: '512x512', type: 'image/png' },
          { src: '/quran-logo-icon.png', sizes: '192x192', type: 'image/png' },
        ],
      });
      navigator.mediaSession.playbackState = info.isPlaying ? 'playing' : 'paused';

      if (durationSec > 0 && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: durationSec,
            playbackRate: speed,
            position: Math.min(positionSec, durationSec),
          });
        } catch {}
      }

      navigator.mediaSession.setActionHandler('play', () => {
        activeControls?.onPlay?.();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        activeControls?.onPause?.();
      });
      navigator.mediaSession.setActionHandler(
        'previoustrack',
        activeControls?.onPrev ? () => activeControls?.onPrev?.() : null
      );
      navigator.mediaSession.setActionHandler(
        'nexttrack',
        activeControls?.onNext ? () => activeControls?.onNext?.() : null
      );
      navigator.mediaSession.setActionHandler(
        'seekto',
        activeControls?.onSeek
          ? (details) => {
              if (typeof details.seekTime === 'number') {
                activeControls?.onSeek?.(details.seekTime);
              }
            }
          : null
      );
    } catch {
      // Ignore unsupported mediaSession actions
    }
  }

  // 2. Start or update Android Native Foreground Service (MediaStyle + MediaSession + Seekbar)
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    if (info.isPlaying && !backgroundPermissionCheckedThisSession) {
      backgroundPermissionCheckedThisSession = true;
      checkAppPermissions()
        .then((res) => {
          if (!res.backgroundPlay) {
            return requestBackgroundPlayPermission();
          }
        })
        .catch(() => {});
    }

    const durationMs = Math.round(durationSec * 1000);
    const positionMs = Math.round(positionSec * 1000);
    const now = Date.now();

    // Calculate expected position based on Android's native PlaybackState interpolation
    const elapsedSinceLastUpdate = lastNativePlaying ? (now - lastNativeUpdateTimestamp) * lastNativeSpeed : 0;
    const expectedPosMs = lastNativePositionMs + elapsedSinceLastUpdate;
    const positionJumped = Math.abs(positionMs - expectedPosMs) > 2500;

    const metadataOrStateChanged =
      info.title !== lastNativeTitle ||
      info.artist !== lastNativeArtist ||
      album !== lastNativeAlbum ||
      info.isPlaying !== lastNativePlaying ||
      Math.abs(durationMs - lastNativeDurationMs) > 1000 ||
      speed !== lastNativeSpeed ||
      positionJumped;

    if (metadataOrStateChanged) {
      lastNativeTitle = info.title;
      lastNativeArtist = info.artist;
      lastNativeAlbum = album;
      lastNativePlaying = info.isPlaying;
      lastNativeDurationMs = durationMs;
      lastNativeSpeed = speed;
      lastNativePositionMs = positionMs;
      lastNativeUpdateTimestamp = now;

      MediaSaver.startBackgroundAudio({
        title: info.title,
        artist: info.artist,
        album,
        isPlaying: info.isPlaying,
        durationMs,
        positionMs,
        playbackSpeed: speed,
      }).catch(() => {});
    }
  }
}

/**
 * Stops the background audio session and releases Android WakeLock / Foreground Notification.
 */
export function stopBackgroundAudioSession() {
  if (typeof window === 'undefined') return;

  activeControls = null;
  lastNativeTitle = '';
  lastNativePlaying = null;

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'none';
    } catch {}
  }

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    MediaSaver.stopBackgroundAudio().catch(() => {});
  }
}
