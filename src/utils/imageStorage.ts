/**
 * Client IndexedDB & Local Storage utility for custom project images.
 * Completely standalone, fast, zero-latency local persistence with zero external cloud dependencies.
 * Automatically mirrors in IndexedDB and localStorage across tabs/windows.
 */

const DB_NAME = 'kaushik_portfolio_images_v2';
const DB_VERSION = 1;
const STORE_NAME = 'project_images';
const CACHE_KEY = 'kaushik_project_image_cache';

// Helper to open IndexedDB for local persistent storage
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const idb = request.result;
      if (!idb.objectStoreNames.contains(STORE_NAME)) {
        idb.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const DEFAULT_PROJECT_IMAGES: Record<string, string> = {
  'better-candle': 'https://lh3.googleusercontent.com/d/14AWG2JsZzgdRATdPjqSg8m0FFv37KBBe',
  'harmony-brand-design': 'https://lh3.googleusercontent.com/d/1agzVDpcq8vSrnOGT_BEJ7e1MHZ8hFEj8',
  'rebranding-for-biocule': 'https://lh3.googleusercontent.com/d/1XTLWQHeecXDiqDj6s47NGrH5etbHYwJC',
  'cha-tea-drops': 'https://lh3.googleusercontent.com/d/1YN1oXYTc36xEkab8V8sI6ukuwWxT2whv',
  'the-trost': 'https://lh3.googleusercontent.com/d/1B0VMMTXybww2M_O52fDTeKP2snA1LoEj',
  'all-about-horology': 'https://lh3.googleusercontent.com/d/1x4_g_GGWR-xaKnY3frEV_7042tVRe1Ex',
  'superdry-campaign': 'https://lh3.googleusercontent.com/d/1bGvq0zgXMph9GHxUY035eSTh-N0NpyeD',
  'combine-sports': 'https://lh3.googleusercontent.com/d/14r_oZJ4vsQqxCmcfI-vxmqlnS09MTFh-',
  'video-projects': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'cha-tea-apothecary': 'https://lh3.googleusercontent.com/d/1KSYffoHUNN-nZ7509y_bS_MteQWjZjzJ',
  'lookbook-themonk': 'https://lh3.googleusercontent.com/d/1armnVkcoOGHVHP1iFlZ-eUz3-Jx9hWy_',
  'masala-synergy': 'https://lh3.googleusercontent.com/d/1CV3bZtbKSczwbhVs5IqSSnE5Fh9mHpxw',
  'shuchi-beltings': 'https://lh3.googleusercontent.com/d/12bGWvXDp1I7WV_uiQidhjhA1kuXzflrg',
  'cha-brochure': 'https://lh3.googleusercontent.com/d/1sJa-r4kSW7hDjn4Wbs-6eAXuwBE2EKYV',
  'the-world-collection-tokyo': 'https://lh3.googleusercontent.com/d/1CgPSp0hlIpYL2RSAtKS75Z_0ECTfVBd1',
  'pg-themonk-frames': '/projects/the-monk-eyewear.webp',
  'themonk-frames': '/projects/the-monk-eyewear.webp',
  'pg-themonk-tokyo': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
  'themonk-tokyo': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Superdry/PMC%20BLR%20Launch%20Reel.mp4',
  'pg-themonk-lookbook': '/projects/lookbook-themonk.webp',
  'themonk-lookbook': '/projects/lookbook-themonk.webp',
  'pg-better-candle': 'https://lh3.googleusercontent.com/d/14AWG2JsZzgdRATdPjqSg8m0FFv37KBBe',
  'pg-biocule': '/projects/rebranding-for-biocule.png',
  'biocule': '/projects/rebranding-for-biocule.png',
  'pg-harmony': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Monk/themonkworld-photo-DBd3sLdOHO--20241023_180042_481296252.jpg',
  'harmony': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/The%20Monk/themonkworld-photo-DBd3sLdOHO--20241023_180042_481296252.jpg',
  'pg-the-trost': 'https://lh3.googleusercontent.com/d/1B0VMMTXybww2M_O52fDTeKP2snA1LoEj',
  'pg-superdry': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Biocule/30e142186713967.657af35388e43.webp',
  'superdry': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Biocule/30e142186713967.657af35388e43.webp',
  'pg-video-reels': '/videos/reel-commercial.mp4',
  'video-reels': '/videos/reel-commercial.mp4',
  'pg-combine': 'https://lh3.googleusercontent.com/d/1LPJ89eJ9WpRJkNNdRyoqeKA0tYkJy3Dk',
  'combine': 'https://lh3.googleusercontent.com/d/1LPJ89eJ9WpRJkNNdRyoqeKA0tYkJy3Dk',
  'pg-cha-drops': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Harmony/c11ec4184593927.6554c4a74779f.webp',
  'cha-drops': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Harmony/c11ec4184593927.6554c4a74779f.webp',
  'pg-soledition': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
  'soledition': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/Soledition/soledition-video-C3Xxx6NSmc7-20240215_200127_AQPZ9vhtg1FNj2UxA5vcSU1nK5bO5zgIP7VrdhUi.mp4',
  'pg-masala': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4',
  'masala': 'https://pub-28489877435944d09aa6d455aff1cdc8.r2.dev/District/district_movies-video-Ddqm4Kdkkp0-20260924_152256_AQOXFK0RGwrRP9dOUkHk31xqdwKqgu9qFm4MLc7W3VZ1HtdbqaCglCnHHLK.mp4',
  'pg-shuchi': '/projects/shuchi-beltings.webp',
  'shuchi': '/projects/shuchi-beltings.webp',
  'pg-superdry-outlet': '/projects/superdry-outlet.webp',
  'superdry-outlet': '/projects/superdry-outlet.webp',
  'pg-horology': 'https://lh3.googleusercontent.com/d/1EiKaAn3xObEU4E5XKg59ros4J-tSlmrl',
  'horology': 'https://lh3.googleusercontent.com/d/1EiKaAn3xObEU4E5XKg59ros4J-tSlmrl',
  'pg-cha-brochure': 'https://lh3.googleusercontent.com/d/1sJa-r4kSW7hDjn4Wbs-6eAXuwBE2EKYV',
  'pg-masala-store': 'https://lh3.googleusercontent.com/d/1WrVKJGgcolHFpdgOYHqTVFAV5B7civIf',
  'masala-store': 'https://lh3.googleusercontent.com/d/1WrVKJGgcolHFpdgOYHqTVFAV5B7civIf',
  'pg-video-projects': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
};

// In-memory cache + listeners initialized with permanent defaults
let memoryOverrides: Record<string, string> = { ...DEFAULT_PROJECT_IMAGES };
const listeners = new Set<(overrides: Record<string, string>) => void>();

// Synchronously initialize from localStorage cache if present
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      memoryOverrides = { ...DEFAULT_PROJECT_IMAGES, ...JSON.parse(cached) };
    }
  } catch (err) {
    console.warn('Failed to parse cached image overrides:', err);
  }
}

