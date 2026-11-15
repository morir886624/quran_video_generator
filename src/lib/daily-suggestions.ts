import type { Chapter, Verse } from '@/types/quran';

export interface DailySuggestion {
  title: string;
  surahId: number;
  startAyah: number;
  endAyah: number;
  arabicName: string;
}

export const DAILY_SUGGESTION_COUNT = 8;
const DAILY_SUGGESTIONS_STORAGE_KEY = 'quran_daily_suggestions_v1';

// [id, versesCount, nameSimple, arabicName, translatedName]
type SurahMetaTuple = readonly [number, number, string, string, string];

export const SURAH_META: readonly SurahMetaTuple[] = [
  [1, 7, 'Al-Fatihah', 'الفاتحة', 'The Opener'],
  [2, 286, 'Al-Baqarah', 'البقرة', 'The Cow'],
  [3, 200, "Ali 'Imran", 'آل عمران', 'Family of Imran'],
  [4, 176, 'An-Nisa', 'النساء', 'The Women'],
  [5, 120, "Al-Ma'idah", 'المائدة', 'The Table Spread'],
  [6, 165, "Al-An'am", 'الأنعام', 'The Cattle'],
  [7, 206, "Al-A'raf", 'الأعراف', 'The Heights'],
  [8, 75, 'Al-Anfal', 'الأنفال', 'The Spoils of War'],
  [9, 129, 'At-Tawbah', 'التوبة', 'The Repentance'],
  [10, 109, 'Yunus', 'يونس', 'Jonah'],
  [11, 123, 'Hud', 'هود', 'Hud'],
  [12, 111, 'Yusuf', 'يوسف', 'Joseph'],
  [13, 43, "Ar-Ra'd", 'الرعد', 'The Thunder'],
  [14, 52, 'Ibrahim', 'ابراهيم', 'Abraham'],
  [15, 99, 'Al-Hijr', 'الحجر', 'The Rocky Tract'],
  [16, 128, 'An-Nahl', 'النحل', 'The Bee'],
  [17, 111, 'Al-Isra', 'الإسراء', 'The Night Journey'],
  [18, 110, 'Al-Kahf', 'الكهف', 'The Cave'],
  [19, 98, 'Maryam', 'مريم', 'Mary'],
  [20, 135, 'Taha', 'طه', 'Ta-Ha'],
  [21, 112, 'Al-Anbya', 'الأنبياء', 'The Prophets'],
  [22, 78, 'Al-Hajj', 'الحج', 'The Pilgrimage'],
  [23, 118, "Al-Mu'minun", 'المؤمنون', 'The Believers'],
  [24, 64, 'An-Nur', 'النور', 'The Light'],
  [25, 77, 'Al-Furqan', 'الفرقان', 'The Criterion'],
  [26, 227, "Ash-Shu'ara", 'الشعراء', 'The Poets'],
  [27, 93, 'An-Naml', 'النمل', 'The Ant'],
  [28, 88, 'Al-Qasas', 'القصص', 'The Stories'],
  [29, 69, "Al-'Ankabut", 'العنكبوت', 'The Spider'],
  [30, 60, 'Ar-Rum', 'الروم', 'The Romans'],
  [31, 34, 'Luqman', 'لقمان', 'Luqman'],
  [32, 30, 'As-Sajdah', 'السجدة', 'The Prostration'],
  [33, 73, 'Al-Ahzab', 'الأحزاب', 'The Combined Forces'],
  [34, 54, 'Saba', 'سبإ', 'Sheba'],
  [35, 45, 'Fatir', 'فاطر', 'Originator'],
  [36, 83, 'Ya-Sin', 'يس', 'Ya Sin'],
  [37, 182, 'As-Saffat', 'الصافات', 'Those who set the Ranks'],
  [38, 88, 'Sad', 'ص', 'The Letter "Saad"'],
  [39, 75, 'Az-Zumar', 'الزمر', 'The Troops'],
  [40, 85, 'Ghafir', 'غافر', 'The Forgiver'],
  [41, 54, 'Fussilat', 'فصلت', 'Explained in Detail'],
  [42, 53, 'Ash-Shuraa', 'الشورى', 'The Consultation'],
  [43, 89, 'Az-Zukhruf', 'الزخرف', 'The Ornaments of Gold'],
  [44, 59, 'Ad-Dukhan', 'الدخان', 'The Smoke'],
  [45, 37, 'Al-Jathiyah', 'الجاثية', 'The Crouching'],
  [46, 35, 'Al-Ahqaf', 'الأحقاف', 'The Wind-Curved Sandhills'],
  [47, 38, 'Muhammad', 'محمد', 'Muhammad'],
  [48, 29, 'Al-Fath', 'الفتح', 'The Victory'],
  [49, 18, 'Al-Hujurat', 'الحجرات', 'The Rooms'],
  [50, 45, 'Qaf', 'ق', 'The Letter "Qaf"'],
  [51, 60, 'Adh-Dhariyat', 'الذاريات', 'The Winnowing Winds'],
  [52, 49, 'At-Tur', 'الطور', 'The Mount'],
  [53, 62, 'An-Najm', 'النجم', 'The Star'],
  [54, 55, 'Al-Qamar', 'القمر', 'The Moon'],
  [55, 78, 'Ar-Rahman', 'الرحمن', 'The Beneficent'],
  [56, 96, "Al-Waqi'ah", 'الواقعة', 'The Inevitable'],
  [57, 29, 'Al-Hadid', 'الحديد', 'The Iron'],
  [58, 22, 'Al-Mujadila', 'المجادلة', 'The Pleading Woman'],
  [59, 24, 'Al-Hashr', 'الحشر', 'The Exile'],
  [60, 13, 'Al-Mumtahanah', 'الممتحنة', 'She that is to be examined'],
  [61, 14, 'As-Saf', 'الصف', 'The Ranks'],
  [62, 11, "Al-Jumu'ah", 'الجمعة', 'The Congregation, Friday'],
  [63, 11, 'Al-Munafiqun', 'المنافقون', 'The Hypocrites'],
  [64, 18, 'At-Taghabun', 'التغابن', 'The Mutual Disillusion'],
  [65, 12, 'At-Talaq', 'الطلاق', 'The Divorce'],
  [66, 12, 'At-Tahrim', 'التحريم', 'The Prohibition'],
  [67, 30, 'Al-Mulk', 'الملك', 'The Sovereignty'],
  [68, 52, 'Al-Qalam', 'القلم', 'The Pen'],
  [69, 52, 'Al-Haqqah', 'الحاقة', 'The Reality'],
  [70, 44, "Al-Ma'arij", 'المعارج', 'The Ascending Stairways'],
  [71, 28, 'Nuh', 'نوح', 'Noah'],
  [72, 28, 'Al-Jinn', 'الجن', 'The Jinn'],
  [73, 20, 'Al-Muzzammil', 'المزمل', 'The Enshrouded One'],
  [74, 56, 'Al-Muddaththir', 'المدثر', 'The Cloaked One'],
  [75, 40, 'Al-Qiyamah', 'القيامة', 'The Resurrection'],
  [76, 31, 'Al-Insan', 'الانسان', 'The Man'],
  [77, 50, 'Al-Mursalat', 'المرسلات', 'The Emissaries'],
  [78, 40, 'An-Naba', 'النبإ', 'The Tidings'],
  [79, 46, "An-Nazi'at", 'النازعات', 'Those who drag forth'],
  [80, 42, "'Abasa", 'عبس', 'He Frowned'],
  [81, 29, 'At-Takwir', 'التكوير', 'The Overthrowing'],
  [82, 19, 'Al-Infitar', 'الإنفطار', 'The Cleaving'],
  [83, 36, 'Al-Mutaffifin', 'المطففين', 'The Defrauding'],
  [84, 25, 'Al-Inshiqaq', 'الإنشقاق', 'The Sundering'],
  [85, 22, 'Al-Buruj', 'البروج', 'The Mansions of the Stars'],
  [86, 17, 'At-Tariq', 'الطارق', 'The Nightcommer'],
  [87, 19, "Al-A'la", 'الأعلى', 'The Most High'],
  [88, 26, 'Al-Ghashiyah', 'الغاشية', 'The Overwhelming'],
  [89, 30, 'Al-Fajr', 'الفجر', 'The Dawn'],
  [90, 20, 'Al-Balad', 'البلد', 'The City'],
  [91, 15, 'Ash-Shams', 'الشمس', 'The Sun'],
  [92, 21, 'Al-Layl', 'الليل', 'The Night'],
  [93, 11, 'Ad-Duhaa', 'الضحى', 'The Morning Hours'],
  [94, 8, 'Ash-Sharh', 'الشرح', 'The Relief'],
  [95, 8, 'At-Tin', 'التين', 'The Fig'],
  [96, 19, "Al-'Alaq", 'العلق', 'The Clot'],
  [97, 5, 'Al-Qadr', 'القدر', 'The Power'],
  [98, 8, 'Al-Bayyinah', 'البينة', 'The Clear Proof'],
  [99, 8, 'Az-Zalzalah', 'الزلزلة', 'The Earthquake'],
  [100, 11, "Al-'Adiyat", 'العاديات', 'The Courser'],
  [101, 11, "Al-Qari'ah", 'القارعة', 'The Calamity'],
  [102, 8, 'At-Takathur', 'التكاثر', 'The Rivalry in world increase'],
  [103, 3, "Al-'Asr", 'العصر', 'The Declining Day'],
  [104, 9, 'Al-Humazah', 'الهمزة', 'The Traducer'],
  [105, 5, 'Al-Fil', 'الفيل', 'The Elephant'],
  [106, 4, 'Quraysh', 'قريش', 'Quraysh'],
  [107, 7, "Al-Ma'un", 'الماعون', 'The Small kindnesses'],
  [108, 3, 'Al-Kawthar', 'الكوثر', 'The Abundance'],
  [109, 6, 'Al-Kafirun', 'الكافرون', 'The Disbelievers'],
  [110, 3, 'An-Nasr', 'النصر', 'The Divine Support'],
  [111, 5, 'Al-Masad', 'المسد', 'The Palm Fiber'],
  [112, 4, 'Al-Ikhlas', 'الإخلاص', 'The Sincerity'],
  [113, 5, 'Al-Falaq', 'الفلق', 'The Daybreak'],
  [114, 6, 'An-Nas', 'الناس', 'Mankind'],
] as const;

