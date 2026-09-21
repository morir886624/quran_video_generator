import { Reciter } from '@/types/quran';
import { POPULAR_RECITERS, getReciterAyahUrl } from '@/lib/constants';

const CACHE_NAME = 'quran_audio_cache_v1';

/**
 * Checks if Web Cache API is available in the current environment
 */
export function isAudioCacheSupported(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/**
 * Opens or retrieves the audio cache
 */
async function getCache(): Promise<Cache | null> {
  if (!isAudioCacheSupported()) return null;
  try {
    return await window.caches.open(CACHE_NAME);
  } catch (err) {
    console.warn('Unable to open Cache API:', err);
    return null;
  }
}

/**
 * Checks if a specific audio URL is already downloaded and cached
 */
export async function isAyahAudioCached(url: string): Promise<boolean> {
  const cache = await getCache();
  if (!cache) return false;
  try {
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}

/**
 * Downloads and caches a single audio URL
 */
export async function cacheAyahAudio(url: string): Promise<boolean> {
  const cache = await getCache();
  if (!cache) return false;

  try {
    // If already cached, skip network fetch
    const existing = await cache.match(url);
    if (existing) return true;

    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    await cache.put(url, response.clone());
    return true;
  } catch (err) {
    console.warn(`Failed to cache audio from ${url}:`, err);
    return false;
  }
}

/**
 * Returns a local Object URL for a cached audio file, or falls back to the original remote URL
 */
export async function getCachedAudioUrl(url: string): Promise<string> {
  const cache = await getCache();
  if (!cache) return url;

  try {
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn('Error reading from audio cache:', err);
  }

  return url;
}

/**
 * Retrieves the raw Blob of a cached audio file
 */
export async function getCachedAudioBlob(url: string): Promise<Blob | null> {
  const cache = await getCache();
  if (!cache) return null;

  try {
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      return await cachedResponse.blob();
    }
  } catch {
    // fallback
  }

  return null;
}

/**
 * Checks how many ayahs of a specific Surah are cached for a given reciter
 */
export async function isSurahAudioCached(
  reciter: Reciter,
  chapterId: number,
  totalAyahs: number
): Promise<{ cachedCount: number; totalCount: number; isFullyCached: boolean }> {
  const cache = await getCache();
  if (!cache || totalAyahs <= 0) {
    return { cachedCount: 0, totalCount: totalAyahs, isFullyCached: false };
  }

  let cachedCount = 0;
  for (let i = 1; i <= totalAyahs; i++) {
    const url = getReciterAyahUrl(reciter, chapterId, i);
    try {
      const match = await cache.match(url);
      if (match) cachedCount++;
    } catch {
      // ignore
    }
  }

  return {
    cachedCount,
    totalCount: totalAyahs,
    isFullyCached: cachedCount === totalAyahs && totalAyahs > 0,
  };
}

/**
 * Downloads and caches all ayahs of a Surah for a specific reciter with controlled concurrency
 * Supports AbortSignal for pause and cancel
 */
export async function downloadSurahAudio(
  reciter: Reciter,
  chapterId: number,
  totalAyahs: number,
  onProgress?: (downloaded: number, total: number, percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const cache = await getCache();
  if (!cache) {
    throw new Error('Audio cache is not available on this device.');
  }

  let downloadedCount = 0;
  const urls: string[] = [];
  for (let i = 1; i <= totalAyahs; i++) {
    urls.push(getReciterAyahUrl(reciter, chapterId, i));
  }

  // Pre-count already cached ayahs so progress starts from actual cached state
  for (const url of urls) {
    try {
      const existing = await cache.match(url);
      if (existing) downloadedCount++;
    } catch {}
  }
  if (downloadedCount > 0) {
    const initialPercent = Math.round((downloadedCount / totalAyahs) * 100);
    onProgress?.(downloadedCount, totalAyahs, initialPercent);
  }

  // Controlled concurrency (5 concurrent downloads)
  const CONCURRENCY = 5;
  let index = 0;

  const worker = async () => {
    while (index < urls.length) {
      if (signal?.aborted) return;
      const currentIndex = index++;
      const url = urls[currentIndex];

      try {
        const existing = await cache.match(url);
        if (!existing) {
          const res = await fetch(url, { mode: 'cors', signal });
          if (res.ok) {
            await cache.put(url, res.clone());
            downloadedCount++;
          }
        }
      } catch (err) {
        if (signal?.aborted) return;
        console.warn(`Error downloading ayah audio (${url}):`, err);
      }

      const percent = Math.round((downloadedCount / totalAyahs) * 100);
      onProgress?.(downloadedCount, totalAyahs, percent);
    }
  };

  const workers = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker());
  await Promise.all(workers);
}

/**
 * Downloads and caches specific verse keys (e.g. ['2:255', '2:256']) for a reciter
 * Supports AbortSignal for cancellation
 */
export async function downloadVerseKeysAudio(
  reciter: Reciter,
  verseKeys: string[],
  onProgress?: (downloaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const cache = await getCache();
  if (!cache) return;

  let count = 0;
  for (const vk of verseKeys) {
    if (signal?.aborted) return;
    const [cStr, vStr] = vk.split(':');
    const c = parseInt(cStr, 10);
    const v = parseInt(vStr, 10);
    if (!isNaN(c) && !isNaN(v)) {
      const url = getReciterAyahUrl(reciter, c, v);
      await cacheAyahAudio(url);
    }
    count++;
    onProgress?.(count, verseKeys.length);
  }
}

/**
 * Deletes cached audio for a specific Surah and reciter
 */
export async function deleteSurahAudioCache(
  reciter: Reciter,
  chapterId: number,
  totalAyahs: number
): Promise<void> {
  const cache = await getCache();
  if (!cache) return;

  for (let i = 1; i <= totalAyahs; i++) {
    const url = getReciterAyahUrl(reciter, chapterId, i);
    try {
      await cache.delete(url);
    } catch {}
  }
}

/**
 * Deletes all cached audio for a specific reciter
 */
export async function deleteReciterAudioCache(reciterId: number): Promise<void> {
  const cache = await getCache();
  if (!cache) return;

  const reciter = POPULAR_RECITERS.find((r) => r.id === reciterId);
  if (!reciter) return;

  try {
    const requests = await cache.keys();
    for (const req of requests) {
      const url = req.url;
      // Check if URL belongs to this reciter
      if (reciter.audioSubfolder && url.includes(reciter.audioSubfolder)) {
        await cache.delete(req);
      } else {
        const testUrl = getReciterAyahUrl(reciter, 1, 1);
        const prefix = testUrl.substring(0, testUrl.lastIndexOf('/'));
        if (url.startsWith(prefix)) {
          await cache.delete(req);
        }
      }
    }
  } catch (err) {
    console.warn('Error deleting reciter audio cache:', err);
  }
}

/**
 * Retrieves audio cache statistics: total size and reciter breakdown
 */
export async function getAudioCacheStats(): Promise<{
  totalSizeBytes: number;
  totalFiles: number;
  reciterStats: Record<number, { name: string; count: number }>;
}> {
  const cache = await getCache();
  if (!cache) {
    return { totalSizeBytes: 0, totalFiles: 0, reciterStats: {} };
  }

  try {
    const requests = await cache.keys();
    const reciterStats: Record<number, { name: string; count: number }> = {};
    let totalSizeBytes = 0;

    for (const req of requests) {
      const url = req.url;
      // Identify reciter from URL
      for (const r of POPULAR_RECITERS) {
        let matches = false;
        if (r.audioSubfolder && url.includes(r.audioSubfolder)) {
          matches = true;
        } else {
          const sample = getReciterAyahUrl(r, 1, 1);
          const prefix = sample.substring(0, sample.lastIndexOf('/'));
          if (url.startsWith(prefix)) {
            matches = true;
          }
        }

        if (matches) {
          if (!reciterStats[r.id]) {
            reciterStats[r.id] = { name: r.name, count: 0 };
          }
          reciterStats[r.id].count++;
          break;
        }
      }

      // Approximate size if headers available, or default estimate (~250 KB per ayah)
      try {
        const res = await cache.match(req);
        if (res) {
          const cl = res.headers.get('content-length');
          if (cl) {
            totalSizeBytes += parseInt(cl, 10);
          } else {
            const blob = await res.blob();
            totalSizeBytes += blob.size;
          }
        }
      } catch {
        totalSizeBytes += 250 * 1024;
      }
    }

    return {
      totalSizeBytes,
      totalFiles: requests.length,
      reciterStats,
    };
  } catch (err) {
    console.warn('Error fetching audio cache stats:', err);
    return { totalSizeBytes: 0, totalFiles: 0, reciterStats: {} };
  }
}

/**
 * Clears the entire audio cache
 */
export async function clearEntireAudioCache(): Promise<void> {
  if (!isAudioCacheSupported()) return;
  try {
    await window.caches.delete(CACHE_NAME);
  } catch (err) {
    console.warn('Failed to delete audio cache:', err);
  }
}

