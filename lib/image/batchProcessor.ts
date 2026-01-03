import type { ImageFile, BatchOptions, ProcessedImage, ImageFormat } from '../types';
import { processImage, loadImage } from './resize';
import { getFormatFromMimeType } from '../utils';

export type BatchProgressCallback = (
  completed: number,
  total: number,
  currentFile: string
) => void;

export async function processBatch(
  images: ImageFile[],
  options: BatchOptions,
  onProgress?: BatchProgressCallback
): Promise<ImageFile[]> {
  const results: ImageFile[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];

    onProgress?.(i, images.length, image.name);

    try {
      // Determine format
      const format: ImageFormat = options.useOriginalFormat
        ? getFormatFromMimeType(image.type)
        : options.format;

      // Determine dimensions
      const width = options.width || image.originalWidth;
      const height = options.height || image.originalHeight;

      const processedImage = await processImage(
        image.previewUrl,
        image.originalWidth,
        image.originalHeight,
        {
          width,
          height,
          keepAspectRatio: options.keepAspectRatio,
          format,
          quality: options.quality,
        }
      );

      results.push({
        ...image,
        status: 'completed',
        processedImage,
      });
    } catch (error) {
      results.push({
        ...image,
        status: 'error',
        error: error instanceof Error ? error.message : 'Processing failed',
      });
    }
  }

  onProgress?.(images.length, images.length, 'Done');

  return results;
}

export async function processImageWithCompression(
  image: ImageFile,
  options: BatchOptions
): Promise<ProcessedImage> {
  const format: ImageFormat = options.useOriginalFormat
    ? getFormatFromMimeType(image.type)
    : options.format;

  const width = options.width || image.originalWidth;
  const height = options.height || image.originalHeight;

  return processImage(
    image.previewUrl,
    image.originalWidth,
    image.originalHeight,
    {
      width,
      height,
      keepAspectRatio: options.keepAspectRatio,
      format,
      quality: options.quality,
    }
  );
}
