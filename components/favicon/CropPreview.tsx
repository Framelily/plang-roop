'use client';

interface CropPreviewProps {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
}

export default function CropPreview({
  imageUrl,
  originalWidth,
  originalHeight,
}: CropPreviewProps) {
  const size = Math.max(originalWidth, originalHeight);

  // Calculate display size (max 300px)
  const displaySize = Math.min(300, size);

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-zinc-900 dark:text-white">Fit Preview</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Image will be centered in a square ({size}x{size}px)
      </p>
      <div
        className="relative mx-auto flex items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=')] dark:border-zinc-600 dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjM2YzZjQ2Ii8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMzZjNmNDYiLz48L3N2Zz4=')]"
        style={{ width: displaySize, height: displaySize }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Fit preview"
          className="max-h-full max-w-full object-contain"
        />
      </div>
    </div>
  );
}
