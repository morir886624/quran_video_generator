import { Reciter } from '@/types/quran';

export interface UserPreferences {
  // Reciter & Audio
  reciterId: number;

  // Translation
  translationId: number;
  translationName: string;

  // Typography & Sizing
  arabicFontSize: number; // 24 to 52 (default: 34)
  translationFontSize: number; // 12 to 24 (default: 16)
  arabicFontFamily: 'Amiri Quran' | 'Scheherazade New' | 'Amiri';

  // Colors & Aesthetics
  useCustomColors: boolean;
  arabicTextColor: string; // e.g. '#FFFFFF'
  translationTextColor: string; // e.g. '#CBD5E1'
  accentColor: string; // e.g. '#10B981'

  // Reading Experience Toggles
  showWordByWord: boolean;
  showAyahNumber: boolean;
  tafsirEdition?: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  reciterId: 7, // Mishari Rashid Al-Afasy
  translationId: 20, // Saheeh International
  translationName: 'Saheeh International',
  arabicFontSize: 34,
  translationFontSize: 16,
  arabicFontFamily: 'Amiri Quran',
  useCustomColors: false,
  arabicTextColor: '#FFFFFF',
  translationTextColor: '#CBD5E1',
  accentColor: '#10B981',
  showWordByWord: false,
  showAyahNumber: true,
  tafsirEdition: 'persian-mokhtasar',
};

export const POPULAR_TRANSLATIONS: Array<{
  id: number;
  name: string;
  author: string;
  language: string;
}> = [
  { id: 20, name: 'Saheeh International', author: 'Saheeh International', language: 'English' },
  { id: 131, name: 'The Clear Quran', author: 'Dr. Mustafa Khattab', language: 'English' },
  { id: 85, name: 'Abdel Haleem', author: 'M.A.S. Abdel Haleem', language: 'English' },
  { id: 136, name: 'Muhammad Hamidullah', author: 'Hamidullah', language: 'French' },
  { id: 86, name: 'Muhammad Isa Garcia', author: 'Isa Garcia', language: 'Spanish' },
  { id: 97, name: 'Tafhim commentary', author: 'Maududi', language: 'Urdu' },
  { id: 33, name: 'Kemenag', author: 'Indonesian Ministry', language: 'Indonesian' },
  { id: 77, name: 'Diyanet Isleri', author: 'Diyanet', language: 'Turkish' },
];

export const PRESET_TEXT_COLORS = [
  { name: 'Pure White', value: '#FFFFFF' },
  { name: 'Warm Gold', value: '#FEF08A' },
  { name: 'Deep Gold', value: '#FCD34D' },
  { name: 'Mint Green', value: '#6EE7B7' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Cyan Blue', value: '#38BDF8' },
  { name: 'Soft Slate', value: '#CBD5E1' },
  { name: 'Lavender', value: '#C084FC' },
  { name: 'Rose', value: '#FB7185' },
];

export const PRESET_ACCENT_COLORS = [
  { name: 'Emerald', value: '#10B981' },
  { name: 'Amber Gold', value: '#F59E0B' },
  { name: 'Sky Cyan', value: '#06B6D4' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Rose Pink', value: '#F43F5E' },
  { name: 'Royal Blue', value: '#3B82F6' },
];

export const FONT_SIZE_PRESETS = [
  { label: 'Compact', arabic: 28, translation: 14 },
  { label: 'Standard', arabic: 34, translation: 16 },
  { label: 'Comfortable', arabic: 40, translation: 18 },
  { label: 'Large', arabic: 46, translation: 20 },
];

const PREFERENCES_STORAGE_KEY = 'quran_user_preferences';

/**
 * Loads user preferences from browser localStorage safely.
 */
export function loadUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_PREFERENCES;
  }

  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_PREFERENCES;

    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...parsed,
    };
  } catch (e) {
    console.warn('Failed to load user preferences from localStorage:', e);
    return DEFAULT_USER_PREFERENCES;
  }
}

/**
 * Merges and saves partial user preferences to browser localStorage.
 */
export function saveUserPreferences(updates: Partial<UserPreferences>): UserPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_USER_PREFERENCES, ...updates };
  }

  try {
    const current = loadUserPreferences();
    const updated: UserPreferences = {
      ...current,
      ...updates,
    };
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save user preferences to localStorage:', e);
    return { ...DEFAULT_USER_PREFERENCES, ...updates };
  }
}

/**
 * Resets user preferences back to initial defaults.
 */
export function resetUserPreferences(): UserPreferences {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(DEFAULT_USER_PREFERENCES));
    } catch (e) {
      console.warn('Failed to reset user preferences:', e);
    }
  }
  return DEFAULT_USER_PREFERENCES;
}

