import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {
  isR2Configured,
  getR2Config,
  uploadBufferToR2,
  getObjectFromR2,
  generatePresignedUploadUrl,
  deleteR2Object,
  getR2PublicUrl,
  listR2Objects,
  type R2ObjectItem,
} from './src/server/r2Client.ts';

// In AI Studio, dev server must bind to port 3000 on 0.0.0.0
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';
const app = express();

// Ensure uploads directories exist
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
const PROJECT_IMAGES_FILE = path.join(UPLOADS_DIR, 'project-images.json');
const CIRCLE_CUSTOMIZATIONS_FILE = path.join(UPLOADS_DIR, 'circle-customizations.json');
const REMOVED_CIRCLES_FILE = path.join(UPLOADS_DIR, 'removed-circles.json');
const CUSTOM_PROJECTS_FILE = path.join(UPLOADS_DIR, 'custom-projects.json');
const MEDIA_LIBRARY_FILE = path.join(UPLOADS_DIR, 'media-library.json');

export interface MediaLibraryRecord {
  id: string;
  r2Key: string;
  url: string;
  filename: string;
  mediaType: 'video' | 'image';
  contentType?: string;
  size?: number;
  category: string;
  circleId?: string;
  title?: string;
  isCover?: boolean;
  displayOrder: number;
  createdAt: number;
  updatedAt: number;
}

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Asynchronously sync state files to Cloudflare R2
async function syncFileToR2(r2Key: string, data: any): Promise<void> {
  if (!isR2Configured()) return;
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');
    await uploadBufferToR2(buffer, r2Key, 'application/json');
  } catch (err) {
    console.warn(`[Cloudflare R2] Failed to sync ${r2Key} to R2:`, err);
  }
}

// Fetch JSON state from Cloudflare R2
async function fetchStateFromR2<T>(r2Key: string): Promise<T | null> {
  if (!isR2Configured()) return null;
  try {
    const raw = await getObjectFromR2(r2Key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Cloudflare R2] Failed to parse state from ${r2Key}:`, err);
    return null;
  }
}

function getStoredMediaLibrary(): MediaLibraryRecord[] {
  try {
    if (fs.existsSync(MEDIA_LIBRARY_FILE)) {
      return JSON.parse(fs.readFileSync(MEDIA_LIBRARY_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Failed to read media library:', err);
  }
  return [];
}

function saveStoredMediaLibrary(items: MediaLibraryRecord[]): void {
  try {
    fs.writeFileSync(MEDIA_LIBRARY_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write media library:', err);
  }
  syncFileToR2('_state/media-library.json', items);
}

function getStoredCircleCustomizations(): Record<string, any> {
  try {
    if (fs.existsSync(CIRCLE_CUSTOMIZATIONS_FILE)) {
      return JSON.parse(fs.readFileSync(CIRCLE_CUSTOMIZATIONS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Failed to read circle customizations:', err);
  }
  return {};
}

function saveStoredCircleCustomizations(data: Record<string, any>): void {
  try {
    fs.writeFileSync(CIRCLE_CUSTOMIZATIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write circle customizations:', err);
  }
  syncFileToR2('_state/circle-customizations.json', data);
}

function getStoredRemovedCircles(): string[] {
  try {
    if (fs.existsSync(REMOVED_CIRCLES_FILE)) {
      return JSON.parse(fs.readFileSync(REMOVED_CIRCLES_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Failed to read removed circles:', err);
  }
  return [];
}

function saveStoredRemovedCircles(data: string[]): void {
  try {
    fs.writeFileSync(REMOVED_CIRCLES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write removed circles:', err);
  }
  syncFileToR2('_state/removed-circles.json', data);
}

function getStoredCustomProjects(): any[] {
  try {
    if (fs.existsSync(CUSTOM_PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_PROJECTS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Failed to read custom projects:', err);
  }
  return [];
}

function saveStoredCustomProjects(data: any[]): void {
  try {
    fs.writeFileSync(CUSTOM_PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write custom projects:', err);
  }
  syncFileToR2('_state/custom-projects.json', data);
}

function extractWorkPageImagesFromPortfolioData(): Record<string, string> {
  const images: Record<string, string> = {};
  try {
    const portfolioFilePath = path.resolve(process.cwd(), 'src/data/portfolioData.ts');
    if (!fs.existsSync(portfolioFilePath)) return images;

    const content = fs.readFileSync(portfolioFilePath, 'utf-8');
    const regex = /id:\s*['"]([^'"]+)['"][\s\S]*?imageUrl:\s*['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const id = match[1];
      const imageUrl = match[2];
      images[id] = resolveMediaUrl(imageUrl);
    }
  } catch (err) {
    console.warn('Failed to extract images from portfolioData.ts:', err);
  }
  return images;
}

function extractRecentWorkImages(): Record<string, string> {
  const images: Record<string, string> = {};
  try {
    const playgroundFilePath = path.resolve(process.cwd(), 'src/components/PlaygroundView.tsx');
    if (!fs.existsSync(playgroundFilePath)) return images;

    const content = fs.readFileSync(playgroundFilePath, 'utf-8');
    const regex = /id:\s*['"](pg-[^'"]+)['"][\s\S]*?imageUrl:\s*['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const id = match[1];
      const imageUrl = match[2];
      const resolved = resolveMediaUrl(imageUrl);
      images[id] = resolved;
      images[id.replace(/^pg-/, '')] = resolved;
    }
  } catch (err) {
    console.warn('Failed to extract images from PlaygroundView.tsx:', err);
  }
  return images;
}

function getStoredProjectImages(): Record<string, string> {
  const workImages = extractWorkPageImagesFromPortfolioData();
  const recentWorkImages = extractRecentWorkImages();
  let stored: Record<string, string> = {};

  try {
    if (fs.existsSync(PROJECT_IMAGES_FILE)) {
      const data = fs.readFileSync(PROJECT_IMAGES_FILE, 'utf-8');
      stored = JSON.parse(data);
    }
  } catch (err) {
    console.warn('Failed to read project images:', err);
  }

  const validStored: Record<string, string> = {};
  for (const [k, v] of Object.entries(stored)) {
    const sanitized = sanitizeMediaUrl(v);
    if (sanitized) {
      validStored[k] = sanitized;
    }
  }

  // Work page and Recent Works baseline overlaid with verified valid stored overrides
  return { ...workImages, ...recentWorkImages, ...validStored };
}

function saveStoredProjectImages(data: Record<string, string>): void {
  try {
    fs.writeFileSync(PROJECT_IMAGES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write project images:', err);
  }
  syncFileToR2('_state/project-images.json', data);
}

function initAndSyncWorkPageImages(): void {
  try {
    const workImages = extractWorkPageImagesFromPortfolioData();
    const recentWorkImages = extractRecentWorkImages();
    let existing: Record<string, string> = {};
    if (fs.existsSync(PROJECT_IMAGES_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(PROJECT_IMAGES_FILE, 'utf-8'));
      } catch (e) {
        existing = {};
      }
    }
    const validExisting: Record<string, string> = {};
    for (const [k, v] of Object.entries(existing)) {
      const sanitized = sanitizeMediaUrl(v);
      if (sanitized) validExisting[k] = sanitized;
    }
    const merged = { ...workImages, ...recentWorkImages, ...validExisting };
    saveStoredProjectImages(merged);
    console.log(`[Backend] Synced ${Object.keys(merged).length} project images (Work Page & Recent Works) to backend storage.`);
  } catch (err) {
    console.warn('Failed to init/sync work page images:', err);
  }
}

function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  const driveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return trimmed;
}

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.m4v') ||
    clean.includes('/uploads/videos/') ||
    url.startsWith('data:video/')
  );
}

function persistImageToSourceCode(projectId: string, newUrl: string, mediaType?: 'image' | 'video'): void {
  try {
    const cleanUrl = resolveMediaUrl(newUrl);
    if (!cleanUrl) return;

    // 1. Work page (src/data/portfolioData.ts)
    const workId = projectId.replace(/^pg-/, '');
    const portfolioFilePath = path.resolve(process.cwd(), 'src/data/portfolioData.ts');
    if (fs.existsSync(portfolioFilePath)) {
      let content = fs.readFileSync(portfolioFilePath, 'utf-8');
      const regex = new RegExp(`(id:\\s*['"]${workId}['"][\\s\\S]*?imageUrl:\\s*['"])([^'"]+)(['"])`);
      if (regex.test(content)) {
        content = content.replace(regex, `$1${cleanUrl}$3`);
        fs.writeFileSync(portfolioFilePath, content, 'utf-8');
        console.log(`[SourceSync] Persisted ${workId} image to portfolioData.ts -> ${cleanUrl}`);
      }
    }

    // 2. Recent works (src/components/PlaygroundView.tsx)
    const playgroundFilePath = path.resolve(process.cwd(), 'src/components/PlaygroundView.tsx');
    if (fs.existsSync(playgroundFilePath)) {
      let pgContent = fs.readFileSync(playgroundFilePath, 'utf-8');
      const pgId = projectId.startsWith('pg-') ? projectId : `pg-${projectId}`;
      const isVid = mediaType === 'video' || isVideoUrl(cleanUrl);

      const imgRegex = new RegExp(`(id:\\s*['"]${pgId}['"][\\s\\S]*?imageUrl:\\s*['"])([^'"]+)(['"])`);
      if (imgRegex.test(pgContent)) {
        pgContent = pgContent.replace(imgRegex, `$1${cleanUrl}$3`);
      }
      if (isVid) {
        const vidRegex = new RegExp(`(id:\\s*['"]${pgId}['"][\\s\\S]*?videoUrl:\\s*['"])([^'"]+)(['"])`);
        if (vidRegex.test(pgContent)) {
          pgContent = pgContent.replace(vidRegex, `$1${cleanUrl}$3`);
        }
      }
      fs.writeFileSync(playgroundFilePath, pgContent, 'utf-8');
      console.log(`[SourceSync] Persisted ${pgId} to PlaygroundView.tsx -> ${cleanUrl}`);
    }

    // 3. src/utils/imageStorage.ts (DEFAULT_PROJECT_IMAGES)
    const imgStoragePath = path.resolve(process.cwd(), 'src/utils/imageStorage.ts');
    if (fs.existsSync(imgStoragePath)) {
      let imgContent = fs.readFileSync(imgStoragePath, 'utf-8');
      const keysToUpdate = [projectId, projectId.replace(/^pg-/, ''), `pg-${projectId.replace(/^pg-/, '')}`];
      for (const k of keysToUpdate) {
        const regex = new RegExp(`(['"]${k}['"]:\\s*['"])([^'"]+)(['"])`);
        if (regex.test(imgContent)) {
          imgContent = imgContent.replace(regex, `$1${cleanUrl}$3`);
        }
      }
      fs.writeFileSync(imgStoragePath, imgContent, 'utf-8');
    }

    // 4. src/utils/circleStorage.ts (DEFAULT_CIRCLE_CUSTOMIZATIONS)
    const circleStoragePath = path.resolve(process.cwd(), 'src/utils/circleStorage.ts');
    if (fs.existsSync(circleStoragePath)) {
      let circleContent = fs.readFileSync(circleStoragePath, 'utf-8');
      const keysToUpdate = [projectId, projectId.replace(/^pg-/, ''), `pg-${projectId.replace(/^pg-/, '')}`];
      for (const k of keysToUpdate) {
        const regex = new RegExp(`(['"]${k}['"]:\\s*{[\\s\\S]*?imageUrl:\\s*['"])([^'"]+)(['"])`);
        if (regex.test(circleContent)) {
          circleContent = circleContent.replace(regex, `$1${cleanUrl}$3`);
        }
      }
      fs.writeFileSync(circleStoragePath, circleContent, 'utf-8');
    }
  } catch (err) {
    console.warn('Failed to persist image to source code:', err);
  }
}

function persistCircleCustomizationToSourceCode(circleId: string, updates: any): void {
  try {
    const pgId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;
    const playgroundFilePath = path.resolve(process.cwd(), 'src/components/PlaygroundView.tsx');
    if (fs.existsSync(playgroundFilePath) && updates.title) {
      let content = fs.readFileSync(playgroundFilePath, 'utf-8');
      const titleRegex = new RegExp(`(id:\\s*['"]${pgId}['"][\\s\\S]*?title:\\s*['"])([^'"]+)(['"])`);
      if (titleRegex.test(content)) {
        content = content.replace(titleRegex, `$1${updates.title.replace(/'/g, "\\'")}$3`);
        fs.writeFileSync(playgroundFilePath, content, 'utf-8');
        console.log(`[SourceSync] Persisted title for ${pgId} to PlaygroundView.tsx: "${updates.title}"`);
      }
    }

    const circleStoragePath = path.resolve(process.cwd(), 'src/utils/circleStorage.ts');
    if (fs.existsSync(circleStoragePath) && updates.title) {
      let circleContent = fs.readFileSync(circleStoragePath, 'utf-8');
      const keysToUpdate = [circleId, circleId.replace(/^pg-/, ''), `pg-${circleId.replace(/^pg-/, '')}`];
      for (const k of keysToUpdate) {
        const titleRegex = new RegExp(`(['"]${k}['"]:\\s*{[\\s\\S]*?title:\\s*['"])([^'"]+)(['"])`);
        if (titleRegex.test(circleContent)) {
          circleContent = circleContent.replace(titleRegex, `$1${updates.title.replace(/'/g, "\\'")}$3`);
        }
      }
      fs.writeFileSync(circleStoragePath, circleContent, 'utf-8');
    }
  } catch (err) {
    console.warn('Failed to persist circle customization to source code:', err);
  }
}

function syncImageToPlaygroundData(projectId: string, newUrl: string): void {
  try {
    const plainId = projectId.replace(/^pg-/, '');
    const prefixedId = projectId.startsWith('pg-') ? projectId : `pg-${projectId}`;
    const isVid = isVideoUrl(newUrl);

    // Save to stored circle customizations
    const customizations = getStoredCircleCustomizations();
    const current = customizations[projectId] || customizations[plainId] || customizations[prefixedId] || {};
    const updated = {
      ...current,
      imageUrl: newUrl,
      videoUrl: isVid ? newUrl : undefined,
      mediaType: isVid ? 'video' : 'image',
      updatedAt: Date.now(),
    };
    customizations[projectId] = updated;
    customizations[plainId] = updated;
    customizations[prefixedId] = updated;
    saveStoredCircleCustomizations(customizations);

    // Also update project images overrides
    const overrides = getStoredProjectImages();
    overrides[projectId] = newUrl;
    overrides[plainId] = newUrl;
    overrides[prefixedId] = newUrl;
    saveStoredProjectImages(overrides);

    // Also write permanently to source code
    persistImageToSourceCode(projectId, newUrl, isVid ? 'video' : 'image');

    console.log(`[Backend] Synced recent work ${projectId} (${isVid ? 'video' : 'image'}) -> ${newUrl}`);
  } catch (err) {
    console.warn('Failed to sync recent work image:', err);
  }
}

function syncImageToPortfolioData(projectId: string, newUrl: string): void {
  try {
    if (projectId.startsWith('pg-')) {
      syncImageToPlaygroundData(projectId, newUrl);
      return;
    }

    const overrides = getStoredProjectImages();
    overrides[projectId] = newUrl;
    saveStoredProjectImages(overrides);

    // Also write permanently to source code
    persistImageToSourceCode(projectId, newUrl, 'image');
  } catch (err) {
    console.warn('Failed to sync project image:', err);
  }
}

function sanitizeMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // External URLs (HTTP, HTTPS, Cloudflare R2, Google CDN, etc.)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Static site assets in public folder
  if (trimmed.startsWith('/projects/') || trimmed.startsWith('/images/')) {
    return trimmed;
  }

  // Videos in /uploads/videos/
  if (trimmed.startsWith('/uploads/videos/')) {
    const filename = path.basename(trimmed);
    const diskPath = path.join(VIDEOS_DIR, filename);
    if (fs.existsSync(diskPath)) {
      return trimmed;
    }
    // Check if the file is in public/videos
    const publicPath = path.resolve(process.cwd(), 'public/videos', filename);
    if (fs.existsSync(publicPath)) {
      return `/videos/${filename}`;
    }
    // Check partial prefix in public/videos (e.g. soledition-video-)
    const prefixMatch = filename.split('-').slice(0, 2).join('-');
    if (prefixMatch && prefixMatch.length > 6) {
      try {
        const publicFiles = fs.readdirSync(path.resolve(process.cwd(), 'public/videos'));
        const found = publicFiles.find((f) => f.startsWith(prefixMatch));
        if (found) return `/videos/${found}`;
      } catch (_) {}
    }
    return null;
  }

  // Videos in /videos/
  if (trimmed.startsWith('/videos/')) {
    const filename = path.basename(trimmed);
    const publicPath = path.resolve(process.cwd(), 'public/videos', filename);
    if (fs.existsSync(publicPath)) {
      return trimmed;
    }
    return null;
  }

  // Images in /uploads/images/
  if (trimmed.startsWith('/uploads/images/')) {
    const filename = path.basename(trimmed);
    const diskPath = path.join(IMAGES_DIR, filename);
    if (fs.existsSync(diskPath)) {
      return trimmed;
    }
    return null;
  }

  return trimmed;
}

