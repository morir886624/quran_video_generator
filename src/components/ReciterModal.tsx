'use client';

import React, { useState } from 'react';
import { Reciter } from '@/types/quran';
import { POPULAR_RECITERS } from '@/lib/constants';
import { Mic2, X, Check, Play, Pause, Search } from 'lucide-react';

interface ReciterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReciterId: number;
  onSelectReciter: (reciter: Reciter) => void;
}

/**
 * Returns a verified working preview audio URL for Al-Fatihah (Ayah 1:1)
 */
const getReciterPreviewUrl = (reciter: Reciter): string => {
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

export const ReciterModal: React.FC<ReciterModalProps> = ({
  isOpen,
  onClose,
  selectedReciterId,
  onSelectReciter,
}) => {
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingReciterId, setPlayingReciterId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handlePreview = (reciter: Reciter, e: React.MouseEvent) => {
    e.stopPropagation();

    if (previewAudio) {
      previewAudio.pause();
      if (playingReciterId === reciter.id) {
        setPlayingReciterId(null);
        return;
      }
    }

    const audioUrl = getReciterPreviewUrl(reciter);
    const audio = new Audio(audioUrl);
    audio.addEventListener('ended', () => {
      setPlayingReciterId(null);
    });

    audio.play().catch(() => {
      setPlayingReciterId(null);
    });

    setPreviewAudio(audio);
    setPlayingReciterId(reciter.id);
  };

  const handleClose = () => {
    if (previewAudio) previewAudio.pause();
    setPlayingReciterId(null);
    setSearchQuery('');
    onClose();
  };

  const filteredReciters = POPULAR_RECITERS.filter((reciter) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      reciter.name.toLowerCase().includes(q) ||
      (reciter.description && reciter.description.toLowerCase().includes(q)) ||
      (reciter.style && reciter.style.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Mic2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Choose Reciter Voice
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {POPULAR_RECITERS.length} world-renowned Quran reciters available
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reciter by name, style, or country..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Reciters List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
          {filteredReciters.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No reciters found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredReciters.map((reciter) => {
              const isSelected = reciter.id === selectedReciterId;
              const isPlaying = playingReciterId === reciter.id;

              return (
                <div
                  key={reciter.id}
                  onClick={() => {
                    onSelectReciter(reciter);
                    handleClose();
                  }}
                  className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500/70 text-slate-900 dark:text-white shadow-sm ring-1 ring-emerald-500/40'
                      : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Mic2 className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span className="truncate">{reciter.name}</span>
                        {reciter.style && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-medium shrink-0">
                            {reciter.style}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {reciter.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handlePreview(reciter, e)}
                      className={`p-2 rounded-xl transition-all ${
                        isPlaying
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-600/30 animate-pulse'
                          : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                      title="Listen to 1:1 preview"
                    >
                      {isPlaying ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>

                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
