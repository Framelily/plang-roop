'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import DropZone from '@/components/DropZone';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';

type Mode = 'single' | 'batch';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('single');

  // Single file handler
  const handleSingleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.onload = () => {
            sessionStorage.setItem(
              'pendingImage',
              JSON.stringify({
                name: file.name,
                originalWidth: img.naturalWidth,
                originalHeight: img.naturalHeight,
                size: file.size,
                type: file.type,
              })
            );
            sessionStorage.setItem('pendingImageData', reader.result as string);
            router.push('/editor');
          };
          img.onerror = () => {
            setError('Failed to load image. Please try another file.');
            setIsLoading(false);
          };
          img.src = reader.result as string;
        };
        reader.onerror = () => {
          setError('Failed to read file. Please try again.');
          setIsLoading(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setError('An error occurred. Please try again.');
        setIsLoading(false);
      }
    },
    [router]
  );

  // Multiple files handler
  const handleMultipleFiles = useCallback(
    async (files: File[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const imageDataArray: Array<{
          name: string;
          originalWidth: number;
          originalHeight: number;
          size: number;
          type: string;
          dataUrl: string;
        }> = [];

        for (const file of files) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const dimensions = await new Promise<{ width: number; height: number }>(
            (resolve, reject) => {
              const img = new Image();
              img.onload = () =>
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
              img.onerror = reject;
              img.src = dataUrl;
            }
          );

          imageDataArray.push({
            name: file.name,
            originalWidth: dimensions.width,
            originalHeight: dimensions.height,
            size: file.size,
            type: file.type,
            dataUrl,
          });
        }

        sessionStorage.setItem('batchImages', JSON.stringify(imageDataArray));
        router.push('/batch');
      } catch (err) {
        setError('Failed to load some images. Please try again.');
        setIsLoading(false);
      }
    },
    [router]
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              Plang-Roop
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Image Converter & Resizer
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Convert & Resize Images
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Upload your images to resize, convert format, and download
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setMode('single')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'single'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              Single Image
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'batch'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              Batch Processing
            </button>
          </div>

          {mode === 'single' ? (
            <DropZone onFileSelect={handleSingleFile} disabled={isLoading} />
          ) : (
            <DropZone
              onFilesSelect={handleMultipleFiles}
              multiple
              disabled={isLoading}
            />
          )}

          {isLoading && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading {mode === 'batch' ? 'images' : 'image'}...
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-center text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4 text-center text-sm sm:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
              <div className="mb-2 text-2xl">📐</div>
              <div className="font-medium text-zinc-900 dark:text-white">Resize</div>
              <div className="text-zinc-500 dark:text-zinc-400">Change dimensions</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
              <div className="mb-2 text-2xl">🔄</div>
              <div className="font-medium text-zinc-900 dark:text-white">Convert</div>
              <div className="text-zinc-500 dark:text-zinc-400">JPG, PNG, WebP</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
              <div className="mb-2 text-2xl">📦</div>
              <div className="font-medium text-zinc-900 dark:text-white">Batch</div>
              <div className="text-zinc-500 dark:text-zinc-400">Process multiple</div>
            </div>
            <button
              onClick={() => router.push('/favicon-generator')}
              className="rounded-lg bg-white p-4 shadow-sm transition-colors hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <div className="mb-2 text-2xl">⭐</div>
              <div className="font-medium text-zinc-900 dark:text-white">Favicon</div>
              <div className="text-zinc-500 dark:text-zinc-400">Generate icons</div>
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-4 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        All processing happens in your browser. Your images are never uploaded to any server.
      </footer>
    </div>
  );
}
