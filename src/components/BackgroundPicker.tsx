'use client';

import React, { useRef } from 'react';
import { AspectRatio, BackgroundPresetId, VideoConfig } from '@/types/quran';
import { BACKGROUND_PRESETS } from '@/lib/constants';
import { Sparkles, Upload, Smartphone, Square, Monitor, Check } from 'lucide-react';

interface BackgroundPickerProps {
  config: VideoConfig;
  onChangeConfig: (updates: Partial<VideoConfig>) => void;
}

export const BackgroundPicker: React.FC<BackgroundPickerProps> = ({
  config,
  onChangeConfig,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert('Please upload a valid image or video file.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    onChangeConfig({
      customMediaUrl: objectUrl,
      customMediaType: isVideo ? 'video' : 'image',
    });
  };

  const clearCustomMedia = () => {
    onChangeConfig({
      customMediaUrl: null,
      customMediaType: null,
    });
  };

  return (
    <div className="space-y-5">
      {/* Aspect Ratio Switcher */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Video Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onChangeConfig({ aspectRatio: '9:16' })}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
              config.aspectRatio === '9:16'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-5 h-5 mb-1" />
            <span>9:16 Reel</span>
            <span className="text-[10px] text-slate-500">TikTok/Shorts</span>
          </button>

          <button
            onClick={() => onChangeConfig({ aspectRatio: '1:1' })}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
              config.aspectRatio === '1:1'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Square className="w-5 h-5 mb-1" />
            <span>1:1 Square</span>
            <span className="text-[10px] text-slate-500">Post</span>
          </button>

          <button
            onClick={() => onChangeConfig({ aspectRatio: '16:9' })}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
              config.aspectRatio === '16:9'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-5 h-5 mb-1" />
            <span>16:9 Wide</span>
            <span className="text-[10px] text-slate-500">YouTube</span>
          </button>
        </div>
      </div>

      {/* Preset Backgrounds Grid */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Aesthetic Motion Background
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {BACKGROUND_PRESETS.map((preset) => {
            const isSelected =
              !config.customMediaUrl && config.backgroundPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  clearCustomMedia();
                  onChangeConfig({ backgroundPreset: preset.id });
                }}
                className={`relative overflow-hidden p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-emerald-400 ring-2 ring-emerald-500/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${preset.gradientColors[0]}, ${preset.gradientColors[1]})`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">
                    {preset.name}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-300/80 line-clamp-2">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Media Upload */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Or Upload Custom Media
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {config.customMediaUrl ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-emerald-500/40">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <Check className="w-4 h-4" />
              <span>
                Custom {config.customMediaType === 'video' ? 'Video' : 'Image'} Loaded
              </span>
            </div>
            <button
              onClick={clearCustomMedia}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/60 hover:bg-slate-900 text-xs font-semibold text-slate-300 transition-all active:scale-[0.99]"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Select Video or Photo from Device</span>
          </button>
        )}
      </div>

      {/* Contrast Overlay Slider */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
          <span>Dark Contrast Overlay</span>
          <span className="text-emerald-400 font-mono">
            {Math.round(config.overlayOpacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.05"
          value={config.overlayOpacity}
          onChange={(e) =>
            onChangeConfig({ overlayOpacity: parseFloat(e.target.value) })
          }
          className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
        />
        <p className="text-[10px] text-slate-500 mt-1">
          Darkens the background to keep Quranic Arabic text razor sharp.
        </p>
      </div>
    </div>
  );
};