function sanitizeCircleCustomizations(): void {
  try {
    const data = getStoredCircleCustomizations();
    let modified = false;

    for (const [key, item] of Object.entries(data)) {
      if (!item || typeof item !== 'object') continue;

      // Clean gallery
      if (Array.isArray(item.gallery) && item.gallery.length > 0) {
        const origLen = item.gallery.length;
        const cleaned = item.gallery
          .map((u: string) => sanitizeMediaUrl(u))
          .filter((u: string | null): u is string => Boolean(u));

        if (cleaned.length !== origLen) {
          item.gallery = cleaned;
          modified = true;
        }
      }

      // Clean imageUrl
      if (item.imageUrl) {
        const sanitized = sanitizeMediaUrl(item.imageUrl);
        if (!sanitized) {
          item.imageUrl = (item.gallery && item.gallery[0]) || '';
          modified = true;
        } else if (sanitized !== item.imageUrl) {
          item.imageUrl = sanitized;
          modified = true;
        }
      }

      // Clean videoUrl
      if (item.videoUrl) {
        const sanitized = sanitizeMediaUrl(item.videoUrl);
        if (!sanitized) {
          const firstVid = (item.gallery || []).find((u: string) => isVideoUrl(u));
          item.videoUrl = firstVid || undefined;
          if (!firstVid && item.mediaType === 'video') {
            item.mediaType = (item.gallery && item.gallery.length > 0) ? 'image' : 'video';
          }
          modified = true;
        } else if (sanitized !== item.videoUrl) {
          item.videoUrl = sanitized;
          modified = true;
        }
      }
    }

    if (modified) {
      saveStoredCircleCustomizations(data);
      console.log('[Backend] Sanitized circle customizations (pruned broken 404 links)');
    }
  } catch (err) {
    console.warn('Failed to sanitize circle customizations:', err);
  }
}

async function hydrateStateFromR2(): Promise<void> {
  if (!isR2Configured()) return;
  try {
    console.log('[Cloudflare R2] Synchronizing persistent state from R2 cloud storage...');

    // 1. Project images
    const r2Images = await fetchStateFromR2<Record<string, string>>('_state/project-images.json');
    if (r2Images && typeof r2Images === 'object' && Object.keys(r2Images).length > 0) {
      let local: Record<string, string> = {};
      if (fs.existsSync(PROJECT_IMAGES_FILE)) {
        try { local = JSON.parse(fs.readFileSync(PROJECT_IMAGES_FILE, 'utf-8')); } catch (_) {}
      }
      const merged = { ...local, ...r2Images };
      fs.writeFileSync(PROJECT_IMAGES_FILE, JSON.stringify(merged, null, 2), 'utf-8');
      console.log(`[Cloudflare R2] Hydrated ${Object.keys(merged).length} project images from R2.`);
    } else if (fs.existsSync(PROJECT_IMAGES_FILE)) {
      try {
        const local = JSON.parse(fs.readFileSync(PROJECT_IMAGES_FILE, 'utf-8'));
        await syncFileToR2('_state/project-images.json', local);
      } catch (_) {}
    }

    // 2. Circle customizations
    const r2Customizations = await fetchStateFromR2<Record<string, any>>('_state/circle-customizations.json');
    if (r2Customizations && typeof r2Customizations === 'object' && Object.keys(r2Customizations).length > 0) {
      let local: Record<string, any> = {};
      if (fs.existsSync(CIRCLE_CUSTOMIZATIONS_FILE)) {
        try { local = JSON.parse(fs.readFileSync(CIRCLE_CUSTOMIZATIONS_FILE, 'utf-8')); } catch (_) {}
      }
      const merged = { ...local, ...r2Customizations };
      fs.writeFileSync(CIRCLE_CUSTOMIZATIONS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
      console.log(`[Cloudflare R2] Hydrated ${Object.keys(merged).length} circle customizations from R2.`);
    } else if (fs.existsSync(CIRCLE_CUSTOMIZATIONS_FILE)) {
      try {
        const local = JSON.parse(fs.readFileSync(CIRCLE_CUSTOMIZATIONS_FILE, 'utf-8'));
        await syncFileToR2('_state/circle-customizations.json', local);
      } catch (_) {}
    }

    // 3. Removed circles
    const r2Removed = await fetchStateFromR2<string[]>('_state/removed-circles.json');
    if (Array.isArray(r2Removed)) {
      fs.writeFileSync(REMOVED_CIRCLES_FILE, JSON.stringify(r2Removed, null, 2), 'utf-8');
    }

    // 4. Custom projects
    const r2CustomProjects = await fetchStateFromR2<any[]>('_state/custom-projects.json');
    if (Array.isArray(r2CustomProjects)) {
      fs.writeFileSync(CUSTOM_PROJECTS_FILE, JSON.stringify(r2CustomProjects, null, 2), 'utf-8');
    }

    // 5. Media library
    const r2MediaLibrary = await fetchStateFromR2<MediaLibraryRecord[]>('_state/media-library.json');
    if (Array.isArray(r2MediaLibrary)) {
      fs.writeFileSync(MEDIA_LIBRARY_FILE, JSON.stringify(r2MediaLibrary, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[Cloudflare R2] State hydration error:', err);
  }
}

// Initial sync of work page images, R2 hydration, and sanitization on server boot
hydrateStateFromR2().finally(() => {
  initAndSyncWorkPageImages();
  sanitizeCircleCustomizations();
});

// Parse JSON bodies with generous limit for dataUrls if needed
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve uploaded files statically with byte-range streaming support for videos
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res, filePath) => {
    res.setHeader('Accept-Ranges', 'bytes');
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
    } else if (filePath.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    }
  }
}));

