export interface ImageFile {
  id: string;
  file: File;
  name: string;
  originalWidth: number;
  originalHeight: number;
  size: number;
  type: string;
  previewUrl: string;
  status?: ImageStatus;
  processedImage?: ProcessedImage;
  error?: string;
}

export type ImageStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface ProcessingOptions {
  width: number;
  height: number;
  keepAspectRatio: boolean;
  format: ImageFormat;
  quality: number; // 0-1
  useOriginalFormat?: boolean;
}

export interface BatchOptions extends ProcessingOptions {
  useOriginalFormat: boolean;
  maxSizeMB?: number;
  useCompression: boolean;
}

export interface ProcessedImage {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  currentFile: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
}

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight?: number;
  useWebWorker: boolean;
  initialQuality: number;
  fileType?: string;
}

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export const SUPPORTED_FORMATS: ImageFormat[] = ['jpeg', 'png', 'webp'];

export const FORMAT_LABELS: Record<ImageFormat, string> = {
  jpeg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
};

export const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

export interface CropOptions {
  crop: CropRect;
  transform: Transform;
  format: ImageFormat;
  quality: number;
}
