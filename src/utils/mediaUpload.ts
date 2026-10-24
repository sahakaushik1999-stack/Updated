/**
 * Media Upload & Server Video Management Utility
 * Facilitates direct video uploads to the Express server, tracking progress,
 * and listing stored videos.
 */

export interface ServerVideoItem {
  filename: string;
  url: string;
  size: number;
  createdAt: number;
}

export interface UploadVideoResult {
  success: boolean;
  url: string;
  filename: string;
  size: number;
  mimetype?: string;
  error?: string;
}

/**
 * Checks if a URL or filename represents a video asset
 */
export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  
  // Direct file extensions or video formats (even with query params or hashes)
  if (
    clean.includes('.mp4') ||
    clean.includes('.webm') ||
    clean.includes('.mov') ||
    clean.includes('.ogg') ||
    clean.includes('.m4v') ||
    clean.includes('.avi') ||
    clean.includes('.mkv') ||
    clean.includes('/uploads/videos/') ||
    clean.startsWith('data:video/') ||
    clean.startsWith('blob:')
  ) {
    return true;
  }

  // YouTube links
  if (
    clean.includes('youtube.com/watch') ||
    clean.includes('youtu.be/') ||
    clean.includes('youtube.com/embed/') ||
    clean.includes('youtube.com/shorts/')
  ) {
    return true;
  }

  // Vimeo links
  if (clean.includes('vimeo.com/') || clean.includes('player.vimeo.com/video/')) {
    return true;
  }

  // Google Drive video links
  if (clean.includes('drive.google.com/file/d/')) {
    return true;
  }

  return false;
}

/**
 * Returns embed info for rendering video in iframe or HTML5 video player
 */
export function getVideoEmbedInfo(url?: string | null): {
  type: 'html5' | 'youtube' | 'vimeo' | 'drive' | 'unknown';
  embedUrl: string;
} {
  if (!url) return { type: 'unknown', embedUrl: '' };
  const trimmed = url.trim();

  // YouTube
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1`,
    };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=0&controls=1`,
    };
  }

  // Google Drive video
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return {
      type: 'drive',
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
    };
  }

  return {
    type: 'html5',
    embedUrl: trimmed,
  };
}

/**
 * Resolves any image URL, converting Google Drive sharing/view links into direct high-speed CDN URLs
 * (https://lh3.googleusercontent.com/d/{ID}), while supporting direct fallback for local assets.
 */
export function resolveImageUrl(url?: string | null, forceVideo?: boolean): string {
  if (!url) return '';
  const trimmed = url.trim();

  // If it's a known video URL or embed, don't convert to Google image thumbnail
  if (
    forceVideo ||
    isVideoUrl(trimmed) ||
    trimmed.includes('.mp4') ||
    trimmed.includes('.webm') ||
    trimmed.includes('.mov') ||
    trimmed.includes('youtube.com') ||
    trimmed.includes('youtu.be') ||
    trimmed.includes('vimeo.com')
  ) {
    // If it's a Google Drive link for video, convert to /preview for video playback
    const driveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    return trimmed;
  }

  // Match Google Drive file sharing links for images:
  const driveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return trimmed;
}

/**
 * Upload a video file directly to the backend Express server via /api/upload-video
 */
export interface UploadVideoOptions {
  projectId?: string;
  circleId?: string;
  setAsCover?: boolean;
  addToGallery?: boolean;
  onProgress?: (percent: number) => void;
}

