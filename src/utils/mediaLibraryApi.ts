/**
 * Client API for Cloudflare R2 Media Library, Bulk Upload, and Import
 */

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

export interface R2BucketObject {
  key: string;
  url: string;
  filename: string;
  folder: string;
  extension: string;
  size?: number;
  lastModified?: string;
  isVideo: boolean;
  isImage: boolean;
  contentType?: string;
  isImported?: boolean;
  importedItem?: MediaLibraryRecord | null;
}

export interface ListBucketObjectsResponse {
  success: boolean;
  objects: R2BucketObject[];
  folders: string[];
  nextContinuationToken?: string;
  isTruncated?: boolean;
  totalCount: number;
  importedCount: number;
  error?: string;
}

const MASTER_PASSCODE = '503649';

function getAdminHeaders(): HeadersInit {
  return {
    'x-admin-passcode': MASTER_PASSCODE,
  };
}

/**
 * Fetch all objects directly from the Cloudflare R2 bucket with pagination
 */
export async function fetchR2BucketObjects(params?: {
  prefix?: string;
  continuationToken?: string;
  maxKeys?: number;
  delimiter?: string;
}): Promise<ListBucketObjectsResponse> {
  const query = new URLSearchParams();
  if (params?.prefix) query.set('prefix', params.prefix);
  if (params?.continuationToken) query.set('continuationToken', params.continuationToken);
  if (params?.maxKeys) query.set('maxKeys', params.maxKeys.toString());
  if (params?.delimiter) query.set('delimiter', params.delimiter);

  const res = await fetch(`/api/r2/bucket-objects?${query.toString()}`, {
    headers: getAdminHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch bucket objects' }));
    throw new Error(err.error || `Failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch all items in the persistent portfolio media library
 */
export async function fetchMediaLibrary(): Promise<{ success: boolean; items: MediaLibraryRecord[]; total: number }> {
  const res = await fetch('/api/r2/media-library');
  if (!res.ok) {
    throw new Error('Failed to retrieve media library');
  }
  return res.json();
}

/**
 * Import selected objects from Cloudflare R2 into the persistent portfolio database
 */
export async function importR2Objects(payload: {
  items: Array<{
    key: string;
    url?: string;
    filename?: string;
    size?: number;
    isVideo?: boolean;
    contentType?: string;
    category?: string;
    circleId?: string;
    isCover?: boolean;
  }>;
  category?: string;
  circleId?: string;
  makeCover?: boolean;
}): Promise<{
  success: boolean;
  importedCount: number;
  skippedCount: number;
  importedItems: MediaLibraryRecord[];
  skippedKeys: string[];
  message: string;
}> {
  const res = await fetch('/api/r2/import-objects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to import objects');
  }
  return data;
}

/**
 * Bulk upload multiple files directly to Cloudflare R2 with progress tracking
 */
export async function bulkUploadToR2(
  files: File[],
  options?: {
    folder?: string;
    category?: string;
    circleId?: string;
    addToCircleGallery?: boolean;
    setCover?: boolean;
    onProgress?: (percent: number) => void;
  }
): Promise<{
  success: boolean;
  uploadedCount: number;
  failedCount: number;
  uploaded: MediaLibraryRecord[];
  failed: Array<{ filename: string; error: string }>;
  message: string;
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    if (options?.folder) formData.append('folder', options.folder);
    if (options?.category) formData.append('category', options.category);
    if (options?.circleId) formData.append('circleId', options.circleId);
    if (options?.addToCircleGallery) formData.append('addToCircleGallery', 'true');
    if (options?.setCover) formData.append('setCover', 'true');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && options?.onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        options.onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || `Upload failed with HTTP ${xhr.status}`));
        }
      } catch (err: any) {
        reject(new Error(err.message || 'Malformed server response'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during bulk upload'));
    });

    xhr.open('POST', '/api/r2/bulk-upload');
    xhr.setRequestHeader('x-admin-passcode', MASTER_PASSCODE);
    xhr.send(formData);
  });
}

/**
 * Update media item metadata (category, circleId, title, cover, etc.)
 */
export async function updateMediaItem(id: string, updates: Partial<MediaLibraryRecord>): Promise<MediaLibraryRecord> {
  const res = await fetch('/api/r2/update-media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminHeaders(),
    },
    body: JSON.stringify({ id, updates }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update media item');
  }
  return data.item;
}

/**
 * Reorder media library items
 */
export async function reorderMediaLibrary(orderedIds: string[]): Promise<boolean> {
  const res = await fetch('/api/r2/reorder-media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminHeaders(),
    },
    body: JSON.stringify({ orderedIds }),
  });

  const data = await res.json();
  return Boolean(data.success);
}

/**
 * Remove items from portfolio.
 * Does NOT delete from R2 bucket unless deleteFromR2 is explicitly passed as true (Requirement 16)
 */
export async function deletePortfolioMedia(options: {
  ids?: string[];
  urls?: string[];
  r2Keys?: string[];
  deleteFromR2?: boolean;
}): Promise<{
  success: boolean;
  removedFromPortfolioCount: number;
  deletedFromR2Count: number;
  deleteFromR2: boolean;
  message: string;
}> {
  const res = await fetch('/api/r2/delete-media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminHeaders(),
    },
    body: JSON.stringify(options),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete media');
  }
  return data;
}

/**
 * Sync all videos from Soledition bucket folder
 */
export async function syncSoleditionR2(): Promise<{
  success: boolean;
  count: number;
  videos: string[];
  cover: string;
}> {
  const res = await fetch('/api/r2/sync-soledition', {
    method: 'POST',
    headers: getAdminHeaders(),
  });
  return res.json();
}
