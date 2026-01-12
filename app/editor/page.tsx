'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Checkbox, RadioGroup, Slider } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import ImagePreview from '@/components/ImagePreview';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { processImage } from '@/lib/image/resize';
import { downloadImage } from '@/lib/image/download';
import { mayContainExif } from '@/lib/image/exif';
import { formatFileSize, getFormatFromMimeType } from '@/lib/utils';
import type { ImageFormat, ProcessedImage } from '@/lib/types';

interface StoredImageInfo {
  name: string;
  originalWidth: number;
  originalHeight: number;
  size: number;
  type: string;
  test: string;
}

export default function EditorPage() {
  const router = useRouter();
  const [imageInfo, setImageInfo] = useState<StoredImageInfo | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [quality, setQuality] = useState<number>(90);
  const [stripExif, setStripExif] = useState(true);

  // Processing state
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load image from sessionStorage
  useEffect(() => {
    const storedInfo = sessionStorage.getItem('pendingImage');
    const storedData = sessionStorage.getItem('pendingImageData');

    if (!storedInfo || !storedData) {
      router.push('/');
      return;
    }

    const info: StoredImageInfo = JSON.parse(storedInfo);
    setImageInfo(info);
    setImageDataUrl(storedData);
    setWidth(info.originalWidth);
    setHeight(info.originalHeight);
    setFormat(getFormatFromMimeType(info.type));
    setIsLoading(false);
  }, [router]);

  // Handle aspect ratio
  const handleWidthChange = useCallback(
    (newWidth: number) => {
      setWidth(newWidth);
      if (keepAspectRatio && imageInfo) {
        const aspectRatio = imageInfo.originalWidth / imageInfo.originalHeight;
        setHeight(Math.round(newWidth / aspectRatio));
      }
    },
    [keepAspectRatio, imageInfo]
  );

  const handleHeightChange = useCallback(
    (newHeight: number) => {
      setHeight(newHeight);
      if (keepAspectRatio && imageInfo) {
        const aspectRatio = imageInfo.originalWidth / imageInfo.originalHeight;
        setWidth(Math.round(newHeight * aspectRatio));
      }
    },
    [keepAspectRatio, imageInfo]
  );

  // Process image
  const handleProcess = useCallback(async () => {
    if (!imageDataUrl || !imageInfo) return;

    setIsProcessing(true);
    try {
      const result = await processImage(
        imageDataUrl,
        imageInfo.originalWidth,
        imageInfo.originalHeight,
        {
          width,
          height,
          keepAspectRatio,
          format,
          quality: quality / 100,
        }
      );

      // Clean up previous processed image
      if (processedImage?.url) {
        URL.revokeObjectURL(processedImage.url);
      }

      setProcessedImage(result);
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageDataUrl, imageInfo, width, height, keepAspectRatio, format, processedImage]);

  // Download processed image
  const handleDownload = useCallback(() => {
    if (!processedImage || !imageInfo) return;
    downloadImage(processedImage.blob, imageInfo.name, format);
  }, [processedImage, imageInfo, format]);

  // Reset to original
  const handleReset = useCallback(() => {
    if (imageInfo) {
      setWidth(imageInfo.originalWidth);
      setHeight(imageInfo.originalHeight);
      setFormat(getFormatFromMimeType(imageInfo.type));
      if (processedImage?.url) {
        URL.revokeObjectURL(processedImage.url);
      }
      setProcessedImage(null);
    }
  }, [imageInfo, processedImage]);

  // Go back to home
  const handleBack = useCallback(() => {
    sessionStorage.removeItem('pendingImage');
    sessionStorage.removeItem('pendingImageData');
    if (processedImage?.url) {
      URL.revokeObjectURL(processedImage.url);
    }
    router.push('/');
  }, [router, processedImage]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!imageInfo || !imageDataUrl) {
    return null;
  }

  const displayImage = processedImage?.url || imageDataUrl;
  const displayWidth = processedImage?.width || imageInfo.originalWidth;
  const displayHeight = processedImage?.height || imageInfo.originalHeight;
  const displaySize = processedImage?.size || imageInfo.size;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
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
              Editor
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            {processedImage ? (
              <Button size="sm" onClick={handleDownload}>
                <span className="hidden sm:inline">Down</span>load
              </Button>
            ) : (
              <Button size="sm" onClick={handleProcess} disabled={isProcessing}>
                {isProcessing ? '...' : <><span className="hidden sm:inline">Apply </span>Go</>}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        {/* Controls Section - show first on mobile */}
        <div className="w-full lg:order-2 lg:w-80 lg:shrink-0">
          <div className="space-y-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
            {/* Resize Section */}
            <div>
              <h3 className="mb-4 font-medium text-zinc-900 dark:text-white">
                Resize
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-4">
                <Input
                  id="width"
                  type="number"
                  label="Width"
                  suffix="px"
                  value={width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  min={1}
                  max={10000}
                />
                <Input
                  id="height"
                  type="number"
                  label="Height"
                  suffix="px"
                  value={height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  min={1}
                  max={10000}
                />
              </div>
              <div className="mt-3">
                <Checkbox
                  id="keepRatio"
                  label="Keep aspect ratio"
                  checked={keepAspectRatio}
                  onChange={(e) => setKeepAspectRatio(e.target.checked)}
                />
              </div>
            </div>

            <div className="h-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Format Section */}
            <div>
              <h3 className="mb-4 font-medium text-zinc-900 dark:text-white">
                Output Format
              </h3>
              <RadioGroup
                name="format"
                value={format}
                onChange={(value) => setFormat(value as ImageFormat)}
                options={[
                  { value: 'jpeg', label: 'JPG' },
                  { value: 'png', label: 'PNG' },
                  { value: 'webp', label: 'WebP' },
                ]}
              />
            </div>

            <div className="h-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Quality Section */}
            <div>
              <h3 className="mb-4 font-medium text-zinc-900 dark:text-white">
                Quality
              </h3>
              <Slider
                id="quality"
                min={10}
                max={100}
                step={5}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Lower quality = smaller file size (JPG & WebP)
              </p>
            </div>

            {/* EXIF Section - only show for JPEG */}
            {imageInfo && mayContainExif(imageInfo.type) && (
              <>
                <div className="h-px bg-zinc-200 dark:bg-zinc-700" />
                <div>
                  <h3 className="mb-4 font-medium text-zinc-900 dark:text-white">
                    Privacy
                  </h3>
                  <Checkbox
                    id="stripExif"
                    label="Strip EXIF metadata"
                    checked={stripExif}
                    onChange={(e) => setStripExif(e.target.checked)}
                  />
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Removes location, camera info, etc.
                  </p>
                </div>
              </>
            )}

            <div className="h-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Info Section */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:gap-0">
              <div>
                <h3 className="mb-2 font-medium text-zinc-900 dark:text-white lg:mb-3">
                  Original
                </h3>
                <dl className="space-y-1 text-sm lg:space-y-2">
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">Dim</dt>
                    <dd className="text-zinc-900 dark:text-white">
                      {imageInfo.originalWidth}x{imageInfo.originalHeight}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">Size</dt>
                    <dd className="text-zinc-900 dark:text-white">
                      {formatFileSize(imageInfo.size)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Processed Info */}
              {processedImage && (
                <div>
                  <h3 className="mb-2 font-medium text-zinc-900 dark:text-white lg:mb-3 lg:mt-4">
                    Processed
                  </h3>
                  <dl className="space-y-1 text-sm lg:space-y-2">
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500 dark:text-zinc-400">Dim</dt>
                      <dd className="text-zinc-900 dark:text-white">
                        {processedImage.width}x{processedImage.height}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500 dark:text-zinc-400">Size</dt>
                      <dd className="text-zinc-900 dark:text-white">
                        {formatFileSize(processedImage.size)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500 dark:text-zinc-400">Saved</dt>
                      <dd className="font-medium text-green-600 dark:text-green-400">
                        {processedImage.size < imageInfo.size
                          ? `-${Math.round(((imageInfo.size - processedImage.size) / imageInfo.size) * 100)}%`
                          : `+${Math.round(((processedImage.size - imageInfo.size) / imageInfo.size) * 100)}%`}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="flex-1 lg:order-1">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-medium text-zinc-900 dark:text-white">
                {processedImage ? 'Processed' : 'Original'}
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                {displayWidth}x{displayHeight} &bull; {formatFileSize(displaySize)}
              </span>
            </div>
            <div className="flex items-center justify-center rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800 sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImage}
                alt={imageInfo.name}
                className="max-h-[250px] max-w-full object-contain sm:max-h-[400px] lg:max-h-[500px]"
              />
            </div>
            <p className="mt-2 truncate text-xs text-zinc-600 dark:text-zinc-400 sm:mt-3 sm:text-sm">
              {imageInfo.name}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
