import type { ImageFormat } from './types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

export function getMimeType(format: ImageFormat): string {
  const mimeTypes: Record<ImageFormat, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return mimeTypes[format];
}

export function getFormatFromMimeType(mimeType: string): ImageFormat {
  const formats: Record<string, ImageFormat> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return formats[mimeType] || 'jpeg';
}

export function getExtensionFromFormat(format: ImageFormat): string {
  const extensions: Record<ImageFormat, string> = {
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp',
  };
  return extensions[format];
}

export function calculatePercentageSaved(original: number, processed: number): number {
  if (original === 0) return 0;
  return Math.round(((original - processed) / original) * 100);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
