export interface FaviconSize {
  name: string;
  size: number;
  purpose?: string;
}

export const FAVICON_SIZES: FaviconSize[] = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192, purpose: 'any' },
  { name: 'android-chrome-512x512.png', size: 512, purpose: 'any maskable' },
];

export const ICO_SIZES = [16, 32, 48];