// Also serve /videos statically from public/videos
app.use('/videos', express.static(path.resolve(process.cwd(), 'public/videos'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Accept-Ranges', 'bytes');
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
    } else if (filePath.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    }
  }
}));

// Stream video files with HTTP 206 Partial Content support for Safari, Chrome, iOS & Android
app.get('/uploads/videos/:filename', (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(VIDEOS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return next();
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === '.webm'
        ? 'video/webm'
        : ext === '.mov'
        ? 'video/quicktime'
        : ext === '.ogg'
        ? 'video/ogg'
        : 'video/mp4';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (streamErr) {
    console.error('Video streaming error:', streamErr);
    next();
  }
});

// Multer storage engine for video files
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VIDEOS_DIR);
  },
  filename: (req, file, cb) => {
    const sanitized = (file.originalname || 'video').replace(/[^a-zA-Z0-9._-]/g, '_');
    let ext = path.extname(sanitized).toLowerCase();
    if (!ext || ext === '.') {
      if (file.mimetype.includes('webm')) ext = '.webm';
      else if (file.mimetype.includes('quicktime') || file.mimetype.includes('mov')) ext = '.mov';
      else ext = '.mp4';
    }
    const base = path.basename(sanitized, ext).slice(0, 40) || 'video';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Permissive filter so user is never blocked by unexpected browser MIME types
    cb(null, true);
  },
});

// ================= API ROUTES =================

/**
 * Upload a video file to the server
 */
app.post('/api/upload-video', (req, res) => {
  uploadVideo.any()(req as any, res as any, async (err: any) => {
    if (err) {
      console.error('Video upload error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to upload video',
      });
    }

    const files = (req as any).files;
    const file = (files && files[0]) || (req as any).file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided',
      });
    }

    let publicUrl = `/uploads/videos/${file.filename}`;

    // Upload to Cloudflare R2 for permanent global CDN hosting
    if (isR2Configured()) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const r2Key = `uploads/videos/${file.filename}`;
        const r2Res = await uploadBufferToR2(fileBuffer, r2Key, file.mimetype || 'video/mp4');
        if (r2Res.success && r2Res.url) {
          publicUrl = r2Res.url;
          console.log(`[Cloudflare R2] Video uploaded successfully to R2: ${publicUrl}`);
        }
      } catch (r2Err) {
        console.warn('[Cloudflare R2] Video upload to R2 error, falling back to local path:', r2Err);
      }
    }

    const projectId = req.body?.projectId || req.body?.circleId;
    const addToGallery = req.body?.addToGallery === 'true' || req.body?.addToGallery === true;
    const setAsCover = req.body?.setAsCover === 'true' || req.body?.setAsCover === true || req.body?.setAsCover === undefined;

    if (projectId) {
      if (setAsCover) {
        syncImageToPlaygroundData(projectId, publicUrl);
      }
      if (addToGallery || projectId.startsWith('pg-')) {
        const customizations = getStoredCircleCustomizations();
        const current = customizations[projectId] || {};
        const currentGallery = current.gallery || [];
        if (!currentGallery.includes(publicUrl)) {
          const updatedGallery = [publicUrl, ...currentGallery];
          const plainId = projectId.replace(/^pg-/, '');
          const prefixedId = projectId.startsWith('pg-') ? projectId : `pg-${projectId}`;
          const updatedPayload = {
            ...current,
            gallery: updatedGallery,
            ...(setAsCover ? { imageUrl: publicUrl, videoUrl: publicUrl, mediaType: 'video' } : {}),
            updatedAt: Date.now(),
          };
          customizations[projectId] = updatedPayload;
          customizations[plainId] = updatedPayload;
          customizations[prefixedId] = updatedPayload;
          saveStoredCircleCustomizations(customizations);
        }
      }
    }

    return res.status(200).json({
      success: true,
      url: publicUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: Date.now(),
    });
  });
});

/**
 * Fallback Base64 / DataURL video uploader
 */
app.post('/api/upload-base64', async (req, res) => {
  try {
    const { dataUrl, filename, mediaType } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ success: false, error: 'Missing dataUrl payload' });
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid data URL format' });
    }

    const mime = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const isVideo = mime.startsWith('video/') || mediaType === 'video';
    const targetDir = isVideo ? VIDEOS_DIR : IMAGES_DIR;
    const subfolder = isVideo ? 'videos' : 'images';
    const ext = isVideo ? '.mp4' : '.webp';
    const cleanName = (filename || 'media').replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeFilename = `${cleanName}-${Date.now()}${ext}`;
    const filePath = path.join(targetDir, safeFilename);

    fs.writeFileSync(filePath, buffer);

    let publicUrl = `/uploads/${subfolder}/${safeFilename}`;
    if (isR2Configured()) {
      try {
        const r2Key = `uploads/${subfolder}/${safeFilename}`;
        const r2Res = await uploadBufferToR2(buffer, r2Key, mime);
        if (r2Res.success && r2Res.url) {
          publicUrl = r2Res.url;
          console.log(`[Cloudflare R2] Base64 upload saved to R2: ${publicUrl}`);
        }
      } catch (r2Err) {
        console.warn('[Cloudflare R2] Base64 upload to R2 error:', r2Err);
      }
    }

    return res.status(200).json({
      success: true,
      url: publicUrl,
      filename: safeFilename,
      size: buffer.length,
      mimetype: mime,
    });
  } catch (err: any) {
    console.error('Base64 upload error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

/**
 * List all uploaded videos stored on the server
 */
app.get('/api/videos', (req, res) => {
  try {
    if (!fs.existsSync(VIDEOS_DIR)) {
      return res.json({ success: true, videos: [] });
    }

    const files = fs.readdirSync(VIDEOS_DIR);
    const videoList = files
      .filter((file) => !file.startsWith('.') && file.match(/\.(mp4|webm|mov|ogg|m4v)$/i))
      .map((file) => {
        const filePath = path.join(VIDEOS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          url: `/uploads/videos/${file}`,
          size: stats.size,
          createdAt: stats.birthtimeMs || stats.mtimeMs,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return res.json({ success: true, videos: videoList });
  } catch (err: any) {
    console.error('Failed to list videos:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve videos' });
  }
});

/**
 * Delete a video stored on the server
 */
app.delete('/api/videos/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(VIDEOS_DIR, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: 'Video deleted from server' });
    } else {
      return res.status(404).json({ success: false, error: 'Video file not found' });
    }
  } catch (err: any) {
    console.error('Failed to delete video:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete video' });
  }
});

// Multer storage engine for image files
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(sanitized) || '.png';
    const base = path.basename(sanitized, ext).slice(0, 40);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB limit
  },
});

/**
 * Upload an image file directly to the server
 */
app.post('/api/upload-image', (req, res) => {
  uploadImage.single('image')(req as any, res as any, async (err: any) => {
    if (err) {
      console.error('Image upload error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to upload image' });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    let publicUrl = `/uploads/images/${file.filename}`;

    // Upload to Cloudflare R2 for permanent global CDN hosting
    if (isR2Configured()) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const r2Key = `uploads/images/${file.filename}`;
        const r2Res = await uploadBufferToR2(fileBuffer, r2Key, file.mimetype || 'image/jpeg');
        if (r2Res.success && r2Res.url) {
          publicUrl = r2Res.url;
          console.log(`[Cloudflare R2] Image uploaded successfully to R2: ${publicUrl}`);
        }
      } catch (r2Err) {
        console.warn('[Cloudflare R2] Image upload to R2 error, falling back to local path:', r2Err);
      }
    }

    const projectId = req.body?.projectId;
    const addToGallery = req.body?.addToGallery === 'true' || req.body?.addToGallery === true;
    const setAsCover = req.body?.setAsCover === 'true' || req.body?.setAsCover === true || (!addToGallery && req.body?.setAsCover !== 'false');

    if (projectId) {
      if (setAsCover) {
        const overrides = getStoredProjectImages();
        overrides[projectId] = publicUrl;
        if (projectId.startsWith('pg-')) {
          overrides[projectId.replace(/^pg-/, '')] = publicUrl;
        } else {
          overrides[`pg-${projectId}`] = publicUrl;
        }
        saveStoredProjectImages(overrides);
        syncImageToPortfolioData(projectId, publicUrl);
      }

      // If addToGallery or it's a recent works circle, append to its gallery array
      if (addToGallery || projectId.startsWith('pg-')) {
        const customizations = getStoredCircleCustomizations();
        const current = customizations[projectId] || {};
        const currentGallery = current.gallery || [];
        if (!currentGallery.includes(publicUrl)) {
          const updatedGallery = [publicUrl, ...currentGallery];
          customizations[projectId] = {
            ...current,
            gallery: updatedGallery,
            ...(setAsCover ? { imageUrl: publicUrl } : {}),
            updatedAt: Date.now(),
          };
          const plainId = projectId.replace(/^pg-/, '');
          const prefixedId = projectId.startsWith('pg-') ? projectId : `pg-${projectId}`;
          customizations[plainId] = { ...(customizations[plainId] || {}), gallery: updatedGallery, ...(setAsCover ? { imageUrl: publicUrl } : {}) };
          customizations[prefixedId] = { ...(customizations[prefixedId] || {}), gallery: updatedGallery, ...(setAsCover ? { imageUrl: publicUrl } : {}) };
          saveStoredCircleCustomizations(customizations);
        }
      }
    }

    return res.status(200).json({
      success: true,
      url: publicUrl,
      filename: file.filename,
      size: file.size,
    });
  });
});

/**
 * POST /api/circle-gallery/:circleId
 * Add image/video to a circle's gallery (and optionally set as cover), or sync full gallery array
 */
