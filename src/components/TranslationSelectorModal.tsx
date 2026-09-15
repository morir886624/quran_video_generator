'use client';

import React, { useState, useEffect } from 'react';
import { fetchAvailableTranslations } from '@/lib/quran-api';
import { Languages, X, Check, Search } from 'lucide-react';

interface TranslationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTranslationId: number;
  onSelectTranslation: (id: number, name: string) => void;
}

export const TranslationSelectorModal: React.FC<TranslationSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedTranslationId,
  onSelectTranslation,
}) => {
  const [translations, setTranslations] = useState<
    Array<{ id: number; name: string; author_name: string; language_name: string }>
  >([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetchAvailableTranslations().then(setTranslations);
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = translations.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.language_name.toLowerCase().includes(search.toLowerCase()) ||
      t.author_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/90 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Select Translation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Translations from Quran.com</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search language, author or translation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-2">
          {filtered.map((t) => {
            const isSelected = t.id === selectedTranslationId;
            return (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTranslation(t.id, t.name);
                  onClose();
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all active:scale-[0.99] ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/40'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400">
                      {t.language_name}
                    </span>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {t.author_name || t.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.name}</p>
                </div>

                {isSelected && (
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