/**
 * Base64 bitset across all 6,236 Quran ayahs (in canonical 1:1..114:6 order)
 * marking every ayah whose Mushaf end carries the waqf "لا" (U+06D9) stop prohibition.
 */
const WAQF_LA_BITSET_B64 =
  'JgMACQEACAAAAAAAAAAAAAAAAhCiAAAgAAAAAAIAAAAAAAQAoEAAACAAAgAAIAgYACAAIAQCAQAAJAAAAAAAAAggAQACwAAAIGigAAYAQCUEExAAAAgAKAAQAAAAAAAAAAAAAAAAAAAAAAAIAAcAAAAAAAAMkEGAAEIAACAIAAAAABAAQgEGAAAAAAAgAAAAAFAAAAAIAhQgACAAgQAQAAAAQAAAIAAAgAQABAAAAAAAAAAAAAEKCAYEBAIAAEAACAAEQAEEQAIAAAAAAAAAAAAAAAAAAABgAQDAADQhAoCCAKAGgEgRBFgghBYoDQgJkAykBgQAEQAAAAAAEAAgAAAAAAIAAEEAxAGIYEAABFAIAAAIAIAgxEBAYAKAAAAAMgCAVQxgAAByHwMAAABAAISAMQACABAAABAAAAQAhBgRAIAAIAUAIBEywAAAAD4FKAA+IIAeBAAAKAoAAEQAIAAuAACAIAAAAABKAAEEAiAoAKAGBjYASN/vmkAAAAkZZAQhISAQMDIDMrKBAEAQAAAAAAAQAAJBAAACgAAAAAAAAAAAEAACAAIQPAAAwAIQAMAQAAAAEAAAYAhACAAkAgAQFIEAAAAAAAEAwAAhICwAEAQkCgAQIIBwEggKQHRJKAgVAAgECAAEFZIEhbYMIgAgSABhAAQFEAQKAJAEAAABAAcAQBAICBQBgAIALgCQAAAAAAQAAAAAAQEASSADQGAgAAgAAACIisTQiWAFN5AAAAAAAAAgAAAAAACATQAFAAQA0AZgQED5NkIQDIAAgP+CAgAASLmQBAB53xcMHgQBgAAAqEiEAAAACAAIAOiResnvMmpAEOBp1QAAAEIAAAAAAAAAAGAEAAAAgAQEgIYAAYAIj2wBCAUIoYcBa8+A0b7+yVSzPCqA/+8RO0CA3z5/wNeeheAQVG8ZACQAwO8AzghBAOp7t9UJrxACiLRAZRznmyn/3g/l7SAZCmiFs2y4aBesOunyYiLXObDOPy6iwzj4b90GlQFcXbAwDQ0sfCwVZRvlSodlgN4H';

