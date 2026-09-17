'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Moon,
  Sun,
  HardDrive,
  Trash2,
  Smartphone,
  Info,
  Radio,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Mic2,
  Languages,
  Type,
  Palette,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Check,
  BookOpen,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import {
  getStorageUsageSummary,
  clearAllExportedVideos,
  formatBytes,
} from '@/lib/storage-db';
import {
  UserPreferences,
  POPULAR_TRANSLATIONS,
  PRESET_TEXT_COLORS,
  PRESET_ACCENT_COLORS,
  FONT_SIZE_PRESETS,
} from '@/lib/preferences';
import { POPULAR_RECITERS, getReciterPreviewUrl } from '@/lib/constants';
import { Reciter } from '@/types/quran';

interface SettingsViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onGoToStudio?: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
  onResetPreferences: () => void;
  currentReciter: Reciter;
  onSelectReciter: (reciter: Reciter) => void;
  selectedTranslationId: number;
  selectedTranslationName: string;
  onSelectTranslation: (id: number, name: string) => void;
  onOpenRecitersModal: () => void;
  onOpenTranslationModal: () => void;
  onReplayOnboarding?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  preferences,
  onUpdatePreferences,
  onResetPreferences,
  currentReciter,
  onSelectReciter,
  selectedTranslationId,
  selectedTranslationName,
  onSelectTranslation,
  onOpenRecitersModal,
  onOpenTranslationModal,
  onReplayOnboarding,
}) => {
  // Navigation sub-tab
  const [activeTab, setActiveTab] = useState<'preferences' | 'system'>('preferences');

  // Storage management states
  const [storageUsage, setStorageUsage] = useState({ videoCount: 0, totalSizeBytes: 0 });
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Audio preview for reciter
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const loadStorage = async () => {
    setIsLoadingStorage(true);
    try {
      const summary = await getStorageUsageSummary();
      setStorageUsage(summary);
    } catch {
      // ignore
    } finally {
      setIsLoadingStorage(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getStorageUsageSummary()
      .then((summary) => {
        if (isMounted) {
          setStorageUsage(summary);
          setIsLoadingStorage(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoadingStorage(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Cleanup audio preview on unmount or when reciter changes
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
      }
    };
  }, [previewAudio]);

  const handleToggleReciterPreview = (reciter: Reciter) => {
    if (isPlayingPreview && previewAudio) {
      previewAudio.pause();
      setIsPlayingPreview(false);
      return;
    }

    if (previewAudio) {
      previewAudio.pause();
    }

    const url = getReciterPreviewUrl(reciter);
    const audio = new Audio(url);
    audio.onended = () => setIsPlayingPreview(false);
    audio.onerror = () => setIsPlayingPreview(false);

    audio
      .play()
      .then(() => {
        setPreviewAudio(audio);
        setIsPlayingPreview(true);
      })
      .catch(() => {
        setIsPlayingPreview(false);
      });
  };

  const handleClearVideos = async () => {
    try {
      await clearAllExportedVideos();
      setIsClearConfirmOpen(false);
      showToast('All exported videos cleared successfully.');
      await loadStorage();
    } catch {
      showToast('Failed to clear video storage.');
    }
  };

  const handleResetDefaults = () => {
    onResetPreferences();
    showToast('Preferences restored to default settings.');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 py-5 pb-32 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-5 p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/20">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            App Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure reciter preferences, typography, colors, and system storage.
          </p>
        </div>
      </div>

      {/* Sub-Tabs: Preferences vs System & Storage */}
      <div className="flex items-center gap-2 p-1.5 mb-5 bg-slate-200/70 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800/80">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'preferences'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'system'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>System &amp; Storage</span>
        </button>
      </div>

      {feedbackMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 1. PREFERENCES TAB                                                    */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'preferences' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* A. Reciter Preference Card */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-emerald-500" />
                <span>Default Reciter</span>
              </h2>
              <button
                onClick={onOpenRecitersModal}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Browse All Reciters</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Current Selected Reciter Badge & Audio Preview */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  {currentReciter.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {currentReciter.name}
                    </span>
                    {currentReciter.style && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        {currentReciter.style}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentReciter.description || 'Verified authentic recitation from Quran.com'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleToggleReciterPreview(currentReciter)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isPlayingPreview
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={isPlayingPreview ? 'Pause sample' : 'Listen to sample recitation'}
                >
                  {isPlayingPreview ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Sample</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Listen Preview</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Popular Reciters Quick Chips */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Beloved Reciters Quick-Select:
              </span>
              <div className="flex flex-wrap gap-2">
                {POPULAR_RECITERS.slice(0, 8).map((rec) => {
                  const isSelected = rec.id === currentReciter.id;
                  return (
                    <button
                      key={rec.id}
                      onClick={() => {
                        onSelectReciter(rec);
                        onUpdatePreferences({ reciterId: rec.id });
                        if (isPlayingPreview && previewAudio) {
                          previewAudio.pause();
                          setIsPlayingPreview(false);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/30'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{rec.name}</span>
                      {rec.style && (
                        <span className={`text-[10px] opacity-75 ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                          ({rec.style})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* B. Primary Page Translation Card */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Languages className="w-4 h-4 text-emerald-500" />
                <span>Primary Page Translation</span>
              </h2>
              <button
                onClick={onOpenTranslationModal}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Browse All Translations</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Active Translation Info Box */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                    Selected
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedTranslationName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Synchronized with the primary Reader view and default video generator subtitles.
                </p>
              </div>

              <button
                onClick={onOpenTranslationModal}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                Change Translation
              </button>
            </div>

            {/* Popular Translations Quick Select */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Top Translations Quick-Select:
              </span>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TRANSLATIONS.map((trans) => {
                  const isSelected = trans.id === selectedTranslationId;
                  return (
                    <button
                      key={trans.id}
                      onClick={() => {
                        onSelectTranslation(trans.id, trans.name);
                        onUpdatePreferences({
                          translationId: trans.id,
                          translationName: trans.name,
                        });
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/30'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{trans.name}</span>
                      <span className={`text-[10px] uppercase font-mono ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                        {trans.language}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* C. Typography & Text Sizing Card */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Type className="w-4 h-4 text-emerald-500" />
              <span>Typography &amp; Font Sizing</span>
            </h2>

            {/* Arabic Font Family */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Arabic Calligraphy Font
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['Amiri Quran', 'Scheherazade New', 'Amiri'] as const).map((font) => {
                  const isSelected = preferences.arabicFontFamily === font;
                  return (
                    <button
                      key={font}
                      onClick={() => onUpdatePreferences({ arabicFontFamily: font })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/40'
                          : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{font}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      </div>
                      <div
                        className={`text-lg text-right mt-1 font-semibold ${
                          font === 'Scheherazade New'
                            ? 'font-scheherazade'
                            : font === 'Amiri'
                            ? 'font-serif'
                            : 'font-quran'
                        }`}
                      >
                        بِسْمِ اللَّهِ
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sizing Presets */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Quick Sizing Presets:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {preferences.arabicFontSize}px Arabic / {preferences.translationFontSize}px Translation
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FONT_SIZE_PRESETS.map((preset) => {
                  const isMatch =
                    preferences.arabicFontSize === preset.arabic &&
                    preferences.translationFontSize === preset.translation;
                  return (
                    <button
                      key={preset.label}
                      onClick={() =>
                        onUpdatePreferences({
                          arabicFontSize: preset.arabic,
                          translationFontSize: preset.translation,
                        })
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        isMatch
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Arabic Font Size Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Arabic Verse Text Size</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {preferences.arabicFontSize} px
                </span>
              </div>
              <input
                type="range"
                min={24}
                max={52}
                step={2}
                value={preferences.arabicFontSize}
                onChange={(e) =>
                  onUpdatePreferences({ arabicFontSize: Number(e.target.value) })
                }
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>24px (Small)</span>
                <span>34px (Default)</span>
                <span>52px (Jumbo)</span>
              </div>
            </div>

            {/* Translation Font Size Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Translation Subtitle Text Size</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {preferences.translationFontSize} px
                </span>
              </div>
              <input
                type="range"
                min={12}
                max={24}
                step={1}
                value={preferences.translationFontSize}
                onChange={(e) =>
                  onUpdatePreferences({ translationFontSize: Number(e.target.value) })
                }
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>12px (Compact)</span>
                <span>16px (Default)</span>
                <span>24px (Large)</span>
              </div>
            </div>
          </section>

          {/* D. Colors & Aesthetics Card */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-500" />
                <span>Text &amp; Accent Colors</span>
              </h2>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Custom Colors
                </span>
                <input
                  type="checkbox"
                  checked={preferences.useCustomColors}
                  onChange={(e) =>
                    onUpdatePreferences({ useCustomColors: e.target.checked })
                  }
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </label>
            </div>

            {!preferences.useCustomColors ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Currently using <strong>Theme Defaults</strong> (Pure slate on light background, crisp ivory on dark background). Toggle <em>Custom Colors</em> above to pick specific calligraphy and subtitle colors.
              </div>
            ) : (
              <div className="space-y-4 pt-1 animate-in fade-in">
                {/* Arabic Text Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Arabic Calligraphy Color</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-400 shadow-sm"
                        style={{ backgroundColor: preferences.arabicTextColor }}
                      />
                      <span>{preferences.arabicTextColor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_TEXT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => onUpdatePreferences({ arabicTextColor: c.value })}
                        title={c.name}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                          preferences.arabicTextColor.toLowerCase() === c.value.toLowerCase()
                            ? 'border-emerald-500 scale-110 ring-2 ring-emerald-500/40 shadow'
                            : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {preferences.arabicTextColor.toLowerCase() === c.value.toLowerCase() && (
                          <Check className={`w-3.5 h-3.5 ${c.value === '#FFFFFF' || c.value === '#FEF08A' ? 'text-slate-900' : 'text-white'}`} />
                        )}
                      </button>
                    ))}
                    <label className="w-7 h-7 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-emerald-500" title="Custom Color">
                      <Palette className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="color"
                        value={preferences.arabicTextColor}
                        onChange={(e) => onUpdatePreferences({ arabicTextColor: e.target.value })}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                {/* Translation Text Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Translation Subtitle Color</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-400 shadow-sm"
                        style={{ backgroundColor: preferences.translationTextColor }}
                      />
                      <span>{preferences.translationTextColor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_TEXT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => onUpdatePreferences({ translationTextColor: c.value })}
                        title={c.name}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                          preferences.translationTextColor.toLowerCase() === c.value.toLowerCase()
                            ? 'border-emerald-500 scale-110 ring-2 ring-emerald-500/40 shadow'
                            : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {preferences.translationTextColor.toLowerCase() === c.value.toLowerCase() && (
                          <Check className={`w-3.5 h-3.5 ${c.value === '#FFFFFF' || c.value === '#FEF08A' ? 'text-slate-900' : 'text-white'}`} />
                        )}
                      </button>
                    ))}
                    <label className="w-7 h-7 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-emerald-500" title="Custom Color">
                      <Palette className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="color"
                        value={preferences.translationTextColor}
                        onChange={(e) => onUpdatePreferences({ translationTextColor: e.target.value })}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Ayah End Symbol & Accent Color */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Ayah Symbol &amp; Accent Highlights</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-400 shadow-sm"
                    style={{ backgroundColor: preferences.accentColor }}
                  />
                  <span>{preferences.accentColor}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_ACCENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onUpdatePreferences({ accentColor: c.value })}
                    title={c.name}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                      preferences.accentColor.toLowerCase() === c.value.toLowerCase()
                        ? 'border-emerald-500 scale-110 ring-2 ring-emerald-500/40 shadow'
                        : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {preferences.accentColor.toLowerCase() === c.value.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                  </button>
                ))}
                <label className="w-7 h-7 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-emerald-500" title="Custom Accent">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="color"
                    value={preferences.accentColor}
                    onChange={(e) => onUpdatePreferences({ accentColor: e.target.value })}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* E. Interactive Live Ayah Preview Card */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-500" />
                <span>Live Ayah Preview</span>
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                Al-Fatihah 1:1–1:2
              </span>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-inner space-y-4">
              {/* Sample Verse 1:1 */}
              <div>
                <div
                  className={`text-right font-semibold leading-[2.2] sm:leading-[2.4] select-text transition-all ${
                    preferences.arabicFontFamily === 'Scheherazade New'
                      ? 'font-scheherazade'
                      : preferences.arabicFontFamily === 'Amiri'
                      ? 'font-serif'
                      : 'font-quran'
                  }`}
                  style={{
                    fontSize: `${preferences.arabicFontSize}px`,
                    color: preferences.useCustomColors ? preferences.arabicTextColor : undefined,
                  }}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  {preferences.showAyahNumber && (
                    <span
                      className="inline-block font-bold mx-2"
                      style={{
                        color: preferences.accentColor,
                        fontSize: `${Math.max(16, Math.round(preferences.arabicFontSize * 0.65))}px`,
                      }}
                    >
                      ۝1
                    </span>
                  )}
                </div>

                <div
                  className="text-left leading-relaxed font-normal select-text transition-all mt-1"
                  style={{
                    fontSize: `${preferences.translationFontSize}px`,
                    color: preferences.useCustomColors ? preferences.translationTextColor : undefined,
                  }}
                >
                  In the name of Allah, the Entirely Merciful, the Especially Merciful.
                </div>
              </div>

              {/* Sample Verse 1:2 */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/60">
                <div
                  className={`text-right font-semibold leading-[2.2] sm:leading-[2.4] select-text transition-all ${
                    preferences.arabicFontFamily === 'Scheherazade New'
                      ? 'font-scheherazade'
                      : preferences.arabicFontFamily === 'Amiri'
                      ? 'font-serif'
                      : 'font-quran'
                  }`}
                  style={{
                    fontSize: `${preferences.arabicFontSize}px`,
                    color: preferences.useCustomColors ? preferences.arabicTextColor : undefined,
                  }}
                >
                  الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ
                  {preferences.showAyahNumber && (
                    <span
                      className="inline-block font-bold mx-2"
                      style={{
                        color: preferences.accentColor,
                        fontSize: `${Math.max(16, Math.round(preferences.arabicFontSize * 0.65))}px`,
                      }}
                    >
                      ۝2
                    </span>
                  )}
                </div>

                <div
                  className="text-left leading-relaxed font-normal select-text transition-all mt-1"
                  style={{
                    fontSize: `${preferences.translationFontSize}px`,
                    color: preferences.useCustomColors ? preferences.translationTextColor : undefined,
                  }}
                >
                  [All] praise is [due] to Allah, Lord of the worlds — ({selectedTranslationName})
                </div>
              </div>
            </div>
          </section>

          {/* F. Reading Experience Options */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Reading Experience &amp; Display</span>
            </h2>

            <div className="space-y-2">
              {/* Word-by-Word Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Show Word-by-Word Breakdown
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Display individual word phonetics and word translation blocks.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.showWordByWord}
                  onChange={(e) =>
                    onUpdatePreferences({ showWordByWord: e.target.checked })
                  }
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Show Ayah Symbol */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Show Ayah Number Symbol (۝)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Ornamental circle marker ending each Quranic Ayah with its verse number.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.showAyahNumber}
                  onChange={(e) =>
                    onUpdatePreferences({ showAyahNumber: e.target.checked })
                  }
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </section>

          {/* Reset Preferences Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-3xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Preferences are automatically preserved in your device storage.
            </span>
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. SYSTEM & STORAGE TAB                                               */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'system' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Appearance Section */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-emerald-500" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span>Appearance &amp; Theme</span>
            </h2>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Display Theme
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Currently using {theme === 'dark' ? 'Dark Navy (OLED Friendly)' : 'Light Slate'}
                </p>
              </div>

              <button
                onClick={onToggleTheme}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Switch to Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Switch to Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Storage & Data Management Section */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-500" />
              <span>Storage &amp; Data Cache</span>
            </h2>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Creations Library Storage
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isLoadingStorage ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Calculating space...
                      </span>
                    ) : (
                      <span>
                        {storageUsage.videoCount} {storageUsage.videoCount === 1 ? 'video' : 'videos'} saved locally •{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {formatBytes(storageUsage.totalSizeBytes)}
                        </strong>{' '}
                        used
                      </span>
                    )}
                  </p>
                </div>

                {storageUsage.videoCount > 0 && (
                  <button
                    onClick={() => setIsClearConfirmOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Videos</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                Videos you create are stored inside high-capacity IndexedDB on your device so you can preview, share, and export them offline anytime without downloading again.
              </p>
            </div>
          </section>

          {/* Audio & Streaming Section */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500" />
              <span>Audio &amp; Quran Content</span>
            </h2>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>Quran.com Audio Engine</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                    v4 REST API
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Seamless recitations are streamed and stitched on-the-fly directly from verified Quran.com CDNs and EveryAyah mirrors, ensuring high-fidelity, distortion-free audio.
                </p>
              </div>
            </div>
          </section>

          {/* Mobile Platforms Ready */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span>Mobile Platform &amp; Video Specs</span>
            </h2>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed text-[11px] text-slate-500 dark:text-slate-400">
                Powered by <strong>Capacitor</strong> for Android and iOS. Video exports in 9:16 vertical ratio are calibrated for YouTube Shorts, Instagram Reels, TikTok, and WhatsApp status with high bitrates.
              </p>
            </div>
          </section>

          {/* About & Privacy */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-500" />
              <span>About &amp; Privacy</span>
            </h2>

            <div className="space-y-3 text-xs">
              {onReplayOnboarding && (
                <button
                  onClick={onReplayOnboarding}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/90 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        Starter Walkthrough &amp; Tour
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Revisit the intro guide &amp; 9:16 studio tips
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              )}

              {/* Quran.com Attribution Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-500/25 space-y-1 text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Quran Data &amp; Attribution</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded font-bold">
                    Powered by Quran.com API
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  This application is an independent video creation studio built using the verified <strong>Quran.com Public REST API v4</strong> for authentic Mushaf calligraphy, ayah audio, translations, and tafsir.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Privacy Policy
                </span>
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                >
                  <span>Read Policy</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/90">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Application Version
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  1.0.0 (Capacitor Mobile Edition)
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center pt-2">
                Built with respect for the Holy Quran • Quran Video Studio
              </p>
            </div>
          </section>
        </div>
      )}

      {/* Confirmation Modal to Clear All Videos */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Clear All Exported Videos?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This will delete all {storageUsage.videoCount} videos from your app storage and free up {formatBytes(storageUsage.totalSizeBytes)}. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleClearVideos}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
