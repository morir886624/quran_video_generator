import { Capacitor } from '@capacitor/core';
import { MediaSaver, checkAppPermissions, requestBackgroundPlayPermission } from './permissions';

export interface BackgroundMediaControls {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export interface BackgroundMediaInfo {
  title: string;
  artist: string;
  album?: string;
  isPlaying: boolean;
  controls?: BackgroundMediaControls;
}

let activeControls: BackgroundMediaControls | null = null;
let nativeListenerInitialized = false;
let backgroundPermissionCheckedThisSession = false;

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
    }
  }).catch(() => {});
}

/**
 * Updates both the Web MediaSession API and the Android Foreground Media Service
 * so Quran recitations continue playing seamlessly when the phone screen is locked.
 */
export function updateBackgroundAudioSession(info: BackgroundMediaInfo) {
  if (typeof window === 'undefined') return;

  if (info.controls) {
    activeControls = info.controls;
  }

  ensureNativeListener();

  // 1. Configure Web MediaSession API (Lock screen controls & metadata)
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: info.title,
        artist: info.artist,
        album: info.album || 'Quran Video Studio',
      });
      navigator.mediaSession.playbackState = info.isPlaying ? 'playing' : 'paused';

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
    } catch {
      // Ignore unsupported mediaSession actions
    }
  }

  // 2. Start or update Android Native Foreground Service (WakeLock + WifiLock + Notification)
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

    MediaSaver.startBackgroundAudio({
      title: info.title,
      artist: info.artist,
      isPlaying: info.isPlaying,
    }).catch(() => {});
  }
}

/**
 * Stops the background audio session and releases Android WakeLock / Foreground Notification.
 */
export function stopBackgroundAudioSession() {
  if (typeof window === 'undefined') return;

  activeControls = null;

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'none';
    } catch {}
  }

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    MediaSaver.stopBackgroundAudio().catch(() => {});
  }
}