app.post('/api/circle-gallery/:circleId', (req, res) => {
  try {
    const { circleId } = req.params;
    const { imageUrl, setAsCover, mediaType, gallery } = req.body;
    
    const plainId = circleId.replace(/^pg-/, '');
    const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;
    
    const customizations = getStoredCircleCustomizations();
    const current = customizations[circleId] || customizations[plainId] || customizations[prefixedId] || {};
    let updatedGallery: string[] = current.gallery ? [...current.gallery] : [];

    // If an entire gallery array of URLs was passed, merge/sync them
    if (Array.isArray(gallery)) {
      const resolvedList = gallery.map((u: string) => resolveMediaUrl(u)).filter(Boolean);
      updatedGallery = Array.from(new Set([...resolvedList, ...updatedGallery]));
    }

    let finalImageUrl = current.imageUrl;
    let finalVideoUrl = current.videoUrl;
    let isVid = false;

    if (imageUrl) {
      const resolved = resolveMediaUrl(imageUrl);
      isVid = isVideoUrl(resolved) || mediaType === 'video';
      updatedGallery = [resolved, ...updatedGallery.filter((url: string) => url !== resolved)];
      
      if (setAsCover) {
        finalImageUrl = resolved;
        finalVideoUrl = isVid ? resolved : undefined;
      }
    }

    const effectiveMediaType = isVid || isVideoUrl(finalVideoUrl) || isVideoUrl(finalImageUrl) ? 'video' : (mediaType || current.mediaType || 'image');

    const updatePayload = {
      ...current,
      gallery: updatedGallery,
      ...(setAsCover && finalImageUrl ? {
        imageUrl: finalImageUrl,
        videoUrl: effectiveMediaType === 'video' ? (finalVideoUrl || finalImageUrl) : undefined,
        mediaType: effectiveMediaType,
      } : {}),
      updatedAt: Date.now(),
    };

    customizations[circleId] = updatePayload;
    customizations[plainId] = updatePayload;
    customizations[prefixedId] = updatePayload;
    saveStoredCircleCustomizations(customizations);

    if (setAsCover && finalImageUrl) {
      const overrides = getStoredProjectImages();
      overrides[circleId] = finalImageUrl;
      overrides[plainId] = finalImageUrl;
      overrides[prefixedId] = finalImageUrl;
      saveStoredProjectImages(overrides);
      syncImageToPortfolioData(circleId, finalImageUrl);
    }

    console.log(`[Backend] Saved gallery URLs for ${circleId} (${updatedGallery.length} URLs in backend storage)`);

    return res.json({
      success: true,
      gallery: updatedGallery,
      thumbnail: updatePayload.imageUrl,
      videoUrl: updatePayload.videoUrl,
      mediaType: updatePayload.mediaType,
    });
  } catch (err: any) {
    console.error('Failed to update circle gallery:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update gallery' });
  }
});

/**
 * POST /api/save-all-urls
 * Dedicated endpoint to persist all image/video URLs for any project/circle directly to server disk
 */
