'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chapter, Reciter, Verse, VideoConfig } from '@/types/quran';
import {
  exportVideo,
  ExportProgress,
  saveVideoToDevice,
  shareVideo,
} from '@/lib/video-recorder';
import { cleanTranslationText, fetchPersianTafsirSurah } from '@/lib/quran-api';
import { getReciterAyahUrl, POPULAR_RECITERS } from '@/lib/constants';
import { saveExportedVideo } from '@/lib/storage-db';
import { ShareModal } from './ShareModal';
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
  Layers,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Play,
} from 'lucide-react';

function YoutubeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

interface ExportedBatchResult {
  id: string;
  batchIndex: number;
  totalBatches: number;
  verses: Verse[];
  startAyah: number;
  endAyah: number;
  rangeStr: string;
  blob: Blob;
  url: string;
  filename: string;
  duration?: number;
  youtubeTitle: string;
  youtubeDescription: string;
  fullArabicText: string;
  fullTranslationText: string;
  fullPersianText: string;
  savedToLibrary: boolean;
}

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  verses: Verse[];
  allChapterVerses?: Verse[];
  audioUrls: string[];
  chapterAudioMap?: Record<string, string>;
  chapter: Chapter | null;
  config: VideoConfig;
  reciter?: Reciter;
  selectedTranslationId?: number;
  onViewInCreations?: () => void;
  onExportComplete?: () => void;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  verses,
  allChapterVerses,
  audioUrls,
  chapterAudioMap = {},
  chapter,
  config,
  reciter,
  selectedTranslationId,
  onViewInCreations,
  onExportComplete,
}) => {
  // Modal flow step: 'options' -> 'exporting' -> 'done'
  const [step, setStep] = useState<'options' | 'exporting' | 'done'>('options');
  const [exportMode, setExportMode] = useState<'selected' | 'chapter_batches'>('selected');
  const [ayahsPerVideoInput, setAyahsPerVideoInput] = useState<string>('5');

  const [progress, setProgress] = useState<ExportProgress>({
    percent: 0,
    currentAyahIndex: 1,
    totalAyahs: verses.length,
    status: 'Initializing video engine...',
  });
  const [currentBatchIdx, setCurrentBatchIdx] = useState<number>(0);
  const [totalBatchesCount, setTotalBatchesCount] = useState<number>(1);
  const [currentBatchLabel, setCurrentBatchLabel] = useState<string>('');

  const [exportResults, setExportResults] = useState<ExportedBatchResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Cancellation & early finish refs
  const cancelRef = useRef<boolean>(false);
  const finishEarlyRef = useRef<boolean>(false);

  // Copy states
  const [copiedArabic, setCopiedArabic] = useState(false);
  const [copiedTrans, setCopiedTrans] = useState(false);
  const [copiedPersian, setCopiedPersian] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  // Save / Share states
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [persianTafsirMap, setPersianTafsirMap] = useState<Record<number, string>>({});

  const chapterVersesList = useMemo(() => {
    if (allChapterVerses && allChapterVerses.length > 0) {
      return [...allChapterVerses].sort((a, b) => a.verse_number - b.verse_number);
    }
    return [...verses].sort((a, b) => a.verse_number - b.verse_number);
  }, [allChapterVerses, verses]);

  const totalChapterAyahs = chapter?.verses_count || chapterVersesList.length || 1;

  // Reset modal state whenever opened
  useEffect(() => {
    if (isOpen) {
      cancelRef.current = false;
      finishEarlyRef.current = false;
      setStep('options');
      setExportMode('selected');
      setAyahsPerVideoInput(String(Math.min(5, totalChapterAyahs)));
      setExportResults([]);
      setSelectedResultIndex(0);
      setError(null);
      setStatusFeedback(null);
    } else {
      cancelRef.current = true;
    }
  }, [isOpen, totalChapterAyahs]);

  useEffect(() => {
    if (!isOpen || !chapter?.id || !config.showPersianTafsir) return;
    fetchPersianTafsirSurah(chapter.id, config.persianTafsirEdition)
      .then(setPersianTafsirMap)
      .catch((e) => console.warn('Failed to load Persian tafsir for modal text:', e));
  }, [isOpen, chapter?.id, config.showPersianTafsir, config.persianTafsirEdition]);

  // Parse the user's typed range size (ayahs per video)
  const parsedBatchSize = useMemo(() => {
    const num = parseInt(ayahsPerVideoInput, 10);
    if (isNaN(num) || num < 1) return 1;
    return Math.min(num, totalChapterAyahs);
  }, [ayahsPerVideoInput, totalChapterAyahs]);

  // Compute batches for "Whole Chapter in Batches"
  const chapterBatchesPreview = useMemo(() => {
    const list: { verses: Verse[]; startAyah: number; endAyah: number; rangeStr: string }[] = [];
    if (chapterVersesList.length === 0) return list;

    for (let i = 0; i < chapterVersesList.length; i += parsedBatchSize) {
      const chunk = chapterVersesList.slice(i, i + parsedBatchSize);
      if (chunk.length === 0) continue;
      const s = chunk[0].verse_number;
      const e = chunk[chunk.length - 1].verse_number;
      const rangeStr = s === e ? `Ayah ${s}` : `Ayahs ${s}–${e}`;
      list.push({ verses: chunk, startAyah: s, endAyah: e, rangeStr });
    }
    return list;
  }, [chapterVersesList, parsedBatchSize]);

  const selectedStartAyah = verses[0]?.verse_number || 1;
  const selectedEndAyah = verses[verses.length - 1]?.verse_number || 1;
  const selectedRangeStr =
    selectedStartAyah === selectedEndAyah
      ? `Ayah ${selectedStartAyah}`
      : `Ayahs ${selectedStartAyah}–${selectedEndAyah}`;
  const reciterName = reciter?.name || 'Mishari Rashid Al-Afasy';
  const activeReciter = reciter || POPULAR_RECITERS[0];

  const handleClose = () => {
    cancelRef.current = true;
    exportResults.forEach((r) => {
      try {
        URL.revokeObjectURL(r.url);
      } catch {}
    });
    setExportResults([]);
    setError(null);
    setStep('options');
    onClose();
  };

  // Helper to build metadata & caption for any batch of verses
  const buildBatchMetadata = (batchVerses: Verse[], rangeStr: string) => {
    const youtubeTitle = `Surah ${chapter?.name_simple || 'Quran'} (${rangeStr}) | ${reciterName} | Quran Video #Shorts #Quran`;

    const fullArabicText = batchVerses
      .map((v) => {
        // @ts-ignore
        let rawText = v[config.arabicScriptType || 'text_uthmani'] || v.text_uthmani;
        if (typeof rawText === 'string') rawText = cleanTranslationText(rawText);
        return `${rawText} ۝${v.verse_number}`;
      })
      .join(' ');

    const fullTranslationText = batchVerses
      .map((v) => `[${v.verse_number}] ${cleanTranslationText(v.translations?.[0]?.text || '')}`)
      .join('\n\n');

    const fullPersianText = batchVerses
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
Created with Quran Video Studio • Powered by Quran.com API
#Quran #Shorts #Reels #QuranRecitation #Islam #Muslim #AlQuran #IslamicShorts`;

    return {
      youtubeTitle,
      youtubeDescription,
      fullArabicText,
      fullTranslationText,
      fullPersianText,
    };
  };

  // Start the export process for either Selected Ayahs or Whole Chapter Batches
  const handleStartExport = async () => {
    cancelRef.current = false;
    finishEarlyRef.current = false;
    setError(null);
    setExportResults([]);
    setSelectedResultIndex(0);
    setStep('exporting');

    // Build target batches
    const batchesToRun: {
      verses: Verse[];
      audioUrls: string[];
      startAyah: number;
      endAyah: number;
      rangeStr: string;
    }[] = [];

    if (exportMode === 'selected') {
      batchesToRun.push({
        verses,
        audioUrls,
        startAyah: selectedStartAyah,
        endAyah: selectedEndAyah,
        rangeStr: selectedRangeStr,
      });
    } else {
      const chapId = chapter?.id || 1;
      for (const b of chapterBatchesPreview) {
        const urls = b.verses.map((v) => {
          if (chapterAudioMap && chapterAudioMap[v.verse_key]) {
            return chapterAudioMap[v.verse_key];
          }
          return getReciterAyahUrl(activeReciter, chapId, v.verse_number);
        });
        batchesToRun.push({
          verses: b.verses,
          audioUrls: urls,
          startAyah: b.startAyah,
          endAyah: b.endAyah,
          rangeStr: b.rangeStr,
        });
      }
    }

    if (batchesToRun.length === 0) {
      setError('No ayahs available to export.');
      return;
    }

    setTotalBatchesCount(batchesToRun.length);
    const completedList: ExportedBatchResult[] = [];

    try {
      for (let i = 0; i < batchesToRun.length; i++) {
        if (cancelRef.current || finishEarlyRef.current) break;

        const batch = batchesToRun[i];
        setCurrentBatchIdx(i);
        setCurrentBatchLabel(batch.rangeStr);
        setProgress({
          percent: 0,
          currentAyahIndex: 1,
          totalAyahs: batch.verses.length,
          status:
            batchesToRun.length > 1
              ? `Preparing Video ${i + 1} of ${batchesToRun.length} (${batch.rangeStr})...`
              : 'Initializing video engine...',
        });

        const res = await exportVideo({
          verses: batch.verses,
          audioUrls: batch.audioUrls,
          chapter,
          config,
          shouldCancel: () => cancelRef.current || finishEarlyRef.current,
          onProgress: (p) => {
            if (!cancelRef.current) {
              setProgress(p);
            }
          },
        });

        if (cancelRef.current) return;

        const meta = buildBatchMetadata(batch.verses, batch.rangeStr);
        const resultId = `vid_${Date.now()}_${i}`;
        let savedToLibrary = false;

        // Automatically store in app Creations IndexedDB library with caption & metadata
        try {
          await saveExportedVideo({
            id: resultId,
            title: `Surah ${chapter?.name_simple || 'Quran'} (${batch.rangeStr})`,
            chapterId: chapter?.id || 1,
            chapterName: chapter?.name_simple || 'Surah',
            verseRange: batch.rangeStr,
            reciterName,
            videoBlob: res.blob,
            mimeType: res.blob.type || 'video/mp4',
            size: res.blob.size,
            duration: res.duration,
            createdAt: Date.now() + i,
            youtubeTitle: meta.youtubeTitle,
            youtubeDescription: meta.youtubeDescription,
            fullArabicText: meta.fullArabicText,
            fullTranslationText: meta.fullTranslationText,
            fullPersianText: config.showPersianTafsir ? meta.fullPersianText : undefined,
            projectSnapshot: {
              chapterId: chapter?.id || 1,
              verseKeys: batch.verses.map((v) => v.verse_key),
              reciterId: activeReciter.id,
              translationId: selectedTranslationId || 20,
              videoConfig: config,
            },
          });
          savedToLibrary = true;
          onExportComplete?.();
        } catch (saveErr) {
          console.warn('Failed to save exported video to library:', saveErr);
        }

        const batchResult: ExportedBatchResult = {
          id: resultId,
          batchIndex: i,
          totalBatches: batchesToRun.length,
          verses: batch.verses,
          startAyah: batch.startAyah,
          endAyah: batch.endAyah,
          rangeStr: batch.rangeStr,
          blob: res.blob,
          url: res.url,
          filename: res.filename,
          duration: res.duration,
          youtubeTitle: meta.youtubeTitle,
          youtubeDescription: meta.youtubeDescription,
          fullArabicText: meta.fullArabicText,
          fullTranslationText: meta.fullTranslationText,
          fullPersianText: meta.fullPersianText,
          savedToLibrary,
        };

        completedList.push(batchResult);
        setExportResults([...completedList]);
      }

      if (!cancelRef.current && completedList.length > 0) {
        setSelectedResultIndex(0);
        setStep('done');
      }
    } catch (err: unknown) {
      if (cancelRef.current) return;
      if (finishEarlyRef.current && completedList.length > 0) {
        setSelectedResultIndex(0);
        setStep('done');
        return;
      }
      console.error('Video export error:', err);
      if (completedList.length > 0) {
        // If some videos already succeeded before an error, still show them to the user
        setSelectedResultIndex(0);
        setStep('done');
        setStatusFeedback({
          type: 'error',
          message: `Completed ${completedList.length} video(s), but stopped early: ${
            err instanceof Error ? err.message : 'Export error'
          }`,
        });
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate video.');
      }
    }
  };

  if (!isOpen) return null;

  const activeResult: ExportedBatchResult | undefined =
    exportResults[selectedResultIndex] || exportResults[0];

  const handleSave = async () => {
    if (!activeResult || isSaving) return;
    setIsSaving(true);
    setStatusFeedback(null);
    try {
      const res = await saveVideoToDevice({
        url: activeResult.url,
        filename: activeResult.filename,
        blob: activeResult.blob,
        durationMs: activeResult.duration ? Math.round(activeResult.duration * 1000) : undefined,
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

  const handleSaveAll = async () => {
    if (exportResults.length === 0 || isSavingAll) return;
    setIsSavingAll(true);
    setStatusFeedback(null);
    try {
      let savedCount = 0;
      for (const item of exportResults) {
        await saveVideoToDevice({
          url: item.url,
          filename: item.filename,
          blob: item.blob,
          durationMs: item.duration ? Math.round(item.duration * 1000) : undefined,
        });
        savedCount++;
      }
      setStatusFeedback({
        type: 'success',
        message: `Saved all ${savedCount} videos to your device!`,
      });
      setTimeout(() => setStatusFeedback(null), 5000);
    } catch (err: unknown) {
      setStatusFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save all videos',
      });
      setTimeout(() => setStatusFeedback(null), 5000);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleShare = async () => {
    if (!activeResult || isSharing) return;
    setIsSharing(true);
    try {
      const res = await shareVideo({
        url: activeResult.url,
        filename: activeResult.filename,
        blob: activeResult.blob,
        durationMs: activeResult.duration ? Math.round(activeResult.duration * 1000) : undefined,
        title: activeResult.youtubeTitle,
        text: `${chapter?.name_simple || 'Quran'} (${activeResult.rangeStr}) - Recited by ${reciterName}`,
      });
      if (res.method === 'fallback') {
        setIsShareModalOpen(true);
      }
    } catch (err: unknown) {
      console.warn('Share error, opening share modal:', err);
      setIsShareModalOpen(true);
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = (text: string, setSuccess: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const isExporting = step === 'exporting' && !error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          step === 'options' ? 'max-w-md p-4 sm:p-5' : 'max-w-2xl p-5 sm:p-6'
        } bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto transition-all`}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Status Header */}
        <div className="flex items-center gap-3 mb-3.5 pb-3 border-b border-slate-100 dark:border-slate-800/80 pr-7">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            {step === 'options' ? (
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
            ) : step === 'done' && activeResult ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              {step === 'options'
                ? 'Export Video'
                : isExporting
                ? totalBatchesCount > 1
                  ? `Exporting ${currentBatchIdx + 1} of ${totalBatchesCount} (${currentBatchLabel})`
                  : 'Generating Short Video'
                : step === 'done' && activeResult
                ? exportResults.length > 1
                  ? `${exportResults.length} Videos Ready`
                  : 'Video Ready & YouTube Suite'
                : 'Export Failed'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {step === 'options'
                ? `Surah ${chapter?.name_simple || 'Quran'} • ${totalChapterAyahs} Ayahs`
                : isExporting
                ? progress.status
                : step === 'done' && activeResult
                ? 'Download, share, or copy YouTube metadata below.'
                : error}
            </p>
          </div>
        </div>

        {/* =====================================================================
            STEP 1: EXPORT OPTIONS SELECTION (COMPACT & PROFESSIONAL)
            ===================================================================== */}
        {step === 'options' && (
          <div className="space-y-2.5">
            {/* Option 1: Export Selected Ayahs */}
            <div
              onClick={() => setExportMode('selected')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                exportMode === 'selected'
                  ? 'border-emerald-500 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] ring-1 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      exportMode === 'selected'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {exportMode === 'selected' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      Export Selected Ayahs
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Current studio selection ({verses.length}{' '}
                      {verses.length === 1 ? 'ayah' : 'ayahs'})
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 whitespace-nowrap shrink-0">
                  {selectedRangeStr}
                </span>
              </div>
            </div>

            {/* Option 2: Export Whole Chapter in Range */}
            <div
              onClick={() => setExportMode('chapter_batches')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                exportMode === 'chapter_batches'
                  ? 'border-emerald-500 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] ring-1 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      exportMode === 'chapter_batches'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {exportMode === 'chapter_batches' && (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      Export Whole Chapter in Range
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Split all {totalChapterAyahs} ayahs into batch videos
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
                  {chapterBatchesPreview.length}{' '}
                  {chapterBatchesPreview.length === 1 ? 'Video' : 'Videos'}
                </span>
              </div>

              {/* Compact Batch Controls (Only shown when selected) */}
              {exportMode === 'chapter_batches' && (
                <div
                  className="mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      Ayahs per video:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="inline-flex items-center h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                        <button
                          type="button"
                          disabled={parsedBatchSize <= 1}
                          onClick={() =>
                            setAyahsPerVideoInput(String(Math.max(1, parsedBatchSize - 1)))
                          }
                          className="h-full px-2 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 transition-colors focus:outline-none"
                          title="Decrease"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={totalChapterAyahs}
                          value={ayahsPerVideoInput}
                          onChange={(e) => setAyahsPerVideoInput(e.target.value)}
                          placeholder="5"
                          className="w-10 h-full bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          disabled={parsedBatchSize >= totalChapterAyahs}
                          onClick={() =>
                            setAyahsPerVideoInput(
                              String(Math.min(totalChapterAyahs, parsedBatchSize + 1))
                            )
                          }
                          className="h-full px-2 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 transition-colors focus:outline-none"
                          title="Increase"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAyahsPerVideoInput(String(totalChapterAyahs))}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap focus:outline-none ${
                          parsedBatchSize === totalChapterAyahs
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50'
                        }`}
                      >
                        All
                      </button>
                    </div>
                  </div>

                  {/* Compact 1-line scrollable range preview */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0 mr-0.5">
                      Ranges:
                    </span>
                    {chapterBatchesPreview.map((b, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 shrink-0"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          #{idx + 1}
                        </span>
                        <span>
                          {b.startAyah === b.endAyah
                            ? b.startAyah
                            : `${b.startAyah}–${b.endAyah}`}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Compact Action Footer */}
            <div className="flex items-center justify-end gap-2 pt-1.5">
              <button
                type="button"
                onClick={handleClose}
                className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartExport}
                className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {exportMode === 'selected'
                    ? 'Export Video'
                    : `Export ${chapterBatchesPreview.length} ${
                        chapterBatchesPreview.length === 1 ? 'Video' : 'Videos'
                      }`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 2: PROGRESS BAR DURING EXPORT
            ===================================================================== */}
        {isExporting && (
          <div className="w-full space-y-4 my-6">
            {totalBatchesCount > 1 && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <span>
                  Batch Progress: Video {currentBatchIdx + 1} of {totalBatchesCount} (
                  {currentBatchLabel})
                </span>
                <span>
                  {exportResults.length} / {totalBatchesCount} Saved to Library
                </span>
              </div>
            )}

            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500 dark:text-slate-400">{progress.status}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                {progress.percent}%
              </span>
            </div>

            {totalBatchesCount > 1 && exportResults.length > 0 && (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    finishEarlyRef.current = true;
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  Stop Remaining &amp; View {exportResults.length} Finished{' '}
                  {exportResults.length === 1 ? 'Video' : 'Videos'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            ERROR STATE
            ===================================================================== */}
        {error && step !== 'done' && (
          <div className="my-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-3">
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('options');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Back to Export Options
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 3: EXPORTED RESULT AREA (WITH DROPDOWN FOR ALL EXPORTED VIDEOS)
            ===================================================================== */}
        {step === 'done' && activeResult && (
          <div className="space-y-5">
            {/* Video Dropdown Selector Bar */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/25 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {exportResults.length > 1
                      ? `Select Exported Video (${selectedResultIndex + 1} of ${exportResults.length}):`
                      : 'Exported Video:'}
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {activeResult.rangeStr}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {exportResults.length > 1 && (
                  <button
                    type="button"
                    disabled={selectedResultIndex === 0}
                    onClick={() => setSelectedResultIndex((prev) => Math.max(0, prev - 1))}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Previous Video"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <div className="relative flex-1">
                  <select
                    value={selectedResultIndex}
                    onChange={(e) => {
                      setSelectedResultIndex(Number(e.target.value));
                      setStatusFeedback(null);
                    }}
                    className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {exportResults.map((item, idx) => (
                      <option key={item.id} value={idx}>
                        Video {idx + 1} of {exportResults.length}: Surah{' '}
                        {chapter?.name_simple || 'Quran'} ({item.rangeStr})
                        {item.duration ? ` • ${Math.round(item.duration)}s` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                {exportResults.length > 1 && (
                  <button
                    type="button"
                    disabled={selectedResultIndex === exportResults.length - 1}
                    onClick={() =>
                      setSelectedResultIndex((prev) =>
                        Math.min(exportResults.length - 1, prev + 1)
                      )
                    }
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Next Video"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Top Download & Action Row */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <div className="w-28 flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-28 aspect-[9/16] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-md bg-black">
                  <video
                    key={activeResult.id}
                    src={activeResult.url}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                {activeResult.duration && (
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                    {Math.round(activeResult.duration)}s • {config.playbackSpeed || 1.0}x speed
                  </span>
                )}
              </div>

              <div className="flex-1 w-full space-y-2.5">
                {activeResult.savedToLibrary && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs animate-in fade-in">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {exportResults.length > 1
                          ? `All ${exportResults.length} videos saved to Creations Library`
                          : 'Saved to Creations Library'}
                      </span>
                    </span>
                    {onViewInCreations && (
                      <button
                        onClick={() => {
                          handleClose();
                          onViewInCreations();
                        }}
                        className="flex items-center gap-1 font-bold underline hover:opacity-80 transition-opacity shrink-0 ml-2"
                      >
                        <Film className="w-3 h-3" />
                        <span>View Library</span>
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={isSaving || isSavingAll}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/20 dark:shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-80"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>
                    {isSaving
                      ? 'Saving to Gallery...'
                      : exportResults.length > 1
                      ? `Save Video (${activeResult.rangeStr}) to Gallery (MP4)`
                      : 'Save to Gallery / Photos (MP4)'}
                  </span>
                </button>

                {exportResults.length > 1 && (
                  <button
                    onClick={handleSaveAll}
                    disabled={isSavingAll || isSaving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-all active:scale-95 disabled:opacity-80"
                  >
                    {isSavingAll ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Layers className="w-4 h-4" />
                    )}
                    <span>
                      {isSavingAll
                        ? `Saving All ${exportResults.length} Videos...`
                        : `Save All ${exportResults.length} Videos to Gallery / Device`}
                    </span>
                  </button>
                )}

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
                  <div
                    className={`flex items-center justify-center gap-1.5 text-center text-xs font-semibold rounded-xl py-2.5 px-3.5 animate-in fade-in shadow-sm ${
                      statusFeedback.type === 'error'
                        ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60'
                        : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60'
                    }`}
                  >
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
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <div className="flex items-center gap-2">
                  <YoutubeIcon className="w-4 h-4 text-red-500" />
                  <span>YouTube Creator Copy Suite</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 normal-case">
                  For {activeResult.rangeStr}
                </span>
              </div>

              {/* 1. YouTube Title Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>YouTube Video Title:</span>
                  <button
                    onClick={() => copyToClipboard(activeResult.youtubeTitle, setCopiedTitle)}
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
                  {activeResult.youtubeTitle}
                </div>
              </div>

              {/* 2. Selected Arabic Verses Box with Copy Icon */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Selected Verses (Arabic Text):</span>
                  <button
                    onClick={() => copyToClipboard(activeResult.fullArabicText, setCopiedArabic)}
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
                  {activeResult.fullArabicText}
                </div>
              </div>

              {/* 3. Translation Box with Copy Icon */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Verses Translation:</span>
                  <button
                    onClick={() =>
                      copyToClipboard(activeResult.fullTranslationText, setCopiedTrans)
                    }
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
                  {activeResult.fullTranslationText}
                </div>
              </div>

              {/* 3b. Persian Tafsir Box with Copy Icon */}
              {config.showPersianTafsir && activeResult.fullPersianText && (
                <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
                    <span>Persian Tafsir (تفسیر فارسی):</span>
                    <button
                      onClick={() =>
                        copyToClipboard(activeResult.fullPersianText, setCopiedPersian)
                      }
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
                  <div
                    className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-transparent text-xs text-slate-800 dark:text-slate-200 select-text max-h-28 overflow-y-auto whitespace-pre-line leading-relaxed font-persian text-right"
                    dir="rtl"
                  >
                    {activeResult.fullPersianText}
                  </div>
                </div>
              )}

              {/* 4. Complete Description with Copy Icon */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Full YouTube Description &amp; Tags:</span>
                  <button
                    onClick={() => copyToClipboard(activeResult.youtubeDescription, setCopiedDesc)}
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
                  {activeResult.youtubeDescription}
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

      {/* Interactive Share Modal (Social apps, Copy caption, Native chooser) */}
      {step === 'done' && activeResult && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          videoUrl={activeResult.url}
          videoBlob={activeResult.blob}
          filename={activeResult.filename}
          title={activeResult.youtubeTitle}
          text={`${chapter?.name_simple || 'Quran'} (${activeResult.rangeStr}) - Recited by ${reciterName}`}
          surahName={chapter?.name_simple}
          ayahRange={activeResult.rangeStr}
          reciterName={reciterName}
        />
      )}
    </div>
  );
};
