'use client';

import React from 'react';
import { VideoConfig } from '@/types/quran';
import { Sparkles, Eye, Check } from 'lucide-react';

interface TypographyCustomizerProps {
  config: VideoConfig;
  onChangeConfig: (updates: Partial<VideoConfig>) => void;
}

export const TypographyCustomizer: React.FC<TypographyCustomizerProps> = ({
  config,
  onChangeConfig,
}) => {
  const fontFamilies: Array<VideoConfig['arabicFontFamily']> = [
    'Amiri Quran',
    'Scheherazade New',
    'Amiri',
  ];

  return (
    <div className="space-y-5">
      {/* Arabic Font Family */}
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
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
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

      {/* Arabic Font Size */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
          <span>Arabic Calligraphy Size</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-mono">
            {config.arabicFontSize}px
          </span>
        </div>
        <input
          type="range"
          min="26"
          max="54"
          step="2"
          value={config.arabicFontSize}
          onChange={(e) =>
            onChangeConfig({ arabicFontSize: parseInt(e.target.value, 10) })
          }
          className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
        />
      </div>

      {/* Translation Subtitle Settings */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Show Translation Subtitle
            </span>
          </div>
          <button
            onClick={() =>
              onChangeConfig({ showTranslation: !config.showTranslation })
            }
            className={`w-11 h-6 rounded-full transition-colors relative ${
              config.showTranslation ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
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
              max="28"
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
        )}
      </div>

      {/* Visual Enhancements Toggles */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onChangeConfig({ glowEffect: !config.glowEffect })}
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all ${
            config.glowEffect
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            Calligraphy Glow
          </span>
          {config.glowEffect && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
        </button>

        <button
          onClick={() =>
            onChangeConfig({ showSurahBadge: !config.showSurahBadge })
          }
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all ${
            config.showSurahBadge
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span>Surah Badge</span>
          {config.showSurahBadge && (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
        </button>
      </div>
    </div>
  );
};

