'use client';

import React, { useState } from 'react';
import { Reciter } from '@/types/quran';
import { POPULAR_RECITERS } from '@/lib/constants';
import { Mic2, X, Check, Play, Pause } from 'lucide-react';

interface ReciterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReciterId: number;
  onSelectReciter: (reciter: Reciter) => void;
}

export const ReciterModal: React.FC<ReciterModalProps> = ({
  isOpen,
  onClose,
  selectedReciterId,
  onSelectReciter,
}) => {
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingReciterId, setPlayingReciterId] = useState<number | null>(null);

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

    // Al-Fatiha Ayah 1 audio preview for this reciter
    // Quran.com audio format for Ayah 1:1
    const audioUrl = `https://verses.quran.com/${
      reciter.id === 7
        ? 'Alafasy/mp3/001001.mp3'
        : reciter.id === 2
        ? 'AbdulBaset/Murattal/mp3/001001.mp3'
        : reciter.id === 9
        ? 'MaherAlMuaiqly/mp3/001001.mp3'
        : reciter.id === 3
        ? 'Sudais/mp3/001001.mp3'
        : 'Alafasy/mp3/001001.mp3'
    }`;

    const audio = new Audio(audioUrl);
    setPreviewAudio(audio);
    setPlayingReciterId(reciter.id);

    audio.play().catch(() => {
      setPlayingReciterId(null);
    });

    audio.onended = () => {
      setPlayingReciterId(null);
    };
  };

  const handleClose = () => {
    if (previewAudio) previewAudio.pause();
    setPlayingReciterId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Choose Reciter</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reciters List */}
        <div className="p-4 overflow-y-auto space-y-2">
          {POPULAR_RECITERS.map((reciter) => {
            const isSelected = reciter.id === selectedReciterId;
            const isPlaying = playingReciterId === reciter.id;

            return (
              <div
                key={reciter.id}
                onClick={() => {
                  onSelectReciter(reciter);
                  handleClose();
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-[0.99] ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500/70 text-slate-900 dark:text-white shadow-sm ring-1 ring-emerald-500/40'
                    : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      isSelected
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Mic2 className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{reciter.name}</span>
                      {reciter.style && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                          {reciter.style}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{reciter.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handlePreview(reciter, e)}
                    className={`p-2 rounded-full transition-all ${
                      isPlaying
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                    title="Audio Preview"
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
          })}
        </div>
      </div>
    </div>
  );
};

