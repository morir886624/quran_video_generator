'use client';

import React, { useState, useEffect } from 'react';
import { ProjectDraft, getAllProjects, saveProject, deleteProject } from '@/lib/storage-db';
import { VideoConfig, Chapter, Reciter } from '@/types/quran';
import {
  FolderKanban,
  Plus,
  Trash2,
  X,
  Check,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
  selectedVerseKeys: string[];
  currentReciter: Reciter;
  selectedTranslationId: number;
  videoConfig: VideoConfig;
  onLoadProject: (project: ProjectDraft) => void;
  onResetNewProject: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  chapter,
  selectedVerseKeys,
  currentReciter,
  selectedTranslationId,
  videoConfig,
  onLoadProject,
  onResetNewProject,
}) => {
  const [projects, setProjects] = useState<ProjectDraft[]>([]);
  const [titleInput, setTitleInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadProjects = React.useCallback(async () => {
    try {
      const data = await getAllProjects();
      setProjects(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      getAllProjects()
        .then((data) => {
          setProjects(data);
          const defaultTitle = `Surah ${chapter?.name_simple || 'Quran'} (${selectedVerseKeys.length} verses)`;
          setTitleInput(defaultTitle);
        })
        .catch(() => {});
    }
  }, [isOpen, chapter?.name_simple, selectedVerseKeys.length]);

  if (!isOpen) return null;

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;

    setIsSaving(true);
    try {
      await saveProject({
        title: titleInput.trim(),
        chapterId: chapter?.id || 1,
        chapterName: chapter?.name_simple || 'Al-Fatihah',
        verseKeys: selectedVerseKeys,
        reciterId: currentReciter.id,
        reciterName: currentReciter.name,
        translationId: selectedTranslationId,
        videoConfig,
      });

      setSuccessMessage('Project draft saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadProjects();
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved project?')) return;
    try {
      await deleteProject(id);
      await loadProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[88vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Project Drafts &amp; Sessions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Save your current video styling &amp; ayahs or switch between drafts.
            </p>
          </div>
        </div>

        {/* 1. Save Current Project */}
        <form onSubmit={handleSaveCurrent} className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Save Current Video as Project:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="e.g. Surah Al-Mulk Reel"
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isSaving || !titleInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>

          {successMessage && (
            <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </form>

        {/* Quick New Project Button */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Your Saved Projects ({projects.length})
          </span>
          <button
            onClick={() => {
              if (confirm('Start a fresh project with default settings?')) {
                onResetNewProject();
                onClose();
              }
            }}
            className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Start Fresh</span>
          </button>
        </div>

        {/* 2. Projects List */}
        <div className="space-y-2.5">
          {projects.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <FolderKanban className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No saved drafts yet. Save your current video setup above!
              </p>
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => {
                  onLoadProject(proj);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800/90 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {proj.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Surah #{proj.chapterId} {proj.chapterName}
                    </span>
                    <span>•</span>
                    <span>{proj.verseKeys.length} verses</span>
                    <span>•</span>
                    <span>{proj.reciterName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(proj.id, e)}
                    title="Delete Draft"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
