'use client';

import React, { useState, useEffect } from 'react';
import { Chapter, Reciter, Verse, VideoConfig } from '@/types/quran';
import {
  exportVideo,
  ExportProgress,
  shareOrDownloadVideo,
} from '@/lib/video-recorder';
import { cleanTranslationText } from '@/lib/quran-api';
import {
  Download,
  Share2,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

function YoutubeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  verses: Verse[];
  audioUrls: string[];
  chapter: Chapter | null;
  config: VideoConfig;
  reciter?: Reciter;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  verses,
  audioUrls,
  chapter,
  config,
  reciter,
}) => {
  const [progress, setProgress] = useState<ExportProgress>({
    percent: 0,
    currentAyahIndex: 1,
    totalAyahs: verses.length,
    status: 'Initializing video engine...',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    blob: Blob;
    url: string;
    filename: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Copy states
  const [copiedArabic, setCopiedArabic] = useState(false);
  const [copiedTrans, setCopiedTrans] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  const startAyah = verses[0]?.verse_number || 1;
  const endAyah = verses[verses.length - 1]?.verse_number || 1;
  const rangeStr = startAyah === endAyah ? `Ayah ${startAyah}` : `Ayahs ${startAyah}–${endAyah}`;
  const reciterName = reciter?.name || 'Mishari Rashid Al-Afasy';

  // Generated Text Contents
  const youtubeTitle = `Surah ${chapter?.name_simple || 'Quran'} (${rangeStr}) | ${reciterName} | Quran Video #Shorts #Quran`;

  const fullArabicText = verses
    .map((v) => `${v.text_uthmani} ۝${v.verse_number}`)
    .join(' ');

  const fullTranslationText = verses
    .map((v) => `[${v.verse_number}] ${cleanTranslationText(v.translations?.[0]?.text || '')}`)
    .join('\n\n');

  const youtubeDescription = `${chapter?.name_simple || 'Quran'} (${rangeStr})
Reciter: ${reciterName}
Surah #${chapter?.id} • ${chapter?.name_arabic}

📖 ARABIC TEXT:
${fullArabicText}

📜 TRANSLATION:
${fullTranslationText}

---
Generated via Quran.com Video Studio
#Quran #Shorts #Reels #QuranRecitation #Islam #Muslim #AlQuran #IslamicShorts`;

  useEffect(() => {
    if (!isOpen) {
      setIsExporting(false);
      setExportResult(null);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsExporting(true);
    setError(null);

    exportVideo({
      verses,
      audioUrls,
      chapter,
      config,
      onProgress: (p) => {
        if (!isCancelled) {
          setProgress(p);
        }
      },
    })
      .then((res) => {
        if (!isCancelled) {
          setExportResult(res);
          setIsExporting(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Video export error:', err);
          setError(err.message || 'Failed to generate video.');
          setIsExporting(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, audioUrls, chapter, config, verses]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!exportResult) return;
    shareOrDownloadVideo(exportResult.url, exportResult.filename, exportResult.blob);
  };

  const copyToClipboard = (text: string, setSuccess: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/90 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col max-h-[92vh] overflow-y-auto transition-colors">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Status Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg">
            {isExporting ? (
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 dark:text-emerald-400" />
            ) : exportResult ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-rose-500 dark:text-rose-400" />
            )}
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {isExporting
                ? 'Generating Seamless Short Video'
                : exportResult
                ? 'Video Ready & YouTube Suite'
                : 'Export Failed'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isExporting
                ? progress.status
                : exportResult
                ? 'Download your video and use 1-click copy tools for YouTube, Reels & TikTok.'
                : error}
            </p>
          </div>
        </div>

        {/* Progress Bar (During Export) */}
        {isExporting && (
          <div className="w-full space-y-3 my-6">
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500 dark:text-slate-400">{progress.status}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">{progress.percent}%</span>
            </div>
          </div>
        )}

        {/* Result Area */}
        {exportResult && (
          <div className="space-y-6">
            {/* Top Download & Action Row */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <div className="w-28 aspect-[9/16] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-md bg-black flex-shrink-0">
                <video
                  src={exportResult.url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 w-full space-y-2.5">
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/20 dark:shadow-emerald-950/50 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video (MP4)</span>
                </button>

                <div className="flex gap-2">
                  <a
                    href="https://studio.youtube.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <YoutubeIcon className="w-4 h-4" />
                    <span>Upload to YouTube</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>

                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
                  >
                    <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Share Sheet</span>
                  </button>
                </div>
              </div>
            </div>

            {/* YouTube Creator Suite with 1-Click Copy Buttons */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <YoutubeIcon className="w-4 h-4 text-red-500" />
                <span>YouTube Creator Copy Suite</span>
              </div>

              {/* 1. YouTube Title Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>YouTube Video Title:</span>
                  <button
                    onClick={() => copyToClipboard(youtubeTitle, setCopiedTitle)}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                  >
                    {copiedTitle ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedTitle ? 'Copied!' : 'Copy Title'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-transparent text-xs text-slate-900 dark:text-white font-medium select-text">
                  {youtubeTitle}
                </div>
              </div>

              {/* 2. Selected Arabic Verses Box with Copy Icon */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Selected Verses (Arabic Text):</span>
                  <button
                    onClick={() => copyToClipboard(fullArabicText, setCopiedArabic)}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                  >
                    {copiedArabic ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedArabic ? 'Copied Arabic!' : 'Copy Arabic'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-transparent text-right font-quran text-base sm:text-lg text-emerald-950 dark:text-amber-200 select-text max-h-28 overflow-y-auto leading-loose">
                  {fullArabicText}
                </div>
              </div>

              {/* 3. Translation Box with Copy Icon */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Verses Translation:</span>
                  <button
                    onClick={() => copyToClipboard(fullTranslationText, setCopiedTrans)}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                  >
                    {copiedTrans ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedTrans ? 'Copied Translation!' : 'Copy Translation'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-transparent text-xs text-slate-800 dark:text-slate-200 select-text max-h-28 overflow-y-auto whitespace-pre-line leading-relaxed">
                  {fullTranslationText}
                </div>
              </div>

              {/* 4. Complete Description with Copy Icon */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Full YouTube Description &amp; Tags:</span>
                  <button
                    onClick={() => copyToClipboard(youtubeDescription, setCopiedDesc)}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                  >
                    {copiedDesc ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedDesc ? 'Copied Description!' : 'Copy Full Description'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-transparent text-[11px] text-slate-600 dark:text-slate-400 select-text max-h-24 overflow-y-auto whitespace-pre-line font-mono">
                  {youtubeDescription}
                </div>
              </div>
            </div>

            {/* Done Button */}
            <div className="pt-2 text-center">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