app.post('/api/save-all-urls', (req, res) => {
  try {
    const { circleId, urls, coverUrl, mediaType } = req.body;
    if (!circleId || !Array.isArray(urls)) {
      return res.status(400).json({ success: false, error: 'Missing circleId or urls array' });
    }

    const plainId = circleId.replace(/^pg-/, '');
    const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;

    const customizations = getStoredCircleCustomizations();
    const current = customizations[circleId] || customizations[plainId] || customizations[prefixedId] || {};

    const resolvedUrls = urls.map((u: string) => resolveMediaUrl(u)).filter(Boolean);
    const existing = current.gallery || [];
    const combinedGallery = Array.from(new Set([...resolvedUrls, ...existing]));

    const targetCover = coverUrl ? resolveMediaUrl(coverUrl) : (current.imageUrl || combinedGallery[0] || '');
    const isVid = mediaType === 'video' || isVideoUrl(targetCover);

    const payload = {
      ...current,
      gallery: combinedGallery,
      imageUrl: targetCover,
      videoUrl: isVid ? targetCover : undefined,
      mediaType: isVid ? 'video' : 'image',
      updatedAt: Date.now(),
    };

    customizations[circleId] = payload;
    customizations[plainId] = payload;
    customizations[prefixedId] = payload;
    saveStoredCircleCustomizations(customizations);

    if (targetCover) {
      const overrides = getStoredProjectImages();
      overrides[circleId] = targetCover;
      overrides[plainId] = targetCover;
      overrides[prefixedId] = targetCover;
      saveStoredProjectImages(overrides);
      syncImageToPortfolioData(circleId, targetCover);
    }

    console.log(`[Backend] Persisted ${combinedGallery.length} URLs for ${circleId} to backend disk`);

    return res.json({
      success: true,
      message: `Persisted ${combinedGallery.length} URLs to backend server`,
      gallery: combinedGallery,
      cover: targetCover,
      mediaType: isVid ? 'video' : 'image',
    });
  } catch (err: any) {
    console.error('Failed to save URLs to backend:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});


/**
 * DELETE /api/circle-gallery/:circleId
 * Remove image from a circle's gallery
 */
app.delete('/api/circle-gallery/:circleId', (req, res) => {
  try {
    const { circleId } = req.params;
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'Missing imageUrl' });
    }

    const customizations = getStoredCircleCustomizations();
    const current = customizations[circleId] || {};
    const currentGallery = current.gallery || [];
    const updatedGallery = currentGallery.filter((url: string) => url !== imageUrl);

    const plainId = circleId.replace(/^pg-/, '');
    const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;

    let newThumbnail = current.imageUrl;
    let didChangeThumbnail = false;
    if (current.imageUrl === imageUrl || current.videoUrl === imageUrl) {
      newThumbnail = updatedGallery[0] || '';
      didChangeThumbnail = true;
    }

    const isNewThumbVideo = isVideoUrl(newThumbnail);
    const updatePayload = {
      ...current,
      gallery: updatedGallery,
      ...(didChangeThumbnail ? {
        imageUrl: newThumbnail,
        videoUrl: isNewThumbVideo ? newThumbnail : undefined,
        mediaType: isNewThumbVideo ? 'video' : 'image',
      } : {}),
      updatedAt: Date.now(),
    };

    customizations[circleId] = updatePayload;
    customizations[plainId] = updatePayload;
    customizations[prefixedId] = updatePayload;
    saveStoredCircleCustomizations(customizations);

    if (didChangeThumbnail && newThumbnail) {
      const overrides = getStoredProjectImages();
      overrides[circleId] = newThumbnail;
      overrides[plainId] = newThumbnail;
      overrides[prefixedId] = newThumbnail;
      saveStoredProjectImages(overrides);
      syncImageToPortfolioData(circleId, newThumbnail);
    }

    return res.json({
      success: true,
      gallery: updatedGallery,
      thumbnail: newThumbnail,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to remove from gallery' });
  }
});

/**
 * PUT /api/circle-gallery/:circleId/thumbnail
 * Set an image or video as circle thumbnail
 */
app.put('/api/circle-gallery/:circleId/thumbnail', (req, res) => {
  try {
    const { circleId } = req.params;
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'Missing imageUrl' });
    }

    const resolved = resolveMediaUrl(imageUrl);
    const isVid = isVideoUrl(resolved) || req.body?.mediaType === 'video';
    const plainId = circleId.replace(/^pg-/, '');
    const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;

    const customizations = getStoredCircleCustomizations();
    const current = customizations[circleId] || {};
    const updatedPayload = {
      ...current,
      imageUrl: resolved,
      videoUrl: isVid ? resolved : undefined,
      mediaType: isVid ? 'video' : 'image',
      updatedAt: Date.now(),
    };

    customizations[circleId] = updatedPayload;
    customizations[plainId] = updatedPayload;
    customizations[prefixedId] = updatedPayload;
    saveStoredCircleCustomizations(customizations);

    const overrides = getStoredProjectImages();
    overrides[circleId] = resolved;
    overrides[plainId] = resolved;
    overrides[prefixedId] = resolved;
    saveStoredProjectImages(overrides);
    syncImageToPortfolioData(circleId, resolved);

    return res.json({
      success: true,
      thumbnail: resolved,
      videoUrl: isVid ? resolved : null,
      mediaType: isVid ? 'video' : 'image',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to set thumbnail' });
  }
});

/**
 * Get all server-persisted project image overrides (available across all devices)
 */
app.get('/api/project-images', (req, res) => {
  try {
    const images = getStoredProjectImages();
    return res.json({ success: true, images });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve project images' });
  }
});

/**
 * Save or update a project image override (persisted on server and synced to portfolioData.ts)
 */
app.post('/api/project-images', async (req, res) => {
  try {
    const { projectId, url, dataUrl } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'Missing projectId' });
    }

    let finalUrl = url;

    // Handle base64 image dataUrl if provided
    if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
      const matches = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const rawExt = matches[1].replace('jpeg', 'jpg');
        const ext = rawExt.includes('svg') ? '.svg' : `.${rawExt.split('+')[0]}`;
        const buffer = Buffer.from(matches[2], 'base64');
        const cleanProject = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${cleanProject}-${Date.now()}${ext}`;
        const filePath = path.join(IMAGES_DIR, filename);
        fs.writeFileSync(filePath, buffer);
        finalUrl = `/uploads/images/${filename}`;

        if (isR2Configured()) {
          try {
            const r2Key = `uploads/images/${filename}`;
            const r2Res = await uploadBufferToR2(buffer, r2Key, `image/${rawExt.split('+')[0]}`);
            if (r2Res.success && r2Res.url) {
              finalUrl = r2Res.url;
              console.log(`[Cloudflare R2] Base64 project image uploaded to R2: ${finalUrl}`);
            }
          } catch (r2Err) {
            console.warn('[Cloudflare R2] Base64 image upload to R2 error:', r2Err);
          }
        }
      }
    }

    if (!finalUrl) {
      return res.status(400).json({ success: false, error: 'No url or dataUrl provided' });
    }

    finalUrl = resolveMediaUrl(finalUrl);

    // Persist to server JSON storage
    const overrides = getStoredProjectImages();
    overrides[projectId] = finalUrl;
    if (projectId.startsWith('pg-')) {
      overrides[projectId.replace(/^pg-/, '')] = finalUrl;
    } else {
      overrides[`pg-${projectId}`] = finalUrl;
    }
    saveStoredProjectImages(overrides);

    // Also persist directly into src/data/portfolioData.ts / PlaygroundView.tsx
    syncImageToPortfolioData(projectId, finalUrl);

    return res.json({ success: true, url: finalUrl, images: overrides });
  } catch (err: any) {
    console.error('Error saving project image:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

/**
 * Delete a project image override
 */
app.delete('/api/project-images/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const overrides = getStoredProjectImages();
    delete overrides[projectId];
    saveStoredProjectImages(overrides);
    return res.json({ success: true, images: overrides });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete project image' });
  }
});

/**
 * Reset all project image overrides
 */
app.delete('/api/project-images', (req, res) => {
  try {
    saveStoredProjectImages({});
    return res.json({ success: true, message: 'All project images reset' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to reset project images' });
  }
});

/**
 * Sync work page images from portfolioData.ts into backend persistent store
 */
app.post('/api/sync-work-images', (req, res) => {
  try {
    const workImages = extractWorkPageImagesFromPortfolioData();
    const existing = getStoredProjectImages();
    const merged = { ...workImages, ...existing };
    saveStoredProjectImages(merged);
    return res.json({
      success: true,
      count: Object.keys(merged).length,
      message: `Successfully synchronized ${Object.keys(merged).length} project images from work page to backend.`,
      images: merged,
    });
  } catch (err: any) {
    console.error('Failed to sync work images:', err);
    return res.status(500).json({ success: false, error: err.message || 'Sync failed' });
  }
});

/**
 * GET /api/app-state
 * Fetches all persistent app data (images, circle customizations, removed circles, custom projects) in one request
 */
app.get('/api/app-state', (req, res) => {
  try {
    const images = getStoredProjectImages();
    const customizations = getStoredCircleCustomizations();
    const removedCircles = getStoredRemovedCircles();
    const customProjects = getStoredCustomProjects();
    return res.json({
      success: true,
      images,
      customizations,
      removedCircles,
      customProjects,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve app state' });
  }
});

/**
 * POST /api/save-all-state
 * Saves all frontend changes (image overrides, circle customizations, removed circles, custom projects) to backend files
 */
app.post('/api/save-all-state', (req, res) => {
  try {
    const { images, customizations, removedCircles, customProjects } = req.body;
    if (images && typeof images === 'object') {
      const existing = getStoredProjectImages();
      saveStoredProjectImages({ ...existing, ...images });
    }
    if (customizations && typeof customizations === 'object') {
      const existing = getStoredCircleCustomizations();
      saveStoredCircleCustomizations({ ...existing, ...customizations });
    }
    if (Array.isArray(removedCircles)) {
      saveStoredRemovedCircles(removedCircles);
    }
    if (Array.isArray(customProjects)) {
      saveStoredCustomProjects(customProjects);
    }

    return res.json({
      success: true,
      message: 'All application state successfully saved to backend storage',
      state: {
        images: getStoredProjectImages(),
        customizations: getStoredCircleCustomizations(),
        removedCircles: getStoredRemovedCircles(),
        customProjects: getStoredCustomProjects(),
      },
    });
  } catch (err: any) {
    console.error('Failed to save all state:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save all state' });
  }
});

/**
 * POST /api/publish-changes
 * Bakes all current custom images, titles, and galleries permanently into:
 * 1. src/data/portfolioData.ts (Work page)
 * 2. src/components/PlaygroundView.tsx (Recent works)
 * 3. src/utils/circleStorage.ts (DEFAULT_CIRCLE_CUSTOMIZATIONS)
 * 4. src/utils/imageStorage.ts (DEFAULT_PROJECT_IMAGES)
 * 5. Cloudflare R2 permanent state (_state/*.json)
 * Ensures every visitor and every PC immediately sees all latest updates.
 */
app.post('/api/publish-changes', async (req, res) => {
  try {
    const images = getStoredProjectImages();
    const customizations = getStoredCircleCustomizations();
    let updatedCount = 0;

    // 1. Persist each image override to source code
    for (const [id, url] of Object.entries(images)) {
      if (url && typeof url === 'string') {
        persistImageToSourceCode(id, url);
        updatedCount++;
      }
    }

    // 2. Persist each circle customization to source code
    for (const [id, cust] of Object.entries(customizations)) {
      if (cust && typeof cust === 'object') {
        if (cust.imageUrl || cust.videoUrl) {
          persistImageToSourceCode(id, cust.videoUrl || cust.imageUrl, cust.mediaType);
        }
        if (cust.title) {
          persistCircleCustomizationToSourceCode(id, cust);
        }
      }
    }

    // 3. Sync all state to Cloudflare R2
    if (isR2Configured()) {
      await Promise.allSettled([
        syncFileToR2('_state/project-images.json', images),
        syncFileToR2('_state/circle-customizations.json', customizations),
        syncFileToR2('_state/custom-projects.json', getStoredCustomProjects()),
        syncFileToR2('_state/removed-circles.json', getStoredRemovedCircles()),
      ]);
    }

    console.log(`[Publish] Successfully baked ${updatedCount} items to code & R2.`);

    return res.json({
      success: true,
      message: 'All changes successfully published and saved to permanent code & cloud storage across all devices.',
      updatedCount,
      images,
      customizations,
    });
  } catch (err: any) {
    console.error('Error publishing changes:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to publish changes' });
  }
});

/**
 * GET /api/circle-customizations
 */
app.get('/api/circle-customizations', (req, res) => {
  return res.json({ success: true, customizations: getStoredCircleCustomizations() });
});

/**
 * POST /api/circle-customizations
 */
app.post('/api/circle-customizations', (req, res) => {
  try {
    const { circleId, updates, allCustomizations } = req.body;
    const current = getStoredCircleCustomizations();

    if (allCustomizations && typeof allCustomizations === 'object') {
      const merged = { ...current, ...allCustomizations };
      saveStoredCircleCustomizations(merged);
      return res.json({ success: true, customizations: merged });
    }

    if (circleId && updates) {
      const plainId = circleId.replace(/^pg-/, '');
      const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;
      const payload = {
        ...(current[circleId] || current[plainId] || current[prefixedId] || {}),
        ...updates,
        updatedAt: Date.now(),
      };
      current[circleId] = payload;
      current[plainId] = payload;
      current[prefixedId] = payload;
      saveStoredCircleCustomizations(current);

      const targetUrl = updates.videoUrl || updates.imageUrl;
      if (targetUrl) {
        syncImageToPlaygroundData(circleId, targetUrl);
      }
      if (updates.title) {
        persistCircleCustomizationToSourceCode(circleId, updates);
      }

      return res.json({ success: true, customizations: current });
    }

    return res.status(400).json({ success: false, error: 'Missing circleId/updates or allCustomizations' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Error saving circle customization' });
  }
});

/**
 * DELETE /api/circle-customizations/:circleId
 */
app.delete('/api/circle-customizations/:circleId', (req, res) => {
  try {
    const { circleId } = req.params;
    const current = getStoredCircleCustomizations();
    delete current[circleId];
    delete current[circleId.replace(/^pg-/, '')];
    saveStoredCircleCustomizations(current);
    return res.json({ success: true, customizations: current });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete circle customization' });
  }
});

/**
 * DELETE /api/circle-customizations
 */
app.delete('/api/circle-customizations', (req, res) => {
  try {
    saveStoredCircleCustomizations({});
    return res.json({ success: true, message: 'All circle customizations reset' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to reset circle customizations' });
  }
});

/**
 * GET /api/removed-circles
 */
app.get('/api/removed-circles', (req, res) => {
  return res.json({ success: true, removedCircleIds: getStoredRemovedCircles() });
});

/**
 * POST /api/removed-circles
 */
app.post('/api/removed-circles', (req, res) => {
  try {
    const { circleId, removedCircleIds } = req.body;
    let current = getStoredRemovedCircles();

    if (Array.isArray(removedCircleIds)) {
      current = removedCircleIds;
    } else if (circleId && typeof circleId === 'string') {
      const plainId = circleId.replace(/^pg-/, '');
      const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;
      for (const id of [circleId, plainId, prefixedId]) {
        if (!current.includes(id)) {
          current.push(id);
        }
      }
    }

    saveStoredRemovedCircles(current);
    return res.json({ success: true, removedCircleIds: current });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Error saving removed circle' });
  }
});

/**
 * DELETE /api/removed-circles/:circleId (restore single circle)
 */
app.delete('/api/removed-circles/:circleId', (req, res) => {
  try {
    const { circleId } = req.params;
    const plainId = circleId.replace(/^pg-/, '');
    const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;
    let current = getStoredRemovedCircles();
    current = current.filter((id) => id !== circleId && id !== plainId && id !== prefixedId);
    saveStoredRemovedCircles(current);
    return res.json({ success: true, removedCircleIds: current });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to restore circle' });
  }
});

/**
 * DELETE /api/removed-circles (restore all circles)
 */
app.delete('/api/removed-circles', (req, res) => {
  try {
    saveStoredRemovedCircles([]);
    return res.json({ success: true, removedCircleIds: [], message: 'All circles restored' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to restore all circles' });
  }
});

/**
 * GET /api/custom-projects
 */
app.get('/api/custom-projects', (req, res) => {
  return res.json({ success: true, customProjects: getStoredCustomProjects() });
});

/**
 * POST /api/custom-projects
 */
app.post('/api/custom-projects', (req, res) => {
  try {
    const { project, customProjects } = req.body;
    let current = getStoredCustomProjects();

    if (Array.isArray(customProjects)) {
      current = customProjects;
    } else if (project && project.id) {
      current = [project, ...current.filter((p) => p.id !== project.id)];
    }

    saveStoredCustomProjects(current);
    return res.json({ success: true, customProjects: current });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Error saving custom project' });
  }
});

/**
 * DELETE /api/custom-projects/:projectId
 */
app.delete('/api/custom-projects/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    let current = getStoredCustomProjects();
    current = current.filter((p) => p.id !== projectId);
    saveStoredCustomProjects(current);
    return res.json({ success: true, customProjects: current });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete custom project' });
  }
});

/**
 * Proxy external image requests (e.g. Google Drive CDN) to avoid client-side CORS or 403 errors
 */
app.get('/api/proxy-image', async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send('Missing url parameter');
    }

    const resolved = resolveMediaUrl(rawUrl);
    let parsed: URL;
    try {
      parsed = new URL(resolved);
    } catch {
      return res.status(400).send('Invalid url format');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Only http and https protocols supported');
    }

    const upstreamRes = await fetch(resolved, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send(`Upstream error: ${upstreamRes.statusText}`);
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('Proxy image error:', err);
    return res.status(500).send('Failed to proxy image');
  }
});

// ================= CLOUDFLARE R2 & MEDIA MANAGEMENT ROUTES =================

const r2MemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max
  },
});

/**
 * GET /api/r2/status
 * Returns Cloudflare R2 configuration status and active storage mode
 */
app.get('/api/r2/status', (req, res) => {
  const configured = isR2Configured();
  const config = getR2Config();

  return res.json({
    success: true,
    configured,
    mode: configured ? 'cloudflare-r2' : 'local-storage',
    bucketName: configured ? config.bucketName : undefined,
    publicDomain: configured ? (config.publicDomain || `https://${config.bucketName}.r2.dev`) : undefined,
    hasAccountId: Boolean(config.accountId),
    hasAccessKey: Boolean(config.accessKeyId),
    hasSecretKey: Boolean(config.secretAccessKey),
    message: configured
      ? `Cloudflare R2 is configured and active. Media is permanently stored in bucket "${config.bucketName}".`
      : 'Cloudflare R2 is not configured yet. Using local disk fallback storage. Add R2 credentials to .env to activate.',
  });
});

