'use client';

import React, { useState, useEffect } from 'react';
import { Chapter, Reciter, Verse, VideoConfig } from '@/types/quran';
import {
  exportVideo,
  ExportProgress,
  saveVideoToDevice,
  shareVideo,
} from '@/lib/video-recorder';
import { cleanTranslationText, fetchPersianTafsirSurah } from '@/lib/quran-api';
import { saveExportedVideo } from '@/lib/storage-db';
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
  Film,
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
  selectedTranslationId?: number;
  onViewInCreations?: () => void;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  verses,
  audioUrls,
  chapter,
  config,
  reciter,
  selectedTranslationId,
  onViewInCreations,
}) => {
  const [progress, setProgress] = useState<ExportProgress>({
    percent: 0,
    currentAyahIndex: 1,
    totalAyahs: verses.length,
    status: 'Initializing video engine...',
  });

  const [exportResult, setExportResult] = useState<{
    blob: Blob;
    url: string;
    filename: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSavedToCreations, setIsSavedToCreations] = useState(false);

  const isExporting = isOpen && !exportResult && !error;

  const handleClose = () => {
    setExportResult(null);
    setError(null);
    setProgress({
      percent: 0,
      currentAyahIndex: 1,
      totalAyahs: verses.length,
      status: 'Initializing video engine...',
    });
    setIsSavedToCreations(false);
    onClose();
  };

  // Copy states
  const [copiedArabic, setCopiedArabic] = useState(false);
  const [copiedTrans, setCopiedTrans] = useState(false);
  const [copiedPersian, setCopiedPersian] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [persianTafsirMap, setPersianTafsirMap] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isOpen || !chapter?.id || !config.showPersianTafsir) return;
    fetchPersianTafsirSurah(chapter.id, config.persianTafsirEdition)
      .then(setPersianTafsirMap)
      .catch((e) => console.warn('Failed to load Persian tafsir for modal text:', e));
  }, [isOpen, chapter?.id, config.showPersianTafsir, config.persianTafsirEdition]);

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

  const fullPersianText = verses
    .map((v) => `[${v.verse_number}] ${persianTafsirMap[v.verse_number] || v.persianTafsir || ''}`)
    .filter((t) => t.trim().length > 4)
    .join('\n\n');

  const youtubeDescription = `${chapter?.name_simple || 'Quran'} (${rangeStr})
Reciter: ${reciterName}
Surah #${chapter?.id} • ${chapter?.name_arabic}

📖 ARABIC TEXT:
${fullArabicText}

📜 TRANSLATION:
${fullTranslationText}
${config.showPersianTafsir && fullPersianText ? `\n\n🕌 PERSIAN TAFSIR (تفسیر فارسی):\n${fullPersianText}` : ''}

---
Generated via Quran.com Video Studio
#Quran #Shorts #Reels #QuranRecitation #Islam #Muslim #AlQuran #IslamicShorts`;

  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;

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
      .then(async (res) => {
        if (!isCancelled) {
          setExportResult(res);

          // Automatically store in app Creations IndexedDB library
          try {
            await saveExportedVideo({
              id: `vid_${Date.now()}`,
              title: `Surah ${chapter?.name_simple || 'Quran'} (${rangeStr})`,
              chapterId: chapter?.id || 1,
              chapterName: chapter?.name_simple || 'Surah',
              verseRange: rangeStr,
              reciterName,
              videoBlob: res.blob,
              mimeType: res.blob.type || 'video/mp4',
              size: res.blob.size,
              createdAt: Date.now(),
              youtubeTitle,
              youtubeDescription,
              fullArabicText,
              fullTranslationText,
              fullPersianText: config.showPersianTafsir ? fullPersianText : undefined,
              projectSnapshot: {
                chapterId: chapter?.id || 1,
                verseKeys: verses.map((v) => v.verse_key),
                reciterId: reciter?.id || 7,
                translationId: selectedTranslationId || 20,
                videoConfig: config,
              },
            });
            if (!isCancelled) {
              setIsSavedToCreations(true);
            }
          } catch (e) {
            console.warn('Failed to save exported video to library:', e);
          }
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          console.error('Video export error:', err);
          setError(err instanceof Error ? err.message : 'Failed to generate video.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, audioUrls, chapter, config, verses, rangeStr, reciterName, reciter?.id, youtubeTitle, youtubeDescription, fullArabicText, fullTranslationText, fullPersianText, selectedTranslationId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!exportResult || isSaving) return;
    setIsSaving(true);
    setStatusFeedback(null);
    try {
      const res = await saveVideoToDevice({
        url: exportResult.url,
        filename: exportResult.filename,
        blob: exportResult.blob,
      });
      setStatusFeedback({ type: 'success', message: res.message });
      setTimeout(() => setStatusFeedback(null), 5000);
    } catch (err: unknown) {
      setStatusFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save video',
      });
      setTimeout(() => setStatusFeedback(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!exportResult || isSharing) return;
    setIsSharing(true);
    try {
      await shareVideo({
        url: exportResult.url,
        filename: exportResult.filename,
        blob: exportResult.blob,
        title: youtubeTitle,
        text: `${chapter?.name_simple || 'Quran'} (${rangeStr}) - Recited by ${reciterName}`,
      });
    } catch (err: unknown) {
      console.warn('Share error:', err);
    } finally {
      setIsSharing(false);
    }
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
          onClick={handleClose}
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
                {isSavedToCreations && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs animate-in fade-in">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Saved to Creations Library</span>
                    </span>
                    {onViewInCreations && (
                      <button
                        onClick={() => {
                          handleClose();
                          onViewInCreations();
                        }}
                        className="flex items-center gap-1 font-bold underline hover:opacity-80 transition-opacity"
                      >
                        <Film className="w-3 h-3" />
                        <span>View Library</span>
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/20 dark:shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-80"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving to Gallery...' : 'Save to Gallery / Photos (MP4)'}</span>
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
                    onClick={handleShare}
                    disabled={isSharing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-80"
                  >
                    {isSharing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span>{isSharing ? 'Preparing...' : 'Share Video'}</span>
                  </button>
                </div>

                {statusFeedback && (
                  <div className={`flex items-center justify-center gap-1.5 text-center text-xs font-semibold rounded-xl py-2.5 px-3.5 animate-in fade-in shadow-sm ${
                    statusFeedback.type === 'error'
                      ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60'
                      : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60'
                  }`}>
                    {statusFeedback.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    )}
                    <span>{statusFeedback.message}</span>
                  </div>
                )}
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

              {/* 3b. Persian Tafsir Box with Copy Icon */}
              {config.showPersianTafsir && fullPersianText && (
                <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
                    <span>Persian Tafsir (تفسیر فارسی):</span>
                    <button
                      onClick={() => copyToClipboard(fullPersianText, setCopiedPersian)}
                      className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors"
                    >
                      {copiedPersian ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedPersian ? 'Copied Tafsir!' : 'Copy Persian Tafsir'}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-transparent text-xs text-slate-800 dark:text-slate-200 select-text max-h-28 overflow-y-auto whitespace-pre-line leading-relaxed font-persian text-right" dir="rtl">
                    {fullPersianText}
                  </div>
                </div>
              )}

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
                onClick={handleClose}
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
