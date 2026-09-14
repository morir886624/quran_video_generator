'use client';

import React from 'react';
import { X, Moon, Sun, Info, Smartphone, ExternalLink, Heart } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#0F172A] border border-slate-700/80 rounded-3xl shadow-2xl p-6 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg text-white">App Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* Theme Option */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-sm font-semibold text-white">
                Appearance Theme
              </span>
            </div>
            <button
              onClick={onToggleTheme}
              className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            >
              {theme === 'dark' ? 'Dark Navy' : 'Light Slate'}
            </button>
          </div>

          {/* Mobile Information */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Smartphone className="w-4 h-4" />
              <span>Mobile Platforms Ready</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Configured with <strong>Capacitor</strong> for native Android &amp; iOS deployment. Videos exported in 9:16 vertical ratio are ready for TikTok, Reels, YouTube Shorts, and WhatsApp Status.
            </p>
          </div>

          {/* Quran.com API Attribution */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between font-bold text-white">
              <span>Data &amp; Audio Source</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                v4 REST API
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Powered by the official <strong>Quran.com API</strong> and CDN audio streaming. No heavy audio downloads or private keys needed.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            Built with respect for the Holy Quran
          </p>
        </div>
      </div>
    </div>
  );
};

