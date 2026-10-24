import { isVideoUrl } from './mediaUpload';

export interface CircleData {
  title?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  gallery?: string[];
  updatedAt?: number;
}

export interface CustomCircleItem {
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

const STORAGE_KEY = 'kaushik_circle_customizations_v2';
const CUSTOM_PROJECTS_KEY = 'kaushik_custom_added_projects_v1';
const REMOVED_PROJECTS_KEY = 'kaushik_removed_projects_v1';

export const DEFAULT_CIRCLE_CUSTOMIZATIONS: Record<string, CircleData> = {
  'pg-superdry-outlet': {
    title: 'The Trost',
    imageUrl: '/projects/superdry-outlet.webp',
    mediaType: 'image',
    gallery: ['/projects/superdry-outlet.webp'],
  },
  'superdry-outlet': {
    title: 'The Trost',
    imageUrl: '/projects/superdry-outlet.webp',
    mediaType: 'image',
    gallery: ['/projects/superdry-outlet.webp'],
  },
  'pg-masala': {
    title: 'District',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4',
    videoUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4',
    mediaType: 'video',
    gallery: ['https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4'],
  },
  'masala': {
    title: 'District',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4',
    videoUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4',
    mediaType: 'video',
    gallery: ['https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4'],
  },
  'pg-masala-store': {
    title: 'Harmony',
    imageUrl: 'https://lh3.googleusercontent.com/d/1WrVKJGgcolHFpdgOYHqTVFAV5B7civIf',
    mediaType: 'image',
  },
  'masala-store': {
    title: 'Harmony',
    imageUrl: 'https://lh3.googleusercontent.com/d/1WrVKJGgcolHFpdgOYHqTVFAV5B7civIf',
    mediaType: 'image',
  },
  'pg-cha-drops': {
    title: 'Rasaiem',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Harmony/c11ec4184593927.6554c4a74779f.webp',
    mediaType: 'image',
    gallery: ['https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Harmony/c11ec4184593927.6554c4a74779f.webp'],
  },
  'cha-drops': {
    title: 'Rasaiem',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Harmony/c11ec4184593927.6554c4a74779f.webp',
    mediaType: 'image',
    gallery: ['https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Harmony/c11ec4184593927.6554c4a74779f.webp'],
  },
  'pg-the-trost': {
    title: 'RPL',
    imageUrl: 'https://lh3.googleusercontent.com/d/1B0VMMTXybww2M_O52fDTeKP2snA1LoEj',
    mediaType: 'image',
    gallery: [
      'https://lh3.googleusercontent.com/d/1B0VMMTXybww2M_O52fDTeKP2snA1LoEj',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Trost/1.png',
    ],
  },
  'the-trost': {
    title: 'RPL',
    imageUrl: 'https://lh3.googleusercontent.com/d/1B0VMMTXybww2M_O52fDTeKP2snA1LoEj',
    mediaType: 'image',
    gallery: [
      'https://lh3.googleusercontent.com/d/1B0VMMTXybww2M_O52fDTeKP2snA1LoEj',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Trost/1.png',
    ],
  },
  'pg-superdry': {
    title: 'BIOCULE',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Biocule/30e142186713967.657af35388e43.webp',
    mediaType: 'image',
    gallery: [
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Biocule/30e142186713967.657af35388e43.webp',
      '/projects/rebranding-for-biocule.png',
    ],
  },
  'superdry': {
    title: 'BIOCULE',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Biocule/30e142186713967.657af35388e43.webp',
    mediaType: 'image',
    gallery: [
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Biocule/30e142186713967.657af35388e43.webp',
      '/projects/rebranding-for-biocule.png',
    ],
  },
  'pg-cha-brochure': {
    title: 'TBC',
    imageUrl: 'https://lh3.googleusercontent.com/d/1sJa-r4kSW7hDjn4Wbs-6eAXuwBE2EKYV',
    mediaType: 'image',
    gallery: ['/uploads/images/cha-brochure-gallery-0-1792424540520.webp'],
  },
  'cha-brochure': {
    title: 'TBC',
    imageUrl: 'https://lh3.googleusercontent.com/d/1sJa-r4kSW7hDjn4Wbs-6eAXuwBE2EKYV',
    mediaType: 'image',
    gallery: ['/uploads/images/cha-brochure-gallery-0-1792424540520.webp'],
  },
  'pg-themonk-tokyo': {
    title: 'Superdry',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
    videoUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
    mediaType: 'video',
    gallery: [
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      '/projects/the-world-collection-tokyo.webp',
    ],
  },
  'themonk-tokyo': {
    title: 'Superdry',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
    videoUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
    mediaType: 'video',
    gallery: [
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      '/projects/the-world-collection-tokyo.webp',
    ],
  },
  'pg-harmony': {
    title: 'The Monk',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Monk/themonkworld-photo-DBd3sLdOHO--20241023_180042_481296252.jpg',
    mediaType: 'image',
    gallery: [
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Monk/themonkworld-photo-DBd3sLdOHO--20241023_180042_481296252.jpg',
      '/projects/the-monk-eyewear.webp',
      '/projects/lookbook-themonk.webp',
    ],
  },
  'harmony': {
    title: 'The Monk',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Monk/themonkworld-photo-DBd3sLdOHO--20241023_180042_481296252.jpg',
    mediaType: 'image',
    gallery: [
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Monk/themonkworld-photo-DBd3sLdOHO--20241023_180042_481296252.jpg',
      '/projects/the-monk-eyewear.webp',
      '/projects/lookbook-themonk.webp',
    ],
  },
  'pg-better-candle': {
    title: 'Combine Sports',
    imageUrl: 'https://lh3.googleusercontent.com/d/14AWG2JsZzgdRATdPjqSg8m0FFv37KBBe',
    mediaType: 'image',
  },
  'better-candle': {
    title: 'Combine Sports',
    imageUrl: 'https://lh3.googleusercontent.com/d/14AWG2JsZzgdRATdPjqSg8m0FFv37KBBe',
    mediaType: 'image',
  },
  'pg-soledition': {
    title: 'SOLEDITION',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
    videoUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
    mediaType: 'video',
    gallery: [
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3h_DMWyHyv-20240219_190846_AQNqV0NsYZzjEDAY93x9UE8Ddxi0ovdsJErBrxYphszlyZ2cnv5-5cI11zIbjgC92IU8QebNGY6w-8W-o8LNWL7mi6ZvHVwqqdy0ONQ.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3fVPH3Slp5-20240218_182539_AQPHDgRw43N7939orVaMQ3tthYmPuNbEwLoBYmuqqkL7i.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3DU9PfSTA8-20240207_212327_AQM2xlIvBZtupmNP5Uml2q5iWsqoQC.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3cj4cHSTYw-20240217_163821_AQNVT1Y-jV8hcHIitTFQz8LYw2pXI.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2y12ZDy_R2-20240201_114458_AQPbtX3bvogQVLvl173H13uFrcZDNXxtQMqJ4ZbrOrTc0dK-E9Camc80Ujev9Svrzjq.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2xHk5ESGOj-20240131_194107_AQPNIugV6oM.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2uT_C1Se2J-20240130_173003_AQMtYBcKCFfEeZhX90wDBwxxWz19k5J6T1QCQHkZ-238ESwwKiwqKZ1mw0Al8EwreplMIcb.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2SGK4lyZwk-20240119_183137_AQP6shpblQfNXoDfekbFrsVVrV2HSoXSrjFE.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2rvGS7yrwY-20240129_173116_AQP6Kc9kKidvxEDgsgJ3SoVyY0F-lNvlb7zZd6y6v.mp4',
    ],
  },
  'soledition': {
    title: 'SOLEDITION',
    imageUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
    videoUrl: 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
    mediaType: 'video',
    gallery: [
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3h_DMWyHyv-20240219_190846_AQNqV0NsYZzjEDAY93x9UE8Ddxi0ovdsJErBrxYphszlyZ2cnv5-5cI11zIbjgC92IU8QebNGY6w-8W-o8LNWL7mi6ZvHVwqqdy0ONQ.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3fVPH3Slp5-20240218_182539_AQPHDgRw43N7939orVaMQ3tthYmPuNbEwLoBYmuqqkL7i.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3DU9PfSTA8-20240207_212327_AQM2xlIvBZtupmNP5Uml2q5iWsqoQC.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3cj4cHSTYw-20240217_163821_AQNVT1Y-jV8hcHIitTFQz8LYw2pXI.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2y12ZDy_R2-20240201_114458_AQPbtX3bvogQVLvl173H13uFrcZDNXxtQMqJ4ZbrOrTc0dK-E9Camc80Ujev9Svrzjq.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2xHk5ESGOj-20240131_194107_AQPNIugV6oM.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2uT_C1Se2J-20240130_173003_AQMtYBcKCFfEeZhX90wDBwxxWz19k5J6T1QCQHkZ-238ESwwKiwqKZ1mw0Al8EwreplMIcb.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2SGK4lyZwk-20240119_183137_AQP6shpblQfNXoDfekbFrsVVrV2HSoXSrjFE.mp4',
      'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2rvGS7yrwY-20240129_173116_AQP6Kc9kKidvxEDgsgJ3SoVyY0F-lNvlb7zZd6y6v.mp4',
    ],
  },
  'pg-combine': {
    title: 'COMBINE SPORTS',
    imageUrl: 'https://lh3.googleusercontent.com/d/1LPJ89eJ9WpRJkNNdRyoqeKA0tYkJy3Dk',
    mediaType: 'image',
    gallery: ['/projects/combine-sports.webp'],
  },
  'combine': {
    title: 'COMBINE SPORTS',
    imageUrl: 'https://lh3.googleusercontent.com/d/1LPJ89eJ9WpRJkNNdRyoqeKA0tYkJy3Dk',
    mediaType: 'image',
    gallery: ['/projects/combine-sports.webp'],
  },
  'pg-horology': {
    title: 'ALL ABOUT HOROLOGY',
    imageUrl: 'https://lh3.googleusercontent.com/d/1EiKaAn3xObEU4E5XKg59ros4J-tSlmrl',
    mediaType: 'image',
    gallery: ['/projects/all-about-horology.webp'],
  },
  'horology': {
    title: 'ALL ABOUT HOROLOGY',
    imageUrl: 'https://lh3.googleusercontent.com/d/1EiKaAn3xObEU4E5XKg59ros4J-tSlmrl',
    mediaType: 'image',
    gallery: ['/projects/all-about-horology.webp'],
  },
  'pg-video-reels': {
    title: 'COMMERCIAL VIDEO & REEL SHOWCASE',
    imageUrl: '/videos/reel-commercial.mp4',
    videoUrl: '/videos/reel-commercial.mp4',
    mediaType: 'video',
    gallery: [
      '/videos/reel-commercial.mp4',
      '/videos/reel-typography.mp4',
    ],
  },
  'video-reels': {
    title: 'COMMERCIAL VIDEO & REEL SHOWCASE',
    imageUrl: '/videos/reel-commercial.mp4',
    videoUrl: '/videos/reel-commercial.mp4',
    mediaType: 'video',
    gallery: [
      '/videos/reel-commercial.mp4',
      '/videos/reel-typography.mp4',
    ],
  },
};

// In-memory caches initialized with permanent defaults
let memoryCustomizations: Record<string, CircleData> = { ...DEFAULT_CIRCLE_CUSTOMIZATIONS };
let memoryCustomProjects: CustomCircleItem[] = [];
let memoryRemovedProjectIds: string[] = [];

// Initialize from localStorage
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memoryCustomizations = { ...DEFAULT_CIRCLE_CUSTOMIZATIONS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load circle customizations from localStorage:', e);
  }