/**
 * Admin Authentication Middleware
 * Enforces admin authorization with master passcode (503649)
 */
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const passcode = (req.headers['x-admin-passcode'] as string) || (req.query.passcode as string) || (req.body?.passcode as string);
  if (passcode === '503649') {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Unauthorized: Master admin passcode required' });
}

/**
 * Sync all videos from Solediton folder in Cloudflare R2 bucket to Soledition circle
 */
async function syncSoleditionBucketFolder(): Promise<{ count: number; videos: string[]; cover: string }> {
  if (!isR2Configured()) {
    return { count: 0, videos: [], cover: '' };
  }
  try {
    const listResult = await listR2Objects();
    if (!listResult.success || !listResult.objects) {
      return { count: 0, videos: [], cover: '' };
    }

    // Filter all video objects in Solediton or soledition folder
    const soleditionVideos = listResult.objects.filter(
      (obj) => obj.isVideo && (obj.key.toLowerCase().includes('soledition') || obj.key.toLowerCase().includes('solediton'))
    );

    if (soleditionVideos.length === 0) {
      return { count: 0, videos: [], cover: '' };
    }

    // Sort newest/highest timestamp first
    soleditionVideos.sort((a, b) => b.key.localeCompare(a.key));

    const library = getStoredMediaLibrary();
    const existingKeys = new Set(library.map((m) => m.r2Key));
    let added = 0;

    for (let idx = 0; idx < soleditionVideos.length; idx++) {
      const obj = soleditionVideos[idx];
      if (!existingKeys.has(obj.key)) {
        library.push({
          id: `soledition-${idx + 1}`,
          r2Key: obj.key,
          url: obj.url,
          filename: obj.filename,
          mediaType: 'video',
          contentType: obj.contentType || 'video/mp4',
          size: obj.size,
          category: 'Campaigns & Festivals',
          circleId: 'pg-soledition',
          isCover: idx === 0,
          displayOrder: idx + 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        existingKeys.add(obj.key);
        added++;
      }
    }

    if (added > 0) {
      saveStoredMediaLibrary(library);
    }

    // Update circle customizations for soledition & pg-soledition
    const videoUrls = soleditionVideos.map((v) => v.url);
    const topVideo = videoUrls[0];
    const customizations = getStoredCircleCustomizations();

    for (const cid of ['soledition', 'pg-soledition']) {
      const current = customizations[cid] || {};
      customizations[cid] = {
        ...current,
        title: 'SOLEDITION',
        gallery: videoUrls,
        imageUrl: topVideo,
        videoUrl: topVideo,
        mediaType: 'video',
        updatedAt: Date.now(),
      };
    }
    saveStoredCircleCustomizations(customizations);

    // Update project images
    const projectImages = getStoredProjectImages();
    projectImages['soledition'] = topVideo;
    projectImages['pg-soledition'] = topVideo;
    saveStoredProjectImages(projectImages);
    syncImageToPortfolioData('soledition', topVideo);
    syncImageToPortfolioData('pg-soledition', topVideo);

    console.log(`[R2 Auto-Sync] Synced ${videoUrls.length} Soledition videos from Cloudflare R2 bucket to portfolio.`);
    return { count: videoUrls.length, videos: videoUrls, cover: topVideo };
  } catch (err: any) {
    console.warn('[R2 Auto-Sync] Error syncing Soledition videos:', err);
    return { count: 0, videos: [], cover: '' };
  }
}

/**
 * GET /api/r2/bucket-objects
 * Lists all objects from the Cloudflare R2 bucket using S3 ListObjectsV2 API with pagination
 */
app.get('/api/r2/bucket-objects', async (req, res) => {
  try {
    if (!isR2Configured()) {
      return res.status(400).json({
        success: false,
        configured: false,
        error: 'Cloudflare R2 is not configured. Check environment variables.',
      });
    }

    const prefix = req.query.prefix as string;
    const continuationToken = req.query.continuationToken as string;
    const maxKeys = req.query.maxKeys ? parseInt(req.query.maxKeys as string, 10) : 500;
    const delimiter = req.query.delimiter as string;

    const result = await listR2Objects({
      prefix,
      continuationToken,
      maxKeys,
      delimiter,
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    const library = getStoredMediaLibrary();
    const importedMap = new Map(library.map((m) => [m.r2Key, m]));

    const enrichedObjects = result.objects.map((obj) => ({
      ...obj,
      isImported: importedMap.has(obj.key),
      importedItem: importedMap.get(obj.key) || null,
    }));

    return res.json({
      ...result,
      objects: enrichedObjects,
      importedCount: library.length,
    });
  } catch (err: any) {
    console.error('List bucket objects error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to list bucket objects' });
  }
});

/**
 * GET /api/r2/media-library
 * Retrieves all persistent media library items
 */
app.get('/api/r2/media-library', (req, res) => {
  try {
    const library = getStoredMediaLibrary();
    library.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    return res.json({
      success: true,
      items: library,
      total: library.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve media library' });
  }
});

/**
 * POST /api/r2/import-objects
 * Imports selected R2 bucket objects into the persistent portfolio database
 * Strictly prevents duplicates using r2Key as unique identifier
 */
app.post('/api/r2/import-objects', requireAdminAuth, (req, res) => {
  try {
    const { items, category, circleId, makeCover } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items provided for import' });
    }

    const currentLibrary = getStoredMediaLibrary();
    const existingKeys = new Set(currentLibrary.map((i) => i.r2Key));
    const importedNow: MediaLibraryRecord[] = [];
    const skippedKeys: string[] = [];

    const defaultCategory = category || 'Campaigns & Festivals';
    let maxOrder = currentLibrary.reduce((max, i) => Math.max(max, i.displayOrder || 0), 0);

    for (const item of items) {
      const key = item.key;
      if (!key) continue;

      if (existingKeys.has(key)) {
        skippedKeys.push(key);
        continue;
      }

      maxOrder += 1;
      const cleanKey = key.replace(/^\/+/, '');
      const segments = cleanKey.split('/');
      const filename = item.filename || segments.pop() || cleanKey;
      const url = item.url || getR2PublicUrl(cleanKey);
      const isVid = item.isVideo !== undefined ? item.isVideo : isVideoUrl(cleanKey);

      const record: MediaLibraryRecord = {
        id: `r2-${Buffer.from(cleanKey).toString('hex').slice(0, 16)}-${Date.now()}`,
        r2Key: cleanKey,
        url,
        filename,
        mediaType: isVid ? 'video' : 'image',
        contentType: item.contentType,
        size: item.size,
        category: item.category || defaultCategory,
        circleId: item.circleId || circleId || (cleanKey.toLowerCase().includes('soledition') ? 'pg-soledition' : undefined),
        isCover: Boolean(item.isCover || (makeCover && importedNow.length === 0)),
        displayOrder: maxOrder,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      currentLibrary.push(record);
      existingKeys.add(cleanKey);
      importedNow.push(record);
    }

    saveStoredMediaLibrary(currentLibrary);

    // Sync circle customizations and project images if circleId or soledition is assigned
    const targetCircleId = circleId || (items.some((i: any) => (i.key || '').toLowerCase().includes('soledition')) ? 'pg-soledition' : null);
    if (targetCircleId) {
      const circleItems = currentLibrary.filter((m) => m.circleId === targetCircleId || (targetCircleId.includes('soledition') && m.r2Key.toLowerCase().includes('soledition')));
      const circleUrls = circleItems.map((m) => m.url);
      const plainId = targetCircleId.replace(/^pg-/, '');
      const prefixedId = targetCircleId.startsWith('pg-') ? targetCircleId : `pg-${targetCircleId}`;

      const customizations = getStoredCircleCustomizations();
      const current = customizations[targetCircleId] || customizations[plainId] || customizations[prefixedId] || {};
      const mergedGallery = Array.from(new Set([...circleUrls, ...(current.gallery || [])]));

      const coverRecord = circleItems.find((m) => m.isCover) || circleItems[0];
      const coverUrl = coverRecord ? coverRecord.url : (current.imageUrl || mergedGallery[0]);
      const isCoverVid = isVideoUrl(coverUrl);

      const updatedPayload = {
        ...current,
        gallery: mergedGallery,
        imageUrl: coverUrl,
        videoUrl: isCoverVid ? coverUrl : undefined,
        mediaType: isCoverVid ? 'video' : 'image',
        updatedAt: Date.now(),
      };

      customizations[targetCircleId] = updatedPayload;
      customizations[plainId] = updatedPayload;
      customizations[prefixedId] = updatedPayload;
      saveStoredCircleCustomizations(customizations);

      if (coverUrl) {
        const overrides = getStoredProjectImages();
        overrides[targetCircleId] = coverUrl;
        overrides[plainId] = coverUrl;
        overrides[prefixedId] = coverUrl;
        saveStoredProjectImages(overrides);
        syncImageToPortfolioData(targetCircleId, coverUrl);
      }
    }

    return res.json({
      success: true,
      importedCount: importedNow.length,
      skippedCount: skippedKeys.length,
      importedItems: importedNow,
      skippedKeys,
      message: `Successfully imported ${importedNow.length} items (${skippedKeys.length} duplicates skipped).`,
    });
  } catch (err: any) {
    console.error('Import objects error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Import failed' });
  }
});

/**
 * POST /api/r2/bulk-upload
 * Bulk upload multiple images and videos to Cloudflare R2 concurrently
 */
const bulkUploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max per file
    files: 100,
  },
}).array('files', 100);

app.post('/api/r2/bulk-upload', requireAdminAuth, (req, res) => {
  bulkUploadMulter(req as any, res as any, async (err: any) => {
    if (err) {
      console.error('Bulk upload multer error:', err);
      return res.status(400).json({ success: false, error: err.message || 'Upload failed' });
    }

    const files = (req as any).files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided for upload' });
    }

    const { folder, category, circleId, addToCircleGallery, setCover } = req.body;
    const defaultFolder = (folder || 'uploads').replace(/^\/+|\/+$/g, '');
    const targetCategory = category || 'Campaigns & Festivals';

    const uploadedResults: MediaLibraryRecord[] = [];
    const failedResults: { filename: string; error: string }[] = [];
    const library = getStoredMediaLibrary();
    let maxOrder = library.reduce((max, i) => Math.max(max, i.displayOrder || 0), 0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const cleanName = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
        const ext = path.extname(cleanName).toLowerCase();
        const base = path.basename(cleanName, ext).slice(0, 40) || 'media';
        const isVideo = isVideoUrl(cleanName) || file.mimetype.startsWith('video/');
        const subfolder = defaultFolder || (isVideo ? 'videos' : 'images');
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        const key = `${subfolder}/${base}-${uniqueSuffix}${ext || (isVideo ? '.mp4' : '.webp')}`;

        let publicUrl = '';
        if (isR2Configured()) {
          const r2Res = await uploadBufferToR2(
            file.buffer,
            key,
            file.mimetype || (isVideo ? 'video/mp4' : 'image/webp')
          );
          if (r2Res.success && r2Res.url) {
            publicUrl = r2Res.url;
          }
        }

        // Local fallback
        if (!publicUrl) {
          const targetDir = isVideo ? VIDEOS_DIR : IMAGES_DIR;
          const localFilename = `${base}-${uniqueSuffix}${ext || (isVideo ? '.mp4' : '.webp')}`;
          fs.writeFileSync(path.join(targetDir, localFilename), file.buffer);
          publicUrl = `/uploads/${isVideo ? 'videos' : 'images'}/${localFilename}`;
        }

        maxOrder += 1;
        const mediaRecord: MediaLibraryRecord = {
          id: `r2-${Buffer.from(key).toString('hex').slice(0, 16)}-${Date.now()}`,
          r2Key: key,
          url: publicUrl,
          filename: file.originalname,
          mediaType: isVideo ? 'video' : 'image',
          contentType: file.mimetype,
          size: file.size,
          category: targetCategory,
          circleId: circleId || undefined,
          isCover: Boolean(setCover === 'true' && i === 0),
          displayOrder: maxOrder,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        library.push(mediaRecord);
        uploadedResults.push(mediaRecord);
      } catch (fileErr: any) {
        console.error('File upload failed in batch:', file.originalname, fileErr);
        failedResults.push({ filename: file.originalname, error: fileErr.message });
      }
    }

    saveStoredMediaLibrary(library);

    // If circleId was supplied and addToCircleGallery is true
    if (circleId && (addToCircleGallery === 'true' || addToCircleGallery === true) && uploadedResults.length > 0) {
      const plainId = circleId.replace(/^pg-/, '');
      const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;
      const customizations = getStoredCircleCustomizations();
      const current = customizations[circleId] || customizations[plainId] || customizations[prefixedId] || {};
      const newUrls = uploadedResults.map((r) => r.url);
      const updatedGallery = Array.from(new Set([...newUrls, ...(current.gallery || [])]));

      const targetCover = setCover === 'true' ? newUrls[0] : (current.imageUrl || updatedGallery[0]);
      const isCoverVid = isVideoUrl(targetCover);

      const payload = {
        ...current,
        gallery: updatedGallery,
        imageUrl: targetCover,
        videoUrl: isCoverVid ? targetCover : undefined,
        mediaType: isCoverVid ? 'video' : 'image',
        updatedAt: Date.now(),
      };
      customizations[circleId] = payload;
      customizations[plainId] = payload;
      customizations[prefixedId] = payload;
      saveStoredCircleCustomizations(customizations);

      if (setCover === 'true') {
        const overrides = getStoredProjectImages();
        overrides[circleId] = targetCover;
        overrides[plainId] = targetCover;
        overrides[prefixedId] = targetCover;
        saveStoredProjectImages(overrides);
        syncImageToPortfolioData(circleId, targetCover);
      }
    }

    return res.json({
      success: true,
      uploadedCount: uploadedResults.length,
      failedCount: failedResults.length,
      uploaded: uploadedResults,
      failed: failedResults,
      message: `Uploaded ${uploadedResults.length} files successfully${failedResults.length ? ` (${failedResults.length} failed)` : ''}`,
    });
  });
});

