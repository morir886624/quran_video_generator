'use client';

import React, { useState } from 'react';
import { VideoConfig } from '@/types/quran';
import {
  Sparkles,
  Eye,
  EyeOff,
  Check,
  Type,
  Languages,
  BadgeInfo,
  Sliders,
  Palette,
  Timer,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Layers,
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
          <span>Subtitles &amp; Tafsir</span>
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

      {/* 2. SUBTITLES & PERSIAN TAFSIR SECTION */}
      {activeSection === 'translation' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Info Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Languages className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Subtitles &amp; Persian Tafsir
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  تفسیر فارسی و ترجمه انگلیسی زیرنویس
                </p>
              </div>
            </div>

            <div className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              {config.showTranslation && config.showPersianTafsir
                ? config.persianTafsirPosition === 'above'
                  ? 'FA (Above) + EN'
                  : 'EN + FA (Under)'
                : config.showPersianTafsir
                ? 'Persian Only'
                : config.showTranslation
                ? 'English Only'
                : 'Subtitles Off'}
            </div>
          </div>

          {/* All Layout Possibilities - Button Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Layout Possibilities (چیدمان و موقعیت)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Persian UNDER English */}
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    showTranslation: true,
                    showPersianTafsir: true,
                    persianTafsirPosition: 'under',
                  })
                }
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  config.showTranslation &&
                  config.showPersianTafsir &&
                  config.persianTafsirPosition === 'under'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-bold">
                    <span className="text-slate-700 dark:text-slate-200 leading-tight">EN</span>
                    <span className="text-[8px] text-emerald-500 leading-none">↓</span>
                    <span className="text-amber-600 dark:text-amber-300 leading-tight">فا</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold">Persian Under English</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      English on top • Persian below (زیر انگلیسی)
                    </div>
                  </div>
                </div>
                {config.showTranslation &&
                  config.showPersianTafsir &&
                  config.persianTafsirPosition === 'under' && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  )}
              </button>

              {/* Option 2: Persian ABOVE English */}
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    showTranslation: true,
                    showPersianTafsir: true,
                    persianTafsirPosition: 'above',
                  })
                }
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  config.showTranslation &&
                  config.showPersianTafsir &&
                  config.persianTafsirPosition === 'above'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold">
                    <span className="text-amber-600 dark:text-amber-300 leading-tight">فا</span>
                    <span className="text-[8px] text-emerald-500 leading-none">↓</span>
                    <span className="text-slate-700 dark:text-slate-200 leading-tight">EN</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold">Persian Above English</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Persian on top • English below (بالای انگلیسی)
                    </div>
                  </div>
                </div>
                {config.showTranslation &&
                  config.showPersianTafsir &&
                  config.persianTafsirPosition === 'above' && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  )}
              </button>

              {/* Option 3: Persian Tafsir Only */}
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    showTranslation: false,
                    showPersianTafsir: true,
                  })
                }
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  !config.showTranslation && config.showPersianTafsir
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/30 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-600 dark:text-amber-300">
                    فا
                  </div>
                  <div>
                    <div className="text-xs font-bold">Persian Tafsir Only</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Only Persian commentary (فقط تفسیر فارسی)
                    </div>
                  </div>
                </div>
                {!config.showTranslation && config.showPersianTafsir && (
                  <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                )}
              </button>

              {/* Option 4: English Translation Only */}
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    showTranslation: true,
                    showPersianTafsir: false,
                  })
                }
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  config.showTranslation && !config.showPersianTafsir
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    EN
                  </div>
                  <div>
                    <div className="text-xs font-bold">English Only</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Only English translation (فقط ترجمه انگلیسی)
                    </div>
                  </div>
                </div>
                {config.showTranslation && !config.showPersianTafsir && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                )}
              </button>
            </div>

            {/* Option 5: Hide All Subtitles */}
            <button
              type="button"
              onClick={() =>
                onChangeConfig({
                  showTranslation: false,
                  showPersianTafsir: false,
                })
              }
              className={`mt-2.5 w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                !config.showTranslation && !config.showPersianTafsir
                  ? 'bg-slate-200 dark:bg-slate-800 border-slate-400 dark:border-slate-600 text-slate-900 dark:text-white'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide All Subtitles (Only Arabic Calligraphy)</span>
            </button>
          </div>

          {/* Quick Position Switcher (when both are active) */}
          {config.showTranslation && config.showPersianTafsir && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Persian Position Relative to English
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                  {config.persianTafsirPosition === 'under' ? '↓ Under English' : '↑ Above English'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeConfig({ persianTafsirPosition: 'under' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    config.persianTafsirPosition === 'under'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Persian Under (زیر)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeConfig({ persianTafsirPosition: 'above' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    config.persianTafsirPosition === 'above'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Persian Above (بالا)</span>
                </button>
              </div>
            </div>
          )}

          {/* Persian Tafsir Edition Selector */}
          {config.showPersianTafsir && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Persian Tafsir Edition (کتاب تفسیر فارسی)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig({ persianTafsirEdition: 'persian-mokhtasar' })
                  }
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.persianTafsirEdition === 'persian-mokhtasar'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/40'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>تفسیر المختصر</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Al-Mukhtasar (Concise • Best for video)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig({ persianTafsirEdition: 'fr-tafsir-as-saadi' })
                  }
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.persianTafsirEdition === 'fr-tafsir-as-saadi'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/40'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>تفسیر السعدی</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tafsir As-Saadi (Detailed commentary)
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Persian Tafsir Typography Controls */}
          {config.showPersianTafsir && (
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Persian Tafsir Typography
                </span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {config.persianFontSize || 17}px
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <span>Persian Font Size</span>
                  <span className="font-mono">{config.persianFontSize || 17}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="26"
                  step="1"
                  value={config.persianFontSize || 17}
                  onChange={(e) =>
                    onChangeConfig({
                      persianFontSize: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-amber-500 bg-amber-200/50 dark:bg-amber-900/40 h-2 rounded-lg cursor-pointer"
                />
              </div>

              <ColorRow
                label="Persian Tafsir Text Color"
                currentColor={config.persianTextColor || '#FDE68A'}
                onChange={(color) => onChangeConfig({ persianTextColor: color })}
              />
            </div>
          )}

          {/* English Translation Typography Controls */}
          {config.showTranslation && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  English Translation Typography
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {config.translationFontSize}px
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <span>Translation Font Size</span>
                  <span className="font-mono">{config.translationFontSize}px</span>
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

              <ColorRow
                label="English Translation Color"
                currentColor={config.translationTextColor || '#CBD5E1'}
                onChange={(color) =>
                  onChangeConfig({ translationTextColor: color })
                }
              />
            </div>
          )}

          {/* Live Mini Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center justify-between">
              <span>Live Stack Preview</span>
              <span className="text-emerald-400 font-mono">Real-time Layout</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center space-y-2">
              <div
                className="font-quran text-lg text-white"
                style={{ fontSize: `${Math.min(config.arabicFontSize * 0.6, 26)}px` }}
              >
                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
              </div>

              {(config.showTranslation || config.showPersianTafsir) && (
                <div className="w-12 h-px bg-slate-700/80 mx-auto my-1.5" />
              )}

              {/* Stacked Preview based on position */}
              {config.showTranslation && config.showPersianTafsir ? (
                config.persianTafsirPosition === 'above' ? (
                  <>
                    <div
                      className="font-persian leading-relaxed"
                      style={{
                        color: config.persianTextColor || '#FDE68A',
                        fontSize: `${Math.max((config.persianFontSize || 17) * 0.8, 12)}px`,
                      }}
                      dir="rtl"
                    >
                      قرائت قرآن با نام الله آغاز می‌شود تا از او تعالی یاری تقاضا گردد...
                    </div>
                    <div className="w-8 h-px bg-slate-800 mx-auto my-1" />
                    <div
                      className="leading-snug"
                      style={{
                        color: config.translationTextColor || '#CBD5E1',
                        fontSize: `${Math.max(config.translationFontSize * 0.75, 12)}px`,
                      }}
                    >
                      In the Name of Allah—the Most Compassionate, Most Merciful.
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="leading-snug"
                      style={{
                        color: config.translationTextColor || '#CBD5E1',
                        fontSize: `${Math.max(config.translationFontSize * 0.75, 12)}px`,
                      }}
                    >
                      In the Name of Allah—the Most Compassionate, Most Merciful.
                    </div>
                    <div className="w-8 h-px bg-slate-800 mx-auto my-1" />
                    <div
                      className="font-persian leading-relaxed"
                      style={{
                        color: config.persianTextColor || '#FDE68A',
                        fontSize: `${Math.max((config.persianFontSize || 17) * 0.8, 12)}px`,
                      }}
                      dir="rtl"
                    >
                      قرائت قرآن با نام الله آغاز می‌شود تا از او تعالی یاری تقاضا گردد...
                    </div>
                  </>
                )
              ) : config.showPersianTafsir ? (
                <div
                  className="font-persian leading-relaxed"
                  style={{
                    color: config.persianTextColor || '#FDE68A',
                    fontSize: `${Math.max((config.persianFontSize || 17) * 0.8, 12)}px`,
                  }}
                  dir="rtl"
                >
                  قرائت قرآن با نام الله آغاز می‌شود تا از او تعالی یاری تقاضا گردد...
                </div>
              ) : config.showTranslation ? (
                <div
                  className="leading-snug"
                  style={{
                    color: config.translationTextColor || '#CBD5E1',
                    fontSize: `${Math.max(config.translationFontSize * 0.75, 12)}px`,
                  }}
                >
                  In the Name of Allah—the Most Compassionate, Most Merciful.
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-1">
                  (Subtitles hidden • Only calligraphy is rendered)
                </div>
              )}
            </div>
          </div>
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
