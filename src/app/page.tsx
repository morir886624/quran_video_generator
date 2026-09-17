'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useBackButton, dispatchBackButton } from '@/lib/back-button';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PermissionPrompt } from '@/components/PermissionPrompt';
import { requestAppPermissions } from '@/lib/permissions';
import { Chapter, Reciter, Verse, VideoConfig } from '@/types/quran';
import { DEFAULT_VIDEO_CONFIG, POPULAR_RECITERS } from '@/lib/constants';
import { fetchAudioFiles, fetchChapters, fetchVerses } from '@/lib/quran-api';
import { QuranNavbar } from '@/components/QuranNavbar';
import { ReaderView } from '@/components/ReaderView';
import { VideoStudio } from '@/components/VideoStudio';
import { CreationsView } from '@/components/CreationsView';
import { ResumeBanner } from '@/components/ResumeBanner';
import { SurahDrawer } from '@/components/SurahDrawer';
import { BottomTabBar } from '@/components/BottomTabBar';
import { ReciterModal } from '@/components/ReciterModal';
import { SettingsView } from '@/components/SettingsView';
import { TafsirModal } from '@/components/TafsirModal';
import { SurahInfoModal } from '@/components/SurahInfoModal';
import { TranslationSelectorModal } from '@/components/TranslationSelectorModal';
import {
  ProjectDraft,
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  getStorageUsageSummary,
} from '@/lib/storage-db';
import {
  UserPreferences,
  DEFAULT_USER_PREFERENCES,
  loadUserPreferences,
  saveUserPreferences,
  resetUserPreferences,
} from '@/lib/preferences';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<number>(1);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selectedVerseKeys, setSelectedVerseKeys] = useState<Set<string>>(
    new Set(['1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7'])
  );

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [currentReciter, setCurrentReciter] = useState<Reciter>(POPULAR_RECITERS[0]);
  const [chapterAudioMap, setChapterAudioMap] = useState<Record<string, string>>({});
  const [videoConfig, setVideoConfig] = useState<VideoConfig>(DEFAULT_VIDEO_CONFIG);

  const [selectedTranslationId, setSelectedTranslationId] = useState<number>(20);
  const [selectedTranslationName, setSelectedTranslationName] = useState<string>('Saheeh International');

  // Modals & Navigation
  const [activeTab, setActiveTab] = useState<'reader' | 'studio' | 'creations' | 'settings'>('studio');
  const [resumeCandidate, setResumeCandidate] = useState<ProjectDraft | null>(null);
  const [creationsCount, setCreationsCount] = useState<number>(0);
  const [isSurahDrawerOpen, setIsSurahDrawerOpen] = useState<boolean>(false);
  const [isRecitersModalOpen, setIsRecitersModalOpen] = useState<boolean>(false);
  const [isTafsirOpen, setIsTafsirOpen] = useState<boolean>(false);
  const [activeTafsirVerseKey, setActiveTafsirVerseKey] = useState<string | null>(null);
  const [activeTafsirArabic, setActiveTafsirArabic] = useState<string>('');
  const [isSurahInfoOpen, setIsSurahInfoOpen] = useState<boolean>(false);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Native exit confirmation toast state
  const [showExitToast, setShowExitToast] = useState<boolean>(false);
  const lastBackPressRef = useRef<number>(0);

  // Wire hardware back button for all root modals & drawers
  useBackButton(showOnboarding, () => setShowOnboarding(false), 30);
  useBackButton(isSurahDrawerOpen, () => setIsSurahDrawerOpen(false), 20);
  useBackButton(isRecitersModalOpen, () => setIsRecitersModalOpen(false), 20);
  useBackButton(isTafsirOpen, () => setIsTafsirOpen(false), 20);
  useBackButton(isSurahInfoOpen, () => setIsSurahInfoOpen(false), 20);
  useBackButton(isTranslationModalOpen, () => setIsTranslationModalOpen(false), 20);

  // Native Android hardware back button listener
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListenerHandler: { remove: () => void } | null = null;

    App.addListener('backButton', () => {
      // 1. Check if any open modal / drawer / subcomponent handles the back button
      const handled = dispatchBackButton();
      if (handled) return;

      // 2. If user is in a non-studio tab, navigate back to studio tab
      if (activeTab !== 'studio') {
        setActiveTab('studio');
        return;
      }

      // 3. Double-tap to exit cleanly on Android
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        App.exitApp();
      } else {
        lastBackPressRef.current = now;
        setShowExitToast(true);
        setTimeout(() => setShowExitToast(false), 2000);
      }
    }).then((handler) => {
      backListenerHandler = handler;
    });

    return () => {
      if (backListenerHandler) {
        backListenerHandler.remove();
      }
    };
  }, [activeTab]);

  // Request standard Android permissions (voice, sound, storage) like other Android apps
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const timer = setTimeout(() => {
      requestAppPermissions().catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Load theme and user preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('quran_theme') as 'dark' | 'light' | null;
      const activeTheme = savedTheme || 'light';
      if (activeTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      document.documentElement.setAttribute('data-theme', activeTheme);
      setTheme(activeTheme);

      // Check if user has completed first-start onboarding
      const onboardingCompleted = localStorage.getItem('quran_onboarding_completed');
      if (!onboardingCompleted) {
        setShowOnboarding(true);
      }

      const savedPrefs = loadUserPreferences();
      setPreferences(savedPrefs);
      if (savedPrefs.reciterId) {
        const rec = POPULAR_RECITERS.find((r) => r.id === savedPrefs.reciterId);
        if (rec) setCurrentReciter(rec);
      }
      if (savedPrefs.translationId) {
        setSelectedTranslationId(savedPrefs.translationId);
      }
      if (savedPrefs.translationName) {
        setSelectedTranslationName(savedPrefs.translationName);
      }
    } catch {
      // ignore
    }
  }, []);

  const [isLoadingVerses, setIsLoadingVerses] = useState<boolean>(true);
  const [activePlayingKey, setActivePlayingKey] = useState<string | null>(null);
  const [singleAyahAudio, setSingleAyahAudio] = useState<HTMLAudioElement | null>(null);

  // 1. Load Verses when Chapter or Translation Changes
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
        const audioFiles = await fetchAudioFiles(currentReciter.id, chapterId, currentReciter.audioSubfolder);
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
    [chapters, currentReciter, selectedTranslationId]
  );

  // 2. Initial load of all 114 Surahs and default Chapter
  useEffect(() => {
    fetchChapters()
      .then((data) => {
        setChapters(data);
        const fatihah = data.find((c) => c.id === 1) || data[0];
        setCurrentChapter(fatihah);
        loadChapterData(fatihah ? fatihah.id : 1);
      })
      .catch((err) => console.error('Failed to load chapters:', err));
  }, [loadChapterData]);

  // 3. Reload audio map when reciter changes
  useEffect(() => {
    if (currentChapterId) {
      let isCancelled = false;
      fetchAudioFiles(currentReciter.id, currentChapterId, currentReciter.audioSubfolder)
        .then((files) => {
          if (isCancelled) return;
          const map: Record<string, string> = {};
          files.forEach((f) => {
            map[f.verse_key] = f.url;
          });
          setChapterAudioMap(map);
        })
        .catch((e) => console.error('Error updating audio files:', e));

      return () => {
        isCancelled = true;
      };
    }
  }, [currentReciter, currentChapterId]);

  // Selected Verses for Video Studio
  const selectedVerses = useMemo(() => {
    return verses.filter((v) => selectedVerseKeys.has(v.verse_key));
  }, [verses, selectedVerseKeys]);

  // Mapped Audio URLs for the selected verses
  const selectedAudioUrls = useMemo(() => {
    return selectedVerses.map((v) => {
      if (chapterAudioMap[v.verse_key]) {
        return chapterAudioMap[v.verse_key];
      }
      const padC = String(currentChapterId).padStart(3, '0');
      const padV = String(v.verse_number).padStart(3, '0');
      if (currentReciter.audioSubfolder) {
        return `https://everyayah.com/data/${currentReciter.audioSubfolder}/${padC}${padV}.mp3`;
      }
      return `https://verses.quran.com/Alafasy/mp3/${padC}${padV}.mp3`;
    });
  }, [selectedVerses, chapterAudioMap, currentChapterId, currentReciter]);

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

  const handleSelectAllVerses = useCallback(() => {
    if (!verses || verses.length === 0) return;
    const keys = new Set<string>();
    verses.forEach((v) => keys.add(v.verse_key));
    setSelectedVerseKeys(keys);
  }, [verses]);

  const handleClearVerses = useCallback(() => {
    if (verses.length > 0) {
      setSelectedVerseKeys(new Set([verses[0].verse_key]));
    }
  }, [verses]);

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

      let audioUrl = chapterAudioMap[verseKey];
      if (!audioUrl) {
        const [cStr, vStr] = verseKey.split(':');
        const padC = String(cStr).padStart(3, '0');
        const padV = String(vStr).padStart(3, '0');
        if (currentReciter.audioSubfolder) {
          audioUrl = `https://everyayah.com/data/${currentReciter.audioSubfolder}/${padC}${padV}.mp3`;
        }
      }
      if (!audioUrl) return;

      const audio = new Audio(audioUrl);
      setSingleAyahAudio(audio);
      setActivePlayingKey(verseKey);

      audio.play().catch(() => setActivePlayingKey(null));
      audio.onended = () => setActivePlayingKey(null);
    },
    [activePlayingKey, chapterAudioMap, singleAyahAudio, currentReciter]
  );

  const handleOpenTafsir = (verseKey: string, arabicText: string) => {
    setActiveTafsirVerseKey(verseKey);
    setActiveTafsirArabic(arabicText);
    setIsTafsirOpen(true);
  };

  const handleSelectReciter = useCallback(
    (rec: Reciter) => {
      if (singleAyahAudio) {
        try {
          singleAyahAudio.pause();
          singleAyahAudio.removeAttribute('src');
          singleAyahAudio.src = '';
          singleAyahAudio.load();
        } catch {}
        setSingleAyahAudio(null);
      }
      setActivePlayingKey(null);
      setChapterAudioMap({}); // Reset audio map immediately so stale reciter URLs are not reused
      setCurrentReciter(rec);
      setPreferences((prev) => {
        const next = { ...prev, reciterId: rec.id };
        saveUserPreferences({ reciterId: rec.id });
        return next;
      });
    },
    [singleAyahAudio]
  );

  const handleSelectTranslation = useCallback(
    (id: number, name: string) => {
      setSelectedTranslationId(id);
      setSelectedTranslationName(name);
      setPreferences((prev) => {
        const next = { ...prev, translationId: id, translationName: name };
        saveUserPreferences({ translationId: id, translationName: name });
        return next;
      });
      loadChapterData(currentChapterId, undefined, undefined, id);
    },
    [currentChapterId, loadChapterData]
  );

  const handleUpdatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      const updated = saveUserPreferences(updates);
      setPreferences(updated);

      if (updates.reciterId && updates.reciterId !== currentReciter.id) {
        const rec = POPULAR_RECITERS.find((r) => r.id === updates.reciterId);
        if (rec) setCurrentReciter(rec);
      }

      if (updates.translationId && updates.translationId !== selectedTranslationId) {
        setSelectedTranslationId(updates.translationId);
        if (updates.translationName) {
          setSelectedTranslationName(updates.translationName);
        }
        loadChapterData(currentChapterId, undefined, undefined, updates.translationId);
      }
    },
    [currentReciter.id, selectedTranslationId, currentChapterId, loadChapterData]
  );

  const handleResetPreferences = useCallback(() => {
    const def = resetUserPreferences();
    setPreferences(def);
    const defaultRec =
      POPULAR_RECITERS.find((r) => r.id === def.reciterId) || POPULAR_RECITERS[0];
    setCurrentReciter(defaultRec);
    setSelectedTranslationId(def.translationId);
    setSelectedTranslationName(def.translationName);
    loadChapterData(currentChapterId, undefined, undefined, def.translationId);
  }, [currentChapterId, loadChapterData]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('quran_theme', nextTheme);
    } catch {}
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // ---------------------------------------------------------------------------
  // PERSISTENCE: Check Previous Session & Storage on Mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    getActiveSession()
      .then((session) => {
        if (session && session.chapterId && session.verseKeys?.length > 0) {
          // Check if session has customization or different chapter/verses
          setResumeCandidate(session);
        }
      })
      .catch((e) => console.warn('Failed to check active session:', e));

    getStorageUsageSummary()
      .then((usage) => setCreationsCount(usage.videoCount))
      .catch(() => {});
  }, []);

  const refreshCreationsCount = useCallback(() => {
    getStorageUsageSummary()
      .then((usage) => setCreationsCount(usage.videoCount))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCreationsCount();
  }, [activeTab, refreshCreationsCount]);

  // ---------------------------------------------------------------------------
  // PERSISTENCE: Auto-save active in-progress video session (debounced 1s)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!currentChapter || verses.length === 0 || selectedVerseKeys.size === 0) return;

    const timer = setTimeout(() => {
      saveActiveSession({
        title: `Surah ${currentChapter.name_simple} (${selectedVerseKeys.size} ayahs)`,
        chapterId: currentChapterId,
        chapterName: currentChapter.name_simple,
        verseKeys: Array.from(selectedVerseKeys),
        reciterId: currentReciter.id,
        reciterName: currentReciter.name,
        translationId: selectedTranslationId,
        videoConfig,
      }).catch((e) => console.warn('Autosave error:', e));
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    currentChapter,
    currentChapterId,
    selectedVerseKeys,
    currentReciter,
    selectedTranslationId,
    videoConfig,
    verses.length,
  ]);

  // ---------------------------------------------------------------------------
  // Session Resume & Project Handlers
  // ---------------------------------------------------------------------------
  const handleResumeSession = async (session: ProjectDraft) => {
    setResumeCandidate(null);
    await loadChapterData(session.chapterId);
    setSelectedVerseKeys(new Set(session.verseKeys));
    if (session.reciterId) {
      const rec = POPULAR_RECITERS.find((r) => r.id === session.reciterId);
      if (rec) setCurrentReciter(rec);
    }
    if (session.translationId) {
      setSelectedTranslationId(session.translationId);
    }
    if (session.videoConfig) {
      setVideoConfig(session.videoConfig);
    }
    setActiveTab('studio');
  };

  const handleDismissResume = () => {
    setResumeCandidate(null);
    clearActiveSession().catch(() => {});
  };

  const handleResetNewProject = () => {
    setVideoConfig(DEFAULT_VIDEO_CONFIG);
    const initialKeys = new Set<string>();
    const maxAyahs = Math.min(verses.length || 5, 5);
    for (let i = 1; i <= maxAyahs; i++) {
      initialKeys.add(`${currentChapterId}:${i}`);
    }
    setSelectedVerseKeys(initialKeys);
    clearActiveSession().catch(() => {});
  };

  const handleLoadProjectSnapshot = async (snapshot: {
    chapterId: number;
    verseKeys: string[];
    reciterId?: number;
    translationId?: number;
    videoConfig?: VideoConfig;
  }) => {
    await loadChapterData(snapshot.chapterId);
    setSelectedVerseKeys(new Set(snapshot.verseKeys));
    if (snapshot.reciterId) {
      const rec = POPULAR_RECITERS.find((r) => r.id === snapshot.reciterId);
      if (rec) setCurrentReciter(rec);
    }
    if (snapshot.translationId) {
      setSelectedTranslationId(snapshot.translationId);
    }
    if (snapshot.videoConfig) {
      setVideoConfig(snapshot.videoConfig);
    }
    setActiveTab('studio');
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B1329] text-slate-900 dark:text-slate-100 transition-colors duration-200 ${
        showOnboarding ? 'h-screen overflow-hidden' : ''
      }`}
    >
      {/* Offline Status & Reconnection Banner */}
      <OfflineBanner onRetry={() => loadChapterData(currentChapterId || 1)} />

      {/* Android System Permissions Status Prompt */}
      <PermissionPrompt />

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

      {/* Subtle Resume Session Banner - only on reader page */}
      {activeTab === 'reader' && (
        <ResumeBanner
          session={resumeCandidate}
          onResume={handleResumeSession}
          onDismiss={handleDismissResume}
        />
      )}

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
                onOpenReciters={() => setIsRecitersModalOpen(true)}
                currentReciterName={currentReciter.name}
                currentReciter={currentReciter}
                chapterAudioMap={chapterAudioMap}
                preferences={preferences}
                onSelectAllVerses={handleSelectAllVerses}
                onClearVerses={handleClearVerses}
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
                onSelectReciter={handleSelectReciter}
                onBackToReader={() => setActiveTab('reader')}
                selectedVerseKeys={selectedVerseKeys}
                selectedTranslationId={selectedTranslationId}
                onLoadProject={handleResumeSession}
                onResetNewProject={handleResetNewProject}
                onViewInCreations={() => setActiveTab('creations')}
                theme={theme}
                onToggleTheme={handleToggleTheme}
              />
            )}

            {activeTab === 'creations' && (
              <CreationsView
                onGoToStudio={() => setActiveTab('studio')}
                onOpenInStudio={handleLoadProjectSnapshot}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                theme={theme}
                onToggleTheme={handleToggleTheme}
                onGoToStudio={() => setActiveTab('studio')}
                preferences={preferences}
                onUpdatePreferences={handleUpdatePreferences}
                onResetPreferences={handleResetPreferences}
                currentReciter={currentReciter}
                onSelectReciter={handleSelectReciter}
                selectedTranslationId={selectedTranslationId}
                selectedTranslationName={selectedTranslationName}
                onSelectTranslation={handleSelectTranslation}
                onOpenRecitersModal={() => setIsRecitersModalOpen(true)}
                onOpenTranslationModal={() => setIsTranslationModalOpen(true)}
                onReplayOnboarding={() => setShowOnboarding(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Quran.com Mobile Bottom Tab Navigation */}
      <BottomTabBar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }}
        selectedVersesCount={selectedVerseKeys.size}
        creationsCount={creationsCount}
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
        onSelectReciter={handleSelectReciter}
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

      {/* Starter Onboarding Flow for First Launch or Tour */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => setShowOnboarding(false)}
          onExploreAsGuest={() => setShowOnboarding(false)}
        />
      )}

      {/* Android Native Exit Toast */}
      {showExitToast && (
        <div className="fixed bottom-20 inset-x-0 mx-auto w-fit z-50 px-4 py-2 bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 text-xs font-semibold rounded-full shadow-lg backdrop-blur pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          Press back again to exit
        </div>
      )}
    </div>
  );
}