// Curated iconic passages by surahId (all verified to never end with waqf لا)
const CURATED_SURAH_PASSAGES: Record<
  number,
  Array<{ startAyah: number; endAyah: number; label?: string }>
> = {
  1: [{ startAyah: 1, endAyah: 7, label: 'Surah Al-Fatihah (The Opener)' }],
  2: [
    { startAyah: 255, endAyah: 255, label: 'Ayat Al-Kursi (The Throne)' },
    { startAyah: 285, endAyah: 286 },
    { startAyah: 152, endAyah: 157 },
    { startAyah: 1, endAyah: 5 },
  ],
  3: [
    { startAyah: 190, endAyah: 194 },
    { startAyah: 26, endAyah: 27 },
    { startAyah: 102, endAyah: 105 },
  ],
  12: [
    { startAyah: 1, endAyah: 6 },
    { startAyah: 84, endAyah: 87 },
  ],
  14: [{ startAyah: 35, endAyah: 41 }],
  18: [
    { startAyah: 1, endAyah: 10 },
    { startAyah: 107, endAyah: 110 },
  ],
  19: [{ startAyah: 1, endAyah: 11 }],
  20: [
    { startAyah: 1, endAyah: 8 },
    { startAyah: 25, endAyah: 35 },
  ],
  23: [{ startAyah: 1, endAyah: 11 }],
  24: [{ startAyah: 35, endAyah: 38 }],
  25: [{ startAyah: 63, endAyah: 77 }],
  31: [{ startAyah: 12, endAyah: 19 }],
  36: [
    { startAyah: 1, endAyah: 12 },
    { startAyah: 78, endAyah: 83 },
  ],
  39: [{ startAyah: 53, endAyah: 56 }],
  49: [{ startAyah: 10, endAyah: 13 }],
  50: [{ startAyah: 16, endAyah: 22 }],
  55: [
    { startAyah: 1, endAyah: 13 },
    { startAyah: 26, endAyah: 30 },
  ],
  56: [{ startAyah: 1, endAyah: 12 }],
  57: [{ startAyah: 1, endAyah: 6 }],
  59: [{ startAyah: 21, endAyah: 24 }],
  67: [
    { startAyah: 1, endAyah: 5 },
    { startAyah: 15, endAyah: 19 },
  ],
  73: [{ startAyah: 1, endAyah: 9 }],
  78: [{ startAyah: 31, endAyah: 40 }],
  87: [{ startAyah: 1, endAyah: 19 }],
  89: [{ startAyah: 27, endAyah: 30 }],
  91: [{ startAyah: 1, endAyah: 10 }],
  93: [{ startAyah: 1, endAyah: 11 }],
  94: [{ startAyah: 1, endAyah: 8 }],
  95: [{ startAyah: 1, endAyah: 8 }],
  97: [{ startAyah: 1, endAyah: 5 }],
  103: [{ startAyah: 1, endAyah: 3 }],
  108: [{ startAyah: 1, endAyah: 3 }],
  112: [{ startAyah: 1, endAyah: 4 }],
  113: [{ startAyah: 1, endAyah: 5 }],
  114: [{ startAyah: 1, endAyah: 6 }],
};

