'use client';

import React, { useState } from 'react';
import { Chapter, Reciter, Verse, VideoConfig } from '@/types/quran';
import { VideoPreviewCanvas } from './VideoPreviewCanvas';
import { BackgroundPicker } from './BackgroundPicker';
import { TypographyCustomizer } from './TypographyCustomizer';
import { VideoExportModal } from './VideoExportModal';
import { ReciterModal } from './ReciterModal';
import {
  Video,
  Download,
  Mic2,
  Palette,
  Type,
  BookOpen,
  Sparkles,
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
}

export const VideoStudio: React.FC<VideoStudioProps> = ({
  chapter,
  verses,
  audioUrls,
  config,
  onChangeConfig,
  currentReciter,
  onSelectReciter,
  onBackToReader,
}) => {
  const [activeTab, setActiveTab] = useState<'background' | 'typography' | 'reciter'>('background');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReciterModalOpen, setIsReciterModalOpen] = useState(false);

  const startAyah = verses[0]?.verse_number || 1;
  const endAyah = verses[verses.length - 1]?.verse_number || 1;

  return (
    <div className="w-full max-w-6xl mx-auto px-3.5 sm:px-6 py-4 pb-32">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{chapter?.name_simple || 'Surah'}</span>
              <span className="text-emerald-400 text-sm">
                ({startAyah === endAyah ? `Ayah ${startAyah}` : `Ayahs ${startAyah}–${endAyah}`})
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {verses.length} {verses.length === 1 ? 'verse' : 'verses'} selected • Reciter: {currentReciter.name}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onBackToReader}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Select Other Ayahs</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/60 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export Video</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Canvas Player, Right Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Canvas Preview Player (Mobile 9:16 Focused) */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center">
          <VideoPreviewCanvas
            verses={verses}
            audioUrls={audioUrls}
            chapter={chapter}
            config={config}
          />
        </div>

        {/* Right Column: Customization Panel Tabs */}
        <div className="lg:col-span-6 xl:col-span-7 bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
          {/* Tabs Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-2xl mb-6 border border-slate-700/60">
            <button
              onClick={() => setActiveTab('background')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'background'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Background</span>
            </button>

            <button
              onClick={() => setActiveTab('typography')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'typography'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Typography</span>
            </button>

            <button
              onClick={() => setIsReciterModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition-all hover:bg-slate-700/50"
            >
              <Mic2 className="w-4 h-4 text-emerald-400" />
              <span className="truncate">{currentReciter.name.split(' ')[0]}</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          {activeTab === 'background' && (
            <BackgroundPicker config={config} onChangeConfig={onChangeConfig} />
          )}

          {activeTab === 'typography' && (
            <TypographyCustomizer
              config={config}
              onChangeConfig={onChangeConfig}
            />
          )}

          {/* Reciter Info Pill in Tab Panel */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Mic2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {currentReciter.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  {currentReciter.description}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsReciterModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      {/* Video Export Modal */}
      <VideoExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        verses={verses}
        audioUrls={audioUrls}
        chapter={chapter}
        config={config}
      />

      {/* Reciter Modal */}
      <ReciterModal
        isOpen={isReciterModalOpen}
        onClose={() => setIsReciterModalOpen(false)}
        selectedReciterId={currentReciter.id}
        onSelectReciter={onSelectReciter}
      />
    </div>
  );
};

