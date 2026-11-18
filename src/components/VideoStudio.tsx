'use client';

import React, { useState, useRef } from 'react';
import {
  Chapter,
  Reciter,
  Verse,
  VideoConfig,
  BackgroundPresetId,
  BackgroundPresetCategory,
} from '@/types/quran';
import { VideoPreviewCanvas } from './VideoPreviewCanvas';
import { VideoExportModal } from './VideoExportModal';
import { ReciterModal } from './ReciterModal';
import { ProjectsModal } from './ProjectsModal';
import { VideoIntervalModal, formatIntervalTime } from './VideoIntervalModal';
import { ProjectDraft } from '@/lib/storage-db';
import { useBackButton } from '@/lib/back-button';
import { BACKGROUND_PRESETS, DEFAULT_VIDEO_CONFIG } from '@/lib/constants';
import {
  Download,
  Mic2,
  Palette,
  Type,
  BookOpen,
  FolderKanban,
  RotateCcw,
  Smartphone,
  Square,
  Monitor,
  Check,
  Upload,
  Sparkles,
  Settings,
  CircleDot,
  CheckCircle2,
  Loader2,
  Save,
  Trash2,
  Scissors,
  Image as ImageIcon,
  Wand2,
} from 'lucide-react';
import { isAyahAudioCached, downloadVerseKeysAudio } from '@/lib/audio-cache';
import { saveVideoConfig, clearSavedVideoConfig } from '@/lib/video-config-storage';
import { storeCustomMedia, loadCustomMedia, clearCustomMedia } from '@/lib/custom-media-storage';