// Precompute cumulative global ayah start index for each Surah (1..114)
const SURAH_START_OFFSET: number[] = (() => {
  const offsets = new Array<number>(SURAH_META.length + 1).fill(0);
  let running = 0;
  for (let i = 0; i < SURAH_META.length; i++) {
    offsets[SURAH_META[i][0]] = running;
    running += SURAH_META[i][1];
  }
  return offsets;
})();

let decodedWaqfLaBytes: Uint8Array | null = null;

function getWaqfLaBitsetBytes(): Uint8Array {
  if (decodedWaqfLaBytes) return decodedWaqfLaBytes;

  if (typeof atob === 'function') {
    const bin = atob(WAQF_LA_BITSET_B64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    decodedWaqfLaBytes = bytes;
    return bytes;
  }

  // Node / SSR fallback
  const buf = Buffer.from(WAQF_LA_BITSET_B64, 'base64');
  decodedWaqfLaBytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return decodedWaqfLaBytes;
}

/**
 * Checks whether an Arabic verse text ends with the Quranic waqf "لا" (U+06D9) mark
 * or a standalone trailing "لا" stop mark after the final Arabic letter.
 */
export function textEndsWithWaqfLa(text?: string | null): boolean {
  if (!text) return false;
  const letterMatches = Array.from(
    text.matchAll(/[\u0621-\u064a\u066e-\u06d3\u06d5\u06ee-\u06ef\u06fa-\u06fc]/g)
  );
  if (letterMatches.length === 0) return false;

  const lastLetter = letterMatches[letterMatches.length - 1];
  const trailing = text.slice((lastLetter.index ?? 0) + 1);
  if (trailing.includes('\u06d9')) {
    return true;
  }

  // Also guard against standalone literal "لا" stop token at the very end
  const strippedEnd = text
    .replace(/[\s\u200e\u200f\u200b\ufeff\u06dd\u0660-\u0669\u06f0-\u06f9\ue000-\uf8ff]+$/g, '')
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g, '');
  const tokens = strippedEnd.split(/\s+/);
  const lastToken = tokens[tokens.length - 1];
  return lastToken === 'لا' || lastToken === '\ufefb' || lastToken === '\ufefc';
}

