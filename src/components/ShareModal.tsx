'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  MessageCircle,
  Send,
  Loader2,
} from 'lucide-react';
import { saveVideoToDevice, shareVideo } from '@/lib/video-recorder';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoBlob?: Blob;
  filename: string;
  title: string;
  text?: string;
  surahName?: string;
  ayahRange?: string;
  reciterName?: string;
}

function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.677.15-.2.301-.776.979-.952 1.18-.175.201-.351.226-.652.075-.301-.15-1.27-.468-2.42-1.493-.894-.798-1.498-1.784-1.674-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.201-.301.301-.501.101-.201.05-.376-.025-.526-.075-.15-.677-1.631-.927-2.233-.244-.587-.493-.507-.677-.517l-.577-.01c-.2 0-.526.075-.802.376-.276.301-1.053 1.029-1.053 2.509 0 1.48 1.078 2.909 1.229 3.109.15.201 2.122 3.24 5.141 4.544.718.311 1.279.497 1.716.636.722.23 1.379.197 1.899.12.579-.087 1.78-.727 2.03-1.429.251-.702.251-1.304.176-1.429-.075-.125-.276-.201-.577-.351zM12.04 2C6.54 2 2.08 6.46 2.08 11.96c0 1.9.53 3.68 1.45 5.2L2 22l4.98-1.5c1.46.84 3.14 1.32 4.92 1.32 5.5 0 9.96-4.46 9.96-9.96C21.86 6.46 17.4 2 12.04 2z" />
    </svg>
  );
}

function TelegramIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

function TwitterIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  videoBlob,
  filename,
  title,
  text = 'Created with Quran Video Studio',
  surahName,
  ayahRange,
  reciterName,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSharingNative, setIsSharingNative] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const fullShareText = `${title}\n${text ? `${text}\n` : ''}${
    surahName ? `📖 Surah: ${surahName} (${ayahRange || ''})\n` : ''
  }${reciterName ? `🎙️ Reciter: ${reciterName}\n` : ''}#Quran #Islam #QuranRecitation`;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(fullShareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    setIsSharingNative(true);
    setFeedback(null);
    try {
      const res = await shareVideo({
        url: videoUrl,
        filename,
        blob: videoBlob,
        title,
        text: fullShareText,
      });
      if (res.shared) {
        onClose();
      }
    } catch (e) {
      console.warn('Native share failed:', e);
      setFeedback('Select an app below to share');
    } finally {
      setIsSharingNative(false);
    }
  };

  const handleSaveVideo = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await saveVideoToDevice({
        url: videoUrl,
        filename,
        blob: videoBlob,
      });
      setFeedback(res.message || 'Saved successfully');
      setTimeout(() => setFeedback(null), 4000);
    } catch (e: unknown) {
      setFeedback(e instanceof Error ? e.message : 'Failed to save video');
    } finally {
      setIsSaving(false);
    }
  };

  // Social Sharing URLs
  const encodedText = encodeURIComponent(fullShareText);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent('https://quran.com')}&text=${encodedText}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://quran.com')}&quote=${encodedText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Share Quran Video
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {surahName ? `${surahName} • ${ayahRange}` : 'Share with your favorite apps'}
            </p>
          </div>
        </div>

        {/* Native System Share Button */}
        <button
          onClick={handleNativeShare}
          disabled={isSharingNative}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-950/20 active:scale-95 transition-all disabled:opacity-75"
        >
          {isSharingNative ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4" />
          )}
          <span>{isSharingNative ? 'Opening App Chooser...' : 'Open in Phone Apps (Share Sheet)'}</span>
        </button>

        {/* Apps Grid */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Direct Share to Social Apps
          </span>
          <div className="grid grid-cols-4 gap-2">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#25D366] hover:scale-105 border border-emerald-200 dark:border-emerald-900/50 transition-all shadow-xs"
            >
              <WhatsAppIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-[#229ED9] hover:scale-105 border border-sky-200 dark:border-sky-900/50 transition-all shadow-xs"
            >
              <TelegramIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Telegram</span>
            </a>

            {/* X / Twitter */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white hover:scale-105 border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
            >
              <TwitterIcon className="w-5 h-5 mb-1 mt-0.5" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">X / Post</span>
            </a>

            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#1877F2] hover:scale-105 border border-blue-200 dark:border-blue-900/50 transition-all shadow-xs"
            >
              <FacebookIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Facebook</span>
            </a>
          </div>
        </div>

        {/* Secondary Actions: Copy & Save */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCopyCaption}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Caption Copied!' : 'Copy Caption'}</span>
          </button>

          <button
            onClick={handleSaveVideo}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Video'}</span>
          </button>
        </div>

        {/* Feedback notification */}
        {feedback && (
          <div className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 py-1 animate-in fade-in">
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
};