/**
 * POST /api/r2/update-media
 * Updates category, title, circleId, isCover, or order of a media item
 */
app.post('/api/r2/update-media', requireAdminAuth, (req, res) => {
  try {
    const { id, updates } = req.body;
    if (!id || !updates) {
      return res.status(400).json({ success: false, error: 'Missing id or updates payload' });
    }

    const library = getStoredMediaLibrary();
    const item = library.find((m) => m.id === id || m.r2Key === id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Media item not found' });
    }

    Object.assign(item, updates, { updatedAt: Date.now() });
    saveStoredMediaLibrary(library);

    return res.json({ success: true, item });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Update failed' });
  }
});

/**
 * POST /api/r2/reorder-media
 * Reorders media items in the persistent library
 */
app.post('/api/r2/reorder-media', requireAdminAuth, (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'Missing orderedIds array' });
    }

    const library = getStoredMediaLibrary();
    const orderMap = new Map<string, number>();
    orderedIds.forEach((id: string, idx: number) => {
      orderMap.set(id, idx + 1);
    });

    for (const item of library) {
      if (orderMap.has(item.id)) {
        item.displayOrder = orderMap.get(item.id)!;
      } else if (orderMap.has(item.r2Key)) {
        item.displayOrder = orderMap.get(item.r2Key)!;
      }
    }

    library.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    saveStoredMediaLibrary(library);

    return res.json({ success: true, message: 'Media library reordered successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Reorder failed' });
  }
});

/**
 * POST /api/r2/delete-media
 * Removes media from portfolio entries.
 * IMPORTANT (Requirement 16): Does NOT delete from Cloudflare R2 bucket unless deleteFromR2 is explicitly true!
 */
app.post('/api/r2/delete-media', requireAdminAuth, async (req, res) => {
  try {
    const { ids, urls, r2Keys, deleteFromR2 } = req.body;
    const targetIds = new Set<string>(Array.isArray(ids) ? ids : []);
    const targetUrls = new Set<string>(Array.isArray(urls) ? urls : []);
    const targetKeys = new Set<string>(Array.isArray(r2Keys) ? r2Keys : []);

    const library = getStoredMediaLibrary();
    const toRemove = library.filter((m) => targetIds.has(m.id) || targetUrls.has(m.url) || targetKeys.has(m.r2Key));
    const remaining = library.filter((m) => !targetIds.has(m.id) && !targetUrls.has(m.url) && !targetKeys.has(m.r2Key));
    saveStoredMediaLibrary(remaining);

    // If deleteFromR2 is explicitly requested, delete from R2 bucket
    let deletedFromR2Count = 0;
    if (deleteFromR2 === true && isR2Configured()) {
      for (const item of toRemove) {
        try {
          await deleteR2Object(item.r2Key || item.url);
          deletedFromR2Count++;
        } catch (_) {}
      }
    }

    // Clean removed URLs from circle customizations
    const removedUrls = new Set(toRemove.map((m) => m.url));
    targetUrls.forEach((u) => removedUrls.add(u));

    const customizations = getStoredCircleCustomizations();
    let modifiedCustomizations = false;

    for (const [cId, circle] of Object.entries(customizations)) {
      if (!circle || typeof circle !== 'object') continue;
      if (Array.isArray(circle.gallery)) {
        const filtered = circle.gallery.filter((u: string) => !removedUrls.has(u));
        if (filtered.length !== circle.gallery.length) {
          circle.gallery = filtered;
          modifiedCustomizations = true;
          if (removedUrls.has(circle.imageUrl)) {
            circle.imageUrl = filtered[0] || '';
          }
          if (removedUrls.has(circle.videoUrl)) {
            circle.videoUrl = filtered.find((u: string) => isVideoUrl(u)) || undefined;
          }
        }
      }
    }

    if (modifiedCustomizations) {
      saveStoredCircleCustomizations(customizations);
    }

    return res.json({
      success: true,
      removedFromPortfolioCount: toRemove.length,
      deletedFromR2Count,
      deleteFromR2: Boolean(deleteFromR2),
      message: `Removed ${toRemove.length} items from portfolio${deleteFromR2 ? ` (and deleted ${deletedFromR2Count} from R2 bucket)` : ' (R2 bucket objects preserved)'}.`,
    });
  } catch (err: any) {
    console.error('Delete media error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Delete failed' });
  }
});

/**
 * POST /api/r2/sync-soledition
 * Sync all videos from Solediton folder in Cloudflare R2 bucket to Soledition circle
 */
app.post('/api/r2/sync-soledition', async (req, res) => {
  try {
    const result = await syncSoleditionBucketFolder();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Sync failed' });
  }
});

/**
 * POST /api/r2/presign
 * Generates secure presigned PUT URL for direct client-to-R2 upload
 */
app.post('/api/r2/presign', async (req, res) => {
  try {
    const { filename, contentType, folder, projectId } = req.body;
    if (!filename || !contentType) {
      return res.status(400).json({ success: false, error: 'Missing filename or contentType' });
    }

    if (!isR2Configured()) {
      return res.status(200).json({
        success: false,
        configured: false,
        fallbackToLocal: true,
        message: 'Cloudflare R2 is not configured. Falling back to backend upload route.',
      });
    }

    const cleanFilename = (filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(cleanFilename).toLowerCase();
    const base = path.basename(cleanFilename, ext).slice(0, 40) || 'media';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const subfolder = folder || (isVideoUrl(cleanFilename) || contentType.startsWith('video/') ? 'videos' : 'images');
    const key = `${subfolder}/${base}-${uniqueSuffix}${ext}`;

    const presigned = await generatePresignedUploadUrl(key, contentType, 3600);
    if (!presigned.success) {
      return res.status(500).json({ success: false, error: presigned.error });
    }

    return res.json({
      success: true,
      configured: true,
      presignedUrl: presigned.presignedUrl,
      publicUrl: presigned.publicUrl,
      key: presigned.key,
      projectId,
    });
  } catch (err: any) {
    console.error('Presign URL generation error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Presign failed' });
  }
});

/**
 * POST /api/r2/upload
 * Secure direct upload to Cloudflare R2 (with graceful local fallback if credentials are not configured)
 */
