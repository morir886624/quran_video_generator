import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AppPermissionStatus {
  audio: boolean;
  storage: boolean;
  allGranted: boolean;
  requested?: boolean;
}

interface MediaSaverNativePlugin {
  checkAppPermissions(): Promise<AppPermissionStatus>;
  requestAppPermissions(): Promise<{ requested: boolean; requestedCount?: number }>;
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
}

export const MediaSaver = registerPlugin<MediaSaverNativePlugin>('MediaSaver');

/**
 * Checks current status of Sound/Voice and Storage permissions.
 */
export async function checkAppPermissions(): Promise<AppPermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    // Web environment: assume granted or handled by browser prompts
    return { audio: true, storage: true, allGranted: true };
  }

  if (Capacitor.getPlatform() === 'android') {
    try {
      return await MediaSaver.checkAppPermissions();
    } catch (err) {
      console.warn('Failed to check native permissions:', err);
      return { audio: false, storage: false, allGranted: false };
    }
  }

  return { audio: true, storage: true, allGranted: true };
}

/**
 * Triggers standard Android system runtime permission prompts for Sound/Voice and Storage.
 */
export async function requestAppPermissions(): Promise<AppPermissionStatus> {
  if (!Capacitor.isNativePlatform()) {
    return { audio: true, storage: true, allGranted: true };
  }

  if (Capacitor.getPlatform() === 'android') {
    try {
      await MediaSaver.requestAppPermissions();
      // Re-check after prompt
      return await MediaSaver.checkAppPermissions();
    } catch (err) {
      console.warn('Failed to request native permissions:', err);
      return { audio: false, storage: false, allGranted: false };
    }
  }

  return { audio: true, storage: true, allGranted: true };
}

