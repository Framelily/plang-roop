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
  const size = Math.min(originalWidth, originalHeight);
  const offsetX = (originalWidth - size) / 2;
  const offsetY = (originalHeight - size) / 2;

  // Calculate display size (max 300px)
  const displaySize = Math.min(300, size);
  const scale = displaySize / size;

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-zinc-900 dark:text-white">Crop Preview</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Image will be cropped to a square ({size}x{size}px)
      </p>
      <div
        className="relative mx-auto overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600"
        style={{ width: displaySize, height: displaySize }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Crop preview"
          style={{
            position: 'absolute',
            width: originalWidth * scale,
            height: originalHeight * scale,
            left: -offsetX * scale,
            top: -offsetY * scale,
          }}
        />
      </div>
    </div>
  );
}
