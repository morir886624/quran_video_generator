import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AppPermissionStatus {
  audio: boolean;
  storage: boolean;
  backgroundPlay: boolean;
  allGranted: boolean;
  requested?: boolean;
}

interface MediaSaverNativePlugin {
  checkAppPermissions(): Promise<AppPermissionStatus>;
  requestAppPermissions(): Promise<{ requested: boolean; requestedCount?: number }>;
  requestBackgroundPlayPermission(): Promise<{ requested: boolean }>;
  saveVideoToGallery(options: {
    base64Data?: string;
    filePath?: string;
    fileName?: string;
    duration?: number;
  }): Promise<{ success: boolean; uri?: string; path?: string; message?: string }>;
  saveVideoChunk(options: {
    chunk: string;
    fileName: string;
    isFirst: boolean;
    isLast: boolean;
    duration?: number;
  }): Promise<{ success: boolean; chunkSaved?: boolean; uri?: string; path?: string; message?: string }>;
  shareVideo(options: {
    filePath?: string;
    fileName?: string;
    title?: string;
    text?: string;
  }): Promise<{ success: boolean; message?: string }>;
  startBackgroundAudio(options: {
    title?: string;
    artist?: string;
    isPlaying?: boolean;
  }): Promise<{ success: boolean }>;
  stopBackgroundAudio(): Promise<{ success: boolean }>;
  addListener(
    eventName: 'mediaControlAction',
    listenerFunc: (data: { command: 'play' | 'pause' | 'prev' | 'next' }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

export const MediaSaver = registerPlugin<MediaSaverNativePlugin>('MediaSaver');

/**
 * Checks current status of Sound/Voice, Storage, and Background Auto-Play permissions.
 */
export async function checkAppPermissions(): Promise<AppPermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    // Web environment: assume granted or handled by browser prompts
    return { audio: true, storage: true, backgroundPlay: true, allGranted: true };
  }

  if (Capacitor.getPlatform() === 'android') {
    try {
      return await MediaSaver.checkAppPermissions();
    } catch (err) {
      console.warn('Failed to check native permissions:', err);
      return { audio: false, storage: false, backgroundPlay: false, allGranted: false };
    }
  }

  return { audio: true, storage: true, backgroundPlay: true, allGranted: true };
}

/**
 * Triggers standard Android system runtime permission prompts for Sound/Voice, Storage, and Background Auto-Play.
 */
export async function requestAppPermissions(): Promise<AppPermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    return { audio: true, storage: true, backgroundPlay: true, allGranted: true };
  }

  if (Capacitor.getPlatform() === 'android') {
    try {
      await MediaSaver.requestAppPermissions();
      // Re-check after prompt
      return await MediaSaver.checkAppPermissions();
    } catch (err) {
      console.warn('Failed to request native permissions:', err);
      return { audio: false, storage: false, backgroundPlay: false, allGranted: false };
    }
  }

  return { audio: true, storage: true, backgroundPlay: true, allGranted: true };
}

/**
 * Triggers Android system prompt for Background Auto-Play (Lock-screen notifications & unrestricted battery).
 */
export async function requestBackgroundPlayPermission(): Promise<AppPermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    return { audio: true, storage: true, backgroundPlay: true, allGranted: true };
  }

  if (Capacitor.getPlatform() === 'android') {
    try {
      await MediaSaver.requestBackgroundPlayPermission();
      return await MediaSaver.checkAppPermissions();
    } catch (err) {
      console.warn('Failed to request background play permission:', err);
      return await checkAppPermissions();
    }
  }

  return { audio: true, storage: true, backgroundPlay: true, allGranted: true };
}

