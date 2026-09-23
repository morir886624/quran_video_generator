'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Volume2, HardDrive, ShieldCheck, X, ChevronRight, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { checkAppPermissions, requestAppPermissions, AppPermissionStatus } from '@/lib/permissions';

export function PermissionPrompt() {
  const [status, setStatus] = useState<AppPermissionStatus | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  const check = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const res = await checkAppPermissions();
      setStatus(res);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    // Initial check after short delay
    const timer = setTimeout(() => {
      check();
    }, 1200);
    return () => clearTimeout(timer);
  }, [check]);

  // Re-check permissions when returning to the app (e.g. from Android app settings)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [check]);

  // If on web or all permissions granted or dismissed by user, do not show
  if (!Capacitor.isNativePlatform() || dismissed || !status || status.allGranted) {
    return null;
  }

  const handleGrant = async () => {
    setIsRequesting(true);
    try {
      const res = await requestAppPermissions();
      setStatus(res);
      if (res.allGranted) {
        setTimeout(() => setDismissed(true), 1200);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const isAllGranted = status.audio && status.storage;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setDismissed(true)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-modal-title"
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/10 dark:bg-emerald-500/20 blur-2xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        {isAllGranted ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              All Permissions Granted!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              You are ready to enjoy full audio recitations and video exports.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center pt-1 pb-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner mb-3.5">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3
                id="permission-modal-title"
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight"
              >
                Permissions Needed
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xs mx-auto">
                Allow access to listen to verse recitations and export your Quran videos smoothly.
              </p>
            </div>

            {/* Structured & Aligned Permission Items List */}
            <div className="space-y-2.5 mb-6">
              {/* Voice / Audio Item */}
              <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    status.audio
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      Voice & Sound
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Verse recitation & audio
                    </div>
                  </div>
                </div>

                <div>
                  {status.audio ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Check className="w-3 h-3" />
                      Allowed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Needed
                    </span>
                  )}
                </div>
              </div>

              {/* Storage / Media Item */}
              <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    status.storage
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      Storage & Media
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Save videos to gallery
                    </div>
                  </div>
                </div>

                <div>
                  {status.storage ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Check className="w-3 h-3" />
                      Allowed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Needed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Aligned Actions */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleGrant}
                disabled={isRequesting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Requesting Access...</span>
                  </>
                ) : (
                  <>
                    <span>Allow Access</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={() => setDismissed(true)}
                className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-center cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

