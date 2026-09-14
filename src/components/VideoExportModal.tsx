'use client';

import React, { useState, useEffect } from 'react';
import { Chapter, Verse, VideoConfig } from '@/types/quran';
import {
  exportVideo,
  ExportProgress,
  shareOrDownloadVideo,
} from '@/lib/video-recorder';
import {
  Video,
  Download,
  Share2,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  verses: Verse[];
  audioUrls: string[];
  chapter: Chapter | null;
  config: VideoConfig;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  verses,
  audioUrls,
  chapter,
  config,
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

  useEffect(() => {
    if (!isOpen) {
      setIsExporting(false);
      setExportResult(null);
      setError(null);
      return;
    }

    // Automatically trigger export when modal opens
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
    shareOrDownloadVideo(
      exportResult.url,
      exportResult.filename,
      exportResult.blob
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0F172A] border border-slate-700/90 rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 shadow-lg">
          {isExporting ? (
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          ) : exportResult ? (
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          ) : (
            <AlertCircle className="w-7 h-7 text-rose-400" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-1">
          {isExporting
            ? 'Generating Quran Short Video'
            : exportResult
            ? 'Video Ready!'
            : 'Export Failed'}
        </h3>

        <p className="text-xs text-slate-400 mb-6">
          {isExporting
            ? 'Synchronizing recitation audio with centered calligraphy...'
            : exportResult
            ? 'Your video is ready to share on Instagram Reels, TikTok, and WhatsApp!'
            : error}
        </p>

        {/* Exporting Progress State */}
        {isExporting && (
          <div className="w-full space-y-3 mb-6">
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">{progress.status}</span>
              <span className="text-emerald-400 font-mono">
                {progress.percent}%
              </span>
            </div>
          </div>
        )}

        {/* Video Result Preview */}
        {exportResult && (
          <div className="w-full space-y-4 mb-6">
            <div className="w-full max-w-[200px] mx-auto aspect-[9/16] rounded-2xl overflow-hidden border border-slate-700 shadow-xl bg-black">
              <video
                src={exportResult.url}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Save / Download Video</span>
              </button>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Share to Reels / TikTok</span>
              </button>
            </div>
          </div>
        )}

        {/* Done / Close Button */}
        {exportResult && (
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};

