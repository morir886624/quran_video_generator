'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ExportedVideoItem,
  ProjectDraft,
  getAllExportedVideos,
  deleteExportedVideo,
  clearAllExportedVideos,
  getAllProjects,
  deleteProject,
  getStorageUsageSummary,
  formatBytes,
} from '@/lib/storage-db';
import { saveVideoToDevice, shareVideo } from '@/lib/video-recorder';
import { VideoConfig } from '@/types/quran';
import { ShareModal } from './ShareModal';
import {
  Film,
  Download,
  Share2,
  Trash2,
  RotateCcw,
  Sparkles,
  HardDrive,
  Copy,
  Check,
  X,
  ChevronRight,
  FolderKanban,
  FileVideo,
  Clock,
  Mic2,
  BookOpen,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

function YoutubeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

interface CreationsViewProps {
  onOpenInStudio: (snapshot: {
    chapterId: number;
    verseKeys: string[];
    reciterId?: number;
    translationId?: number;
    videoConfig?: VideoConfig;
  }) => void;
  onGoToStudio: () => void;
}

export const CreationsView: React.FC<CreationsViewProps> = ({
  onOpenInStudio,
  onGoToStudio,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'videos' | 'drafts'>('videos');
  const [videos, setVideos] = useState<ExportedVideoItem[]>([]);
  const [drafts, setDrafts] = useState<ProjectDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState({ videoCount: 0, totalSizeBytes: 0 });

  // YouTube modal state
  const [activeYoutubeVideo, setActiveYoutubeVideo] = useState<ExportedVideoItem | null>(null);
  const [activeShareVideo, setActiveShareVideo] = useState<ExportedVideoItem | null>(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedArabic, setCopiedArabic] = useState(false);
  const [copiedTrans, setCopiedTrans] = useState(false);

  // Saving / Sharing states
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({});
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Video Object URLs cache
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vids, projs, usage] = await Promise.all([
        getAllExportedVideos(),
        getAllProjects(),
        getStorageUsageSummary(),
      ]);
      setVideos(vids);
      setDrafts(projs);
      setStorageUsage(usage);

      // Create object URLs for blobs
      const urls: Record<string, string> = {};
      vids.forEach((v) => {
        if (v.videoBlob) {
          urls[v.id] = URL.createObjectURL(v.videoBlob);
        }
      });
      setVideoUrls(urls);
    } catch (e) {
      console.error('Failed to load creations:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const videoUrlsRef = React.useRef<Record<string, string>>({});

  useEffect(() => {
    videoUrlsRef.current = videoUrls;
  }, [videoUrls]);

  useEffect(() => {
    let isCancelled = false;
    Promise.all([
      getAllExportedVideos(),
      getAllProjects(),
      getStorageUsageSummary(),
    ])
      .then(([vids, projs, usage]) => {
        if (isCancelled) return;
        setVideos(vids);
        setDrafts(projs);
        setStorageUsage(usage);
        const urls: Record<string, string> = {};
        vids.forEach((v) => {
          if (v.videoBlob) {
            urls[v.id] = URL.createObjectURL(v.videoBlob);
          }
        });
        setVideoUrls(urls);
        setIsLoading(false);
      })
      .catch((e) => {
        if (isCancelled) return;
        console.error('Failed to load creations:', e);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      Object.values(videoUrlsRef.current).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
    };
  }, []);

  const handleDeleteVideo = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to remove this video from your library?')) return;
    try {
      await deleteExportedVideo(id);
      if (videoUrls[id]) {
        URL.revokeObjectURL(videoUrls[id]);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllExportedVideos();
      Object.values(videoUrls).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
      setIsClearConfirmOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to clear videos:', err);
    }
  };

  const handleDeleteDraft = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this draft?')) return;
    try {
      await deleteProject(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete draft:', err);
    }
  };

  const handleSaveToDevice = async (video: ExportedVideoItem) => {
    const actionKey = `save_${video.id}`;
    setIsProcessingAction(actionKey);
    try {
      const url = videoUrls[video.id] || URL.createObjectURL(video.videoBlob);
      const filename = `${video.chapterName.toLowerCase().replace(/\s+/g, '-')}-${video.id}.mp4`;
      const res = await saveVideoToDevice({
        url,
        filename,
        blob: video.videoBlob,
      });
      setActionFeedback((prev) => ({ ...prev, [video.id]: res.message }));
      setTimeout(() => {
        setActionFeedback((prev) => {
          const next = { ...prev };
          delete next[video.id];
          return next;
        });
      }, 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save to gallery';
      setActionFeedback((prev) => ({
        ...prev,
        [video.id]: message,
      }));
      setTimeout(() => {
        setActionFeedback((prev) => {
          const next = { ...prev };
          delete next[video.id];
          return next;
        });
      }, 4000);
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleShare = async (video: ExportedVideoItem) => {
    const actionKey = `share_${video.id}`;
    setIsProcessingAction(actionKey);
    try {
      const url = videoUrls[video.id] || URL.createObjectURL(video.videoBlob);
      const filename = `${video.chapterName.toLowerCase().replace(/\s+/g, '-')}-${video.id}.mp4`;
      const res = await shareVideo({
        url,
        filename,
        blob: video.videoBlob,
        title: video.youtubeTitle || video.title,
        text: `${video.chapterName} (${video.verseRange}) - ${video.reciterName}`,
      });
      if (res.method === 'fallback') {
        setActiveShareVideo(video);
      }
    } catch (err: unknown) {
      console.warn('Share failed, opening share modal:', err);
      setActiveShareVideo(video);
    } finally {
      setIsProcessingAction(null);
    }
  };

  const copyText = (text: string, setSuccess: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3.5 sm:px-6 py-5 pb-32">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>My Creations</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                {videos.length} {videos.length === 1 ? 'Video' : 'Videos'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                <span>Storage used: {formatBytes(storageUsage.totalSizeBytes)}</span>
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {videos.length > 0 && (
            <button
              onClick={() => setIsClearConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Videos</span>
            </button>
          )}

          <button
            onClick={onGoToStudio}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create New Video</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs: Exported Videos vs Saved Drafts */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('videos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === 'videos'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-950/20'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60'
          }`}
        >
          <FileVideo className="w-4 h-4" />
          <span>Exported Videos</span>
          <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-white/20">
            {videos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('drafts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === 'drafts'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-950/20'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Saved Drafts</span>
          <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-white/20">
            {drafts.length}
          </span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-xs text-slate-400">Loading your creations...</p>
        </div>
      ) : (
        <>
          {/* SubTab 1: Exported Videos */}
          {activeSubTab === 'videos' && (
            <div>
              {videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                    <FileVideo className="w-8 h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                    No Exported Videos Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
                    Every video you generate in the Studio will be permanently stored here with offline playback, 1-click YouTube metadata, and instant re-editing.
                  </p>
                  <button
                    onClick={onGoToStudio}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/20 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Open Video Studio</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {videos.map((vid) => {
                    const videoUrl = videoUrls[vid.id];
                    const feedback = actionFeedback[vid.id];
                    const dateStr = new Date(vid.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={vid.id}
                        className="flex flex-col bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
                      >
                        {/* Video Player Preview */}
                        <div className="relative w-full aspect-[9/16] max-h-[380px] bg-black overflow-hidden flex items-center justify-center">
                          {videoUrl ? (
                            <video
                              src={videoUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-xs text-slate-500">Preview not available</div>
                          )}

                          {/* File size & format badge */}
                          <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-mono font-bold flex items-center gap-1.5 shadow">
                            <FileVideo className="w-3 h-3 text-emerald-400" />
                            <span>{formatBytes(vid.size)}</span>
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={(e) => handleDeleteVideo(vid.id, e)}
                            title="Delete video"
                            className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 backdrop-blur-md text-slate-300 hover:text-rose-400 transition-colors shadow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Video Details & Actions */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1">
                                {vid.title || vid.chapterName}
                              </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-y-1 gap-x-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <BookOpen className="w-3 h-3" />
                                <span>{vid.verseRange}</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Mic2 className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{vid.reciterName}</span>
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{dateStr}</span>
                            </div>
                          </div>

                          {/* Feedback Banner if any */}
                          {feedback && (
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 text-center animate-in fade-in">
                              {feedback}
                            </div>
                          )}

                          {/* Action Buttons Grid */}
                          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-2">
                              {/* Save to Device Gallery */}
                              <button
                                onClick={() => handleSaveToDevice(vid)}
                                disabled={isProcessingAction === `save_${vid.id}`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-60"
                              >
                                {isProcessingAction === `save_${vid.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                                ) : (
                                  <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                )}
                                <span>Save</span>
                              </button>

                              {/* Share */}
                              <button
                                onClick={() => handleShare(vid)}
                                disabled={isProcessingAction === `share_${vid.id}`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-60"
                              >
                                {isProcessingAction === `share_${vid.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                                ) : (
                                  <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                )}
                                <span>Share</span>
                              </button>

                              {/* YouTube Suite */}
                              <button
                                onClick={() => setActiveYoutubeVideo(vid)}
                                title="Open YouTube Creator Copy Suite"
                                className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-900/50 transition-colors"
                              >
                                <YoutubeIcon className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Re-edit in Studio */}
                            {vid.projectSnapshot && (
                              <button
                                onClick={() => onOpenInStudio(vid.projectSnapshot!)}
                                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Re-edit in Studio</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SubTab 2: Saved Drafts */}
          {activeSubTab === 'drafts' && (
            <div>
              {drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                    <FolderKanban className="w-8 h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                    No Saved Project Drafts
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
                    You can save ongoing projects with custom names inside the Studio header to work on multiple Quran video concepts at once.
                  </p>
                  <button
                    onClick={onGoToStudio}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/20 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Go to Studio</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="p-4 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                            {draft.title}
                          </h4>
                          <button
                            onClick={(e) => handleDeleteDraft(draft.id, e)}
                            className="text-slate-400 hover:text-rose-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="mt-2 text-xs space-y-1 text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <BookOpen className="w-3 h-3" />
                            <span>Surah #{draft.chapterId} • {draft.chapterName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mic2 className="w-3 h-3" />
                            <span>{draft.reciterName}</span>
                          </div>
                          <div>{draft.verseKeys.length} verses selected</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() =>
                            onOpenInStudio({
                              chapterId: draft.chapterId,
                              verseKeys: draft.verseKeys,
                              reciterId: draft.reciterId,
                              translationId: draft.translationId,
                              videoConfig: draft.videoConfig,
                            })
                          }
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          <span>Open in Studio</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* YouTube Creator Suite Modal */}
      {activeYoutubeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveYoutubeVideo(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-red-600 dark:text-red-400">
              <YoutubeIcon className="w-5 h-5" />
              <span>YouTube &amp; Socials Creator Suite</span>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Video Title:</span>
                  <button
                    onClick={() => copyText(activeYoutubeVideo.youtubeTitle, setCopiedTitle)}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                  >
                    {copiedTitle ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTitle ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white font-medium select-text">
                  {activeYoutubeVideo.youtubeTitle}
                </div>
              </div>

              {/* Arabic Text */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Arabic Text:</span>
                  <button
                    onClick={() => copyText(activeYoutubeVideo.fullArabicText, setCopiedArabic)}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                  >
                    {copiedArabic ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedArabic ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 text-right font-quran text-base text-emerald-950 dark:text-amber-200 select-text max-h-24 overflow-y-auto leading-loose">
                  {activeYoutubeVideo.fullArabicText}
                </div>
              </div>

              {/* Translation */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Translation:</span>
                  <button
                    onClick={() => copyText(activeYoutubeVideo.fullTranslationText, setCopiedTrans)}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                  >
                    {copiedTrans ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTrans ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 select-text max-h-24 overflow-y-auto whitespace-pre-line">
                  {activeYoutubeVideo.fullTranslationText}
                </div>
              </div>

              {/* Description */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Full Description &amp; Hashtags:</span>
                  <button
                    onClick={() => copyText(activeYoutubeVideo.youtubeDescription, setCopiedDesc)}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                  >
                    {copiedDesc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDesc ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 text-[11px] font-mono text-slate-600 dark:text-slate-400 select-text max-h-24 overflow-y-auto whitespace-pre-line">
                  {activeYoutubeVideo.youtubeDescription}
                </div>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => setActiveYoutubeVideo(null)}
                className="px-6 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Clear All Videos */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Clear All Exported Videos?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This will delete all {videos.length} videos from your app library and free up {formatBytes(storageUsage.totalSizeBytes)} of storage. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Share Modal (WhatsApp, Telegram, X, Facebook, Download) */}
      {activeShareVideo && (
        <ShareModal
          isOpen={!!activeShareVideo}
          onClose={() => setActiveShareVideo(null)}
          videoUrl={videoUrls[activeShareVideo.id] || URL.createObjectURL(activeShareVideo.videoBlob)}
          videoBlob={activeShareVideo.videoBlob}
          filename={`${activeShareVideo.chapterName.toLowerCase().replace(/\s+/g, '-')}-${activeShareVideo.id}.mp4`}
          title={activeShareVideo.youtubeTitle || activeShareVideo.title}
          text={`${activeShareVideo.chapterName} (${activeShareVideo.verseRange}) - ${activeShareVideo.reciterName}`}
          surahName={activeShareVideo.chapterName}
          ayahRange={activeShareVideo.verseRange}
          reciterName={activeShareVideo.reciterName}
        />
      )}
    </div>
  );
};
