
import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

export interface DownloadResult {
  blob: Blob;
  size: number;
  contentType: string;
}

export class FileStorageService {
  private static readonly BUCKET_NAME = 'exports';
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv'
  ];

  static async initializeBucket(): Promise<void> {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.find(bucket => bucket.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false,
          allowedMimeTypes: this.ALLOWED_TYPES,
          fileSizeLimit: this.MAX_FILE_SIZE
        });
        
        if (error) {
          console.error('Failed to create storage bucket:', error);
        }
      }
    } catch (error) {
      console.error('Error initializing storage bucket:', error);
    }
  }

  static async uploadFile(
    file: Blob, 
    fileName: string, 
    userId: string,
    exportId: string
  ): Promise<UploadResult> {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${exportId}/${timestamp}_${sanitizedFileName}`;

    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: urlData } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(data.path, 24 * 60 * 60); // 24 hours

    return {
      url: urlData?.signedUrl || '',
      path: data.path,
      size: file.size
    };
  }

  static async downloadFile(filePath: string, userId: string): Promise<DownloadResult> {
    // Verify user has access to this file
    if (!filePath.startsWith(`${userId}/`)) {
      throw new Error('Access denied: File does not belong to user');
    }

    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .download(filePath);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    return {
      blob: data,
      size: data.size,
      contentType: data.type
    };
  }

  static async createSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  static async deleteFile(filePath: string, userId: string): Promise<void> {
    // Verify user has access to this file
    if (!filePath.startsWith(`${userId}/`)) {
      throw new Error('Access denied: File does not belong to user');
    }

    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  static async cleanupExpiredFiles(): Promise<number> {
    // This would typically be called by a scheduled function
    const { data: files } = await supabase.storage
      .from(this.BUCKET_NAME)
      .list();

    if (!files) return 0;

    const now = new Date();
    const expiredFiles: string[] = [];

    for (const file of files) {
      const fileDate = new Date(file.created_at);
      const daysDiff = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 7) { // Delete files older than 7 days
        expiredFiles.push(file.name);
      }
    }

    if (expiredFiles.length > 0) {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove(expiredFiles);

      if (error) {
        console.error('Failed to cleanup expired files:', error);
        return 0;
      }
    }

    return expiredFiles.length;
  }
}
