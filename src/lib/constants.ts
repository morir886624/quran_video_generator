import { BackgroundPreset, Reciter, VideoConfig } from '@/types/quran';

export const POPULAR_RECITERS: Reciter[] = [
  {
    id: 7,
    name: 'Mishari Rashid Al-Afasy',
    style: 'Murattal',
    description: 'Kuwait • Renowned soulful, clear recitation',
  },
  {
    id: 2,
    name: 'AbdulBaset AbdulSamad',
    style: 'Murattal',
    description: 'Egypt • Legendary master of Tajweed',
  },
  {
    id: 9,
    name: 'Maher Al-Muaiqly',
    style: 'Murattal',
    description: 'Imam of Masjid Al-Haram, Makkah',
  },
  {
    id: 3,
    name: 'Abdur-Rahman as-Sudais',
    style: 'Murattal',
    description: 'Imam of Masjid Al-Haram, Makkah',
  },
  {
    id: 4,
    name: 'Abu Bakr al-Shatri',
    style: 'Murattal',
    description: 'Saudi Arabia • Deep, resonant tone',
  },
  {
    id: 5,
    name: 'Hani ar-Rifai',
    style: 'Murattal',
    description: 'Saudi Arabia • Emotional and heartfelt',
  },
  {
    id: 6,
    name: 'Mahmoud Khalil Al-Husary',
    style: 'Murattal',
    description: 'Egypt • Pioneer of Tajweed standards',
  },
  {
    id: 10,
    name: 'Saud Al-Shuraim',
    style: 'Murattal',
    description: 'Former Imam of Masjid Al-Haram',
  },
  {
    id: 12,
    name: 'Saad Al-Ghamdi',
    style: 'Murattal',
    description: 'Saudi Arabia • Fluent, rhythmic recitation',
  },
];

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'midnight',
    name: 'Midnight Galaxy',
    description: 'Cosmic deep indigo with animated starfield & nebula',
    gradientColors: ['#070B19', '#0E1738', '#050814'],
    accentColor: '#38BDF8',
    particleType: 'stars',
  },
  {
    id: 'emerald',
    name: 'Emerald Sanctuary',
    description: 'Quran.com iconic rich Islamic green with sacred glow',
    gradientColors: ['#022C22', '#064E3B', '#021B15'],
    accentColor: '#10B981',
    particleType: 'geometric',
  },
  {
    id: 'gold',
    name: 'Golden Twilight',
    description: 'Warm amber dusk with floating light dust',
    gradientColors: ['#291804', '#451A03', '#1A0B02'],
    accentColor: '#F59E0B',
    particleType: 'dust',
  },
  {
    id: 'rain',
    name: 'Rain & Solitude',
    description: 'Meditative deep teal with gentle falling droplets',
    gradientColors: ['#041E26', '#083344', '#021217'],
    accentColor: '#06B6D4',
    particleType: 'rain',
  },
  {
    id: 'oled',
    name: 'Minimal Obsidian',
    description: 'Ultra-pure OLED black with subtle central aura',
    gradientColors: ['#000000', '#0A0A0A', '#000000'],
    accentColor: '#E2E8F0',
    particleType: 'minimal',
  },
  {
    id: 'desert',
    name: 'Desert Mirage',
    description: 'Warm crimson and dusky violet twilight',
    gradientColors: ['#1E0A1E', '#3B072B', '#120412'],
    accentColor: '#EC4899',
    particleType: 'glow',
  },
];

export const POPULAR_PRESETS = [
  {
    title: 'Surah Al-Fatiha (The Opener)',
    surahId: 1,
    startAyah: 1,
    endAyah: 7,
    arabicName: 'سورة الفاتحة',
  },
  {
    title: 'Ayat Al-Kursi (The Throne)',
    surahId: 2,
    startAyah: 255,
    endAyah: 255,
    arabicName: 'آية الكرسي',
  },
  {
    title: 'Surah Al-Ikhlas (Sincerity)',
    surahId: 112,
    startAyah: 1,
    endAyah: 4,
    arabicName: 'سورة الإخلاص',
  },
  {
    title: 'Surah Al-Falaq (The Daybreak)',
    surahId: 113,
    startAyah: 1,
    endAyah: 5,
    arabicName: 'سورة الفلق',
  },
  {
    title: 'Surah An-Nas (Mankind)',
    surahId: 114,
    startAyah: 1,
    endAyah: 6,
    arabicName: 'سورة الناس',
  },
  {
    title: 'Surah Al-Mulk (1–5)',
    surahId: 67,
    startAyah: 1,
    endAyah: 5,
    arabicName: 'سورة الملك',
  },
  {
    title: 'Surah Ar-Rahman (1–13)',
    surahId: 55,
    startAyah: 1,
    endAyah: 13,
    arabicName: 'سورة الرحمن',
  },
  {
    title: 'Surah Ad-Duha (1–11)',
    surahId: 93,
    startAyah: 1,
    endAyah: 11,
    arabicName: 'سورة الضحى',
  },
];

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  aspectRatio: '9:16',
  backgroundPreset: 'midnight',
  customMediaUrl: null,
  customMediaType: null,
  arabicFontSize: 38,
  translationFontSize: 20,
  arabicFontFamily: 'Amiri Quran',
  showTranslation: true,
  showSurahBadge: true,
  showAyahNumber: true,
  overlayOpacity: 0.55,
  glowEffect: true,
  fps: 30,
};