/**
 * O(1) lookup returning true when the given Surah:Ayah finishes with waqf "لا".
 */
export function isAyahEndingWithWaqfLa(surahId: number, ayahNumber: number): boolean {
  const meta = SURAH_META[surahId - 1];
  if (!meta) return false;
  const versesCount = meta[1];
  if (ayahNumber < 1 || ayahNumber > versesCount) return false;

  const globalIdx = SURAH_START_OFFSET[surahId] + (ayahNumber - 1);
  const bytes = getWaqfLaBitsetBytes();
  const byteIdx = globalIdx >> 3;
  if (byteIdx >= bytes.length) return false;
  return ((bytes[byteIdx] >> (globalIdx & 7)) & 1) === 1;
}

/**
 * Checks a live Verse object using both fetched script text and the full-Quran waqf bitset.
 */
export function verseEndsWithWaqfLa(
  verse: Pick<Verse, 'verse_key' | 'text_indopak' | 'text_uthmani'>
): boolean {
  if (textEndsWithWaqfLa(verse.text_indopak) || textEndsWithWaqfLa(verse.text_uthmani)) {
    return true;
  }
  const [sStr, aStr] = (verse.verse_key || '').split(':');
  const surahId = parseInt(sStr, 10);
  const ayahNumber = parseInt(aStr, 10);
  if (!Number.isNaN(surahId) && !Number.isNaN(ayahNumber)) {
    return isAyahEndingWithWaqfLa(surahId, ayahNumber);
  }
  return false;
}

/**
 * Resolves a safe end ayah >= preferredEndAyah that NEVER terminates on an ayah ending with "لا".
 */
export function resolveSafeEndAyah(
  surahId: number,
  startAyah: number,
  preferredEndAyah: number,
  versesCountOverride?: number
): number {
  const meta = SURAH_META[surahId - 1];
  const maxVerses = versesCountOverride || meta?.[1] || preferredEndAyah;
  const clampedStart = Math.max(1, Math.min(startAyah, maxVerses));
  let end = Math.max(clampedStart, Math.min(preferredEndAyah, maxVerses));

  while (end < maxVerses && isAyahEndingWithWaqfLa(surahId, end)) {
    end++;
  }
  return end;
}