  try {
    const rawProjects = localStorage.getItem(CUSTOM_PROJECTS_KEY);
    if (rawProjects) {
      memoryCustomProjects = JSON.parse(rawProjects);
    }
  } catch (e) {
    console.warn('Failed to load custom projects from localStorage:', e);
  }

  try {
    const rawRemoved = localStorage.getItem(REMOVED_PROJECTS_KEY);
    if (rawRemoved) {
      memoryRemovedProjectIds = JSON.parse(rawRemoved);
    }
  } catch (e) {
    console.warn('Failed to load removed project IDs from localStorage:', e);
  }
}

/**
 * Synchronize circle state with Express backend storage (persists across devices/browsers)
 */
export async function syncCircleStorageWithBackend(): Promise<{
  customizations: Record<string, CircleData>;
  customProjects: CustomCircleItem[];
  removedProjectIds: string[];
}> {
  if (typeof window === 'undefined') {
    return {
      customizations: memoryCustomizations,
      customProjects: memoryCustomProjects,
      removedProjectIds: memoryRemovedProjectIds,
    };
  }
  try {
    // 1. Fetch persistent state from server
    const res = await fetch('/api/app-state');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        let changed = false;
        if (data.customizations && typeof data.customizations === 'object') {
          // Merge server customizations: server data takes precedence
          const merged: Record<string, CircleData> = { ...memoryCustomizations };
          for (const [key, val] of Object.entries(data.customizations as Record<string, CircleData>)) {
            if (!val || typeof val !== 'object') continue;
            const plainKey = key.replace(/^pg-/, '');
            const prefixedKey = key.startsWith('pg-') ? key : `pg-${key}`;

            const current = merged[key] || merged[plainKey] || merged[prefixedKey] || {};
            // Filter out any temporary blob URLs that cannot survive browser reloads
            const rawGallery = Array.isArray(val.gallery) && val.gallery.length > 0 ? val.gallery : current.gallery || [];
            let serverGallery = rawGallery.filter((url) => typeof url === 'string' && !url.startsWith('blob:'));
            if (serverGallery.length === 0 && current.gallery && current.gallery.length > 0) {
              serverGallery = [...current.gallery];
            }

            let cleanedImageUrl = val.imageUrl || current.imageUrl;
            if (
              !cleanedImageUrl ||
              (typeof cleanedImageUrl === 'string' && (
                cleanedImageUrl.startsWith('blob:') ||
                cleanedImageUrl.trim() === '' ||
                (cleanedImageUrl.startsWith('/uploads/images/') && !cleanedImageUrl.includes('cha-brochure'))
              ))
            ) {
              cleanedImageUrl = current.imageUrl || serverGallery.find((u) => !isVideoUrl(u)) || serverGallery[0] || '';
            }

            let cleanedVideoUrl = val.videoUrl || current.videoUrl;
            if (
              !cleanedVideoUrl ||
              (typeof cleanedVideoUrl === 'string' && (
                cleanedVideoUrl.startsWith('blob:') ||
                cleanedVideoUrl.includes('test_sample') ||
                cleanedVideoUrl.trim() === ''
              ))
            ) {
              cleanedVideoUrl = current.videoUrl || serverGallery.find((u) => isVideoUrl(u)) || '';
            }

            const isVid = val.mediaType === 'video' || isVideoUrl(cleanedVideoUrl) || isVideoUrl(cleanedImageUrl);

            const payload: CircleData = {
              ...current,
              ...val,
              imageUrl: cleanedImageUrl,
              videoUrl: cleanedVideoUrl,
              mediaType: isVid ? 'video' : (val.mediaType || 'image'),
              gallery: serverGallery,
            };

            merged[key] = payload;
            merged[plainKey] = payload;
            merged[prefixedKey] = payload;
          }
          memoryCustomizations = merged;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCustomizations));
          } catch (e) {
            console.warn('LocalStorage save failed:', e);
          }
          changed = true;
        }

        if (Array.isArray(data.removedCircles)) {
          const combined = Array.from(new Set([...data.removedCircles, ...memoryRemovedProjectIds]));
          memoryRemovedProjectIds = combined;
          try {
            localStorage.setItem(REMOVED_PROJECTS_KEY, JSON.stringify(memoryRemovedProjectIds));
          } catch (_) {}
          changed = true;
        }

        if (Array.isArray(data.customProjects) && data.customProjects.length > 0) {
          const projectMap = new Map<string, CustomCircleItem>();
          data.customProjects.forEach((p: CustomCircleItem) => projectMap.set(p.id, p));
          memoryCustomProjects.forEach((p: CustomCircleItem) => projectMap.set(p.id, p));
          memoryCustomProjects = Array.from(projectMap.values());
          try {
            localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(memoryCustomProjects));
          } catch (_) {}
          changed = true;
        }

        if (changed) {
          window.dispatchEvent(
            new CustomEvent('kaushik_circles_updated', {
              detail: { sync: true },
            })
          );
        }
      }
    }
  } catch (err) {
    console.warn('Failed to sync circle storage with backend:', err);
  }

  return {
    customizations: memoryCustomizations,
    customProjects: memoryCustomProjects,
    removedProjectIds: memoryRemovedProjectIds,
  };
}

