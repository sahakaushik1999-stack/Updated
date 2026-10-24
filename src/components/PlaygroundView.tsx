import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ViewMode, ThemeMode } from '../types/portfolio';
import { soundManager } from '../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Camera,
  Play,
  Pencil,
  Plus,
  Trash2,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Video,
} from 'lucide-react';
import { CircleEditModal } from './CircleEditModal';
import { ProjectGalleryModal } from './ProjectGalleryModal';
import { AddCircleModal } from './AddCircleModal';
import { isVideoUrl } from '../utils/mediaUpload';
import { useMasterEdit } from '../context/MasterEditContext';
import { MasterEditButton } from './MasterAuthModal';
import {
  getAllCircleCustomizations,
  syncCircleStorageWithBackend,
  saveCircleCustomization,
  getProjectGallery,
  resetCircleCustomization,
  getCustomProjects,
  addCustomProject,
  getRemovedProjectIds,
  removeCircle,
  restoreRemovedCircle,
  restoreAllCircles,
  CircleData,
  CustomCircleItem,
} from '../utils/circleStorage';

interface PlaygroundViewProps {
  onViewChange: (view: ViewMode) => void;
  onOpenContact: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  isAudioOn: boolean;
  onToggleAudio: () => void;
  onOpenImageCustomizer?: (projectId?: string, initialTab?: 'upload' | 'url' | 'library') => void;
  customOverrides?: Record<string, string>;
}

export interface PlaygroundItem {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  category: 'Campaigns & Festivals' | 'Logofolio & Branding' | 'Editorial & Lookbooks' | 'Packaging' | 'Motion & Video';
  year: string;
  tool: string;
  client: string;
  imageUrl: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  aspect: 'landscape' | 'portrait' | 'square';
  description: string;
  processNotes: string;
  tags: string[];
}

