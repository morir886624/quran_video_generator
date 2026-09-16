'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  Check,
  CheckCircle2,
  Share2,
  Video,
  Layers,
  Volume2,
  Copy,
  ChevronLeft,
  BookOpen,
} from 'lucide-react';
import { QuranLogo } from './QuranLogo';

interface OnboardingFlowProps {
  onComplete: () => void;
  onExploreAsGuest?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onExploreAsGuest,
}) => {
  // Step 0: Welcome Splash
  // Step 1: Curate Verses
  // Step 2: 9:16 Studio
  // Step 3: Spread the Noor
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Audio wave animation state for mockup
  const [waveSeed, setWaveSeed] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveSeed((prev) => (prev + 1) % 100);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('quran_onboarding_completed', 'true');
    } catch {
      // ignore
    }
    onComplete();
  };

  const handleGuest = () => {
    try {
      localStorage.setItem('quran_onboarding_completed', 'true');
    } catch {
      // ignore
    }
    if (onExploreAsGuest) {
      onExploreAsGuest();
    } else {
      onComplete();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      } else if (e.key === 'Escape') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Swipe support for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 50) {
      // Swiped left -> Next
      handleNext();
    } else if (diff < -50 && currentStep > 0) {
      // Swiped right -> Back
      handleBack();
    }
    setTouchStartX(null);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-gradient-to-b from-white via-slate-50 to-emerald-50/25 dark:from-[#0B1329] dark:via-[#0F172A] dark:to-[#070B16] text-slate-900 dark:text-slate-100 overflow-hidden select-none safe-top safe-bottom transition-colors duration-300"
    >
      {/* --------------------------------------------------------------------- */}
      {/* TOP HEADER / STEP INDICATOR BAR                                       */}
      {/* --------------------------------------------------------------------- */}
      <header className="w-full max-w-md mx-auto px-5 pt-3 sm:pt-4 shrink-0 flex items-center justify-between min-h-[48px]">
        {currentStep === 0 ? (
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>v1.0 Ready</span>
            </div>
            <button
              onClick={handleFinish}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2 py-1 rounded-lg transition-colors"
            >
              Skip
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between">
            {/* Step Counter Badge */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleBack}
                aria-label="Previous step"
                className="p-1 -ml-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 text-[11px] font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>STEP {currentStep} OF 3</span>
              </div>
            </div>

            {/* 3 Step Indicator Dots */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((stepIdx) => (
                <button
                  key={stepIdx}
                  onClick={() => setCurrentStep(stepIdx)}
                  aria-label={`Go to step ${stepIdx}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentStep === stepIdx
                      ? 'w-6 bg-emerald-600 dark:bg-emerald-400'
                      : currentStep > stepIdx
                      ? 'w-2 bg-emerald-600/40 dark:bg-emerald-400/40'
                      : 'w-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Skip / Ready to launch */}
            {currentStep === 3 ? (
              <button
                onClick={handleFinish}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                <span>Ready</span>
                <Sparkles className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2 py-1 rounded-lg transition-colors"
              >
                Skip
              </button>
            )}
          </div>
        )}
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* CENTER CONTENT AREA (STRICTLY CENTERED VERTICALLY & HORIZONTALLY)      */}
      {/* --------------------------------------------------------------------- */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 sm:px-6 py-2 flex flex-col items-center justify-center text-center overflow-y-auto no-scrollbar">
        {/* =================================================================== */}
        {/* SCREEN 0: 0A. Welcome & Grand Splash                                */}
        {/* =================================================================== */}
        {currentStep === 0 && (
          <div className="w-full flex flex-col items-center justify-center space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-300">
            {/* AI-Powered Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>AI-Powered Video Studio</span>
            </div>

            {/* App Icon Rounded Container */}
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl blur-md opacity-60 dark:opacity-40 group-hover:opacity-80 transition duration-500" />
              <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-800 flex items-center justify-center p-3.5 shadow-xl shadow-emerald-600/20 border border-emerald-400/30">
                <BookOpen className="w-10 h-10 text-white" strokeWidth={2.2} />
              </div>
            </div>

            {/* Holy Quran Verse Calligraphy */}
            <div className="w-full pt-1">
              <div
                dir="rtl"
                className="font-quran text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold leading-loose sm:leading-[2.4] tracking-wide"
              >
                اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic font-medium mt-1">
                &ldquo;Read in the name of your Lord who created&rdquo;
              </p>
            </div>

            {/* Feature Specs Pills Row */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
                ✦ 1080×1920 60FPS
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
                ✦ Gapless Reciters
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
                ✦ 1-Click SEO
              </span>
            </div>

            {/* Heading & Description */}
            <div className="pt-2 space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Inspire with Every Ayah
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                Transform sacred Quranic recitations into breathtaking 9:16 cinematic short videos for TikTok, Reels &amp; Shorts with zero hassle.
              </p>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SCREEN 1: 0B. Onboarding 1 - Curate Verses                          */}
        {/* =================================================================== */}
        {currentStep === 1 && (
          <div className="w-full flex flex-col items-center justify-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Visual Mockup Card */}
            <div className="w-full rounded-2xl bg-white dark:bg-[#131E3A] border border-slate-200/90 dark:border-slate-800 p-4 shadow-xl shadow-slate-200/50 dark:shadow-black/40 space-y-3 transition-colors">
              {/* Reciter Pill */}
              <div className="w-fit mx-auto flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Mishari Rashid Al-Afasy • Murattal</span>
              </div>

              {/* Verses Mockup Box */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3 space-y-2.5 text-left">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    Surah Al-Fatihah
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>3 Verses Selected</span>
                  </span>
                </div>

                {/* Arabic Calligraphy */}
                <div
                  dir="rtl"
                  className="font-quran text-xl text-center text-slate-900 dark:text-slate-100 font-bold py-1 leading-relaxed"
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 text-center italic">
                  In the name of Allah, the Entirely Merciful...
                </p>

                {/* Animated Equalizer Waveform */}
                <div className="flex items-end justify-center gap-1 h-6 py-0.5">
                  {[4, 12, 18, 9, 22, 16, 24, 14, 8, 19, 23, 11, 15, 6].map((baseH, i) => {
                    const dynamicH = Math.max(
                      4,
                      Math.min(24, baseH + Math.sin(waveSeed + i) * 8)
                    );
                    return (
                      <span
                        key={i}
                        style={{ height: `${dynamicH}px` }}
                        className="w-1 rounded-full bg-emerald-500 transition-all duration-300"
                      />
                    );
                  })}
                </div>

                {/* Range & Auto-Sync Bar */}
                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <span className="font-mono">Range: Ayahs [1] to [3]</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span>Auto-Sync</span>
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </span>
                </div>
              </div>

              {/* Badges row below card */}
              <div className="flex items-center justify-center gap-2 pt-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Check className="w-3 h-3" /> 114 Surahs
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Check className="w-3 h-3" /> Gapless Audio
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Check className="w-3 h-3" /> Verified Mushaf
                </span>
              </div>
            </div>

            {/* Content Text */}
            <div className="space-y-1.5 pt-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Curate with Reverence
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                Select from authentic Surahs and precise Ayah ranges. Listen to renowned reciters with seamless gapless playback.
              </p>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SCREEN 2: 0C. Onboarding 2 - 9:16 Studio                            */}
        {/* =================================================================== */}
        {currentStep === 2 && (
          <div className="w-full flex flex-col items-center justify-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* 9:16 Studio Mockup Preview Card */}
            <div className="w-full max-w-[280px] mx-auto rounded-2xl bg-white dark:bg-[#131E3A] border-2 border-emerald-500/40 p-4 shadow-xl shadow-emerald-600/10 dark:shadow-black/50 space-y-3 relative overflow-hidden transition-colors">
              {/* Safe Zone Subtle Frame Guide Markers */}
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-500/40 pointer-events-none" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-500/40 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-500/40 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-500/40 pointer-events-none" />

              {/* Top Ayah Badge */}
              <div className="w-fit mx-auto px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                Al-Fatihah : 2
              </div>

              {/* Visual Studio Canvas Center */}
              <div className="py-2 space-y-2">
                <div
                  dir="rtl"
                  className="font-quran text-2xl text-slate-900 dark:text-white font-bold leading-loose text-center"
                >
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-extrabold border-b-2 border-emerald-500 inline-block shadow-sm">
                    الْحَمْدُ
                  </span>{' '}
                  لِلَّهِ رَبِّ الْعَالَمِينَ
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">
                  [All] praise is due to Allah...
                </p>
              </div>

              {/* Scrubber & Waveform Mockup */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/80 p-2.5 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 dark:text-slate-400">
                  <span>00:03</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">● REC 60FPS</span>
                  <span>00:15</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="w-2/5 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                </div>
              </div>

              {/* Badges below canvas */}
              <div className="flex items-center justify-center gap-2 pt-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  ✦ Word Karaoke
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  ✦ Safe Guides
                </span>
              </div>
            </div>

            {/* Content Text */}
            <div className="space-y-1.5 pt-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Cinematic 9:16 Studio
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                Automated word-by-word karaoke synchronization, motion calligraphy, and platform safe-zones so your sacred text is never hidden.
              </p>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SCREEN 3: 0D. Onboarding 3 - Spread the Noor Worldwide              */}
        {/* =================================================================== */}
        {currentStep === 3 && (
          <div className="w-full flex flex-col items-center justify-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Visual Export & Share Mockup Card */}
            <div className="w-full rounded-2xl bg-white dark:bg-[#131E3A] border border-slate-200/90 dark:border-slate-800 p-4 shadow-xl shadow-slate-200/50 dark:shadow-black/40 space-y-3 transition-colors">
              {/* Green Circle Checkmark Icon */}
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Export 4K &amp; Share Everywhere
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  1080×1920 • 60 FPS • Automatic Reciter Credits
                </p>
              </div>

              {/* Social Platforms Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  <span className="text-xs">🎵</span>
                  <span>TikTok</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  <span className="text-xs text-rose-500">▶</span>
                  <span>Shorts</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  <span className="text-xs text-amber-500">◎</span>
                  <span>Reels</span>
                </div>
              </div>

              {/* Auto-Generated SEO Copy Box */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3 space-y-1.5 text-left">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Auto-Generated SEO Copy</span>
                  <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>1-Click Ready</span>
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
                  Surah Al-Fatihah (Verses 1-3) • Mishari Al-Afasy | #Quran #IslamicReminder #DailyAyah
                </p>
              </div>
            </div>

            {/* Content Text */}
            <div className="space-y-1.5 pt-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Spread the Noor Worldwide
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                One tap exports pristine video files with verified translations and tailored captions ready to inspire your followers.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* --------------------------------------------------------------------- */}
      {/* BOTTOM ACTION AREA (STRICTLY PINNED TO THE BOTTOM OF THE PAGE)        */}
      {/* --------------------------------------------------------------------- */}
      <footer className="w-full max-w-md mx-auto px-6 pb-6 pt-2 shrink-0 flex flex-col items-center gap-3">
        {/* Primary Action Button */}
        <button
          onClick={handleNext}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-base tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 dark:shadow-emerald-950/50 transition-all duration-200 cursor-pointer"
        >
          {currentStep === 0 && (
            <>
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </>
          )}
          {currentStep === 1 && (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </>
          )}
          {currentStep === 2 && (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </>
          )}
          {currentStep === 3 && (
            <>
              <span>Launch Quran Video Studio</span>
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
            </>
          )}
        </button>

        {/* Sub-links Under Button */}
        {currentStep === 0 ? (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <button
              onClick={handleGuest}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Explore as Guest
            </button>
            <span>•</span>
            <a
              href="/privacy.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Terms &amp; Privacy
            </a>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            <button
              onClick={handleBack}
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span>•</span>
            <button
              onClick={handleFinish}
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Skip Tour
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};

