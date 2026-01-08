import { FAVICON_SIZES, type FaviconSize } from './sizes';
import { loadImage } from '../image/resize';
import { createFaviconIco } from './ico';

export interface GeneratedFavicon {
  name: string;
  size: number;
  blob: Blob;
  url: string;
  isIco?: boolean;
}

export async function fitToSquare(
  imageUrl: string,
  originalWidth: number,
  originalHeight: number
): Promise<{ url: string; size: number }> {
  const img = await loadImage(imageUrl);

  // Use the larger dimension as the target square size
  const size = Math.max(originalWidth, originalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Transparent background (PNG supports transparency)
  ctx.clearRect(0, 0, size, size);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Center the image in the square canvas (keep aspect ratio)
  const offsetX = (size - originalWidth) / 2;
  const offsetY = (size - originalHeight) / 2;
  ctx.drawImage(img, offsetX, offsetY, originalWidth, originalHeight);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({
          url: URL.createObjectURL(blob),
          size,
        });
      }
    }, 'image/png');
  });
}

export async function generateFaviconSize(
  imageUrl: string,
  targetSize: number
): Promise<Blob> {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, targetSize, targetSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}

export async function generateAllFavicons(
  squareImageUrl: string,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<GeneratedFavicon[]> {
  const favicons: GeneratedFavicon[] = [];
  const totalSteps = FAVICON_SIZES.length + 1; // +1 for ICO file

  // Generate PNG favicons
  let png16: Blob | null = null;
  let png32: Blob | null = null;
  let png48: Blob | null = null;

  for (let i = 0; i < FAVICON_SIZES.length; i++) {
    const { name, size } = FAVICON_SIZES[i];
    onProgress?.(i, totalSteps, name);

    const blob = await generateFaviconSize(squareImageUrl, size);
    const url = URL.createObjectURL(blob);

    favicons.push({ name, size, blob, url });

    // Keep references for ICO creation
    if (size === 16) png16 = blob;
    if (size === 32) png32 = blob;
    if (size === 48) png48 = blob;
  }

  // Generate favicon.ico (contains 16x16, 32x32, 48x48)
  onProgress?.(FAVICON_SIZES.length, totalSteps, 'favicon.ico');

  if (png16) {
    const icoBlob = await createFaviconIco(png16, png32 || undefined, png48 || undefined);
    const icoUrl = URL.createObjectURL(icoBlob);

    favicons.unshift({
      name: 'favicon.ico',
      size: 16,
      blob: icoBlob,
      url: icoUrl,
      isIco: true,
    });
  }

  onProgress?.(totalSteps, totalSteps, 'Done');

  return favicons;
}

export function generateManifestJson(siteName = 'My Website'): string {
  const manifest = {
    name: siteName,
    short_name: siteName,
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
  };

  return JSON.stringify(manifest, null, 2);
}

export function generateHtmlTags(): string {
  return `<!-- Favicon -->
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#ffffff">`;
}
