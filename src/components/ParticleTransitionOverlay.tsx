import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ViewMode, ThemeMode } from '../types/portfolio';
import { soundManager } from '../utils/audio';

interface ParticleTransitionOverlayProps {
  isActive: boolean;
  targetView: ViewMode;
  theme: ThemeMode;
  onSwitchView: (view: ViewMode) => void;
  onComplete: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  alpha: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  decay: number;
  shape: 'square' | 'circle' | 'shard';
  swirl: number;
}

const VIEW_METADATA: Record<
  ViewMode,
  { title: string; subtitle: string; index: string; category: string }
> = {
  work: {
    title: 'WORK',
    subtitle: 'SELECTED CAMPAIGNS, LOGOFOLIO & BRAND SYSTEMS',
    index: '01',
    category: 'GRAPHIC DESIGN & VIDEO EDITING',
  },
  about: {
    title: 'ABOUT',
    subtitle: 'KAUSHIK SAHA // 6+ YEARS EXPERIENCE // NEW DELHI',
    index: '02',
    category: 'BIOGRAPHY & EMPLOYMENT DOSSIER',
  },
  playground: {
    title: 'RECENT WORK',
    subtitle: 'SELECTED CLIENT WORK, CAMPAIGNS & MOTION CUTS',
    index: '03',
    category: 'SELECTED PORTFOLIO ARCHIVE',
  },
};

