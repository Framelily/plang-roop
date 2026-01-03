'use client';

import type { GeneratedFavicon } from '@/lib/favicon/generator';

interface FaviconPreviewProps {
  favicons: GeneratedFavicon[];
}

export default function FaviconPreview({ favicons }: FaviconPreviewProps) {
  if (favicons.length === 0) return null;

  // Separate ICO from PNGs for display
  const icoFile = favicons.find((f) => f.isIco);
  const pngFiles = favicons.filter((f) => !f.isIco);

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-zinc-900 dark:text-white">
        Generated Favicons
      </h3>

      {/* ICO file indicator */}
      {icoFile && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          favicon.ico (16x16, 32x32, 48x48)
        </div>
      )}

      {/* PNG previews */}
      <div className="flex flex-wrap items-end gap-4">
        {pngFiles.map((favicon) => (
          <div key={favicon.name} className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800"
              style={{
                width: Math.max(favicon.size + 16, 48),
                height: Math.max(favicon.size + 16, 48),
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={favicon.url}
                alt={favicon.name}
                width={favicon.size}
                height={favicon.size}
                className="rounded"
                style={{
                  imageRendering: favicon.size <= 32 ? 'pixelated' : 'auto',
                }}
              />
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {favicon.size}x{favicon.size}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
