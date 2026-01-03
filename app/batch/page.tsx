'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import ImageQueue from '@/components/ImageQueue';
import BatchControls from '@/components/BatchControls';
import ProgressBar from '@/components/ProgressBar';
import { processBatch } from '@/lib/image/batchProcessor';
import { createZipFromProcessedImages } from '@/lib/image/zip';
import { downloadImage } from '@/lib/image/download';
import { loadImage } from '@/lib/image/resize';
import { formatFileSize, generateId, getFormatFromMimeType } from '@/lib/utils';
import type { ImageFile, BatchOptions, ImageFormat } from '@/lib/types';

interface StoredImageData {
  name: string;
  originalWidth: number;
  originalHeight: number;
  size: number;
  type: string;
  dataUrl: string;
}

const defaultOptions: BatchOptions = {
  width: 0,
  height: 0,
  keepAspectRatio: true,
  format: 'jpeg',
  quality: 0.85,
  useOriginalFormat: true,
  useCompression: false,
};

export default function BatchPage() {
  const router = useRouter();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<BatchOptions>(defaultOptions);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, file: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Load images from sessionStorage
  useEffect(() => {
    const loadStoredImages = async () => {
      const storedData = sessionStorage.getItem('batchImages');

      if (!storedData) {
        setIsLoading(false);
        return;
      }

      try {
        const dataArray: StoredImageData[] = JSON.parse(storedData);
        const loadedImages: ImageFile[] = [];

        for (const data of dataArray) {
          const img = await loadImage(data.dataUrl);
          loadedImages.push({
            id: generateId(),
            file: new File([], data.name),
            name: data.name,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            size: data.size,
            type: data.type,
            previewUrl: data.dataUrl,
            status: 'pending',
          });
        }

        setImages(loadedImages);
        if (loadedImages.length > 0) {
          setSelectedId(loadedImages[0].id);
        }
      } catch (error) {
        console.error('Error loading images:', error);
      }

      setIsLoading(false);
    };

    loadStoredImages();
  }, []);

  // Remove image
  const handleRemove = useCallback((id: string) => {
    setImages((prev) => {
      const newImages = prev.filter((img) => img.id !== id);
      if (selectedId === id && newImages.length > 0) {
        setSelectedId(newImages[0].id);
      } else if (newImages.length === 0) {
        setSelectedId(null);
      }
      return newImages;
    });
  }, [selectedId]);

  // Update options
  const handleOptionsChange = useCallback((newOptions: Partial<BatchOptions>) => {
    setOptions((prev) => ({ ...prev, ...newOptions }));
  }, []);

  // Process all images
  const handleProcess = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: images.length, file: '' });

    // Mark all as processing
    setImages((prev) =>
      prev.map((img) => ({ ...img, status: 'processing' as const }))
    );

    try {
      const results = await processBatch(
        images,
        options,
        (completed, total, currentFile) => {
          setProgress({ current: completed, total, file: currentFile });

          // Update individual image status
          setImages((prev) =>
            prev.map((img, idx) => ({
              ...img,
              status: idx < completed ? 'completed' : idx === completed ? 'processing' : 'pending',
            }))
          );
        }
      );

      setImages(results);
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [images, options]);

  // Download all as ZIP
  const handleDownloadZip = useCallback(async () => {
    const processedImages = images.filter((img) => img.processedImage);
    if (processedImages.length === 0) return;

    try {
      await createZipFromProcessedImages(processedImages);
    } catch (error) {
      console.error('ZIP creation error:', error);
    }
  }, [images]);

  // Download single image
  const handleDownloadSingle = useCallback(() => {
    const selected = images.find((img) => img.id === selectedId);
    if (selected?.processedImage) {
      const format = selected.processedImage.format as ImageFormat;
      downloadImage(selected.processedImage.blob, selected.name, format);
    }
  }, [images, selectedId]);

  // Reset all
  const handleReset = useCallback(() => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        status: 'pending',
        processedImage: undefined,
        error: undefined,
      }))
    );
    setProgress({ current: 0, total: 0, file: '' });
  }, []);

  // Go back
  const handleBack = useCallback(() => {
    sessionStorage.removeItem('batchImages');
    router.push('/');
  }, [router]);

  const selectedImage = images.find((img) => img.id === selectedId);
  const hasProcessedImages = images.some((img) => img.processedImage);
  const allProcessed = images.every((img) => img.status === 'completed');

  // Calculate total stats
  const totalOriginalSize = images.reduce((sum, img) => sum + img.size, 0);
  const totalProcessedSize = images.reduce(
    (sum, img) => sum + (img.processedImage?.size || 0),
    0
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white sm:gap-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="hidden h-6 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" />
            <h1 className="text-base font-semibold text-zinc-900 dark:text-white sm:text-lg">
              Batch Editor
            </h1>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 sm:text-sm">
              {images.length}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {hasProcessedImages && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
            )}
            {allProcessed ? (
              <Button size="sm" onClick={handleDownloadZip}>
                <span className="hidden sm:inline">Download </span>ZIP
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleProcess}
                disabled={isProcessing || images.length === 0}
              >
                {isProcessing ? 'Processing...' : <><span className="hidden sm:inline">Process </span>All</>}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        {/* Selected Images */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-white">
            Selected Images
          </h2>

          {images.length > 0 ? (
            <ImageQueue
              images={images}
              onRemove={handleRemove}
              selectedId={selectedId || undefined}
              onSelect={setSelectedId}
            />
          ) : (
            <p className="py-8 text-center text-zinc-500 dark:text-zinc-400">
              No images selected. Go back to select images.
            </p>
          )}
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <ProgressBar
              current={progress.current}
              total={progress.total}
              label={progress.file ? `Processing: ${progress.file}` : 'Starting...'}
            />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          {/* Controls - show first on mobile for better UX */}
          <div className="w-full lg:order-2 lg:w-80 lg:shrink-0">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
              <BatchControls
                options={options}
                onChange={handleOptionsChange}
                originalWidth={selectedImage?.originalWidth}
                originalHeight={selectedImage?.originalHeight}
              />
            </div>

            {/* Stats */}
            {hasProcessedImages && (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">
                  Batch Stats
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Total Original</dt>
                    <dd className="text-zinc-900 dark:text-white">
                      {formatFileSize(totalOriginalSize)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Total Processed</dt>
                    <dd className="text-zinc-900 dark:text-white">
                      {formatFileSize(totalProcessedSize)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Saved</dt>
                    <dd className="font-medium text-green-600 dark:text-green-400">
                      {totalProcessedSize < totalOriginalSize
                        ? `-${Math.round(((totalOriginalSize - totalProcessedSize) / totalOriginalSize) * 100)}%`
                        : `+${Math.round(((totalProcessedSize - totalOriginalSize) / totalOriginalSize) * 100)}%`}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex-1 lg:order-1">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium text-zinc-900 dark:text-white">
                  Preview
                </h2>
                {selectedImage?.processedImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadSingle}
                  >
                    Download
                  </Button>
                )}
              </div>

              {selectedImage ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        selectedImage.processedImage?.url ||
                        selectedImage.previewUrl
                      }
                      alt={selectedImage.name}
                      className="max-h-[250px] max-w-full object-contain sm:max-h-[400px]"
                    />
                  </div>

                  {/* Image Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">
                        Original
                      </h4>
                      <dl className="space-y-1">
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-500">Size</dt>
                          <dd className="text-zinc-900 dark:text-white">
                            {formatFileSize(selectedImage.size)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-500">Dim</dt>
                          <dd className="text-zinc-900 dark:text-white">
                            {selectedImage.originalWidth}x{selectedImage.originalHeight}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {selectedImage.processedImage && (
                      <div>
                        <h4 className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">
                          Processed
                        </h4>
                        <dl className="space-y-1">
                          <div className="flex justify-between gap-2">
                            <dt className="text-zinc-500">Size</dt>
                            <dd className="text-zinc-900 dark:text-white">
                              {formatFileSize(selectedImage.processedImage.size)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-zinc-500">Dim</dt>
                            <dd className="text-zinc-900 dark:text-white">
                              {selectedImage.processedImage.width}x{selectedImage.processedImage.height}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-zinc-500 dark:text-zinc-400 sm:h-[300px]">
                  Select an image to preview
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