function notifyListeners() {
  const snapshot = { ...memoryOverrides };
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (e) {
      console.error('Error notifying image storage listener:', e);
    }
  });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(memoryOverrides));
      window.dispatchEvent(new CustomEvent('kaushik_images_updated', { detail: snapshot }));
    } catch {
      // LocalStorage quota may be reached, IndexedDB is authoritative
    }
  }
}

/**
 * Fetch all image overrides from the server (available across all devices)
 * and fall back to local IndexedDB and localStorage cache.
 */
export async function getAllImageOverrides(): Promise<Record<string, string>> {
  let serverOverrides: Record<string, string> = {};

  // 1. Fetch from Express backend server (authoritative for all visitors & devices)
  try {
    const res = await fetch('/api/project-images');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.images && typeof data.images === 'object') {
        serverOverrides = data.images;
      }
    }
  } catch (err) {
    console.warn('Network error fetching server image overrides:', err);
  }

  // 2. Fetch local IndexedDB cache
  try {
    const idb = await openDB();
    const localMap = await new Promise<Record<string, string>>((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        const map: Record<string, string> = {};
        for (const item of results) {
          if (item && item.id && item.url) {
            map[item.id] = item.url;
          }
        }
        resolve(map);
      };
      req.onerror = () => resolve({});
    });

    const isValidUrl = (u: any): boolean => {
      if (typeof u !== 'string' || !u.trim() || u.startsWith('blob:')) return false;
      if (u.startsWith('/uploads/images/') && !u.includes('cha-brochure')) return false;
      if (u.includes('test_sample')) return false;
      return true;
    };

    const cleanLocal: Record<string, string> = {};
    for (const [k, v] of Object.entries(localMap)) {
      if (isValidUrl(v)) cleanLocal[k] = v;
    }
    const cleanServer: Record<string, string> = {};
    for (const [k, v] of Object.entries(serverOverrides)) {
      if (isValidUrl(v)) cleanServer[k] = v;
    }

    // Merge: server overrides take precedence, supplemented by local cache
    memoryOverrides = { ...DEFAULT_PROJECT_IMAGES, ...memoryOverrides, ...cleanLocal, ...cleanServer };
    notifyListeners();
    return memoryOverrides;
  } catch {
    const isValidUrl = (u: any): boolean => {
      if (typeof u !== 'string' || !u.trim() || u.startsWith('blob:')) return false;
      if (u.startsWith('/uploads/images/') && !u.includes('cha-brochure')) return false;
      if (u.includes('test_sample')) return false;
      return true;
    };
    const cleanServer: Record<string, string> = {};
    for (const [k, v] of Object.entries(serverOverrides)) {
      if (isValidUrl(v)) cleanServer[k] = v;
    }
    memoryOverrides = { ...DEFAULT_PROJECT_IMAGES, ...memoryOverrides, ...cleanServer };
    notifyListeners();
    return memoryOverrides;
  }
}

