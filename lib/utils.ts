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

