import { AyahAudioFile, Chapter, Verse, PersianTafsirEdition, Reciter } from '@/types/quran';
import { POPULAR_RECITERS, getReciterAyahUrl } from '@/lib/constants';

const BASE_URL = 'https://api.quran.com/api/v4';
const AUDIO_BASE_URL = 'https://verses.quran.com';

let chaptersCache: Chapter[] | null = null;

/**
 * Strips HTML footnotes, tags and superscript from translation strings
 */
export function cleanTranslationText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches all 114 Surahs from Quran.com API
 */
export async function fetchChapters(): Promise<Chapter[]> {
  if (chaptersCache && chaptersCache.length > 0) {
    return chaptersCache;
  }

  try {
    const res = await fetch(`${BASE_URL}/chapters`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch chapters: ${res.statusText}`);
    }

    const data = await res.json();
    chaptersCache = data.chapters;
    return data.chapters;
  } catch (err) {
    console.error('Error fetching chapters:', err);
    throw err;
  }
}

/**
 * Fetches a single chapter's info
 */
export async function fetchChapter(id: number): Promise<Chapter> {
  const chapters = await fetchChapters();
  const chapter = chapters.find((c) => c.id === id);
  if (chapter) return chapter;

  const res = await fetch(`${BASE_URL}/chapters/${id}`);
  const data = await res.json();
  return data.chapter;
}

/**
 * Fetches verses for a given chapter and range, including Uthmani text and translations
 */
export async function fetchVerses(
  chapterId: number,
  startAyah?: number,
  endAyah?: number,
  translationId = 20
): Promise<Verse[]> {
  try {
    const perPage = 50;
    let page = 1;
    let allVerses: Verse[] = [];
    let hasMore = true;

    // Fetch pages until we cover the requested range
    while (hasMore) {
      const url = `${BASE_URL}/verses/by_chapter/${chapterId}?language=en&words=true&translations=${translationId}&fields=text_uthmani,chapter_id,verse_number,verse_key&page=${page}&per_page=${perPage}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch verses page ${page}: ${res.statusText}`);
      }

      const data = await res.json();
      allVerses = allVerses.concat(data.verses);

      if (!data.pagination?.next_page || allVerses.length >= (endAyah || 999)) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Filter by start and end Ayah if provided
    if (startAyah !== undefined && endAyah !== undefined) {
      return allVerses.filter(
        (v) => v.verse_number >= startAyah && v.verse_number <= endAyah
      );
    } else if (startAyah !== undefined) {
      return allVerses.filter((v) => v.verse_number >= startAyah);
    }

    return allVerses;
  } catch (err) {
    console.error(`Error fetching verses for chapter ${chapterId}:`, err);
    throw err;
  }
}

/**
 * Fetches recitation audio files for a chapter and reciter
 * Generates complete, verified audio URLs for all ayahs in the Surah
 */
export async function fetchAudioFiles(
  reciterId: number,
  chapterId: number,
  audioSubfolder?: string
): Promise<AyahAudioFile[]> {
  try {
    const reciter =
      POPULAR_RECITERS.find((r) => r.id === reciterId) ||
      ({ id: reciterId, name: 'Reciter', style: 'Murattal', audioSubfolder } as Reciter);

    let count = 286;
    try {
      const chapters = await fetchChapters();
      const chapter = chapters.find((c) => c.id === chapterId);
      if (chapter?.verses_count) {
        count = chapter.verses_count;
      }
    } catch {
      // fallback to 286
    }

    const audioFiles: AyahAudioFile[] = [];
    for (let i = 1; i <= count; i++) {
      audioFiles.push({
        verse_key: `${chapterId}:${i}`,
        url: getReciterAyahUrl(reciter, chapterId, i),
      });
    }

    return audioFiles;
  } catch (err) {
    console.error(`Error fetching audio files for reciter ${reciterId}:`, err);
    const reciter =
      POPULAR_RECITERS.find((r) => r.id === reciterId) ||
      ({ id: reciterId, name: 'Reciter', style: 'Murattal', audioSubfolder } as Reciter);
    const audioFiles: AyahAudioFile[] = [];
    for (let i = 1; i <= 286; i++) {
      audioFiles.push({
        verse_key: `${chapterId}:${i}`,
        url: getReciterAyahUrl(reciter, chapterId, i),
      });
    }
    return audioFiles;
  }
}

/**
 * Fetches Tafsir (exegesis) for a specific verse (default: 169 - Ibn Kathir)
 */
export async function fetchTafsir(
  verseKey: string,
  tafsirId = 169
): Promise<{ text: string; resourceName: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tafsirs/${tafsirId}/by_ayah/${verseKey}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch tafsir: ${res.statusText}`);
    }
    const data = await res.json();
    return {
      text: data.tafsir?.text || 'No tafsir available for this verse.',
      resourceName: data.tafsir?.resource_name || 'Tafsir Ibn Kathir',
    };
  } catch (err) {
    console.error(`Error fetching tafsir for ${verseKey}:`, err);
    throw err;
  }
}

/**
 * Fetches historical background and revelation context for a Surah
 */
export async function fetchChapterInfo(
  chapterId: number,
  language = 'en'
): Promise<{ text: string; shortText: string; source: string }> {
  try {
    const res = await fetch(`${BASE_URL}/chapters/${chapterId}/info?language=${language}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch chapter info: ${res.statusText}`);
    }
    const data = await res.json();
    const info = data.chapter_info;
    return {
      text: info?.text || '',
      shortText: info?.short_text || '',
      source: info?.source || 'Quran.com',
    };
  } catch (err) {
    console.error(`Error fetching chapter info for ${chapterId}:`, err);
    throw err;
  }
}

