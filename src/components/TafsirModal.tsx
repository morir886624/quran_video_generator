'use client';

import React, { useState, useEffect } from 'react';
import { fetchTafsir, fetchPersianTafsirAyah } from '@/lib/quran-api';
import { BookOpen, X, Copy, Check, Loader2 } from 'lucide-react';

interface TafsirModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseKey: string | null;
  verseTextArabic?: string;
}

type TafsirSource = 'persian-mokhtasar' | 'fr-tafsir-as-saadi' | 'ibn-kathir';

export const TafsirModal: React.FC<TafsirModalProps> = ({
  isOpen,
  onClose,
  verseKey,
  verseTextArabic,
}) => {
  const [selectedSource, setSelectedSource] = useState<TafsirSource>('persian-mokhtasar');
  const [tafsirData, setTafsirData] = useState<{ text: string; resourceName: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !verseKey) {
      setTafsirData(null);
      return;
    }

    const [surahStr, ayahStr] = verseKey.split(':');
    const surahId = parseInt(surahStr, 10);
    const ayahNumber = parseInt(ayahStr, 10);

    setIsLoading(true);

    if (selectedSource === 'ibn-kathir') {
      fetchTafsir(verseKey, 169)
        .then((res) => {
          setTafsirData(res);
        })
        .catch((err) => {
          console.error('Error fetching tafsir:', err);
          setTafsirData({
            text: 'Unable to load Tafsir. Please check your network connection.',
            resourceName: 'Tafsir Ibn Kathir',
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      const edition = selectedSource;
      const resourceName =
        edition === 'persian-mokhtasar'
          ? 'تفسیر المختصر (Persian Al-Mukhtasar)'
          : 'تفسیر السعدی (Tafsir As-Saadi - Persian)';

      fetchPersianTafsirAyah(surahId, ayahNumber, edition)
        .then((text) => {
          setTafsirData({
            text: text || 'تفسیر برای این آیه یافت نشد.',
            resourceName,
          });
        })
        .catch((err) => {
          console.error('Error fetching Persian tafsir:', err);
          setTafsirData({
            text: 'خطا در بارگذاری تفسیر. لطفا اتصال اینترنت خود را بررسی کنید.',
            resourceName,
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, verseKey, selectedSource]);

  if (!isOpen || !verseKey) return null;

  const handleCopy = () => {
    if (!tafsirData) return;
    const plainText = tafsirData.text.replace(/<[^>]+>/g, '').trim();
    navigator.clipboard.writeText(`Tafsir for Ayah ${verseKey}:\n\n${plainText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPersian = selectedSource === 'persian-mokhtasar' || selectedSource === 'fr-tafsir-as-saadi';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/90 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                {tafsirData?.resourceName || 'Tafsir Commentary'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ayah {verseKey} • تفسیر و شرح آیات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {tafsirData && !isLoading && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-transparent"
                title="Copy Tafsir"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tafsir Edition Selector Tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setSelectedSource('persian-mokhtasar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSource === 'persian-mokhtasar'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🇮🇷 تفسیر المختصر (فارسی)
          </button>
          <button
            onClick={() => setSelectedSource('fr-tafsir-as-saadi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSource === 'fr-tafsir-as-saadi'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🇮🇷 تفسیر السعدی (فارسی)
          </button>
          <button
            onClick={() => setSelectedSource('ibn-kathir')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSource === 'ibn-kathir'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🇬🇧 Ibn Kathir (English)
          </button>
        </div>

        {/* Verse Arabic pill in header if available */}
        {verseTextArabic && (
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 text-right font-quran text-xl text-emerald-950 dark:text-amber-200/90">
            {verseTextArabic}
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Loading Tafsir commentary...</span>
            </div>
          ) : (
            <div
              className={`prose dark:prose-invert prose-emerald max-w-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed ${
                isPersian ? 'font-persian text-right text-base' : 'font-sans'
              }`}
              dir={isPersian ? 'rtl' : 'ltr'}
              dangerouslySetInnerHTML={{ __html: tafsirData?.text || '' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
