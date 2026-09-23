import { VideoConfig } from '@/types/quran';

export const VIDEO_CONFIG_STORAGE_KEY = 'quran_saved_video_config';

/**
 * Loads previously saved video parameters from localStorage.
 * Automatically cleans up obsolete or session-specific properties.
 */
export function loadSavedVideoConfig(): Partial<VideoConfig> | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(VIDEO_CONFIG_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Do not restore stale object URLs or temporary blobs across browser sessions
    delete parsed.customMediaUrl;
    delete parsed.customMediaType;

    return parsed as Partial<VideoConfig>;
  } catch (err) {
    console.warn('Failed to load saved video configuration from localStorage:', err);
    return null;
  }
}

/**
 * Persists customized video parameters (sizes, colors, typography, effects)
 * so the user doesn't have to adjust them repeatedly for future videos.
 */
export function saveVideoConfig(config: VideoConfig): void {
  if (typeof window === 'undefined') return;

  try {
    // Clone and sanitize to avoid storing temporary blob URLs
    const sanitized: Record<string, unknown> = { ...config };
    delete sanitized.customMediaUrl;
    delete sanitized.customMediaType;

    localStorage.setItem(VIDEO_CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('Failed to persist video configuration to localStorage:', err);
  }
}

/**
 * Clears saved parameters and resets to initial defaults.
 */
export function clearSavedVideoConfig(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(VIDEO_CONFIG_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear saved video configuration:', err);
  }
}

