'use client';

import React, { useState } from 'react';
import { VideoConfig } from '@/types/quran';
import {
  Sparkles,
  Eye,
  Check,
  Type,
  Languages,
  BadgeInfo,
  Sliders,
  Palette,
  Timer,
} from 'lucide-react';

interface TypographyCustomizerProps {
  config: VideoConfig;
  onChangeConfig: (updates: Partial<VideoConfig>) => void;
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

interface ColorRowProps {
  label: string;
  currentColor: string;
  onChange: (color: string) => void;
}

const ColorRow: React.FC<ColorRowProps> = ({ label, currentColor, onChange }) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>{label}</span>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
          <span
            className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm"
            style={{ backgroundColor: currentColor }}
          />
          <span className="uppercase">{currentColor.slice(0, 7)}</span>
        </div>
      </div>

      {/* Preset Swatches + Native Color Input */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESET_COLORS.map((c) => {
          const isSelected =
            currentColor.toLowerCase() === c.value.toLowerCase();
          return (
            <button
              key={c.value}
              onClick={() => onChange(c.value)}
              title={c.name}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                isSelected
                  ? 'border-emerald-500 scale-110 ring-2 ring-emerald-500/40 shadow-sm'
                  : 'border-slate-300 dark:border-slate-700/80 hover:scale-105'
              }`}
              style={{ backgroundColor: c.value }}
            >
              {isSelected && (
                <Check
                  className={`w-3.5 h-3.5 ${
                    c.value === '#FFFFFF' || c.value === '#FEF08A' || c.value === '#FCD34D'
                      ? 'text-slate-900'
                      : 'text-white'
                  }`}
                />
              )}
            </button>
          );
        })}

        {/* Custom Color Input */}
        <label
          className="relative w-7 h-7 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors"
          title="Custom Color"
        >
          <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <input
            type="color"
            value={currentColor.startsWith('#') ? currentColor : '#10B981'}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
};

export const TypographyCustomizer: React.FC<TypographyCustomizerProps> = ({
  config,
  onChangeConfig,
}) => {
  const [activeSection, setActiveSection] = useState<
    'arabic' | 'translation' | 'badge' | 'progress'
  >('arabic');

  const fontFamilies: Array<VideoConfig['arabicFontFamily']> = [
    'Amiri Quran',
    'Scheherazade New',
    'Amiri',
  ];

  return (
    <div className="space-y-5">
      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60">
        <button
          onClick={() => setActiveSection('arabic')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'arabic'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Type className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Arabic</span>
        </button>

        <button
          onClick={() => setActiveSection('translation')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'translation'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Languages className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Translation</span>
        </button>

        <button
          onClick={() => setActiveSection('badge')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'badge'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BadgeInfo className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Surah Title</span>
        </button>

        <button
          onClick={() => setActiveSection('progress')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'progress'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Timer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Bar &amp; Footer</span>
        </button>
      </div>

      {/* 1. ARABIC CALLIGRAPHY SECTION */}
      {activeSection === 'arabic' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Script Style */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Arabic Quran Script
            </label>
            <div className="grid grid-cols-3 gap-2">
              {fontFamilies.map((font) => {
                const isSelected = config.arabicFontFamily === font;
                return (
                  <button
                    key={font}
                    onClick={() => onChangeConfig({ arabicFontFamily: font })}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="font-quran text-lg text-emerald-950 dark:text-amber-200 mb-0.5">
                      بِسْمِ ٱللَّهِ
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {font}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Arabic Font Size Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              <span>Arabic Calligraphy Size</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                {config.arabicFontSize}px
              </span>
            </div>
            <input
              type="range"
              min="24"
              max="58"
              step="2"
              value={config.arabicFontSize}
              onChange={(e) =>
                onChangeConfig({ arabicFontSize: parseInt(e.target.value, 10) })
              }
              className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Arabic Text Color */}
          <ColorRow
            label="Arabic Text Color"
            currentColor={config.arabicTextColor || '#FFFFFF'}
            onChange={(color) => onChangeConfig({ arabicTextColor: color })}
          />

          {/* Glow & Ayah Number Toggles */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => onChangeConfig({ glowEffect: !config.glowEffect })}
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all ${
                config.glowEffect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                Calligraphy Glow
              </span>
              {config.glowEffect && (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>

            <button
              onClick={() =>
                onChangeConfig({ showAyahNumber: !config.showAyahNumber })
              }
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all ${
                config.showAyahNumber
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span>Ayah Glyph (۝)</span>
              {config.showAyahNumber && (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* 2. TRANSLATION SECTION */}
      {activeSection === 'translation' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Toggle Translation Visibility */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Show Translation Subtitle
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Render translated meaning beneath Arabic text
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                onChangeConfig({ showTranslation: !config.showTranslation })
              }
              className={`w-11 h-6 rounded-full transition-colors relative ${
                config.showTranslation
                  ? 'bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  config.showTranslation ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {config.showTranslation && (
            <>
              {/* Translation Font Size */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Translation Font Size</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {config.translationFontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="32"
                  step="1"
                  value={config.translationFontSize}
                  onChange={(e) =>
                    onChangeConfig({
                      translationFontSize: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Translation Color */}
              <ColorRow
                label="Translation Text Color"
                currentColor={config.translationTextColor || '#CBD5E1'}
                onChange={(color) =>
                  onChangeConfig({ translationTextColor: color })
                }
              />
            </>
          )}
        </div>
      )}

      {/* 3. SURAH TITLE & BADGE SECTION */}
      {activeSection === 'badge' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Show/Hide Surah Badge Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BadgeInfo className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Show Surah Header Badge
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Displays Surah Arabic name and Ayah reference pill
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                onChangeConfig({ showSurahBadge: !config.showSurahBadge })
              }
              className={`w-11 h-6 rounded-full transition-colors relative ${
                config.showSurahBadge
                  ? 'bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  config.showSurahBadge ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {config.showSurahBadge && (
            <>
              {/* Arabic Surah Title Size */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Surah Arabic Title Size</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {config.surahTitleFontSize || 32}px
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="46"
                  step="2"
                  value={config.surahTitleFontSize || 32}
                  onChange={(e) =>
                    onChangeConfig({
                      surahTitleFontSize: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Arabic Surah Title Color */}
              <ColorRow
                label="Surah Arabic Title Color"
                currentColor={
                  config.surahTitleColor || 'rgba(254, 240, 138, 0.9)'
                }
                onChange={(color) =>
                  onChangeConfig({ surahTitleColor: color })
                }
              />

              <div className="border-t border-slate-200 dark:border-slate-800 my-2" />

              {/* Badge English Text Size */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Badge Text Size</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {config.badgeFontSize || 24}px
                  </span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="32"
                  step="2"
                  value={config.badgeFontSize || 24}
                  onChange={(e) =>
                    onChangeConfig({
                      badgeFontSize: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Badge English Text Color */}
              <ColorRow
                label="Badge Text Color"
                currentColor={config.badgeTextColor || '#E2E8F0'}
                onChange={(color) => onChangeConfig({ badgeTextColor: color })}
              />
            </>
          )}
        </div>
      )}

      {/* 4. PROGRESS BAR & WATERMARK SECTION */}
      {activeSection === 'progress' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Progress Bar Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Show Video Progress Bar
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Full filling progress line at the bottom of the video
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                onChangeConfig({ showProgressBar: !config.showProgressBar })
              }
              className={`w-11 h-6 rounded-full transition-colors relative ${
                config.showProgressBar
                  ? 'bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  config.showProgressBar ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {config.showProgressBar && (
            <>
              {/* Progress Bar Scope (Continuous vs Looping) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Progress Bar Filling Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      onChangeConfig({ progressBarScope: 'overall' })
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      config.progressBarScope === 'overall' ||
                      !config.progressBarScope
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Full Video Duration</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Fills continuously across all ayahs
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      onChangeConfig({ progressBarScope: 'verse' })
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      config.progressBarScope === 'verse'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Per Verse</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Fills and resets for each ayah
                    </div>
                  </button>
                </div>
              </div>

              {/* Progress Bar Color */}
              <ColorRow
                label="Progress Bar Color"
                currentColor={config.progressBarColor || '#10B981'}
                onChange={(color) =>
                  onChangeConfig({ progressBarColor: color })
                }
              />
            </>
          )}

          <div className="border-t border-slate-200 dark:border-slate-800 my-2" />

          {/* Watermark Branding Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Show Branding Watermark
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Displays &quot;Quran.com Video Studio&quot; at the bottom
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                onChangeConfig({ showWatermark: !config.showWatermark })
              }
              className={`w-11 h-6 rounded-full transition-colors relative ${
                config.showWatermark
                  ? 'bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  config.showWatermark ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {config.showWatermark && (
            <>
              {/* Watermark Font Size */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Watermark Font Size</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {config.watermarkFontSize || 18}px
                  </span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="28"
                  step="1"
                  value={config.watermarkFontSize || 18}
                  onChange={(e) =>
                    onChangeConfig({
                      watermarkFontSize: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Watermark Color */}
              <ColorRow
                label="Watermark Color"
                currentColor={
                  config.watermarkColor || 'rgba(255, 255, 255, 0.4)'
                }
                onChange={(color) =>
                  onChangeConfig({ watermarkColor: color })
                }
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};
