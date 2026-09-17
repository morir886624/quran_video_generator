'use client';

import React, { useState, useRef } from 'react';
import { Chapter, Reciter, Verse, VideoConfig, BackgroundPresetId } from '@/types/quran';
import { VideoPreviewCanvas } from './VideoPreviewCanvas';
import { VideoExportModal } from './VideoExportModal';
import { ReciterModal } from './ReciterModal';
import { ProjectsModal } from './ProjectsModal';
import { ProjectDraft } from '@/lib/storage-db';
import { useBackButton } from '@/lib/back-button';
import { BACKGROUND_PRESETS, POPULAR_RECITERS, DEFAULT_VIDEO_CONFIG } from '@/lib/constants';
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
  Sun,
  Moon,
} from 'lucide-react';

interface VideoStudioProps {
  chapter: Chapter | null;
  verses: Verse[];
  audioUrls: string[];
  config: VideoConfig;
  onChangeConfig: (updates: Partial<VideoConfig>) => void;
  currentReciter: Reciter;
  onSelectReciter: (reciter: Reciter) => void;
  onBackToReader: () => void;
  selectedVerseKeys?: Set<string>;
  selectedTranslationId?: number;
  onLoadProject?: (project: ProjectDraft) => void;
  onResetNewProject?: () => void;
  onViewInCreations?: () => void;
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
  audioUrls,
  config,
  onChangeConfig,
  currentReciter,
  onSelectReciter,
  onBackToReader,
  selectedVerseKeys = new Set(),
  selectedTranslationId = 20,
  onLoadProject,
  onResetNewProject,
  onViewInCreations,
  theme,
  onToggleTheme,
}) => {
  // Main Tabs matching mockup: 'background' | 'typography' | 'color' | 'more'
  const [activeTab, setActiveTab] = useState<'background' | 'typography' | 'color' | 'more'>('background');

  // Sub-sections
  const [colorTarget, setColorTarget] = useState<'arabic' | 'translation' | 'accent'>('arabic');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReciterModalOpen, setIsReciterModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Wire hardware back button for modals
  useBackButton(isExportModalOpen, () => setIsExportModalOpen(false), 25);
  useBackButton(isReciterModalOpen, () => setIsReciterModalOpen(false), 25);
  useBackButton(isProjectsModalOpen, () => setIsProjectsModalOpen(false), 25);

  const startAyah = verses[0]?.verse_number || 1;
  const endAyah = verses[verses.length - 1]?.verse_number || 1;

  // Local fallback theme toggle if not passed from parent
  const handleThemeToggle = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        try { localStorage.setItem('quran_theme', 'light'); } catch {}
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        try { localStorage.setItem('quran_theme', 'dark'); } catch {}
      }
    }
  };

  // Reset adjustments to defaults
  const handleResetDefaults = () => {
    onChangeConfig({
      arabicFontSize: DEFAULT_VIDEO_CONFIG.arabicFontSize,
      translationFontSize: DEFAULT_VIDEO_CONFIG.translationFontSize,
      arabicTextColor: DEFAULT_VIDEO_CONFIG.arabicTextColor,
      translationTextColor: DEFAULT_VIDEO_CONFIG.translationTextColor,
      badgeTextColor: DEFAULT_VIDEO_CONFIG.badgeTextColor,
      surahTitleColor: DEFAULT_VIDEO_CONFIG.surahTitleColor,
      progressBarColor: DEFAULT_VIDEO_CONFIG.progressBarColor,
      backgroundPreset: 'midnight',
      customMediaUrl: null,
      customMediaType: null,
    });
  };

  // Custom background file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) return;

    const objectUrl = URL.createObjectURL(file);
    onChangeConfig({
      customMediaUrl: objectUrl,
      customMediaType: isVideo ? 'video' : 'image',
    });
  };

  // Six visual themes matching screenshot
  const THEMES: {
    id: BackgroundPresetId;
    title: string;
    subtitle: string;
    particleType: 'stars' | 'geometric' | 'dust' | 'rain' | 'glow' | 'minimal';
    cardStyle: React.CSSProperties;
    hasWhiteDots?: boolean;
    hasGoldDots?: boolean;
  }[] = [
    {
      id: 'midnight',
      title: 'Midnight',
      subtitle: 'Stars',
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
      particleType: 'dust',
      cardStyle: {
        background: 'radial-gradient(circle at 60% 40%, #4D2605 0%, #1A0B02 100%)',
      },
      hasGoldDots: true,
    },
    {
      id: 'rain',
      title: 'Rain',
      subtitle: 'Rain',
      particleType: 'rain',
      cardStyle: {
        background:
          'linear-gradient(180deg, #062835 0%, #03141B 100%), repeating-linear-gradient(105deg, transparent, transparent 7px, rgba(56,189,248,0.12) 7px, rgba(56,189,248,0.12) 9px)',
      },
    },
    {
      id: 'desert',
      title: 'Glow',
      subtitle: 'Ambient',
      particleType: 'glow',
      cardStyle: {
        background: 'radial-gradient(circle at 50% 50%, #3B234A 0%, #140C1A 85%)',
      },
    },
    {
      id: 'oled',
      title: 'Minimal',
      subtitle: 'Plain',
      particleType: 'minimal',
      cardStyle: {
        background: '#121829',
      },
    },
    {
      id: 'midnight',
      title: 'Galaxy',
      subtitle: 'Nebula',
      particleType: 'stars',
      cardStyle: {
        background: 'radial-gradient(circle at 50% 50%, #1E1B4B 0%, #0B0F19 100%)',
      },
      hasWhiteDots: true,
    },
    {
      id: 'desert',
      title: 'Sunset',
      subtitle: 'Warm Dusk',
      particleType: 'glow',
      cardStyle: {
        background: 'linear-gradient(135deg, #4A1D2F 0%, #1A0B16 100%)',
      },
    },
    {
      id: 'rain',
      title: 'Deep Ocean',
      subtitle: 'Aquatic',
      particleType: 'rain',
      cardStyle: {
        background: 'linear-gradient(180deg, #042533 0%, #02111A 100%)',
      },
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 pb-24 transition-colors">
      {/* Main Studio Frame Mockup (Responsive to Light & Dark Mode) */}
      <VideoPreviewCanvas
        verses={verses}
        audioUrls={audioUrls}
        chapter={chapter}
        config={config}
        topBar={
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white/95 dark:bg-[#0E1626] border-b border-slate-200/90 dark:border-slate-800/80 transition-colors z-20">
            {/* Verses Selector */}
            <button
              onClick={onBackToReader}
              className="flex items-center gap-1.5 min-w-0 hover:opacity-85 active:scale-95 transition-all text-left"
              title="Change selected verses"
            >
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shrink-0 shadow-2xs border border-slate-200/60 dark:border-slate-700/60 transition-colors">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Ayahs</span>
              </div>

              <div className="flex items-baseline gap-1 min-w-0 truncate pl-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {chapter?.name_simple || 'Surah'}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-semibold shrink-0">
                  ({startAyah === endAyah ? `Ayah ${startAyah}` : `Ayahs ${startAyah}–${endAyah}`})
                </span>
              </div>
            </button>

            {/* Export Button */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white dark:text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        }
      >
        {/* Top 4 Segmented Category Tabs Bar */}
        <div className="grid grid-cols-4 gap-1 pb-1">
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

        {/* TAB 1: BACKGROUND */}
        {activeTab === 'background' && (
          <div className="space-y-2 animate-in fade-in duration-150">
            {/* Theme label */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                Theme
              </span>
            </div>

            {/* Smoothly Scrollable Theme Grid with hidden scrollbar icons */}
            <div className="max-h-[164px] overflow-y-auto no-scrollbar scroll-smooth pr-0.5">
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((th, index) => {
                  const isSelected = config.backgroundPreset === th.id && !config.customMediaUrl;
                  return (
                    <button
                      key={`${th.id}-${index}`}
                      onClick={() =>
                        onChangeConfig({
                          backgroundPreset: th.id,
                          customMediaUrl: null,
                          customMediaType: null,
                        })
                      }
                      className={`relative flex flex-col justify-end p-2.5 rounded-2xl h-[78px] text-left transition-all overflow-hidden border ${
                        isSelected
                          ? 'border-2 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/25 dark:ring-emerald-400/25 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          : 'border-slate-200 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                      style={th.cardStyle}
                    >
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
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 dark:bg-emerald-400 text-white dark:text-slate-950 flex items-center justify-center font-bold shadow-sm">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Labels with drop shadow for guaranteed readability */}
                      <span className="text-xs font-bold text-white leading-tight z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        {th.title}
                      </span>
                      <span className="text-[10px] text-slate-300 dark:text-slate-400 z-10 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
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
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
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
                    const activePreset = BACKGROUND_PRESETS.find((x) => x.id === config.backgroundPreset);
                    const isSelected = activePreset?.particleType === pType || (pType === 'none' && !activePreset);
                    return (
                      <button
                        key={pType}
                        onClick={() => {
                          if (pType === 'none') {
                            const p = BACKGROUND_PRESETS.find((x) => x.id === config.backgroundPreset);
                            if (p) p.particleType = 'minimal';
                          } else {
                            const p = BACKGROUND_PRESETS.find((x) => x.id === config.backgroundPreset);
                            if (p) p.particleType = pType;
                          }
                          onChangeConfig({});
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 capitalize border ${
                          isSelected
                            ? 'border-emerald-500 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-500/15'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-2xs'
                        }`}
                      >
                        {pType}
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
                  <option value="fr-tafsir-as-saadi">French (Tafsir As-Sa'di)</option>
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
                  <option value="fr-tafsir-as-saadi">French (Tafsir As-Sa'di)</option>
                  <option value="translation-main">Translation (English - Saheeh Int.)</option>
                </select>
              </div>

              {/* Backdrop Cadre (Card) Style selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Backdrop Cadre (Card)
                </span>
                <select
                  value={
                    config.overlayOpacity === 0
                      ? 'none'
                      : config.overlayOpacity === 0.75
                      ? 'solid'
                      : 'glass'
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    onChangeConfig({
                      overlayOpacity: v === 'none' ? 0 : v === 'solid' ? 0.75 : 0.48,
                    });
                  }}
                  className="text-[11px] font-semibold rounded-lg bg-white dark:bg-[#0B1325] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="glass">Glass Card (Default)</option>
                  <option value="solid">Dark Card</option>
                  <option value="none">None (Transparent)</option>
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
                max={52}
                value={config.arabicFontSize}
                onChange={(e) => onChangeConfig({ arabicFontSize: Number(e.target.value) })}
                className="w-full accent-emerald-500 dark:accent-emerald-400 bg-slate-200 dark:bg-slate-800 h-1 rounded-lg cursor-pointer"
              />
            </div>

            {/* Translation Size Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Translation Subtitle Size</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">{config.translationFontSize}px</span>
              </div>
              <input
                type="range"
                min={12}
                max={26}
                value={config.translationFontSize}
                onChange={(e) => onChangeConfig({ translationFontSize: Number(e.target.value) })}
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
              <label className="flex flex-col items-center p-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-[50px] shrink-0">
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
                  className="sr-only"
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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

            {/* Custom media file, Projects, Theme or Reset */}
            <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Media</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => setIsProjectsModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                  title="Projects & Drafts"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Projects</span>
                </button>

                <button
                  onClick={handleThemeToggle}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                  title="Toggle Light / Dark Theme"
                >
                  <Sun className="w-3.5 h-3.5 hidden dark:block text-amber-400" />
                  <Moon className="w-3.5 h-3.5 block dark:hidden text-slate-700" />
                </button>
              </div>

              <button
                onClick={handleResetDefaults}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
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
        audioUrls={audioUrls}
        chapter={chapter}
        config={config}
        reciter={currentReciter}
        selectedTranslationId={selectedTranslationId}
        onViewInCreations={onViewInCreations}
      />

      {/* Reciter Modal */}
      <ReciterModal
        isOpen={isReciterModalOpen}
        onClose={() => setIsReciterModalOpen(false)}
        selectedReciterId={currentReciter.id}
        onSelectReciter={onSelectReciter}
      />

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
