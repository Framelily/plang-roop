'use client';

import { useState, useCallback } from 'react';
import type { ImageFile, ProcessingOptions, ProcessedImage } from '@/lib/types';
import { processImage } from '@/lib/image/resize';
import { downloadImage } from '@/lib/image/download';

interface UseImageProcessorReturn {
  processedImage: ProcessedImage | null;
  isProcessing: boolean;
  error: string | null;
  options: ProcessingOptions;
  setOptions: (options: Partial<ProcessingOptions>) => void;
  process: (image: ImageFile) => Promise<void>;
  download: (filename: string) => void;
  reset: () => void;
}

const defaultOptions: ProcessingOptions = {
  width: 0,
  height: 0,
  keepAspectRatio: true,
  format: 'jpeg',
  quality: 0.9,
};

export function useImageProcessor(): UseImageProcessorReturn {
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptionsState] = useState<ProcessingOptions>(defaultOptions);

  const setOptions = useCallback((newOptions: Partial<ProcessingOptions>) => {
    setOptionsState((prev) => ({ ...prev, ...newOptions }));
  }, []);

  const process = useCallback(
    async (image: ImageFile) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Use original dimensions if not specified
        const processOptions: ProcessingOptions = {
          ...options,
          width: options.width || image.originalWidth,
          height: options.height || image.originalHeight,
        };

        const result = await processImage(
          image.previewUrl,
          image.originalWidth,
          image.originalHeight,
          processOptions
        );

        // Revoke old URL if exists
        if (processedImage?.url) {
          URL.revokeObjectURL(processedImage.url);
        }

        setProcessedImage(result);
      } catch (err) {
        setError('Failed to process image. Please try again.');
        console.error('Image processing error:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [options, processedImage]
  );

  const download = useCallback(
    (filename: string) => {
      if (processedImage) {
        downloadImage(processedImage.blob, filename, options.format);
      }
    },
    [processedImage, options.format]
  );

  const reset = useCallback(() => {
    if (processedImage?.url) {
      URL.revokeObjectURL(processedImage.url);
    }
    setProcessedImage(null);
    setError(null);
    setOptionsState(defaultOptions);
  }, [processedImage]);

  return {
    processedImage,
    isProcessing,
    error,
    options,
    setOptions,
    process,
    download,
    reset,
  };
}
