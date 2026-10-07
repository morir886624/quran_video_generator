import { BackgroundPreset, Reciter, VideoConfig, TafsirOption } from '@/types/quran';

export const POPULAR_RECITERS: Reciter[] = [
  {
    id: 7,
    name: 'Mishari Rashid Al-Afasy',
    style: 'Murattal',
    description: 'Kuwait • Renowned soulful, clear recitation',
  },
  {
    id: 115,
    name: 'Mohammad Ayyub',
    style: 'Murattal',
    description: 'Saudi Arabia • Emotional, slow recitation',
    audioSubfolder: 'Muhammad_Ayyoub_128kbps',
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
  // 13 Image Presets
  {
    id: 'parchment',
    name: 'Ancient Parchment',
    description: 'Warm textured paper with subtle leaf shadows',
    gradientColors: ['#D7C8A9', '#E6DECE', '#BFA67D'],
    accentColor: '#9A7D42',
    particleType: 'dust',
    imageUrl: '/backgrounds/parchment-1.jpg',
  },
  {
    id: 'dark-paper',
    name: 'Charcoal Linen',
    description: 'Dark textured paper with subtle arabesque',
    gradientColors: ['#1c1c1e', '#2c2c2e', '#121214'],
    accentColor: '#E5E5E5',
    particleType: 'dust',
    imageUrl: '/backgrounds/dark-paper-1.jpg',
  },
  {
    id: 'terracotta',
    name: 'Warm Terracotta',
    description: 'Earthy plaster texture with geometric stars',
    gradientColors: ['#8C4731', '#B5654C', '#592D1F'],
    accentColor: '#F2A679',
    particleType: 'dust',
    imageUrl: '/backgrounds/terracotta-1.jpg',
  },
  {
    id: 'canyon',
    name: 'Desert Canyon',
    description: 'A deep desert slot canyon gorge with warm sunlight',
    gradientColors: ['#8c3c1e', '#d97d4c', '#591a0c'],
    accentColor: '#f2c179',
    particleType: 'dust',
    imageUrl: '/backgrounds/canyon.jpg',
  },
  {
    id: 'city-gate',
    name: 'City Gate',
    description: 'An ancient desert city gate at night',
    gradientColors: ['#121d2b', '#263b52', '#08101a'],
    accentColor: '#e5b95c',
    particleType: 'stars',
    imageUrl: '/backgrounds/city-gate.jpg',
  },
  {
    id: 'arch-garden',
    name: 'Arch Garden',
    description: 'Islamic stone archway looking out onto a tranquil botanical garden',
    gradientColors: ['#1c3829', '#385947', '#0d1a12'],
    accentColor: '#93c2a9',
    particleType: 'dust',
    imageUrl: '/backgrounds/arch-garden.jpg',
  },
  {
    id: 'mountain-sunrise',
    name: 'Mountain Sunrise',
    description: 'Majestic layered mountain peaks in warm sunrise glow',
    gradientColors: ['#6a2a2f', '#c96452', '#331016'],
    accentColor: '#f7c36a',
    particleType: 'dust',
    imageUrl: '/backgrounds/mountain-sunrise.jpg',
  },
  {
    id: 'village',
    name: 'Ancient Village',
    description: 'Mud-brick hillside village at sunset',
    gradientColors: ['#a66d4f', '#d99a77', '#663b26'],
    accentColor: '#ffe0b2',
    particleType: 'dust',
    imageUrl: '/backgrounds/village.jpg',
  },
  {
    id: 'olive-valley',
    name: 'Olive Valley',
    description: 'A serene blue river flowing through olive groves',
    gradientColors: ['#283d2c', '#4a6b51', '#141f16'],
    accentColor: '#a1c2a8',
    particleType: 'dust',
    imageUrl: '/backgrounds/olive-valley.jpg',
  },
  {
    id: 'oasis',
    name: 'Peaceful Oasis',
    description: 'Desert oasis with lush palm trees and reflective pool',
    gradientColors: ['#1e4745', '#336e6a', '#0d2422'],
    accentColor: '#80d6cc',
    particleType: 'dust',
    imageUrl: '/backgrounds/oasis.jpg',
  },
  {
    id: 'persian-valley',
    name: 'Persian Valley',
    description: 'Lush green rolling hills and winding dirt path',
    gradientColors: ['#3e5927', '#6d8c4c', '#1c2e11'],
    accentColor: '#d2eb94',
    particleType: 'dust',
    imageUrl: '/backgrounds/persian-valley.jpg',
  },
  {
    id: 'calm-sea',
    name: 'Calm Sea Diorama',
    description: 'Serene waves illuminated by a glowing full moon (framed)',
    gradientColors: ['#0f2238', '#1a3c63', '#06101c'],
    accentColor: '#95c6fa',
    particleType: 'stars',
    imageUrl: '/backgrounds/calm-sea.jpg',
  },
  {
    id: 'sea-frameless',
    name: 'Calm Sea',
    description: 'Serene waves illuminated by a glowing full moon',
    gradientColors: ['#0f2238', '#1a3c63', '#06101c'],
    accentColor: '#95c6fa',
    particleType: 'stars',
    imageUrl: '/backgrounds/sea-frameless.jpg',
  },
  // 13 CSS Presets
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    description: 'Deep northern night sky with green luminous glow',
    gradientColors: ['#0B1B3D', '#1B3D5A', '#061325'],
    accentColor: '#34D399',
    particleType: 'glow',
  },
  {
    id: 'dusk',
    name: 'Violet Dusk',
    description: 'Deep violet and pink sunset transition',
    gradientColors: ['#2A1625', '#4A2535', '#160B12'],
    accentColor: '#F472B6',
    particleType: 'stars',
  },
  {
    id: 'dawn',
    name: 'Soft Dawn',
    description: 'Early morning soft cool gray light',
    gradientColors: ['#30303A', '#404552', '#181B21'],
    accentColor: '#9CA3AF',
    particleType: 'dust',
  },
  {
    id: 'nebula',
    name: 'Cosmic Nebula',
    description: 'Vibrant deep space clouds of purple and magenta',
    gradientColors: ['#1A0B2E', '#3B154D', '#0D0516'],
    accentColor: '#D946EF',
    particleType: 'stars',
  },
  {
    id: 'abyss',
    name: 'Ocean Abyss',
    description: 'Impenetrable deep ocean blue',
    gradientColors: ['#040812', '#0A1224', '#020409'],
    accentColor: '#3B82F6',
    particleType: 'dust',
  },
  {
    id: 'twilight',
    name: 'Blue Twilight',
    description: 'Calm and cool evening blue tones',
    gradientColors: ['#1E213A', '#2E3553', '#0F111C'],
    accentColor: '#60A5FA',
    particleType: 'minimal',
  },
  {
    id: 'crimson-sky',
    name: 'Crimson Sky',
    description: 'Intense red sky after dusk',
    gradientColors: ['#3D1418', '#5E1E24', '#1F0A0C'],
    accentColor: '#FCA5A5',
    particleType: 'dust',
  },
  {
    id: 'sandstorm',
    name: 'Desert Sandstorm',
    description: 'Warm swirling dust and brown tones',
    gradientColors: ['#3A2818', '#5E4126', '#1D140C'],
    accentColor: '#FCD34D',
    particleType: 'dust',
  },
  {
    id: 'ocean-deep',
    name: 'Deep Blue Sea',
    description: 'Rich vibrant underwater blues',
    gradientColors: ['#061A2B', '#0A2B47', '#030D15'],
    accentColor: '#38BDF8',
    particleType: 'glow',
  },
  {
    id: 'forest-mist',
    name: 'Forest Mist',
    description: 'Dark green mystical forest fog',
    gradientColors: ['#10241A', '#1C402E', '#08120D'],
    accentColor: '#6EE7B7',
    particleType: 'rain',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Warm magical golden sunlight',
    gradientColors: ['#3D2B14', '#5E421E', '#1F150A'],
    accentColor: '#FBBF24',
    particleType: 'glow',
  },
  {
    id: 'moonlight',
    name: 'Moonlight Shadow',
    description: 'Cool blue light of a full moon',
    gradientColors: ['#121A2F', '#1F2C4E', '#090D17'],
    accentColor: '#93C5FD',
    particleType: 'stars',
  },
  {
    id: 'starlight',
    name: 'Starlight Void',
    description: 'Pitch black sky full of brilliant stars',
    gradientColors: ['#0B0D17', '#15192B', '#05060B'],
    accentColor: '#E2E8F0',
    particleType: 'stars',
  },
  // Default Presets
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
  {
    id: 'sapphire',
    name: 'Sapphire Depths',
    description: 'Deep oceanic blue with floating mist',
    gradientColors: ['#061E3E', '#103768', '#020B16'],
    accentColor: '#60A5FA',
    particleType: 'glow',
  },
  {
    id: 'ruby',
    name: 'Ruby Dusk',
    description: 'Deep crimson night with golden dust',
    gradientColors: ['#2E060E', '#4C0816', '#140104'],
    accentColor: '#F43F5E',
    particleType: 'dust',
  },
  {
    id: 'amethyst',
    name: 'Amethyst Sky',
    description: 'Mystical deep purple and violet cosmic sky',
    gradientColors: ['#18062B', '#2A0B4D', '#0A0214'],
    accentColor: '#C084FC',
    particleType: 'stars',
  },
  {
    id: 'forest',
    name: 'Ancient Forest',
    description: 'Serene deep jungle green with falling leaves',
    gradientColors: ['#032211', '#063B1F', '#011209'],
    accentColor: '#34D399',
    particleType: 'rain',
  },
  {
    id: 'api-image',
    name: 'API Image',
    description: 'Uses verse specific image from API',
    gradientColors: ['#1e293b', '#334155', '#0f172a'],
    accentColor: '#94a3b8',
    particleType: 'minimal',
  }
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
  glowEffect: false,
  textMotion: false,
  fps: 30,
  playbackSpeed: 1.0,

  enableParticles: true,
  particleType: 'stars',
};

