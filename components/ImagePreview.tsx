'use client';

import { formatFileSize } from '@/lib/utils';

interface ImagePreviewProps {
  src: string;
  filename: string;
  width: number;
  height: number;
  size: number;
  onRemove?: () => void;
}

export default function ImagePreview({
  src,
  filename,
  width,
  height,
  size,
  onRemove,
}: ImagePreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={filename}
          className="h-full w-full object-contain"
        />
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute right-2 top-2 rounded-full bg-zinc-900/70 p-1.5 text-white transition-colors hover:bg-zinc-900 dark:bg-white/70 dark:text-zinc-900 dark:hover:bg-white"
            aria-label="Remove image"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
          {filename}
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {width} x {height} px &bull; {formatFileSize(size)}
        </p>
      </div>
    </div>
  );
}