export function uploadVideoToServer(
  file: File,
  optionsOrProgress?: UploadVideoOptions | ((percent: number) => void)
): Promise<UploadVideoResult> {
  const options: UploadVideoOptions =
    typeof optionsOrProgress === 'function'
      ? { onProgress: optionsOrProgress }
      : optionsOrProgress || {};

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('video', file, file.name);
    const pid = options.projectId || options.circleId;
    if (pid) {
      formData.append('projectId', pid);
    }
    if (options.setAsCover !== undefined) {
      formData.append('setAsCover', options.setAsCover ? 'true' : 'false');
    }
    if (options.addToGallery) {
      formData.append('addToGallery', 'true');
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-video', true);

    if (xhr.upload && options.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = async () => {
      let serverError = '';
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success && data.url) {
          resolve({
            success: true,
            url: data.url,
            filename: data.filename || file.name,
            size: data.size || file.size,
            mimetype: data.mimetype || file.type,
          });
          return;
        } else if (data.error) {
          serverError = data.error;
        }
      } catch {
        serverError = xhr.responseText || `Server responded with status ${xhr.status}`;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        reject(new Error(serverError || 'Failed to parse video upload response'));
        return;
      }

      // If under 45MB, attempt base64 fallback
      if (file.size < 45 * 1024 * 1024) {
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const dataUrl = reader.result as string;
              const res = await fetch('/api/upload-base64', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  dataUrl,
                  filename: file.name,
                  mediaType: 'video',
                }),
              });
              if (res.ok) {
                const b64Data = await res.json();
                if (b64Data.success && b64Data.url) {
                  resolve({
                    success: true,
                    url: b64Data.url,
                    filename: b64Data.filename || file.name,
                    size: file.size,
                    mimetype: file.type,
                  });
                  return;
                }
              }
              reject(new Error(serverError || 'Failed to upload video to server'));
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('Failed to read video file for fallback'));
          reader.readAsDataURL(file);
          return;
        } catch {
          // ignore
        }
      }

      reject(new Error(serverError || `Upload failed with HTTP ${xhr.status}`));
    };

    xhr.onerror = () => {
      // Try base64 fallback on network error for files under 45MB
      if (file.size < 45 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const res = await fetch('/api/upload-base64', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dataUrl: reader.result as string,
                filename: file.name,
                mediaType: 'video',
              }),
            });
            if (res.ok) {
              const b64Data = await res.json();
              if (b64Data.success && b64Data.url) {
                resolve({
                  success: true,
                  url: b64Data.url,
                  filename: b64Data.filename || file.name,
                  size: file.size,
                  mimetype: file.type,
                });
                return;
              }
            }
            reject(new Error('Network connection failed while uploading video'));
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read video file'));
        reader.readAsDataURL(file);
      } else {
        reject(new Error('Network connection failed while uploading video'));
      }
    };

    xhr.send(formData);
  });
}

/**
 * Fetch all video files stored in the server's uploads/videos/ directory
 */
export async function fetchServerVideos(): Promise<ServerVideoItem[]> {
  try {
    const res = await fetch('/api/videos');
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success && Array.isArray(data.videos)) {
      return data.videos;
    }
    return [];
  } catch (err) {
    console.warn('Failed to fetch server videos:', err);
    return [];
  }
}

/**
 * Delete a video stored on the server
 */
export async function deleteServerVideo(filename: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/videos/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.warn('Failed to delete server video:', err);
    return false;
  }
}

/**
 * Formats byte size into human-readable format (MB / KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export interface R2StatusResult {
  success: boolean;
  configured: boolean;
  mode: 'cloudflare-r2' | 'local-storage';
  bucketName?: string;
  publicDomain?: string;
  hasAccountId?: boolean;
  hasAccessKey?: boolean;
  hasSecretKey?: boolean;
  message: string;
}

/**
 * Checks Cloudflare R2 connection status and active storage mode
 */