/**
 * Returns YYYY-MM-DD in the user's local calendar.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatShortDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);
  try {
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateKey;
  }
}

function dateKeyToDayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createPrng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledSurahIdsForCycle(cycleIndex: number): number[] {
  const ids = SURAH_META.map((m) => m[0]);
  const rng = createPrng(hashSeed(`quran-cycle-${cycleIndex}`));
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }
  return ids;
}

const DAYS_PER_CYCLE = Math.floor(SURAH_META.length / DAILY_SUGGESTION_COUNT); // 14 days * 8 = 112 surahs

function getCycleDeck(cycleIndex: number, count: number): number[] {
  const cycleSize = Math.max(1, Math.floor(SURAH_META.length / count));
  const deck = shuffledSurahIdsForCycle(cycleIndex).slice(0, cycleSize * count);

  if (cycleSize >= 3) {
    // Prevent seam overlap between day (cycleSize - 1) of previous cycle and day 0 of this cycle
    // by swapping only with middle slots [count .. (cycleSize - 1) * count - 1], leaving the last slot untouched.
    const prevRaw = shuffledSurahIdsForCycle(cycleIndex - 1);
    const prevLastStart = (cycleSize - 1) * count;
    const prevLastDay = new Set(prevRaw.slice(prevLastStart, prevLastStart + count));

    for (let i = 0; i < count; i++) {
      if (prevLastDay.has(deck[i])) {
        for (let j = count; j < prevLastStart; j++) {
          if (!prevLastDay.has(deck[j])) {
            const tmp = deck[i];
            deck[i] = deck[j];
            deck[j] = tmp;
            break;
          }
        }
      }
    }
  }

  return deck;
}

/**
 * Returns the daily Surahs assigned to a cycle day without recursion, ensuring
 * consecutive days never share any Surah.
 */
function getCycleDaySurahIds(dayIndex: number, count: number): number[] {
  const cycleSize = Math.max(1, Math.floor(SURAH_META.length / count));
  const cycleIndex = Math.floor(dayIndex / cycleSize);
  const slot = ((dayIndex % cycleSize) + cycleSize) % cycleSize;
  const deck = getCycleDeck(cycleIndex, count);
  return deck.slice(slot * count, (slot + 1) * count);
}

function getSurahInfo(surahId: number, chapters?: Chapter[]) {
  const meta = SURAH_META[surahId - 1];
  const chapter = chapters?.find((c) => c.id === surahId);
  return {
    surahId,
    versesCount: chapter?.verses_count || meta[1],
    nameSimple: chapter?.name_simple || meta[2],
    arabicName: chapter?.name_arabic || meta[3],
    translatedName: chapter?.translated_name?.name || meta[4],
  };
}

function formatSuggestionTitle(
  nameSimple: string,
  translatedName: string,
  versesCount: number,
  startAyah: number,
  endAyah: number,
  customLabel?: string
): string {
  if (customLabel) return customLabel;
  if (startAyah === 1 && endAyah === versesCount) {
    return `Surah ${nameSimple} (${translatedName})`;
  }
  if (startAyah === endAyah) {
    return `Surah ${nameSimple} (${startAyah})`;
  }
  return `Surah ${nameSimple} (${startAyah}–${endAyah})`;
}

/**
 * Picks a coherent [startAyah, endAyah] passage for a Surah on a given day,
 * guaranteeing:
 * 1) startAyah === 1 or the preceding ayah does NOT end with waqf "لا",
 * 2) endAyah NEVER terminates on an ayah ending with waqf "لا".
 */
