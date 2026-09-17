import { BackgroundPreset, Reciter, VideoConfig, TafsirOption } from '@/types/quran';

export const POPULAR_RECITERS: Reciter[] = [
  {
    id: 7,
    name: 'Mishari Rashid Al-Afasy',
    style: 'Murattal',
    description: 'Kuwait • Renowned soulful, clear recitation',
  },
  {
    id: 101,
    name: 'Maher Al-Muaiqly',
    style: 'Murattal',
    description: 'Imam of Masjid Al-Haram, Makkah',
    audioSubfolder: 'MaherAlMuaiqly128kbps',
  },
  {
    id: 3,
    name: 'Abdur-Rahman as-Sudais',
    style: 'Murattal',
    description: 'Imam of Masjid Al-Haram, Makkah',
  },
  {
    id: 102,
    name: 'Yasser Al-Dosari',
    style: 'Murattal',
    description: 'Imam of Masjid Al-Haram, Makkah • Powerful voice',
    audioSubfolder: 'Yasser_Ad-Dussary_128kbps',
  },
  {
    id: 103,
    name: 'Saad Al-Ghamdi',
    style: 'Murattal',
    description: 'Saudi Arabia • Fluent, rhythmic recitation',
    audioSubfolder: 'Ghamadi_40kbps',
  },
  {
    id: 2,
    name: 'AbdulBaset AbdulSamad',
    style: 'Murattal',
    description: 'Egypt • Legendary master of Tajweed (Murattal)',
  },
  {
    id: 1,
    name: 'AbdulBaset AbdulSamad',
    style: 'Mujawwad',
    description: 'Egypt • Masterful melodic recitation (Mujawwad)',
  },
  {
    id: 9,
    name: 'Mohamed Siddiq al-Minshawi',
    style: 'Murattal',
    description: 'Egypt • Revered emotional, soulful recitation',
  },
  {
    id: 8,
    name: 'Mohamed Siddiq al-Minshawi',
    style: 'Mujawwad',
    description: 'Egypt • Classical masterwork (Mujawwad)',
  },
  {
    id: 6,
    name: 'Mahmoud Khalil Al-Husary',
    style: 'Murattal',
    description: 'Egypt • Pioneer of standardized Tajweed',
  },
  {
    id: 12,
    name: 'Mahmoud Khalil Al-Husary',
    style: 'Muallim',
    description: 'Egypt • Educational edition with clear phrasing',
  },
  {
    id: 10,
    name: 'Saud Al-Shuraim',
    style: 'Murattal',
    description: 'Former Imam of Masjid Al-Haram',
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
    description: 'Saudi Arabia • Heartfelt, tearful recitation',
  },
  {
    id: 11,
    name: 'Mohamed al-Tablawi',
    style: 'Murattal',
    description: 'Egypt • Renowned classical Egyptian reciter',
  },
  {
    id: 104,
    name: 'Nasser Al-Qatami',
    style: 'Murattal',
    description: 'Saudi Arabia • Highly evocative and beloved recitation',
    audioSubfolder: 'Nasser_Alqatami_128kbps',
  },
  {
    id: 105,
    name: 'Ali Jaber',
    style: 'Murattal',
    description: 'Former Imam of Masjid Al-Haram • Historic voice',
    audioSubfolder: 'Ali_Jaber_64kbps',
  },
  {
    id: 106,
    name: 'Fares Abbad',
    style: 'Murattal',
    description: 'Yemen • Soothing, melodic recitation',
    audioSubfolder: 'Fares_Abbad_64kbps',
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
  surahTitleFontSize: 32,
  badgeFontSize: 24,
  watermarkFontSize: 18,

  arabicTextColor: '#FFFFFF',
  translationTextColor: '#CBD5E1',
  surahTitleColor: 'rgba(254, 240, 138, 0.9)',
  badgeTextColor: '#E2E8F0',
  watermarkColor: 'rgba(255, 255, 255, 0.4)',
  watermarkText: 'Powered by Quran.com',
  progressBarColor: '#10B981',

  arabicFontFamily: 'Amiri Quran',
  showTranslation: true,
  showSurahBadge: true,
  showAyahNumber: true,
  showProgressBar: true,
  progressBarScope: 'overall',
  showWatermark: true,

  // Persian Tafsir Options
  showPersianTafsir: false,
  persianTafsirPosition: 'under',
  persianTafsirEdition: 'persian-mokhtasar',
  persianFontSize: 17,
  persianTextColor: '#FDE68A',

  overlayOpacity: 0.55,
  glowEffect: true,
  fps: 30,
};

/**
 * Returns a verified working preview audio URL for Al-Fatihah (Ayah 1:1)
 */
export const getReciterPreviewUrl = (reciter: Reciter): string => {
  if (reciter.audioSubfolder) {
    return `https://everyayah.com/data/${reciter.audioSubfolder}/001001.mp3`;
  }
  switch (reciter.id) {
    case 1:
      return 'https://verses.quran.com/AbdulBaset/Mujawwad/mp3/001001.mp3';
    case 2:
      return 'https://verses.quran.com/AbdulBaset/Murattal/mp3/001001.mp3';
    case 3:
      return 'https://verses.quran.com/Sudais/mp3/001001.mp3';
    case 4:
      return 'https://verses.quran.com/Shatri/mp3/001001.mp3';
    case 5:
      return 'https://verses.quran.com/Rifai/mp3/001001.mp3';
    case 6:
      return 'https://mirrors.quranicaudio.com/everyayah/Husary_64kbps/001001.mp3';
    case 7:
      return 'https://verses.quran.com/Alafasy/mp3/001001.mp3';
    case 8:
      return 'https://verses.quran.com/Minshawi/Mujawwad/mp3/001001.mp3';
    case 9:
      return 'https://verses.quran.com/Minshawi/Murattal/mp3/001001.mp3';
    case 10:
      return 'https://verses.quran.com/Shuraym/mp3/001001.mp3';
    case 11:
      return 'https://mirrors.quranicaudio.com/everyayah/Mohammad_al_Tablaway_128kbps/001001.mp3';
    case 12:
      return 'https://mirrors.quranicaudio.com/everyayah/Husary_Muallim_128kbps/001001.mp3';
    default:
      return 'https://verses.quran.com/Alafasy/mp3/001001.mp3';
  }
};

export const AVAILABLE_TAFSIRS: TafsirOption[] = [
  {
    id: 'persian-mokhtasar',
    name: 'تفسیر المختصر (Persian Al-Mukhtasar)',
    language: 'Persian',
    direction: 'rtl',
    description: 'خلاصه و روان از معانی آیات قرآن کریم',
  },
  {
    id: 'fr-tafsir-as-saadi',
    name: 'تفسیر السعدی (Tafsir As-Sa\'di)',
    language: 'Persian',
    direction: 'rtl',
    description: 'تفسیر تیسیر الکریم الرحمن فی تفسیر کلام المنان',
  },
  {
    id: 'ibn-kathir',
    name: 'Tafsir Ibn Kathir (English)',
    language: 'English',
    direction: 'ltr',
    description: 'Renowned classical exegesis translated to English',
  },
  {
    id: 'muyassar',
    name: 'تفسير الميسر (Tafsir Al-Muyassar)',
    language: 'Arabic',
    direction: 'rtl',
    description: 'التفسير الميسر الصادر عن مجمع الملك فهد',
  },
  {
    id: 'jalalayn',
    name: 'تفسير الجلالين (Tafsir Al-Jalalayn)',
    language: 'Arabic',
    direction: 'rtl',
    description: 'تفسير الجلالين المحلي والسيوطي',
  },
];

