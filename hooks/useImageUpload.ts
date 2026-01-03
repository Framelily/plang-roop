'use client';

import { useState, useCallback } from 'react';
import type { ImageFile } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { loadImage } from '@/lib/image/resize';

interface UseImageUploadReturn {
  image: ImageFile | null;
  isLoading: boolean;
  error: string | null;
  uploadImage: (file: File) => Promise<void>;
  clearImage: () => void;
}

export function useImageUpload(): UseImageUploadReturn {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const previewUrl = URL.createObjectURL(file);
      const img = await loadImage(previewUrl);

      const imageFile: ImageFile = {
        id: generateId(),
        file,
        name: file.name,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
        size: file.size,
        type: file.type,
        previewUrl,
      };

      setImage(imageFile);
    } catch (err) {
      setError('Failed to load image. Please try another file.');
      console.error('Image upload error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearImage = useCallback(() => {
    if (image?.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }
    setImage(null);
    setError(null);
  }, [image]);

  return {
    image,
    isLoading,
    error,
    uploadImage,
    clearImage,
  };
}