/**
 * Returns the exact, verified recitation audio URL for any ayah and reciter
 */
export const getReciterAyahUrl = (
  reciter: Reciter,
  chapterId: number,
  ayahNumber: number
): string => {
  const padC = String(chapterId).padStart(3, '0');
  const padV = String(ayahNumber).padStart(3, '0');

  if (reciter.audioSubfolder) {
    return `https://everyayah.com/data/${reciter.audioSubfolder}/${padC}${padV}.mp3`;
  }

  switch (reciter.id) {
    case 1:
      return `https://verses.quran.com/AbdulBaset/Mujawwad/mp3/${padC}${padV}.mp3`;
    case 2:
      return `https://verses.quran.com/AbdulBaset/Murattal/mp3/${padC}${padV}.mp3`;
    case 3:
      return `https://verses.quran.com/Sudais/mp3/${padC}${padV}.mp3`;
    case 4:
      return `https://verses.quran.com/Shatri/mp3/${padC}${padV}.mp3`;
    case 5:
      return `https://verses.quran.com/Rifai/mp3/${padC}${padV}.mp3`;
    case 6:
      return `https://everyayah.com/data/Husary_64kbps/${padC}${padV}.mp3`;
    case 7:
      return `https://verses.quran.com/Alafasy/mp3/${padC}${padV}.mp3`;
    case 8:
      return `https://verses.quran.com/Minshawi/Mujawwad/mp3/${padC}${padV}.mp3`;
    case 9:
      return `https://verses.quran.com/Minshawi/Murattal/mp3/${padC}${padV}.mp3`;
    case 10:
      return `https://verses.quran.com/Shuraym/mp3/${padC}${padV}.mp3`;
    case 11:
      return `https://everyayah.com/data/Mohammad_al_Tablaway_128kbps/${padC}${padV}.mp3`;
    case 12:
      return `https://everyayah.com/data/Husary_Muallim_128kbps/${padC}${padV}.mp3`;
    default:
      return `https://verses.quran.com/Alafasy/mp3/${padC}${padV}.mp3`;
  }
};

/**
 * Returns a verified working preview audio URL for Al-Fatihah (Ayah 1:1)
 */
export const getReciterPreviewUrl = (reciter: Reciter): string => {
  return getReciterAyahUrl(reciter, 1, 1);
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