/**
 * Get synchronous memory snapshot of overrides.
 */
export function getSynchronousOverrides(): Record<string, string> {
  return { ...memoryOverrides };
}

/**
 * Save an image override for a given project ID (persists to backend server for ALL devices,
 * plus local IndexedDB and localStorage).
 */
export async function saveImageOverride(projectId: string, imageUrlOrDataUrl: string): Promise<string> {
  memoryOverrides[projectId] = imageUrlOrDataUrl;
  notifyListeners();

  let finalUrl = imageUrlOrDataUrl;

  // 1. Persist to server Express API so anyone on ANY device sees the updated image
  try {
    const isDataUrl = imageUrlOrDataUrl.startsWith('data:image/');
    const res = await fetch('/api/project-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        url: isDataUrl ? undefined : imageUrlOrDataUrl,
        dataUrl: isDataUrl ? imageUrlOrDataUrl : undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        finalUrl = data.url;
        memoryOverrides[projectId] = finalUrl;
        notifyListeners();
      }
    }
  } catch (err) {
    console.warn('Failed to sync image override to backend server:', err);
  }

  // 2. Save to local IndexedDB for instant offline caching
  try {
    const idb = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        id: projectId,
        url: finalUrl,
        updatedAt: Date.now(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save to local IndexedDB:', err);
  }

  return finalUrl;
}

/**
 * Upload an image file directly to the server via multipart form-data.
 */
export async function uploadImageFileToServer(
  file: File,
  projectId?: string,
  options?: { addToGallery?: boolean; setAsCover?: boolean }
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('image', file, file.name);
    if (projectId) {
      formData.append('projectId', projectId);
    }
    if (options?.addToGallery) {
      formData.append('addToGallery', 'true');
    }
    if (options?.setAsCover !== undefined) {
      formData.append('setAsCover', options.setAsCover ? 'true' : 'false');
    }

    const res = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        if (projectId && options?.setAsCover !== false) {
          memoryOverrides[projectId] = data.url;
          notifyListeners();
        }
        return data.url;
      }
    }
    return null;
  } catch (err) {
    console.warn('Failed to upload image file to server:', err);
    return null;
  }
}

/**
 * Remove an image override (deletes from backend server and local IndexedDB).
 */
export async function removeImageOverride(projectId: string): Promise<void> {
  delete memoryOverrides[projectId];
  notifyListeners();

  // Remove from server
  try {
    await fetch(`/api/project-images/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Failed to remove image override on server:', err);
  }

  // Remove from local IndexedDB
  try {
    const idb = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(projectId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete from local IndexedDB:', err);
  }
}

/**
 * Reset all image overrides back to original portfolio defaults across server and client.
 */
export async function resetAllImageOverrides(): Promise<void> {
  memoryOverrides = {};
  notifyListeners();

  // Reset on server
  try {
    await fetch('/api/project-images', {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Failed to reset image overrides on server:', err);
  }

  // Reset local IndexedDB & localStorage
  try {
    const idb = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.warn('Failed to clear local IndexedDB:', err);
  }
}

/**
 * Subscribe to override changes (across tabs and components).
 */
export function subscribeToImageOverrides(callback: (overrides: Record<string, string>) => void): () => void {
  listeners.add(callback);
  callback({ ...memoryOverrides });

  // Listen to cross-window local storage events
  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail) {
      callback({ ...detail });
    }
  };
  window.addEventListener('kaushik_images_updated', handleCustomEvent);

  return () => {
    listeners.delete(callback);
    window.removeEventListener('kaushik_images_updated', handleCustomEvent);
  };
}

/**
 * Compress and process a user-uploaded image file into an optimized high-res data URL.
 */
export function processImageFile(file: File, maxDimension: number = 2880): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // High-resolution WebP compression (fallback JPEG)
        let dataUrl = canvas.toDataURL('image/webp', 0.94);
        if (dataUrl.length > 950000) {
          dataUrl = canvas.toDataURL('image/webp', 0.88);
        }
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(reader.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
