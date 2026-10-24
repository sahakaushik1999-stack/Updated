import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';

/**
 * Cloudflare R2 Configuration and Client
 * R2 is S3-compatible and accessed via https://<ACCOUNT_ID>.r2.cloudflarestorage.com
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string;
}

export function getR2Config(): R2Config {
  return {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    publicDomain: process.env.R2_PUBLIC_DOMAIN || '',
  };
}

export function isR2Configured(): boolean {
  const config = getR2Config();
  return Boolean(
    config.accountId &&
    config.accessKeyId &&
    config.secretAccessKey &&
    config.bucketName
  );
}

let s3ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) {
    return null;
  }

  if (!s3ClientInstance) {
    const config = getR2Config();
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return s3ClientInstance;
}

/**
 * Formats a public CDN URL for an R2 object key
 * Supports custom domains (e.g. https://media.yourdomain.com) or fallback r2.dev domain
 * Properly encodes path segments so special characters/spaces don't break public delivery
 */
export function getR2PublicUrl(key: string): string {
  const config = getR2Config();
  const cleanKey = key.replace(/^\/+/, '');
  const encodedKey = cleanKey
    .split('/')
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join('/');
  
  if (config.publicDomain) {
    let domain = config.publicDomain.trim().replace(/\/+$/, '');
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `https://${domain}`;
    }
    return `${domain}/${encodedKey}`;
  }

  // Fallback to r2.dev subdomain if publicDomain isn't explicitly set
  return `https://${config.bucketName}.r2.dev/${encodedKey}`;
}


/**
 * Upload a Buffer or binary stream directly to Cloudflare R2
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ success: boolean; url: string; key: string; error?: string }> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !isR2Configured()) {
    return {
      success: false,
      url: '',
      key,
      error: 'Cloudflare R2 is not configured. Missing required environment variables.',
    };
  }

  try {
    const cleanKey = key.replace(/^\/+/, '');
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: cleanKey,
      Body: buffer,
      ContentType: contentType,
      // Cloudflare R2 supports standard HTTP cache control headers
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await client.send(command);
    const publicUrl = getR2PublicUrl(cleanKey);

    return {
      success: true,
      url: publicUrl,
      key: cleanKey,
    };
  } catch (err: any) {
    console.error('[Cloudflare R2] Upload error:', err);
    return {
      success: false,
      url: '',
      key,
      error: err.message || 'Failed to upload object to Cloudflare R2',
    };
  }
}

/**
 * Retrieve text content of an object from Cloudflare R2
 */
export async function getObjectFromR2(key: string): Promise<string | null> {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !isR2Configured()) return null;

  try {
    const cleanKey = key.replace(/^\/+/, '');
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: cleanKey,
    });
    const res = await client.send(command);
    if (!res.Body) return null;
    const content = await res.Body.transformToString();
    return content;
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.warn(`[Cloudflare R2] Get object warning for ${key}:`, err.message);
    return null;
  }
}

/**
 * Generates a presigned PUT URL allowing clients to upload directly to R2
 * without routing large binary streams through the server
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<{ success: boolean; presignedUrl: string; publicUrl: string; key: string; error?: string }> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !isR2Configured()) {
    return {
      success: false,
      presignedUrl: '',
      publicUrl: '',
      key,
      error: 'Cloudflare R2 is not configured. Set R2 credentials in environment.',
    };
  }

  try {
    const cleanKey = key.replace(/^\/+/, '');
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: cleanKey,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    const presignedUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    const publicUrl = getR2PublicUrl(cleanKey);

    return {
      success: true,
      presignedUrl,
      publicUrl,
      key: cleanKey,
    };
  } catch (err: any) {
    console.error('[Cloudflare R2] Presign error:', err);
    return {
      success: false,
      presignedUrl: '',
      publicUrl: '',
      key,
      error: err.message || 'Failed to generate presigned upload URL',
    };
  }
}

/**
 * Deletes an object from Cloudflare R2
 */
