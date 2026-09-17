'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  HelpCircle,
  Shield,
  FileText,
  Mail,
  ChevronRight,
  Sun,
  Moon,
  Mic2,
  Languages,
  Sparkles,
  HardDrive,
  Trash2,
  ExternalLink,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  BookOpen,
  Info,
  Heart,
  Loader2,
} from 'lucide-react';
import {
  getStorageUsageSummary,
  clearAllExportedVideos,
  formatBytes,
} from '@/lib/storage-db';
import { UserPreferences } from '@/lib/preferences';
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
  // Modal visibility states
  const [activeModal, setActiveModal] = useState<
    'rate' | 'help' | 'privacy' | 'terms' | 'contact' | 'storage' | null
  >(null);

  // Rate Us State
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [hasRated, setHasRated] = useState<boolean>(false);

  // Storage management
  const [storageUsage, setStorageUsage] = useState({ videoCount: 0, totalSizeBytes: 0 });
  const [isLoadingStorage, setIsLoadingStorage] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

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
    loadStorage();
  }, []);

  const handleClearVideos = async () => {
    try {
      await clearAllExportedVideos();
      showToast('All exported videos cleared successfully.');
      setActiveModal(null);
      await loadStorage();
    } catch {
      showToast('Failed to clear video storage.');
    }
  };

  const handleSubmitRating = () => {
    setHasRated(true);
    setTimeout(() => {
      setActiveModal(null);
      setHasRated(false);
      showToast('Thank you for rating Quran Video Studio! ⭐');
    }, 1200);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-4 pb-32 select-none animate-in fade-in duration-200">
      {/* Centered iOS/Mobile Header */}
      <div className="text-center py-3 mb-3">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Settings
        </h1>
      </div>

      {feedbackMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* =================================================================== */}
        {/* 1. GENERAL SECTION (MATCHING SCREENSHOT)                            */}
        {/* =================================================================== */}
        <section>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white px-2 mb-2">
            General
          </h2>
          <div className="bg-[#f4f4f6] dark:bg-[#1c1c1e] rounded-2xl overflow-hidden border border-slate-200/40 dark:border-slate-800/40 shadow-xs transition-colors">
            {/* Item 1: Rate Us */}
            <button
              onClick={() => setActiveModal('rate')}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-200/40 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Star className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                <span className="text-[15px] font-medium text-slate-900 dark:text-white">
                  Rate us
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="border-t border-slate-200/70 dark:border-slate-800/80 ml-12 mr-3" />

            {/* Item 2: Help Center */}
            <button
              onClick={() => setActiveModal('help')}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-200/40 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <HelpCircle className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                <span className="text-[15px] font-medium text-slate-900 dark:text-white">
                  Help Center
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 2. PREFERENCES SECTION (MATCHING SCREENSHOT)                        */}
        {/* =================================================================== */}
        <section>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white px-2 mb-2">
            Preferences
          </h2>
          <div className="bg-[#f4f4f6] dark:bg-[#1c1c1e] rounded-2xl overflow-hidden border border-slate-200/40 dark:border-slate-800/40 shadow-xs transition-colors">
            {/* Item 1: Privacy Policy */}
            <button
              onClick={() => setActiveModal('privacy')}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-200/40 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Shield className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                <span className="text-[15px] font-medium text-slate-900 dark:text-white">
                  Privacy Policy
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="border-t border-slate-200/70 dark:border-slate-800/80 ml-12 mr-3" />

            {/* Item 2: Terms of Use */}
            <button
              onClick={() => setActiveModal('terms')}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-200/40 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                <span className="text-[15px] font-medium text-slate-900 dark:text-white">
                  Terms of Use
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="border-t border-slate-200/70 dark:border-slate-800/80 ml-12 mr-3" />

            {/* Item 3: Contact Us */}
            <button
              onClick={() => setActiveModal('contact')}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-200/40 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Mail className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                <span className="text-[15px] font-medium text-slate-900 dark:text-white">
                  Contact Us
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 3. STUDIO & AUDIO SECTION                                           */}
        {/* =================================================================== */}
        <section>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white px-2 mb-2">
            Studio &amp; Reading
          </h2>
          <div className="bg-[#f4f4f6] dark:bg-[#1c1c1e] rounded-2xl overflow-hidden border border-slate-200/40 dark:border-slate-800/40 shadow-xs transition-colors">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3.5">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                ) : (
                  <Sun className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                )}
                <div>
                  <span className="text-[15px] font-medium text-slate-900 dark:text-white block">
                    Appearance
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {theme === 'dark' ? 'Dark theme active' : 'Light theme active (Base)'}
                  </span>
                </div>
              </div>
              <button
                onClick={onToggleTheme}
                aria-label="Toggle theme"
                className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${
                  theme === 'dark' ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-1 shadow-sm flex items-center justify-center ${
                    theme === 'dark' ? 'left-6' : 'left-1'
                  }`}
                >
                  {theme === 'dark' ? (
                    <Moon className="w-2.5 h-2.5 text-emerald-700" />
                  ) : (
                    <Sun className="w-2.5 h-2.5 text-amber-500" />
                  )}
                </div>
              </button>
            </div>

            <div className="border-t border-slate-200/70 dark:border-slate-800/80 ml-12 mr-3" />

            {/* Reciter Selector */}
            <button
              onClick={onOpenRecitersModal}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-200/40 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Mic2 className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                <div>
                  <span className="text-[15px] font-medium text-slate-900 dark:text-white block">
                    Default Reciter
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[200px]">
                    {currentReciter.name}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="border-t border-slate-200/70 dark:border-slate-800/80 ml-12 mr-3" />

            {/* Translation Selector */}
            <button
              onClick={onOpenTranslationModal}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-200/40 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <Languages className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                <div>
                  <span className="text-[15px] font-medium text-slate-900 dark:text-white block">
                    Primary Translation
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[200px]">
                    {selectedTranslationName}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="border-t border-slate-200/70 dark:border-slate-800/80 ml-12 mr-3" />

            {/* Storage Management */}
            <button
              onClick={() => setActiveModal('storage')}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-200/40 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <HardDrive className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                <div>
                  <span className="text-[15px] font-medium text-slate-900 dark:text-white block">
                    Storage &amp; Cached Videos
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {storageUsage.videoCount} videos ({formatBytes(storageUsage.totalSizeBytes)})
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
            </button>

            {onReplayOnboarding && (
              <>
                <div className="border-t border-slate-200/70 dark:border-slate-800/80 ml-12 mr-3" />
                {/* Starter Walkthrough */}
                <button
                  onClick={onReplayOnboarding}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-200/40 dark:hover:bg-white/5 active:bg-slate-200/60 dark:active:bg-white/10 transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <Sparkles className="w-5 h-5 text-slate-700 dark:text-slate-300 stroke-[1.75]" />
                    <span className="text-[15px] font-medium text-slate-900 dark:text-white">
                      Starter Walkthrough &amp; Tour
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5" />
                </button>
              </>
            )}
          </div>
        </section>

        {/* =================================================================== */}
        {/* FOOTER ATTRIBUTION (POWERED BY QURAN.COM API)                       */}
        {/* =================================================================== */}
        <div className="pt-2 text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Powered by Quran.com API</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Quran Video Studio • Version 1.0.1
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: RATE US                                                      */}
      {/* ===================================================================== */}
      {activeModal === 'rate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center">
              <Star className="w-7 h-7 fill-amber-400" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Enjoying Quran Video Studio?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your feedback helps us bring the words of Allah to more hearts worldwide.
              </p>
            </div>

            {/* Interactive 5 Stars */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRatingStars(s)}
                  className="p-1 transition-transform active:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 ${
                      s <= ratingStars
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmitRating}
              disabled={hasRated}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              {hasRated ? 'Thank You!' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: HELP CENTER & GUIDES                                         */}
      {/* ===================================================================== */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[85vh] bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <HelpCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Help Center &amp; Guides</span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-slate-600 dark:text-slate-300 pr-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  1. How to create 9:16 short videos
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Go to <strong>Studio</strong> tab, select your Surah &amp; ayah range, customize the calligraphy size, choose an animated backdrop, and tap <strong>Export Video</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  2. Word-by-word karaoke highlighting
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Our canvas engine synchronizes each Arabic word using verified recitation timestamp segments so the text lights up in real-time.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  3. Are the texts and recitations authentic?
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Yes! All Quranic texts, translations, and audio recordings are fetched directly from the official, verified <strong>Quran.com REST API v4</strong> and EveryAyah mirrors.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  4. Can I share directly to TikTok &amp; Reels?
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Yes! When video export completes, tap <strong>Share</strong> to send directly to Instagram Reels, TikTok, YouTube Shorts, or save to your phone gallery.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: PRIVACY POLICY                                               */}
      {/* ===================================================================== */}
      {activeModal === 'privacy' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[85vh] bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Privacy Policy</span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pr-1">
              <p>
                <strong>Quran Video Studio</strong> is committed to user privacy and simplicity.
              </p>
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <h5 className="font-bold text-slate-900 dark:text-white">No Personal Data Collection</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  We do not require accounts, passwords, or emails. We do not track your location or use third-party advertising SDKs.
                </p>
              </div>
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <h5 className="font-bold text-slate-900 dark:text-white">Client-Side Video Processing</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  All video synthesis, audio stitching, and rendering happens locally on your device hardware. Your creations are never uploaded to our servers.
                </p>
              </div>
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <h5 className="font-bold text-slate-900 dark:text-white">Third-Party Quran API</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  The app communicates with public CDNs (api.quran.com) only to retrieve the requested Quran text and recitation audio files.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <a
                href="/privacy.html"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1"
              >
                <span>Full Web Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: TERMS OF USE                                                 */}
      {/* ===================================================================== */}
      {activeModal === 'terms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[85vh] bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Terms of Use</span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pr-1">
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <h5 className="font-bold text-slate-900 dark:text-white">1. Reverence &amp; Sacred Text</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  This application is designed solely for spreading the noble teachings of the Holy Quran. Users agree not to use the generated media in defamatory, disrespectful, or inappropriate contexts.
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <h5 className="font-bold text-slate-900 dark:text-white">2. Attribution &amp; Reciters</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  All Quranic audio remains the intellectual property of the respected reciters and Quran.com. When sharing on social networks, reciter credits are automatically added to preserve authenticity.
                </p>
              </div>

              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <h5 className="font-bold text-slate-900 dark:text-white">3. Non-Commercial Personal Sharing</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  You are free to export and publish Quranic videos to personal channels (TikTok, Instagram Reels, YouTube Shorts, WhatsApp Status) for da&apos;wah and remembrance.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
            >
              I Understand &amp; Agree
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: CONTACT US                                                   */}
      {/* ===================================================================== */}
      {activeModal === 'contact' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-500 mx-auto flex items-center justify-center">
              <Mail className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Contact &amp; Support
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Have a suggestion, bug report, or feature request? We would love to hear from you.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href="mailto:support@quranvideostudio.com"
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span>Email Support</span>
              </a>

              <a
                href="https://github.com/morir886624/quran_video_generator/issues"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                <span>GitHub Issues &amp; Feedback</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 6: STORAGE MANAGEMENT                                           */}
      {/* ===================================================================== */}
      {activeModal === 'storage' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 text-orange-500 mx-auto flex items-center justify-center">
              <HardDrive className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Offline Video Storage
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You currently have <strong>{storageUsage.videoCount} videos</strong> saved locally taking{' '}
                <strong>{formatBytes(storageUsage.totalSizeBytes)}</strong>.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleClearVideos}
                disabled={storageUsage.videoCount === 0}
                className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Saved Videos</span>
              </button>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
