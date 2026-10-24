/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViewMode, ThemeMode, Project } from './types/portfolio';
import { PROJECTS } from './data/portfolioData';
import { soundManager } from './utils/audio';
import { IntroCurtain } from './components/IntroCurtain';
import { ProjectShowcase3D } from './components/ProjectShowcase3D';
import { PlaygroundView, PLAYGROUND_PORTFOLIO_ITEMS } from './components/PlaygroundView';
import { AboutView } from './components/AboutView';
import { ShowreelModal } from './components/ShowreelModal';
import { ContactModal } from './components/ContactModal';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { ImageCustomizerModal } from './components/ImageCustomizerModal';
import { MediaLibraryModal } from './components/MediaLibraryModal';
import { ParticleTransitionOverlay } from './components/ParticleTransitionOverlay';
import { AnimatePresence, motion } from 'motion/react';
import { Cloud, Upload, FolderDown } from 'lucide-react';
import {
  getAllImageOverrides,
  subscribeToImageOverrides,
  getSynchronousOverrides,
} from './utils/imageStorage';
import { getRemovedProjectIds, syncCircleStorageWithBackend } from './utils/circleStorage';
import { MasterEditProvider, useMasterEdit } from './context/MasterEditContext';
import { MasterAuthModal } from './components/MasterAuthModal';