export const ParticleTransitionOverlay: React.FC<ParticleTransitionOverlayProps> = ({
  isActive,
  targetView,
  theme,
  onSwitchView,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  
  // Single-pass smooth transition
  const [textOpacity, setTextOpacity] = useState<number>(0);
  const isDark = theme === 'dark';

  const viewData = VIEW_METADATA[targetView] || VIEW_METADATA.work;

  // Color palette for particles based on theme
  const getParticleColors = useCallback(() => {
    if (isDark) {
      return ['#ffffff', '#ffffff', '#e62b1e', '#e2e8f0', '#94a3b8', '#fb7185', '#cbd5e1'];
    }
    return ['#0c0c0e', '#0c0c0e', '#e62b1e', '#27272a', '#52525b', '#dc2626', '#71717a'];
  }, [isDark]);

  // Spawn single-pass particle disintegration effect
  const spawnSingleDisintegration = useCallback((width: number, height: number) => {
    const count = Math.min(Math.floor((width * height) / 1000), 1200);
    const colors = getParticleColors();
    const newParticles: Particle[] = [];

    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      
      const angle = -Math.PI / 2 + (Math.random() - 0.4) * 1.4;
      const speed = Math.random() * 5.0 + 1.5;
      const baseSize = Math.random() * 3.5 + 1.2;

      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: baseSize,
        baseSize,
        alpha: Math.random() * 0.75 + 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        life: 0,
        maxLife: Math.random() * 50 + 35,
        decay: Math.random() * 0.02 + 0.015,
        shape: Math.random() > 0.4 ? 'square' : Math.random() > 0.3 ? 'shard' : 'circle',
        swirl: (Math.random() - 0.5) * 2.5,
      });
    }

    // Add perimeter frame particles around the center box
    const isMobile = width < 768;
    const cardW = Math.min(width * 0.9, isMobile ? 360 : 640);
    const cardH = isMobile ? 220 : 260;
    const cardLeft = cx - cardW / 2;
    const cardTop = cy - cardH / 2;

    for (let i = 0; i < 200; i++) {
      const edge = Math.floor(Math.random() * 4);
      let fx = cardLeft;
      let fy = cardTop;
      if (edge === 0) { fx += Math.random() * cardW; }
      else if (edge === 1) { fx += cardW; fy += Math.random() * cardH; }
      else if (edge === 2) { fx += Math.random() * cardW; fy += cardH; }
      else { fy += Math.random() * cardH; }

      const angle = Math.atan2(fy - cy, fx - cx);
      const speed = Math.random() * 5.5 + 1.5;
      newParticles.push({
        x: fx,
        y: fy,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * speed - Math.random() * 2,
        size: Math.random() * 3.2 + 1,
        baseSize: Math.random() * 3.2 + 1,
        alpha: Math.random() * 0.8 + 0.2,
        color: Math.random() > 0.8 ? '#e62b1e' : colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        life: 0,
        maxLife: Math.random() * 45 + 30,
        decay: Math.random() * 0.025 + 0.018,
        shape: 'square',
        swirl: (Math.random() - 0.5) * 2,
      });
    }

    particlesRef.current = newParticles;
  }, [getParticleColors]);

  // Main animation render loop - Single-Pass Transition (Appears only ONCE)
  useEffect(() => {
    if (!isActive) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      particlesRef.current = [];
      setTextOpacity(0);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Single-pass transition:
    // 0ms: Play transition sound & spawn particle disintegration once
    soundManager.playDisintegrate();
    spawnSingleDisintegration(width, height);
    setTextOpacity(1);

    // 500ms: Switch view in background so target content is ready
    const switchTimer = setTimeout(() => {
      onSwitchView(targetView);
    }, 500);

    // 1000ms: Smoothly fade out text plaque as particles disperse
    const fadeTimer = setTimeout(() => {
      setTextOpacity(0);
    }, 1000);

    // 1250ms: Complete transition cleanly into the new page (ONLY ONCE)
    const doneTimer = setTimeout(() => {
      onComplete();
    }, 1250);

    // Particle render loop
    let lastTime = performance.now();
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        p.alpha -= p.decay;
        p.rotation += p.rotSpeed;

        // Apply velocities with turbulence/swirl
        p.x += p.vx + Math.sin(p.life * 0.08 + p.swirl) * 1.2;
        p.y += p.vy + Math.cos(p.life * 0.08 + p.swirl) * 0.8;

        // Air drag
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.size = Math.max(0.2, p.size * 0.99);

        if (p.alpha <= 0.01 || p.size <= 0.3) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.fillStyle = p.color;

        if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (p.shape === 'shard') {
          ctx.fillRect(-p.size, -p.size / 3, p.size * 2, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearTimeout(switchTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [
    isActive,
    targetView,
    theme,
    spawnSingleDisintegration,
    onSwitchView,
    onComplete,
  ]);

  if (!isActive) return null;

  const isLongTitle = viewData.title.length > 7;

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-[#08080a] text-white' : 'bg-[#f4f4f1] text-[#0c0c0e]'
      }`}
    >
      {/* High-legibility ambient spotlight vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(circle at center, rgba(32, 32, 40, 0.6) 0%, rgba(8, 8, 10, 0.98) 75%)'
            : 'radial-gradient(circle at center, rgba(255, 255, 255, 0.92) 0%, rgba(240, 240, 236, 0.98) 75%)',
        }}
      />

      {/* High-Performance Canvas for Particle Disintegration */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Target Page Typography Showcase with Expanded Box Width & Scaled Typography */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 transition-all duration-300 ease-out max-w-3xl sm:max-w-4xl lg:max-w-5xl w-[94vw] mx-auto"
        style={{
          opacity: textOpacity,
          transform: textOpacity > 0 ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(10px)',
          pointerEvents: 'none',
        }}
      >
        {/* Architectural Monograph Plaque: Generous Width so Text Never Leaves Box */}
        <div
          className={`relative w-full rounded-2xl px-6 sm:px-14 md:px-16 py-8 sm:py-12 border shadow-2xl backdrop-blur-xl ${
            isDark
              ? 'bg-[#121216]/95 border-white/20 text-white shadow-[0_25px_60px_rgba(0,0,0,0.85)]'
              : 'bg-white/95 border-black/15 text-[#0c0c0e] shadow-[0_20px_50px_rgba(0,0,0,0.12)]'
          }`}
        >
          {/* Subtle Technical Corner Accents '+' */}
          <span className={`absolute top-3.5 left-4 text-xs font-mono select-none opacity-40 leading-none ${isDark ? 'text-white' : 'text-black'}`}>+</span>
          <span className={`absolute top-3.5 right-4 text-xs font-mono select-none opacity-40 leading-none ${isDark ? 'text-white' : 'text-black'}`}>+</span>
          <span className={`absolute bottom-3.5 left-4 text-xs font-mono select-none opacity-40 leading-none ${isDark ? 'text-white' : 'text-black'}`}>+</span>
          <span className={`absolute bottom-3.5 right-4 text-xs font-mono select-none opacity-40 leading-none ${isDark ? 'text-white' : 'text-black'}`}>+</span>

          {/* Monograph Index & Category badge */}
          <div className="flex items-center justify-center gap-2.5 mb-5 flex-wrap">
            <span className="font-gotham text-[11px] sm:text-xs tracking-[0.25em] text-white bg-[#e62b1e] px-2.5 py-0.5 rounded font-bold uppercase shadow-sm">
              [ {viewData.index} ]
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#e62b1e]" />
            <span
              className={`font-gotham text-[11px] sm:text-xs tracking-[0.25em] font-bold uppercase ${
                isDark ? 'text-neutral-300' : 'text-neutral-700'
              }`}
            >
              {viewData.category}
            </span>
          </div>

          {/* Big Page Name in Unbounded Font: Proportional scaling so words like PLAYGROUND fit perfectly */}
          <div className="w-full flex justify-center items-center overflow-hidden py-1">
            <h1
              className={`font-unbounded font-black uppercase leading-none select-none ${
                isLongTitle
                  ? 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight sm:tracking-normal'
                  : 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-normal sm:tracking-wide'
              } ${
                isDark ? 'text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]' : 'text-[#0c0c0e] drop-shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
              }`}
            >
              {viewData.title}
            </h1>
          </div>

          {/* Subtitle in Gotham Font with high-contrast text and sleek hairline border */}
          <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/15' : 'border-black/15'}`}>
            <p
              className={`font-gotham text-xs sm:text-sm tracking-[0.22em] font-semibold uppercase select-none ${
                isDark ? 'text-neutral-100' : 'text-neutral-900'
              }`}
            >
              {viewData.subtitle}
            </p>
          </div>

          {/* Dynamic Status / Navigation Cue */}
          <div
            className={`mt-6 flex items-center justify-center gap-2 font-mono-tabular text-[11px] tracking-widest uppercase ${
              isDark ? 'text-neutral-400' : 'text-neutral-600'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#e62b1e] animate-pulse" />
            <span className="font-semibold">SWITCHING TO {viewData.title} // [ {viewData.index} / 03 ]</span>
          </div>
        </div>
      </div>
    </div>
  );
};
