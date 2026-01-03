import imageCompression from 'browser-image-compression';
import type { CompressionOptions } from '../types';

export async function compressImage(
  file: File,
  options: CompressionOptions
): Promise<File> {
  const compressionOptions = {
    maxSizeMB: options.maxSizeMB,
    maxWidthOrHeight: options.maxWidthOrHeight,
    useWebWorker: options.useWebWorker,
    initialQuality: options.initialQuality,
    fileType: options.fileType,
  };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    return compressedFile;
  } catch (error) {
    console.error('Compression error:', error);
    throw new Error('Failed to compress image');
  }
}

export async function compressToTargetSize(
  file: File,
  targetSizeKB: number,
  useWebWorker = true
): Promise<File> {
  const targetSizeMB = targetSizeKB / 1024;

  return compressImage(file, {
    maxSizeMB: targetSizeMB,
    useWebWorker,
    initialQuality: 0.8,
  });
}
