import { supabase } from './supabaseClient';

export interface UploadedFileInfo {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

export interface UploadOptions {
  userId: string;
  folder?: string;
  maxSizeBytes?: number;
  allowedTypes?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

export class UploadError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * Upload multiple files to Supabase storage
 */
export async function uploadMedia(
  files: File[], 
  options: UploadOptions
): Promise<UploadedFileInfo[]> {
  if (!files || files.length === 0) {
    throw new UploadError('No files provided for upload');
  }

  if (!options.userId) {
    throw new UploadError('User ID is required for upload');
  }

  const {
    userId,
    folder = 'general',
    maxSizeBytes = DEFAULT_MAX_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES
  } = options;

  const results: UploadedFileInfo[] = [];

  try {
    for (const file of files) {
      // Validate file size
      if (file.size > maxSizeBytes) {
        throw new UploadError(
          `File ${file.name} is too large. Maximum size is ${Math.round(maxSizeBytes / 1024 / 1024)}MB`
        );
      }

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        throw new UploadError(
          `File ${file.name} has unsupported type. Allowed types: ${allowedTypes.join(', ')}`
        );
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileName = `${timestamp}_${randomString}.${fileExt}`;
      const filePath = `${userId}/${folder}/${fileName}`;

      console.log('Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        path: filePath
      });

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clinic-media') // Make sure this bucket exists
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new UploadError(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new UploadError(`No upload data returned for ${file.name}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('clinic-media')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new UploadError(`Failed to get public URL for ${file.name}`);
      }

      const result: UploadedFileInfo = {
        url: urlData.publicUrl,
        path: filePath,
        name: file.name,
        size: file.size,
        type: file.type
      };

      results.push(result);
      console.log('Upload successful:', result);
    }

    return results;

  } catch (error) {
    console.error('Upload process error:', error);
    
    // Clean up any successful uploads if there was an error
    for (const result of results) {
      try {
        await supabase.storage
          .from('clinic-media')
          .remove([result.path]);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', result.path, cleanupError);
      }
    }

    if (error instanceof UploadError) {
      throw error;
    }
    
    throw new UploadError(error instanceof Error ? error.message : 'Unknown upload error');
  }
}

/**
 * Delete files from storage
 */
export async function deleteMedia(filePaths: string[]): Promise<void> {
  if (!filePaths || filePaths.length === 0) return;

  try {
    const { error } = await supabase.storage
      .from('clinic-media')
      .remove(filePaths);

    if (error) {
      throw new UploadError(`Failed to delete files: ${error.message}`);
    }
  } catch (error) {
    console.error('Delete media error:', error);
    throw error instanceof UploadError ? error : new UploadError('Failed to delete media files');
  }
}

/**
 * Get file URL from storage path
 */
export function getMediaUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('clinic-media')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Extract storage path from full URL
 */
export function extractStoragePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/clinic-media\/(.+)$/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}