export const PLAYGROUND_PORTFOLIO_ITEMS: PlaygroundItem[] = [
  {
    id: 'pg-themonk-frames',
    index: '01',
    title: 'THEMONK TITANIUM EYEWEAR',
    subtitle: 'Minimalist editorial frames & optical packaging',
    category: 'Editorial & Lookbooks',
    year: '2024',
    tool: 'InDesign // Photoshop',
    client: 'TheMonk Eyewear / Culture Boat',
    imageUrl: '/projects/the-monk-eyewear.webp',
    aspect: 'portrait',
    description: 'Editorial eyewear campaign spotlighting titanium frames, anti-reflective lenses, and bespoke matte carrying cases.',
    processNotes: 'Captured fine micro-engravings on temples and designed clean multi-page lookbook spreads with Japanese grid typography.',
    tags: ['Eyewear Design', 'Lookbook', 'Titanium Frames', 'Minimalist'],
  },
  {
    id: 'pg-themonk-tokyo',
    index: '02',
    title: 'Superdry',
    subtitle: 'Frameless titanium sunglasses luxury lookbook',
    category: 'Editorial & Lookbooks',
    year: '2024',
    tool: 'Photoshop // InDesign',
    client: 'TheMonk Eyewear / Culture Boat',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
    videoUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
    mediaType: 'video',
    aspect: 'landscape',
    description: 'Technical product catalog highlighting frameless titanium sunglasses with Japanese aesthetics, colorways, and bespoke gift packaging.',
    processNotes: 'Showcased micro-details of gold with black accents, silver with blue accents, and rose gold finishes in clean multi-page lookbook spreads.',
    tags: ['Eyewear Lookbook', 'Product Catalog', 'Titanium Frames', 'Bilingual Typography'],
  },
  {
    id: 'pg-themonk-lookbook',
    index: '03',
    title: 'LOOKBOOK — THEMONK',
    subtitle: 'Minimalist editorial fashion publication system',
    category: 'Editorial & Lookbooks',
    year: '2024',
    tool: 'InDesign // Illustrator',
    client: 'TheMonk Clothing / Culture Boat',
    imageUrl: '/projects/lookbook-themonk.webp',
    aspect: 'portrait',
    description: 'Clean editorial catalog spread exploring asymmetric Swiss grid systems, ample white space, and bilingual typography for contemporary streetwear.',
    processNotes: 'Established modular typographic hierarchies and metallic accent specifications for lookbook distribution across international wholesale buyers.',
    tags: ['Lookbook', 'Editorial Grid', 'Fashion Design', 'Swiss Grid'],
  },
  {
    id: 'pg-better-candle',
    index: '04',
    title: 'Combine Sports',
    subtitle: 'Organic illustrated box packaging with fluid type',
    category: 'Packaging',
    year: '2023',
    tool: 'Adobe Illustrator',
    client: 'Better Candle Co. / Fortune Studios',
    imageUrl: 'https://lh3.googleusercontent.com/d/14AWG2JsZzgdRATdPjqSg8m0FFv37KBBe',
    aspect: 'portrait',
    description: 'Playful organic packaging illustration with flowing purple lettering, fresh tomato, broccoli, carrot vector art, and warm sunny orange fields.',
    processNotes: 'Engineered custom dielines for eco-friendly soy wax candle boxes, emphasizing clean natural ingredients with whimsical fluid typography.',
    tags: ['Candle Packaging', 'Fluid Typography', 'Illustration', 'Eco-friendly'],
  },
  {
    id: 'pg-biocule',
    index: '05',
    title: 'BIOCULE "WHERE SCIENCE MEETS GLAMOUR"',
    subtitle: 'Clinical bioactive skincare editorial branding',
    category: 'Campaigns & Festivals',
    year: '2023',
    tool: 'Photoshop // Illustrator',
    client: 'Biocule Skincare / Culture Boat',
    imageUrl: '/projects/rebranding-for-biocule.png',
    aspect: 'portrait',
    description: 'Fine oval monogram and luxury editorial beauty typography bridging molecular clinical dermatological efficacy with glamorous consumer appeal.',
    processNotes: 'Developed social media campaign templates, influencer PR unboxing aesthetics, and laboratory-tested brand messaging for Gen Z and millennial skincare.',
    tags: ['Clean Science', 'Skincare Branding', 'Social Campaign', 'Editorial Beauty'],
  },
  {
    id: 'pg-harmony',
    index: '06',
    title: 'The Monk',
    subtitle: 'Mindful sound design waveform interface',
    category: 'Logofolio & Branding',
    year: '2023',
    tool: 'Illustrator // Figma',
    client: 'Harmony Living / Abstract Reality',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Monk/themonkworld-photo-DBd3sLdOHO--20241023_180042_481296252.jpg',
    aspect: 'portrait',
    description: 'Golden glowing smartphone UI with sound waveform glyph, connecting mindful tranquility, acoustic design, and ergonomic lifestyle hardware.',
    processNotes: 'Engineered dark-mode glowing app icons, minimalist grid interface, and harmonious typography for mindful audio products.',
    tags: ['App Identity', 'Sound Design', 'Dark UI', 'Acoustics'],
  },
  {
    id: 'pg-the-trost',
    index: '07',
    title: 'RPL',
    subtitle: 'High-converting social ad creatives and artist announcements',
    category: 'Campaigns & Festivals',
    year: '2024',
    tool: 'Photoshop // Illustrator',
    client: 'The Trost / Culture Boat',
    imageUrl: 'https://lh3.googleusercontent.com/d/1B0VMMTXybww2M_O52fDTeKP2snA1LoEj',
    aspect: 'landscape',
    description: 'High-impact Meta Ads campaign and artist lineup creatives for The Trost, featuring perforated ticket layouts, day-wise artist reveals, and dynamic social conversion assets.',
    processNotes: 'Engineered high-converting social media advertising assets and lineup announcement posts optimized for Instagram and Facebook feeds.',
    tags: ['Meta Ads', 'Performance Creative', 'Social Campaign', 'Typography'],
  },
  {
    id: 'pg-superdry',
    index: '08',
    title: 'BIOCULE',
    subtitle: 'Flat half-price seasonal retail visual system',
    category: 'Campaigns & Festivals',
    year: '2024',
    tool: 'Photoshop // Premiere Pro',
    client: 'Superdry India / Culture Boat',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Biocule/30e142186713967.657af35388e43.webp',
    aspect: 'landscape',
    description: 'Layered photo-manipulation and neon-infused promo posters combining British tailoring with Japanese vintage graphics.',
    processNotes: 'Focused on high-impact retail signage and fast-cut social video edits, spotlighting apparel cuts with bold 3D extruded lettering and summer duotone textures.',
    tags: ['Retail Campaign', 'Streetwear', 'Photo Manipulation', 'Ad Graphics'],
  },
  {
    id: 'pg-video-reels',
    index: '09',
    title: 'COMMERCIAL VIDEO & REEL SHOWCASE',
    subtitle: 'Multi-client rhythm editing & kinetic graphics',
    category: 'Motion & Video',
    year: '2024—2025',
    tool: 'Premiere Pro // After Effects',
    client: 'Soledition / SUPERDRY / Araiya / Moira / Combine Sports / SIS',
    imageUrl: '/videos/reel-commercial.mp4',
    videoUrl: '/videos/reel-commercial.mp4',
    mediaType: 'video',
    aspect: 'landscape',
    description: 'Commercial video reel exploration spanning music festivals, streetwear launches, luxury resorts, and corporate security spots.',
    processNotes: 'Explored multi-track audio synchronicity, dynamic speed ramps, cinematic LUT grading, and custom lower-third kinetic text animations.',
    tags: ['Video Editing', 'Motion Graphics', 'Premiere Pro', 'Commercial Cuts'],
  },
  {
    id: 'pg-combine',
    index: '10',
    title: 'COMBINE SPORTS',
    subtitle: 'Forward-leaning dynamic vector logomark',
    category: 'Logofolio & Branding',
    year: '2024',
    tool: 'Adobe Illustrator',
    client: 'Combine Sports / Fortune Studios',
    imageUrl: 'https://lh3.googleusercontent.com/d/1LPJ89eJ9WpRJkNNdRyoqeKA0tYkJy3Dk',
    aspect: 'portrait',
    description: 'Athletic mark and stadium billboard study conveying velocity, endurance, and unity through sharp geometric angles.',
    processNotes: 'Designed an interlocking chevron lettermark suitable for apparel embroidery, high-visibility stadium billboards, and motion stingers for athlete reels.',
    tags: ['Sports Branding', 'Lettermark', 'Vector Art', 'Logofolio'],
  },
  {
    id: 'pg-cha-drops',
    index: '11',
    title: 'Rasaiem',
    subtitle: 'Botanical liquid tea drops apothecary packaging',
    category: 'Packaging',
    year: '2024',
    tool: 'Illustrator // Photoshop',
    client: 'Cha Tea Co. / Fortune Studios',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Harmony/c11ec4184593927.6554c4a74779f.webp',
    aspect: 'portrait',
    description: 'Dropper bottle label architecture and carton packaging celebrating regional Indian tea notes: Hyderabadi Chai, Delhi Kadak, Elaichi Blend, and Mumbai Cutting.',
    processNotes: 'Combined natural organic leaf photography with warm earthy color codes and elegant serif typography for a high-end gourmet apothecary feel.',
    tags: ['Packaging', 'Apothecary', 'Botanical', 'Label Design'],
  },
  {
    id: 'pg-soledition',
    index: '12',
    title: 'SOLEDITION',
    subtitle: 'High-voltage sneaker festival visual identity & stage graphics',
    category: 'Campaigns & Festivals',
    year: '2024',
    tool: 'Photoshop // Illustrator',
    client: 'Soledition / Culture Boat',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
    videoUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
    mediaType: 'video',
    aspect: 'landscape',
    description: 'High-voltage streetwear festival branding, stage screen visuals, wristbands, and artist announcement drops.',
    processNotes: 'Merged bold neon typography with distressed halftone textures and sneaker culture aesthetic.',
    tags: ['Streetwear Festival', 'Sneaker Culture', 'Event Branding', 'Stage Visuals'],
  },
  {
    id: 'pg-masala',
    index: '13',
    title: 'District',
    subtitle: 'Culinary spices botanical pattern & storefront design',
    category: 'Logofolio & Branding',
    year: '2024',
    tool: 'Illustrator // Photoshop',
    client: 'Masala Synergy Spices / Abstract Reality',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4',
    videoUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4',
    mediaType: 'video',
    aspect: 'landscape',
    description: 'Deep teal botanical spice illustration pattern, custom barista apron mockup, and architectural storefront signage.',
    processNotes: 'Harmonized Indian heritage spices into a cohesive luxury repeat pattern and branded staff merchandise.',
    tags: ['Spice Branding', 'Repeat Pattern', 'Merchandise', 'Packaging'],
  },
  {
    id: 'pg-shuchi',
    index: '14',
    title: 'SHUCHI BELTINGS FACTORY SIGNAGE',
    subtitle: 'Industrial conveyor manufacturing corporate identity',
    category: 'Logofolio & Branding',
    year: '2023',
    tool: 'Adobe Illustrator',
    client: 'Shuchi Beltings Ltd. / Fortune Studios',
    imageUrl: '/projects/shuchi-beltings.webp',
    aspect: 'portrait',
    description: 'Architectural factory facade installation with the red conveyor belt loop emblem for heavy industrial logistics.',
    processNotes: 'Crafted technical vector marks built to endure large-scale industrial signage, fleet livery, and machinery nameplates.',
    tags: ['Industrial Design', 'Corporate Identity', 'Signage System'],
  },
  {
    id: 'pg-superdry-outlet',
    index: '15',
    title: 'The Trost',
    subtitle: 'Architectural retail store graphics & seasonal windows',
    category: 'Campaigns & Festivals',
    year: '2024',
    tool: 'Illustrator // CAD',
    client: 'Superdry / Culture Boat',
    imageUrl: '/projects/superdry-outlet.webp',
    aspect: 'landscape',
    description: 'Retail storefront installations, vinyl wall wraps, and window graphics for Superdry outlet openings.',
    processNotes: 'Scaled British vintage collegiate lettering and distressed industrial graphics across shopping mall displays.',
    tags: ['Retail Architecture', 'Storefront Graphics', 'Window Display', 'Superdry'],
  },
  {
    id: 'pg-horology',
    index: '16',
    title: 'ALL ABOUT HOROLOGY',
    subtitle: 'Golden-ratio mechanical chronometer insignia',
    category: 'Logofolio & Branding',
    year: '2024',
    tool: 'Adobe Illustrator',
    client: 'All About Horology / Abstract Reality',
    imageUrl: 'https://lh3.googleusercontent.com/d/1EiKaAn3xObEU4E5XKg59ros4J-tSlmrl',
    aspect: 'portrait',
    description: 'Precision luxury timepiece monogram and guilloché-inspired mark created for mechanical watch journalism.',
    processNotes: 'Engineered an overlapping monogram with circular golden-ratio proportions.',
    tags: ['Logofolio', 'Monogram', 'Watchmaking', 'Vector Precision'],
  },
];