// Automatically sync on initial module evaluation
if (typeof window !== 'undefined') {
  syncCircleStorageWithBackend();
}

/**
 * Default gallery sets for portfolio items
 */
const DEFAULT_GALLERIES: Record<string, string[]> = {
  'pg-better-candle': [
    'https://lh3.googleusercontent.com/d/14AWG2JsZzgdRATdPjqSg8m0FFv37KBBe',
    '/projects/better-candle.png',
  ],
  'pg-harmony': [
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Monk/themonkworld-photo-DBd3sLdOHO--20241023_180042_481296252.jpg',
    '/projects/the-monk-eyewear.webp',
    '/projects/lookbook-themonk.webp',
  ],
  'pg-biocule': [
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Biocule/30e142186713967.657af35388e43.webp',
    '/projects/rebranding-for-biocule.png',
  ],
  'pg-the-trost': [
    'https://lh3.googleusercontent.com/d/1B0VMMTXybww2M_O52fDTeKP2snA1LoEj',
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Trost/1.png',
    '/projects/the-trost.webp',
  ],
  'pg-horology': [
    '/projects/all-about-horology.webp',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=85',
  ],
  'pg-superdry': [
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Biocule/30e142186713967.657af35388e43.webp',
    '/projects/rebranding-for-biocule.png',
  ],
  'pg-combine': [
    '/projects/combine-sports.webp',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=85',
  ],
  'pg-cha-brochure': [
    '/uploads/images/cha-brochure-gallery-0-1792424540520.webp',
    '/projects/cha-brochure.webp',
  ],
  'pg-themonk-tokyo': [
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
    '/projects/the-world-collection-tokyo.webp',
  ],
  'pg-soledition': [
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3h_DMWyHyv-20240219_190846_AQNqV0NsYZzjEDAY93x9UE8Ddxi0ovdsJErBrxYphszlyZ2cnv5-5cI11zIbjgC92IU8QebNGY6w-8W-o8LNWL7mi6ZvHVwqqdy0ONQ.mp4',
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3fVPH3Slp5-20240218_182539_AQPHDgRw43N7939orVaMQ3tthYmPuNbEwLoBYmuqqkL7i.mp4',
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3DU9PfSTA8-20240207_212327_AQM2xlIvBZtupmNP5Uml2q5iWsqoQC.mp4',
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3cj4cHSTYw-20240217_163821_AQNVT1Y-jV8hcHIitTFQz8LYw2pXI.mp4',
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2y12ZDy_R2-20240201_114458_AQPbtX3bvogQVLvl173H13uFrcZDNXxtQMqJ4ZbrOrTc0dK-E9Camc80Ujev9Svrzjq.mp4',
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2xHk5ESGOj-20240131_194107_AQPNIugV6oM.mp4',
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2uT_C1Se2J-20240130_173003_AQMtYBcKCFfEeZhX90wDBwxxWz19k5J6T1QCQHkZ-238ESwwKiwqKZ1mw0Al8EwreplMIcb.mp4',
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2SGK4lyZwk-20240119_183137_AQP6shpblQfNXoDfekbFrsVVrV2HSoXSrjFE.mp4',
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C2rvGS7yrwY-20240129_173116_AQP6Kc9kKidvxEDgsgJ3SoVyY0F-lNvlb7zZd6y6v.mp4',
  ],
  'pg-superdry-outlet': [
    '/projects/superdry-outlet.webp',
  ],
  'pg-themonk-frames': [
    '/projects/the-monk-eyewear.webp',
    '/projects/lookbook-themonk.webp',
  ],
  'pg-masala-store': [
    'https://lh3.googleusercontent.com/d/1WrVKJGgcolHFpdgOYHqTVFAV5B7civIf',
    '/projects/masala-synergy-store.webp',
  ],
  'pg-masala': [
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4',
    '/projects/masala-synergy.webp',
  ],
  'pg-cha-drops': [
    'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Harmony/c11ec4184593927.6554c4a74779f.webp',
  ],
  'pg-shuchi': [
    '/projects/shuchi-beltings.webp',
  ],
  'pg-video-reels': [
    '/uploads/videos/reel-commercial.mp4',
    '/uploads/videos/reel-typography.mp4',
  ],
  'video-reels': [
    '/uploads/videos/reel-commercial.mp4',
    '/uploads/videos/reel-typography.mp4',
  ],
  'pg-video-projects': [
    '/uploads/videos/reel-commercial.mp4',
    '/uploads/videos/reel-typography.mp4',
  ],
  'video-projects': [
    '/uploads/videos/reel-commercial.mp4',
    '/uploads/videos/reel-typography.mp4',
  ],
};