app.post('/api/r2/upload', r2MemoryUpload.single('file') as any, async (req: any, res: any) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file received' });
    }

    const { projectId, circleId, addToGallery, setAsCover, customTitle } = req.body;
    const targetId = projectId || circleId;
    const shouldAddToGallery = addToGallery === 'true' || addToGallery === true;
    const shouldSetCover = setAsCover === 'true' || setAsCover === true || (!shouldAddToGallery && setAsCover !== 'false');

    const cleanFilename = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    let ext = path.extname(cleanFilename).toLowerCase();
    const isVideo = isVideoUrl(cleanFilename) || file.mimetype.startsWith('video/');
    if (!ext || ext === '.') {
      ext = isVideo ? '.mp4' : '.webp';
    }
    const base = path.basename(cleanFilename, ext).slice(0, 40) || 'media';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const subfolder = isVideo ? 'videos' : 'images';
    const key = `${subfolder}/${base}-${uniqueSuffix}${ext}`;

    let publicUrl = '';
    let storageType: 'cloudflare-r2' | 'local-storage' = 'local-storage';

    if (isR2Configured()) {
      // 1. Upload to Cloudflare R2
      const r2Result = await uploadBufferToR2(file.buffer, key, file.mimetype);
      if (r2Result.success && r2Result.url) {
        publicUrl = r2Result.url;
        storageType = 'cloudflare-r2';
      } else {
        console.warn('R2 upload failed, falling back to local storage:', r2Result.error);
      }
    }

    // 2. If R2 is not configured or failed, save locally
    if (!publicUrl) {
      const targetDir = isVideo ? VIDEOS_DIR : IMAGES_DIR;
      const localFilename = `${base}-${uniqueSuffix}${ext}`;
      const localDiskPath = path.join(targetDir, localFilename);
      fs.writeFileSync(localDiskPath, file.buffer);
      publicUrl = `/uploads/${subfolder}/${localFilename}`;
      storageType = 'local-storage';
    }

    // 3. Persist metadata in circle customizations & project images database
    if (targetId) {
      const plainId = targetId.replace(/^pg-/, '');
      const prefixedId = targetId.startsWith('pg-') ? targetId : `pg-${targetId}`;
      const customizations = getStoredCircleCustomizations();
      const current = customizations[targetId] || customizations[plainId] || customizations[prefixedId] || {};
      let currentGallery: string[] = current.gallery ? [...current.gallery] : [];

      if (shouldAddToGallery || targetId.startsWith('pg-')) {
        currentGallery = [publicUrl, ...currentGallery.filter((u: string) => u !== publicUrl)];
      }

      const effectiveCover = shouldSetCover ? publicUrl : (current.imageUrl || publicUrl);
      const isCoverVideo = isVideoUrl(effectiveCover);

      const updatedPayload = {
        ...current,
        gallery: currentGallery,
        imageUrl: effectiveCover,
        videoUrl: isCoverVideo ? effectiveCover : undefined,
        mediaType: isCoverVideo ? 'video' : 'image',
        ...(customTitle ? { title: customTitle } : {}),
        updatedAt: Date.now(),
      };

      customizations[targetId] = updatedPayload;
      customizations[plainId] = updatedPayload;
      customizations[prefixedId] = updatedPayload;
      saveStoredCircleCustomizations(customizations);

      if (shouldSetCover) {
        const overrides = getStoredProjectImages();
        overrides[targetId] = effectiveCover;
        overrides[plainId] = effectiveCover;
        overrides[prefixedId] = effectiveCover;
        saveStoredProjectImages(overrides);
        syncImageToPortfolioData(targetId, effectiveCover);
      }
    }

    return res.status(200).json({
      success: true,
      url: publicUrl,
      key,
      storage: storageType,
      size: file.size,
      mimetype: file.mimetype,
      filename: file.originalname,
      isVideo,
      uploadedAt: Date.now(),
    });
  } catch (err: any) {
    console.error('R2 upload error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Upload failed' });
  }
});

/**
 * POST /api/r2/delete
 * Deletes media from Cloudflare R2 and/or local storage, and cleans up database records
 */
app.post('/api/r2/delete', async (req, res) => {
  try {
    const { url, key, circleId } = req.body;
    if (!url && !key) {
      return res.status(400).json({ success: false, error: 'Missing url or key to delete' });
    }

    const targetUrl = url || '';
    let deletedFromR2 = false;
    let deletedFromLocal = false;

    // Delete from R2 if it's an R2 URL or key
    if (isR2Configured() && (key || targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
      const deleteResult = await deleteR2Object(key || targetUrl);
      deletedFromR2 = deleteResult.success;
    }

    // Delete from local disk if it's a local /uploads/ URL
    if (targetUrl.startsWith('/uploads/')) {
      const filename = path.basename(targetUrl);
      const localPath = targetUrl.includes('/videos/')
        ? path.join(VIDEOS_DIR, filename)
        : path.join(IMAGES_DIR, filename);

      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
          deletedFromLocal = true;
        } catch (_) {}
      }
    }

    // Remove from circle customizations if circleId is provided
    let updatedGallery: string[] = [];
    let newThumbnail = '';

    if (circleId && targetUrl) {
      const plainId = circleId.replace(/^pg-/, '');
      const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;
      const customizations = getStoredCircleCustomizations();
      const current = customizations[circleId] || customizations[plainId] || customizations[prefixedId] || {};

      const currentGallery = current.gallery || [];
      updatedGallery = currentGallery.filter((u: string) => u !== targetUrl);

      newThumbnail = current.imageUrl;
      let didChangeThumbnail = false;
      if (current.imageUrl === targetUrl || current.videoUrl === targetUrl) {
        newThumbnail = updatedGallery[0] || '';
        didChangeThumbnail = true;
      }

      const isNewThumbVid = isVideoUrl(newThumbnail);
      const payload = {
        ...current,
        gallery: updatedGallery,
        ...(didChangeThumbnail ? {
          imageUrl: newThumbnail,
          videoUrl: isNewThumbVid ? newThumbnail : undefined,
          mediaType: isNewThumbVid ? 'video' : 'image',
        } : {}),
        updatedAt: Date.now(),
      };

      customizations[circleId] = payload;
      customizations[plainId] = payload;
      customizations[prefixedId] = payload;
      saveStoredCircleCustomizations(customizations);

      if (didChangeThumbnail) {
        const overrides = getStoredProjectImages();
        overrides[circleId] = newThumbnail;
        overrides[plainId] = newThumbnail;
        overrides[prefixedId] = newThumbnail;
        saveStoredProjectImages(overrides);
        syncImageToPortfolioData(circleId, newThumbnail);
      }
    }

    return res.json({
      success: true,
      deletedFromR2,
      deletedFromLocal,
      gallery: updatedGallery,
      thumbnail: newThumbnail,
    });
  } catch (err: any) {
    console.error('Delete media error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Delete failed' });
  }
});

/**
 * POST /api/r2/reorder-gallery
 * Permanently saves the updated gallery order, cover selection, and metadata in the database
 */
app.post('/api/r2/reorder-gallery', (req, res) => {
  try {
    const { circleId, gallery, coverUrl, mediaType, title } = req.body;
    if (!circleId || !Array.isArray(gallery)) {
      return res.status(400).json({ success: false, error: 'Missing circleId or gallery array' });
    }

    const plainId = circleId.replace(/^pg-/, '');
    const prefixedId = circleId.startsWith('pg-') ? circleId : `pg-${circleId}`;

    const customizations = getStoredCircleCustomizations();
    const current = customizations[circleId] || customizations[plainId] || customizations[prefixedId] || {};

    const targetCover = coverUrl || gallery[0] || current.imageUrl || '';
    const isCoverVid = mediaType === 'video' || isVideoUrl(targetCover);

    const payload = {
      ...current,
      gallery,
      imageUrl: targetCover,
      videoUrl: isCoverVid ? targetCover : undefined,
      mediaType: isCoverVid ? 'video' : 'image',
      ...(title ? { title } : {}),
      updatedAt: Date.now(),
    };

    customizations[circleId] = payload;
    customizations[plainId] = payload;
    customizations[prefixedId] = payload;
    saveStoredCircleCustomizations(customizations);

    if (targetCover) {
      const overrides = getStoredProjectImages();
      overrides[circleId] = targetCover;
      overrides[plainId] = targetCover;
      overrides[prefixedId] = targetCover;
      saveStoredProjectImages(overrides);
      syncImageToPortfolioData(circleId, targetCover);
    }

    return res.json({
      success: true,
      message: `Persisted ${gallery.length} items for ${circleId} in database`,
      gallery,
      coverUrl: targetCover,
      mediaType: isCoverVid ? 'video' : 'image',
    });
  } catch (err: any) {
    console.error('Reorder gallery error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to reorder gallery' });
  }
});

/**
 * POST /api/r2/migrate-existing
 * Migrates local uploads in /uploads/ to Cloudflare R2 and updates all database references
 */
app.post('/api/r2/migrate-existing', async (req, res) => {
  try {
    if (!isR2Configured()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot migrate: Cloudflare R2 credentials are not configured in environment variables.',
      });
    }

    const migrated: { oldUrl: string; newUrl: string }[] = [];
    const urlMap = new Map<string, string>();

    // 1. Migrate videos
    if (fs.existsSync(VIDEOS_DIR)) {
      const videoFiles = fs.readdirSync(VIDEOS_DIR).filter((f) => !f.startsWith('.'));
      for (const file of videoFiles) {
        const filePath = path.join(VIDEOS_DIR, file);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(file).toLowerCase();
        const contentType = ext === '.webm' ? 'video/webm' : 'video/mp4';
        const key = `videos/${file}`;

        const uploadResult = await uploadBufferToR2(buffer, key, contentType);
        if (uploadResult.success && uploadResult.url) {
          const oldUrl = `/uploads/videos/${file}`;
          migrated.push({ oldUrl, newUrl: uploadResult.url });
          urlMap.set(oldUrl, uploadResult.url);
        }
      }
    }

    // 2. Migrate images
    if (fs.existsSync(IMAGES_DIR)) {
      const imageFiles = fs.readdirSync(IMAGES_DIR).filter((f) => !f.startsWith('.'));
      for (const file of imageFiles) {
        const filePath = path.join(IMAGES_DIR, file);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(file).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/webp';
        const key = `images/${file}`;

        const uploadResult = await uploadBufferToR2(buffer, key, contentType);
        if (uploadResult.success && uploadResult.url) {
          const oldUrl = `/uploads/images/${file}`;
          migrated.push({ oldUrl, newUrl: uploadResult.url });
          urlMap.set(oldUrl, uploadResult.url);
        }
      }
    }

    // 3. Update circle customizations
    const customizations = getStoredCircleCustomizations();
    let circleModified = false;
    for (const [key, item] of Object.entries(customizations)) {
      if (!item || typeof item !== 'object') continue;

      if (item.imageUrl && urlMap.has(item.imageUrl)) {
        item.imageUrl = urlMap.get(item.imageUrl);
        circleModified = true;
      }
      if (item.videoUrl && urlMap.has(item.videoUrl)) {
        item.videoUrl = urlMap.get(item.videoUrl);
        circleModified = true;
      }
      if (Array.isArray(item.gallery)) {
        const newGallery = item.gallery.map((u: string) => urlMap.get(u) || u);
        if (JSON.stringify(newGallery) !== JSON.stringify(item.gallery)) {
          item.gallery = newGallery;
          circleModified = true;
        }
      }
    }
    if (circleModified) {
      saveStoredCircleCustomizations(customizations);
    }

    // 4. Update project images
    const projectImages = getStoredProjectImages();
    let projectImagesModified = false;
    for (const [k, u] of Object.entries(projectImages)) {
      if (urlMap.has(u)) {
        projectImages[k] = urlMap.get(u)!;
        projectImagesModified = true;
      }
    }
    if (projectImagesModified) {
      saveStoredProjectImages(projectImages);
    }

    return res.json({
      success: true,
      migratedCount: migrated.length,
      migrated,
      message: `Successfully migrated ${migrated.length} media files to Cloudflare R2`,
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Migration failed' });
  }
});

// ================= FRONTEND / VITE INTEGRATION =================

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    // Fallback for HTML5 SPA routing in dev mode
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.startsWith('/uploads') || url.startsWith('/videos')) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        if (vite) {
          vite.ssrFixStacktrace(e as Error);
        }
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
    // Automatically ensure Soledition Cloudflare R2 videos are synced into portfolio database
    syncSoleditionBucketFolder().catch((e) => console.warn('Startup Soledition sync error:', e));
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
