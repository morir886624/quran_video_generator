import { VideoConfig } from '@/types/quran';

export interface ProjectDraft {
  id: string; // 'active_autosave' or custom id (e.g. 'proj_1720000000')
  title: string;
  chapterId: number;
  chapterName: string;
  verseKeys: string[];
  reciterId: number;
  reciterName: string;
  translationId: number;
  videoConfig: VideoConfig;
  updatedAt: number;
  isAutoSave?: boolean;
}

export interface ExportedVideoItem {
  id: string; // 'vid_1720000000'
  title: string;
  chapterId: number;
  chapterName: string;
  verseRange: string;
  reciterName: string;
  videoBlob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
  youtubeTitle: string;
  youtubeDescription: string;
  fullArabicText: string;
  fullTranslationText: string;
  fullPersianText?: string;
  projectSnapshot?: {
    chapterId: number;
    verseKeys: string[];
    reciterId: number;
    translationId: number;
    videoConfig: VideoConfig;
  };
}

const DB_NAME = 'quran_video_studio_db';
const DB_VERSION = 1;

const STORES = {
  PROJECTS: 'projects',
  EXPORTED_VIDEOS: 'exported_videos',
} as const;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      return reject(new Error('IndexedDB is not supported or not running in a browser.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Projects Store (Drafts & Auto-save)
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        projectStore.createIndex('isAutoSave', 'isAutoSave', { unique: false });
      }

      // 2. Exported Videos Store
      if (!db.objectStoreNames.contains(STORES.EXPORTED_VIDEOS)) {
        const videoStore = db.createObjectStore(STORES.EXPORTED_VIDEOS, { keyPath: 'id' });
        videoStore.createIndex('createdAt', 'createdAt', { unique: false });
        videoStore.createIndex('chapterId', 'chapterId', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open database'));
    };
  });
}

// ---------------------------------------------------------------------------
// PROJECT DRAFTS & ACTIVE SESSION (AUTO-SAVE)
// ---------------------------------------------------------------------------

const ACTIVE_AUTOSAVE_ID = 'active_autosave';

/**
 * Saves or updates the active in-progress video session
 */
export async function saveActiveSession(
  draftData: Omit<ProjectDraft, 'id' | 'isAutoSave' | 'updatedAt'>
): Promise<void> {
  if (!isBrowser()) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PROJECTS, 'readwrite');
    const store = tx.objectStore(STORES.PROJECTS);

    const record: ProjectDraft = {
      ...draftData,
      id: ACTIVE_AUTOSAVE_ID,
      isAutoSave: true,
      updatedAt: Date.now(),
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves the last active in-progress video session if available
 */
export async function getActiveSession(): Promise<ProjectDraft | null> {
  if (!isBrowser()) return null;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PROJECTS, 'readonly');
      const store = tx.objectStore(STORES.PROJECTS);
      const req = store.get(ACTIVE_AUTOSAVE_ID);

      req.onsuccess = () => {
        resolve((req.result as ProjectDraft) || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get active session from IndexedDB:', err);
    return null;
  }
}

/**
 * Clears the active in-progress auto-save
 */
export async function clearActiveSession(): Promise<void> {
  if (!isBrowser()) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PROJECTS, 'readwrite');
    const store = tx.objectStore(STORES.PROJECTS);
    const req = store.delete(ACTIVE_AUTOSAVE_ID);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Saves a user-named project draft
 */
export async function saveProject(
  projectData: Omit<ProjectDraft, 'id' | 'isAutoSave' | 'updatedAt'> & { id?: string }
): Promise<ProjectDraft> {
  if (!isBrowser()) {
    throw new Error('Browser environment required');
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PROJECTS, 'readwrite');
    const store = tx.objectStore(STORES.PROJECTS);

    const record: ProjectDraft = {
      ...projectData,
      id: projectData.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      isAutoSave: false,
      updatedAt: Date.now(),
    };

    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all user-saved projects (excluding internal autosave)
 */
export async function getAllProjects(): Promise<ProjectDraft[]> {
  if (!isBrowser()) return [];

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PROJECTS, 'readonly');
      const store = tx.objectStore(STORES.PROJECTS);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result as ProjectDraft[]) || [];
        const userProjects = results
          .filter((p) => p.id !== ACTIVE_AUTOSAVE_ID)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(userProjects);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get projects:', err);
    return [];
  }
}

/**
 * Deletes a project draft
 */
export async function deleteProject(id: string): Promise<void> {
  if (!isBrowser()) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PROJECTS, 'readwrite');
    const store = tx.objectStore(STORES.PROJECTS);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// EXPORTED VIDEOS (CREATIONS LIBRARY)
// ---------------------------------------------------------------------------

/**
 * Saves a completed exported video with its blob and metadata
 */
export async function saveExportedVideo(video: ExportedVideoItem): Promise<void> {
  if (!isBrowser()) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.EXPORTED_VIDEOS, 'readwrite');
    const store = tx.objectStore(STORES.EXPORTED_VIDEOS);
    const req = store.put(video);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all exported videos sorted by newest first
 */
export async function getAllExportedVideos(): Promise<ExportedVideoItem[]> {
  if (!isBrowser()) return [];

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EXPORTED_VIDEOS, 'readonly');
      const store = tx.objectStore(STORES.EXPORTED_VIDEOS);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result as ExportedVideoItem[]) || [];
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get exported videos from IndexedDB:', err);
    return [];
  }
}

/**
 * Deletes an exported video from IndexedDB
 */
export async function deleteExportedVideo(id: string): Promise<void> {
  if (!isBrowser()) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.EXPORTED_VIDEOS, 'readwrite');
    const store = tx.objectStore(STORES.EXPORTED_VIDEOS);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clears all exported videos from storage
 */
export async function clearAllExportedVideos(): Promise<void> {
  if (!isBrowser()) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.EXPORTED_VIDEOS, 'readwrite');
    const store = tx.objectStore(STORES.EXPORTED_VIDEOS);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Calculates storage usage for all saved videos
 */
export async function getStorageUsageSummary(): Promise<{
  videoCount: number;
  totalSizeBytes: number;
}> {
  if (!isBrowser()) return { videoCount: 0, totalSizeBytes: 0 };

  try {
    const videos = await getAllExportedVideos();
    const totalSizeBytes = videos.reduce((acc, curr) => acc + (curr.size || 0), 0);
    return {
      videoCount: videos.length,
      totalSizeBytes,
    };
  } catch {
    return { videoCount: 0, totalSizeBytes: 0 };
  }
}

/**
 * Helper to format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