/**
 * Get the initial or saved gallery media (images & videos) for a project/circle
 */
export function getProjectGallery(
  circleId: string,
  projectId: string,
  fallbackImageUrl: string,
  fallbackVideoUrl?: string
): string[] {
  const plainId = (circleId || projectId || '').replace(/^pg-/, '');
  const prefixedId = (circleId || projectId || '').startsWith('pg-')
    ? (circleId || projectId || '')
    : `pg-${circleId || projectId || ''}`;

  const customObj =
    memoryCustomizations[circleId] ||
    memoryCustomizations[projectId] ||
    memoryCustomizations[prefixedId] ||
    memoryCustomizations[plainId];

  const galleryVideos = (customObj?.gallery || []).filter((u) => isVideoUrl(u));
  const customVideo =
    customObj?.videoUrl ||
    (galleryVideos.length > 0 ? galleryVideos[0] : undefined) ||
    fallbackVideoUrl;

  const ensureVideoFirst = (list: string[]): string[] => {
    if (!customVideo) return list;
    if (list.includes(customVideo)) {
      return [customVideo, ...list.filter((item) => item !== customVideo)];
    }
    return [customVideo, ...list];
  };

  // 1. Check custom circle or project gallery override
  if (customObj?.gallery && customObj.gallery.length > 0) {
    return ensureVideoFirst(customObj.gallery);
  }

  // 2. Check alternative keys in memory
  const alt =
    memoryCustomizations[prefixedId]?.gallery ||
    memoryCustomizations[plainId]?.gallery ||
    memoryCustomizations[circleId]?.gallery ||
    memoryCustomizations[projectId]?.gallery;
  if (alt && alt.length > 0) {
    return ensureVideoFirst(alt);
  }

  // 3. Check default gallery sets
  const defaults =
    DEFAULT_GALLERIES[circleId] ||
    DEFAULT_GALLERIES[projectId] ||
    DEFAULT_GALLERIES[prefixedId] ||
    DEFAULT_GALLERIES[plainId];
  if (defaults && defaults.length > 0) {
    return ensureVideoFirst(defaults);
  }

  // 4. Fallback to video + image + sample design images
  const baseItems = customVideo ? [customVideo, fallbackImageUrl] : [fallbackImageUrl];
  return [
    ...baseItems,
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=85',
  ];
}