type CategoryFilter = 'All' | 'Campaigns & Festivals' | 'Logofolio & Branding' | 'Editorial & Lookbooks' | 'Packaging' | 'Motion & Video';

export const PlaygroundView: React.FC<PlaygroundViewProps> = ({
  onViewChange,
  onOpenContact,
  theme,
  onToggleTheme,
  isAudioOn,
  onToggleAudio,
  onOpenImageCustomizer,
  customOverrides,
}) => {
  const { isEditMode } = useMasterEdit();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [activeGalleryCircle, setActiveGalleryCircle] = useState<{ item: PlaygroundItem; circleId: string } | null>(null);
  const [editingCircle, setEditingCircle] = useState<{
    item: PlaygroundItem;
    circleId: string;
    currentTitle: string;
    currentImageUrl: string;
    currentVideoUrl?: string;
  } | null>(null);
  const [isAddCircleOpen, setIsAddCircleOpen] = useState<boolean>(false);
  const [timeString, setTimeString] = useState<string>('12:00');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [circleCustomizations, setCircleCustomizations] = useState<Record<string, CircleData>>({});
  const [customProjects, setCustomProjects] = useState<CustomCircleItem[]>([]);
  const [removedProjectIds, setRemovedProjectIds] = useState<string[]>([]);
  const [toastNotice, setToastNotice] = useState<{ message: string; undoCircleId?: string } | null>(null);

  // Active Center Card Index in the 3D Arc
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragDistanceRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);

  // Responsive screen sizing
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync customizations from storage and backend server
  useEffect(() => {
    // 1. Initial snapshot from local cache
    setCircleCustomizations(getAllCircleCustomizations());
    setCustomProjects(getCustomProjects());
    setRemovedProjectIds(getRemovedProjectIds());

    // 2. Fetch fresh server data so that page refresh immediately reflects latest backend state
    syncCircleStorageWithBackend().then((state) => {
      if (state && state.customizations) {
        setCircleCustomizations({ ...state.customizations });
        setCustomProjects([...state.customProjects]);
        setRemovedProjectIds([...state.removedProjectIds]);
      }
    });

    const handleUpdated = () => {
      setCircleCustomizations(getAllCircleCustomizations());
      setCustomProjects(getCustomProjects());
      setRemovedProjectIds(getRemovedProjectIds());
    };
    window.addEventListener('kaushik_circles_updated', handleUpdated);
    return () => window.removeEventListener('kaushik_circles_updated', handleUpdated);
  }, []);

  // Compute full active list with overrides
  const itemsWithOverrides = useMemo(() => {
    const allItems: PlaygroundItem[] = [...customProjects, ...PLAYGROUND_PORTFOLIO_ITEMS];
    const activeItems = allItems.filter((item) => {
      const plain = item.id.replace(/^pg-/, '');
      const prefixed = item.id.startsWith('pg-') ? item.id : `pg-${item.id}`;
      return (
        !removedProjectIds.includes(item.id) &&
        !removedProjectIds.includes(plain) &&
        !removedProjectIds.includes(prefixed)
      );
    });

    return activeItems.map((item) => {
      const plainId = item.id.replace(/^pg-/, '');
      const prefixedId = item.id.startsWith('pg-') ? item.id : `pg-${item.id}`;
      const custom =
        circleCustomizations[item.id] ||
        circleCustomizations[prefixedId] ||
        circleCustomizations[plainId];

      const galleryVideos = (custom?.gallery || []).filter((u) => isVideoUrl(u));
      const effectiveVideo =
        custom?.videoUrl ||
        (isVideoUrl(custom?.imageUrl) ? custom?.imageUrl : undefined) ||
        (galleryVideos.length > 0 ? galleryVideos[0] : undefined) ||
        item.videoUrl;

      const isVideoMedia =
        custom?.mediaType === 'video' ||
        Boolean(custom?.videoUrl) ||
        isVideoUrl(custom?.imageUrl) ||
        (custom?.mediaType !== 'image' && Boolean(effectiveVideo));

      const titleOverride = custom?.title || item.title;

      if (isVideoMedia && effectiveVideo) {
        return {
          ...item,
          imageUrl: effectiveVideo,
          videoUrl: effectiveVideo,
          mediaType: 'video' as const,
          title: titleOverride,
        };
      }

      const imageOverride =
        custom?.imageUrl ||
        customOverrides?.[item.id] ||
        customOverrides?.[plainId] ||
        item.imageUrl;

      return {
        ...item,
        imageUrl: imageOverride,
        videoUrl: undefined,
        mediaType: 'image' as const,
        title: titleOverride,
      };
    });
  }, [customProjects, removedProjectIds, customOverrides, circleCustomizations]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') return itemsWithOverrides;
    return itemsWithOverrides.filter((item) => item.category === activeCategory);
  }, [itemsWithOverrides, activeCategory]);

  const total = filteredItems.length;

  // Step active card
  const stepCard = useCallback(
    (direction: number) => {
      if (total <= 1) return;
      soundManager.playSlide();
      setActiveIndex((prev) => (prev + direction + total) % total);
    },
    [total]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (activeGalleryCircle || editingCircle || isAddCircleOpen) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        stepCard(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        stepCard(-1);
      } else if (e.key === 'Enter') {
        const cur = filteredItems[activeIndex];
        if (cur) {
          soundManager.playClick();
          setActiveGalleryCircle({ item: cur, circleId: cur.id });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepCard, activeGalleryCircle, editingCircle, isAddCircleOpen, filteredItems, activeIndex]);

  // Robust Mouse Wheel & Trackpad Navigation (smooth, responsive, unconflicted)
  const lastScrollTimeRef = useRef<number>(0);
  const scrollLockRef = useRef<boolean>(false);

  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      // Do not intercept if a modal is open
      if (activeGalleryCircle || editingCircle || isAddCircleOpen) return;

      // Do not intercept if inside a scrollable dropdown or input
      const target = e.target as HTMLElement | null;
      if (
        target?.closest?.('.overflow-y-auto') ||
        target?.closest?.('.overflow-x-auto') ||
        target?.closest?.('input') ||
        target?.closest?.('textarea')
      ) {
        return;
      }

      // Check dominant delta direction (vertical wheel or horizontal trackpad pan)
      const primaryDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(primaryDelta) < 3) return;

      const now = performance.now();
      if (now - lastScrollTimeRef.current < 160 || scrollLockRef.current) {
        return;
      }

      if (primaryDelta > 8) {
        lastScrollTimeRef.current = now;
        scrollLockRef.current = true;
        stepCard(1);
        setTimeout(() => {
          scrollLockRef.current = false;
        }, 140);
      } else if (primaryDelta < -8) {
        lastScrollTimeRef.current = now;
        scrollLockRef.current = true;
        stepCard(-1);
        setTimeout(() => {
          scrollLockRef.current = false;
        }, 140);
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, [stepCard, activeGalleryCircle, editingCircle, isAddCircleOpen]);

  // Touch Swipe Gesture for Mobile & Tablets
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartXRef.current;
    const diffY = touchEndY - touchStartYRef.current;

    // Horizontal swipe must dominate vertical scroll
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 25) {
      if (diffX < 0) {
        stepCard(1); // Swipe left -> Next card
      } else {
        stepCard(-1); // Swipe right -> Previous card
      }
    }
  };

  // Mouse / Pointer Drag Gesture
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button') || target?.closest('a') || target?.closest('input') || target?.closest('textarea')) return;
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragDistanceRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    dragDistanceRef.current = e.clientX - dragStartXRef.current;
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragDistanceRef.current < -25) {
      stepCard(1);
    } else if (dragDistanceRef.current > 25) {
      stepCard(-1);
    }
    dragDistanceRef.current = 0;
  };

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };
      setTimeString(new Intl.DateTimeFormat('en-GB', options).format(now));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const categories: CategoryFilter[] = [
    'All',
    'Campaigns & Festivals',
    'Logofolio & Branding',
    'Editorial & Lookbooks',
    'Packaging',
    'Motion & Video',
  ];

  const currentItem = filteredItems[activeIndex] || filteredItems[0];

  // Responsive dimensions for the 3D Arc
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  const cardWidth = isMobile ? 220 : isTablet ? 290 : 360;
  const cardHeight = isMobile ? 245 : isTablet ? 320 : 390;
  const spacingX = isMobile ? 135 : isTablet ? 210 : 285;

  // Arc positioning calculation
  const getCardTransform = (offset: number) => {
    let x = 0;
    let y = 0;
    let z = 0;
    let rotateZ = 0;
    let rotateY = 0;
    let scale = 1;
    let opacity = 1;
    let zIndex = 30 - Math.abs(offset) * 5;

    if (offset === 0) {
      // Active center card
      x = 0;
      y = 0;
      z = 40;
      rotateZ = 0;
      rotateY = 0;
      scale = 1.06;
      opacity = 1;
      zIndex = 40;
    } else if (offset === -1) {
      // Immediate left
      x = -spacingX;
      y = isMobile ? 20 : 32;
      z = -45;
      rotateZ = 7.5;
      rotateY = 16;
      scale = 0.88;
      opacity = 0.88;
      zIndex = 30;
    } else if (offset === 1) {
      // Immediate right
      x = spacingX;
      y = isMobile ? 20 : 32;
      z = -45;
      rotateZ = -7.5;
      rotateY = -16;
      scale = 0.88;
      opacity = 0.88;
      zIndex = 30;
    } else if (offset === -2) {
      // Far left
      x = -spacingX * 1.88;
      y = isMobile ? 55 : 88;
      z = -120;
      rotateZ = 15;
      rotateY = 28;
      scale = 0.72;
      opacity = 0.55;
      zIndex = 20;
    } else if (offset === 2) {
      // Far right
      x = spacingX * 1.88;
      y = isMobile ? 55 : 88;
      z = -120;
      rotateZ = -15;
      rotateY = -28;
      scale = 0.72;
      opacity = 0.55;
      zIndex = 20;
    } else if (offset < -2) {
      // Left offscreen buffer
      x = -spacingX * 2.6;
      y = 150;
      z = -220;
      rotateZ = 22;
      rotateY = 38;
      scale = 0.55;
      opacity = 0;
      zIndex = 10;
    } else if (offset > 2) {
      // Right offscreen buffer
      x = spacingX * 2.6;
      y = 150;
      z = -220;
      rotateZ = -22;
      rotateY = -38;
      scale = 0.55;
      opacity = 0;
      zIndex = 10;
    }

    return { x, y, z, rotateZ, rotateY, scale, opacity, zIndex };
  };

  return (
    <div
      className={`relative w-full min-h-screen transition-colors duration-500 font-sans flex flex-col justify-between overflow-x-hidden select-none ${
        theme === 'light'
          ? 'bg-[#f4f4f1] text-[#0c0c0e]'
          : 'bg-[#060608] text-[#f4f4f4]'
      }`}
    >
      {/* ================= ATMOSPHERIC BACKDROP SILHOUETTE (Exact Reference Vibe) ================= */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
        {/* Subtle radial spotlight glow behind cards */}
        <div
          className={`w-[850px] h-[550px] rounded-full blur-[110px] pointer-events-none ${
            theme === 'light'
              ? 'bg-neutral-300/40'
              : 'bg-gradient-to-b from-indigo-950/20 via-neutral-900/40 to-transparent'
          }`}
        />

        {/* Ambient Dark Glasses Silhouette in backdrop matching reference */}
        <div className="absolute top-[18%] opacity-20 dark:opacity-35 pointer-events-none filter blur-sm transform scale-125 sm:scale-150">
          <svg
            width="520"
            height="180"
            viewBox="0 0 520 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-neutral-400 dark:text-neutral-800"
          >
            <circle cx="130" cy="90" r="75" stroke="currentColor" strokeWidth="16" />
            <circle cx="390" cy="90" r="75" stroke="currentColor" strokeWidth="16" />
            <path
              d="M205 75 C235 60, 285 60, 315 75"
              stroke="currentColor"
              strokeWidth="16"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* ================= DESKTOP HEADER (Aligned with Work & About) ================= */}
      <header className="relative z-30 pt-4 md:pt-6 lg:pt-8 xl:pt-10 px-4 md:px-6 lg:px-8 xl:px-14 flex items-start justify-between w-full pointer-events-none shrink-0">
        {/* Left: Menu Navigation Stack */}
        <div className="w-56 sm:w-64 lg:w-72 shrink-0 pointer-events-auto">
          <div className="font-sans font-semibold text-[10px] md:text-xs text-neutral-500 dark:text-neutral-400 mb-2 tracking-wider uppercase select-none">
            Menu
          </div>
          <nav className="flex flex-col font-sans text-base md:text-lg lg:text-xl xl:text-2xl font-black tracking-tight uppercase leading-[0.95] space-y-1">
            <button
              onClick={() => {
                soundManager.playClick();
                onViewChange('work');
              }}
              className={`text-left flex items-center group transition-colors cursor-pointer whitespace-nowrap hover:text-[#e62b1e] ${
                theme === 'light' ? 'text-[#0c0c0e]' : 'text-white'
              }`}
            >
              <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm" />
              <span className="group-hover:opacity-80 transition-opacity">WORK</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onViewChange('about');
              }}
              className={`text-left flex items-center group transition-colors cursor-pointer whitespace-nowrap hover:text-[#e62b1e] ${
                theme === 'light' ? 'text-[#0c0c0e]' : 'text-white'
              }`}
            >
              <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm" />
              <span className="group-hover:opacity-80 transition-opacity">ABOUT</span>
            </button>

            {/* RECENT WORK (Active) */}
            <button
              onClick={() => {
                soundManager.playClick();
                onViewChange('playground');
              }}
              className="text-left flex items-center transition-colors cursor-pointer whitespace-nowrap text-[#e62b1e]"
            >
              <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm">→</span>
              <span>RECENT WORK</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onOpenContact();
              }}
              className={`text-left flex items-center group transition-colors cursor-pointer whitespace-nowrap hover:text-[#e62b1e] ${
                theme === 'light' ? 'text-[#0c0c0e]' : 'text-white'
              }`}
            >
              <span className="w-4 md:w-5 inline-flex items-center shrink-0 font-black text-sm" />
              <span className="group-hover:opacity-80 transition-opacity">CONTACT</span>
            </button>
          </nav>
        </div>

        {/* Center: Audio & Working Globally */}
        <div className="hidden md:flex items-start gap-8 lg:gap-14 font-mono-tabular text-xs pointer-events-auto pt-1">
          <button
            onClick={onToggleAudio}
            className={`hover:opacity-70 transition-opacity flex items-center gap-1 cursor-pointer pt-0.5 ${
              theme === 'light' ? 'text-[#0c0c0e]' : 'text-neutral-200'
            }`}
          >
            <span>Audio {isAudioOn ? 'On' : 'Off'}</span>
            <span className="opacity-50">—</span>
          </button>

          <div className="flex flex-col text-left font-sans">
            <span
              className={`text-xs font-bold tracking-tight ${
                theme === 'light' ? 'text-[#0c0c0e]' : 'text-white'
              }`}
            >
              Working globally
            </span>
            <span className="font-mono-tabular text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
              IST, {timeString}
            </span>
          </div>
        </div>

        {/* Right: Master Button & Change Images Button & Theme Switcher & Inquiries */}
        <div className="flex items-center gap-2.5 sm:gap-4 pointer-events-auto pt-1">
          {/* Master Edit Access Button */}
          <MasterEditButton theme={theme} />

          {isEditMode && onOpenImageCustomizer && (
            <button
              onClick={() =>
                onOpenImageCustomizer(currentItem?.id || 'pg-themonk-frames', 'upload')
              }
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono-tabular text-xs font-bold transition-all cursor-pointer border shadow-sm ${
                theme === 'light'
                  ? 'bg-[#0c0c0e] text-white border-black hover:bg-neutral-800'
                  : 'bg-white text-black border-white hover:bg-neutral-200'
              }`}
              title="Change and customize website images (auto-saved)"
            >
              <Camera size={13} className="text-[#e62b1e]" />
              <span className="uppercase tracking-wider">Change Images</span>
              {Object.keys(customOverrides || {}).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          )}

          {/* Day / Night Theme Switcher */}
          <div className="flex items-center gap-1 font-mono-tabular text-xs tracking-wider pt-0.5">
            <button
              onClick={onToggleTheme}
              className={`px-1 py-0.5 uppercase transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'font-bold text-[#0c0c0e] underline decoration-2'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Day
            </button>
            <span className="text-neutral-400 select-none">/</span>
            <button
              onClick={onToggleTheme}
              className={`px-1 py-0.5 uppercase transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'font-bold text-white underline decoration-2'
                  : 'text-neutral-500 hover:text-[#0c0c0e]'
              }`}
            >
              Night
            </button>
          </div>

          {/* Inquiries */}
          <div
            className={`hidden lg:block font-sans text-xs pt-0.5 ${
              theme === 'light' ? 'text-[#0c0c0e]' : 'text-neutral-200'
            }`}
          >
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenContact();
              }}
              className="underline font-bold hover:text-[#e62b1e] transition-colors cursor-pointer"
            >
              sahakaushik1999@gmail.com
            </button>
          </div>
        </div>
      </header>

      {/* ================= MOBILE / TABLET COMPACT HEADER (< md) ================= */}
      <div className="flex md:hidden items-center justify-between w-full pt-4 pb-2 px-4 border-b border-black/10 dark:border-white/10 select-none z-30">
        <button
          onClick={() => {
            soundManager.playClick();
            setIsMobileMenuOpen(true);
          }}
          className="w-10 h-8 flex flex-col justify-center gap-[5px] cursor-pointer"
          aria-label="Open navigation menu"
        >
          <span className="w-7 h-[2px] bg-[#0c0c0e] dark:bg-white" />
          <span className="w-5 h-[2px] bg-[#0c0c0e] dark:bg-white" />
        </button>

        <div className="font-bold text-sm tracking-tight uppercase">RECENT WORK</div>

        <div className="flex items-center gap-2">
          <MasterEditButton theme={theme} variant="compact" />
          <button
            onClick={onToggleTheme}
            className="font-mono-tabular text-xs font-bold px-2 py-0.5 rounded border border-neutral-400 dark:border-neutral-700"
          >
            {theme === 'light' ? 'NIGHT' : 'DAY'}
          </button>
        </div>
      </div>

      {/* ================= MOBILE MENU DRAWER ================= */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-6 md:hidden"
          >
            <div className="flex items-center justify-between border-b border-white/20 pb-4">
              <span className="font-bold text-lg text-white">NAVIGATION</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-white rounded-full bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col space-y-6 my-auto font-sans text-2xl font-black uppercase text-left">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onViewChange('work');
                }}
                className="text-white hover:text-[#e62b1e] text-left"
              >
                WORK
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onViewChange('about');
                }}
                className="text-white hover:text-[#e62b1e] text-left"
              >
                ABOUT
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onViewChange('playground');
                }}
                className="text-[#e62b1e] text-left"
              >
                RECENT WORK →
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenContact();
                }}
                className="text-white hover:text-[#e62b1e] text-left"
              >
                CONTACT
              </button>
            </div>

            <div className="border-t border-white/20 pt-4 text-xs text-neutral-400">
              IST, {timeString}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MAIN HEROIC 3D CURVED CAROUSEL CONTAINER ================= */}
      <main
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
        className="relative flex-1 w-full flex flex-col items-center justify-center py-4 md:py-6 lg:py-8 z-10 overflow-hidden select-none"
      >
        {/* Top Minimalist Icon Matching User's Reference Image (Center Icon) */}
        <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 z-20">
          <div className="w-12 h-6 flex items-center justify-center text-neutral-800 dark:text-neutral-100 opacity-90 transition-transform duration-300 hover:scale-110">
            {/* Elegant Spectacles / Glasses Outline Icon matching reference */}
            <svg
              width="46"
              height="20"
              viewBox="0 0 46 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-sm"
            >
              <circle
                cx="11"
                cy="10"
                r="7.5"
                stroke="currentColor"
                strokeWidth="1.8"
                className="transition-colors"
              />
              <circle
                cx="35"
                cy="10"
                r="7.5"
                stroke="currentColor"
                strokeWidth="1.8"
                className="transition-colors"
              />
              <path
                d="M18.5 9.5C21 7.8 25 7.8 27.5 9.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Minimal Category Filter Pills */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar max-w-full px-4 py-1">
            {categories.map((cat) => {
              const isCatActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={(e) => {
                    e.stopPropagation();
                    soundManager.playClick();
                    setActiveCategory(cat);
                    setActiveIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-full font-mono-tabular text-[10px] md:text-[11px] uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    isCatActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-black font-bold shadow-sm'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {cat === 'All' ? 'ALL ARCHIVE' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3D Arc Card Deck Viewport */}
        <div
          className="relative w-full flex items-center justify-center h-[280px] sm:h-[350px] md:h-[420px] lg:h-[450px]"
          style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
        >
          {/* Left Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              stepCard(-1);
            }}
            className="absolute left-3 sm:left-8 md:left-14 lg:left-24 z-50 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 dark:bg-white/10 hover:bg-black/70 dark:hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer active:scale-90 border border-white/15"
            aria-label="Previous work"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              stepCard(1);
            }}
            className="absolute right-3 sm:right-8 md:right-14 lg:right-24 z-50 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 dark:bg-white/10 hover:bg-black/70 dark:hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer active:scale-90 border border-white/15"
            aria-label="Next work"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Cards Rendered in Curved 3D Arc */}
          {filteredItems.map((item, idx) => {
            let offset = idx - activeIndex;
            // Wrap offset around so carousel loops seamlessly
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            // Only render cards within visual range [-3..3] for pristine performance
            if (Math.abs(offset) > 3) return null;

            const isCenter = offset === 0;
            const isVideo = item.mediaType === 'video' || isVideoUrl(item.imageUrl) || Boolean(item.videoUrl);
            const mediaSrc = item.videoUrl || item.imageUrl;
            const { x, y, z, rotateZ, rotateY, scale, opacity, zIndex } = getCardTransform(offset);

            return (
              <motion.div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCenter) {
                    soundManager.playClick();
                    setActiveGalleryCircle({ item, circleId: item.id });
                  } else {
                    stepCard(offset);
                  }
                }}
                initial={false}
                animate={{
                  x,
                  y,
                  z,
                  rotateZ,
                  rotateY,
                  scale,
                  opacity,
                }}
                transition={{
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1], // silky luxury spring curve matching ref
                }}
                style={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                  zIndex,
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                className={`absolute rounded-[24px] sm:rounded-[28px] md:rounded-[32px] overflow-hidden cursor-pointer shadow-2xl transition-shadow ${
                  isCenter
                    ? 'ring-1 ring-white/40 dark:ring-white/30 shadow-[0_25px_60px_rgba(0,0,0,0.6)]'
                    : 'hover:brightness-110 shadow-[0_15px_35px_rgba(0,0,0,0.4)]'
                }`}
              >
                {/* Visual Media Container with Rounded Corners */}
                <div className="relative w-full h-full rounded-[24px] sm:rounded-[28px] md:rounded-[32px] overflow-hidden bg-neutral-900 border border-white/20 dark:border-white/25">
                  {isVideo && mediaSrc ? (
                    <video
                      ref={(el) => {
                        if (el) {
                          el.muted = true;
                          el.defaultMuted = true;
                          el.play().catch(() => {});
                        }
                      }}
                      src={mediaSrc}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      className="w-full h-full object-cover object-center select-none pointer-events-none"
                    />
                  ) : (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      draggable={false}
                      loading="lazy"
                      className="w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-500 hover:scale-105"
                    />
                  )}

                  {/* Video Play Badge if Video */}
                  {isVideo && (
                    <div className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                      <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                    </div>
                  )}

                  {/* Direct Edit Media button on Center Card (Only in Master Edit Mode) */}
                  {isEditMode && isCenter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundManager.playClick();
                        setEditingCircle({
                          item,
                          circleId: item.id,
                          currentTitle: item.title,
                          currentImageUrl: item.imageUrl,
                          currentVideoUrl: item.videoUrl,
                        });
                      }}
                      className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-[#e62b1e] text-white text-[11px] font-mono font-bold tracking-tight backdrop-blur-md shadow-lg border border-white/20 transition-all duration-200 cursor-pointer pointer-events-auto"
                      title="Upload or change video/image for this card"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Media</span>
                    </button>
                  )}

                  {/* Center Card Soft Sheen Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/15 pointer-events-none" />

                  {/* Inner subtle rim border */}
                  <div className="absolute inset-0 rounded-[24px] sm:rounded-[28px] md:rounded-[32px] border border-white/10 pointer-events-none" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ================= PROJECT TITLE & "ENTER STORE / VIEW PROJECT" PILL BUTTON ================= */}
        {currentItem && (
          <div className="mt-5 sm:mt-7 flex flex-col items-center justify-center text-center px-4 max-w-2xl z-20">
            {/* Project Title (Matches "Eyewear That Stands Out" in Ref Image) */}
            <motion.h2
              key={currentItem.id + '-title'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="font-sans text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-medium tracking-tight text-neutral-900 dark:text-white leading-tight"
            >
              {currentItem.title}
            </motion.h2>

            {/* Subtitle / Category metadata */}
            <motion.p
              key={currentItem.id + '-sub'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="mt-1 text-xs sm:text-sm font-sans text-neutral-500 dark:text-neutral-400 font-normal max-w-lg line-clamp-1"
            >
              {currentItem.subtitle || currentItem.category}
            </motion.p>

            {/* White Capsule Pill Button with Black Arrow Circle (Exact Match to Ref Image) */}
            <motion.div
              key={currentItem.id + '-btn'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="mt-4 sm:mt-5 flex items-center gap-3 flex-wrap justify-center"
            >
              <button
                onClick={() => {
                  soundManager.playClick();
                  setActiveGalleryCircle({ item: currentItem, circleId: currentItem.id });
                }}
                className="group flex items-center gap-3 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white text-black font-sans font-semibold text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-black/10"
              >
                <span>Enter Project</span>
                {/* Black Circular Badge with White Arrow */}
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform duration-200">
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                </div>
              </button>

              {/* Direct Change Media / Upload Video shortcut (Only in Master Edit Mode) */}
              {isEditMode && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setEditingCircle({
                      item: currentItem,
                      circleId: currentItem.id,
                      currentTitle: currentItem.title,
                      currentImageUrl: currentItem.imageUrl,
                      currentVideoUrl: currentItem.videoUrl,
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-full bg-black/10 dark:bg-white/10 hover:bg-[#e62b1e] hover:text-white text-neutral-800 dark:text-neutral-200 transition-all duration-200 cursor-pointer text-xs sm:text-sm font-sans font-semibold border border-black/10 dark:border-white/10 shadow-sm"
                  title="Change video or image for this card"
                >
                  <Video className="w-4 h-4 text-[#e62b1e] group-hover:text-white" />
                  <span>Upload Media</span>
                </button>
              )}
            </motion.div>
          </div>
        )}
      </main>

      {/* ================= FOOTER / INDEX COUNTER & INTERACTIVE SCRUBBER ================= */}
      <footer className="relative z-20 px-4 md:px-6 lg:px-8 xl:px-14 pb-4 md:pb-6 flex items-center justify-between font-mono-tabular text-xs text-neutral-500 dark:text-neutral-400 gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-[#e62b1e]">
            {String(activeIndex + 1).padStart(2, '0')}
          </span>
          <span>/</span>
          <span>{String(total).padStart(2, '0')}</span>
        </div>

        {/* Center: Interactive Scrubber / Dot Navigator */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[60vw] py-1 px-2">
          {filteredItems.map((_, dotIdx) => (
            <button
              key={dotIdx}
              onClick={(e) => {
                e.stopPropagation();
                soundManager.playClick();
                setActiveIndex(dotIdx);
              }}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                dotIdx === activeIndex
                  ? 'w-7 sm:w-9 h-1.5 bg-[#e62b1e]'
                  : 'w-1.5 h-1.5 bg-neutral-400/50 hover:bg-neutral-600 dark:bg-white/20 dark:hover:bg-white/60'
              }`}
              title={`Go to item ${dotIdx + 1}`}
              aria-label={`Go to item ${dotIdx + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Add Project Button (Only in Master Edit Mode) */}
          {isEditMode && (
            <button
              onClick={() => setIsAddCircleOpen(true)}
              className="flex items-center gap-1 hover:text-[#e62b1e] transition-colors cursor-pointer"
              title="Add a project to Recent Works"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="uppercase text-[11px] font-bold">Add Project</span>
            </button>
          )}
        </div>
      </footer>

      {/* ================= PROJECT GALLERY MODAL (High-res media, gallery, case notes) ================= */}
      {activeGalleryCircle && (() => {
        const plainId = activeGalleryCircle.circleId.replace(/^pg-/, '');
        const prefixedId = activeGalleryCircle.circleId.startsWith('pg-')
          ? activeGalleryCircle.circleId
          : `pg-${activeGalleryCircle.circleId}`;

        const custom =
          circleCustomizations[activeGalleryCircle.circleId] ||
          circleCustomizations[prefixedId] ||
          circleCustomizations[plainId] ||
          circleCustomizations[activeGalleryCircle.item.id];

        const galleryVideos = (custom?.gallery || []).filter((u) => isVideoUrl(u));
        const effectiveVideoUrl =
          custom?.videoUrl ||
          (isVideoUrl(custom?.imageUrl) ? custom?.imageUrl : undefined) ||
          (galleryVideos.length > 0 ? galleryVideos[0] : undefined) ||
          activeGalleryCircle.item.videoUrl ||
          (isVideoUrl(activeGalleryCircle.item.imageUrl) ? activeGalleryCircle.item.imageUrl : undefined);

        const isVideoCircle =
          custom?.mediaType === 'video' ||
          Boolean(effectiveVideoUrl) ||
          activeGalleryCircle.item.mediaType === 'video';

        const rawGallery = getProjectGallery(
          activeGalleryCircle.circleId,
          activeGalleryCircle.item.id,
          activeGalleryCircle.item.imageUrl,
          effectiveVideoUrl
        );

        let finalGallery = rawGallery;
        if (effectiveVideoUrl) {
          finalGallery = [effectiveVideoUrl, ...rawGallery.filter((u) => u !== effectiveVideoUrl)];
        }

        const effectiveThumbnail =
          isVideoCircle && effectiveVideoUrl
            ? effectiveVideoUrl
            : (custom?.imageUrl || activeGalleryCircle.item.imageUrl);

        return (
          <ProjectGalleryModal
            isOpen={true}
            onClose={() => setActiveGalleryCircle(null)}
            circleId={activeGalleryCircle.circleId}
            projectId={activeGalleryCircle.item.id}
            title={custom?.title || activeGalleryCircle.item.title}
            category={activeGalleryCircle.item.category}
            client={activeGalleryCircle.item.client}
            currentThumbnailUrl={effectiveThumbnail}
            galleryImages={finalGallery}
            theme={theme}
            onUpdateGallery={async (newImages) => {
              await saveCircleCustomization(activeGalleryCircle.circleId, { gallery: newImages });
            }}
            onSetThumbnail={async (newThumb) => {
              if (isVideoUrl(newThumb)) {
                await saveCircleCustomization(activeGalleryCircle.circleId, {
                  imageUrl: newThumb,
                  videoUrl: newThumb,
                  mediaType: 'video',
                });
              } else {
                await saveCircleCustomization(activeGalleryCircle.circleId, {
                  imageUrl: newThumb,
                  mediaType: 'image',
                });
              }
            }}
            onUpdateTitle={async (newTitle) => {
              await saveCircleCustomization(activeGalleryCircle.circleId, { title: newTitle });
            }}
            onOpenCircleCustomizer={() => {
              setEditingCircle({
                item: activeGalleryCircle.item,
                circleId: activeGalleryCircle.circleId,
                currentTitle: custom?.title || activeGalleryCircle.item.title,
                currentImageUrl: custom?.imageUrl || activeGalleryCircle.item.imageUrl,
                currentVideoUrl: custom?.videoUrl || activeGalleryCircle.item.videoUrl,
              });
            }}
            onDeleteCircle={(circleId) => {
              removeCircle(circleId);
              setRemovedProjectIds(getRemovedProjectIds());
              setActiveGalleryCircle(null);
            }}
          />
        );
      })()}

      {/* ================= EDIT MODAL ================= */}
      {editingCircle && (
        <CircleEditModal
          isOpen={true}
          onClose={() => setEditingCircle(null)}
          circleId={editingCircle.circleId}
          initialTitle={editingCircle.currentTitle}
          initialImageUrl={editingCircle.currentImageUrl}
          initialVideoUrl={editingCircle.currentVideoUrl || editingCircle.item.videoUrl}
          galleryImages={getProjectGallery(
            editingCircle.circleId,
            editingCircle.item.id,
            editingCircle.currentImageUrl
          )}
          theme={theme}
          onSave={async (title, imageUrl, videoUrl, mediaType) => {
            const plainId = editingCircle.circleId.replace(/^pg-/, '');
            const prefixedId = editingCircle.circleId.startsWith('pg-')
              ? editingCircle.circleId
              : `pg-${editingCircle.circleId}`;

            await saveCircleCustomization(editingCircle.circleId, {
              title,
              imageUrl,
              videoUrl,
              mediaType,
            });

            setCircleCustomizations((prev) => {
              const updated = {
                ...(prev[editingCircle.circleId] || {}),
                title,
                imageUrl,
                videoUrl,
                mediaType,
              };
              return {
                ...prev,
                [editingCircle.circleId]: updated,
                [plainId]: updated,
                [prefixedId]: updated,
              };
            });
            setEditingCircle(null);
          }}
          onReset={() => {
            resetCircleCustomization(editingCircle.circleId);
            setEditingCircle(null);
          }}
          onDeleteCircle={(circleId) => {
            removeCircle(circleId);
            setRemovedProjectIds(getRemovedProjectIds());
            setEditingCircle(null);
          }}
        />
      )}

      {/* ================= ADD MODAL ================= */}
      {isAddCircleOpen && (
        <AddCircleModal
          isOpen={true}
          onClose={() => setIsAddCircleOpen(false)}
          theme={theme}
          onAddCircle={(newCircleData) => {
            const newId = `pg-custom-${Date.now()}`;
            const newProjectItem: CustomCircleItem = {
              id: newId,
              index: String(itemsWithOverrides.length + 1).padStart(2, '0'),
              title: newCircleData.title,
              subtitle: newCircleData.subtitle,
              category: newCircleData.category,
              year: newCircleData.year,
              tool: 'Photoshop // Illustrator',
              client: newCircleData.client,
              imageUrl: newCircleData.imageUrl,
              videoUrl: newCircleData.videoUrl,
              mediaType: newCircleData.mediaType,
              aspect: 'landscape',
              description: newCircleData.subtitle,
              processNotes: 'User-created custom card on recent works.',
              tags: [newCircleData.category, 'Custom Project'],
            };
            addCustomProject(newProjectItem, newCircleData.gallery);
            setCustomProjects(getCustomProjects());
            setIsAddCircleOpen(false);
          }}
        />
      )}
    </div>
  );
};