function pickPassageForSurah(
  surahId: number,
  versesCount: number,
  dateKey: string,
  cycleIndex: number
): { startAyah: number; endAyah: number; customLabel?: string } {
  const rng = createPrng(hashSeed(`passage:${dateKey}:${surahId}`));
  const curated = CURATED_SURAH_PASSAGES[surahId];

  // For short Surahs (<= 11 ayahs), alternate between full Surah and clean sub-passages
  if (versesCount <= 11) {
    const preferFull = versesCount <= 6 || cycleIndex % 2 === 0 || rng() < 0.65;
    if (preferFull) {
      const safeEnd = resolveSafeEndAyah(surahId, 1, versesCount, versesCount);
      const fullLabel =
        curated?.[0]?.startAyah === 1 && curated?.[0]?.endAyah === safeEnd
          ? curated[0].label
          : undefined;
      return {
        startAyah: 1,
        endAyah: safeEnd,
        customLabel: fullLabel,
      };
    }
  }

  // Sometimes highlight a curated iconic passage when available for this Surah
  if (curated && curated.length > 0 && rng() < 0.55) {
    const choice = curated[(Math.abs(cycleIndex) + Math.floor(rng() * curated.length)) % curated.length];
    const hasLaBefore =
      choice.startAyah > 1 && isAyahEndingWithWaqfLa(surahId, choice.startAyah - 1);
    const safeStart = hasLaBefore ? 1 : choice.startAyah;
    const safeEnd = resolveSafeEndAyah(surahId, safeStart, choice.endAyah, versesCount);
    if (!isAyahEndingWithWaqfLa(surahId, safeEnd)) {
      return {
        startAyah: safeStart,
        endAyah: safeEnd,
        customLabel:
          safeStart === choice.startAyah && safeEnd === choice.endAyah ? choice.label : undefined,
      };
    }
  }

  // Algorithmic range generation across the Surah
  const maxPassageLength = 12;
  for (let attempt = 0; attempt < 20; attempt++) {
    let startAyah = 1;
    if (versesCount > 10 && (attempt > 0 || rng() >= 0.3)) {
      const maxStart = Math.max(1, versesCount - 3);
      startAyah = 1 + Math.floor(rng() * maxStart);
    }

    // Align startAyah so we don't begin right after a waqf "لا" continuation ayah
    while (startAyah > 1 && isAyahEndingWithWaqfLa(surahId, startAyah - 1)) {
      startAyah--;
    }

    const desiredLen = 3 + Math.floor(rng() * 5); // 3..7 ayahs
    const preferredEnd = Math.min(versesCount, startAyah + desiredLen - 1);
    const safeEnd = resolveSafeEndAyah(surahId, startAyah, preferredEnd, versesCount);

    if (
      !isAyahEndingWithWaqfLa(surahId, safeEnd) &&
      safeEnd - startAyah + 1 <= maxPassageLength
    ) {
      return { startAyah, endAyah: safeEnd };
    }
  }

  // Deterministic fallback scan guaranteed to find a clean <=12-ayah range in any Surah
  for (let s = 1; s <= versesCount; s++) {
    if (s > 1 && isAyahEndingWithWaqfLa(surahId, s - 1)) continue;
    const candidateEnd = resolveSafeEndAyah(
      surahId,
      s,
      Math.min(versesCount, s + 3),
      versesCount
    );
    if (!isAyahEndingWithWaqfLa(surahId, candidateEnd) && candidateEnd - s + 1 <= maxPassageLength) {
      return { startAyah: s, endAyah: candidateEnd };
    }
  }

  // Final Surah fallback (verified: every Surah's final ayah never ends with waqf لا)
  return {
    startAyah: 1,
    endAyah: resolveSafeEndAyah(surahId, 1, versesCount, versesCount),
  };
}

/**
 * Generates all daily suggestions for the given dateKey (or Date), guaranteed to:
 * 1) Renew all suggestions compared to yesterday and any excluded Surahs,
 * 2) Never terminate on an ayah that ends with waqf "لا".
 */