/**
 * Get all circle customizations
 */
export function getAllCircleCustomizations(): Record<string, CircleData> {
  return { ...memoryCustomizations };
}

/**
 * Get customization for a specific circle
 */
export function getCircleCustomization(circleId: string): CircleData | undefined {
  const plainId = circleId.replace(/^pg-/, '');
  const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;
  return memoryCustomizations[circleId] || memoryCustomizations[prefixedId] || memoryCustomizations[plainId];
}

/**
 * Save custom title, thumbnail, or gallery for a circle
 */
export async function saveCircleCustomization(circleId: string, updates: Partial<CircleData>): Promise<void> {
  const plainId = circleId.replace(/^pg-/, '');
  const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;

  const current =
    memoryCustomizations[circleId] ||
    memoryCustomizations[prefixedId] ||
    memoryCustomizations[plainId] ||
    {};

  const isExplicitImage = updates.mediaType === 'image';
  const isExplicitVideo = updates.mediaType === 'video' || isVideoUrl(updates.videoUrl) || isVideoUrl(updates.imageUrl);

  const updatedData: CircleData = {
    ...current,
    ...updates,
    ...(isExplicitImage ? { videoUrl: undefined, mediaType: 'image' } : {}),
    ...(isExplicitVideo
      ? {
          videoUrl: updates.videoUrl || (isVideoUrl(updates.imageUrl) ? updates.imageUrl : current.videoUrl),
          mediaType: 'video',
        }
      : {}),
    updatedAt: Date.now(),
  };

  memoryCustomizations[circleId] = updatedData;
  memoryCustomizations[plainId] = updatedData;
  memoryCustomizations[prefixedId] = updatedData;

  if (typeof window !== 'undefined') {
    try {
      const sanitizedForLocalStorage: Record<string, CircleData> = {};
      for (const [k, v] of Object.entries(memoryCustomizations)) {
        if (!v) continue;
        const gal = (v.gallery || []).filter((u) => typeof u === 'string' && !u.startsWith('data:'));
        sanitizedForLocalStorage[k] = {
          ...v,
          imageUrl: v.imageUrl?.startsWith('data:') ? undefined : v.imageUrl,
          videoUrl: v.videoUrl?.startsWith('data:') ? undefined : v.videoUrl,
          gallery: gal,
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedForLocalStorage));
    } catch (e) {
      console.warn('LocalStorage save failed (quota may be full):', e);
    }
    window.dispatchEvent(
      new CustomEvent('kaushik_circles_updated', {
        detail: { circleId, customizations: memoryCustomizations },
      })
    );
  }

  // Also sync image/video to backend Express server so it is persistent across all devices & files
  const syncPromises: Promise<any>[] = [];
  const targetMediaUrl = updatedData.videoUrl || updatedData.imageUrl;

  if (targetMediaUrl) {
    const isDataUrl = targetMediaUrl.startsWith('data:');
    syncPromises.push(
      fetch('/api/project-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: circleId,
          url: isDataUrl ? undefined : targetMediaUrl,
          dataUrl: isDataUrl ? targetMediaUrl : undefined,
        }),
      }).catch((err) => console.warn('Failed to sync circle customization image to backend:', err))
    );
  }

  // Also sync full circle customization payload (title, mediaType, videoUrl, gallery) to backend
  syncPromises.push(
    fetch('/api/circle-customizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        circleId,
        updates: updatedData,
      }),
    }).catch((err) => console.warn('Failed to sync customization payload to backend:', err))
  );

  await Promise.allSettled(syncPromises);
}

