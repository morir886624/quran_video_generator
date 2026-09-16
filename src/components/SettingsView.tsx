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
} from 'lucide-react';
import {
  getStorageUsageSummary,
  clearAllExportedVideos,
  formatBytes,
} from '@/lib/storage-db';

interface SettingsViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onGoToStudio?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
}) => {
  const [storageUsage, setStorageUsage] = useState({ videoCount: 0, totalSizeBytes: 0 });
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [clearFeedback, setClearFeedback] = useState<string | null>(null);

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

  const handleClearVideos = async () => {
    try {
      await clearAllExportedVideos();
      setIsClearConfirmOpen(false);
      setClearFeedback('All exported videos cleared successfully.');
      setTimeout(() => setClearFeedback(null), 3500);
      await loadStorage();
    } catch {
      setClearFeedback('Failed to clear video storage.');
      setTimeout(() => setClearFeedback(null), 3500);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 py-5 pb-32 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6 p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/20">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            App Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure appearance, storage management, and app preferences.
          </p>
        </div>
      </div>

      {clearFeedback && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{clearFeedback}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* 1. Appearance Section */}
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

        {/* 2. Storage & Data Management Section */}
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

        {/* 3. Audio & Streaming Section */}
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
                Seamless recitations are streamed and stitched on-the-fly directly from verified Quran.com CDNs, ensuring high-fidelity, distortion-free audio.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Mobile Platforms Ready */}
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

        {/* 5. About & Privacy */}
        <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-500" />
            <span>About &amp; Privacy</span>
          </h2>

          <div className="space-y-3 text-xs">
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

