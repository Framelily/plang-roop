import type { ProcessingOptions, ProcessedImage } from '../types';
import { getMimeType } from '../utils';

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number,
  keepAspectRatio: boolean
): { width: number; height: number } {
  if (!keepAspectRatio) {
    return { width: targetWidth, height: targetHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  // If only width is specified
  if (targetWidth && !targetHeight) {
    return {
      width: targetWidth,
      height: Math.round(targetWidth / aspectRatio),
    };
  }

  // If only height is specified
  if (!targetWidth && targetHeight) {
    return {
      width: Math.round(targetHeight * aspectRatio),
      height: targetHeight,
    };
  }

  // Both specified - fit within bounds
  const widthRatio = targetWidth / originalWidth;
  const heightRatio = targetHeight / originalHeight;
  const ratio = Math.min(widthRatio, heightRatio);

  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}

export async function processImage(
  imageUrl: string,
  originalWidth: number,
  originalHeight: number,
  options: ProcessingOptions
): Promise<ProcessedImage> {
  const img = await loadImage(imageUrl);

  const { width, height } = calculateDimensions(
    originalWidth,
    originalHeight,
    options.width,
    options.height,
    options.keepAspectRatio
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Use high quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, width, height);

  const mimeType = getMimeType(options.format);
  // WebP and JPEG support quality, PNG does not
  const quality = options.format !== 'png' ? options.quality : undefined;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }

        const url = URL.createObjectURL(blob);

        resolve({
          blob,
          url,
          width,
          height,
          size: blob.size,
          format: options.format,
        });
      },
      mimeType,
      quality
    );
  });
}