export async function deleteR2Object(keyOrUrl: string): Promise<{ success: boolean; error?: string }> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !isR2Configured()) {
    return { success: false, error: 'Cloudflare R2 is not configured.' };
  }

  try {
    let key = keyOrUrl;
    // If a full URL is passed, extract the key
    if (key.startsWith('http://') || key.startsWith('https://')) {
      try {
        const urlObj = new URL(key);
        key = urlObj.pathname.replace(/^\/+/, '');
      } catch {
        // Keep as is
      }
    }
    const cleanKey = key.replace(/^\/+/, '');

    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: cleanKey,
    });

    await client.send(command);
    return { success: true };
  } catch (err: any) {
    console.error('[Cloudflare R2] Delete error:', err);
    return { success: false, error: err.message || 'Failed to delete object from R2' };
  }
}

export interface R2ObjectItem {
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
}

export interface ListR2Options {
  prefix?: string;
  continuationToken?: string;
  maxKeys?: number;
  delimiter?: string;
}

export interface ListR2Result {
  success: boolean;
  objects: R2ObjectItem[];
  nextContinuationToken?: string;
  isTruncated?: boolean;
  folders: string[];
  totalCount: number;
  error?: string;
}

/**
 * List objects from Cloudflare R2 bucket with full pagination and metadata parsing
 */
export async function listR2Objects(options?: string | ListR2Options): Promise<ListR2Result> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !isR2Configured()) {
    return {
      success: false,
      objects: [],
      folders: [],
      totalCount: 0,
      error: 'Cloudflare R2 is not configured. Missing required environment variables.',
    };
  }

  const opts: ListR2Options = typeof options === 'string' ? { prefix: options } : (options || {});

  try {
    const cleanPrefix = opts.prefix ? opts.prefix.replace(/^\/+/, '') : undefined;
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: cleanPrefix,
      ContinuationToken: opts.continuationToken || undefined,
      MaxKeys: Math.min(Math.max(opts.maxKeys || 500, 1), 1000),
      Delimiter: opts.delimiter || undefined,
    });

    const response = await client.send(command);
    const contents = response.Contents || [];
    const commonPrefixes = response.CommonPrefixes || [];

    const commonPrefixFolders = commonPrefixes
      .map((cp) => cp.Prefix?.replace(/\/$/, '') || '')
      .filter(Boolean);

    const objectKeyFolders = contents
      .map((item) => {
        const key = item.Key ? item.Key.replace(/^\/+/, '') : '';
        const parts = key.split('/');
        return parts.length > 1 ? parts[0] : '';
      })
      .filter(Boolean);

    const folders = Array.from(new Set([...commonPrefixFolders, ...objectKeyFolders])).sort();

    const objects: R2ObjectItem[] = contents
      // Exclude zero-byte directory markers
      .filter((item) => item.Key && (!item.Key.endsWith('/') || (item.Size && item.Size > 0)))
      .map((item) => {
        const key = item.Key!;
        const cleanKey = key.replace(/^\/+/, '');
        const segments = cleanKey.split('/');
        const filename = segments.pop() || cleanKey;
        const folder = segments.join('/') || 'root';
        const ext = path.extname(filename).toLowerCase();

        const isVideo = (
          ext === '.mp4' ||
          ext === '.webm' ||
          ext === '.mov' ||
          ext === '.ogg' ||
          ext === '.m4v'
        );

        const isImage = (
          ext === '.jpg' ||
          ext === '.jpeg' ||
          ext === '.png' ||
          ext === '.webp' ||
          ext === '.svg' ||
          ext === '.gif' ||
          ext === '.avif'
        );

        let contentType = 'application/octet-stream';
        if (isVideo) {
          contentType = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : 'video/mp4';
        } else if (isImage) {
          contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
        }

        return {
          key: cleanKey,
          url: getR2PublicUrl(cleanKey),
          filename,
          folder,
          extension: ext,
          size: item.Size,
          lastModified: item.LastModified ? item.LastModified.toISOString() : undefined,
          isVideo,
          isImage,
          contentType,
        };
      });

    return {
      success: true,
      objects,
      folders,
      nextContinuationToken: response.NextContinuationToken,
      isTruncated: Boolean(response.IsTruncated),
      totalCount: response.KeyCount || objects.length,
    };
  } catch (err: any) {
    console.error('[Cloudflare R2] List error:', err);
    return {
      success: false,
      objects: [],
      folders: [],
      totalCount: 0,
      error: err.message || 'Failed to list objects from Cloudflare R2 bucket',
    };
  }
}