export async function getR2Status(): Promise<R2StatusResult> {
  try {
    const res = await fetch('/api/r2/status');
    if (!res.ok) {
      return {
        success: false,
        configured: false,
        mode: 'local-storage',
        message: 'Could not contact backend storage status endpoint.',
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      configured: false,
      mode: 'local-storage',
      message: err.message || 'Error checking storage status',
    };
  }
}

export interface UploadMediaOptions {
  projectId?: string;
  circleId?: string;
  addToGallery?: boolean;
  setAsCover?: boolean;
  customTitle?: string;
  onProgress?: (percent: number) => void;
}

export interface UploadMediaResult {
  success: boolean;
  url: string;
  key?: string;
  storage: 'cloudflare-r2' | 'local-storage';
  filename: string;
  size: number;
  isVideo: boolean;
  error?: string;
}

/**
 * Universal uploader for Images & Videos:
 * 1. Checks if Cloudflare R2 is configured and requests a presigned PUT URL.
 * 2. If available, uploads directly to Cloudflare R2 with live progress.
 * 3. If presign is unavailable or fails, uploads via the secure backend /api/r2/upload endpoint.
 * 4. Seamless fallback guarantees uploads work even before R2 credentials are supplied!
 */
export async function uploadMediaToStorage(
  file: File,
  options: UploadMediaOptions = {}
): Promise<UploadMediaResult> {
  const isVideo = isVideoUrl(file.name) || file.type.startsWith('video/');
  const targetId = options.projectId || options.circleId;

  // 1. Attempt presigned direct R2 upload
  try {
    const presignRes = await fetch('/api/r2/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || (isVideo ? 'video/mp4' : 'image/webp'),
        folder: isVideo ? 'videos' : 'images',
        projectId: targetId,
      }),
    });

    if (presignRes.ok) {
      const presignData = await presignRes.json();
      if (presignData.success && presignData.presignedUrl && presignData.publicUrl) {
        // Direct upload to Cloudflare R2 via PUT
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presignData.presignedUrl, true);
          xhr.setRequestHeader('Content-Type', file.type || (isVideo ? 'video/mp4' : 'image/webp'));

          if (xhr.upload && options.onProgress) {
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                options.onProgress?.(percent);
              }
            };
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`R2 direct PUT failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during R2 direct upload'));
          xhr.send(file);
        });

        // Sync metadata with server database
        if (targetId) {
          await fetch('/api/circle-gallery/' + encodeURIComponent(targetId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: presignData.publicUrl,
              setAsCover: options.setAsCover !== false,
              mediaType: isVideo ? 'video' : 'image',
            }),
          });
        }

        return {
          success: true,
          url: presignData.publicUrl,
          key: presignData.key,
          storage: 'cloudflare-r2',
          filename: file.name,
          size: file.size,
          isVideo,
        };
      }
    }
  } catch (presignErr) {
    console.warn('Presigned upload attempt skipped, using backend upload:', presignErr);
  }

  // 2. Fallback to backend /api/r2/upload endpoint
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (targetId) {
      formData.append('projectId', targetId);
      formData.append('circleId', targetId);
    }
    if (options.addToGallery) {
      formData.append('addToGallery', 'true');
    }
    if (options.setAsCover !== undefined) {
      formData.append('setAsCover', options.setAsCover ? 'true' : 'false');
    }
    if (options.customTitle) {
      formData.append('customTitle', options.customTitle);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/r2/upload', true);

    if (xhr.upload && options.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success && data.url) {
          resolve({
            success: true,
            url: data.url,
            key: data.key,
            storage: data.storage || 'local-storage',
            filename: data.filename || file.name,
            size: data.size || file.size,
            isVideo: data.isVideo ?? isVideo,
          });
          return;
        }
        reject(new Error(data.error || 'Upload failed'));
      } catch {
        reject(new Error(`Server error: status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during media upload'));
    xhr.send(formData);
  });
}

/**
 * Permanently delete a media item from R2/storage and remove from circle gallery
 */
export async function deleteMediaPermanently(url: string, circleId?: string): Promise<{ success: boolean; gallery?: string[] }> {
  try {
    const res = await fetch('/api/r2/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, circleId }),
    });
    if (!res.ok) return { success: false };
    const data = await res.json();
    return { success: Boolean(data.success), gallery: data.gallery };
  } catch (err) {
    console.error('Delete media failed:', err);
    return { success: false };
  }
}

/**
 * Save reordered gallery array, cover URL, and metadata directly to backend database
 */
export async function saveReorderedGalleryToServer(
  circleId: string,
  gallery: string[],
  coverUrl?: string,
  mediaType?: 'image' | 'video',
  title?: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/r2/reorder-gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circleId, gallery, coverUrl, mediaType, title }),
    });
    return res.ok;
  } catch (err) {
    console.error('Save reordered gallery failed:', err);
    return false;
  }
}

/**
 * Trigger migration of local files to Cloudflare R2
 */
export async function migrateMediaToR2(): Promise<{ success: boolean; migratedCount?: number; message?: string }> {
  try {
    const res = await fetch('/api/r2/migrate-existing', {
      method: 'POST',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message || 'Migration request failed' };
  }
}