export function getDailySuggestions(
  dateOrKey: Date | string = new Date(),
  chapters?: Chapter[],
  count: number = DAILY_SUGGESTION_COUNT,
  excludeSurahIds?: Set<number>
): DailySuggestion[] {
  const dateKey = typeof dateOrKey === 'string' ? dateOrKey : getLocalDateKey(dateOrKey);
  const dayIndex = dateKeyToDayIndex(dateKey);
  const cycleIndex = Math.floor(dayIndex / DAYS_PER_CYCLE);

  let chosenSurahIds = getCycleDaySurahIds(dayIndex, count);

  // If previous stored session came from an arbitrary earlier day (e.g., user skipped days),
  // guarantee zero overlap with that previous set as well.
  if (excludeSurahIds && excludeSurahIds.size > 0) {
    const yesterdaySet = new Set(getCycleDaySurahIds(dayIndex - 1, count));
    const blocked = new Set<number>([...excludeSurahIds, ...yesterdaySet]);
    const availablePool = shuffledSurahIdsForCycle(cycleIndex + 101).filter(
      (id) => !blocked.has(id) && !chosenSurahIds.includes(id)
    );

    chosenSurahIds = chosenSurahIds.map((id) => {
      if (!excludeSurahIds.has(id)) return id;
      const replacement = availablePool.shift();
      return replacement ?? id;
    });
  }

  return chosenSurahIds.map((surahId) => {
    const info = getSurahInfo(surahId, chapters);
    const passage = pickPassageForSurah(surahId, info.versesCount, dateKey, cycleIndex);
    const endAyah = resolveSafeEndAyah(
      surahId,
      passage.startAyah,
      passage.endAyah,
      info.versesCount
    );

    return {
      title: formatSuggestionTitle(
        info.nameSimple,
        info.translatedName,
        info.versesCount,
        passage.startAyah,
        endAyah,
        passage.customLabel
      ),
      surahId,
      startAyah: passage.startAyah,
      endAyah,
      arabicName: info.arabicName,
    };
  });
}

interface StoredDailySuggestions {
  dateKey: string;
  suggestions: DailySuggestion[];
}

function isValidStoredSuggestionList(
  items: unknown,
  expectedCount: number
): items is DailySuggestion[] {
  if (!Array.isArray(items) || items.length !== expectedCount) return false;
  return items.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.title === 'string' &&
      typeof item.surahId === 'number' &&
      typeof item.startAyah === 'number' &&
      typeof item.endAyah === 'number' &&
      typeof item.arabicName === 'string' &&
      item.surahId >= 1 &&
      item.surahId <= 114 &&
      item.startAyah >= 1 &&
      item.endAyah >= item.startAyah &&
      !isAyahEndingWithWaqfLa(item.surahId, item.endAyah)
  );
}

/**
 * Returns today's daily suggestions (persisted per local day in localStorage).
 * Whenever the local date changes, all suggestions are automatically renewed
 * with zero overlap with the previous selection and zero waqf "لا" endings.
 */
export function getOrCreateDailySuggestions(
  chapters?: Chapter[],
  nowOrKey: Date | string = new Date()
): { dateKey: string; suggestions: DailySuggestion[] } {
  const todayKey = typeof nowOrKey === 'string' ? nowOrKey : getLocalDateKey(nowOrKey);

  if (typeof window === 'undefined') {
    return {
      dateKey: todayKey,
      suggestions: getDailySuggestions(todayKey, chapters),
    };
  }

  let previousSurahIds: Set<number> | undefined;

  try {
    const raw = localStorage.getItem(DAILY_SUGGESTIONS_STORAGE_KEY);
    if (raw) {
      const parsed: StoredDailySuggestions = JSON.parse(raw);
      if (
        parsed?.dateKey === todayKey &&
        isValidStoredSuggestionList(parsed.suggestions, DAILY_SUGGESTION_COUNT)
      ) {
        return {
          dateKey: todayKey,
          suggestions: parsed.suggestions,
        };
      }
      if (Array.isArray(parsed?.suggestions)) {
        previousSurahIds = new Set(
          parsed.suggestions
            .map((s) => s?.surahId)
            .filter((id): id is number => typeof id === 'number')
        );
      }
    }
  } catch {
    // Ignore malformed or restricted storage
  }

  const freshSuggestions = getDailySuggestions(
    todayKey,
    chapters,
    DAILY_SUGGESTION_COUNT,
    previousSurahIds
  );

  try {
    const payload: StoredDailySuggestions = {
      dateKey: todayKey,
      suggestions: freshSuggestions,
    };
    localStorage.setItem(DAILY_SUGGESTIONS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write errors
  }

  return {
    dateKey: todayKey,
    suggestions: freshSuggestions,
  };
}