/**
 * Set circle thumbnail image
 */
export function setCircleThumbnail(circleId: string, imageUrl: string): void {
  saveCircleCustomization(circleId, { imageUrl, mediaType: 'image' });
}

/**
 * Set circle video (persists uploaded/selected video for this circle)
 */
export function setCircleVideo(circleId: string, videoUrl: string): void {
  saveCircleCustomization(circleId, { videoUrl, imageUrl: videoUrl, mediaType: 'video' });
}

/**
 * Set circle media (image or video)
 */
export function setCircleMedia(circleId: string, mediaUrl: string, mediaType: 'image' | 'video'): void {
  if (mediaType === 'video') {
    saveCircleCustomization(circleId, { videoUrl: mediaUrl, imageUrl: mediaUrl, mediaType: 'video' });
  } else {
    saveCircleCustomization(circleId, { imageUrl: mediaUrl, mediaType: 'image' });
  }
}

/**
 * Set circle title/name
 */
export function setCircleTitle(circleId: string, title: string): void {
  saveCircleCustomization(circleId, { title });
}

/**
 * Add image to a circle's gallery
 */
export function addImageToCircleGallery(
  circleId: string,
  newImageUrl: string,
  currentGallery: string[]
): string[] {
  const current = memoryCustomizations[circleId]?.gallery || currentGallery;
  const updatedGallery = [newImageUrl, ...current];
  saveCircleCustomization(circleId, { gallery: updatedGallery });
  return updatedGallery;
}

