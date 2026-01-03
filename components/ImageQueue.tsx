'use client';

import type { ImageFile } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';

interface ImageQueueProps {
  images: ImageFile[];
  onRemove: (id: string) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export default function ImageQueue({
  images,
  onRemove,
  selectedId,
  onSelect,
}: ImageQueueProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {images.map((image) => (
        <div
          key={image.id}
          onClick={() => onSelect?.(image.id)}
          className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
            selectedId === image.id
              ? 'border-zinc-900 dark:border-white'
              : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
          }`}
        >
          <div className="relative h-20 w-20 bg-zinc-100 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.processedImage?.url || image.previewUrl}
              alt={image.name}
              className="h-full w-full object-cover"
            />

            {/* Status indicator */}
            {image.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <svg
                  className="h-6 w-6 animate-spin text-white"
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
              </div>
            )}

            {image.status === 'completed' && (
              <div className="absolute bottom-1 right-1 rounded-full bg-green-500 p-0.5">
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}

            {image.status === 'error' && (
              <div className="absolute bottom-1 right-1 rounded-full bg-red-500 p-0.5">
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            )}

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(image.id);
              }}
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <svg
                className="h-3 w-3 text-white"
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
          </div>

          {/* File info tooltip on hover */}
          <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white group-hover:block dark:bg-zinc-100 dark:text-zinc-900">
            <p className="max-w-[150px] truncate font-medium">{image.name}</p>
            <p>{formatFileSize(image.processedImage?.size || image.size)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