/**
 * Fetches available translations supported by Quran.com
 */
export async function fetchAvailableTranslations(): Promise<
  Array<{ id: number; name: string; author_name: string; language_name: string }>
> {
  try {
    const res = await fetch(`${BASE_URL}/resources/translations`);
    if (!res.ok) {
      throw new Error(`Failed to fetch translations: ${res.statusText}`);
    }
    const data = await res.json();
    return data.translations || [];
  } catch (err) {
    console.error('Error fetching available translations:', err);
    // Return curated fallback translations
    return [
      { id: 20, name: 'Saheeh International', author_name: 'Saheeh International', language_name: 'english' },
      { id: 131, name: 'The Clear Quran', author_name: 'Dr. Mustafa Khattab', language_name: 'english' },
      { id: 85, name: 'M.A.S. Abdel Haleem', author_name: 'Abdel Haleem', language_name: 'english' },
      { id: 136, name: 'Muhammad Hamidullah', author_name: 'Hamidullah', language_name: 'french' },
      { id: 97, name: 'Tafhim commentary', author_name: 'Maududi', language_name: 'urdu' },
      { id: 86, name: 'Muhammad Isa Garcia', author_name: 'Isa Garcia', language_name: 'spanish' },
      { id: 33, name: 'Indonesian Ministry of Religious Affairs', author_name: 'Kemenag', language_name: 'indonesian' },
      { id: 77, name: 'Diyanet Isleri', author_name: 'Diyanet', language_name: 'turkish' },
    ];
  }
}

const PERSIAN_TAFSIR_BASE = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir';
const persianTafsirCache = new Map<string, Record<number, string>>();

/**
 * Fetches Persian Tafsir for an entire Surah (cached in-memory)
 * Supported editions:
 * - 'persian-mokhtasar': Persian Al-Mukhtasar in interpreting the Noble Quran (المختصر)
 * - 'fr-tafsir-as-saadi': Tafsir As-Sa'di in Persian (تفسیر السعدی)
 */
export async function fetchPersianTafsirSurah(
  surahId: number,
  edition: PersianTafsirEdition = 'persian-mokhtasar'
): Promise<Record<number, string>> {
  const cacheKey = `${edition}_${surahId}`;
  if (persianTafsirCache.has(cacheKey)) {
    return persianTafsirCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(`${PERSIAN_TAFSIR_BASE}/${edition}/${surahId}.json`);
    if (!res.ok) {
      throw new Error(`Failed to fetch Persian tafsir: ${res.statusText}`);
    }
    const data: Array<{ ayah: number; surah: number; text: string }> = await res.json();
    const map: Record<number, string> = {};
    for (const item of data) {
      map[item.ayah] = cleanTranslationText(item.text);
    }
    persianTafsirCache.set(cacheKey, map);
    return map;
  } catch (err) {
    console.error(`Error fetching Persian tafsir for Surah ${surahId} (${edition}):`, err);
    return {};
  }
}

/**
 * Fetches Persian Tafsir for a single Ayah
 */
export async function fetchPersianTafsirAyah(
  surahId: number,
  ayahNumber: number,
  edition: PersianTafsirEdition = 'persian-mokhtasar'
): Promise<string> {
  const surahMap = await fetchPersianTafsirSurah(surahId, edition);
  return surahMap[ayahNumber] || '';
}

const tafsirTextCache = new Map<string, string>();

/**
 * Unified helper to fetch Tafsir for any Ayah from Persian CDN or Quran.com API
 */
export async function fetchAyahTafsirText(
  verseKey: string,
  source: string = 'persian-mokhtasar'
): Promise<string> {
  const cacheKey = `${source}_${verseKey}`;
  if (tafsirTextCache.has(cacheKey)) {
    return tafsirTextCache.get(cacheKey)!;
  }

  const [surahStr, ayahStr] = verseKey.split(':');
  const surahId = parseInt(surahStr, 10);
  const ayahNum = parseInt(ayahStr, 10);

  if (source === 'persian-mokhtasar' || source === 'fr-tafsir-as-saadi') {
    const map = await fetchPersianTafsirSurah(surahId, source as PersianTafsirEdition);
    const text = map[ayahNum] || '';
    tafsirTextCache.set(cacheKey, text);
    return text;
  }

  // Quran.com API mappings
  let quranComId = 169; // Ibn Kathir English
  if (source === 'muyassar') quranComId = 16;
  else if (source === 'jalalayn') quranComId = 168;

  try {
    const res = await fetchTafsir(verseKey, quranComId);
    const clean = cleanTranslationText(res.text);
    tafsirTextCache.set(cacheKey, clean);
    return clean;
  } catch (err) {
    console.error(`Error fetching tafsir for ${verseKey} (${source}):`, err);
    return '';
  }
}

/**
 * Prefetches tafsir for an entire surah if supported (e.g. Persian editions)
 */
export async function prefetchSurahTafsir(
  surahId: number,
  source: string = 'persian-mokhtasar'
): Promise<Record<number, string>> {
  if (source === 'persian-mokhtasar' || source === 'fr-tafsir-as-saadi') {
    return await fetchPersianTafsirSurah(surahId, source as PersianTafsirEdition);
  }
  return {};
}