function PortfolioApp() {
  const [currentView, setCurrentView] = useState<ViewMode>('work');
  const [targetView, setTargetView] = useState<ViewMode>('work');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const { isEditMode, requireEditAccess, toastNotice } = useMasterEdit();
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('huyml_theme') as ThemeMode;
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [isAudioOn, setIsAudioOn] = useState<boolean>(false);
  const [isIntroVisible, setIsIntroVisible] = useState<boolean>(false);
  const [isShowreelOpen, setIsShowreelOpen] = useState<boolean>(false);
  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<Project | null>(null);

  // Persistent Custom Image Overrides state
  const [customOverrides, setCustomOverrides] = useState<Record<string, string>>(() =>
    getSynchronousOverrides()
  );
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [customizerProjectId, setCustomizerProjectId] = useState<string | undefined>(undefined);

  const [circlesVersion, setCirclesVersion] = useState<number>(0);

  // Hydrate custom images & circle customizations from server on startup
  useEffect(() => {
    getAllImageOverrides().then((overrides) => {
      setCustomOverrides(overrides);
    });
    syncCircleStorageWithBackend().then(() => {
      setCirclesVersion((v) => v + 1);
    });
    const unsub = subscribeToImageOverrides((overrides) => {
      setCustomOverrides(overrides);
    });
    const handleCirclesUpdated = () => {
      setCirclesVersion((v) => v + 1);
    };
    window.addEventListener('kaushik_circles_updated', handleCirclesUpdated);
    return () => {
      unsub();
      window.removeEventListener('kaushik_circles_updated', handleCirclesUpdated);
    };
  }, []);

  // Compute active projects with overridden images
  const activeProjects = React.useMemo(() => {
    return PROJECTS.map((proj) => {
      const override = customOverrides[proj.id];
      if (override && override !== '/projects/better-candle.png') {
        return { ...proj, imageUrl: override };
      }
      return proj;
    });
  }, [customOverrides]);

  // Compute active recent works with overridden images (excluding removed circles)
  const activeRecentWorks = React.useMemo(() => {
    const removedIds = getRemovedProjectIds();
    return PLAYGROUND_PORTFOLIO_ITEMS
      .filter((item) => {
        const plain = item.id.replace(/^pg-/, '');
        const prefixed = item.id.startsWith('pg-') ? item.id : `pg-${item.id}`;
        return (
          !removedIds.includes(item.id) &&
          !removedIds.includes(plain) &&
          !removedIds.includes(prefixed)
        );
      })
      .map((item) => {
        const key = item.id.replace('pg-', '');
        const override = customOverrides[item.id] || customOverrides[key];
        if (override) {
          return { ...item, imageUrl: override };
        }
        return item;
      });
  }, [customOverrides, circlesVersion]);

  const [customizerTab, setCustomizerTab] = useState<'upload' | 'url' | 'library'>('upload');

  // Cloudflare R2 Media Library state
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState<boolean>(false);
  const [mediaLibraryTab, setMediaLibraryTab] = useState<'library' | 'upload' | 'import'>('library');
  const [mediaLibraryCircleId, setMediaLibraryCircleId] = useState<string | undefined>(undefined);

  const openMediaLibrary = (tab: 'library' | 'upload' | 'import' = 'library', targetCircleId?: string) => {
    requireEditAccess(() => {
      soundManager.playClick();
      setMediaLibraryTab(tab);
      setMediaLibraryCircleId(targetCircleId);
      setIsMediaLibraryOpen(true);
    });
  };

  const openImageCustomizer = (projectId?: string, initialTab: 'upload' | 'url' | 'library' = 'upload') => {
    requireEditAccess(() => {
      soundManager.playClick();
      setCustomizerProjectId(projectId);
      setCustomizerTab(initialTab);
      setIsCustomizerOpen(true);
    });
  };

  // Smooth particle disintegration page transition handler
  const handleNavigate = (newView: ViewMode) => {
    if (newView === currentView || isTransitioning) return;
    soundManager.playClick();
    setTargetView(newView);
    setIsTransitioning(true);
  };

  // Sync theme with DOM root class & localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('huyml_theme', theme);
  }, [theme]);

  // Audio state toggle handler
  const toggleAudio = () => {
    const newState = !isAudioOn;
    setIsAudioOn(newState);
    soundManager.setEnabled(newState);
  };

  // Theme toggle handler
  const toggleTheme = () => {
    soundManager.playClick();
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 't' || e.key === 'T') {
        toggleTheme();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleAudio();
      } else if (e.key === '1') {
        handleNavigate('work');
      } else if (e.key === '2') {
        handleNavigate('about');
      } else if (e.key === '3') {
        handleNavigate('playground');
      } else if (e.key === 'c' || e.key === 'C') {
        soundManager.playClick();
        setIsContactOpen(true);
      } else if (e.key === 'i' || e.key === 'I' || e.key === 'e' || e.key === 'E') {
        if (isEditMode) {
          openImageCustomizer();
        }
      } else if (e.key === 'l' || e.key === 'L') {
        if (isEditMode) {
          openMediaLibrary();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAudioOn, theme, currentView, isTransitioning, activeProjects]);

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-300 overflow-x-hidden flex flex-col font-sans ${
        theme === 'dark'
          ? 'bg-[#0c0c0e] text-[#f4f4f4]'
          : 'bg-[#f4f4f1] text-[#0c0c0e]'
      }`}
    >
      {/* Signature Animated Intro Curtain (Available on replay) */}
      {isIntroVisible && (
        <IntroCurtain onComplete={() => setIsIntroVisible(false)} />
      )}

      {/* Cinematic Particle Disintegration Page Transition */}
      <ParticleTransitionOverlay
        isActive={isTransitioning}
        targetView={targetView}
        theme={theme}
        onSwitchView={(v) => setCurrentView(v)}
        onComplete={() => setIsTransitioning(false)}
      />

      {/* Main Content Views with Seamless Motion Transitions */}
      <main className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          {currentView === 'work' && (
            <motion.div
              key="work"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full"
            >
              <ProjectShowcase3D
                projects={activeProjects}
                currentView={currentView}
                onViewChange={handleNavigate}
                onOpenContact={() => setIsContactOpen(true)}
                onOpenShowreel={() => setIsShowreelOpen(true)}
                onSelectCaseStudy={(proj) => setSelectedCaseStudy(proj)}
                theme={theme}
                onToggleTheme={toggleTheme}
                isAudioOn={isAudioOn}
                onToggleAudio={toggleAudio}
                onOpenImageCustomizer={openImageCustomizer}
                customOverrides={customOverrides}
              />
            </motion.div>
          )}

          {currentView === 'playground' && (
            <motion.div
              key="playground"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <PlaygroundView
                onViewChange={handleNavigate}
                onOpenContact={() => setIsContactOpen(true)}
                theme={theme}
                onToggleTheme={toggleTheme}
                isAudioOn={isAudioOn}
                onToggleAudio={toggleAudio}
                onOpenImageCustomizer={openImageCustomizer}
                customOverrides={customOverrides}
              />
            </motion.div>
          )}

          {currentView === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <AboutView
                onViewChange={handleNavigate}
                onOpenContact={() => setIsContactOpen(true)}
                theme={theme}
                onToggleTheme={toggleTheme}
                isAudioOn={isAudioOn}
                onToggleAudio={toggleAudio}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Two-Card Contact Modal ("COME SAY HI" + "CREDITS") - Accessible from ANY page */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      {/* Video Showreel Player Modal */}
      <ShowreelModal
        isOpen={isShowreelOpen}
        onClose={() => setIsShowreelOpen(false)}
      />

      {/* Deep-Dive Project Case Study Modal */}
      <ProjectDetailModal
        project={selectedCaseStudy}
        onClose={() => setSelectedCaseStudy(null)}
        onNextProject={() => {
          if (!selectedCaseStudy) return;
          const currentIndex = activeProjects.findIndex((p) => p.id === selectedCaseStudy.id);
          const nextIndex = (currentIndex + 1) % activeProjects.length;
          setSelectedCaseStudy(activeProjects[nextIndex]);
        }}
        onPrevProject={() => {
          if (!selectedCaseStudy) return;
          const currentIndex = activeProjects.findIndex((p) => p.id === selectedCaseStudy.id);
          const prevIndex = (currentIndex - 1 + activeProjects.length) % activeProjects.length;
          setSelectedCaseStudy(activeProjects[prevIndex]);
        }}
      />

      {/* Persistent Website Image Customizer Modal (Supports Work Page & Recent Works) */}
      <ImageCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        projects={activeProjects}
        recentWorks={activeRecentWorks}
        currentView={currentView}
        theme={theme}
        initialProjectId={customizerProjectId}
        customOverrides={customOverrides}
        defaultTab={customizerTab}
      />

      {/* Cloudflare R2 Media Library & Bulk Manager Modal */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        initialTab={mediaLibraryTab}
        targetCircleId={mediaLibraryCircleId}
        onMediaChanged={() => {
          syncCircleStorageWithBackend();
          getAllImageOverrides().then(setCustomOverrides);
          setCirclesVersion((v) => v + 1);
        }}
      />

      {/* Floating Admin-only Cloudflare R2 Quick Access Bar */}
      {isEditMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="fixed bottom-5 right-5 z-[80] flex items-center gap-2"
        >
          <button
            onClick={() => openMediaLibrary('library')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#111116] hover:bg-[#191922] text-white border border-white/20 hover:border-[#e62b1e] shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer font-mono text-xs font-bold"
            title="Open Cloudflare R2 Media Library (Hotkey: L)"
          >
            <Cloud className="w-4 h-4 text-[#e62b1e]" />
            <span className="hidden sm:inline">R2 Media Library</span>
            <span className="sm:hidden">Media</span>
          </button>

          <button
            onClick={() => openMediaLibrary('upload')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#e62b1e] hover:bg-[#d02418] text-white border border-[#e62b1e]/50 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer font-mono text-xs font-bold"
            title="Bulk Upload to Cloudflare R2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </button>
        </motion.div>
      )}

      {/* Master Edit Password Gate Modal */}
      <MasterAuthModal />

      {/* Global Master Edit Notification Toast */}
      <AnimatePresence>
        {toastNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] px-4 py-2 rounded-full bg-[#141418] text-white border border-white/20 shadow-2xl font-mono text-xs font-bold flex items-center gap-2 pointer-events-none"
          >
            <span>{toastNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <MasterEditProvider>
      <PortfolioApp />
    </MasterEditProvider>
  );
}