interface VideoStudioProps {
  chapter: Chapter | null;
  verses: Verse[];
  allChapterVerses?: Verse[];
  audioUrls: string[];
  chapterAudioMap?: Record<string, string>;
  config: VideoConfig;
  onChangeConfig: (updates: Partial<VideoConfig>) => void;
  currentReciter: Reciter;
  onSelectReciter: (reciter: Reciter) => void;
  onBackToReader: () => void;
  onOpenAyahSelection?: () => void;
  selectedVerseKeys?: Set<string>;
  selectedTranslationId?: number;
  onLoadProject?: (project: ProjectDraft) => void;
  onResetNewProject?: () => void;
  onViewInCreations?: () => void;
  onExportComplete?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const PRESET_COLORS = [
  { name: 'Pure White', value: '#FFFFFF' },
  { name: 'Warm Gold', value: '#FEF08A' },
  { name: 'Deep Gold', value: '#FCD34D' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Mint Green', value: '#6EE7B7' },
  { name: 'Cyan Blue', value: '#38BDF8' },
  { name: 'Lavender', value: '#C084FC' },
  { name: 'Soft Slate', value: '#CBD5E1' },
  { name: 'Rose', value: '#FB7185' },
];

export const VideoStudio: React.FC<VideoStudioProps> = ({
  chapter,
  verses,
  allChapterVerses,
  audioUrls,
  chapterAudioMap,
  config,
  onChangeConfig,
  currentReciter,
  onSelectReciter,
  onBackToReader,
  onOpenAyahSelection,
  selectedVerseKeys = new Set(),
  selectedTranslationId = 20,
  onLoadProject,
  onResetNewProject,
  onViewInCreations,
  onExportComplete,
}) => {
  // Main Tabs matching mockup: 'background' | 'typography' | 'color' | 'more'
  const [activeTab, setActiveTab] = useState<'background' | 'typography' | 'color' | 'more'>('background');

  // 3-Part Theme Preset Category: 'simple' | 'pictures' | 'interactives'
  const getCategoryForPreset = (presetId: BackgroundPresetId): BackgroundPresetCategory => {
    const found = BACKGROUND_PRESETS.find((p) => p.id === presetId);
    return found?.category || 'simple';
  };
  const [themeCategory, setThemeCategory] = useState<BackgroundPresetCategory>(() =>
    getCategoryForPreset(config.backgroundPreset)
  );

  // Keep category tab in sync if preset changes from outside (e.g. loading a saved project)
  React.useEffect(() => {
    const cat = getCategoryForPreset(config.backgroundPreset);
    setThemeCategory(cat);
  }, [config.backgroundPreset]);

  // Sub-sections
  const [colorTarget, setColorTarget] = useState<'arabic' | 'translation' | 'accent'>('arabic');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReciterModalOpen, setIsReciterModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [pendingVideoInterval, setPendingVideoInterval] = useState<{
    file: File | null;
    objectUrl: string;
    fileName: string;
    isNewUpload: boolean;
    initialStartTime: number | null;
    initialEndTime: number | null;
  } | null>(null);
  const [isAudioCached, setIsAudioCached] = useState<boolean>(false);
  const [isDownloadingAudio, setIsDownloadingAudio] = useState<boolean>(false);

  // Check if all selected verses audio are cached locally
  React.useEffect(() => {
    let isMounted = true;
    if (audioUrls.length === 0) return;

    Promise.all(audioUrls.map((url) => isAyahAudioCached(url))).then((results) => {
      if (isMounted) {
        setIsAudioCached(results.every(Boolean));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [audioUrls]);

  const handlePreDownloadAudio = async () => {
    if (isDownloadingAudio || !chapter) return;
    setIsDownloadingAudio(true);
    try {
      const verseKeys = verses.map((v) => v.verse_key);
      await downloadVerseKeysAudio(currentReciter, verseKeys);
      setIsAudioCached(true);
    } catch (e) {
      console.warn('Pre-download audio error:', e);
    } finally {
      setIsDownloadingAudio(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCancelVideoInterval = () => {
    if (pendingVideoInterval?.isNewUpload && pendingVideoInterval.objectUrl) {
      try {
        URL.revokeObjectURL(pendingVideoInterval.objectUrl);
      } catch {}
    }
    setPendingVideoInterval(null);
  };

  // Wire hardware back button for modals
  useBackButton(isExportModalOpen, () => setIsExportModalOpen(false), 25);
  useBackButton(isReciterModalOpen, () => setIsReciterModalOpen(false), 25);
  useBackButton(isProjectsModalOpen, () => setIsProjectsModalOpen(false), 25);
  useBackButton(!!pendingVideoInterval, handleCancelVideoInterval, 25);

  const startAyah = verses[0]?.verse_number || 1;
  const endAyah = verses[verses.length - 1]?.verse_number || 1;

  // Reset adjustments to defaults
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Manually save style as default preset
  const handleSaveStyle = () => {
    saveVideoConfig(config);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2200);
  };

  // Reset adjustments to defaults and clear persisted preferences
  const handleResetDefaults = () => {
    clearSavedVideoConfig();
    onChangeConfig({
      ...DEFAULT_VIDEO_CONFIG,
      customMediaUrl: null,
      customMediaType: null,
      customVideoStartTime: null,
      customVideoEndTime: null,
    });
  };

  const handleConfirmVideoInterval = async (startTime: number, endTime: number) => {
    if (!pendingVideoInterval) return;
    const { file, objectUrl, isNewUpload } = pendingVideoInterval;
    const oldUrl = config.customMediaUrl;

    setPendingVideoInterval(null);

    onChangeConfig({
      customMediaUrl: objectUrl,
      customMediaType: 'video',
      customVideoStartTime: startTime,
      customVideoEndTime: endTime,
    });

    if (isNewUpload && oldUrl && oldUrl !== objectUrl && oldUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {}
    }

    if (file) {
      try {
        await storeCustomMedia(file);
      } catch (err) {
        console.error('Failed to store custom media', err);
      }
    }
  };

  const handleOpenEditVideoInterval = () => {
    if (!config.customMediaUrl || config.customMediaType !== 'video') return;
    setPendingVideoInterval({
      file: null,
      objectUrl: config.customMediaUrl,
      fileName: 'Background Video',
      isNewUpload: false,
      initialStartTime: config.customVideoStartTime ?? null,
      initialEndTime: config.customVideoEndTime ?? null,
    });
  };

  // Custom background file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) return;

    const objectUrl = URL.createObjectURL(file);

    if (isVideo) {
      setPendingVideoInterval({
        file,
        objectUrl,
        fileName: file.name,
        isNewUpload: true,
        initialStartTime: null,
        initialEndTime: null,
      });
      return;
    }

    const oldUrl = config.customMediaUrl;
    onChangeConfig({
      customMediaUrl: objectUrl,
      customMediaType: 'image',
      customVideoStartTime: null,
      customVideoEndTime: null,
    });
    if (oldUrl && oldUrl !== objectUrl && oldUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {}
    }

    try {
      await storeCustomMedia(file);
    } catch (err) {
      console.error('Failed to store custom media', err);
    }
  };

  React.useEffect(() => {
    const restoreMedia = async () => {
      try {
        const file = await loadCustomMedia();
        if (file) {
          const isVideo = file.type.startsWith('video/');
          const objectUrl = URL.createObjectURL(file);
          onChangeConfig({
            customMediaUrl: objectUrl,
            customMediaType: isVideo ? 'video' : 'image',
          });
        }
      } catch (err) {
        console.error('Failed to restore custom media', err);
      }
    };
    
    // Check if we already have a blob URL, if not check indexedDB
    if (!config.customMediaUrl || !config.customMediaUrl.startsWith('blob:')) {
      restoreMedia();
    }
  }, []); // Run only on mount

  // Theme Presets separated into three parts: 'simple' | 'pictures' | 'interactives'
  const THEMES: {
    id: BackgroundPresetId;
    title: string;
    subtitle: string;
    category: BackgroundPresetCategory;
    particleType: 'stars' | 'geometric' | 'dust' | 'rain' | 'glow' | 'minimal';
    cardStyle: React.CSSProperties;
    hasWhiteDots?: boolean;
    hasGoldDots?: boolean;
    interactiveHook?: string;
  }[] = [
    // =========================================================================
    // PART 1: SIMPLE (23 Gradient & Atmospheric Themes)
    // =========================================================================
    {
      id: 'midnight',
      title: 'Midnight',
      subtitle: 'Stars',
      category: 'simple',
      particleType: 'stars',
      cardStyle: {
        background: 'radial-gradient(circle at 50% 50%, #13224B 0%, #080D1D 100%)',
      },
      hasWhiteDots: true,
    },
    {
      id: 'emerald',
      title: 'Emerald',
      subtitle: 'Geometric',
      category: 'simple',
      particleType: 'geometric',
      cardStyle: {
        background:
          'linear-gradient(135deg, #04382B 0%, #021C16 100%), repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.06) 6px, rgba(255,255,255,0.06) 12px)',
      },
    },
    {
      id: 'gold',
      title: 'Golden',
      subtitle: 'Dust',
      category: 'simple',
      particleType: 'dust',
      cardStyle: {
        background: 'radial-gradient(circle at 60% 40%, #4D2605 0%, #1A0B02 100%)',
      },
      hasGoldDots: true,
    },
    {
      id: 'rain',
      title: 'Rain',
      subtitle: 'Solitude',
      category: 'simple',
      particleType: 'rain',
      cardStyle: {
        background:
          'linear-gradient(180deg, #062835 0%, #03141B 100%), repeating-linear-gradient(105deg, transparent, transparent 7px, rgba(56,189,248,0.12) 7px, rgba(56,189,248,0.12) 9px)',
      },
    },
    {
      id: 'desert',
      title: 'Desert',
      subtitle: 'Mirage',
      category: 'simple',
      particleType: 'glow',
      cardStyle: {
        background: 'radial-gradient(circle at 50% 50%, #3B234A 0%, #140C1A 85%)',
      },
    },
    {
      id: 'sapphire',
      title: 'Sapphire',
      subtitle: 'Oceanic',
      category: 'simple',
      particleType: 'glow',
      cardStyle: {
        background: 'linear-gradient(135deg, #061E3E 0%, #020B16 100%)',
      },
    },
    {
      id: 'ruby',
      title: 'Ruby',
      subtitle: 'Dusk',
      category: 'simple',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #2E060E 0%, #140104 100%)',
      },
      hasGoldDots: true,
    },
    {
      id: 'amethyst',
      title: 'Amethyst',
      subtitle: 'Sky',
      category: 'simple',
      particleType: 'stars',
      cardStyle: {
        background: 'radial-gradient(circle at 50% 50%, #18062B 0%, #0A0214 100%)',
      },
      hasWhiteDots: true,
    },
    {
      id: 'forest',
      title: 'Ancient',
      subtitle: 'Forest',
      category: 'simple',
      particleType: 'rain',
      cardStyle: {
        background: 'linear-gradient(180deg, #032211 0%, #011209 100%)',
      },
    },
    {
      id: 'oled',
      title: 'Minimal',
      subtitle: 'Plain',
      category: 'simple',
      particleType: 'minimal',
      cardStyle: {
        background: '#121829',
      },
    },
    {
      id: 'aurora',
      title: 'Aurora',
      subtitle: 'Borealis',
      category: 'simple',
      particleType: 'glow',
      cardStyle: { background: 'linear-gradient(135deg, #0B1B3D 0%, #061325 100%)' },
    },
    {
      id: 'dusk',
      title: 'Violet',
      subtitle: 'Dusk',
      category: 'simple',
      particleType: 'stars',
      cardStyle: { background: 'linear-gradient(135deg, #2A1625 0%, #160B12 100%)' },
    },
    {
      id: 'dawn',
      title: 'Soft',
      subtitle: 'Dawn',
      category: 'simple',
      particleType: 'dust',
      cardStyle: { background: 'linear-gradient(135deg, #30303A 0%, #181B21 100%)' },
    },
    {
      id: 'nebula',
      title: 'Cosmic',
      subtitle: 'Nebula',
      category: 'simple',
      particleType: 'stars',
      cardStyle: { background: 'linear-gradient(135deg, #1A0B2E 0%, #0D0516 100%)' },
    },
    {
      id: 'abyss',
      title: 'Ocean',
      subtitle: 'Abyss',
      category: 'simple',
      particleType: 'dust',
      cardStyle: { background: 'linear-gradient(135deg, #040812 0%, #020409 100%)' },
    },
    {
      id: 'twilight',
      title: 'Blue',
      subtitle: 'Twilight',
      category: 'simple',
      particleType: 'minimal',
      cardStyle: { background: 'linear-gradient(135deg, #1E213A 0%, #0F111C 100%)' },
    },
    {
      id: 'crimson-sky',
      title: 'Crimson',
      subtitle: 'Sky',
      category: 'simple',
      particleType: 'dust',
      cardStyle: { background: 'linear-gradient(135deg, #3D1418 0%, #1F0A0C 100%)' },
    },
    {
      id: 'sandstorm',
      title: 'Desert',
      subtitle: 'Sandstorm',
      category: 'simple',
      particleType: 'dust',
      cardStyle: { background: 'linear-gradient(135deg, #3A2818 0%, #1D140C 100%)' },
    },
    {
      id: 'ocean-deep',
      title: 'Deep',
      subtitle: 'Blue Sea',
      category: 'simple',
      particleType: 'glow',
      cardStyle: { background: 'linear-gradient(135deg, #061A2B 0%, #030D15 100%)' },
    },
    {
      id: 'forest-mist',
      title: 'Forest',
      subtitle: 'Mist',
      category: 'simple',
      particleType: 'rain',
      cardStyle: { background: 'linear-gradient(135deg, #10241A 0%, #08120D 100%)' },
    },
    {
      id: 'golden-hour',
      title: 'Golden',
      subtitle: 'Hour',
      category: 'simple',
      particleType: 'glow',
      cardStyle: { background: 'linear-gradient(135deg, #3D2B14 0%, #1F150A 100%)' },
    },
    {
      id: 'moonlight',
      title: 'Moonlight',
      subtitle: 'Shadow',
      category: 'simple',
      particleType: 'stars',
      cardStyle: { background: 'linear-gradient(135deg, #121A2F 0%, #090D17 100%)' },
    },
    {
      id: 'starlight',
      title: 'Starlight',
      subtitle: 'Void',
      category: 'simple',
      particleType: 'stars',
      cardStyle: { background: 'linear-gradient(135deg, #0B0D17 0%, #05060B 100%)' },
    },

    // =========================================================================
    // PART 2: PICTURES (14 Scenic Image & Verse Art Presets)
    // =========================================================================
    {
      id: 'parchment',
      title: 'Parchment',
      subtitle: 'Classic',
      category: 'pictures',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #D7C8A9 0%, #BFA67D 100%)',
        backgroundImage: 'url(/backgrounds/parchment-1.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'dark-paper',
      title: 'Charcoal',
      subtitle: 'Paper',
      category: 'pictures',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #2c2c2e 0%, #121214 100%)',
        backgroundImage: 'url(/backgrounds/dark-paper-1.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'terracotta',
      title: 'Terracotta',
      subtitle: 'Plaster',
      category: 'pictures',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #B5654C 0%, #592D1F 100%)',
        backgroundImage: 'url(/backgrounds/terracotta-1.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'canyon',
      title: 'Desert Canyon',
      subtitle: 'Gorge',
      category: 'pictures',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #d97d4c 0%, #591a0c 100%)',
        backgroundImage: 'url(/backgrounds/canyon.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'city-gate',
      title: 'City Gate',
      subtitle: 'Ancient',
      category: 'pictures',
      particleType: 'stars',
      cardStyle: {
        background: 'linear-gradient(135deg, #263b52 0%, #08101a 100%)',
        backgroundImage: 'url(/backgrounds/city-gate.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'arch-garden',
      title: 'Arch Garden',
      subtitle: 'Islamic',
      category: 'pictures',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #385947 0%, #0d1a12 100%)',
        backgroundImage: 'url(/backgrounds/arch-garden.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'mountain-sunrise',
      title: 'Mountain',
      subtitle: 'Sunrise',
      category: 'pictures',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #c96452 0%, #331016 100%)',
        backgroundImage: 'url(/backgrounds/mountain-sunrise.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'village',
      title: 'Village',
      subtitle: 'Sunset',
      category: 'pictures',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #d99a77 0%, #663b26 100%)',
        backgroundImage: 'url(/backgrounds/village.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'olive-valley',
      title: 'Olive Valley',
      subtitle: 'River',
      category: 'pictures',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #4a6b51 0%, #141f16 100%)',
        backgroundImage: 'url(/backgrounds/olive-valley.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'oasis',
      title: 'Peaceful',
      subtitle: 'Oasis',
      category: 'pictures',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #336e6a 0%, #0d2422 100%)',
        backgroundImage: 'url(/backgrounds/oasis.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'persian-valley',
      title: 'Persian',
      subtitle: 'Valley',
      category: 'pictures',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #6d8c4c 0%, #1c2e11 100%)',
        backgroundImage: 'url(/backgrounds/persian-valley.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'calm-sea',
      title: 'Calm Sea',
      subtitle: 'Diorama',
      category: 'pictures',
      particleType: 'stars',
      cardStyle: {
        background: 'linear-gradient(135deg, #1a3c63 0%, #06101c 100%)',
        backgroundImage: 'url(/backgrounds/calm-sea.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'sea-frameless',
      title: 'Calm Sea',
      subtitle: 'Frameless',
      category: 'pictures',
      particleType: 'stars',
      cardStyle: {
        background: 'linear-gradient(135deg, #1a3c63 0%, #06101c 100%)',
        backgroundImage: 'url(/backgrounds/sea-frameless.jpg)',
        backgroundSize: 'cover',
      },
    },
    {
      id: 'api-image',
      title: 'API Image',
      subtitle: 'Verse Art',
      category: 'pictures',
      particleType: 'minimal',
      cardStyle: {
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      },
    },

    // =========================================================================
    // PART 3: INTERACTIVES (20 Living Nature Worlds • Zero Humans/Birds • Retention-Engineered)
    // =========================================================================
    {
      id: 'interactive-dawn-awakening',
      title: 'Dawn Awakening',
      subtitle: 'Sunrise Journey',
      category: 'interactives',
      particleType: 'glow',
      cardStyle: {
        background: 'linear-gradient(180deg, #1E1B4B 0%, #9A3412 55%, #F59E0B 100%)',
      },
      hasGoldDots: true,
      interactiveHook: 'Sun rises from starry darkness into full golden god-rays as the recitation finishes',
    },
    {
      id: 'interactive-celestial-aurora',
      title: 'Celestial Aurora',
      subtitle: 'Polar Curtains',
      category: 'interactives',
      particleType: 'stars',
      cardStyle: {
        background: 'linear-gradient(135deg, #020617 0%, #065F46 48%, #7E22CE 100%)',
      },
      hasWhiteDots: true,
      interactiveHook: 'Aurora ribbons unfurl from a single green arc into a full-sky violet & emerald crown',
    },
    {
      id: 'interactive-desert-miracle',
      title: 'Desert Miracle',
      subtitle: 'Rain to Bloom',
      category: 'interactives',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(160deg, #451A03 0%, #78350F 50%, #059669 100%)',
      },
      hasGoldDots: true,
      interactiveHook: 'Parched dunes receive rain mid-recitation and bloom into a glowing emerald garden at the end',
    },
    {
      id: 'interactive-storm-to-serenity',
      title: 'Storm to Serenity',
      subtitle: 'Ocean Peace',
      category: 'interactives',
      particleType: 'rain',
      cardStyle: {
        background: 'linear-gradient(180deg, #0F172A 0%, #1E3A8A 55%, #38BDF8 100%)',
      },
      hasWhiteDots: true,
      interactiveHook: 'Storm clouds and high waves gradually calm into a mirror-like moonlit ocean',
    },
    {
      id: 'interactive-luminous-woods',
      title: 'Luminous Woods',
      subtitle: 'Sacred Forest',
      category: 'interactives',
      particleType: 'glow',
      cardStyle: {
        background: 'radial-gradient(circle at 50% 60%, #0D9488 0%, #064E3B 50%, #022C22 100%)',
      },
      hasGoldDots: true,
      interactiveHook: 'Bioluminescent forest ferns and light spores progressively illuminate the dark woods',
    },
    {
      id: 'interactive-eclipse-crown',
      title: 'Eclipse Crown',
      subtitle: 'Cosmic Alignment',
      category: 'interactives',
      particleType: 'stars',
      cardStyle: {
        background: 'radial-gradient(circle at 50% 42%, #000000 18%, #F59E0B 34%, #090A10 75%)',
      },
      hasWhiteDots: true,
      interactiveHook: 'Lunar disc aligns to trigger the breathtaking diamond-ring flare at the recitation climax',
    },
    {
      id: 'interactive-sakura-breeze',
      title: 'Spring Breeze',
      subtitle: 'Blossom Valley',
      category: 'interactives',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #1E1B4B 0%, #831843 55%, #F472B6 100%)',
      },
      hasWhiteDots: true,
      interactiveHook: 'Branches bloom verse by verse, releasing a hypnotic vortex of swirling petals',
    },
    {
      id: 'interactive-cascading-light',
      title: 'Cascading Light',
      subtitle: 'Misty Waterfall',
      category: 'interactives',
      particleType: 'rain',
      cardStyle: {
        background: 'linear-gradient(180deg, #042F2E 0%, #0D9488 55%, #5EEAD4 100%)',
      },
      interactiveHook: 'Sunbeams pierce the waterfall mist to form a vivid glowing rainbow arc by the end',
    },
    {
      id: 'interactive-falling-stars',
      title: 'Falling Stars',
      subtitle: 'Meteor Oasis',
      category: 'interactives',
      particleType: 'stars',
      cardStyle: {
        background: 'linear-gradient(145deg, #020617 0%, #1E1B4B 50%, #4338CA 100%)',
      },
      hasWhiteDots: true,
      interactiveHook: 'Single shooting stars intensify into a grand celestial meteor shower reflected in the lagoon',
    },
    {
      id: 'interactive-crystal-cavern',
      title: 'Crystal Cavern',
      subtitle: 'Prismatic Geode',
      category: 'interactives',
      particleType: 'geometric',
      cardStyle: {
        background: 'linear-gradient(135deg, #090514 0%, #4C1D95 50%, #C084FC 100%)',
      },
      hasWhiteDots: true,
      interactiveHook: 'Crystals awaken one by one, linking prismatic light beams across the underground lake',
    },
    {
      id: 'interactive-autumn-stream',
      title: 'Autumn Stream',
      subtitle: 'Golden River',
      category: 'interactives',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(160deg, #270E05 0%, #9A3412 50%, #F59E0B 100%)',
      },
      hasGoldDots: true,
      interactiveHook: 'River water turns to liquid gold as drifting amber leaves ripple down the current',
    },
    {
      id: 'interactive-alpine-alpenglow',
      title: 'Silent Snowfall',
      subtitle: 'Alpine Alpenglow',
      category: 'interactives',
      particleType: 'minimal',
      cardStyle: {
        background: 'linear-gradient(180deg, #0F172A 0%, #4C1D95 55%, #F43F5E 100%)',
      },
      hasWhiteDots: true,
      interactiveHook: 'Snowy twilight peaks gradually catch a radiant rose-gold summit alpenglow',
    },
    {
      id: 'interactive-ocean-cathedral',
      title: 'Ocean Cathedral',
      subtitle: 'Sunlit Reef',
      category: 'interactives',
      particleType: 'glow',
      cardStyle: {
        background: 'linear-gradient(180deg, #22D3EE 0%, #0369A1 45%, #082F49 100%)',
      },
      interactiveHook: 'Underwater light shafts converge into a brilliant golden-cyan column from surface to floor',
    },
    {
      id: 'interactive-moonlit-lotus',
      title: 'Moonlit Pond',
      subtitle: 'Blooming Lotus',
      category: 'interactives',
      particleType: 'glow',
      cardStyle: {
        background: 'radial-gradient(circle at 50% 65%, #F59E0B 0%, #065F46 42%, #022C22 100%)',
      },
      hasGoldDots: true,
      interactiveHook: 'Closed water lily buds slowly unfold their petals to reveal a warm golden core',
    },
    {
      id: 'interactive-sacred-gorge',
      title: 'Sacred Gorge',
      subtitle: 'Canyon Sunbeams',
      category: 'interactives',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(135deg, #1A0802 0%, #7C2D12 52%, #FB923C 100%)',
      },
      hasGoldDots: true,
      interactiveHook: 'Volumetric sunbeams pivot across red canyon walls, igniting thousands of golden dust motes',
    },
    {
      id: 'interactive-primordial-earth',
      title: 'Primordial Earth',
      subtitle: 'Embers to Stars',
      category: 'interactives',
      particleType: 'dust',
      cardStyle: {
        background: 'linear-gradient(180deg, #020617 0%, #450A0A 55%, #EA580C 100%)',
      },
      hasGoldDots: true,
      interactiveHook: 'Fiery mountain embers ascend into the sky and transform into peaceful constellations',
    },
    {
      id: 'interactive-nordic-fjord',
      title: 'Misty Fjord',
      subtitle: 'Parting Veil',
      category: 'interactives',
      particleType: 'minimal',
      cardStyle: {
        background: 'linear-gradient(160deg, #042F2E 0%, #115E59 55%, #5EEAD4 100%)',
      },
      interactiveHook: 'Dense atmospheric fog layers part outward to reveal a hidden sunlit waterfall valley',
    },
    {
      id: 'interactive-rain-sanctuary',
      title: 'Rain on Glass',
      subtitle: 'Botanical Window',
      category: 'interactives',
      particleType: 'rain',
      cardStyle: {
        background: 'linear-gradient(135deg, #052E16 0%, #15803D 55%, #86EFAC 100%)',
      },
      hasGoldDots: true,
      interactiveHook: 'Refractive raindrops slide down the glass while warm golden sunlight bokeh blooms behind',
    },
    {
      id: 'interactive-pillars-of-creation',
      title: 'Cosmic Pillars',
      subtitle: 'Nebula Genesis',
      category: 'interactives',
      particleType: 'stars',
      cardStyle: {
        background: 'radial-gradient(circle at 50% 45%, #A855F7 0%, #1E1B4B 55%, #030712 100%)',
      },
      hasWhiteDots: true,
      interactiveHook: 'Continuous 3D starfield flight where brilliant star clusters ignite inside cosmic gas pillars',
    },
    {
      id: 'interactive-emerald-bamboo',
      title: 'Emerald Bamboo',
      subtitle: 'Swaying Grove',
      category: 'interactives',
      particleType: 'glow',
      cardStyle: {
        background: 'linear-gradient(180deg, #022C22 0%, #047857 60%, #34D399 100%)',
      },
      hasGoldDots: true,
      interactiveHook: 'Bamboo grove sways with touch wind physics while morning mist turns to golden light',
    },
  ];

  const filteredThemes = THEMES.filter((t) => t.category === themeCategory);
  const activeThemeObj = THEMES.find((t) => t.id === config.backgroundPreset);

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-3 transition-colors pb-16 sm:pb-20">
      {/* Main Studio Frame Mockup (Responsive to Light & Dark Mode) */}
      <VideoPreviewCanvas
        verses={verses}
        audioUrls={audioUrls}
        chapter={chapter}
        config={config}
        onChangeConfig={onChangeConfig}
        isModalOpen={isReciterModalOpen || isExportModalOpen || isProjectsModalOpen || !!pendingVideoInterval}
        topBar={
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/95 dark:bg-[#0E1626] border-b border-slate-200/90 dark:border-slate-800/80 transition-colors z-20">
            {/* Range of Ayahs Selector (Left) */}
            <button
              onClick={onOpenAyahSelection || onBackToReader}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 border border-slate-200/70 dark:border-slate-700/70 active:scale-95 transition-all text-left min-w-0 max-w-[calc(100%-80px)] shadow-2xs group"
              title={onOpenAyahSelection ? "Click to change selected verses" : "Click to change selected verses in Reader"}
            >
              <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform" />
              <div className="flex flex-col min-w-0 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {chapter?.name_simple || 'Surah'}
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono shrink-0 bg-emerald-500/10 dark:bg-emerald-400/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                    {startAyah === endAyah ? `Ayah ${startAyah}` : `Ayahs ${startAyah}–${endAyah}`}
                  </span>
                </div>
                <span className="text-[9.5px] sm:text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Tap to change selection
                </span>
              </div>
            </button>

            {/* Export Button (Right) */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white dark:text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Export video"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Export</span>
            </button>
          </div>
        }
        categoryTabs={
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            {/* TAB 1: BACKGROUND */}
            <button
              onClick={() => setActiveTab('background')}
              className={`flex flex-col items-center justify-center py-1 transition-all relative ${
                activeTab === 'background'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center mb-0.5">
                <Palette className={`w-4 h-4 ${activeTab === 'background' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                Background
              </span>
              {activeTab === 'background' && (
                <div className="h-[2.5px] bg-emerald-600 dark:bg-emerald-400 rounded-full w-full mt-1.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </button>

            {/* TAB 2: TYPOGRAPHY */}
            <button
              onClick={() => setActiveTab('typography')}
              className={`flex flex-col items-center justify-center py-1 transition-all relative ${
                activeTab === 'typography'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center mb-0.5">
                <Type className={`w-4 h-4 ${activeTab === 'typography' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                Typography
              </span>
              {activeTab === 'typography' && (
                <div className="h-[2.5px] bg-emerald-600 dark:bg-emerald-400 rounded-full w-full mt-1.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </button>

            {/* TAB 3: COLOR */}
            <button
              onClick={() => setActiveTab('color')}
              className={`flex flex-col items-center justify-center py-1 transition-all relative ${
                activeTab === 'color'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center mb-0.5">
                <CircleDot className={`w-4 h-4 ${activeTab === 'color' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                Color
              </span>
              {activeTab === 'color' && (
                <div className="h-[2.5px] bg-emerald-600 dark:bg-emerald-400 rounded-full w-full mt-1.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </button>

            {/* TAB 4: MORE */}
            <button
              onClick={() => setActiveTab('more')}
              className={`flex flex-col items-center justify-center py-1 transition-all relative ${
                activeTab === 'more'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center mb-0.5">
                <Settings className={`w-4 h-4 ${activeTab === 'more' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                More
              </span>
              {activeTab === 'more' && (
                <div className="h-[2.5px] bg-emerald-600 dark:bg-emerald-400 rounded-full w-full mt-1.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </button>
          </div>
        }
      >

        {/* TAB 1: BACKGROUND */}
        {activeTab === 'background' && (
          <div className="space-y-2 animate-in fade-in duration-150">
            {/* Header: Theme Presets label + Media & Save Style buttons */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                Theme Presets
              </span>
              <div className="flex items-center gap-1.5">
                {/* Media Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    config.customMediaUrl
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Upload custom background image or video"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{config.customMediaUrl ? 'Media Active' : 'Media'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Save Style Button */}
                <button
                  type="button"
                  onClick={handleSaveStyle}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    justSaved
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  }`}
                  title="Save current font sizes, colors, and parameters as default for future videos"
                >
                  {justSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Save Style</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 3-Part Theme Presets Selector: Simple | Pictures | Interactives */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#08101E] border border-slate-200/80 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setThemeCategory('simple')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  themeCategory === 'simple'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/70 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5 shrink-0" />
                <span>Simple</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeCategory('pictures')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  themeCategory === 'pictures'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/70 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Pictures</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeCategory('interactives')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  themeCategory === 'interactives'
                    ? 'bg-emerald-500 text-white dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5 shrink-0" />
                <span>Interactives</span>
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono ${
                    themeCategory === 'interactives'
                      ? 'bg-black/20 text-white dark:text-slate-950'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  20
                </span>
              </button>
            </div>

            {/* Retention / Interactive Story Hook Banner when viewing Interactives */}
            {themeCategory === 'interactives' && (
              <div className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-[10.5px] text-emerald-800 dark:text-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-pulse" />
                <span className="truncate font-medium">
                  {activeThemeObj?.category === 'interactives' && activeThemeObj.interactiveHook
                    ? activeThemeObj.interactiveHook
                    : 'Pure nature scenes that evolve until the final ayah to keep viewers watching. Touch preview to interact!'}
                </span>
              </div>
            )}

            {/* Custom Media active banner -> Replaced with "Your Background" section */}
            {config.customMediaUrl && (
              <div className="mb-4">
                <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide block mb-2">
                  Your Background
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2 sm:gap-2.5">
                  <div
                    onClick={config.customMediaType === 'video' ? handleOpenEditVideoInterval : undefined}
                    className={`relative flex flex-col justify-end p-2.5 rounded-2xl h-[78px] text-left transition-all overflow-hidden border-2 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/25 dark:ring-emerald-400/25 shadow-[0_0_12px_rgba(16,185,129,0.25)] ${
                      config.customMediaType === 'video' ? 'cursor-pointer' : ''
                    }`}
                  >
                    {/* The Media Preview */}
                    {config.customMediaType === 'video' ? (
                      <video
                        src={config.customMediaUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        muted
                        playsInline
                        loop
                        autoPlay
                        onLoadedMetadata={(e) => {
                          const start = Math.max(0, config.customVideoStartTime ?? 0);
                          if (start > 0) {
                            try {
                              e.currentTarget.currentTime = start;
                            } catch {}
                          }
                        }}
                        onTimeUpdate={(e) => {
                          const vid = e.currentTarget;
                          const start = Math.max(0, config.customVideoStartTime ?? 0);
                          const end =
                            typeof config.customVideoEndTime === 'number' &&
                            config.customVideoEndTime > start
                              ? config.customVideoEndTime
                              : null;
                          if (end != null && (vid.currentTime >= end || vid.currentTime < start - 0.1)) {
                            vid.currentTime = start;
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${config.customMediaUrl})` }}
                      />
                    )}
                    
                    {/* Dark Overlay so text is readable */}
                    <div className="absolute inset-0 bg-black/35" />

                    {/* Edit Interval Button top left for videos */}
                    {config.customMediaType === 'video' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditVideoInterval();
                        }}
                        className="absolute top-1.5 left-1.5 px-1.5 h-6 rounded-full bg-slate-900/80 hover:bg-emerald-600 text-white flex items-center gap-1 text-[10px] font-bold shadow-md backdrop-blur-sm transition-all active:scale-95 z-10 border border-white/15"
                        title="Change Video Interval"
                      >
                        <Scissors className="w-3 h-3" />
                        <span>Trim</span>
                      </button>
                    )}

                    {/* Delete Button top right */}
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        onChangeConfig({
                          customMediaUrl: null,
                          customMediaType: null,
                          customVideoStartTime: null,
                          customVideoEndTime: null,
                          backgroundPreset: config.backgroundPreset || 'midnight',
                        });
                        try {
                          await clearCustomMedia();
                        } catch {}
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500/90 text-white flex items-center justify-center hover:bg-rose-600 shadow-md backdrop-blur-sm transition-transform active:scale-95 z-10"
                      title="Delete Background"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Title & Selected Interval Bottom Left */}
                    <div className="relative z-10 flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-white drop-shadow-md truncate">
                        Uploaded {config.customMediaType === 'video' ? 'Video' : 'Image'}
                      </span>
                      {config.customMediaType === 'video' &&
                        typeof config.customVideoStartTime === 'number' &&
                        typeof config.customVideoEndTime === 'number' && (
                          <span className="text-[9.5px] font-mono font-semibold text-emerald-300 drop-shadow truncate">
                            {formatIntervalTime(config.customVideoStartTime)}–{formatIntervalTime(config.customVideoEndTime)}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Smoothly Scrollable Theme Grid for Active Part (Simple / Pictures / Interactives) */}
            <div className="max-h-[164px] sm:max-h-[220px] overflow-y-auto scroll-smooth pr-0.5 custom-scrollbar">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2 sm:gap-2.5">
                {filteredThemes.map((th, index) => {
                  const isSelected = !config.customMediaUrl && config.backgroundPreset === th.id;
                  return (
                    <button
                      key={`${th.id}-${index}`}
                      onClick={() =>
                        onChangeConfig({
                          backgroundPreset: th.id,
                          particleType: th.particleType,
                          enableParticles: true,
                          overlayOpacity: 0.48, // Reset vignette
                        })
                      }
                      title={th.interactiveHook || `${th.title} (${th.subtitle})`}
                      className={`relative flex flex-col justify-end p-2.5 rounded-2xl h-[78px] text-left transition-all overflow-hidden border cursor-pointer ${
                        isSelected
                          ? 'border-2 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/25 dark:ring-emerald-400/25 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          : 'border-slate-200 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                      style={th.cardStyle}
                    >
                      {/* Interactive Live Nature Badge */}
                      {th.category === 'interactives' && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/45 backdrop-blur-xs border border-white/15 text-[8.5px] font-bold text-emerald-300 flex items-center gap-1 z-10">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>LIVE</span>
                        </span>
                      )}

                      {/* Decorative star specks for Midnight / Galaxy */}
                      {th.hasWhiteDots && (
                        <div className="absolute inset-0 pointer-events-none">
                          <span className="absolute top-3 left-4 w-1 h-1 rounded-full bg-white/70" />
                          <span className="absolute top-2.5 right-6 w-0.5 h-0.5 rounded-full bg-white/60" />
                          <span className="absolute bottom-5 right-3 w-0.5 h-0.5 rounded-full bg-white/50" />
                        </div>
                      )}

                      {/* Decorative gold specks for Golden */}
                      {th.hasGoldDots && (
                        <div className="absolute inset-0 pointer-events-none">
                          <span className="absolute top-4 left-5 w-1 h-1 rounded-full bg-amber-400/80" />
                          <span className="absolute top-3 right-4 w-0.5 h-0.5 rounded-full bg-amber-300/60" />
                        </div>
                      )}

                      {/* Selected green circle with checkmark badge on top right */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 dark:bg-emerald-400 text-white dark:text-slate-950 flex items-center justify-center font-bold shadow-sm z-10">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Labels with drop shadow for guaranteed readability */}
                      <span className="text-xs font-bold text-white leading-tight z-10 truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {th.title}
                      </span>
                      <span className="text-[10px] text-slate-200 dark:text-slate-300 z-10 leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {th.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Atmosphere & Particles Sub-Card */}
            <div className="rounded-2xl bg-slate-50 dark:bg-[#08101E] border border-slate-200/90 dark:border-slate-800/80 p-2.5 space-y-2 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Atmosphere &amp; Particles
                  </span>
                </div>
                {/* Interactive ON / OFF Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    const isCurrentlyActive =
                      config.enableParticles !== false && config.particleType !== 'none';
                    if (isCurrentlyActive) {
                      onChangeConfig({ enableParticles: false, particleType: 'none' });
                    } else {
                      onChangeConfig({ enableParticles: true, particleType: 'stars' });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                    config.enableParticles !== false && config.particleType !== 'none'
                      ? 'bg-emerald-500/15 border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                      : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                  title={
                    config.enableParticles !== false && config.particleType !== 'none'
                      ? 'Click to turn off particles'
                      : 'Click to turn on particles'
                  }
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      config.enableParticles !== false && config.particleType !== 'none'
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>
                    {config.enableParticles !== false && config.particleType !== 'none'
                      ? 'Active'
                      : 'Off'}
                  </span>
                </button>
              </div>

              {/* Pills row with hidden scrollbar and wheel support */}
              <div
                className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                {(['none', 'stars', 'geometric', 'dust', 'rain', 'glow', 'minimal'] as const).map(
                  (pType) => {
                    const isParticlesOff =
                      config.enableParticles === false || config.particleType === 'none';
                    const activeType = isParticlesOff ? 'none' : config.particleType || 'stars';
                    const isSelected = activeType === pType;
                    return (
                      <button
                        key={pType}
                        onClick={() => {
                          if (pType === 'none') {
                            onChangeConfig({ enableParticles: false, particleType: 'none' });
                          } else {
                            onChangeConfig({ enableParticles: true, particleType: pType });
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 capitalize border cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-2xs'
                        }`}
                      >
                        {pType === 'none' ? '🚫 Off' : pType}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TYPOGRAPHY */}
        {activeTab === 'typography' && (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            {/* Translation & Subtitles with 1st/2nd Order and Cadre Selection */}
            <div className="space-y-2 rounded-2xl bg-slate-50 dark:bg-[#08101E] border border-slate-200/90 dark:border-slate-800/80 p-2.5 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                  Translation &amp; Subtitles
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextShow = !config.showTranslation && !config.showPersianTafsir;
                    onChangeConfig({
                      showTranslation: nextShow,
                      showPersianTafsir: nextShow ? config.showPersianTafsir : false,
                    });
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                    config.showTranslation || config.showPersianTafsir
                      ? 'bg-emerald-500/15 border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {config.showTranslation || config.showPersianTafsir ? 'Active' : 'Off'}
                </button>
              </div>

              {/* Order 1: First Subtitle under Arabic */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>1st Order (Directly under Verses)</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Top</span>
                </label>
                <select
                  value={
                    !config.showTranslation && !config.showPersianTafsir
                      ? 'none'
                      : config.persianTafsirPosition === 'above' && config.showPersianTafsir
                      ? config.persianTafsirEdition
                      : config.showTranslation
                      ? 'translation-main'
                      : config.showPersianTafsir
                      ? config.persianTafsirEdition
                      : 'none'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'none') {
                      onChangeConfig({ showTranslation: false, showPersianTafsir: false });
                    } else if (val === 'translation-main') {
                      onChangeConfig({
                        showTranslation: true,
                        persianTafsirPosition: 'under',
                      });
                    } else if (val === 'persian-mokhtasar' || val === 'fr-tafsir-as-saadi') {
                      onChangeConfig({
                        showPersianTafsir: true,
                        persianTafsirEdition: val,
                        persianTafsirPosition: 'above',
                      });
                    }
                  }}
                  className="w-full text-xs font-semibold rounded-xl bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="translation-main">Translation (English - Saheeh Int.)</option>
                  <option value="persian-mokhtasar">Persian (Tafsir-e-Mokhtasar)</option>
                  <option value="fr-tafsir-as-saadi">French (Tafsir As-Sa&apos;di)</option>
                  <option value="none">None (Hidden)</option>
                </select>
              </div>

              {/* Order 2: Second Subtitle under First */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>2nd Order (Below 1st Translation)</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Bottom</span>
                </label>
                <select
                  value={
                    config.persianTafsirPosition === 'above'
                      ? config.showTranslation
                        ? 'translation-main'
                        : 'none'
                      : config.showPersianTafsir
                      ? config.persianTafsirEdition
                      : 'none'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'none') {
                      if (config.persianTafsirPosition === 'above') {
                        onChangeConfig({ showTranslation: false });
                      } else {
                        onChangeConfig({ showPersianTafsir: false });
                      }
                    } else if (val === 'translation-main') {
                      onChangeConfig({
                        showTranslation: true,
                        persianTafsirPosition: 'above',
                      });
                    } else if (val === 'persian-mokhtasar' || val === 'fr-tafsir-as-saadi') {
                      onChangeConfig({
                        showPersianTafsir: true,
                        persianTafsirEdition: val,
                        persianTafsirPosition: 'under',
                      });
                    }
                  }}
                  className="w-full text-xs font-semibold rounded-xl bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="none">None (Single Subtitle)</option>
                  <option value="persian-mokhtasar">Persian (Tafsir-e-Mokhtasar)</option>
                  <option value="fr-tafsir-as-saadi">French (Tafsir As-Sa&apos;di)</option>
                  <option value="translation-main">Translation (English - Saheeh Int.)</option>
                </select>
              </div>

              {/* Text Card Background Style selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Text Card Background
                </span>
                <select
                  value={config.cardBackgroundPreset || 'glass'}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChangeConfig({ 
                      cardBackgroundPreset: v,
                      overlayOpacity: 0.48
                    });
                  }}
                  className="text-[11px] font-semibold rounded-lg bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <optgroup label="Basic Transparency">
                    <option value="none">None (Transparent)</option>
                    <option value="light-glass">Light Glass</option>
                    <option value="glass">Glass Card (Default)</option>
                    <option value="heavy-glass">Heavy Glass</option>
                    <option value="solid">Dark Card</option>
                    <option value="pitch-black">Pitch Black</option>
                  </optgroup>
                  <optgroup label="Simple Themes">
                    {THEMES.filter((t) => t.category === 'simple').map((th) => (
                      <option key={`card-${th.id}`} value={th.id}>
                        {th.title} ({th.subtitle})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Picture Themes">
                    {THEMES.filter((t) => t.category === 'pictures').map((th) => (
                      <option key={`card-${th.id}`} value={th.id}>
                        {th.title} ({th.subtitle})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Interactive Themes">
                    {THEMES.filter((t) => t.category === 'interactives').map((th) => (
                      <option key={`card-${th.id}`} value={th.id}>
                        {th.title} ({th.subtitle})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Video Background Effect selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Video Background Effect
                </span>
                <select
                  value={config.videoFilter || 'none'}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChangeConfig({ 
                      videoFilter: v,
                    });
                  }}
                  className="text-[11px] font-semibold rounded-lg bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="none">None (Original)</option>
                  <option value="grayscale(100%)">Grayscale</option>
                  <option value="sepia(80%)">Sepia (Vintage)</option>
                  <option value="sepia(30%) saturate(140%) hue-rotate(-10deg)">Warm</option>
                  <option value="saturate(120%) hue-rotate(180deg)">Cool</option>
                  <option value="brightness(80%) sepia(30%) hue-rotate(180deg) saturate(200%)">Blue (Twilight)</option>
                  <option value="contrast(120%) saturate(110%) brightness(90%)">Cinematic</option>
                  <option value="contrast(150%)">High Contrast</option>
                </select>
              </div>
            </div>

            {/* Arabic Script & Font Family Selectors */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Quran Script
                </label>
                <select
                  value={config.arabicScriptType || 'text_uthmani'}
                  onChange={(e) => onChangeConfig({ arabicScriptType: e.target.value as any })}
                  className="w-full text-[11px] font-semibold rounded-xl bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="text_uthmani">Uthmani (Fahd)</option>
                  <option value="text_uthmani_simple">Uthmani Simple</option>
                  <option value="text_uthmani_tajweed">Uthmani Tajweed (No Colors)</option>
                  <option value="text_indopak">IndoPak</option>
                  <option value="text_imlaei">Imlaei (Standard)</option>
                  <option value="text_imlaei_simple">Imlaei Simple</option>
                </select>
                {config.arabicScriptType === 'text_uthmani_tajweed' && (
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1 leading-tight">
                    *Tajweed colors require HTML/CSS which isn&apos;t supported by the canvas video exporter. Text will render in plain color.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Text Font
                </label>
                <select
                  value={config.arabicFontFamily || 'Amiri'}
                  onChange={(e) => onChangeConfig({ arabicFontFamily: e.target.value as any })}
                  className="w-full text-[11px] font-semibold rounded-xl bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="Amiri">Amiri (Classic)</option>
                  <option value="Amiri Quran">Amiri Quran</option>
                  <option value="Scheherazade New">Scheherazade</option>
                  <option value="Lateef">Lateef</option>
                  <option value="Harmattan">Harmattan</option>
                  <option value="Aref Ruqaa">Aref Ruqaa</option>
                </select>
              </div>
            </div>

            {/* Arabic Font Size Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Arabic Calligraphy Size</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">{config.arabicFontSize}px</span>
              </div>
              <input
                type="range"
                min={22}
                max={100}
                value={config.arabicFontSize}
                onChange={(e) => onChangeConfig({ arabicFontSize: Number(e.target.value) })}
                className="w-full accent-emerald-500 dark:accent-emerald-400 bg-slate-200 dark:bg-slate-800 h-1 rounded-lg cursor-pointer"
              />
            </div>

            {/* Translation Size Slider (Controls Both Translation Languages) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Translation Subtitle Size</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">{config.translationFontSize}px</span>
              </div>
              <input
                type="range"
                min={12}
                max={34}
                value={config.translationFontSize}
                onChange={(e) => {
                  const size = Number(e.target.value);
                  onChangeConfig({
                    translationFontSize: size,
                    persianFontSize: size,
                  });
                }}
                className="w-full accent-emerald-500 dark:accent-emerald-400 bg-slate-200 dark:bg-slate-800 h-1 rounded-lg cursor-pointer"
              />
            </div>

            {/* Ayah End Marker Toggle */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-700 dark:text-slate-300">
              <span>Ayah Marker Symbol (۝)</span>
              <button
                onClick={() => onChangeConfig({ showAyahNumber: !config.showAyahNumber })}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  config.showAyahNumber !== false
                    ? 'bg-emerald-500/15 border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {config.showAyahNumber !== false ? 'Shown (۝)' : 'Hidden'}
              </button>
            </div>

            {/* Text Glow Effect Toggle */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-700 dark:text-slate-300">
              <span>Text Glow (Shiny Effect)</span>
              <button
                onClick={() => onChangeConfig({ glowEffect: !config.glowEffect })}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  config.glowEffect
                    ? 'bg-emerald-500/15 border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {config.glowEffect ? 'Active ✨' : 'Off'}
              </button>
            </div>

            {/* Text Motion (Floating) Toggle */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-700 dark:text-slate-300">
              <span>Text Motion (Floating)</span>
              <button
                onClick={() => onChangeConfig({ textMotion: !config.textMotion })}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  config.textMotion
                    ? 'bg-emerald-500/15 border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {config.textMotion ? 'Active 🌊' : 'Off'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: COLOR */}
        {activeTab === 'color' && (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            {/* Target selector */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setColorTarget('arabic')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  colorTarget === 'arabic'
                    ? 'bg-emerald-500/20 border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Arabic Text
              </button>
              <button
                onClick={() => setColorTarget('translation')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  colorTarget === 'translation'
                    ? 'bg-emerald-500/20 border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Translation
              </button>
              <button
                onClick={() => setColorTarget('accent')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  colorTarget === 'accent'
                    ? 'bg-emerald-500/20 border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Accents
              </button>
            </div>

            {/* Swatches Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {PRESET_COLORS.map((c) => {
                const currentVal =
                  colorTarget === 'arabic'
                    ? config.arabicTextColor
                    : colorTarget === 'translation'
                    ? config.translationTextColor
                    : config.badgeTextColor;
                const isSelected = currentVal?.toLowerCase() === c.value.toLowerCase();

                return (
                  <button
                    key={c.value}
                    onClick={() => {
                      if (colorTarget === 'arabic') onChangeConfig({ arabicTextColor: c.value });
                      else if (colorTarget === 'translation') onChangeConfig({ translationTextColor: c.value });
                      else onChangeConfig({ badgeTextColor: c.value, surahTitleColor: c.value, progressBarColor: c.value });
                    }}
                    className={`flex flex-col items-center p-1.5 rounded-xl border min-w-[50px] text-center transition-all shrink-0 ${
                      isSelected
                        ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 ring-1 ring-emerald-500/50'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-lg mb-1 border border-slate-300 dark:border-white/20 shadow-2xs flex items-center justify-center"
                      style={{ backgroundColor: c.value }}
                    >
                      {isSelected && (
                        <Check
                          className={`w-3 h-3 stroke-[3] ${
                            c.value === '#FFFFFF' || c.value === '#FEF08A' || c.value === '#FCD34D'
                              ? 'text-slate-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </div>
                    <span className="text-[9px] text-slate-600 dark:text-slate-300 truncate max-w-[45px]">{c.name.split(' ')[0]}</span>
                  </button>
                );
              })}

              {/* Native color picker */}
              <label className="relative flex flex-col items-center p-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-[50px] shrink-0">
                <div className="w-6 h-6 rounded-lg mb-1 border border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  <Palette className="w-3 h-3" />
                </div>
                <span className="text-[9px] text-slate-600 dark:text-slate-300">Custom</span>
                <input
                  type="color"
                  value={
                    colorTarget === 'arabic'
                      ? config.arabicTextColor
                      : colorTarget === 'translation'
                      ? config.translationTextColor
                      : config.badgeTextColor
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (colorTarget === 'arabic') onChangeConfig({ arabicTextColor: v });
                    else if (colorTarget === 'translation') onChangeConfig({ translationTextColor: v });
                    else onChangeConfig({ badgeTextColor: v, surahTitleColor: v, progressBarColor: v });
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>
        )}

        {/* TAB 4: MORE */}
        {activeTab === 'more' && (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            {/* Reciter quick info */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Voice Reciter:</span>
              <button
                onClick={() => setIsReciterModalOpen(true)}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
              >
                Change Reciter →
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{currentReciter.name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{currentReciter.style || 'Murattal'}</span>
                </div>
              </div>
              <button
                onClick={handlePreDownloadAudio}
                disabled={isDownloadingAudio || isAudioCached}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  isAudioCached
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 cursor-default'
                    : isDownloadingAudio
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400 animate-pulse'
                    : 'bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                }`}
                title={
                  isAudioCached
                    ? 'Recitation audio is cached for offline playback'
                    : 'Pre-download recitation audio for offline playback'
                }
              >
                {isDownloadingAudio ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isAudioCached ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Voice Ready</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Cache Voice</span>
                  </>
                )}
              </button>
            </div>

            {/* Aspect Ratio Framing */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Aspect Ratio:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onChangeConfig({ aspectRatio: '9:16' })}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    config.aspectRatio === '9:16'
                      ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mx-auto mb-0.5" />
                  <span className="text-[10px] font-bold block">9:16 Reel</span>
                </button>
                <button
                  onClick={() => onChangeConfig({ aspectRatio: '1:1' })}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    config.aspectRatio === '1:1'
                      ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Square className="w-4 h-4 mx-auto mb-0.5" />
                  <span className="text-[10px] font-bold block">1:1 Square</span>
                </button>
                <button
                  onClick={() => onChangeConfig({ aspectRatio: '16:9' })}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    config.aspectRatio === '16:9'
                      ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Monitor className="w-4 h-4 mx-auto mb-0.5" />
                  <span className="text-[10px] font-bold block">16:9 Wide</span>
                </button>
              </div>
            </div>

            {/* Video & Voice Speed Selector in a Single Row */}
            <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                <span className="hidden sm:inline">Video &amp; Voice </span>Speed:
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => {
                  const isSelected = (config.playbackSpeed || 1.0) === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChangeConfig({ playbackSpeed: s })}
                      className={`py-1 px-2 rounded-lg text-center transition-all text-xs font-semibold border ${
                        isSelected
                          ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                          : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Projects & Reset Defaults */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsProjectsModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                title="Projects & Drafts"
              >
                <FolderKanban className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Projects</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title="Reset all parameters to default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>
        )}
      </VideoPreviewCanvas>

      {/* Video Export Modal */}
      <VideoExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        verses={verses}
        allChapterVerses={allChapterVerses}
        audioUrls={audioUrls}
        chapterAudioMap={chapterAudioMap}
        chapter={chapter}
        config={config}
        reciter={currentReciter}
        selectedTranslationId={selectedTranslationId}
        onViewInCreations={onViewInCreations}
        onExportComplete={onExportComplete}
      />

      {/* Reciter Modal */}
      <ReciterModal
        isOpen={isReciterModalOpen}
        onClose={() => setIsReciterModalOpen(false)}
        selectedReciterId={currentReciter.id}
        onSelectReciter={onSelectReciter}
        currentChapter={chapter}
      />

      {/* Video Interval Picker Modal */}
      {pendingVideoInterval && (
        <VideoIntervalModal
          key={pendingVideoInterval.objectUrl}
          isOpen={true}
          videoUrl={pendingVideoInterval.objectUrl}
          fileName={pendingVideoInterval.fileName}
          initialStartTime={pendingVideoInterval.initialStartTime}
          initialEndTime={pendingVideoInterval.initialEndTime}
          onConfirm={handleConfirmVideoInterval}
          onCancel={handleCancelVideoInterval}
        />
      )}

      {/* Projects & Drafts Modal */}
      {onLoadProject && onResetNewProject && (
        <ProjectsModal
          isOpen={isProjectsModalOpen}
          onClose={() => setIsProjectsModalOpen(false)}
          chapter={chapter}
          selectedVerseKeys={Array.from(selectedVerseKeys)}
          currentReciter={currentReciter}
          selectedTranslationId={selectedTranslationId}
          videoConfig={config}
          onLoadProject={onLoadProject}
          onResetNewProject={onResetNewProject}
        />
      )}
    </div>
  );
};
