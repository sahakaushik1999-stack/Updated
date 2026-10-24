import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '../types/portfolio';
import { ProjectVisual } from './ProjectVisual';
import { getMinimalMetaAdsData } from '../utils/metaAdsAnalytics';
import { soundManager } from '../utils/audio';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
  onNextProject?: () => void;
  onPrevProject?: () => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  onClose,
  onNextProject,
  onPrevProject,
}) => {
  // Global Keyboard shortcuts: Esc to close, Left/Right arrows to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && onNextProject) {
        soundManager.playClick();
        onNextProject();
      } else if (e.key === 'ArrowLeft' && onPrevProject) {
        soundManager.playClick();
        onPrevProject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNextProject, onPrevProject]);

  if (!project) return null;

  // Creative-specific distinct randomized metrics:
  // ROAS < 6, CTR < 3%, CPM < 1000 INR, CVR < 6%
  const stats = getMinimalMetaAdsData(project.id, project.title, project.index);

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-14 overflow-y-auto overscroll-contain select-none text-white transition-all duration-300"
      >
        {/* Minimalist Top Right Close Button (Borderless, pure text & icon) */}
        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="fixed top-5 right-5 sm:top-8 sm:right-10 z-50 flex items-center gap-2 font-mono-tabular text-xs uppercase tracking-widest text-neutral-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close overview"
        >
          <span>Close</span>
          <span className="text-[10px] text-neutral-500">[Esc]</span>
          <X className="w-4 h-4 ml-0.5" />
        </button>

        {/* Minimalist Bottom Navigation (Prev / Next links, borderless) */}
        <div className="fixed bottom-5 right-5 sm:bottom-8 sm:right-10 z-50 flex items-center gap-6 font-mono-tabular text-xs uppercase tracking-widest text-neutral-400">
          {onPrevProject && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundManager.playClick();
                onPrevProject();
              }}
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
          )}
          {onNextProject && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundManager.playClick();
                onNextProject();
              }}
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ================= MAIN SCALED STAGE (NO BOXES, BORDERLESS) ================= */}
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-7xl 2xl:max-w-[1480px] mx-auto flex flex-col md:flex-row items-center justify-between gap-10 md:gap-14 lg:gap-20 my-auto py-6 sm:py-2"
        >
          {/* ----------------- LEFT SIDE: LARGER & SHARPER HIGH-RES IMAGE ----------------- */}
          <div className="w-full md:w-[54%] lg:w-[56%] flex items-center justify-center shrink-0">
            <div className="relative w-full max-h-[88vh] flex items-center justify-center">
              <ProjectVisual project={project} isActive={true} fitMode="contain" />

              {/* Very small text telling the ROAS of the image on the top right corner */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30 pointer-events-none select-none">
                <span className="font-mono-tabular text-[10px] sm:text-[11px] font-bold tracking-widest text-white/95 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/60 backdrop-blur-sm px-2 py-0.5">
                  ROAS {stats.roas}
                </span>
              </div>
            </div>
          </div>

          {/* ----------------- RIGHT SIDE: CLEAN MINIMAL DATA (NO BOXES) ----------------- */}
          <div className="w-full md:w-[46%] lg:w-[44%] flex flex-col justify-center space-y-6 sm:space-y-8 text-left">
            {/* Meta Ads & Creative Title */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 font-mono-tabular text-xs uppercase tracking-widest text-neutral-400">
                <span className="font-bold text-[#e62b1e]">{project.index}</span>
                <span className="text-neutral-500">/</span>
                <span className="text-neutral-400">15</span>
                <span className="text-neutral-600">—</span>
                <span className="text-neutral-300 font-semibold">{project.category}</span>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="font-unbounded text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                  {project.title}
                </h2>
                {project.subtitle && (
                  <h3 className="font-sans text-xs sm:text-sm md:text-base font-bold text-neutral-200 tracking-normal">
                    {project.subtitle}
                  </h3>
                )}
              </div>

              {/* Red Accent Bar */}
              <div className="w-10 h-[3px] bg-[#e62b1e] rounded-none my-1" />

              <div className="space-y-2 pt-0.5 max-w-lg">
                <p className="font-sans text-xs sm:text-sm text-neutral-200 leading-relaxed font-normal">
                  {project.description}
                </p>
              </div>

              {/* Creative Approach */}
              {project.creativeApproach && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-mono-tabular text-[9px] sm:text-[10px] uppercase tracking-widest text-neutral-400">
                      CREATIVE APPROACH
                    </span>
                    <span className="font-unbounded text-xs sm:text-sm font-black uppercase text-white tracking-tight">
                      {project.creativeApproach}
                    </span>
                  </div>
                  <span className="font-mono-tabular text-xs text-[#e62b1e] font-bold">
                    {project.index} / 15
                  </span>
                </div>
              )}
            </div>

            {/* THE 4 REQUESTED RANDOMIZED STATS PER CREATIVE (ZERO BOXES):
                ROAS < 6, CTR < 3, CPM < 1000 INR, CVR < 6% */}
            <div className="grid grid-cols-2 gap-x-10 sm:gap-x-14 gap-y-7 sm:gap-y-9 pt-2">
              {/* ROAS < 6 */}
              <div className="space-y-1">
                <span className="font-mono-tabular text-xs font-bold tracking-widest uppercase text-neutral-400 block">
                  ROAS
                </span>
                <div className="font-unbounded text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
                  {stats.roas}
                </div>
              </div>

              {/* CTR < 3 */}
              <div className="space-y-1">
                <span className="font-mono-tabular text-xs font-bold tracking-widest uppercase text-neutral-400 block">
                  CTR
                </span>
                <div className="font-unbounded text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
                  {stats.ctr}
                </div>
              </div>

              {/* CPM < 1000 INR */}
              <div className="space-y-1">
                <span className="font-mono-tabular text-xs font-bold tracking-widest uppercase text-neutral-400 block">
                  CPM
                </span>
                <div className="font-unbounded text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
                  {stats.cpm}
                </div>
              </div>

              {/* CVR < 6% */}
              <div className="space-y-1">
                <span className="font-mono-tabular text-xs font-bold tracking-widest uppercase text-neutral-400 block">
                  CVR
                </span>
                <div className="font-unbounded text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
                  {stats.cvr}
                </div>
              </div>
            </div>

            {/* Subtle Footer Meta (Clean and borderless) */}
            <div className="pt-3 flex items-center justify-between text-xs font-mono-tabular text-neutral-400">
              <span>
                {project.client} • {project.launchDate}
              </span>
              <span className="hidden sm:inline text-neutral-500">
                Sample Size: 60,000 Verified Buyers
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