/**
 * Delete image from a circle's gallery
 */
export function removeImageFromCircleGallery(
  circleId: string,
  imageToRemove: string,
  currentGallery: string[]
): { updatedGallery: string[]; newThumbnail?: string } {
  const current = memoryCustomizations[circleId]?.gallery || currentGallery;
  const updatedGallery = current.filter((img) => img !== imageToRemove);
  
  // If the deleted image was the current thumbnail, automatically pick another image
  const currentThumbnail = memoryCustomizations[circleId]?.imageUrl;
  let newThumbnail = currentThumbnail;
  if (currentThumbnail === imageToRemove && updatedGallery.length > 0) {
    newThumbnail = updatedGallery[0];
  }

  saveCircleCustomization(circleId, {
    gallery: updatedGallery,
    ...(newThumbnail ? { imageUrl: newThumbnail } : {}),
  });

  return { updatedGallery, newThumbnail };
}

/**
 * Reset a circle's customizations back to default
 */
export function resetCircleCustomization(circleId: string): void {
  delete memoryCustomizations[circleId];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCustomizations));
      window.dispatchEvent(
        new CustomEvent('kaushik_circles_updated', {
          detail: { circleId, customizations: memoryCustomizations },
        })
      );
    } catch (e) {
      console.warn('LocalStorage reset failed:', e);
    }

    fetch(`/api/circle-customizations/${encodeURIComponent(circleId)}`, {
      method: 'DELETE',
    }).catch((e) => console.warn('Failed to delete customization on backend:', e));
  }
}

