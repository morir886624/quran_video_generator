export interface Chapter {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: number[];
  translated_name: {
    language_name: string;
    name: string;
  };
}

export interface Word {
  id: number;
  position: number;
  audio_url: string | null;
  char_type_name: string;
  text: string;
  translation: {
    text: string;
    language_name: string;
  };
  transliteration: {
    text: string | null;
    language_name: string;
  };
}

export interface VerseTranslation {
  id: number;
  resource_id: number;
  text: string;
}

export interface Verse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  words?: Word[];
  translations?: VerseTranslation[];
}

export interface Reciter {
  id: number;
  name: string;
  style?: string | null;
  description?: string;
  audioSubfolder?: string;
}

export interface AyahAudioFile {
  verse_key: string;
  url: string;
}

export type AspectRatio = '9:16' | '1:1' | '16:9';

export type BackgroundPresetId =
  | 'midnight'
  | 'emerald'
  | 'gold'
  | 'rain'
  | 'oled'
  | 'desert';

export interface BackgroundPreset {
  id: BackgroundPresetId;
  name: string;
  description: string;
  gradientColors: [string, string, string];
  accentColor: string;
  particleType: 'stars' | 'geometric' | 'dust' | 'rain' | 'minimal' | 'glow';
}

export interface VideoConfig {
  aspectRatio: AspectRatio;
  backgroundPreset: BackgroundPresetId;
  customMediaUrl: string | null;
  customMediaType: 'video' | 'image' | null;
  arabicFontSize: number;
  translationFontSize: number;
  arabicFontFamily: 'Amiri' | 'Amiri Quran' | 'Scheherazade New';
  showTranslation: boolean;
  showSurahBadge: boolean;
  showAyahNumber: boolean;
  overlayOpacity: number;
  glowEffect: boolean;
  fps: 30 | 60;
}

export interface Tafsir {
  id: number;
  resource_id: number;
  text: string;
  verse_key: string;
}

export interface ChapterInfo {
  id: number;
  chapter_id: number;
  language_name: string;
  short_text: string;
  text: string;
  source: string;
}

export interface TranslationResource {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name: {
    name: string;
    language_name: string;
  };
}

