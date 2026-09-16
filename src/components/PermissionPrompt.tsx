'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Volume2, HardDrive, ShieldCheck, X, ChevronRight } from 'lucide-react';
import { checkAppPermissions, requestAppPermissions, AppPermissionStatus } from '@/lib/permissions';

export function PermissionPrompt() {
  const [status, setStatus] = useState<AppPermissionStatus | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  const check = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    const res = await checkAppPermissions();
    setStatus(res);
  }, []);

  useEffect(() => {
    check();
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
        setTimeout(() => setDismissed(true), 2000);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="mx-4 my-2 p-3.5 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/80 backdrop-blur-md text-slate-100 shadow-lg animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide">
              Permissions Needed
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Allow audio playback & gallery export to use all studio features.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800/60 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-700/40 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.storage ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
            <HardDrive className="w-3 h-3" />
            {status.storage ? 'Storage: Allowed' : 'Storage: Needed'}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.audio ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
            <Volume2 className="w-3 h-3" />
            {status.audio ? 'Voice/Sound: Allowed' : 'Voice/Sound: Needed'}
          </span>
        </div>

        <button
          onClick={handleGrant}
          disabled={isRequesting}
          className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow transition-all active:scale-95 disabled:opacity-50"
        >
          {isRequesting ? 'Requesting...' : 'Allow Access'}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

