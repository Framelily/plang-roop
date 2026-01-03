'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import DropZone from '@/components/DropZone';
import ProgressBar from '@/components/ProgressBar';
import FaviconPreview from '@/components/favicon/FaviconPreview';
import CropPreview from '@/components/favicon/CropPreview';
import { loadImage } from '@/lib/image/resize';
import { cropToSquare, generateAllFavicons, generateHtmlTags, type GeneratedFavicon } from '@/lib/favicon/generator';
import { createFaviconZip } from '@/lib/favicon/zip';
import { FAVICON_SIZES } from '@/lib/favicon/sizes';

interface ImageInfo {
  name: string;
  originalWidth: number;
  originalHeight: number;
  dataUrl: string;
}

export default function FaviconGeneratorPage() {
  const router = useRouter();
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [favicons, setFavicons] = useState<GeneratedFavicon[]>([]);
  const [siteName, setSiteName] = useState('My Website');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' });
  const [showHtmlCode, setShowHtmlCode] = useState(false);

  // Handle file upload
  const handleFileSelect = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const img = await loadImage(dataUrl);

      setImageInfo({
        name: file.name,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
        dataUrl,
      });

      // Reset previous results
      setFavicons([]);
      setCroppedUrl(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // Generate favicons
  const handleGenerate = useCallback(async () => {
    if (!imageInfo) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: FAVICON_SIZES.length, name: 'Preparing...' });

    try {
      // Crop to square first
      const { url: squareUrl } = await cropToSquare(
        imageInfo.dataUrl,
        imageInfo.originalWidth,
        imageInfo.originalHeight
      );
      setCroppedUrl(squareUrl);

      // Generate all sizes
      const generatedFavicons = await generateAllFavicons(
        squareUrl,
        (current, total, name) => {
          setProgress({ current, total, name });
        }
      );

      setFavicons(generatedFavicons);
    } catch (error) {
      console.error('Favicon generation error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageInfo]);

  // Download ZIP
  const handleDownload = useCallback(async () => {
    if (favicons.length === 0) return;

    try {
      await createFaviconZip(favicons, siteName);
    } catch (error) {
      console.error('ZIP creation error:', error);
    }
  }, [favicons, siteName]);

  // Reset
  const handleReset = useCallback(() => {
    // Revoke old URLs
    if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    favicons.forEach((f) => URL.revokeObjectURL(f.url));

    setImageInfo(null);
    setCroppedUrl(null);
    setFavicons([]);
    setProgress({ current: 0, total: 0, name: '' });
  }, [croppedUrl, favicons]);

  const isSquare = imageInfo
    ? imageInfo.originalWidth === imageInfo.originalHeight
    : false;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
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
              Back
            </button>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Favicon Generator
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {favicons.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
                <Button size="sm" onClick={handleDownload}>
                  Download ZIP
                </Button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {!imageInfo ? (
          /* Upload Section */
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Create Favicon Package
              </h2>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Upload an image to generate favicons for all platforms
              </p>
            </div>

            <DropZone onFileSelect={handleFileSelect} />

            <div className="rounded-lg bg-white p-4 dark:bg-zinc-900">
              <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">
                What you&apos;ll get:
              </h3>
              <ul className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
                {FAVICON_SIZES.map((size) => (
                  <li key={size.name} className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {size.name} ({size.size}x{size.size})
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  manifest.json (PWA)
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  HTML meta tags
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Editor Section */
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Source Image */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 font-medium text-zinc-900 dark:text-white">
                  Source Image
                </h3>
                <div className="flex items-center justify-center rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageInfo.dataUrl}
                    alt={imageInfo.name}
                    className="max-h-[200px] max-w-full object-contain"
                  />
                </div>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {imageInfo.originalWidth} x {imageInfo.originalHeight}px
                  {!isSquare && ' (will be cropped to square)'}
                </p>
              </div>

              {/* Crop Preview / Generated Preview */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                {favicons.length > 0 ? (
                  <FaviconPreview favicons={favicons} />
                ) : !isSquare ? (
                  <CropPreview
                    imageUrl={imageInfo.dataUrl}
                    originalWidth={imageInfo.originalWidth}
                    originalHeight={imageInfo.originalHeight}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-500 dark:text-zinc-400">
                    <p>Click &quot;Generate Favicons&quot; to create icons</p>
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-64">
                  <Input
                    id="siteName"
                    label="Site Name (for manifest.json)"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="My Website"
                  />
                </div>
                <div className="flex gap-3">
                  {favicons.length === 0 ? (
                    <Button
                      onClick={handleGenerate}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Generating...' : 'Generate Favicons'}
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleReset}>
                        Start Over
                      </Button>
                      <Button onClick={handleDownload}>
                        Download ZIP
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Progress */}
            {isProcessing && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <ProgressBar
                  current={progress.current}
                  total={progress.total}
                  label={`Generating: ${progress.name}`}
                />
              </div>
            )}

            {/* HTML Code */}
            {favicons.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  onClick={() => setShowHtmlCode(!showHtmlCode)}
                  className="flex w-full items-center justify-between"
                >
                  <h3 className="font-medium text-zinc-900 dark:text-white">
                    HTML Code
                  </h3>
                  <svg
                    className={`h-5 w-5 text-zinc-500 transition-transform ${showHtmlCode ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {showHtmlCode && (
                  <div className="mt-4">
                    <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-4 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {generateHtmlTags()}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        navigator.clipboard.writeText(generateHtmlTags());
                      }}
                    >
                      Copy to Clipboard
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
