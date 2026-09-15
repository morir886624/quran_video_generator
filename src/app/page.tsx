'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chapter, Reciter, Verse, VideoConfig } from '@/types/quran';
import { DEFAULT_VIDEO_CONFIG, POPULAR_RECITERS } from '@/lib/constants';
import { fetchAudioFiles, fetchChapters, fetchVerses } from '@/lib/quran-api';
import { QuranNavbar } from '@/components/QuranNavbar';
import { ReaderView } from '@/components/ReaderView';
import { VideoStudio } from '@/components/VideoStudio';
import { SurahDrawer } from '@/components/SurahDrawer';
import { BottomTabBar } from '@/components/BottomTabBar';
import { ReciterModal } from '@/components/ReciterModal';
import { SettingsModal } from '@/components/SettingsModal';
import { TafsirModal } from '@/components/TafsirModal';
import { SurahInfoModal } from '@/components/SurahInfoModal';
import { TranslationSelectorModal } from '@/components/TranslationSelectorModal';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<number>(1);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selectedVerseKeys, setSelectedVerseKeys] = useState<Set<string>>(
    new Set(['1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7'])
  );

  const [currentReciter, setCurrentReciter] = useState<Reciter>(POPULAR_RECITERS[0]);
  const [chapterAudioMap, setChapterAudioMap] = useState<Record<string, string>>({});
  const [videoConfig, setVideoConfig] = useState<VideoConfig>(DEFAULT_VIDEO_CONFIG);

  const [selectedTranslationId, setSelectedTranslationId] = useState<number>(20);
  const [selectedTranslationName, setSelectedTranslationName] = useState<string>('Saheeh International');

  // Modals
  const [activeTab, setActiveTab] = useState<'reader' | 'studio' | 'reciters'>('studio');
  const [isSurahDrawerOpen, setIsSurahDrawerOpen] = useState<boolean>(false);
  const [isRecitersModalOpen, setIsRecitersModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isTafsirOpen, setIsTafsirOpen] = useState<boolean>(false);
  const [activeTafsirVerseKey, setActiveTafsirVerseKey] = useState<string | null>(null);
  const [activeTafsirArabic, setActiveTafsirArabic] = useState<string>('');
  const [isSurahInfoOpen, setIsSurahInfoOpen] = useState<boolean>(false);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load theme preference from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('quran_theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch (e) {
      console.error('Failed to load theme:', e);
    }
  }, []);

  const [isLoadingVerses, setIsLoadingVerses] = useState<boolean>(true);
  const [activePlayingKey, setActivePlayingKey] = useState<string | null>(null);
  const [singleAyahAudio, setSingleAyahAudio] = useState<HTMLAudioElement | null>(null);

  // 1. Initial load of all 114 Surahs
  useEffect(() => {
    fetchChapters()
      .then((data) => {
        setChapters(data);
        const fatihah = data.find((c) => c.id === 1) || data[0];
        setCurrentChapter(fatihah);
      })
      .catch((err) => console.error('Failed to load chapters:', err));
  }, []);

  // 2. Load Verses when Chapter or Translation Changes
  const loadChapterData = useCallback(
    async (chapterId: number, startAyah?: number, endAyah?: number, transId?: number) => {
      setIsLoadingVerses(true);
      const activeTransId = transId || selectedTranslationId;
      try {
        const fetchedVerses = await fetchVerses(chapterId, undefined, undefined, activeTransId);
        setVerses(fetchedVerses);
        setCurrentChapterId(chapterId);

        // Update current chapter object
        if (chapters.length > 0) {
          const chap = chapters.find((c) => c.id === chapterId) || null;
          setCurrentChapter(chap);
        }

        // Set initial selected range if specified or new chapter
        const s = startAyah || 1;
        const e = endAyah || Math.min(fetchedVerses.length, 5);
        const initialKeys = new Set<string>();
        for (let i = s; i <= e; i++) {
          initialKeys.add(`${chapterId}:${i}`);
        }
        setSelectedVerseKeys(initialKeys);

        // Fetch audio files for this chapter & reciter
        const audioFiles = await fetchAudioFiles(currentReciter.id, chapterId);
        const map: Record<string, string> = {};
        audioFiles.forEach((f) => {
          map[f.verse_key] = f.url;
        });
        setChapterAudioMap(map);
      } catch (err) {
        console.error('Error loading chapter data:', err);
      } finally {
        setIsLoadingVerses(false);
      }
    },
    [chapters, currentReciter.id, selectedTranslationId]
  );

  useEffect(() => {
    if (chapters.length > 0) {
      loadChapterData(currentChapterId);
    }
  }, [chapters.length, currentChapterId, loadChapterData]);

  // 3. Reload audio map when reciter changes
  useEffect(() => {
    if (currentChapterId) {
      fetchAudioFiles(currentReciter.id, currentChapterId)
        .then((files) => {
          const map: Record<string, string> = {};
          files.forEach((f) => {
            map[f.verse_key] = f.url;
          });
          setChapterAudioMap(map);
        })
        .catch((e) => console.error('Error updating audio files:', e));
    }
  }, [currentReciter.id, currentChapterId]);

  // Selected Verses for Video Studio
  const selectedVerses = useMemo(() => {
    return verses.filter((v) => selectedVerseKeys.has(v.verse_key));
  }, [verses, selectedVerseKeys]);

  // Mapped Audio URLs for the selected verses
  const selectedAudioUrls = useMemo(() => {
    return selectedVerses.map((v) => {
      return (
        chapterAudioMap[v.verse_key] ||
        `https://verses.quran.com/Alafasy/mp3/${String(currentChapterId).padStart(
          3,
          '0'
        )}${String(v.verse_number).padStart(3, '0')}.mp3`
      );
    });
  }, [selectedVerses, chapterAudioMap, currentChapterId]);

  // Verse Selection Toggles
  const handleToggleVerse = useCallback((verseKey: string) => {
    setSelectedVerseKeys((prev) => {
      const next = new Set(prev);
      if (next.has(verseKey)) {
        if (next.size > 1) next.delete(verseKey);
      } else {
        next.add(verseKey);
      }
      return next;
    });
  }, []);

  const handleSelectRange = useCallback(
    (start: number, end: number) => {
      const keys = new Set<string>();
      for (let i = start; i <= end; i++) {
        keys.add(`${currentChapterId}:${i}`);
      }
      setSelectedVerseKeys(keys);
    },
    [currentChapterId]
  );

  // Single ayah playback inside reader
  const handlePlayAyahAudio = useCallback(
    (verseKey: string) => {
      if (activePlayingKey === verseKey) {
        if (singleAyahAudio) {
          singleAyahAudio.pause();
        }
        setActivePlayingKey(null);
        return;
      }

      if (singleAyahAudio) {
        singleAyahAudio.pause();
      }

      const audioUrl = chapterAudioMap[verseKey];
      if (!audioUrl) return;

      const audio = new Audio(audioUrl);
      setSingleAyahAudio(audio);
      setActivePlayingKey(verseKey);

      audio.play().catch(() => setActivePlayingKey(null));
      audio.onended = () => setActivePlayingKey(null);
    },
    [activePlayingKey, chapterAudioMap, singleAyahAudio]
  );

  const handleOpenTafsir = (verseKey: string, arabicText: string) => {
    setActiveTafsirVerseKey(verseKey);
    setActiveTafsirArabic(arabicText);
    setIsTafsirOpen(true);
  };

  const handleSelectTranslation = (id: number, name: string) => {
    setSelectedTranslationId(id);
    setSelectedTranslationName(name);
    loadChapterData(currentChapterId, undefined, undefined, id);
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('quran_theme', nextTheme);
    } catch (e) {}
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B1329] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Quran.com Mobile Top Navbar */}
      <QuranNavbar
        currentChapter={currentChapter}
        onOpenSurahDrawer={() => setIsSurahDrawerOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedVersesCount={selectedVerseKeys.size}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {isLoadingVerses ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
            <p className="text-sm font-medium text-slate-400">
              Loading Quran verses &amp; audio...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'reader' && currentChapter && (
              <ReaderView
                chapter={currentChapter}
                verses={verses}
                selectedVerseKeys={selectedVerseKeys}
                onToggleVerse={handleToggleVerse}
                onSelectRange={handleSelectRange}
                onGoToStudio={() => setActiveTab('studio')}
                activePlayingKey={activePlayingKey}
                onPlayAyahAudio={handlePlayAyahAudio}
                onOpenTafsir={handleOpenTafsir}
                onOpenSurahInfo={() => setIsSurahInfoOpen(true)}
                onOpenTranslations={() => setIsTranslationModalOpen(true)}
                currentTranslationName={selectedTranslationName}
              />
            )}

            {activeTab === 'studio' && (
              <VideoStudio
                chapter={currentChapter}
                verses={selectedVerses.length > 0 ? selectedVerses : verses.slice(0, 1)}
                audioUrls={selectedAudioUrls}
                config={videoConfig}
                onChangeConfig={(updates) =>
                  setVideoConfig((prev) => ({ ...prev, ...updates }))
                }
                currentReciter={currentReciter}
                onSelectReciter={(r) => setCurrentReciter(r)}
                onBackToReader={() => setActiveTab('reader')}
              />
            )}
          </>
        )}
      </main>

      {/* Quran.com Mobile Bottom Tab Navigation */}
      <BottomTabBar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'reciters') {
            setIsRecitersModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        selectedVersesCount={selectedVerseKeys.size}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Surah Drawer / Search Modal */}
      <SurahDrawer
        isOpen={isSurahDrawerOpen}
        onClose={() => setIsSurahDrawerOpen(false)}
        chapters={chapters}
        currentChapterId={currentChapterId}
        onSelectChapter={(id, start, end) => loadChapterData(id, start, end)}
      />

      {/* Reciter Selector Modal */}
      <ReciterModal
        isOpen={isRecitersModalOpen}
        onClose={() => setIsRecitersModalOpen(false)}
        selectedReciterId={currentReciter.id}
        onSelectReciter={(r) => setCurrentReciter(r)}
      />

      {/* Tafsir Ibn Kathir Modal */}
      <TafsirModal
        isOpen={isTafsirOpen}
        onClose={() => setIsTafsirOpen(false)}
        verseKey={activeTafsirVerseKey}
        verseTextArabic={activeTafsirArabic}
      />

      {/* Surah Info Modal */}
      <SurahInfoModal
        isOpen={isSurahInfoOpen}
        onClose={() => setIsSurahInfoOpen(false)}
        chapter={currentChapter}
      />

      {/* Translation Selector Modal */}
      <TranslationSelectorModal
        isOpen={isTranslationModalOpen}
        onClose={() => setIsTranslationModalOpen(false)}
        selectedTranslationId={selectedTranslationId}
        onSelectTranslation={handleSelectTranslation}
      />

      {/* App Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
}