/**
 * Get all custom added projects
 */
export function getCustomProjects(): CustomCircleItem[] {
  return [...memoryCustomProjects];
}

/**
 * Add a custom project circle
 */
export function addCustomProject(item: CustomCircleItem, initialGallery?: string[]): void {
  memoryCustomProjects = [item, ...memoryCustomProjects];

  // If initial gallery was provided, save it under the circle's ID
  if (initialGallery && initialGallery.length > 0) {
    memoryCustomizations[item.id] = {
      title: item.title,
      imageUrl: item.imageUrl,
      gallery: initialGallery,
      updatedAt: Date.now(),
    };
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(memoryCustomProjects));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCustomizations));
      window.dispatchEvent(
        new CustomEvent('kaushik_circles_updated', {
          detail: { addedItem: item },
        })
      );
    } catch (e) {
      console.warn('Failed to save custom projects to localStorage:', e);
    }

    fetch('/api/custom-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: item }),
    }).catch((e) => console.warn('Failed to sync custom project to backend:', e));

    if (initialGallery && initialGallery.length > 0) {
      fetch('/api/circle-customizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circleId: item.id,
          updates: {
            title: item.title,
            imageUrl: item.imageUrl,
            gallery: initialGallery,
          },
        }),
      }).catch((e) => console.warn('Failed to sync gallery to backend:', e));
    }
  }
}

/**
 * Get list of removed circle IDs
 */
export function getRemovedProjectIds(): string[] {
  return [...memoryRemovedProjectIds];
}

/**
 * Remove a circle by ID (persists across reloads)
 */
export function removeCircle(circleId: string): void {
  const plainId = circleId.replace(/^pg-/, '');
  const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;

  const idsToAdd = [circleId, plainId, prefixedId];
  for (const id of idsToAdd) {
    if (!memoryRemovedProjectIds.includes(id)) {
      memoryRemovedProjectIds.push(id);
    }
  }

  // Also remove from custom projects if it was user-added
  memoryCustomProjects = memoryCustomProjects.filter(
    (p) => p.id !== circleId && p.id !== plainId && p.id !== prefixedId
  );

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(REMOVED_PROJECTS_KEY, JSON.stringify(memoryRemovedProjectIds));
      localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(memoryCustomProjects));
      window.dispatchEvent(
        new CustomEvent('kaushik_circles_updated', {
          detail: { removedCircleId: circleId },
        })
      );
    } catch (e) {
      console.warn('Failed to save removed project to localStorage:', e);
    }

    fetch('/api/removed-circles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circleId, removedCircleIds: memoryRemovedProjectIds }),
    }).catch((e) => console.warn('Failed to sync removed circle to backend:', e));
  }
}

/**
 * Restore a previously removed circle
 */
export function restoreRemovedCircle(circleId: string): void {
  const plainId = circleId.replace(/^pg-/, '');
  const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;

  memoryRemovedProjectIds = memoryRemovedProjectIds.filter(
    (id) => id !== circleId && id !== plainId && id !== prefixedId
  );
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(REMOVED_PROJECTS_KEY, JSON.stringify(memoryRemovedProjectIds));
      window.dispatchEvent(
        new CustomEvent('kaushik_circles_updated', {
          detail: { restoredCircleId: circleId },
        })
      );
    } catch (e) {
      console.warn('Failed to restore circle in localStorage:', e);
    }

    fetch(`/api/removed-circles/${encodeURIComponent(circleId)}`, {
      method: 'DELETE',
    }).catch((e) => console.warn('Failed to restore circle on backend:', e));
  }
}

/**
 * Restore all circles (clears removals and resets default set)
 */
export function restoreAllCircles(): void {
  memoryRemovedProjectIds = [];
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(REMOVED_PROJECTS_KEY);
      window.dispatchEvent(
        new CustomEvent('kaushik_circles_updated', {
          detail: { reset: true },
        })
      );
    } catch (e) {
      console.warn('Failed to reset removed projects:', e);
    }

    fetch('/api/removed-circles', {
      method: 'DELETE',
    }).catch((e) => console.warn('Failed to reset removed circles on backend:', e));
  }
}
